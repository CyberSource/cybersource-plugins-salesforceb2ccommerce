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
 * @param LineItemCtnrObj : dw.order.LineItemCtnr
 * @param order No  : Order No
 * @param IPAddress : clients IP address from where request is raised
 * @param data : This is encrypted payment data
 */
 
function mobilePaymentAuthRequest(authRequestParams)
{
	// Prepare objects from order
	var paymentHelper = require('../helper/MobilePaymentsHelper');
	var result = paymentHelper.PrepareAuthRequestObjects(authRequestParams.lineItemCtnr);
	if(result.error){
		return result;
	}
	authRequestParams.billTo = result.billTo;
	authRequestParams.shipTo = result.shipTo;
	authRequestParams.purchaseObject = result.purchaseObject;
	authRequestParams.items = result.items;
	return createMobilePaymentAuthRequest(authRequestParams);
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

function createMobilePaymentAuthRequest(authRequestParams)
{
	//billTo, shipTo, purchaseObject, items, orderNo : String, IPAddress : String, data
	//Objects to set in the Service Request inside facade
	
	//Objects to set in the Service Request inside facade	
	var cardResult = !empty(authRequestParams.networkToken) ? createMobilePaymentCardObject(authRequestParams) : null;
	
	//**************************************************************************//
	// Set WebReference & Stub
	//**************************************************************************//	
	var csReference = webreferences2.CyberSourceTransaction;

	var serviceRequest = new csReference.RequestMessage();
	
	
	/* Start payment subscription for AndoridPay */ 
	if(isAndoridPayTokenizationEnabled() === true && authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_AndroidPay){
		CybersourceHelper.addPaySubscriptionCreateService(serviceRequest, authRequestParams.billTo, authRequestParams.purchaseObject, null, authRequestParams.OrderNo);
	}	
	/* End payment subscription for AndoridPay */
	
	
	//**************************************************************************//
	// the request object holds the input parameter for the AUTH request
	//**************************************************************************//	
	CybersourceHelper.addCCAuthRequestInfo(serviceRequest, authRequestParams.billTo, authRequestParams.shipTo, 
											authRequestParams.purchaseObject, !empty(cardResult) ? cardResult.card : null, authRequestParams.orderNo, 
											CybersourceHelper.getDigitalFingerprintEnabled(), authRequestParams.items, authRequestParams.orderNo);
												

	if(!empty(authRequestParams.networkToken)) addPayerAuthReplyInfo(serviceRequest, authRequestParams);
	
	/********************************/
	/* MobilePayment checkout-related WebService setup */
	/********************************/	
	addMobilePaymentRequestInfo(serviceRequest, authRequestParams);
	
	/********************************/
	/* DAV-related WebService setup */
	/********************************/	
	var enableDAV = CybersourceHelper.getDavEnable();
	var approveDAV = CybersourceHelper.getDavOnAddressVerificationFailure();
	
	if( enableDAV==='YES' ) {
		var ignoreDAVResult = false;
		if( approveDAV==='APPROVE' ) {
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
					
	//**************************************************************************//
	// Execute Request
	//**************************************************************************//	
	var serviceResponse = null;
	try
	{
		var service = CSServices.CyberSourceTransactionService;
		// getting merchant id and key for specific payment method
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(authRequestParams.MobilePaymentType);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
	    serviceRequest.merchantReferenceCode = authRequestParams.orderNo;
		requestWrapper.request = serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials;
		serviceResponse = service.call(requestWrapper);
	}
	catch(e)
	{
		Logger.error("[MobilePaymentFacade.js] Error in MobilePaymentAPIObjectAuthRequest ( {0} )", e.message);
		return {error:true, EERRORMSG:e.message, ERRORCODE:Resource.msg('cyb.mobilePayment.errorcode.servicestatus', 'cybMobilePayments', null)};
	}
	
	if(empty(serviceResponse) || serviceResponse.status !== "OK")
	{
		
		Logger.error("[MobilePaymentFacade.js] MobilePaymentAPIObjectAuthRequest Error : null response");
		return {error:true, EERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidmobilePaymentAPIAuthRequest', 'cybMobilePayments', null) 
			+ serviceResponse, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.servicestatus', 'cybMobilePayments', null)};
	}
	serviceResponse = serviceResponse.object;	
	Logger.error("[MobilePaymentFacade.js] MobilePaymentAPIObjectAuthRequest response : "+serviceResponse);
	CardHelper.protocolResponse( serviceResponse );
	//**************************************************************************//
	// Process Response
	//**************************************************************************//		
	var result = CardHelper.ProcessCardAuthResponse(serviceResponse, authRequestParams.shipTo, authRequestParams.billTo);
	return {success:true, serviceResponse:result.responseObject};
}

/*****************************************************************************	
 * request  : Object, 
 * refCode  : String   - Basket.UUID or orderNo
 * refCode  : Blob   - large blob object
 *****************************************************************************/	
function addMobilePaymentRequestInfo(request, authRequestParams)
{
	var CybersourceConstants = require('../../utils/CybersourceConstants');	
	request.merchantID = CybersourceHelper.getMerchantID();	
	request.paymentSolution = (authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay ? '001' : '006');
	libCybersource.setClientData( request, authRequestParams.orderNo , null );
	if(!empty(authRequestParams.networkToken)){
		var request_paymentNetworkToken : Object = new CybersourceHelper.csReference.PaymentNetworkToken();
		request_paymentNetworkToken.transactionType = "1";
		request.paymentNetworkToken = request_paymentNetworkToken;
	}else{
		var request_encryptedPayment : Object = new CybersourceHelper.csReference.EncryptedPayment();
		if(authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay){
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

function createMobilePaymentCardObject(authRequestParams)
{	
	var Card_Object = require('~/cartridge/scripts/cybersource/Cybersource_Card_Object');
	var cardObject = new Card_Object();
	cardObject.setAccountNumber(authRequestParams.networkToken);
	cardObject.setCardType(CardHelper.ReturnCardType(authRequestParams.cardType));
	cardObject.setExpirationMonth(authRequestParams.tokenExpirationMonth);
	cardObject.setExpirationYear(authRequestParams.tokenExpirationYear);

    return {success:true, card: cardObject};
}

function addPayerAuthReplyInfo(serviceRequest, authRequestParams){
	//**************************************************************************//
	// the request object holds the input parameter for the PayerAuth request
	//**************************************************************************//
	var cavv, ucafAuthenticationData, ucafCollectionIndicator, commerceIndicator, xid = null;
    if (authRequestParams.cardType.equalsIgnoreCase("Visa")) {
	   cavv = authRequestParams.cryptogram;
	   xid = authRequestParams.cryptogram;
	   commerceIndicator = "vbv";
    } else if (authRequestParams.cardType.equalsIgnoreCase("MasterCard")) {
	   ucafAuthenticationData = authRequestParams.cryptogram;
	   ucafCollectionIndicator = "2";
	   commerceIndicator = "spa";
    } else if (authRequestParams.cardType.equalsIgnoreCase("Amex")) {	 
	   cavv = authRequestParams.cryptogram;
	   xid = authRequestParams.cryptogram;
	   commerceIndicator = "aesk";
    }
	CybersourceHelper.addPayerAuthReplyInfo(serviceRequest, cavv, ucafAuthenticationData, ucafCollectionIndicator, null, commerceIndicator, xid, null);
}

function isAndoridPayTokenizationEnabled(){
	return Site.getCurrent().getCustomPreferenceValue("CsAndoridPayTokenizationEnabled");
}
module.exports = {
		MobilePaymentAuthRequest: mobilePaymentAuthRequest
};