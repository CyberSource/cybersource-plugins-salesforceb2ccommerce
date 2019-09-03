'use strict';
var dwsvc = require ("dw/svc");
var Logger = require('dw/system/Logger');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');

/**
 * This method create the input for the cybersource visa checkout payment method, It validates the data and the card details.
 * Create the billto,shipto,purchase object for cyb request input, calls the service with avs,cvn details and send the result back.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr
 * @param IPAddress : Client Ip address
 * @param orderNo : String
 */

function CCAuthRequest(Basket,OrderNo,IPAddress)
{
    var basket = Basket;
    var orderNo = OrderNo;

	var wrappedKey = session.forms.visacheckout.encryptedPaymentWrappedKey.value;
	var data = session.forms.visacheckout.encryptedPaymentData.value;
	var callID = session.forms.visacheckout.callId.value;
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	//**************************************************************************//
	// Set WebReference & Stub
	//**************************************************************************//	
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var csReference  = webreferences.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	
	//**************************************************************************//
	// Check if Basket exists
	//**************************************************************************//
	if(basket == null){
		Logger.error("Please provide a Basket!");
		return {error:true};
	}

	//Objects to set in the Service Request inside facade
	var shipTo, billTo, purchaseObject;
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var result = CommonHelper.CreateCyberSourceBillToObject(basket);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourceShipToObject(basket);
	shipTo = result.shipTo;
	result = CommonHelper.CreateCybersourcePurchaseTotalsObject(basket);
	purchaseObject = result.purchaseTotals;
	result = CommonHelper.CreateCybersourceItemObject(basket);
	var items : dw.util.List = result.items;

	/********************************/
	/* TOKEN-related WebService setup */
	/********************************/
	var enableTokenization : String = CybersourceHelper.getTokenizationEnabled();
	if(enableTokenization === 'YES')
	{
		CybersourceHelper.addPaySubscriptionCreateService(serviceRequest,billTo,purchaseObject,null,OrderNo);
	}
	
	//**************************************************************************//
	// the request object holds the input parameter for the AUTH request
	//**************************************************************************//	
	CybersourceHelper.addCCAuthRequestInfo(serviceRequest,billTo,shipTo,purchaseObject,null,orderNo, CybersourceHelper.getDigitalFingerprintEnabled(), items);
	
	/********************************/
	/* Visa checkout-related WebService setup */
	/********************************/	
	CybersourceHelper.addVCAuthRequestInfo(serviceRequest, orderNo, wrappedKey, data);
	CybersourceHelper.addVCOrderID(serviceRequest,callID);
	/********************************/
	/* DAV-related WebService setup */
	/********************************/	
	var enableDAV = CybersourceHelper.getDavEnable();
	var approveDAV = CybersourceHelper.getDavOnAddressVerificationFailure();
	
	if( enableDAV === 'YES' ) {
		var ignoreDAVResult = false;
		if( approveDAV === 'APPROVE' ) {
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
	var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	CardHelper.writeOutDebugLog(serviceRequest,orderNo);
	
	//**************************************************************************//
	// Execute Request
	//**************************************************************************//	
	var serviceResponse = null;
	try
	{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_VISA_CHECKOUT);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials;
		serviceResponse = service.call(requestWrapper);
	}
	catch(e)
	{
		Logger.error("[VisaCheckoutFacade.ds] Error in CCAuthRequest ( {0} )", e.message);
		return {error:true, errorMsg:e.message};
	}
	
	Logger.debug(response);
	
	
	if(empty(serviceResponse) || !'OK'.equals(serviceResponse.status))
	{
		Logger.error("[VisaCheckoutFacade.ds] CCAuthRequest Error : null response");
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
 * This method decrypt the data for the visa checkout functionality.
 * @param wrappedKey : Object
 * @param data : Object
 * @param orderNo : String
 */

function VCDecryptRequest(orderNo,wrappedKey,data,callID)
{
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	
	var csReference = webreferences.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	CybersourceHelper.addVCDecryptRequestInfo(serviceRequest,orderNo, wrappedKey, data);
	CybersourceHelper.addVCOrderID(serviceRequest,callID);
	var serviceResponse = null;
	// send request
	try{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_VISA_CHECKOUT);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials;
		serviceResponse = service.call(requestWrapper);
	}catch(e){
		Logger.error("[VisaCheckoutFacade.ds] Error in VCDecryptRequest request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	if(empty(serviceResponse) || !'OK'.equals(serviceResponse.status)){
		Logger.error("[VisaCheckoutFacade.ds] response in VCDecryptRequest response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in VCDecryptRequest response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	//set response values in local variables
	var responseObject = {};
	responseObject["RequestID"] = serviceResponse.requestID;
	responseObject["ReasonCode"] = serviceResponse.reasonCode.get();
	responseObject["Decision"] = serviceResponse.decision;
	responseObject["MerchantReferenceCode"] = serviceResponse.merchantReferenceCode;
	if(!empty(serviceResponse.purchaseTotals)){
	responseObject["PurchaseTotalsCurrency"] = serviceResponse.purchaseTotals.currency;
	}
	responseObject["decryptVisaCheckoutDataReply"] = (!empty(serviceResponse.decryptVisaCheckoutDataReply)) ? "exists" : null;
	if(!empty(serviceResponse.decryptVisaCheckoutDataReply)){
		responseObject["VCDecryptReasonCode"] = serviceResponse.decryptVisaCheckoutDataReply.reasonCode.get();
	}
	responseObject["vcReply"] = (!empty(serviceResponse.vcReply)) ? "exists" : null;
	if(!empty(serviceResponse.vcReply)){
		responseObject["VCXID"] = serviceResponse.vcReply.xid;
		responseObject["VCParesTimeStamp"] = serviceResponse.vcReply.paresTimeStamp;
		responseObject["VCParesStatus"] = serviceResponse.vcReply.paresStatus;
		responseObject["VCVeresTimeStamp"] = serviceResponse.vcReply.veresTimeStamp;
		responseObject["VCVeresEnrolled"] = serviceResponse.vcReply.veresEnrolled;
		responseObject["VCCAVV"] = serviceResponse.vcReply.cavv;
		responseObject["VCEciRaw"] = serviceResponse.vcReply.eciRaw;
		responseObject["VCAvsCodeRaw"] = serviceResponse.vcReply.avsCodeRaw;
		responseObject["VCAccountEmail"] = serviceResponse.vcReply.vcAccountEmail;
		responseObject["VCShippingHandlingAmount"] = serviceResponse.vcReply.shippingHandlingAmount;
		responseObject["VCSubtotalAmount"] = serviceResponse.vcReply.subtotalAmount;
		responseObject["VCTaxAmount"] = serviceResponse.vcReply.taxAmount;
		responseObject["VCTotalPurchaseAmount"] = serviceResponse.vcReply.totalPurchaseAmount;
		responseObject["VCRiskScore"] = serviceResponse.vcReply.riskScore;
		responseObject["VCRiskAdvice"] = serviceResponse.vcReply.riskAdvice;
		responseObject["VCPromotionCode"] = serviceResponse.vcReply.promotionCode;
		responseObject["VCNameOnCard"] = serviceResponse.vcReply.nameOnCard;
		responseObject["VCECI"] = serviceResponse.vcReply.eci;
		responseObject["VCPaymentInstrumentID"] = serviceResponse.vcReply.paymentInstrumentID;
		responseObject["VCCardVerificationStatus"] = serviceResponse.vcReply.cardVerificationStatus;
		responseObject["VCCardType"] = serviceResponse.vcReply.cardType;
		responseObject["cardArt"] = (!empty(serviceResponse.vcReply.cardArt)) ? "exists" : null;
		if(!empty(serviceResponse.vcReply.cardArt)){
			responseObject["VCCardArtFileName"] = serviceResponse.vcReply.cardArt.fileName;
			responseObject["VCCardArtHeight"] = serviceResponse.vcReply.cardArt.height;
			responseObject["VCCardArtWidth"] = serviceResponse.vcReply.cardArt.width;
		}
	}
	responseObject["card"] = (!empty(serviceResponse.card)) ? "exists" : null;
	if(!empty(serviceResponse.card)){
		responseObject["ExpirationMonth"] = serviceResponse.card.expirationMonth;
		responseObject["ExpirationYear"] = serviceResponse.card.expirationYear;
		responseObject["CardSuffix"] = serviceResponse.card.suffix;
	}
	responseObject["shipTo"] = (!empty(serviceResponse.shipTo)) ? "exists" : null;
	if(!empty(serviceResponse.shipTo)){
		responseObject["shipTo_Address1"] = serviceResponse.shipTo.street1;
		var address2 = serviceResponse.shipTo.street2!=null?serviceResponse.shipTo.street2:"";
		address2 = serviceResponse.shipTo.street3!=null?", "+serviceResponse.shipTo.street3:address2;
		address2 = serviceResponse.shipTo.street4!=null?", "+serviceResponse.shipTo.street4:address2;
		responseObject["shipTo_Address2"] = address2;
		responseObject["shipTo_City"] = serviceResponse.shipTo.city;
		responseObject["shipTo_StateCode"] = serviceResponse.shipTo.state;
		responseObject["shipTo_County"] = serviceResponse.shipTo.county;
		responseObject["shipTo_PostalCode"] = serviceResponse.shipTo.postalCode;
		responseObject["shipTo_CountryCode"] = serviceResponse.shipTo.country;
		responseObject["shipTo_Company"] = serviceResponse.shipTo.company;
		responseObject["shipTo_Phone"] = serviceResponse.shipTo.phoneNumber;
		responseObject["shipTo_Email"] = serviceResponse.shipTo.email;
		responseObject["shipTo_ShippingMethod"] = serviceResponse.shipTo.shippingMethod;
		responseObject["shipTo_AddressVerificationStatus"] = serviceResponse.shipTo.addressVerificationStatus;
		var firstName = serviceResponse.shipTo.firstName==null ? serviceResponse.shipTo.name.split(' ')[0] : serviceResponse.shipTo.firstName;
		var lastName = serviceResponse.shipTo.lastName!=null ? serviceResponse.shipTo.lastName : null;
		lastName = lastName==null && serviceResponse.shipTo.name.indexOf(' ') >= 0 ? serviceResponse.shipTo.name.substring(serviceResponse.shipTo.name.indexOf(' ')) : '';
		responseObject["shipTo_FirstName"] = firstName;
		responseObject["shipTo_LastName"] = lastName;
	}
	responseObject["billTo"] = (!empty(serviceResponse.billTo)) ? "exists" : null;
	if(!empty(serviceResponse.billTo)){
		responseObject["billTo_Address1"] = serviceResponse.billTo.street1;
		var address2 = serviceResponse.billTo.street2!=null?serviceResponse.billTo.street2:"";
		address2 = serviceResponse.billTo.street3!=null?", "+serviceResponse.billTo.street3:address2;
		address2 = serviceResponse.billTo.street4!=null?", "+serviceResponse.billTo.street4:address2;
		responseObject["billTo_Address2"] = address2;
		responseObject["billTo_City"] = serviceResponse.billTo.city;
		responseObject["billTo_StateCode"] = serviceResponse.billTo.state;
		responseObject["billTo_County"] = serviceResponse.billTo.county;
		responseObject["billTo_PostalCode"] = serviceResponse.billTo.postalCode;
		responseObject["billTo_CountryCode"] = serviceResponse.billTo.country;
		responseObject["billTo_Company"] = serviceResponse.billTo.company;
		responseObject["billTo_Phone"] = serviceResponse.billTo.phoneNumber;
		responseObject["billTo_Email"] = serviceResponse.billTo.email;
		var firstName = serviceResponse.billTo.firstName==null ? serviceResponse.billTo.name.split(' ')[0] : serviceResponse.billTo.firstName;
		var lastName = serviceResponse.billTo.lastName!=null ? serviceResponse.billTo.lastName : null;
		lastName = lastName==null && serviceResponse.billTo.name.indexOf(' ') >= 0 ? serviceResponse.billTo.name.substring(serviceResponse.billTo.name.indexOf(' ')) : '';
		responseObject["billTo_FirstName"] = firstName;
		responseObject["billTo_LastName"] = lastName;
	}
	return {success:true, serviceResponse:responseObject};
}


/**
 * This method is called when payer authorization is required along with CC validation.Service response is send to the calling method.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param Amount : Money
 * @param orderNo : String
 */

function PayerAuthEnrollCCAuthRequest(LineItemCtnrObj,Amount,OrderNo)
{
    var lineItemCtnrObj = LineItemCtnrObj;
    var amount = Amount;
    var orderNo : String = OrderNo;
    
	if(lineItemCtnrObj == null){
		Logger.error("[VisaCheckoutFacade.ds] Please provide a Basket!");
		return {error:true};
	}

	var wrappedKey = session.forms.visacheckout.encryptedPaymentWrappedKey.value;
	var data = session.forms.visacheckout.encryptedPaymentData.value;
	var callID = session.forms.visacheckout.callId.value;
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var csReference  = webreferences.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var deviceType = CommonHelper.getDeviceType(request);
	
	CybersourceHelper.addPayerAuthEnrollInfo(serviceRequest,orderNo,null,null,amount, null,LineItemCtnrObj.billingAddress.phone, deviceType);

	//Objects to set in the Service Request inside facade
	var shipTo, billTo, purchaseObject;
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var result = CommonHelper.CreateCybersourceShipToObject(lineItemCtnrObj);
	shipTo = result.shipTo;
	result = CommonHelper.CreateCyberSourceBillToObject(lineItemCtnrObj, true);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourcePurchaseTotalsObject(lineItemCtnrObj);
	purchaseObject = result.purchaseTotals;
	result = CommonHelper.CreateCybersourceItemObject(lineItemCtnrObj);
	var items : dw.util.List = result.items;
	/********************************/
	/* TOKEN-related WebService setup */
	/********************************/
	var enableTokenization : String = CybersourceHelper.getTokenizationEnabled();
	if(enableTokenization === 'YES')
	{
		CybersourceHelper.addPaySubscriptionCreateService(serviceRequest,billTo,purchaseObject,null,OrderNo);
	}
	//**************************************************************************//
	// the request object holds the input parameter for the AUTH request
	//**************************************************************************//	
	CybersourceHelper.addCCAuthRequestInfo(serviceRequest,billTo,shipTo,purchaseObject,null,orderNo, CybersourceHelper.getDigitalFingerprintEnabled(), items);
	CybersourceHelper.addVCAuthRequestInfo(serviceRequest, orderNo, wrappedKey, data);
	CybersourceHelper.addVCOrderID(serviceRequest,callID);
	/********************************/
	/* DAV-related WebService setup */
	/********************************/	
	var enableDAV = CybersourceHelper.getDavEnable();
	var approveDAV = CybersourceHelper.getDavOnAddressVerificationFailure();
	
	if( enableDAV === 'YES' ) {
		var ignoreDAVResult = false;
		if( approveDAV === 'APPROVE' ) {
			ignoreDAVResult = true;
		}
		CybersourceHelper.addDAVRequestInfo(serviceRequest, null, shipTo, ignoreDAVResult);
	}
	/* End of DAV WebService setup */
	
	/* AVS Service setup */
	var ignoreAVSResult = CybersourceHelper.getAvsIgnoreResult();
	var declineAVSFlags = CybersourceHelper.getAvsDeclineFlags();
	
	CybersourceHelper.addAVSRequestInfo(serviceRequest, ignoreAVSResult, declineAVSFlags);

	var serviceResponse = null;
	// send request
	try{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_VISA_CHECKOUT);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials;
		serviceResponse = service.call(requestWrapper); 
	}catch(e){
		Logger.error("[VisaCheckoutFacade.ds] Error in PayerAuthEnrollCheck request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	if(empty(serviceResponse) || !'OK'.equals(serviceResponse.status)){
		Logger.error("[VisaCheckoutFacade.ds] response in PayerAuthEnrollCheck response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in PayerAuthEnrollCheck response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	//set response values in local variables
	var responseObject = {};
	var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	result = CardHelper.ProcessCardAuthResponse(serviceResponse, shipTo, billTo);
	responseObject = result.responseObject;
	responseObject["payerAuthEnrollReply"] = (!empty(serviceResponse.payerAuthEnrollReply)) ? "exists" : null;
	if(!empty(serviceResponse.payerAuthEnrollReply)){
		responseObject["PAReasonCode"] = serviceResponse.payerAuthEnrollReply.reasonCode.get();
		responseObject["PACommerceIndicator"] = serviceResponse.payerAuthEnrollReply.commerceIndicator;
		responseObject["UCAFCollectionIndicator"] = serviceResponse.payerAuthEnrollReply.ucafCollectionIndicator;
		responseObject["ProofXML"] = serviceResponse.payerAuthEnrollReply.proofXML;
		responseObject["AcsURL"] = serviceResponse.payerAuthEnrollReply.acsURL;
		responseObject["PAXID"] = serviceResponse.payerAuthEnrollReply.xid;
		responseObject["PAReq"] = serviceResponse.payerAuthEnrollReply.paReq;
		responseObject["ProxyPAN"] = serviceResponse.payerAuthEnrollReply.proxyPAN;
		responseObject["authenticationTransactionID"] = serviceResponse.payerAuthEnrollReply.authenticationTransactionID;
	}
	return {success:true, serviceResponse:responseObject};
}

/**
 * This method is called when payer authorization and validation is done and CC validation is also done .Service response is send to the calling method.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param PaRes : String
 * @param Amount : Money
 * @param orderNo : String
 */
function PayerAuthValidationCCAuthRequest(LineItemCtnrObj : dw.order.LineItemCtnr,PaRes : String,Amount : dw.value.Money,OrderNo : String,processorTransactionId : String)
{
	var lineItemCtnrObj = LineItemCtnrObj;
    var orderNo = OrderNo;
    var amount = Amount;
    var signedPaRes = !empty(PaRes) ? dw.util.StringUtils.trim(PaRes) : '';
	//var signedPaRes : String =PaRes;
	signedPaRes = signedPaRes.replace('/[^a-zA-Z0-9/+=]/g',"");
	//**************************************************************************//
	// Set WebReference & Stub
	//**************************************************************************//	
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	
	var wrappedKey = session.forms.visacheckout.encryptedPaymentWrappedKey.value;
	var data = session.forms.visacheckout.encryptedPaymentData.value;
	var callID = session.forms.visacheckout.callId.value;
	var csReference = webreferences.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	
	CybersourceHelper.addPayerAuthValidateInfo(serviceRequest,orderNo,signedPaRes,null,amount, null, processorTransactionId);

	//Objects to set in the Service Request inside facade
	var shipTo, billTo, purchaseObject;
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var result = CommonHelper.CreateCybersourceShipToObject(lineItemCtnrObj);
	shipTo = result.shipTo;
	result = CommonHelper.CreateCyberSourceBillToObject(lineItemCtnrObj, true);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourcePurchaseTotalsObject(lineItemCtnrObj);
	purchaseObject = result.purchaseTotals;
	result = CommonHelper.CreateCybersourceItemObject(lineItemCtnrObj);
	var items : dw.util.List = result.items;
	/********************************/
	/* TOKEN-related WebService setup */
	/********************************/
	var enableTokenization : String = CybersourceHelper.getTokenizationEnabled();
	if(enableTokenization === 'YES')
	{
		CybersourceHelper.addPaySubscriptionCreateService(serviceRequest,billTo,purchaseObject,null,OrderNo);
	}
	//**************************************************************************//
	// the request object holds the input parameter for the AUTH request
	//**************************************************************************//	
	CybersourceHelper.addCCAuthRequestInfo(serviceRequest,billTo,shipTo,purchaseObject,null,orderNo, CybersourceHelper.getDigitalFingerprintEnabled(), items);
	CybersourceHelper.addVCAuthRequestInfo(serviceRequest, orderNo, wrappedKey, data);
	CybersourceHelper.addVCOrderID(serviceRequest,callID);
	
	var serviceResponse = null;
	// send request
	try{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_VISA_CHECKOUT);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials;
		serviceResponse = service.call(requestWrapper); 
	}catch(e){
		Logger.error("[VisaCheckoutFacade.ds] Error in PayerAuthValidation request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	
	if(empty(serviceResponse) || serviceResponse.status !== 'OK'){
		Logger.error("[VisaCheckoutFacade.ds] response in PayerAuthValidation response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in PayerAuthValidation response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	//set response values in local variables
	var responseObject = {};
	var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	result = CardHelper.ProcessCardAuthResponse(serviceResponse, shipTo, billTo);
	responseObject = result.responseObject;
	responseObject["payerAuthValidateReply"] = (!empty(serviceResponse.payerAuthValidateReply)) ? "exists" : null;
	if(!empty(serviceResponse.payerAuthValidateReply)){
		responseObject["AuthenticationResult"] = serviceResponse.payerAuthValidateReply.authenticationResult;
		responseObject["AuthenticationStatusMessage"] = serviceResponse.payerAuthValidateReply.authenticationStatusMessage;
		responseObject["CAVV"] = serviceResponse.payerAuthValidateReply.cavv;
		responseObject["UCAFAuthenticationData"] = serviceResponse.payerAuthValidateReply.ucafAuthenticationData;
		responseObject["UCAFCollectionIndicator"] = serviceResponse.payerAuthValidateReply.ucafCollectionIndicator;
		responseObject["PAVCommerceIndicator"] = serviceResponse.payerAuthValidateReply.commerceIndicator;
		responseObject["PAVXID"] = serviceResponse.payerAuthValidateReply.xid;
		responseObject["ECIRaw"] = serviceResponse.payerAuthValidateReply.eciRaw;
		responseObject["ParesStatus"] = serviceResponse.payerAuthValidateReply.paresStatus;
	}
	return {success:true, serviceResponse:responseObject};
}

/**
 * Load Visa Checkout Button via remote include where get th button settings from site preferences.
 */

function ButtonDisplay()
{
	var PaymentMgr = require('dw/order/PaymentMgr');
	var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'visacheckout/helper/VisaCheckoutHelper');
	var isVisaCheckout = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT).isActive();
    if (isVisaCheckout)
    {
    	var buttonsource = !empty(request.httpParameterMap.buttonsource.value)?request.httpParameterMap.buttonsource.value:'cart';
    	//set the response header (X-FRAME-OPTIONS) to prevent clickjacking
		response.addHttpHeader("X-FRAME-OPTIONS","SAMEORIGIN");
		//Visa Checkout Button settings query string from site preferences
		var result = VisaCheckoutHelper.GetButtonDisplaySettings();
		
		return result;
    }
}

/**
 * Visa Checkout Capture call is made to cybersource and response is sent back.
 * @param requestID : Capture request ID, which is same as that of VC Authorize service
 * @param merchantRefCode : Cybersource Merchant Reference Code
 * @param paymentType : Payment Type for Capture
 * @param purchaseTotal : Order total for current request
 * @param currency : 
 * @param orderid : Order No
 */

function VCCaptureRequest(requestID, merchantRefCode, paymentType, purchaseTotal, currency, orderid){
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	var CybersourceHelper = libCybersource.getCybersourceHelper();

	var csReference = webreferences.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	
	var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, purchaseTotal);
	purchaseObject = purchaseObject.purchaseTotals;
	serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);
	 //Adding Payment Solution in Request For Visa Checkout
	serviceRequest.paymentSolution = paymentType;
	libCybersource.setClientData(serviceRequest, merchantRefCode);
     // get the order object from OrderMgr class
    var order = dw.order.OrderMgr.getOrder(orderid);
     // Fetch the payment Instrument for the placed order
    var paymentinstr = CardHelper.getNonGCPaymemtInstument(order);
    if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
         CybersourceHelper.addVCOrderID(serviceRequest, paymentinstr.custom.callId);
    }
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
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_VISA_CHECKOUT);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials; 
		serviceResponse = service.call(requestWrapper); 
	}catch(e){
		Logger.error("[VisaCheckoutFacade.ds] Error in VCCaptureRequest request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	
	if(empty(serviceResponse) || serviceResponse.status !== "OK"){
		Logger.error("[VisaCheckoutFacade.ds] response in VCCaptureRequest response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in VCCaptureRequest response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	return serviceResponse;
}

/**
 * Visa Checkout AuthReversalService call is made to cybersource and response if send back.
 * @param requestID : 
 * @param amount : order total
 * @param merchantRefCode : cybersource reference number
 * @param paymentType : payment type
 * @currency : currency used
 * @param orderid : Order No
 */
function VCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount, orderid) {
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	var CybersourceHelper = libCybersource.getCybersourceHelper();

    var csReference = webreferences.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();
	var purchaseTotals = CardHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount);
		purchaseTotals = libCybersource.copyPurchaseTotals(purchaseTotals.purchaseTotals);
    	serviceRequest.purchaseTotals = purchaseTotals;
    //Adding Payment Solution in Request For Visa Checkout
	serviceRequest.paymentSolution = paymentType;
	// get the order object from OrderMgr class
   	var order = dw.order.OrderMgr.getOrder(orderid);
     // Fetch the payment Instrument for the placed order
    var paymentinstr = CardHelper.getNonGCPaymemtInstument(order);
    if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
         CybersourceHelper.addVCOrderID(serviceRequest, paymentinstr.custom.callId);
    }
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
			var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_VISA_CHECKOUT);
			var requestWrapper={};
		    serviceRequest.merchantID = merchantCrdentials.merchantID;
			requestWrapper.request = serviceRequest;
			requestWrapper.merchantCredentials = merchantCrdentials;
			serviceResponse = service.call(requestWrapper);
	  	} catch (e) {
	        Logger.error("[VisaCheckoutFacade.js] Error in VCAuthReversalService: {0}", e.message);
	        return { error: true, errorMsg: e.message };
	    }
	
	    if (empty(serviceResponse) || serviceResponse.status !== "OK") {
	        return { error: true, errorMsg: "empty or error in VC auth reversal service response: " + serviceResponse };
	    }
	    if (!empty(serviceResponse)) {
			serviceResponse = serviceResponse.object;
	    }
		
	    return serviceResponse;
}

/**
 * VC Credit call is made to cybersource and response is sent back.
 * @param requestID : Capture request ID, which is same as that of CC Authorize service
 * @param merchantRefCode : Cybersource Merchant Reference Code
 * @param paymentType : Payment Type for Credit
 * @param purchaseTotal : Order total for current request
 * @param currency : 
 * @param orderid : Order No
 */
function VCCreditRequest(requestID, merchantRefCode, paymentType, purchaseTotal, currency, orderid){
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	var CybersourceHelper = libCybersource.getCybersourceHelper();

	var csReference = webreferences.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	
	var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, purchaseTotal);
	purchaseObject = purchaseObject.purchaseTotals;
	serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);
	//Adding Payment Solution in Request For Visa Checkout
	serviceRequest.paymentSolution = paymentType;
	// get the order object from OrderMgr class
   	var order = dw.order.OrderMgr.getOrder(orderid);
     // Fetch the payment Instrument for the placed order
    var paymentinstr = CardHelper.getNonGCPaymemtInstument(order);
    if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
         CybersourceHelper.addVCOrderID(serviceRequest, paymentinstr.custom.callId);
    }
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
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials; 
		serviceResponse = service.call(requestWrapper); 
	}catch(e){
		Logger.error("[VisaCheckoutFacade.ds] Error in VCCreditRequest request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	
	if(empty(serviceResponse) || serviceResponse.status !== "OK"){
		Logger.error("[VisaCheckoutFacade.ds] response in VCCreditRequest response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in VCCreditRequest response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	return serviceResponse;
}


module.exports = {
		VCDecryptRequest:VCDecryptRequest,
		PayerAuthValidationCCAuthRequest : PayerAuthValidationCCAuthRequest,
		PayerAuthEnrollCCAuthRequest:PayerAuthEnrollCCAuthRequest,
		CCAuthRequest:CCAuthRequest,
		ButtonDisplay:ButtonDisplay,
		VCCaptureRequest:VCCaptureRequest,
		VCAuthReversalService:VCAuthReversalService,
		VCCreditRequest:VCCreditRequest
};