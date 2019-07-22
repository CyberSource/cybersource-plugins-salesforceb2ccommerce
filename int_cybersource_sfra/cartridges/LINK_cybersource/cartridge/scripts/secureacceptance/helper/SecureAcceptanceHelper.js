'use strict';
var Logger = require('dw/system/Logger');
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
var URLUtils = require('dw/web/URLUtils');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var Site = require('dw/system/Site');

/**
 * Add or Update Token details in customer payment cards from order payment instrument card details
 * @param CustomerObj : dw.customer.Customer
 * @param orderPaymentInstrument : dw.order.OrderPaymentInstrument
 */
function AddOrUpdateToken(orderPaymentInstrument, CustomerObj) {
        if (!empty(CustomerObj) && !empty(orderPaymentInstrument)
            && !empty(orderPaymentInstrument.getCreditCardType()) && !empty(orderPaymentInstrument.getCreditCardNumber())
            && !empty(orderPaymentInstrument.custom.savecard) && orderPaymentInstrument.custom.savecard) {
            var wallet = CustomerObj.getProfile().getWallet();
            var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            var matchedPaymentInstrument, creditCardInstrument;
            var cardTypeMatch = false, cardNumberMatch = false;
            var instrumentsIter = paymentInstruments.iterator();
            while (instrumentsIter.hasNext()) {
                creditCardInstrument = instrumentsIter.next();
                //card type match
                cardTypeMatch = creditCardInstrument.creditCardType.equals(orderPaymentInstrument.getCreditCardType()) ? true : false;
                cardNumberMatch = orderPaymentInstrument.getCreditCardNumber().equals(creditCardInstrument.getCreditCardNumber()) ? true : false;
                if (cardNumberMatch === false) {
                    cardNumberMatch = orderPaymentInstrument.getCreditCardNumberLastDigits().equals(creditCardInstrument.getCreditCardNumberLastDigits()) ? true : false;
                }
                //find token ID exists for matching payment card
                if (cardTypeMatch && cardNumberMatch) {
                    matchedPaymentInstrument = creditCardInstrument;
                    break;
                }
            }
            var cardHolder, cardNumber, cardMonth, cardYear, cardType, cardToken;
            if (!empty(matchedPaymentInstrument)) {
                cardHolder = matchedPaymentInstrument.getCreditCardHolder();
                cardNumber = matchedPaymentInstrument.getCreditCardNumber().charAt(0).equals("*") && !empty(orderPaymentInstrument.getCreditCardNumber()) ? orderPaymentInstrument.getCreditCardNumber() : matchedPaymentInstrument.getCreditCardNumber();
                cardMonth = !empty(orderPaymentInstrument.getCreditCardExpirationMonth()) ? orderPaymentInstrument.getCreditCardExpirationMonth() : matchedPaymentInstrument.getCreditCardExpirationMonth();
                cardYear = !empty(orderPaymentInstrument.getCreditCardExpirationYear()) ? orderPaymentInstrument.getCreditCardExpirationYear() : matchedPaymentInstrument.getCreditCardExpirationYear();
                cardType = matchedPaymentInstrument.getCreditCardType();
                cardToken = !empty(orderPaymentInstrument.getCreditCardToken()) ? orderPaymentInstrument.getCreditCardToken() : matchedPaymentInstrument.getCreditCardToken();
            } else {
                cardHolder = orderPaymentInstrument.getCreditCardHolder();
                cardNumber = orderPaymentInstrument.getCreditCardNumber();
                cardMonth = orderPaymentInstrument.getCreditCardExpirationMonth();
                cardYear = orderPaymentInstrument.getCreditCardExpirationYear();
                cardType = orderPaymentInstrument.getCreditCardType();
                cardToken = !empty(orderPaymentInstrument.getCreditCardToken()) ? orderPaymentInstrument.getCreditCardToken() : null;
            }
            var Transaction = require('dw/system/Transaction');
            var status = Transaction.wrap(function () {
                if (!empty(cardToken)) {
                    if (!empty(matchedPaymentInstrument)) {
                        wallet.removePaymentInstrument(matchedPaymentInstrument);
                    }
                    var paymentInstrument = wallet.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
                    paymentInstrument.setCreditCardHolder(cardHolder);
                    paymentInstrument.setCreditCardNumber(cardNumber);
                    paymentInstrument.setCreditCardExpirationMonth(cardMonth);
                    paymentInstrument.setCreditCardExpirationYear(cardYear);
                    paymentInstrument.setCreditCardType(cardType);
                    paymentInstrument.setCreditCardToken(cardToken);
                }
                return { success: true };
            });
            if (!status.success) {
                Logger.error('Error in Secure acceptance update payment instrument in customer card ');
            }
        }
    
    return { success: true };
}

/*
 * Create request data which needs to be send to third party to get the token for the requested credit card.
 * Signature is generated and if signature is not present then requested signature is matched with generated signature.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr
 * @param paymentInstrument : dw.order.PaymentInstrument
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param responseParameterMap : Map contains key which are send in response by create/update token service.
 * @param subscriptionToken : Token generated for the card, used for update call.
*/
function CreateHMACSignature(paymentInstrument, LineItemCtnr, responseParameterMap, subscriptionToken) {
    try {
        var saCountryCode = LineItemCtnr != null ? LineItemCtnr.billingAddress.countryCode.value : responseParameterMap.req_bill_to_address_country.value;
        var sitePreferenceData = GetSitePrefernceDetails(subscriptionToken, saCountryCode);
        var HashMap = require('dw/util/HashMap');
        var requestMapResult = new HashMap();
        var signatureAuthorize = false;
        var secretKey = sitePreferenceData.secretKey;
        var requestData = null, dataToSign, signature;
        var formAction = sitePreferenceData.formAction;
        // parse secure acceptance request and create signature
        if (null !== paymentInstrument && null !== LineItemCtnr) {
            requestMapResult = CreateRequestData(sitePreferenceData, paymentInstrument, LineItemCtnr, subscriptionToken);
            if (requestMapResult.success && null !== requestMapResult.requestMap) {
                dataToSign = buildDataToSign(requestMapResult.requestMap);
                signature = CommonHelper.signedDataUsingHMAC256(dataToSign, secretKey);
                requestMapResult.requestMap.put('signature', signature.toString());
                requestData = requestMapResult.requestMap;
            }
            return { success: true, requestData: requestData, signatureAuthorize: signatureAuthorize, formAction: formAction };
        }
        else { // parse secure acceptance response and create and authorize signature
            if (null !== paymentInstrument && null !== responseParameterMap) {
                dataToSign = buildDataFromResponse(responseParameterMap);
                var resposneSignature = responseParameterMap.signature.stringValue;
                signature = CommonHelper.signedDataUsingHMAC256(dataToSign, secretKey);
                if (signature.toString() === resposneSignature) {
                    signatureAuthorize = true;
                    CommonHelper.LogResponse(responseParameterMap.req_reference_number.stringValue, responseParameterMap.transaction_id.stringValue,
                        responseParameterMap.request_token.stringValue, responseParameterMap.reason_code.stringValue, responseParameterMap.decision.stringValue);
                }
            }
            return { success: true, requestData: null, signatureAuthorize: signatureAuthorize, formAction: null };
        }

    } catch (exception) {
        Logger.error('Error in Secure acceptance update payment instrument in customer card ');
        return { error: true, errorMsg: exception.message };
    }
}

/*
 * If card type is master card then auth-indicator value show go in case of authorization.
 * @param requestMap : Map where auth indicator value is appended if present.
 * @param signed_field_names : List of signed fields that needs to go in the request for create/update token or authorization.
 * @param subscriptionToken : Token generated for the card, used for update call.
*/

function MasterCardAuthIndicatorRequest(signed_field_names, requestMap, subscriptionToken) {
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var mastercardAuthIndicator = CybersourceHelper.getMasterCardAuthIndicator();
    var matchedCardType, creditCardInstrument;

    if (!empty(mastercardAuthIndicator)) {
        if (!empty(subscriptionToken) && customer.authenticated && dw.system.Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable").value === "YES") {
            var wallet = customer.getProfile().getWallet();
            var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            var instrumentsIter = paymentInstruments.iterator();
            while (instrumentsIter.hasNext()) {
                creditCardInstrument = instrumentsIter.next();
                if (!empty(creditCardInstrument.getCreditCardToken()) && creditCardInstrument.getCreditCardToken().equals(subscriptionToken)) {
                    matchedCardType = creditCardInstrument.getCreditCardType();
                    break;
                }
            }
            if (empty(matchedCardType) || !matchedCardType.equalsIgnoreCase("MasterCard")) {
                return { success: false };
            }
        }
        if (mastercardAuthIndicator.valueOf() === '0') {
            signed_field_names = signed_field_names + ",auth_indicator";
            requestMap.put('auth_indicator', '0');
        } else if (mastercardAuthIndicator.valueOf() === '1') {
            signed_field_names = signed_field_names + ",auth_indicator";
            requestMap.put('auth_indicator', '1');
        }
        return { success: true, signed_field_names: signed_field_names, requestMap: requestMap };
    }
    return { success: false };
}
/*
 * create request data for secure acceptance[Redirect/Iframe/SilenPost]
 * @param sitePreferenceData : Data from site preference for different payment methods
 * @param paymentInstrument : Payment Instrument for the request payment method
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param subscriptionToken : Token generated for the card, used for update call.
*/
function CreateRequestData(sitePreferenceData, paymentInstrument, LineItemCtnr, subscriptionToken) {

    try {
        var access_key = sitePreferenceData.access_key;
        var profile_id = sitePreferenceData.profile_id;
        var signed_field_names = sitePreferenceData.signed_field_names;
        var unsigned_field_names = sitePreferenceData.unsigned_field_names;
        var isOverrideBilling = sitePreferenceData.CsSAOverrideBillingAddress;
        var isOverrideShipping = sitePreferenceData.CsSAOverrideShippingAddress;
        var lineItemCtnr = LineItemCtnr;
        var locale = CommonHelper.GetRequestLocale();
        var transaction_type, reference_number;
        var UUIDUtils = require('dw/util/UUIDUtils');
        var transaction_uuid = UUIDUtils.createUUID();
        var orderToken = null;
        var Calendar = require('dw/util/Calendar');
        var date = new Calendar(new Date());
        date.timeZone = "UTC";
        var StringUtils = require('dw/util/StringUtils');
        var signed_date_time = StringUtils.formatCalendar(date, "yyyy-MM-dd'T'HH:mm:ss'Z'");
        var HashMap = require('dw/util/HashMap');
        var requestMap = new HashMap();
        var paymentMethod = paymentInstrument.paymentMethod;
        var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
		var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
		
        /*Region BM Setting START: request setting for based on BM configuration*/
        if (null !== sitePreferenceData) {
            var ignore_avs = false;
            var ignore_cvn = false;
            var authIndicatorRes, providerVal;
            transaction_type = "authorization";
            switch (CsSAType) {
                case CybersourceConstants.METHOD_SA_REDIRECT:
                    providerVal = 'saredirect';
                case CybersourceConstants.METHOD_SA_IFRAME:
                    if (CsSAType.equals(CybersourceConstants.METHOD_SA_IFRAME)) {
                        providerVal = 'saiframe';
                    }
                    if (sitePreferenceData.CsSubscriptionTokenizationEnable === "YES") {
                        if (!empty(subscriptionToken)) {
                            transaction_type = transaction_type;
                            signed_field_names = signed_field_names + ",payment_token";
                            requestMap.put('payment_token', subscriptionToken);
                            signed_field_names = signed_field_names + ",allow_payment_token_update";
                            requestMap.put('allow_payment_token_update', true);
                        }
                        else {
                            transaction_type = transaction_type + ",create_payment_token";
                        }
                    } else if (!empty(subscriptionToken)) {
                        signed_field_names = signed_field_names + ",payment_token";
                        requestMap.put('payment_token', subscriptionToken);
                    }
                    authIndicatorRes = MasterCardAuthIndicatorRequest(signed_field_names, requestMap, subscriptionToken);
                    if (authIndicatorRes.success) {
                        signed_field_names = authIndicatorRes.signed_field_names;
                        requestMap = authIndicatorRes.requestMap;
                    }
                    if (sitePreferenceData.CsAvsIgnoreResult) {
                        ignore_avs = true;
                    }

                    if (sitePreferenceData.CsCvnDeclineFlags) {
                        ignore_cvn = true;
                    }
                    requestMap.put('ignore_avs', ignore_avs);
                    requestMap.put('ignore_cvn', ignore_cvn);
                    if (sitePreferenceData.csCardDecisionManagerEnable) {
                        requestMap.put('skip_decision_manager', false);
                    } else {
                        requestMap.put('skip_decision_manager', true);
                    }
                    if (!empty(lineItemCtnr) && !empty(lineItemCtnr.getCustomerNo())) {
                        signed_field_names = signed_field_names + ",consumer_id";
                        orderToken = lineItemCtnr.getOrderToken();
                        requestMap.put('consumer_id', lineItemCtnr.getCustomerNo());
                    }
                    signed_field_names = signed_field_names + ",override_custom_cancel_page";
                    signed_field_names = signed_field_names + ",override_custom_receipt_page";
                    requestMap.put('override_custom_cancel_page', dw.web.URLUtils.https('COPlaceOrder-Submit', 'provider', providerVal, 'order_token', orderToken));
                    requestMap.put('override_custom_receipt_page', dw.web.URLUtils.https('COPlaceOrder-Submit', 'order_id', lineItemCtnr.orderNo, 'order_token', lineItemCtnr.getOrderToken(), 'provider', providerVal));

                    break;
                case CybersourceConstants.METHOD_SA_SILENTPOST:
                    if (!empty(subscriptionToken)) {
                    	signed_field_names = signed_field_names + ",payment_token";
                        requestMap.put('payment_token', subscriptionToken);
                        transaction_type = "update_payment_token";
                    }
                    else {
                        transaction_type = "create_payment_token";
                    }
                    if (!empty(lineItemCtnr) && !empty(lineItemCtnr.getCustomerNo())) {
                        signed_field_names = signed_field_names + ",consumer_id";
                        requestMap.put('consumer_id', lineItemCtnr.getCustomerNo());
                    }
                    requestMap.put('ignore_avs', true);
                    requestMap.put('ignore_cvn', true);
                    if (sitePreferenceData.csCardDecisionManagerEnable) {
                        requestMap.put('skip_decision_manager', false);
                    } else {
                        requestMap.put('skip_decision_manager', false);
                    }
                    signed_field_names = signed_field_names + ",override_custom_receipt_page";
                    requestMap.put('override_custom_receipt_page', dw.web.URLUtils.https('CYBSecureAcceptance-SilentPostResponse'));
                    break;
                default:
                    transaction_type = "authorization";
                    break;
            }
        }
        var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
        signed_field_names = signed_field_names + ",partner_solution_id";
        requestMap.put('partner_solution_id', CybersourceHelper.getPartnerSolutionID());
        var result = CreateLineItemCtnrRequestData(lineItemCtnr, requestMap, paymentMethod, signed_field_names, unsigned_field_names);
        requestMap = result.requestMap;
        requestMap.put('locale', locale);
        requestMap.put('access_key', access_key);
        requestMap.put('profile_id', profile_id);
        requestMap.put('transaction_type', transaction_type);
        requestMap.put('transaction_uuid', transaction_uuid);
        requestMap.put('signed_date_time', signed_date_time);
        requestMap.put('signed_field_names', result.signed_field_names);
        requestMap.put('unsigned_field_names', result.unsigned_field_names);

        return { success: true, requestMap: requestMap };
        /*Region request creation END:*/
    } catch (exception) {
        Logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
}

/*
 * Create request data for secure acceptance[Redirect/Iframe/SilenPost] and puts them in requestMap
 * @param paymentMethod : Payment Instrument for the request payment method
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param requestMap : Request input data that will be send to create or update token.
*/

function CreateLineItemCtnrRequestData(lineItemCtnr, requestMap, paymentMethod, signed_field_names, unsigned_field_names) {
    var reference_number;
    var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants'),
        CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'helper/CommonHelper');
	var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;

    /*Region BM Setting END:*/
    /*Region request creation START:*/
    if (null !== lineItemCtnr) {
        var nonGiftCardAmount = CommonHelper.CalculateNonGiftCertificateAmount(lineItemCtnr);
        requestMap.put('amount', nonGiftCardAmount.value.toFixed(2));
        requestMap.put('currency', lineItemCtnr.currencyCode);

        if (CsSAType === CybersourceConstants.METHOD_SA_SILENTPOST) {
            reference_number = lineItemCtnr.orderNo;
            requestMap.put('reference_number', reference_number);
            requestMap.put('payment_method', 'card');
        }
        else {
            reference_number = lineItemCtnr.orderNo;
            requestMap.put('reference_number', reference_number);
        }
        if (null !== lineItemCtnr.billingAddress) {
            requestMap.put('bill_to_address_line1', lineItemCtnr.billingAddress.address1);
            if (!empty(lineItemCtnr.billingAddress.address2)) {
                signed_field_names = signed_field_names + ",bill_to_address_line2";
                requestMap.put('bill_to_address_line2', lineItemCtnr.billingAddress.address2);
            }
            requestMap.put('bill_to_email', lineItemCtnr.customerEmail);
            requestMap.put('bill_to_phone', lineItemCtnr.billingAddress.phone);
            requestMap.put('bill_to_address_city', lineItemCtnr.billingAddress.city);
            requestMap.put('bill_to_address_postal_code', lineItemCtnr.billingAddress.postalCode);
            if(lineItemCtnr.billingAddress.countryCode.value == 'US' || lineItemCtnr.billingAddress.countryCode.value == 'CA') {
            	requestMap.put('bill_to_address_state', lineItemCtnr.billingAddress.stateCode);
            }
            requestMap.put('bill_to_address_country', lineItemCtnr.billingAddress.countryCode.value.toLowerCase());
            requestMap.put('bill_to_forename', lineItemCtnr.billingAddress.firstName);
            requestMap.put('bill_to_surname', lineItemCtnr.billingAddress.lastName);
        }

        if (null !== lineItemCtnr.shipments && null !== lineItemCtnr.defaultShipment.shippingAddress) {
            var result = CommonHelper.CreateCybersourceShipToObject(lineItemCtnr);
            var shipTo = result.shipTo;
            requestMap.put('ship_to_address_city', shipTo.getCity());
            requestMap.put('ship_to_address_line1', shipTo.getStreet1());
            if (!empty(shipTo.getStreet2())) {
                signed_field_names = signed_field_names + ",ship_to_address_line2";
                requestMap.put('ship_to_address_line2', shipTo.getStreet2());
            }
            requestMap.put('ship_to_forename', shipTo.getFirstName());
            requestMap.put('ship_to_phone', shipTo.getPhoneNumber());
            requestMap.put('ship_to_surname', shipTo.getLastName());
            requestMap.put('ship_to_address_postal_code', shipTo.getPostalCode());
            if(lineItemCtnr.billingAddress.countryCode.value == 'US' || lineItemCtnr.billingAddress.countryCode.value == 'CA') {
            	requestMap.put('ship_to_address_state', shipTo.getState());
            }
            requestMap.put('ship_to_address_country', shipTo.country.value.toLowerCase());
            if (!empty(shipTo.getShippingMethod())) {
                signed_field_names = signed_field_names + ",shipping_method";
                requestMap.put('shipping_method', shipTo.getShippingMethod());
            }
        }
        signed_field_names = signed_field_names + ",customer_ip_address";
        requestMap.put('customer_ip_address', CommonHelper.getIPAddress());

        var StringUtils = require('dw/util/StringUtils');
        var SecureEncoder = require('dw/util/SecureEncoder');
        var result = CommonHelper.CreateCybersourceItemObject(lineItemCtnr);
        var items: dw.util.List = result.items;
        var item, itemId;
        var itemcount = 0;
        if (null !== items) {
            var iter: dw.util.Iterator = items.iterator();
            while (iter.hasNext()) {
                item = iter.next();
                itemId = item.getId();
                if (empty(itemId)) {
                    continue;
                }
                itemId = itemId - 1;
                itemcount = itemcount + 1;
                if (!empty(item.getProductSKU())) {
                    signed_field_names = signed_field_names + ",item_" + itemId + "_sku";
                    requestMap.put('item_' + itemId + '_sku', item.getProductSKU());
                }
                if (!empty(item.getProductCode())) {
                    signed_field_names = signed_field_names + ",item_" + itemId + "_code";
                    requestMap.put('item_' + itemId + '_code', item.getProductCode());
                }
                if (!empty(item.getProductName())) {
                    signed_field_names = signed_field_names + ",item_" + itemId + "_name";
                    //unsigned_field_names = unsigned_field_names + ",item_" + itemId + "_name";
                    requestMap.put('item_' + itemId + '_name', SecureEncoder.forUriComponentStrict(item.getProductName()));
                }
                if (!empty(item.getUnitPrice())) {
                    signed_field_names = signed_field_names + ",item_" + itemId + "_unit_price";
                    requestMap.put('item_' + itemId + '_unit_price', item.getUnitPrice());
                }
                if (!empty(item.getQuantity())) {
                    signed_field_names = signed_field_names + ",item_" + itemId + "_quantity";
                    requestMap.put('item_' + itemId + '_quantity', StringUtils.formatNumber(item.getQuantity(), "000", "en_US"));
                }
                if (!empty(item.getTaxAmount())) {
                    signed_field_names = signed_field_names + ",item_" + itemId + "_tax_amount";
                    requestMap.put('item_' + itemId + '_tax_amount', item.getTaxAmount());
                }
            }
            if (itemcount > 0) {
                signed_field_names = signed_field_names + ",line_item_count";
                requestMap.put('line_item_count', StringUtils.formatNumber(itemcount, "000", "en_US"));
            }
        }
    }
    return { requestMap: requestMap, signed_field_names: signed_field_names, unsigned_field_names: unsigned_field_names };
}

/*
 * Fetch site preference configurations for secure acceptance[redirect/Iframe/SilentPost]
 * @param paymentInstrument : Payment Instrument object is set to get payment method information.
*/
function GetSitePrefernceDetails(subscriptionToken, saCountryCode) {
    var sitePreference = {};
    var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
    var CsTokenizationEnable: dw.value.EnumValue;
    var CsSubscriptionTokenizationEnable: dw.value.EnumValue;
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var field_names;
	if (saCountryCode == 'US' || saCountryCode == 'CA') {
	     field_names = "access_key,profile_id,transaction_uuid,signed_field_names,unsigned_field_names,signed_date_time,locale,transaction_type,reference_number,amount,currency,ignore_cvn,ignore_avs,skip_decision_manager,bill_to_email,bill_to_address_line1,bill_to_address_city,bill_to_address_postal_code,bill_to_address_state,bill_to_address_country,bill_to_forename,bill_to_surname,bill_to_phone,ship_to_address_city,ship_to_address_line1,ship_to_forename,ship_to_phone,ship_to_surname,ship_to_address_state,ship_to_address_postal_code,ship_to_address_country";
	} else {
	     field_names = "access_key,profile_id,transaction_uuid,signed_field_names,unsigned_field_names,signed_date_time,locale,transaction_type,reference_number,amount,currency,ignore_cvn,ignore_avs,skip_decision_manager,bill_to_email,bill_to_address_line1,bill_to_address_city,bill_to_address_postal_code,bill_to_address_country,bill_to_forename,bill_to_surname,bill_to_phone,ship_to_address_city,ship_to_address_line1,ship_to_forename,ship_to_phone,ship_to_surname,ship_to_address_postal_code,ship_to_address_country";
	}

    if (null !== CsSAType) {
        switch (CsSAType) {
            case CybersourceConstants.METHOD_SA_REDIRECT:
                sitePreference["access_key"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_AccessKey");
                sitePreference["profile_id"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_ProfileID");
                sitePreference["secretKey"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_SecretKey");
                sitePreference["formAction"] = dw.system.Site.getCurrent().getCustomPreferenceValue('CsSARedirectFormAction');
                sitePreference["signed_field_names"] = field_names;
                sitePreference["unsigned_field_names"] = "";
                break;
            case CybersourceConstants.METHOD_SA_IFRAME:
                sitePreference["access_key"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Iframe_AccessKey");
                sitePreference["profile_id"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Iframe_ProfileID");
                sitePreference["secretKey"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Iframe_SecretKey");
                sitePreference["formAction"] = dw.system.Site.getCurrent().getCustomPreferenceValue('CsSAIframetFormAction');
                sitePreference["signed_field_names"] = field_names;
                sitePreference["unsigned_field_names"] = "";
                break;
            case CybersourceConstants.METHOD_SA_SILENTPOST:
                sitePreference["access_key"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Silent_AccessKey");
                sitePreference["profile_id"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Silent_ProfileID");
                sitePreference["secretKey"] = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Silent_SecretKey");
                if (empty(subscriptionToken)) {
                    sitePreference["formAction"] = dw.system.Site.getCurrent().getCustomPreferenceValue('Secure_Acceptance_Token_Create_Endpoint');
                    sitePreference["signed_field_names"] = field_names + ",payment_method";
                    sitePreference["unsigned_field_names"] = "card_type,card_expiry_date,card_cvn,card_number";
                }
                else {
                    sitePreference["formAction"] = dw.system.Site.getCurrent().getCustomPreferenceValue('Secure_Acceptance_Token_Update_Endpoint');
                    sitePreference["signed_field_names"] = field_names + ",payment_method";
                    sitePreference["unsigned_field_names"] = "card_type,card_expiry_date,card_cvn";
                }
                break;
        }
    }
    sitePreference["CsAvsIgnoreResult"] = dw.system.Site.getCurrent().getCustomPreferenceValue("CsAvsIgnoreResult");
    sitePreference["csCardDecisionManagerEnable"] = dw.system.Site.getCurrent().getCustomPreferenceValue("csCardDecisionManagerEnable");
    sitePreference["CsDeviceFingerprintEnabled"] = dw.system.Site.getCurrent().getCustomPreferenceValue("CsDeviceFingerprintEnabled");
    CsTokenizationEnable = dw.system.Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable");
    sitePreference["CsTokenizationEnable"] = CsTokenizationEnable.value;
    sitePreference["CsSAOverrideShippingAddress"] = dw.system.Site.getCurrent().getCustomPreferenceValue("CsSAOverrideShippingAddress");
    sitePreference["CsSAOverrideBillingAddress"] = dw.system.Site.getCurrent().getCustomPreferenceValue("CsSAOverrideBillingAddress");
    CsSubscriptionTokenizationEnable = dw.system.Site.getCurrent().getCustomPreferenceValue("CsSubscriptionTokenizationEnable");
    sitePreference["CsSubscriptionTokenizationEnable"] = CsSubscriptionTokenizationEnable.value;
    return sitePreference;
}

/**
 * This funcion parses the response from the secure acceptance gateway, and takes data from the signed fields,
 * creates the signature and matches the signature to make sure data is not tamperred.
 * @param httpParameterMap : has key value pair of the signed fields and the signature.
 */
function buildDataFromResponse(httpParameterMap) {
    var ArrayList = require('dw/util/ArrayList');
    var signedFieldNames = httpParameterMap.signed_field_names.stringValue;
    var signedFieldsArr = new ArrayList();
    var dataToSign = new ArrayList();
    var data;

    if (!empty(signedFieldNames)) {
        signedFieldsArr = signedFieldNames.split(",");
        for each(var signedFieldName: String in signedFieldsArr) {
            dataToSign.add(signedFieldName + "=" + httpParameterMap.get(signedFieldName));
        }
        data = commaSeparate(dataToSign);
    }
    Logger.debug("secure acceptance response:" + data.toString());
    return data;
}

/**
 * Creates comma separeated string for the data which will be usedto create the signature.
 * @param params : HashMap having value of signed fields
 */

function buildDataToSign(params: dw.util.HashMap) {
    var ArrayList = require('dw/util/ArrayList');
    var signedFieldNames = new ArrayList();
    var dataToSign = new ArrayList();
    var data;

    if (null !== params) {
        signedFieldNames = params.get("signed_field_names").split(",");
        for each(var signedFieldName: String in signedFieldNames) {
            dataToSign.add(signedFieldName + "=" + params.get(signedFieldName));
        }
        data = commaSeparate(dataToSign);
    }
    Logger.debug("secure acceptance request:" + data.toString());
    return data;
}

/**
 * Function to comma separated string.
 * @param dataToSign : List of String will be concated by comma.
 */

function commaSeparate(dataToSign: dw.util.ArrayList) {
    var csv: String = "";
    if (null !== dataToSign) {
        for (var it: Iterator = dataToSign.iterator(); it.hasNext();) {
            csv = csv.concat(it.next());
            if (it.hasNext()) {
                csv = csv.concat(",");
            }
        }
        csv = csv.toString();
    }
    return csv;
}

/**
 * Set response object for secure acceptance paymentmethod with the request parameters send by cybersource.
 */
function mapSecureAcceptanceResponse(httpParameterMap) {

    var responseObject = {};
    if (null !== httpParameterMap) {
        responseObject["MerchantReferenceCode"] = httpParameterMap.req_reference_number.stringValue;
        responseObject["Decision"] = httpParameterMap.decision.stringValue;
        responseObject["ReasonCode"] = httpParameterMap.reason_code.stringValue;
        responseObject["RequestID"] = httpParameterMap.transaction_id.stringValue;
        responseObject["CardType"] = httpParameterMap.req_card_type.stringValue;
        responseObject["RequestToken"] = httpParameterMap.request_token.stringValue;
        responseObject["AuthorizationAmount"] = httpParameterMap.auth_amount.stringValue;
        responseObject["AuthorizationCode"] = httpParameterMap.auth_code.stringValue;
        responseObject["AuthorizationReasonCode"] = httpParameterMap.auth_response.stringValue;
        responseObject["SubscriptionID"] = httpParameterMap.payment_token.stringValue;
        responseObject["req_bill_to_address_line1"] = httpParameterMap.req_bill_to_address_line1.stringValue;
        responseObject["req_bill_to_address_line2"] = httpParameterMap.req_bill_to_address_line2;
        responseObject["req_bill_to_email"] = httpParameterMap.req_bill_to_email.stringValue;
        responseObject["req_bill_to_phone"] = httpParameterMap.req_bill_to_phone.stringValue;
        responseObject["req_bill_to_address_city"] = httpParameterMap.req_bill_to_address_city.stringValue;
        responseObject["req_bill_to_address_postal_code"] = httpParameterMap.req_bill_to_address_postal_code.stringValue;
        responseObject["req_bill_to_address_state"] = httpParameterMap.req_bill_to_address_state.stringValue;
        responseObject["req_bill_to_forename"] = httpParameterMap.req_bill_to_forename.stringValue;
        responseObject["req_bill_to_surname"] = httpParameterMap.req_bill_to_surname.stringValue;
        responseObject["req_bill_to_address_country"] = httpParameterMap.req_bill_to_address_country.stringValue;
        responseObject["req_ship_to_address_line1"] = httpParameterMap.req_ship_to_address_line1.stringValue;
        responseObject["req_ship_to_address_line2"] = httpParameterMap.req_ship_to_address_line2;
        responseObject["req_ship_to_forename"] = httpParameterMap.req_ship_to_forename.stringValue;
        responseObject["req_ship_to_phone"] = httpParameterMap.req_ship_to_phone.stringValue;
        responseObject["req_ship_to_address_city"] = httpParameterMap.req_ship_to_address_city.stringValue;
        responseObject["ship_to_address_postal_code"] = httpParameterMap.ship_to_address_postal_code.stringValue;
        responseObject["req_ship_to_address_state"] = httpParameterMap.req_ship_to_address_state.stringValue;
        responseObject["req_ship_to_surname"] = httpParameterMap.req_ship_to_surname.stringValue;
        responseObject["req_ship_to_address_country"] = httpParameterMap.req_ship_to_address_country.stringValue;
        responseObject["payment_token"] = httpParameterMap.payment_token.stringValue;
        responseObject["req_payment_token"] = httpParameterMap.req_payment_token.stringValue;
        responseObject["req_card_expiry_date"] = httpParameterMap.req_card_expiry_date.stringValue;
        responseObject["req_card_number"] = httpParameterMap.req_card_number.stringValue;
        responseObject["req_card_type"] = httpParameterMap.req_card_type.stringValue;
    }
    return responseObject;
}

/**
 * Function to set billto,shipto,amount,currency in request map to test seccure acceptance create token call.
 * @param billToObject : contains billing address of the order.
 * @param shipToObject : contains shipping address of the order.
 * @param purchaseObject : to get amount and currency of the order. 
 * @param requestMap : Object will be used to create the signature and will be send to cybersource for creating/updating token. 
 */
function TestLineItemCtnrRequestData(billToObject, shipToObject, purchaseObject, requestMap) {
    var reference_number;
    /*Region BM Setting END:*/
    /*Region request creation START:*/
    if (null !== purchaseObject) {
        requestMap.put('amount', purchaseObject.getGrandTotalAmount());
        requestMap.put('currency', purchaseObject.getCurrency());
    }
    if (null !== billToObject) {
        requestMap.put('bill_to_address_line1', billToObject.getStreet1());
        requestMap.put('bill_to_address_line2', billToObject.getStreet1());
        requestMap.put('bill_to_email', billToObject.getEmail());
        requestMap.put('bill_to_phone', billToObject.getPhoneNumber());
        requestMap.put('bill_to_address_city', billToObject.getCity());
        requestMap.put('bill_to_address_postal_code', billToObject.getPostalCode());
        requestMap.put('bill_to_address_state', billToObject.getState());
        requestMap.put('bill_to_address_country', billToObject.getCountry());
        requestMap.put('bill_to_forename', billToObject.getFirstName());
        requestMap.put('bill_to_surname', billToObject.getLastName());
    }
    if (null !== shipToObject) {
        requestMap.put('ship_to_address_city', shipToObject.getCity());
        requestMap.put('ship_to_address_line1', shipToObject.getStreet1());
        requestMap.put('ship_to_address_line2', shipToObject.getStreet1());
        requestMap.put('ship_to_forename', shipToObject.getFirstName());
        requestMap.put('ship_to_phone', shipToObject.getPhoneNumber());
        requestMap.put('ship_to_surname', shipToObject.getLastName());
        requestMap.put('ship_to_address_postal_code', shipToObject.getPostalCode());
        requestMap.put('ship_to_address_state', shipToObject.getState());
        requestMap.put('ship_to_address_country', shipToObject.getCountry());
    }
    return requestMap;
}

/**
 * Returns the payment instruments of an order which is not a gift certificate.
 * @param order : Object
 */
function GetPaymemtInstument(order) {
    if (null !== order) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        return CardHelper.getNonGCPaymemtInstument(order);
    }
}


/**
 * Function to match the request has valid secure acceptance profile parameters for merchant POST URL.
 * @param httpParameterMap : parameter map
 */
function isSAMatchProfileForPost(httpParameterMap): String {
    var req_access_key = httpParameterMap.req_access_key.stringValue;
    var req_profile_id = httpParameterMap.req_profile_id.stringValue;
    if (!empty(req_access_key) && !empty(req_profile_id)) {
        var redirect_access_key = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_AccessKey");
        var redirect_profile_id = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_ProfileID");
        var redirect_secret_key = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Redirect_SecretKey");
        if (!empty(redirect_access_key) && req_access_key.equals(redirect_access_key) &&
            !empty(redirect_profile_id) && req_profile_id.equals(redirect_profile_id)) {
            return { success: true, secretkey: redirect_secret_key };
        }
        var iframe_access_key = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Iframe_AccessKey");
        var iframe_profile_id = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Iframe_ProfileID");
        var iframe_secret_key = dw.system.Site.getCurrent().getCustomPreferenceValue("SA_Iframe_SecretKey");
        if (!empty(iframe_access_key) && req_access_key.equals(iframe_access_key) &&
            !empty(iframe_profile_id) && req_profile_id.equals(iframe_profile_id)) {
            return { success: true, secretkey: iframe_secret_key };
        }
    }
    var errorMsg = 'Missing or invalid profile parameters';
    Logger.error('[SecureAcceptanceHelper.ds] isSAMatchProfileForPost - Error in Secure acceptance merchant post URL parameters ' + errorMsg);
    return { error: true, errorMsg: errorMsg };
}

/**
 * Function to to validate secure acceptance merchant POST request is valid.
 * @param httpParameterMap : parameter map
 */
function validateSAMerchantPostRequest(httpParameterMap): Boolean {
    //validate httpParameterMap exists along with order and signature in it
    if (!empty(httpParameterMap) && !empty(httpParameterMap.req_reference_number.stringValue) && !empty(httpParameterMap.signature.stringValue)) {
        //match the request has valid secure acceptance profile parameters for merchant POST URL
        var result = isSAMatchProfileForPost(httpParameterMap);
        if (result.error) {
            return false;
        } else {
            //prepare signature and send match result
            var dataToSign = buildDataFromResponse(httpParameterMap);
            var signature = CommonHelper.signedDataUsingHMAC256(dataToSign, result.secretkey);
            if (signature.toString() === httpParameterMap.signature.stringValue) {
                //signature got Authorize
                return true;
            }
        }
    }
    return false;
}

/**
 * Function save the required secure acceptance merchant POST request data in JSOn form in custom object. This data will be processed by batch job.
 * @param httpParameterMap : parameter map
 */
function saveSAMerchantPostRequest(httpParameterMap): Boolean {
    try {
        //prepare JSON from merchant POST request parametrs
        var responseJSONString = jsonSecureAcceptanceResponse(httpParameterMap);

        //store JSON in custom object
        var CustomObjectMgr = require("dw/object/CustomObjectMgr");
        var Transaction = require('dw/system/Transaction');
        var co = CustomObjectMgr.getCustomObject("SA_MerchantPost", httpParameterMap.req_reference_number.stringValue);
        Transaction.wrap(function () {
            if (co == null) {
                co = CustomObjectMgr.createCustomObject("SA_MerchantPost", httpParameterMap.req_reference_number.stringValue);
                co.custom.processed = false;
                co.custom.postParams = responseJSONString;
            }
        });
        return true;
    } catch (ex) {
        Logger.error("[SecureAcceptanceHelper.ds] saveSAMerchantPostRequest - error occured in JSON save in custom object" + ex.message);
        return false;
    }
}

/**
 * JSON prepare for Merchant POST parameters
 */
function jsonSecureAcceptanceResponse(httpParameterMap) {
    var responseJSON;
    var responseObject = [];
    if (null !== httpParameterMap) {
        responseObject.push('"Decision":"' + httpParameterMap.decision.stringValue + '"');
        responseObject.push('"ReasonCode":"' + httpParameterMap.reason_code.stringValue + '"');
        responseObject.push('"RequestID":"' + httpParameterMap.transaction_id.stringValue + '"');
        responseObject.push('"CardType":"' + httpParameterMap.req_card_type.stringValue + '"');
        responseObject.push('"RequestToken":"' + httpParameterMap.request_token.stringValue + '"');
        responseObject.push('"AuthorizationAmount":"' + httpParameterMap.auth_amount.stringValue + '"');
        responseObject.push('"AuthorizationCode":"' + httpParameterMap.auth_code.stringValue + '"');
        responseObject.push('"AuthorizationReasonCode":"' + httpParameterMap.auth_response.stringValue + '"');
        responseObject.push('"SubscriptionID":"' + httpParameterMap.payment_token.stringValue + '"');
        responseObject.push('"req_bill_to_address_line1":"' + httpParameterMap.req_bill_to_address_line1.stringValue + '"');
        responseObject.push('"req_bill_to_address_line2":"' + httpParameterMap.req_bill_to_address_line2 + '"');
        responseObject.push('"req_bill_to_email":"' + httpParameterMap.req_bill_to_email.stringValue + '"');
        responseObject.push('"req_bill_to_phone":"' + httpParameterMap.req_bill_to_phone.stringValue + '"');
        responseObject.push('"req_bill_to_address_city":"' + httpParameterMap.req_bill_to_address_city.stringValue + '"');
        responseObject.push('"req_bill_to_address_postal_code":"' + httpParameterMap.req_bill_to_address_postal_code.stringValue + '"');
        responseObject.push('"req_bill_to_address_state":"' + httpParameterMap.req_bill_to_address_state.stringValue + '"');
        responseObject.push('"req_bill_to_forename":"' + httpParameterMap.req_bill_to_forename.stringValue + '"');
        responseObject.push('"req_bill_to_surname":"' + httpParameterMap.req_bill_to_surname.stringValue + '"');
        responseObject.push('"req_bill_to_address_country":"' + httpParameterMap.req_bill_to_address_country.stringValue + '"');
        responseObject.push('"req_ship_to_address_line1":"' + httpParameterMap.req_ship_to_address_line1.stringValue + '"');
        responseObject.push('"req_ship_to_address_line2":"' + httpParameterMap.req_ship_to_address_line2 + '"');
        responseObject.push('"req_ship_to_forename":"' + httpParameterMap.req_ship_to_forename.stringValue + '"');
        responseObject.push('"req_ship_to_phone":"' + httpParameterMap.req_ship_to_phone.stringValue + '"');
        responseObject.push('"req_ship_to_address_city":"' + httpParameterMap.req_ship_to_address_city.stringValue + '"');
        responseObject.push('"ship_to_address_postal_code":"' + httpParameterMap.ship_to_address_postal_code.stringValue + '"');
        responseObject.push('"req_ship_to_address_state":"' + httpParameterMap.req_ship_to_address_state.stringValue + '"');
        responseObject.push('"req_ship_to_surname":"' + httpParameterMap.req_ship_to_surname.stringValue + '"');
        responseObject.push('"req_ship_to_address_country":"' + httpParameterMap.req_ship_to_address_country.stringValue + '"');
        responseObject.push('"payment_token":"' + httpParameterMap.payment_token.stringValue + '"');
        responseObject.push('"req_payment_token":"' + httpParameterMap.req_payment_token.stringValue + '"');
        responseObject.push('"req_card_expiry_date":"' + httpParameterMap.req_card_expiry_date.stringValue + '"');
        responseObject.push('"req_card_number":"' + httpParameterMap.req_card_number.stringValue + '"');
        responseObject.push('"req_card_type":"' + httpParameterMap.req_card_type.stringValue + '"');
        responseJSON = "{" + responseObject.join(",") + "}";
    }
    return responseJSON;
}

/**
 * Handle the Card ReasonCode. 
 * @param ResponseObject
 * @returns response as authorized, error, declined
 */
function HandleDecision(ReasonCode) {
    var serviceResponse = {};
    serviceResponse.ReasonCode = ReasonCode;
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    return CardHelper.HandleCardResponse(serviceResponse);
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function AuthorizeCreditCard(args) {
    var paymentInstrument = args.PaymentInstrument;
    if (empty(paymentInstrument)) {
        return { error: true };
    }

    //  When using saved credit cards, fill in the CC billing form fields that will be used later to build the request.
    if (paymentInstrument.paymentMethod == "CREDIT_CARD") {
        if (empty(session.forms.billing.creditCardFields.cardNumber.value)) {
            session.forms.billing.creditCardFields.cardNumber.value = paymentInstrument.creditCardNumber;
        }
        if (empty(session.forms.billing.creditCardFields.cardType.value)) {
            session.forms.billing.creditCardFields.cardType.value = paymentInstrument.creditCardType;
        }
        if (empty(session.forms.billing.creditCardFields.expirationMonth.value)) {
            session.forms.billing.creditCardFields.expirationMonth.value = paymentInstrument.creditCardExpirationMonth
        }

        if (empty(session.forms.billing.creditCardFields.expirationYear.value)) {
            session.forms.billing.creditCardFields.expirationYear.value = paymentInstrument.creditCardExpirationYear
        }
    }


    var orderNo = args.Order.orderNo;
    var result = AuthorizePayer(args.Order, paymentInstrument, orderNo);
    if (result.error) {
        return { error: true };
    }
    else if (result.failed) {
        return { declined: true };

    }
    else if (result.cardresponse) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        return CardHelper.CardResponse(result.order, paymentInstrument, result.serviceResponse);
    }
    else if (result.payerauthentication) {
        session.privacy.process3DRequestParent = true;
        var handle3DResponse = {
            process3DRedirection: true,
        };
        return handle3DResponse;
    }
    if (paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT) && !result.success) {
        return result;
    }

    return HookIn3DRequest({ Order: args.Order, orderNo: orderNo, payerEnrollResponse: result.serviceResponse, paymentInstrument: paymentInstrument, SubscriptionID: paymentInstrument.getCreditCardToken() });
}

/**
 * Card processing for 3D cards
 * @param args
 * @returns
 */
function HookIn3DRequest(args) {
    var result, serviceResponse;
    var ReadFromBasket = true;
    //Service facade call for card authorization
    if (!empty(args.Order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
        var VisaCheckoutFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/facade/VisaCheckoutFacade');
        result = VisaCheckoutFacade.CCAuthRequest(args.Order, args.orderNo, CommonHelper.getIPAddress());
    } else {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        var ipAddress = CommonHelper.getIPAddress();
        result = CardFacade.CCAuthRequest(args.Order, args.Order.orderNo, CommonHelper.getIPAddress(),
            args.SubscriptionID, args.payerEnrollResponse, args.payerValidationResponse, ReadFromBasket);
    }
    //facade response handling
    if (result.error) {
        return { error: true };
    }
    serviceResponse = result.serviceResponse;
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    return CardHelper.CardResponse(args.Order, args.paymentInstrument, serviceResponse);
}

/**
 * Script method is used to Authorize payer, authorize if PAReasonCode 100
 */
function AuthorizePayer(LineItemCtnrObj, paymentInstrument, orderNo) {
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var result, PAReasonCode, PAVReasonCode, AuthorizationReasonCode, serviceResponse;
    var paEnabled = false;
    var Site = require('dw/system/Site');
	var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
	var paymentMethod = paymentInstrument.getPaymentMethod();
    if (!empty(CybersourceHelper.getPAMerchantID())) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        if ((paymentMethod.equals(CybersourceConstants.METHOD_CREDIT_CARD) && (CsSAType == null || CsSAType != CybersourceConstants.METHOD_SA_FLEX)) || paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT) || paymentMethod.equals(CybersourceConstants.METHOD_GooglePay)) {
            result = CardHelper.PayerAuthEnable(paymentInstrument.creditCardType);
		} else if (CsSAType.equals(CybersourceConstants.METHOD_SA_FLEX)) {
			result = CardHelper.PayerAuthEnable(paymentInstrument.creditCardType);
		}
        if (result.error) {
            return result;
        } else if (result.paEnabled) {
            paEnabled = result.paEnabled;
        }
    }
   
    if (paEnabled && empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT)) && empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_GooglePay))) {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        result = CardFacade.PayerAuthEnrollCheck(LineItemCtnrObj, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.creditCardFields);
        if (result.error) {
            return result;
        }
        serviceResponse = result.serviceResponse;
        if (CybersourceHelper.getProofXMLEnabled()) {
            var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
            PaymentInstrumentUtils.UpdatePaymentTransactionWithProofXML(paymentInstrument, serviceResponse.ProofXML);
        }
        if (serviceResponse.ReasonCode === 100) {
            return { OK: true, serviceResponse: serviceResponse };
        } else if (!empty(serviceResponse.AcsURL)) {
            session.privacy.AcsURL = serviceResponse.AcsURL;
            session.privacy.PAReq = serviceResponse.PAReq;
            session.privacy.PAXID = serviceResponse.PAXID;
            session.privacy.order_id = orderNo;
            session.privacy.authenticationTransactionID = serviceResponse.authenticationTransactionID;
            return { payerauthentication: true, serviceResponse: serviceResponse };
        } else {
            Logger.error('An error occured during PayerAuthEnroll check. (ReasonCode: {0} , RequestID: {1}', serviceResponse.ReasonCode, serviceResponse.RequestID);
            return { error: true, serviceResponse: serviceResponse };
        }
    } else if (paEnabled && !empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
        var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/helper/VisaCheckoutHelper');
        return VisaCheckoutHelper.PayerAuthEnroll(LineItemCtnrObj, paymentInstrument, orderNo);
    } else {
        return { success: true }
    }
}
/** Exported functions **/
module.exports = {
    AuthorizeCreditCard: AuthorizeCreditCard,
    HookIn3DRequest: HookIn3DRequest,
    CreateHMACSignature: CreateHMACSignature,
    AddOrUpdateToken: AddOrUpdateToken,
    mapSecureAcceptanceResponse: mapSecureAcceptanceResponse,
    isSAMatchProfileForPost: isSAMatchProfileForPost,
    validateSAMerchantPostRequest: validateSAMerchantPostRequest,
    saveSAMerchantPostRequest: saveSAMerchantPostRequest,
    jsonSecureAcceptanceResponse: jsonSecureAcceptanceResponse,
    HandleDecision: HandleDecision,
    GetPaymemtInstument: GetPaymemtInstument,
    TestLineItemCtnrRequestData: TestLineItemCtnrRequestData,
    BuildDataToSign: buildDataToSign
};
