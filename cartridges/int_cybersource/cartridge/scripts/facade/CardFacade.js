'use strict';
var Logger = require('dw/system/Logger');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');
/**
 * This method create the input for the cybersource credit card payment method, validates it and gets response from the service.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr
 * @param IPAddress : Client Ip address
 * @param orderNo : String
 * @param CreditCardForm : dw.web.FormElement
 * @param SubscriptionID : String
 * @param payerEnrollResponse : Object
 * @param payerValidationResponse : Object
 * @param ReadFromBasket : boolean
 */


function CCAuthRequest(Basket : dw.order.LineItemCtnr, OrderNo : String, IPAddress : String, CreditCardForm : dw.web.FormElement, SubscriptionID:String, 
	payerEnrollResponse : Object, payerValidationResponse : Object, ReadFromBasket : Boolean)
{
    var basket = Basket;
    var orderNo = OrderNo;
	
	//**************************************************************************//
	// Check if Basket exists
	//**************************************************************************//
	if(basket === null){
		Logger.error("Please provide a Basket!");
		return {error:true};
	}
	var PaymentInstrument = require('dw/order/PaymentInstrument');
	var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();	
	//Objects to set in the Service Request inside facade
	var billTo, shipTo, purchaseObject, cardObject;
	var result = CommonHelper.CreateCyberSourceBillToObject(basket, ReadFromBasket);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourceShipToObject(basket);
	shipTo = result.shipTo;
	
	//**************************************************************************//
	// Set WebReference & Stub
	//**************************************************************************//	
	var csReference = webreferences2.CyberSourceTransaction;

	var serviceRequest = new csReference.RequestMessage();
	
	if (empty(basket.getPaymentInstruments(CybersourceConstants.METHOD_SA_SILENTPOST)) && empty(CreditCardForm.flexresponse.value)) {
		result = CardHelper.CreateCybersourcePaymentCardObject("billing", SubscriptionID);
		cardObject = result.card;
	} else {
		serviceRequest.tokenSource = new CybersourceHelper.csReference.TokenSource();
		serviceRequest.tokenSource.transientToken = CreditCardForm.flexresponse.value;
	}
	result = CommonHelper.CreateCybersourcePurchaseTotalsObject(basket);
	purchaseObject = result.purchaseTotals;
	result = CommonHelper.CreateCybersourceItemObject(basket);
	var items : dw.util.List = result.items;

	//**************************************************************************//
	// the request object holds the input parameter for the OnDemand Subscription request
	//**************************************************************************//	
	if (!empty(SubscriptionID)) {
		CybersourceHelper.addOnDemandSubscriptionInfo(SubscriptionID, serviceRequest, purchaseObject,orderNo);
	}else if(CybersourceHelper.getTokenizationEnabled().equals('YES')){
		CybersourceHelper.addPaySubscriptionCreateService(serviceRequest,billTo,purchaseObject,cardObject,OrderNo);
	}
	
	//**************************************************************************//
	// the request object holds the input parameter for the AUTH request
	//**************************************************************************//	
	CybersourceHelper.addCCAuthRequestInfo(serviceRequest,billTo,shipTo,purchaseObject,cardObject,orderNo, CybersourceHelper.getDigitalFingerprintEnabled(), items);
	
	//Populate Payer Auth Reply service response attributes		
	if (payerValidationResponse) {
		CybersourceHelper.addPayerAuthReplyInfo(serviceRequest, payerValidationResponse.CAVV, payerValidationResponse.UCAFAuthenticationData, 
			payerValidationResponse.UCAFCollectionIndicator, payerValidationResponse.ECIRaw, payerValidationResponse.PAVCommerceIndicator, 
			payerValidationResponse.PAVXID, payerValidationResponse.ParesStatus, payerValidationResponse.specificationVersion,payerValidationResponse.directoryServerTransactionID,payerValidationResponse.cavvAlgorithm,
			payerValidationResponse.effectiveAuthenticationType, payerValidationResponse.challengeCancelCode, payerValidationResponse.authenticationStatusReason, payerValidationResponse.acsTransactionID, payerValidationResponse.authorizationPayload);
	} else if (payerEnrollResponse) {
		CybersourceHelper.addPayerAuthReplyInfo(
			serviceRequest, payerEnrollResponse.CAVV, payerEnrollResponse.UCAFAuthenticationData, 
			payerEnrollResponse.UCAFCollectionIndicator, payerEnrollResponse.ECIRaw, payerEnrollResponse.PACommerceIndicator, 
			payerEnrollResponse.PAXID, payerEnrollResponse.ParesStatus,payerEnrollResponse.specificationVersion,payerEnrollResponse.directoryServerTransactionID, null, 
			payerEnrollResponse.effectiveAuthenticationType, payerEnrollResponse.challengeCancelCode, payerEnrollResponse.authenticationStatusReason, payerEnrollResponse.acsTransactionID
		);
	}
	/********************************/
	/* DAV-related WebService setup */
	/********************************/	
	var enableDAV = CybersourceHelper.getDavEnable();
	var approveDAV = CybersourceHelper.getDavOnAddressVerificationFailure();
	
	if( enableDAV=='YES' ) {
		var ignoreDAVResult = false;
		if( approveDAV=='APPROVE' ) {
			ignoreDAVResult = true;
		}
		CybersourceHelper.addDAVRequestInfo(serviceRequest, billTo, shipTo, ignoreDAVResult);
	}
	/* End of DAV WebService setup */
	
	/* AVS Service setup */
	var ignoreAVSResult = CybersourceHelper.getAvsIgnoreResult();
	var declineAVSFlags = CybersourceHelper.getAvsDeclineFlags();
	
	CybersourceHelper.addAVSRequestInfo(serviceRequest, ignoreAVSResult, declineAVSFlags);
	/* End of AVS Service setup */
	CardHelper.writeOutDebugLog(serviceRequest,orderNo);
	
	//**************************************************************************//
	// Execute Request
	//**************************************************************************//	
	var serviceResponse = null;
	try
	{
		var service = CSServices.CyberSourceTransactionService;
		// getting merchant id and key for specific payment method
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials;
		serviceResponse = service.call(requestWrapper);
	}
	catch(e)
	{
		Logger.error("[CardFacade.js] Error in CCAuthRequest ( {0} )", e.message);
		return {error:true, errorMsg:e.message};
	}
	
	Logger.debug(serviceResponse);
	
	
	if(empty(serviceResponse) || serviceResponse.status !== "OK")
	{
		Logger.error("[CardFacade.js] CCAuthRequest Error : null response");
		return {error:true, errorMsg:"empty or error in test CCAuthRequest response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;	
	CardHelper.protocolResponse( serviceResponse );
	//**************************************************************************//
	// Process Response
	//**************************************************************************//		
	result = CardHelper.ProcessCardAuthResponse(serviceResponse, shipTo, billTo);
	return {success:true, serviceResponse:result.responseObject};
}


/**
 * DAV request call is made to cybersource and response if send back.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param bill To : billing address of the order
 * @param ship to : Shipping address of the order
 */

function DAVRequest(Basket : dw.order.LineItemCtnr,billTo : Object,shipTo : Object)
{
    // read pipeline dictionary input parameter
    var basket = Basket;

	if( basket === null ){
		Logger.error("[CardFacade.js DAVRequest] Please provide a Basket");
		return {error:true};
	}

	var billToObject = billTo;
	var shipToObject = shipTo;
	
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	
	var csReference = webreferences2.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	
	CybersourceHelper.addDAVRequestInfo(serviceRequest,billToObject,shipToObject);

	var serviceResponse = null;
	// send request
	try{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials; 
		serviceResponse = service.call(requestWrapper);
	}catch(e){
		Logger.error("[CardFacade.js] Error in DAV request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	
	if(empty(serviceResponse) || serviceResponse.status !== "OK"){
		Logger.error("[CardFacade.js] response in DAV response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in DAV response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	//set response values in local variables
	var responseObject = {};
	responseObject["RequestID"] = serviceResponse.requestID;
	responseObject["RequestToken"] = serviceResponse.requestToken;
	responseObject["ReasonCode"] = serviceResponse.reasonCode.get();
	responseObject["Decision"] = serviceResponse.decision;
	responseObject["davReply"] = (null !== serviceResponse.davReply) ? "exists" : null;
	if(null !== serviceResponse.davReply){
		responseObject["DAVReasonCode"] = serviceResponse.davReply.reasonCode.get();
	}
	return {success:true, serviceResponse:responseObject};
}

/**
 * Payer Auth call is made to cybersource and response if send back.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param amount : order total
 * @param OrderNo : Order number
 * @param CreditCardForm : details of the card
 */
 
function PayerAuthEnrollCheck(LineItemCtnrObj : dw.order.LineItemCtnr,Amount : dw.value.Money,OrderNo : String, CreditCardForm)
{
    var lineItemCtnrObj = LineItemCtnrObj;
    var amount = Amount;
    var creditCardForm = CreditCardForm;
    var orderNo : String = OrderNo;
    
	if((lineItemCtnrObj === null || creditCardForm === null )){
		Logger.error("[CardFacade.js] Please provide a Basket and the credit card form element!");
		return {error:true};
	}
	
	var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var csReference  = webreferences2.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	var paymentInstrument = CardHelper.getNonGCPaymemtInstument(lineItemCtnrObj);
	CybersourceHelper.addPayerAuthEnrollInfo(serviceRequest,orderNo,creditCardForm,lineItemCtnrObj.billingAddress.countryCode.value,amount, paymentInstrument.getCreditCardToken(),lineItemCtnrObj.billingAddress.phone);

	var serviceResponse = null;
	// send request
	try{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials; 
		serviceResponse = service.call(requestWrapper); 
	}catch(e){
		Logger.error("[CardFacade.js] Error in PayerAuthEnrollCheck request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	if(empty(serviceResponse) || serviceResponse.status !== "OK"){
		Logger.error("[CardFacade.js] response in PayerAuthEnrollCheck response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in PayerAuthEnrollCheck response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	//set response values in local variables
	var responseObject = {};
	responseObject["RequestID"] = serviceResponse.requestID;
	responseObject["RequestToken"] = serviceResponse.requestToken;
	responseObject["ReasonCode"] = serviceResponse.reasonCode.get();
	responseObject["Decision"] = serviceResponse.decision;
	responseObject["payerAuthEnrollReply"] = (null !== serviceResponse.payerAuthEnrollReply) ? "exists" : null;
	if(null !== serviceResponse.payerAuthEnrollReply){
		responseObject["PACommerceIndicator"] = serviceResponse.payerAuthEnrollReply.commerceIndicator;
		responseObject["UCAFCollectionIndicator"] = serviceResponse.payerAuthEnrollReply.ucafCollectionIndicator;
		responseObject["ProofXML"] = serviceResponse.payerAuthEnrollReply.proofXML;
		responseObject["AcsURL"] = serviceResponse.payerAuthEnrollReply.acsURL;
		responseObject["PAXID"] = serviceResponse.payerAuthEnrollReply.xid;
		responseObject["PAReq"] = serviceResponse.payerAuthEnrollReply.paReq;
		responseObject["ProxyPAN"] = serviceResponse.payerAuthEnrollReply.proxyPAN;
		responseObject["authenticationTransactionID"] = serviceResponse.payerAuthEnrollReply.authenticationTransactionID;
		responseObject["specificationVersion"] = serviceResponse.payerAuthEnrollReply.specificationVersion;
		responseObject["directoryServerTransactionID"] = serviceResponse.payerAuthEnrollReply.directoryServerTransactionID;
		responseObject["CAVV"] = serviceResponse.payerAuthEnrollReply.cavv;
        responseObject["UCAFAuthenticationData"] = serviceResponse.payerAuthEnrollReply.ucafAuthenticationData;
		responseObject["veresEnrolled"] = serviceResponse.payerAuthEnrollReply.veresEnrolled;
		responseObject["networkScore"] = serviceResponse.payerAuthEnrollReply.networkScore;
		responseObject["effectiveAuthenticationType"] = serviceResponse.payerAuthEnrollReply.effectiveAuthenticationType;
		responseObject["ParesStatus"] = serviceResponse.payerAuthEnrollReply.paresStatus;
		responseObject["ECIRaw"] = serviceResponse.payerAuthEnrollReply.eciRaw;
		responseObject["challengeCancelCode"] = serviceResponse.payerAuthEnrollReply.challengeCancelCode;
		responseObject["authenticationStatusReason"] = (!empty(serviceResponse.payerAuthEnrollReply.authenticationStatusReason)) && ((serviceResponse.payerAuthEnrollReply.authenticationStatusReason).toString().length == 1) ? '0'+serviceResponse.payerAuthEnrollReply.authenticationStatusReason : serviceResponse.payerAuthEnrollReply.authenticationStatusReason;
		
	}
	return {success:true, serviceResponse:responseObject};
}

/**
 * Payer Auth validation call is made to cybersource and response if send back.
 * @param PaRes : 
 * @param amount : order total
 * @param OrderNo : Order number
 * @param CreditCardForm : details of the card
 */
 
function PayerAuthValidation(PaRes : String,Amount : dw.value.Money,OrderNo : String,CreditCardForm : dw.web.FormElement, CreditCardToken: String ,processorTransactionId :String)
{
	var orderNo = OrderNo;
    var amount = Amount;
    var creditCardForm = CreditCardForm;
    var signedPaRes = PaRes!= null?dw.util.StringUtils.trim(PaRes):null;
    signedPaRes = signedPaRes!= null?signedPaRes.replace('/[^a-zA-Z0-9/+=]/g',""):"";
	//**************************************************************************//
	// Set WebReference & Stub
	//**************************************************************************//	
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	
	var csReference = webreferences2.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	
	CybersourceHelper.addPayerAuthValidateInfo(serviceRequest,orderNo,signedPaRes,creditCardForm,amount, CreditCardToken,processorTransactionId);

	var serviceResponse = null;
	// send request
	try{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials; 
		serviceResponse = service.call(requestWrapper); 
	}catch(e){
		Logger.error("[CardFacade.js] Error in PayerAuthValidation request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	
	if(empty(serviceResponse) || serviceResponse.status !== "OK"){
		Logger.error("[CardFacade.js] response in PayerAuthValidation response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in PayerAuthValidation response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	//set response values in local variables
	var responseObject = {};
	responseObject["RequestID"] = serviceResponse.requestID;
	responseObject["RequestToken"] = serviceResponse.requestToken;
	responseObject["ReasonCode"] = serviceResponse.reasonCode.get();
	responseObject["Decision"] = serviceResponse.decision;
	responseObject["payerAuthValidateReply"] = (null !== serviceResponse.payerAuthValidateReply) ? "exists" : null;
	if(null !== serviceResponse.payerAuthValidateReply){
		responseObject["AuthenticationResult"] = serviceResponse.payerAuthValidateReply.authenticationResult;
		responseObject["AuthenticationStatusMessage"] = serviceResponse.payerAuthValidateReply.authenticationStatusMessage;
		responseObject["CAVV"] = serviceResponse.payerAuthValidateReply.cavv;
		responseObject["UCAFAuthenticationData"] = serviceResponse.payerAuthValidateReply.ucafAuthenticationData;
		responseObject["UCAFCollectionIndicator"] = serviceResponse.payerAuthValidateReply.ucafCollectionIndicator;
		responseObject["PAVCommerceIndicator"] = serviceResponse.payerAuthValidateReply.commerceIndicator;
		responseObject["PAVXID"] = serviceResponse.payerAuthValidateReply.xid;
		responseObject["ECIRaw"] = serviceResponse.payerAuthValidateReply.eciRaw;
		responseObject["ParesStatus"] = serviceResponse.payerAuthValidateReply.paresStatus;
		responseObject["specificationVersion"] = serviceResponse.payerAuthValidateReply.specificationVersion;
		responseObject["directoryServerTransactionID"] = serviceResponse.payerAuthValidateReply.directoryServerTransactionID;
		responseObject["cavvAlgorithm"] = serviceResponse.payerAuthValidateReply.cavvAlgorithm;
		responseObject["effectiveAuthenticationType"] = serviceResponse.payerAuthValidateReply.effectiveAuthenticationType;
		responseObject["challengeCancelCode"] = serviceResponse.payerAuthValidateReply.challengeCancelCode;
		responseObject["authenticationStatusReason"] = (!empty(serviceResponse.payerAuthValidateReply.authenticationStatusReason)) && ((serviceResponse.payerAuthValidateReply.authenticationStatusReason).toString().length == 1) ? '0'+serviceResponse.payerAuthValidateReply.authenticationStatusReason : serviceResponse.payerAuthValidateReply.authenticationStatusReason;
		responseObject["acsTransactionID"] = serviceResponse.payerAuthValidateReply.acsTransactionID;
		responseObject["authorizationPayload"] = serviceResponse.payerAuthValidateReply.authorizationPayload;
	}
	return {success:true, serviceResponse:responseObject};
}
module.exports = {
		PayerAuthEnrollCheck: PayerAuthEnrollCheck,
		PayerAuthValidation: PayerAuthValidation,
		CCAuthRequest : CCAuthRequest,
		DAVRequest : DAVRequest
	};