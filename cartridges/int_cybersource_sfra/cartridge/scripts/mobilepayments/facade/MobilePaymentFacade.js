/* eslint-disable */
'use strict';

// var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger');
var CybersourceConstants = require('../../utils/CybersourceConstants');
var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');

var CybersourceHelper = libCybersource.getCybersourceHelper();
var csReference = new CybersourceHelper.getcsReference();
var CSServices = require('*/cartridge/scripts/init/SoapServiceInit');

/**
 * This function creates new card object where network token is now account number of the card.
 * @param networkToken : MobilePayment token flows in network
 * @param tokenExpirationMonth : Network token expiry month
 * @param tokenExpirationYear  : Network token expiry year
 * @param cardType : Token belongs to which type of the card.
 */

function createMobilePaymentCardObject(authRequestParams) {
    var CardObject = require('*/cartridge/scripts/cybersource/CybersourceCardObject');
    var cardObject = new CardObject();
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
    var cavv;
    var ucafAuthenticationData;
    var ucafCollectionIndicator;
    var commerceIndicator;
    var xid = null;
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

/** ***************************************************************************
 * request  : Object,
 * refCode  : String   - Basket.UUID or orderNo
 * refCode  : Blob   - large blob object
 **************************************************************************** */
function addMobilePaymentRequestInfo(request, authRequestParams) {
    request.merchantID = CybersourceHelper.getMerchantID();
    request.paymentSolution = (authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay ? '001' : '006');
    libCybersource.setClientData(request, authRequestParams.orderNo, null);
    if (!empty(authRequestParams.networkToken)) {
        var requestPaymentNetworkToken = new CybersourceHelper.getcsReference().PaymentNetworkToken();
        requestPaymentNetworkToken.transactionType = '1';
        request.paymentNetworkToken = requestPaymentNetworkToken;
    } else {
        var requestEncryptedPayment = new CybersourceHelper.getcsReference().EncryptedPayment();
        if (authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay) {
            requestEncryptedPayment.descriptor = 'RklEPUNPTU1PTi5BUFBMRS5JTkFQUC5QQVlNRU5U';
        }
        requestEncryptedPayment.data = authRequestParams.data;
        request.encryptedPayment = requestEncryptedPayment;
    }
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

    var serviceRequest = new csReference.RequestMessage();

    //* *************************************************************************//
    // the request object holds the input parameter for the AUTH request
    //* *************************************************************************//
    CybersourceHelper.addCCAuthRequestInfo(serviceRequest, authRequestParams.billTo, authRequestParams.shipTo,
        authRequestParams.purchaseObject, !empty(cardResult) ? cardResult.card : null, authRequestParams.orderNo,
        CybersourceHelper.getDigitalFingerprintEnabled(), authRequestParams.items, authRequestParams.orderNo);

    if (!empty(authRequestParams.networkToken)) addPayerAuthReplyInfo(serviceRequest, authRequestParams);

    /** ***************************** */
    /* MobilePayment checkout-related WebService setup */
    /** ***************************** */
    addMobilePaymentRequestInfo(serviceRequest, authRequestParams);

    /** ***************************** */
    /* DAV-related WebService setup */
    /** ***************************** */
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
        var requestWrapper = {};
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        serviceRequest.merchantReferenceCode = authRequestParams.orderNo;
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[MobilePaymentFacade.js] Error in MobilePaymentAPIObjectAuthRequest ( {0} )', e.message);
        return { error: true, EERRORMSG: e.message, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.servicestatus', 'cybMobilePayments', null) };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[MobilePaymentFacade.js] MobilePaymentAPIObjectAuthRequest Error : null response');
        return {
            error: true,
            EERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidmobilePaymentAPIAuthRequest', 'cybMobilePayments', null)
                + serviceResponse,
            ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.servicestatus', 'cybMobilePayments', null)
        };
    }
    serviceResponse = serviceResponse.object;
    Logger.error('[MobilePaymentFacade.js] MobilePaymentAPIObjectAuthRequest response : ' + serviceResponse);
    CardHelper.protocolResponse(serviceResponse);
    //* *************************************************************************//
    // Process Response
    //* *************************************************************************//
    var result = CardHelper.ProcessCardAuthResponse(serviceResponse, authRequestParams.shipTo, authRequestParams.billTo);
    return { success: true, serviceResponse: result.responseObject };
}

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
 * GP Credit call is made to cybersource and response is sent back.
 * @param requestID : Capture request ID, which is same as that of CC Authorize service
 * @param merchantRefCode : Cybersource Merchant Reference Code
 * @param paymentType : Payment Type for Credit
 * @param purchaseTotal : Order total for current request
 * @param currency :
 * @param orderid : Order No
 */
function GPCreditRequest(requestID, merchantRefCode, paymentType, purchaseTotal, currency) {
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
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
    try {
        var service = CSServices.CyberSourceTransactionService;
        var requestWrapper = {};
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[CardFacade.js] Error in CCCaptureRequest request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('Response in CCCaptureRequest response ( {0} )', serviceResponse);
        return { error: true, errorMsg: 'empty or error in CCCaptureRequest response: ' + serviceResponse };
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
        var requestWrapper = {};
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('Error in CCAuthReversalService: {0}', e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        return { error: true, errorMsg: 'empty or error in CC auth reversal service response: ' + serviceResponse };
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

function GPCaptureRequest(requestID, merchantRefCode, paymentType, purchaseTotal, currency) {
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper'); 
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
    try {
        var service = CSServices.CyberSourceTransactionService;
        var requestWrapper = {};
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('Error in CCCaptureRequest request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('response in CCCaptureRequest response ( {0} )', serviceResponse);
        return { error: true, errorMsg: 'empty or error in CCCaptureRequest response: ' + serviceResponse };
    }
    serviceResponse = serviceResponse.object;
    return serviceResponse;
}

module.exports = {
    mobilePaymentAuthRequest: mobilePaymentAuthRequest,
    GPCreditRequest: GPCreditRequest,
    GPAuthReversalService: GPAuthReversalService,
    GPCaptureRequest: GPCaptureRequest
};
