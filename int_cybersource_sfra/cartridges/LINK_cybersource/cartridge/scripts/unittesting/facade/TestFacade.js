'use strict';


var Logger = require('dw/system/Logger');
var dwsvc = require("dw/svc");
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var CybersourceHelper = libCybersource.getCybersourceHelper();
var TestHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/helper/TestHelper');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');

/**
 * Function is used to test the Alipay Initial request with the request amount and currency 
 * @param purchaseTotals : Object , having amount and currency value.
 */


function TestAlipayInitiateRequest() {
    var Site = require('dw/system/Site');
    var alipayPaymentType = Site.getCurrent().getCustomPreferenceValue('apPaymentType').value;
    var args = {};
    args.currency = alipayPaymentType.equals('APD') ? 'CNY' : 'USD';
    var purchaseTotals = TestHelper.CreateCyberSourcePurchaseTotalsObject(args);
    //set the order object, purchase object and return URL from pipeline dictionary
    var purchaseObject = purchaseTotals.purchaseTotals;
    var productName = "Test Product";
    var productDescription = "Test Description";
    //create service stubs
    var csReference = webreferences.CyberSourceTransaction;
    var paymentMethod = CybersourceConstants.METHOD_ALIPAY;

    var serviceRequest = new csReference.RequestMessage();

    //call alipay initiate service by passing required input parameters
    CybersourceHelper.apInitiateService(serviceRequest, null, purchaseObject, productName, productDescription, "test", alipayPaymentType);
    var serviceResponse = {};
    //get the response in response object
    try {
        serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
    }
    catch (e) {
        Logger.error("[TestFacade.js] Error in AlipayInitiatePaymentRequest ( {0} )", e.message);
        return { error: true, errorMsg: e.message };
    }

    //log the response in case of error scenario
    if (empty(serviceResponse) || serviceResponse.status !== "OK") {
        Logger.error("[TestFacade.js] AlipayInitiatePaymentRequest Error : null response");
        return { error: true, errorMsg: "empty or error in test alipayInitiate response: " + serviceResponse };
    }
    var serviceReply = 'apInitiateReply';
    var heading = '';
    //set response values in pipeline dictionary
    var responseObject = ProcessResponse(serviceResponse, serviceReply, heading);
    return { success: true, serviceResponse: responseObject };
}

/**
 * Function is used to test the credit card authorization service.
 * @param purchaseTotals : Object , having amount and currency value.
 * @param bill To : billing address of the order
 * @param ship to : Shipping address of the order
 * @param card : card details
 */

function TestCCAuth(billTo, shipTo, card, purchaseTotals) {
    var Money = require('dw/value/Money');
    var amount = new Money(2057.00, "USD");
    var billToObject = billTo;
    var shipToObject = shipTo;
    var cardObject = card;
    var purchaseObject = purchaseTotals;
    var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;
    var csReference = webreferences.CyberSourceTransaction;

    var serviceRequest = new csReference.RequestMessage();
    var Item_Object = require('~/cartridge/scripts/cybersource/Cybersource_Item_Object');
    var itemObject = new Item_Object();
    itemObject.setUnitPrice(10, "000000.00", "en_US");
    itemObject.setId(1);
    var ArrayList = require('dw/util/ArrayList');
    var itemObjects = new ArrayList();
    itemObjects.add(itemObject);

    CybersourceHelper.addCCAuthRequestInfo(serviceRequest, billToObject, shipToObject, purchaseObject, cardObject, "test", CybersourceHelper.getDigitalFingerprintEnabled(), itemObjects);

    /********************************/
    /* DAV-related WebService setup */
    /********************************/
    var enableDAV = CybersourceHelper.getDavEnable();
    var approveDAV = CybersourceHelper.getDavOnAddressVerificationFailure();

    if (enableDAV === 'YES') {
        var ignoreDAVResult = false;
        if (approveDAV === 'APPROVE') {
            ignoreDAVResult = true;
        }
        CybersourceHelper.addDAVRequestInfo(serviceRequest, billToObject, shipToObject, ignoreDAVResult);
    }
    /* End of DAV WebService setup */

    /* AVS Service setup */
    var ignoreAVSResult = CybersourceHelper.getAvsIgnoreResult();
    var declineAVSFlags = CybersourceHelper.getAvsDeclineFlags();

    CybersourceHelper.addAVSRequestInfo(serviceRequest, ignoreAVSResult, declineAVSFlags);
    /* End of AVS Service setup */


    var serviceResponse = {};
    // send request
    try {
        serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in TestCCAuth request ( {0} )", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== "OK") {
        return { error: true, errorMsg: "empty or error in test ccauth response: " + serviceResponse };
    }
    var serviceReply = '',
        heading = '';
    var responseObject = ProcessResponse(serviceResponse, serviceReply, heading);
    responseObject["ccAuthReply"] = (null !== serviceResponse.object.ccAuthReply) ? "exists" : null;
    if (null !== serviceResponse.object.ccAuthReply) {
        responseObject["AuthorizationAmount"] = serviceResponse.object.ccAuthReply.amount;
        responseObject["AuthorizationReasonCode"] = serviceResponse.object.ccAuthReply.reasonCode.get();
        responseObject["AuthorizationCode"] = serviceResponse.object.ccAuthReply.authorizationCode;
        responseObject["AVSCode"] = serviceResponse.object.ccAuthReply.avsCode;
        responseObject["AVSCodeRaw"] = serviceResponse.object.ccAuthReply.avsCodeRaw;
    }
    return { success: true, serviceResponse: responseObject };
}

/**
 * Function is used to test the create subscription service.
 * @param purchaseTotals : Object , having amount and currency value.
 * @param bill To : billing address of the order
 * @param card : card details
 */
function TestCreateSubscription(billTo, card, purchaseTotals) {

    var billToObject = billTo;
    var cardObject = card;
    var purchaseObject = purchaseTotals;
    var returnObject = {};
    var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;

    var csReference = webreferences.CyberSourceTransaction;
    var request = new csReference.RequestMessage();

    CybersourceHelper.addPaySubscriptionCreateService(request, billToObject, purchaseObject, cardObject, "test");

    var response = {};
    // send request
    try {
        response = getServiceResponse(request, paymentMethod);
    } catch (e) {
        return { error: true, errorCode: "500", errorMsg: e.description };
    }

    if (empty(response) || response.status !== "OK") {
        Logger.error("[TestFacade.js] TestCreateSubscription Error : null response");
        return { error: true, errorMsg: "empty or error in test TestCreateSubscription response: " + response };
    }
    else {
        response = response.object;
        if (null != response.paySubscriptionCreateReply) {
            returnObject['SubscriptionIDToken'] = response.paySubscriptionCreateReply.subscriptionID;
        }
        returnObject['decision'] = response.decision;
        returnObject['invalidField'] = response.invalidField;
        returnObject['missingField'] = response.missingField;
        returnObject['reasonCode'] = response.reasonCode;
        returnObject['requestID'] = response.requestID;
        returnObject['requestToken'] = response.requestToken;
    }
    return { success: true, response: returnObject };
}

/**
 * Function is used to test the DAV request service.
 * @param bill To : billing address of the order
 * @param ship to : Shipping address of the order
*/

function TestDAVRequest(billTo, shipTo) {

    var csReference = webreferences.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();
    var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;

    CybersourceHelper.addDAVRequestInfo(serviceRequest, billTo, shipTo, false, "TEST123");

    var serviceResponse = {};
    // send request
    try {
        serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in TestDAVCheck request ( {0} )", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status != "OK") {
        return { error: true, errorMsg: "empty or error in TestDAVCheck response: " + serviceResponse };
    }
    var serviceReply = '',
        heading = '';
    var responseObject = ProcessResponse(serviceResponse, serviceReply, heading);
    if (!empty(serviceResponse.object.missingField)) {
        responseObject["MissingFieldsArray"] = serviceResponse.object.missingField;
    }
    if (!empty(serviceResponse.object.invalidField)) {
        responseObject["InvalidFieldsArray"] = serviceResponse.object.invalidField;
    }
    responseObject["davReply"] = (null !== serviceResponse.object.davReply) ? "exists" : null;
    if (null !== serviceResponse.object.davReply) {
        responseObject["DAVReasonCode"] = serviceResponse.object.davReply.reasonCode.get();
        if (!empty(serviceResponse.object.davReply.standardizedAddress1)) {
            var stdAddress = {};
            stdAddress.firstName = shipTo.firstName;
            stdAddress.lastName = shipTo.lastName;
            stdAddress.address1 = serviceResponse.object.davReply.standardizedAddress1;
            stdAddress.address2 = serviceResponse.object.davReply.standardizedAddress2;
            stdAddress.city = serviceResponse.object.davReply.standardizedCity;
            //Defect fix: CYB-92 : DAV Country province code 
            if ("CsCorrectShipState" in dw.system.Site.getCurrent().getPreferences().getCustom() &&
                true === dw.system.Site.getCurrent().getCustomPreferenceValue("CsCorrectShipState")) {
                stdAddress.state = serviceResponse.object.davReply.standardizedState;
            } else if (!empty(shipTo.state))
                stdAddress.state = shipTo.state;
            else {
                stdAddress.state = billTo.state;
            }
            stdAddress.postalCode = serviceResponse.object.davReply.standardizedPostalCode;
            //Fix for CYB-91: DAV Country code 
            stdAddress.country = serviceResponse.object.davReply.standardizedISOCountry;
            responseObject["StandardizedAddress"] = stdAddress;
        }
    }

    switch (responseObject["DAVReasonCode"]) {
        case 101:
        case 102:
        case 450:
        case 451:
        case 452:
        case 453:
        case 454:
        case 455:
        case 456:
        case 457:
        case 458:
        case 459:
        case 460:
            responseObject["Result"] = "Declined";
            break;
        case 100:
            responseObject["Result"] = "Authorized";
            break;
        default:
            responseObject["Result"] = "Error";
    }

    return { success: true, serviceResponse: responseObject };
}

/**
 * Function is used to test the on demand .
 * @param purchaseTotals : Object , having amount and currency value.
 * @param bill To : billing address of the order
 * @param ship to : Shipping address of the order
 * @param card : card details
 */
function TestOnDemandSubscription() {
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var subscriptionID = session.forms.subscription.subscriptionID.htmlValue;
    var currency = session.forms.subscription.currency.htmlValue;
    var amount = session.forms.subscription.amount.htmlValue;
    var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount).purchaseTotals;
    //var purchaseObject = purchaseTotals;
    var csReference = webreferences.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();
    var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;

    CybersourceHelper.addOnDemandSubscriptionInfo(subscriptionID, serviceRequest, purchaseObject, "test");
    serviceRequest.ccAuthService = new CybersourceHelper.csReference.CCAuthService();
    serviceRequest.ccAuthService.run = true;

    var serviceResponse = {};
    // send request
    try {
        serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
    } catch (e) {
        Logger.error('[libCybersource.ds] Error in subscription request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        return { error: true, errorMsg: serviceResponse.status };
    }

    var responseObject = {};
    var serviceReply = 'ccAuthReply',
        heading = '';

    responseObject = ProcessResponse(serviceResponse, serviceReply, heading);
    if (null !== serviceResponse.object.ccAuthReply) {
        responseObject["amount"] = serviceResponse.object.ccAuthReply.amount;
        responseObject["authorizationCode"] = serviceResponse.object.ccAuthReply.authorizationCode;
        responseObject["authorizedDateTime"] = serviceResponse.object.ccAuthReply.authorizedDateTime;
        responseObject["processorResponse"] = serviceResponse.object.ccAuthReply.processorResponse;
    }
    return { success: true, response: responseObject };
}

/**
 * Function is used to test the Payer Auth Enroll check .
 * @param CreditCard : Object having credit card details 
 */
function TestPayerAuthEnrollCheck(CreditCard) {

    var csReference = webreferences.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();
    var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;

    CybersourceHelper.addTestPayerAuthEnrollInfo(serviceRequest, CreditCard);

    var serviceResponse = {};
    try {
        serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in TestPayerAuthEnrollCheck ( {0} )", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== "OK") {
        return { error: true, errorMsg: "empty or error in test PAEnrollCheck response: " + serviceResponse };
    }

    serviceResponse = serviceResponse.object;
    var responseObject = {};
    responseObject["PARequestID"] = serviceResponse.requestID;
    responseObject["PARequestToken"] = serviceResponse.requestToken;
    responseObject["PAReasonCode"] = serviceResponse.reasonCode.get();
    responseObject["PADecision"] = serviceResponse.decision;
    responseObject["payerAuthEnrollReply"] = serviceResponse.payerAuthEnrollReply != null ? "exists" : null;
    if (serviceResponse.payerAuthEnrollReply != null) {
        responseObject["CommerceIndicator"] = serviceResponse.payerAuthEnrollReply.commerceIndicator;
        responseObject["ProofXML"] = serviceResponse.payerAuthEnrollReply.proofXML;
        responseObject["AcsURL"] = serviceResponse.payerAuthEnrollReply.acsURL;
        responseObject["PAXID"] = serviceResponse.payerAuthEnrollReply.xid;
        responseObject["PAReq"] = serviceResponse.payerAuthEnrollReply.paReq;
        responseObject["ProxyPAN"] = serviceResponse.payerAuthEnrollReply.proxyPAN;
    }
    return { success: true, serviceResponse: responseObject };
}

/**
 * Function is used to test the validation of Payer Auth on basis of payer response .
 * @param CreditCard : Object having credit card details 
 * @param PaRes : response of payer 
 */

function TestPayerAuthValidation(PaRes, CreditCard) {
    var signedPaRes = dw.util.StringUtils.trim(PaRes);
    var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;
    signedPaRes = signedPaRes.replace('/[^a-zA-Z0-9/+=]/g', "");
    var csReference = webreferences.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();
    CybersourceHelper.addTestPayerAuthValidateInfo(serviceRequest, signedPaRes, CreditCard);
    var serviceResponse = {};
    try {
        Logger.debug("[PayerAuthValidation.ds] Sending PayerAuthValidation...");
        serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in PayerAuthValidation request ( {0} )", e.message);
        return { error: true, errorMsg: e.message };
    }
    if (empty(serviceResponse) || serviceResponse.status !== "OK") {
        return { error: true, errorMsg: "empty or error in TestPayerAuthValidation response: " + serviceResponse };
    }
    serviceResponse = serviceResponse.object;
    var responseObject = {};
    responseObject["PAVRequestID"] = serviceResponse.requestID;
    responseObject["PAVRequestToken"] = serviceResponse.requestToken;
    responseObject["PAVReasonCode"] = serviceResponse.reasonCode.get();
    responseObject["PAVDecision"] = serviceResponse.decision;
    responseObject["payerAuthValidateReply"] = serviceResponse.payerAuthValidateReply != null ? "exists" : null;
    if (serviceResponse.payerAuthValidateReply != null) {
        responseObject["PAVCommerceIndicator"] = serviceResponse.payerAuthValidateReply.commerceIndicator;
        responseObject["PAVResult"] = serviceResponse.payerAuthValidateReply.authenticationResult;
        responseObject["ECIRaw"] = serviceResponse.payerAuthValidateReply.eciRaw;
        responseObject["ParesStatus"] = serviceResponse.payerAuthValidateReply.paresStatus;
        responseObject["CAVV"] = serviceResponse.payerAuthValidateReply.cavv;
        responseObject["PAVStatusMessage"] = serviceResponse.payerAuthValidateReply.authenticationStatusMessage;
        responseObject["UCAFAuthenticationData"] = serviceResponse.payerAuthValidateReply.ucafAuthenticationData;
        responseObject["UCAFCollectionIndicator"] = serviceResponse.payerAuthValidateReply.ucafCollectionIndicator;
        responseObject["PAVXID"] = serviceResponse.payerAuthValidateReply.xid;
    }
    return { success: true, serviceResponse: responseObject };
}

/**
 * This service is used to test the tax request and the service gived tax information in response.
 * @param cart : cart
 */


function TestTax(cart) {
    
    var serviceResponse;
    var TaxFacade = require('~/cartridge/scripts/facade/TaxFacade');
    serviceResponse = TaxFacade.TaxationRequest(cart);

    if (empty(serviceResponse) || serviceResponse.error) {
        return { error: true, errorMsg: "empty or error in test ccauth response: " + serviceResponse };
    }
    serviceResponse = serviceResponse.response.response;

    var DAVReasonCode, TaxReply, resItem, totalTaxAmount, reasonCode;
    var missingFields = "", invalidFields = "";
	/*if( !empty(serviceResponse.davReply) ) {
		DAVReasonCode = serviceResponse.davReply;
	}*/

    // in case of success update basket
    if (serviceResponse.decision === "ACCEPT") {
        TaxReply = libCybersource.copyTaxAmounts(serviceResponse.taxReply);
		/*for each(var resItem in serviceResponse.taxReply.item){
			var lineItem = itemMap.get(resItem.id);
			var itemTax = new Money(parseFloat((lineItem['class']==="dw.order.PriceAdjustment"?"-":"")+resItem.totalTaxAmount),"USD");
			lineItem.setTax(itemTax);
			lineItem.setGrossPrice(lineItem.netPrice+=itemTax);
		}*/
        totalTaxAmount = serviceResponse.taxReply.totalTaxAmount;
        reasonCode = serviceResponse.reasonCode;
    } else if (serviceResponse.decision === "REJECT") {
        if (null !== serviceResponse.missingField) {
            for (var i: Number = 0; i < serviceResponse.missingField.length; i++) {
                missingFields += serviceResponse.missingField[i];
            }
        }
        if (null !== serviceResponse.invalidField) {
            for (var i: Number = 0; i < serviceResponse.invalidField.length; i++) {
                invalidFields += serviceResponse.invalidField[i];
            }
        }
        Logger.error("[TestFacade.ds] Taxation request REJECTED (ReasonCode {0} ). \nRequestToken: {1} \nMissing Fields: {2} \nInvalid Fields: {3}", serviceResponse.reasonCode, serviceResponse.requestToken, missingFields, invalidFields);
        reasonCode = serviceResponse.reasonCode;
    } else if (serviceResponse.decision === "ERROR") {
        Logger.error("[TestFacade.ds] Taxation request ERROR (ReasonCode {0} ). \nRequestToken: {1}", serviceResponse.reasonCode, serviceResponse.requestToken);
        reasonCode = serviceResponse.reasonCode;
    }

    if (reasonCode == 100) {
        var responseObject = {};
        responseObject["RequestID"] = serviceResponse.requestID;
        responseObject["RequestToken"] = serviceResponse.requestToken;
        responseObject["ReasonCode"] = serviceResponse.reasonCode.get();
        responseObject["Decision"] = serviceResponse.decision;
        responseObject["DAVReasonCode"] = DAVReasonCode;
        responseObject["CybersourceShipTo"] = cart.defaultShipment.shippingAddress;
        responseObject["shipFrom"] = null;
        responseObject["CybersourceBillTo"] = cart.billingAddress;
        responseObject["MissingFieldsArray"] = missingFields;
        responseObject["InvalidFieldsArray"] = invalidFields;
        responseObject["TaxReply"] = TaxReply;
        responseObject["TotalTaxAmount"] = totalTaxAmount;
        return { success: true, serviceResponse: responseObject };
    } else {
        return { error: true, errorMsg: 'reason code mismatch, reason code is ' + reasonCode };
    }
}


/**
 * Function to test seccure acceptance create token call.
 * @param billToObject : contains billing address of the order.
 * @param shipToObject : contains shipping address of the order.
 * @param purchaseObject : to get amount and currency of the order. 
 */

function TestSACreateToken(billToObject, shipToObject, purchaseObject) {
    try {
        var HashMap = require('dw/util/HashMap');
        var requestMap = new HashMap();
        var sitePreference = {};
        var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
        var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');

        sitePreference["access_key"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_AccessKey");
        sitePreference["profile_id"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_ProfileID");
        sitePreference["secretKey"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_SecretKey");
        sitePreference["formAction"] = "https://testsecureacceptance.cybersource.com/token/create";
        sitePreference["signed_field_names"] = "access_key,profile_id,transaction_uuid,signed_field_names,unsigned_field_names,signed_date_time,locale,transaction_type,reference_number,amount,currency,ignore_cvn,ignore_avs,skip_decision_manager,bill_to_email,bill_to_address_line1,bill_to_address_line2,bill_to_address_city,bill_to_address_postal_code,bill_to_address_state,bill_to_address_country,bill_to_forename,bill_to_surname,bill_to_phone,ship_to_address_city,ship_to_address_line1,ship_to_address_line2,ship_to_forename,ship_to_phone,ship_to_surname,ship_to_address_state,ship_to_address_postal_code,ship_to_address_country,override_custom_cancel_page,override_custom_receipt_page,payment_method";
        sitePreference["unsigned_field_names"] = "";
        sitePreference["CsTokenizationEnable"] = "YES";
        var ignore_avs: Boolean = false;
        var ignore_cvn: Boolean = false;
        var transaction_type = "create_payment_token";
        var UUIDUtils = require('dw/util/UUIDUtils');
        var transaction_uuid = UUIDUtils.createUUID();
        var Calendar = require('dw/util/Calendar');
        var date = new Calendar(new Date());
        date.timeZone = "UTC";
        var StringUtils = require('dw/util/StringUtils');
        var signed_date_time = StringUtils.formatCalendar(date, "yyyy-MM-dd'T'HH:mm:ss'Z'");

        requestMap.put('reference_number', 'test');
        requestMap.put('ignore_avs', true);
        requestMap.put('ignore_cvn', true);
        requestMap.put('skip_decision_manager', false);

        requestMap = secureAcceptanceHelper.TestLineItemCtnrRequestData(billToObject, shipToObject, purchaseObject, requestMap);
        requestMap.put('payment_method', 'card');

        requestMap.put('locale', CommonHelper.GetRequestLocale());
        requestMap.put('access_key', sitePreference["access_key"]);
        requestMap.put('profile_id', sitePreference["profile_id"]);
        requestMap.put('transaction_type', transaction_type);
        requestMap.put('transaction_uuid', transaction_uuid);
        requestMap.put('signed_date_time', signed_date_time);
        requestMap.put('signed_field_names', sitePreference["signed_field_names"]);
        requestMap.put('unsigned_field_names', sitePreference["unsigned_field_names"]);
        requestMap.put('override_custom_cancel_page', dw.web.URLUtils.https('CYBServicesTesting-TestSATokenCreateResponse'));
        requestMap.put('override_custom_receipt_page', dw.web.URLUtils.https('CYBServicesTesting-TestSATokenCreateResponse'));

        var dataToSign = secureAcceptanceHelper.BuildDataToSign(requestMap);
        var signature = CommonHelper.signedDataUsingHMAC256(dataToSign, sitePreference["secretKey"]);
        requestMap.put('signature', signature.toString());

        return { success: true, requestMap: requestMap, formAction: sitePreference["formAction"] };
    } catch (exception) {
        return { error: true, errorMsg: exception.message };
    }
}


/**
 * This service is used to test the sale request/response.
 */

function TestSaleService() {
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var csReference = webreferences.CyberSourceTransaction;

    var requestID = session.forms.generictestinterfaceform.orderRequestID.htmlValue;
    var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.generictestinterfaceform.paymenttype.htmlValue;
    var paymentMethod = getPaymentMethod(paymentType);

    var request = new csReference.RequestMessage();
    var response = {};
    var serviceReply = '';
    var responseObject = {};
    var heading = 'test.saleserviceresult';
    var apSaleService = {};

    // set the merchant reference code and client data for request
    libCybersource.setClientData(request, merchantRefCode);

    var Order = dw.order.OrderMgr.getOrder(session.forms.generictestinterfaceform.merchantReferenceCode.value);
    var result = CommonHelper.CreateCyberSourceBillToObject(Order, true);
    var billTo = result.billTo;
    request.billTo = libCybersource.copyBillTo(billTo);

    request = createPurchaseTotalObject(session.forms, request);
    // set the Payment Type
    request.apPaymentType = paymentType;
    apSaleService = new CybersourceHelper.csReference.APSaleService();
    serviceReply = 'apSaleReply';
    //set the request ID
    apSaleService.orderRequestID = requestID;
    //request.ap = ap;
    request.apSaleService = apSaleService;
    request.apSaleService.run = true;

    try {
        // create request,make service call and store returned response
        response = getServiceResponse(request, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in TestSaleService: {0}", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(response) || response.status != "OK") {
        return { error: true, errorMsg: "empty or error in test sale service response: " + response };
    }
    if (!empty(response)) {
        responseObject = ProcessResponse(response, serviceReply, heading);
    }
    return responseObject;
}

/**
 * This service is used to test the authorization service & its response.
 * @param CurrentForm : The Authorize Service Form 
 */
function TestAuthorizeService() {
    var csReference = webreferences.CyberSourceTransaction;
    var request = new csReference.RequestMessage();
    var response = {};
    var serviceReply = '';
    var responseObject = {};
    var heading = 'test.paypalauthorizeserviceresult';
    var paymentMethod = '';
    var ap = {};
    var apAuthService = {};

    //Helper Part
    request = createPurchaseTotalObject(session.forms, request);	// set the merchant reference code and client data for request
    libCybersource.setClientData(request, session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue);

    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var Order = dw.order.OrderMgr.getOrder(session.forms.generictestinterfaceform.merchantReferenceCode.value);
    var result = CommonHelper.CreateCyberSourceBillToObject(Order, true);
    var billTo = result.billTo;
    request.billTo = libCybersource.copyBillTo(billTo);

    // set the Payment Type
    request.apPaymentType = session.forms.generictestinterfaceform.paymenttype.htmlValue;
    ap = new CybersourceHelper.csReference.AP();
    request.ap = ap;
    apAuthService = new CybersourceHelper.csReference.APAuthService();
    serviceReply = 'apAuthReply';
    //set the request ID
    apAuthService.orderRequestID = session.forms.generictestinterfaceform.orderRequestID.htmlValue;
    request.apAuthService = apAuthService;
    request.apAuthService.run = true;

    //Facade Part
    try {
        // create request,make service call and store returned response
        response = getServiceResponse(request, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in TestAuthorizeService: {0}", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(response) || response.status != "OK") {
        return { error: true, errorMsg: "empty or error in test sale service response: " + response };
    }

    if (!empty(response)) {
        responseObject = ProcessResponse(response, serviceReply, heading);
    }
    return responseObject;
}



/**
 * This service is used to test the refund request/response.
 */

function TestRefundService() {
    var csReference = webreferences.CyberSourceTransaction;

    var request = new csReference.RequestMessage();
    var response = {};
    var serviceReply = '';
    var responseObject = {};
    var heading = 'test.refundserviceresult';
    var apRefundService = {};
    var requestID = session.forms.generictestinterfaceform.refundRequestID.htmlValue;
    var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.generictestinterfaceform.refundpaymenttype.htmlValue;
    var paymentMethod = getPaymentMethod(paymentType);

    request = createPurchaseTotalObject(session.forms, request);
    // set the merchant reference code and client data for request
    libCybersource.setClientData(request, merchantRefCode);
    // set the Payment Type
    request.apPaymentType = paymentType;
    apRefundService = new CybersourceHelper.csReference.APRefundService();
    serviceReply = 'apRefundReply';
    //set the request ID
    apRefundService.refundRequestID = requestID;
    request.apRefundService = apRefundService;
    request.apRefundService.run = true;

    try {
        // create request,make service call and store returned response
        response = getServiceResponse(request, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in RefundService: {0}", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(response) || response.status != "OK") {
        return { error: true, errorMsg: "empty or error in refund service response: " + response };
    }
    if (!empty(response)) {
        responseObject = ProcessResponse(response, serviceReply, heading);
    }
    return responseObject;

}



/**
 * This service is used to test the cancel request/response.
 */

function TestCancelService() {
    var csReference = webreferences.CyberSourceTransaction;
    var request = new csReference.RequestMessage();

    var response = {};
    var serviceReply = '';
    var responseObject = {};
    var heading = 'test.cancelserviceresult';

    var requestID = session.forms.generictestinterfaceform.orderRequestID.htmlValue;
    var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.generictestinterfaceform.paymenttype.htmlValue;
    var paymentMethod = getPaymentMethod(paymentType);
    var apCancelService = {};

    // set the merchant reference code and client data for request
    libCybersource.setClientData(request, merchantRefCode);
    // set the Payment Type
    request.apPaymentType = paymentType;
    apCancelService = new CybersourceHelper.csReference.APCancelService();
    serviceReply = 'apCancelReply';
    //set the request ID
    apCancelService.orderRequestID = requestID;
    request.apCancelService = apCancelService;
    request.apCancelService.run = true;

    try {
        // create request,make service call and store returned response
        response = getServiceResponse(request, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in CancelService: {0}", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(response) || response.status != "OK") {
        return { error: true, errorMsg: "empty or error in cancel service response: " + response };
    }
    if (!empty(response)) {
        responseObject = ProcessResponse(response, serviceReply, heading);
    }

    return responseObject;

}


function TestCaptureService() {
    var csReference = webreferences.CyberSourceTransaction;
    var request = new csReference.RequestMessage();

    var requestID = session.forms.generictestinterfaceform.authRequestID.htmlValue;
    var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.generictestinterfaceform.capturepaymenttype.htmlValue;
    var paymentMethod = getPaymentMethod(paymentType);
    var ccCaptureService = {};
    var apCaptureService = {};

    var response = {};
    var serviceReply = '';
    var responseObject = {};
    var heading = 'test.captureserviceresult';

    request = createPurchaseTotalObject(session.forms, request);
    // set the merchant reference code and client data for request
    libCybersource.setClientData(request, merchantRefCode);

    // Add VC field if Visa Checkout and handle the order ID from the form
    if (paymentType.equals('visacheckout')) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        // get the order object from OrderMgr class
        var order = dw.order.OrderMgr.getOrder(merchantRefCode);
        // Fetch the payment Instrument for the placed order
        var paymentinstr = CardHelper.getNonGCPaymemtInstument(order);
        if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
            CybersourceHelper.addVCOrderID(request, paymentinstr.custom.callId);
        }
    }

    if (paymentType.equals('CC') || paymentType.equals('visacheckout')) {
        // Create CCCapture service reference for Credit Card and Visa Checkout
        ccCaptureService = new CybersourceHelper.csReference.CCCaptureService();
        serviceReply = 'ccCaptureReply';
        ccCaptureService.authRequestID = requestID;
        request.ccCaptureService = ccCaptureService;
        request.paymentSolution = paymentType;
        request.ccCaptureService.run = true;
    } else {
        // Create APCapture service reference for Klarna and PayPal
        apCaptureService = new CybersourceHelper.csReference.APCaptureService();
        serviceReply = 'apCaptureReply';
        // set the Payment Type for Klarna and PayPal
        request.apPaymentType = paymentType;
        //set the request ID
        apCaptureService.authRequestID = requestID;
        request.apCaptureService = apCaptureService;
        request.apCaptureService.run = true;
    }

    try {
        // create request,make service call and store returned response
        response = getServiceResponse(request, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in CaptureService: {0}", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(response) || response.status != "OK") {
        return { error: true, errorMsg: "empty or error in capture service response: " + response };
    }
    if (!empty(response)) {
        responseObject = ProcessResponse(response, serviceReply, heading);
    }

    return responseObject;

}



function TestAuthReversalService() {
    var csReference = webreferences.CyberSourceTransaction;
    var request = new csReference.RequestMessage();

    var response = {};
    var serviceReply = '';
    var responseObject = {};
    var heading = 'test.authreversalserviceresult';

    var requestID = session.forms.generictestinterfaceform.authRequestID.htmlValue;
    var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.generictestinterfaceform.authreversalpaymenttype.htmlValue;
    var paymentMethod = getPaymentMethod(paymentType);
    var ccAuthReversalService = {};
    var apAuthReversalService = {};

    if (paymentType.equals('KLI')) {
        // create billto, shipto for Klarna only 
        var Order = dw.order.OrderMgr.getOrder(merchantRefCode);
        var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
        if (null != Order) {
            var billTo = CommonHelper.CreateCyberSourceBillToObject(Order, true).billTo;
            var shipTo = CommonHelper.CreateCybersourceShipToObject(Order).shipTo;
            request.shipTo = libCybersource.copyShipTo(shipTo);
            request.billTo = libCybersource.copyBillTo(billTo);
        }
    }

    if (paymentType.equals('KLI') || paymentType.equals('CC')) {
        request = createPurchaseTotalObject(session.forms, request);
    }

    // set the merchant reference code and client data for request
    libCybersource.setClientData(request, merchantRefCode);

    if (paymentType.equals('CC')) {
        // Create CCAuthReversal service reference for Credit Card
        ccAuthReversalService = new CybersourceHelper.csReference.CCAuthReversalService();
        serviceReply = 'ccAuthReversalReply';
        ccAuthReversalService.authRequestID = requestID;
        request.ccAuthReversalService = ccAuthReversalService;
        request.ccAuthReversalService.run = true;
    } else {
        // Create APAuthReversal service reference for Klarna and PayPal
        apAuthReversalService = new CybersourceHelper.csReference.APAuthReversalService();
        serviceReply = 'apAuthReversalReply';
        // set the Payment Type for Klarna and PayPal
        request.apPaymentType = paymentType;
        //set the request ID
        apAuthReversalService.authRequestID = requestID;
        request.apAuthReversalService = apAuthReversalService;
        request.apAuthReversalService.run = true;
    }

    try {
        // create request,make service call and store returned response
        response = getServiceResponse(request, paymentMethod);
    } catch (e) {
        Logger.error("[TestFacade.js] Error in TestAuthReversalService: {0}", e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(response) || response.status !== "OK") {
        return { error: true, errorMsg: "empty or error in test auth reversal service response: " + response };
    }
    if (!empty(response)) {
        responseObject = ProcessResponse(response, serviceReply, heading);
    }

    return responseObject;
}



function TestCheckStatusService() {
    var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
    var Order = {};
    var heading = 'test.checkstatusserviceresult';
    var serviceReply = 'apCheckStatusReply';
    var responseObject = {};
    var response = {};

    if (!empty(session.forms.generictestinterfaceform.merchantReferenceCode.value)) {
        Order = dw.order.OrderMgr.getOrder(session.forms.generictestinterfaceform.merchantReferenceCode.value);
    }

    if (null !== Order)
        response.object = commonFacade.CheckPaymentStatusRequest(Order);

    if (!empty(response)) {
        responseObject = ProcessResponse(response, serviceReply, heading);
    }

    return responseObject;
}


/*
Function to process the service response and
stuff value in response Object
*/

function ProcessResponse(response, serviceReply, heading) {
    var Resource = require('dw/web/Resource');
    var responseObject = {};

    if (!empty(response.object.requestID))
        responseObject["RequestID"] = response.object.requestID;

    if (!empty(response.object.requestToken))
        responseObject["RequestToken"] = response.object.requestToken;

    if (!empty(response.object.reasonCode))
        responseObject["ReasonCode"] = response.object.reasonCode.get();

    if (!empty(response.object.decision))
        responseObject["Decision"] = response.object.decision;

    if (!empty(response.object.merchantReferenceCode))
        responseObject["MerchantReferenceCode"] = response.object.merchantReferenceCode;

    if (!empty(response.object.invalidField))
        responseObject["invalidField"] = response.object.invalidField;

    if (!empty(response.object.missingField))
        responseObject["missingField"] = response.object.missingField;


    if (!empty(heading))
        responseObject["title"] = Resource.msg(heading, 'cybersource', null);

    if (serviceReply in response.object && !empty(response['object'][serviceReply])) {
        if ('reconciliationID' in response['object'][serviceReply]) {
            responseObject["ReconciliationID"] = response['object'][serviceReply]['reconciliationID'];
        }
        if ('processorTransactionID' in response['object'][serviceReply]) {
            responseObject["ProcessorTransactionId"] = response['object'][serviceReply]['processorTransactionID'];
        }
        if ('paymentStatus' in response['object'][serviceReply]) {
            responseObject["PaymentStatus"] = response['object'][serviceReply]['paymentStatus'];
        }
        if ('amount' in response['object'][serviceReply]) {
            responseObject["AmountCaptured"] = response['object'][serviceReply]['amount'];
        }
        if ('reasonCode' in response['object'][serviceReply]) {
            responseObject["ServiceReplyReasonCode"] = response['object'][serviceReply]['reasonCode'].get();
        }
    }
    session.forms.generictestinterfaceform.clearFormElement();
    return responseObject;
}



/*
Function to return payment method of the selected payment Type
@param - payment type
*/

function getPaymentMethod(paymentType) {
    var paymentMethod = '';

    if (paymentType.equals(CybersourceConstants.KLARNA_PAYMENT_TYPE))
        paymentMethod = CybersourceConstants.KLARNA_PAYMENT_METHOD;

    else if (paymentType.equals(CybersourceConstants.PAYPAL_PAYMENT_TYPE))
        paymentMethod = CybersourceConstants.METHOD_PAYPAL;

    else if (paymentType.equals(CybersourceConstants.BANCONTACT_PAYMENT_TYPE))
        paymentMethod = CybersourceConstants.BANCONTACT_PAYMENT_METHOD;

    else if (paymentType.equals(CybersourceConstants.EPS_PAYMENT_TYPE))
        paymentMethod = CybersourceConstants.EPS_PAYMENT_METHOD;

    else if (paymentType.equals(CybersourceConstants.GIROPAY_PAYMENT_TYPE))
        paymentMethod = CybersourceConstants.GIROPAY_PAYMENT_METHOD;

    else if (paymentType.equals(CybersourceConstants.SOFORT_PAYMENT_TYPE))
        paymentMethod = CybersourceConstants.SOFORT_PAYMENT_METHOD;

    else if (paymentType.equals(CybersourceConstants.IDEAL_PAYMENT_TYPE))
        paymentMethod = CybersourceConstants.IDEAL_PAYMENT_METHOD;

    return paymentMethod;
}


/*
Function to create request ,make service call
and return response
*/

function getServiceResponse(request, paymentMethod) {
    var dwsvc = require("dw/svc");
    var service = CSServices.CyberSourceTransactionService;
    var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(paymentMethod);
    var requestWrapper = {};
    var response = {};

    request.merchantID = merchantCrdentials.merchantID;
    requestWrapper.request = request;
    requestWrapper.merchantCredentials = merchantCrdentials;
    // call the service based on input
    response = service.call(requestWrapper);

    return response;
}


/*
Function to create semi request ,add merchantID,purchase total
values to request obj
and return req obj
*/


function createPurchaseTotalObject(CurrentForms, request) {
    var PurchaseTotals_Object = require('~/cartridge/scripts/cybersource/Cybersource_PurchaseTotals_Object');
    // create purhcase object for Credit Card and Klarna
    var purchaseObject = new PurchaseTotals_Object();
    // set the purchase total object for request
    purchaseObject.setGrandTotalAmount(CurrentForms.generictestinterfaceform.grandtotalamount.value);
    // set the currency 
    purchaseObject.setCurrency(CurrentForms.generictestinterfaceform.currency.value);
    request.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);

    return request;

}

module.exports = {
    TestCCAuth: TestCCAuth,
    TestTax: TestTax,
    TestPayerAuthEnrollCheck: TestPayerAuthEnrollCheck,
    TestPayerAuthValidation: TestPayerAuthValidation,
    TestDAVRequest: TestDAVRequest,
    TestOnDemandSubscription: TestOnDemandSubscription,
    TestRefundService: TestRefundService,
    TestSaleService: TestSaleService,
    TestAuthorizeService: TestAuthorizeService,
    TestCancelService: TestCancelService,
    TestCaptureService: TestCaptureService,
    TestAuthReversalService: TestAuthReversalService,
    TestCheckStatusService: TestCheckStatusService,
    TestSACreateToken: TestSACreateToken
};