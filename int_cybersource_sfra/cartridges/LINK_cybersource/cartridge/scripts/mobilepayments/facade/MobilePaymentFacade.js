'use strict';
var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger');
var CybersourceConstants = require('../../utils/CybersourceConstants');
var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var CybersourceHelper = libCybersource.getCybersourceHelper();
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');


/**
 * This function prepares request data for MobilePayment method
 * @param {Object} authRequestParams authentication request parameters
 * @returns {Object} Mobile Payment Auth Response
 */
function mobilePaymentAuthRequest(authRequestParams) {
    // Prepare objects from order
    var authParams = authRequestParams;
    var paymentHelper = require('../helper/MobilePaymentsHelper');
    var result = paymentHelper.PrepareAuthRequestObjects(authParams.lineItemCtnr);
    if (result.error) {
        return result;
    }
    authParams.billTo = result.billTo;
    authParams.shipTo = result.shipTo;
    authParams.purchaseObject = result.purchaseObject;
    authParams.items = result.items;
    return createMobilePaymentAuthRequest(authParams);
}


/**
 * This function prepares request data for MobilePayment method, called internally.
 * @param bill To : billing address of the order
 * @param ship to : Shipping address of the order
 * @param order No : Unique identifier of the Order object
 * @param purchaseObject : purchase Object
 * @param IPAddress : clients IP address from where request is raised
 * @param data : This is encrypted payment data
 */
function createMobilePaymentAuthRequest(authRequestParams) {
    // billTo, shipTo, purchaseObject, items, orderNo : String, IPAddress : String, data
    // Objects to set in the Service Request inside facade

    // Objects to set in the Service Request inside facade
    var cardResult = !empty(authRequestParams.networkToken) ? createMobilePaymentCardObject(authRequestParams) : null;

    //* *************************************************************************//
    // Set WebReference & Stub
    //* *************************************************************************//
    var csReference = webreferences.CyberSourceTransaction;

    var serviceRequest = new csReference.RequestMessage();


    /* Start payment subscription for AndoridPay */
    if (isAndoridPayTokenizationEnabled() === true && authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_AndroidPay) {
        CybersourceHelper.addPaySubscriptionCreateService(serviceRequest, authRequestParams.billTo, authRequestParams.purchaseObject, null, authRequestParams.OrderNo);
    }
    /* End payment subscription for AndoridPay */


    //* *************************************************************************//
    // the request object holds the input parameter for the AUTH request
    //* *************************************************************************//
    CybersourceHelper.addCCAuthRequestInfo(serviceRequest, authRequestParams.billTo, authRequestParams.shipTo,
        authRequestParams.purchaseObject, !empty(cardResult) ? cardResult.card : null, authRequestParams.orderNo,
        CybersourceHelper.getDigitalFingerprintEnabled(), authRequestParams.items, authRequestParams.orderNo);


    if (!empty(authRequestParams.networkToken)) addPayerAuthReplyInfo(serviceRequest, authRequestParams);

    /** ******************************/
    /* MobilePayment checkout-related WebService setup */
    /** ******************************/
    addMobilePaymentRequestInfo(serviceRequest, authRequestParams);

    /** ******************************/
    /* DAV-related WebService setup */
    /** ******************************/
    var enableDAV = CybersourceHelper.getDavEnable();
    var approveDAV = CybersourceHelper.getDavOnAddressVerificationFailure();

    if (enableDAV.value === 'YES') {
        var ignoreDAVResult = false;
        if (approveDAV.value === 'APPROVE') {
            ignoreDAVResult = true;
        }
        CybersourceHelper.addDAVRequestInfo(serviceRequest, authRequestParams.billTo, authRequestParams.shipTo, ignoreDAVResult);
    }
    /* End of DAV WebService setup */


    /* AVS Service setup */
    var ignoreAVSResult = CybersourceHelper.getAvsIgnoreResult();
    var declineAVSFlags = CybersourceHelper.getAvsDeclineFlags();

    CybersourceHelper.addAVSRequestInfo(serviceRequest, ignoreAVSResult, declineAVSFlags);
    /* End of AVS Service setup */

    CardHelper.writeOutDebugLog(serviceRequest, authRequestParams.orderNo);

    //* *************************************************************************//
    // Execute Request
    //* *************************************************************************//
    var serviceResponse = null;
    try {
        var service = CSServices.CyberSourceTransactionService;
        // getting merchant id and key for specific payment method
        var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(authRequestParams.MobilePaymentType);
        var requestWrapper = {};
        serviceRequest.merchantID = merchantCrdentials.merchantID;
        serviceRequest.merchantReferenceCode = authRequestParams.orderNo;
        requestWrapper.request = serviceRequest;
        requestWrapper.merchantCredentials = merchantCrdentials;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[MobilePaymentFacade.ds] Error in MobilePaymentAPIObjectAuthRequest ( {0} )', e.message);
        return { error: true, EERRORMSG: e.message, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.servicestatus', 'cybMobilePayments', null) };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[MobilePaymentFacade.ds] MobilePaymentAPIObjectAuthRequest Error : null response');
        return {
            error: true,
            EERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidmobilePaymentAPIAuthRequest', 'cybMobilePayments', null)
                + serviceResponse,
            ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.servicestatus', 'cybMobilePayments', null)
        };
    }
    serviceResponse = serviceResponse.object;
    Logger.error('[MobilePaymentFacade.ds] MobilePaymentAPIObjectAuthRequest response : ' + serviceResponse);
    CardHelper.protocolResponse(serviceResponse);
    //* *************************************************************************//
    // Process Response
    //* *************************************************************************//
    var result = CardHelper.ProcessCardAuthResponse(serviceResponse, authRequestParams.shipTo, authRequestParams.billTo);
    return { success: true, serviceResponse: result.responseObject };
}

/** ***************************************************************************
 * request  : Object,
 * refCode  : String   - Basket.UUID or orderNo
 * refCode  : Blob   - large blob object
 *****************************************************************************/
function addMobilePaymentRequestInfo(request, authRequestParams) {
    var CybersourceConstants = require('../../utils/CybersourceConstants');
    request.merchantID = CybersourceHelper.getMerchantID();
    request.paymentSolution = (authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay ? '001' : '006');
    libCybersource.setClientData(request, authRequestParams.orderNo, null);
    if (!empty(authRequestParams.networkToken)) {
        var request_paymentNetworkToken = new CybersourceHelper.csReference.PaymentNetworkToken();
        request_paymentNetworkToken.transactionType = '1';
        request.paymentNetworkToken = request_paymentNetworkToken;
    } else {
        var request_encryptedPayment = new CybersourceHelper.csReference.EncryptedPayment();
        if (authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay) {
            request_encryptedPayment.descriptor = 'RklEPUNPTU1PTi5BUFBMRS5JTkFQUC5QQVlNRU5U';
        }
        request_encryptedPayment.data = authRequestParams.data;
        request.encryptedPayment = request_encryptedPayment;
    }
}
/**
 * This function creates new card object where network token is now account number of the card.
 * @param networkToken : MobilePayment token flows in network
 * @param tokenExpirationMonth : Network token expiry month
 * @param tokenExpirationYear  : Network token expiry year
 * @param cardType : Token belongs to which type of the card.
 */

function createMobilePaymentCardObject(authRequestParams) {
    var Card_Object = require('~/cartridge/scripts/cybersource/Cybersource_Card_Object');
    var cardObject = new Card_Object();
    cardObject.setAccountNumber(authRequestParams.networkToken);
    cardObject.setCardType(CardHelper.ReturnCardType(authRequestParams.cardType));
    cardObject.setExpirationMonth(authRequestParams.tokenExpirationMonth);
    cardObject.setExpirationYear(authRequestParams.tokenExpirationYear);

    return { success: true, card: cardObject };
}

function addPayerAuthReplyInfo(serviceRequest, authRequestParams) {
    //* *************************************************************************//
    // the request object holds the input parameter for the PayerAuth request
    //* *************************************************************************//
    var cavv,
        ucafAuthenticationData,
        ucafCollectionIndicator,
        commerceIndicator,
        xid = null;
    if (authRequestParams.cardType.equalsIgnoreCase('Visa')) {
        cavv = authRequestParams.cryptogram;
        xid = authRequestParams.cryptogram;
        commerceIndicator = 'vbv';
    } else if (authRequestParams.cardType.equalsIgnoreCase('MasterCard')) {
        ucafAuthenticationData = authRequestParams.cryptogram;
        ucafCollectionIndicator = '2';
        commerceIndicator = 'spa';
    } else if (authRequestParams.cardType.equalsIgnoreCase('Amex')) {
        cavv = authRequestParams.cryptogram;
        xid = authRequestParams.cryptogram;
        commerceIndicator = 'aesk';
    }
    CybersourceHelper.addPayerAuthReplyInfo(serviceRequest, cavv, ucafAuthenticationData, ucafCollectionIndicator, null, commerceIndicator, xid, null);
}
/**
 * Checks to see if android pay tokenization is enabled
 * @return {boolean} is android pay tokenization enabled
 */
function isAndoridPayTokenizationEnabled() {
    return Site.getCurrent().getCustomPreferenceValue('CsAndoridPayTokenizationEnabled');
}

/**
 * GP Credit call is made to cybersource and response is sent back.
 * @param requestID : Capture request ID, which is same as that of CC Authorize service
 * @param merchantRefCode : Cybersource Merchant Reference Code
 * @param paymentType : Payment Type for Credit
 * @param purchaseTotal : Order total for current request
 * @param currency : 
 * @param orderid : Order No
 */
	function GPCreditRequest(requestID: String, merchantRefCode: String, paymentType: String, purchaseTotal : dw.value.Money, currency : String){
	
		var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
		var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
		var CybersourceHelper = libCybersource.getCybersourceHelper();

		var csReference = webreferences.CyberSourceTransaction;
		var serviceRequest = new csReference.RequestMessage();
		
		var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, purchaseTotal);
		purchaseObject = purchaseObject.purchaseTotals;
		serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);
		
		libCybersource.setClientData(serviceRequest, merchantRefCode);
		CybersourceHelper.ccCreditService(serviceRequest, merchantRefCode, requestID, paymentType);
		
	    //  Provide ability to customize request object with a hook.
	    var HookMgr = require('dw/system/HookMgr');
	    if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
	        var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Credit', serviceRequest);
	        if (!empty(modifiedServiceRequest)) {
	        serviceRequest = modifiedServiceRequest;
	        }
	    }

		var serviceResponse = null;
		// send request
		try{
			var service = CSServices.CyberSourceTransactionService;
			var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_GooglePay);
			var requestWrapper={};
		    serviceRequest.merchantID = merchantCrdentials.merchantID;
			requestWrapper.request =serviceRequest;
			requestWrapper.merchantCredentials = merchantCrdentials; 
			serviceResponse = service.call(requestWrapper); 
		}catch(e){
			Logger.error("[CardFacade.ds] Error in CCCaptureRequest request ( {0} )",e.message);
			return {error:true, errorMsg:e.message};
		}
		
		if(empty(serviceResponse) || serviceResponse.status !== "OK"){
			Logger.error("Response in CCCaptureRequest response ( {0} )",serviceResponse);
			return {error:true, errorMsg:"empty or error in CCCaptureRequest response: "+serviceResponse};
		}
		serviceResponse = serviceResponse.object;
		return serviceResponse;
	}


	/**
	 * GPAuthReversalService call is made to cybersource and response if send back.
	 * @param requestID : 
	 * @param amount : order total
	 * @param merchantRefCode : cybersource reference number
	 * @param paymentType : payment type
	 * @currency : currency used
	 */
	function GPAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount) {
		var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
		var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
		var CybersourceHelper = libCybersource.getCybersourceHelper();

	    var csReference = webreferences.CyberSourceTransaction;
	    var serviceRequest = new csReference.RequestMessage();
		var purchaseTotals = CardHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount);
			purchaseTotals = libCybersource.copyPurchaseTotals(purchaseTotals.purchaseTotals);
	    	serviceRequest.purchaseTotals = purchaseTotals;

	        // Create CCAuthReversal service reference for Credit Card
	        CybersourceHelper.addCCAuthReversalServiceInfo(serviceRequest, merchantRefCode, requestID);

	        //  Provide ability to customize request object with a hook.
	        var HookMgr = require('dw/system/HookMgr');
	        if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
	            var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'AuthReversal', serviceRequest);
	            if (!empty(modifiedServiceRequest)) {
	            serviceRequest = modifiedServiceRequest;
	            }
	        }

	   // send request
	   var serviceResponse = null;
			try {
		        // create request,make service call and store returned response
		        var service = CSServices.CyberSourceTransactionService;
				// getting merchant id and key for specific payment method
				var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_GooglePay);
				var requestWrapper={};
			    serviceRequest.merchantID = merchantCrdentials.merchantID;
				requestWrapper.request = serviceRequest;
				requestWrapper.merchantCredentials = merchantCrdentials;
				serviceResponse = service.call(requestWrapper);
		  	} catch (e) {
		        Logger.error("Error in CCAuthReversalService: {0}", e.message);
		        return { error: true, errorMsg: e.message };
		    }
		
		    if (empty(serviceResponse) || serviceResponse.status !== "OK") {
		        return { error: true, errorMsg: "empty or error in CC auth reversal service response: " + serviceResponse };
		    }
		    if (!empty(serviceResponse)) {
				serviceResponse = serviceResponse.object;
		    }
			
		    return serviceResponse;
	}

/**
 * Google Pay Capture call is made to cybersource and response is sent back.
 * @param requestID : Capture request ID, which is same as that of VC Authorize service
 * @param merchantRefCode : Cybersource Merchant Reference Code
 * @param paymentType : Payment Type for Capture
 * @param purchaseTotal : Order total for current request
 * @param currency : 
 * @param orderid : Order No
 */

	function GPCaptureRequest(requestID: String, merchantRefCode: String, paymentType: String, purchaseTotal : dw.value.Money, currency : String){
		var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
		var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
		var CybersourceHelper = libCybersource.getCybersourceHelper();

		var csReference = webreferences.CyberSourceTransaction;
		var serviceRequest = new csReference.RequestMessage();
		
		var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, purchaseTotal);
		purchaseObject = purchaseObject.purchaseTotals;
		serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);
		
		libCybersource.setClientData(serviceRequest, merchantRefCode);
		CybersourceHelper.ccCaptureService(serviceRequest, merchantRefCode, requestID, paymentType);
		
	    //  Provide ability to customize request object with a hook.
	    var HookMgr = require('dw/system/HookMgr');
	    if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
	        var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Capture', serviceRequest);
	        if (!empty(modifiedServiceRequest)) {
	        serviceRequest = modifiedServiceRequest;
	        }
	    }

		var serviceResponse = null;
		// send request
		try{
			var service = CSServices.CyberSourceTransactionService;
			var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_GooglePay);
			var requestWrapper={};
		    serviceRequest.merchantID = merchantCrdentials.merchantID;
			requestWrapper.request =serviceRequest;
			requestWrapper.merchantCredentials = merchantCrdentials; 
			serviceResponse = service.call(requestWrapper); 
		}catch(e){
			Logger.error("Error in CCCaptureRequest request ( {0} )",e.message);
			return {error:true, errorMsg:e.message};
		}
		
		if(empty(serviceResponse) || serviceResponse.status !== "OK"){
			Logger.error("response in CCCaptureRequest response ( {0} )",serviceResponse);
			return {error:true, errorMsg:"empty or error in CCCaptureRequest response: "+serviceResponse};
		}
		serviceResponse = serviceResponse.object;
		return serviceResponse;
	}

module.exports = {
    mobilePaymentAuthRequest: mobilePaymentAuthRequest,
    GPCreditRequest:GPCreditRequest,
    GPAuthReversalService:GPAuthReversalService,
    GPCaptureRequest:GPCaptureRequest
};
