'use strict';

var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

/**
 * Add or Update Token details in customer payment cards from order payment instrument card details
 * @param {dw.order.OrderPaymentInstrument} orderPaymentInstrument : dw.order.OrderPaymentInstrument
 * @param {dw.customer.Customer} CustomerObj : dw.customer.Customer
 * @returns {Object} obj
 */
function AddOrUpdateToken(orderPaymentInstrument, CustomerObj) {
    // eslint-disable-next-line
    if (!empty(CustomerObj) && !empty(orderPaymentInstrument) && !empty(orderPaymentInstrument.getCreditCardType()) && !empty(orderPaymentInstrument.getCreditCardNumber()) && !empty(orderPaymentInstrument.custom.savecard) && orderPaymentInstrument.custom.savecard) {
        var wallet = CustomerObj.getProfile().getWallet();
        // eslint-disable-next-line
        var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
        var matchedPaymentInstrument; var
            creditCardInstrument;
        var cardTypeMatch = false; var
            cardNumberMatch = false;
        var instrumentsIter = paymentInstruments.iterator();
        while (instrumentsIter.hasNext()) {
            creditCardInstrument = instrumentsIter.next();
            // card type match
            cardTypeMatch = !!creditCardInstrument.creditCardType.equals(orderPaymentInstrument.getCreditCardType());
            cardNumberMatch = !!orderPaymentInstrument.getCreditCardNumber().equals(creditCardInstrument.getCreditCardNumber());
            if (cardNumberMatch === false) {
                cardNumberMatch = !!orderPaymentInstrument.getCreditCardNumberLastDigits().equals(creditCardInstrument.getCreditCardNumberLastDigits());
            }
            // find token ID exists for matching payment card
            if (cardTypeMatch && cardNumberMatch) {
                matchedPaymentInstrument = creditCardInstrument;
                break;
            }
        }
        var cardHolder; var cardNumber; var cardMonth; var cardYear; var cardType; var
            cardToken;
        // eslint-disable-next-line
        if (!empty(matchedPaymentInstrument)) {
            cardHolder = matchedPaymentInstrument.getCreditCardHolder();
            // eslint-disable-next-line
            cardNumber = matchedPaymentInstrument.getCreditCardNumber().charAt(0).equals('*') && !empty(orderPaymentInstrument.getCreditCardNumber()) ? orderPaymentInstrument.getCreditCardNumber() : matchedPaymentInstrument.getCreditCardNumber();
            // eslint-disable-next-line
            cardMonth = !empty(orderPaymentInstrument.getCreditCardExpirationMonth()) ? orderPaymentInstrument.getCreditCardExpirationMonth() : matchedPaymentInstrument.getCreditCardExpirationMonth();
            // eslint-disable-next-line
            cardYear = !empty(orderPaymentInstrument.getCreditCardExpirationYear()) ? orderPaymentInstrument.getCreditCardExpirationYear() : matchedPaymentInstrument.getCreditCardExpirationYear();
            cardType = matchedPaymentInstrument.getCreditCardType();
            // eslint-disable-next-line
            cardToken = !empty(orderPaymentInstrument.getCreditCardToken()) ? orderPaymentInstrument.getCreditCardToken() : matchedPaymentInstrument.getCreditCardToken();
        } else {
            cardHolder = orderPaymentInstrument.getCreditCardHolder();
            cardNumber = orderPaymentInstrument.getCreditCardNumber();
            cardMonth = orderPaymentInstrument.getCreditCardExpirationMonth();
            cardYear = orderPaymentInstrument.getCreditCardExpirationYear();
            cardType = orderPaymentInstrument.getCreditCardType();
            // eslint-disable-next-line
            cardToken = !empty(orderPaymentInstrument.getCreditCardToken()) ? orderPaymentInstrument.getCreditCardToken() : null;
        }
        var Transaction = require('dw/system/Transaction');
        var status = Transaction.wrap(function () {
        if (!empty(cardToken)) {
            // eslint-disable-next-line
            if (!empty(matchedPaymentInstrument)) {
                wallet.removePaymentInstrument(matchedPaymentInstrument);
            }
            // eslint-disable-next-line
            var paymentInstrument = wallet.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            paymentInstrument.setCreditCardHolder(cardHolder);
            paymentInstrument.setCreditCardNumber(cardNumber);
            paymentInstrument.setCreditCardExpirationMonth(cardMonth);
            paymentInstrument.setCreditCardExpirationYear(cardYear);
            paymentInstrument.setCreditCardType(cardType);            
            paymentInstrument.setCreditCardToken(cardToken);
            paymentInstrument.custom.isCSToken = true;
            }
            // }
            return { success: true };
        });
        if (!status.success) {
            Logger.error('Error in Secure acceptance update payment instrument in customer card ');
        }
    }

    return { success: true };
}

/**
 * Fetch site preference configurations for secure acceptance[redirect/Iframe/SilentPost]
 * @param {Object} subscriptionToken subscriptionToken
 * @param {Object} saCountryCode saCountryCode
 * @returns {Object} obj
 */
function GetSitePrefernceDetails(subscriptionToken, saCountryCode) {
    var sitePreference = {};
    var CsTokenizationEnable;
    var CsSubscriptionTokenizationEnable;
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var fieldNames;
    if (saCountryCode === 'US' || saCountryCode === 'CA') {
        fieldNames = 'access_key,profile_id,transaction_uuid,signed_field_names,unsigned_field_names,signed_date_time,locale,transaction_type,reference_number,amount,currency,ignore_cvn,ignore_avs,skip_decision_manager,bill_to_email,bill_to_address_line1,bill_to_address_city,bill_to_address_postal_code,bill_to_address_state,bill_to_address_country,bill_to_forename,bill_to_surname,bill_to_phone,ship_to_address_city,ship_to_address_line1,ship_to_forename,ship_to_phone,ship_to_surname,ship_to_address_state,ship_to_address_postal_code,ship_to_address_country,card_type_selection_indicator';
    } else {
        fieldNames = 'access_key,profile_id,transaction_uuid,signed_field_names,unsigned_field_names,signed_date_time,locale,transaction_type,reference_number,amount,currency,ignore_cvn,ignore_avs,skip_decision_manager,bill_to_email,bill_to_address_line1,bill_to_address_city,bill_to_address_postal_code,bill_to_address_country,bill_to_forename,bill_to_surname,bill_to_phone,ship_to_address_city,ship_to_address_line1,ship_to_forename,ship_to_phone,ship_to_surname,ship_to_address_postal_code,ship_to_address_country,card_type_selection_indicator';
    }

    /* eslint-disable */
    if (CsSAType !== null) {
        switch (CsSAType) {
            case CybersourceConstants.METHOD_SA_REDIRECT:
                sitePreference.access_key = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Redirect_AccessKey');
                sitePreference.profile_id = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Redirect_ProfileID');
                sitePreference.secretKey = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Redirect_SecretKey');
                sitePreference.formAction = dw.system.Site.getCurrent().getCustomPreferenceValue('CsSARedirectFormAction');
                sitePreference.signed_field_names = fieldNames;
                sitePreference.unsigned_field_names = '';
                break;
            case CybersourceConstants.METHOD_SA_IFRAME:
                sitePreference.access_key = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Iframe_AccessKey');
                sitePreference.profile_id = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Iframe_ProfileID');
                sitePreference.secretKey = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Iframe_SecretKey');
                sitePreference.formAction = dw.system.Site.getCurrent().getCustomPreferenceValue('CsSAIframetFormAction');
                sitePreference.signed_field_names = fieldNames;
                sitePreference.unsigned_field_names = '';
                break;
            case CybersourceConstants.METHOD_SA_SILENTPOST:
                sitePreference.access_key = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Silent_AccessKey');
                sitePreference.profile_id = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Silent_ProfileID');
                sitePreference.secretKey = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Silent_SecretKey');
                if (empty(subscriptionToken)) {
                    sitePreference.formAction = dw.system.Site.getCurrent().getCustomPreferenceValue('Secure_Acceptance_Token_Create_Endpoint');
                    sitePreference.signed_field_names = fieldNames + ',payment_method';
                    sitePreference.unsigned_field_names = 'card_type,card_expiry_date,card_cvn,card_number';
                } else {
                    sitePreference.formAction = dw.system.Site.getCurrent().getCustomPreferenceValue('Secure_Acceptance_Token_Update_Endpoint');
                    sitePreference.signed_field_names = fieldNames + ',payment_method';
                    sitePreference.unsigned_field_names = 'card_type,card_expiry_date,card_cvn';
                }
                break;
        }
    }
    sitePreference.CsAvsIgnoreResult = dw.system.Site.getCurrent().getCustomPreferenceValue('CsAvsIgnoreResult');
    sitePreference.csCardDecisionManagerEnable = dw.system.Site.getCurrent().getCustomPreferenceValue('csCardDecisionManagerEnable');
    sitePreference.CsDeviceFingerprintEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled');
    CsTokenizationEnable = dw.system.Site.getCurrent().getCustomPreferenceValue('CsTokenizationEnable');
    sitePreference.CsTokenizationEnable = CsTokenizationEnable.value;
    sitePreference.CsSAOverrideShippingAddress = dw.system.Site.getCurrent().getCustomPreferenceValue('CsSAOverrideShippingAddress');
    sitePreference.CsSAOverrideBillingAddress = dw.system.Site.getCurrent().getCustomPreferenceValue('CsSAOverrideBillingAddress');
    CsSubscriptionTokenizationEnable = dw.system.Site.getCurrent().getCustomPreferenceValue('CsSubscriptionTokenizationEnable');
    sitePreference.CsSubscriptionTokenizationEnable = CsSubscriptionTokenizationEnable.value;
    return sitePreference;
    /* eslint-enable */
}

/**
 * Function to comma separated string.
 * @param {Object} dataToSign : List of String will be concated by comma.
 * @returns {Object} obj
 */
function commaSeparate(dataToSign) {
    var csv = '';
    if (dataToSign !== null) {
        for (var it = dataToSign.iterator(); it.hasNext();) {
            csv = csv.concat(it.next());
            if (it.hasNext()) {
                csv = csv.concat(',');
            }
        }
        csv = csv.toString();
    }
    return csv;
}

/**
 * Creates comma separeated string for the data which will be usedto create the signature.
 * @param {Object} params : HashMap having value of signed fields
 * @returns {Object} obj
 */
function buildDataToSign(params) {
    var ArrayList = require('dw/util/ArrayList');
    var signedFieldNames = new ArrayList();
    var dataToSign = new ArrayList();
    var data;
    var signedFieldName;
    var i;

    if (params !== null) {
        signedFieldNames = params.get('signed_field_names').split(',');
        for (i = 0; i < signedFieldNames.length; i += 1) {
        // for each(var signedFieldName: String in signedFieldNames) {
            signedFieldName = signedFieldNames[i];
            dataToSign.add(signedFieldName + '=' + params.get(signedFieldNames[i]));
        }
        data = commaSeparate(dataToSign);
    }
    Logger.debug('secure acceptance request:' + data.toString());
    return data;
}

/**
 * This funcion parses the response from the secure acceptance gateway, and takes data from the signed fields, creates the signature and matches the signature to make sure data is not tamperred.
 * @param {Object} httpParameterMap : has key value pair of the signed fields and the signature.
 * @returns {Object} ovbj
 */
function buildDataFromResponse(httpParameterMap) {
    var ArrayList = require('dw/util/ArrayList');
    var signedFieldNames = httpParameterMap.signed_field_names.stringValue;
    var signedFieldsArr = new ArrayList();
    var dataToSign = new ArrayList();
    var data;
    var signedFieldName;
    var i;

    // eslint-disable-next-line
    if (!empty(signedFieldNames)) {
        signedFieldsArr = signedFieldNames.split(',');
        for (i = 0; i < signedFieldsArr.length; i += 1) {
        // for each(var signedFieldName: String in signedFieldsArr) {
            signedFieldName = signedFieldsArr[i];
            dataToSign.add(signedFieldName + '=' + httpParameterMap.get(signedFieldsArr[i]).rawValue);
        }
        data = commaSeparate(dataToSign);
    }
    Logger.debug('secure acceptance response:' + data.toString());
    return data;
}

/**
 * If card type is master card then auth-indicator value show go in case of authorization.
 * @param {Object} signedFields : List of signed fields that needs to go in the request for create/update token or authorization.
 * @param {Object} requestMap : Map where auth indicator value is appended if present.
 * @param {Object} subscriptionToken : Token generated for the card, used for update call.
 * @returns {Object} obj;
 *
*/
function MasterCardAuthIndicatorRequest(signedFields, requestMap, subscriptionToken) {
    var signedFieldNames = signedFields;
    var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var mastercardAuthIndicator = CybersourceHelper.getMasterCardAuthIndicator();
    var matchedCardType; var
        creditCardInstrument;

    // eslint-disable-next-line
    if (!empty(mastercardAuthIndicator)) {
        // eslint-disable-next-line
        if (!empty(subscriptionToken) && customer.authenticated && dw.system.Site.getCurrent().getCustomPreferenceValue('CsTokenizationEnable').value === 'YES') {
            // eslint-disable-next-line
            var wallet = customer.getProfile().getWallet();
            // eslint-disable-next-line
            var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            var instrumentsIter = paymentInstruments.iterator();
            while (instrumentsIter.hasNext()) {
                creditCardInstrument = instrumentsIter.next();
                // eslint-disable-next-line
                if (!empty(creditCardInstrument.getCreditCardToken()) && creditCardInstrument.getCreditCardToken().equals(subscriptionToken)) {
                    matchedCardType = creditCardInstrument.getCreditCardType();
                    break;
                }
            }
            // eslint-disable-next-line
            if (empty(matchedCardType) || !matchedCardType.equalsIgnoreCase('MasterCard')) {
                return { success: false };
            }
        }
        if (mastercardAuthIndicator.valueOf() === '0') {
            signedFieldNames += ',auth_indicator';
            requestMap.put('auth_indicator', '0');
        } else if (mastercardAuthIndicator.valueOf() === '1') {
            signedFieldNames += ',auth_indicator';
            requestMap.put('auth_indicator', '1');
        }
        return { success: true, signed_field_names: signedFieldNames, requestMap: requestMap };
    }
    return { success: false };
}

/**
 * Create request data for secure acceptance[Redirect/Iframe/SilenPost] and puts them in requestMap
 * @param {dw.order.LineItemCtnr} lineItemCtnr contains object of basket or order
 * @param {Object} requestMap : Request input data that will be send to create or update token.
 * @param {Object} paymentMethod : Payment Instrument for the request payment method
 * @param {Object} signedFields signedFields
 * @param {Object} unsignedFieldNames unsignedFieldNames
 * @returns {Object} obj
*/
function CreateLineItemCtnrRequestData(lineItemCtnr, requestMap, paymentMethod, signedFields, unsignedFieldNames) {
    var signedFieldNames = signedFields;
    var referenceNumber;
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;

    /* Region BM Setting END: */
    /* Region request creation START: */
    if (lineItemCtnr !== null) {
        var nonGiftCardAmount = CommonHelper.CalculateNonGiftCertificateAmount(lineItemCtnr);
        var result;
        requestMap.put('amount', nonGiftCardAmount.value.toFixed(2));
        requestMap.put('currency', lineItemCtnr.currencyCode);

        if (CsSAType === CybersourceConstants.METHOD_SA_SILENTPOST) {
            referenceNumber = lineItemCtnr.orderNo;
            requestMap.put('reference_number', referenceNumber);
            requestMap.put('payment_method', 'card');
        } else {
            referenceNumber = lineItemCtnr.orderNo;
            requestMap.put('reference_number', referenceNumber);
        }
        if (lineItemCtnr.billingAddress !== null) {
            requestMap.put('bill_to_address_line1', lineItemCtnr.billingAddress.address1);
            // eslint-disable-next-line
            if (!empty(lineItemCtnr.billingAddress.address2)) {
                signedFieldNames += ',bill_to_address_line2';
                requestMap.put('bill_to_address_line2', lineItemCtnr.billingAddress.address2);
            }
            requestMap.put('bill_to_email', lineItemCtnr.customerEmail);
            requestMap.put('bill_to_phone', lineItemCtnr.billingAddress.phone);
            requestMap.put('bill_to_address_city', lineItemCtnr.billingAddress.city);
            requestMap.put('bill_to_address_postal_code', lineItemCtnr.billingAddress.postalCode);
            if (lineItemCtnr.billingAddress.countryCode.value === 'US' || lineItemCtnr.billingAddress.countryCode.value === 'CA') {
                requestMap.put('bill_to_address_state', lineItemCtnr.billingAddress.stateCode);
            }
            requestMap.put('bill_to_address_country', lineItemCtnr.billingAddress.countryCode.value.toLowerCase());
            requestMap.put('bill_to_forename', lineItemCtnr.billingAddress.firstName);
            requestMap.put('bill_to_surname', lineItemCtnr.billingAddress.lastName);
        }

        if (lineItemCtnr.shipments !== null && lineItemCtnr.defaultShipment.shippingAddress !== null) {
            result = CommonHelper.CreateCybersourceShipToObject(lineItemCtnr);
            var shipTo = result.shipTo;
            requestMap.put('ship_to_address_city', shipTo.getCity());
            requestMap.put('ship_to_address_line1', shipTo.getStreet1());
            // eslint-disable-next-line
            if (!empty(shipTo.getStreet2())) {
                signedFieldNames += ',ship_to_address_line2';
                requestMap.put('ship_to_address_line2', shipTo.getStreet2());
            }
            requestMap.put('ship_to_forename', shipTo.getFirstName());
            requestMap.put('ship_to_phone', shipTo.getPhoneNumber());
            requestMap.put('ship_to_surname', shipTo.getLastName());
            requestMap.put('ship_to_address_postal_code', shipTo.getPostalCode());
            if (lineItemCtnr.billingAddress.countryCode.value === 'US' || lineItemCtnr.billingAddress.countryCode.value === 'CA') {
                requestMap.put('ship_to_address_state', shipTo.getState());
            }
            requestMap.put('ship_to_address_country', shipTo.country.value.toLowerCase());
            // eslint-disable-next-line
            if (!empty(shipTo.getShippingMethod())) {
                signedFieldNames += ',shipping_method';
                requestMap.put('shipping_method', shipTo.getShippingMethod());
            }
        }
        signedFieldNames += ',customer_ip_address';
        requestMap.put('customer_ip_address', CommonHelper.getIPAddress());

        var StringUtils = require('dw/util/StringUtils');
        var SecureEncoder = require('dw/util/SecureEncoder');
        result = CommonHelper.CreateCybersourceItemObject(lineItemCtnr);
        var items = result.items;
        var item;
        var itemId;
        var itemcount = 0;
        if (items !== null) {
            var iter = items.iterator();
            while (iter.hasNext()) {
                item = iter.next();
                itemId = item.getId();
                // eslint-disable-next-line
                if (empty(itemId)) {
                    // eslint-disable-next-line
                    continue;
                }
                itemId -= 1;
                itemcount += 1;
                // eslint-disable-next-line
                if (!empty(item.getProductSKU())) {
                    signedFieldNames = signedFieldNames + ',item_' + itemId + '_sku';
                    requestMap.put('item_' + itemId + '_sku', item.getProductSKU());
                }
                // eslint-disable-next-line
                if (!empty(item.getProductCode())) {
                    signedFieldNames = signedFieldNames + ',item_' + itemId + '_code';
                    requestMap.put('item_' + itemId + '_code', item.getProductCode());
                }
                // eslint-disable-next-line
                if (!empty(item.getProductName())) {
                    signedFieldNames = signedFieldNames + ',item_' + itemId + '_name';
                    // unsigned_field_names = unsigned_field_names + ",item_" + itemId + "_name";
                    requestMap.put('item_' + itemId + '_name', SecureEncoder.forUriComponentStrict(item.getProductName()));
                }
                // eslint-disable-next-line
                if (!empty(item.getUnitPrice())) {
                    signedFieldNames = signedFieldNames + ',item_' + itemId + '_unit_price';
                    requestMap.put('item_' + itemId + '_unit_price', item.getUnitPrice());
                }
                // eslint-disable-next-line
                if (!empty(item.getQuantity())) {
                    signedFieldNames = signedFieldNames + ',item_' + itemId + '_quantity';
                    requestMap.put('item_' + itemId + '_quantity', StringUtils.formatNumber(item.getQuantity(), '000', 'en_US'));
                }
                // eslint-disable-next-line
                if (!empty(item.getTaxAmount())) {
                    signedFieldNames = signedFieldNames + ',item_' + itemId + '_tax_amount';
                    requestMap.put('item_' + itemId + '_tax_amount', item.getTaxAmount());
                }
            }
            if (itemcount > 0) {
                signedFieldNames += ',line_item_count';
                requestMap.put('line_item_count', StringUtils.formatNumber(itemcount, '000', 'en_US'));
            }
        }
    }
    return { requestMap: requestMap, signed_field_names: signedFieldNames, unsigned_field_names: unsignedFieldNames };
}

/**
 * create request data for secure acceptance[Redirect/Iframe/SilenPost]
 * @param {Object} sitePreferenceData : Data from site preference for different payment methods
 * @param {Object} paymentInstrument : Payment Instrument for the request payment method
 * @param {dw.order.LineItemCtnr} LineItemCtnr contains object of basket or order
 * @param {Object} subscriptionToken : Token generated for the card, used for update call.
 * @returns {Object} obj
*/
function CreateRequestData(sitePreferenceData, paymentInstrument, LineItemCtnr, subscriptionToken) {
    try {
        var accessKey = sitePreferenceData.access_key;
        var profileId = sitePreferenceData.profile_id;
        var signedFieldNames = sitePreferenceData.signed_field_names;
        var unsignedFieldNames = sitePreferenceData.unsigned_field_names;
        // var isOverrideBilling = sitePreferenceData.CsSAOverrideBillingAddress;
        // var isOverrideShipping = sitePreferenceData.CsSAOverrideShippingAddress;
        var lineItemCtnr = LineItemCtnr;
        var locale = CommonHelper.GetRequestLocale();
        var transactionType;
        var UUIDUtils = require('dw/util/UUIDUtils');
        var transactionUuid = UUIDUtils.createUUID();
        // var orderToken = null;
        var Calendar = require('dw/util/Calendar');
        var date = new Calendar(new Date());
        date.timeZone = 'UTC';
        var StringUtils = require('dw/util/StringUtils');
        var signedDateTime = StringUtils.formatCalendar(date, "yyyy-MM-dd'T'HH:mm:ss'Z'");
        var HashMap = require('dw/util/HashMap');
        var requestMap = new HashMap();
        var paymentMethod = paymentInstrument.paymentMethod;
        var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
        var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
        var cardObject = CardHelper.CreateCybersourcePaymentCardObject('billing', subscriptionToken);
        var CsTransactionType = Site.getCurrent().getCustomPreferenceValue('CsTransactionType').value;
        // eslint-disable-next-line
        session.privacy.orderId = lineItemCtnr.orderNo;

        /* Region BM Setting START: request setting for based on BM configuration */
        if (sitePreferenceData !== null) {
            var ignoreAvs = false;
            var ignoreCvn = false;
            var authIndicatorRes;
            var providerVal;
            transactionType = CsTransactionType;
            switch (CsSAType) {
                case CybersourceConstants.METHOD_SA_REDIRECT:
                    providerVal = 'saredirect';
                    // eslint-disable-next-line
                case CybersourceConstants.METHOD_SA_IFRAME:
                    if (CsSAType.equals(CybersourceConstants.METHOD_SA_IFRAME)) {
                        providerVal = 'saiframe';
                    }
                    if (sitePreferenceData.CsSubscriptionTokenizationEnable === 'YES') {
                        // eslint-disable-next-line
                        if (!empty(subscriptionToken)) {
                            transactionType = CsTransactionType;
                            signedFieldNames += ',payment_token';
                            requestMap.put('payment_token', subscriptionToken);
                            signedFieldNames += ',allow_payment_token_update';
                            requestMap.put('allow_payment_token_update', true);
                            signedFieldNames += ',card_cvn';
                            requestMap.put('card_cvn', cardObject.card.cvNumber);
                        } else {
                            transactionType += ',create_payment_token';
                        }
                    // eslint-disable-next-line
                    } else if (!empty(subscriptionToken)) {
                        signedFieldNames += ',payment_token';
                        requestMap.put('payment_token', subscriptionToken);
                        signedFieldNames += ',card_cvn';
                        requestMap.put('card_cvn', cardObject.card.cvNumber);
                    }
                    authIndicatorRes = MasterCardAuthIndicatorRequest(signedFieldNames, requestMap, subscriptionToken);
                    if (authIndicatorRes.success) {
                        signedFieldNames = authIndicatorRes.signed_field_names;
                        requestMap = authIndicatorRes.requestMap;
                    }
                    if (sitePreferenceData.CsAvsIgnoreResult) {
                        ignoreAvs = true;
                    }

                    if (sitePreferenceData.CsCvnDeclineFlags) {
                        ignoreCvn = true;
                    }
                    requestMap.put('ignore_avs', ignoreAvs);
                    requestMap.put('ignore_cvn', ignoreCvn);
                    requestMap.put('card_type_selection_indicator', '1');
                    if (sitePreferenceData.csCardDecisionManagerEnable) {
                        requestMap.put('skip_decision_manager', false);
                    } else {
                        requestMap.put('skip_decision_manager', true);
                    }
                    // eslint-disable-next-line
                    if (!empty(lineItemCtnr) && !empty(lineItemCtnr.getCustomerNo())) {
                        signedFieldNames += ',consumer_id';
                        // orderToken = lineItemCtnr.getOrderToken();
                        requestMap.put('consumer_id', lineItemCtnr.getCustomerNo());
                    }
                    signedFieldNames += ',override_custom_cancel_page';
                    signedFieldNames += ',override_custom_receipt_page';
                    // eslint-disable-next-line
                    requestMap.put('override_custom_cancel_page', dw.web.URLUtils.https('COPlaceOrder-Submit', 'provider', providerVal));
                    // eslint-disable-next-line
                    requestMap.put('override_custom_receipt_page', dw.web.URLUtils.https('COPlaceOrder-Submit', 'provider', providerVal));
                    break;
                case CybersourceConstants.METHOD_SA_SILENTPOST:
                    // eslint-disable-next-line
                    if (!empty(subscriptionToken)) {
                        signedFieldNames += ',payment_token';
                        requestMap.put('payment_token', subscriptionToken);
                        transactionType = 'update_payment_token';
                    } else {
                        transactionType = 'create_payment_token';
                    }
                    // eslint-disable-next-line
                    if (!empty(lineItemCtnr) && !empty(lineItemCtnr.getCustomerNo())) {
                        signedFieldNames += ',consumer_id';
                        requestMap.put('consumer_id', lineItemCtnr.getCustomerNo());
                    }
                    requestMap.put('ignore_avs', true);
                    requestMap.put('ignore_cvn', true);
                    requestMap.put('card_type_selection_indicator', '1');
                    if (sitePreferenceData.csCardDecisionManagerEnable) {
                        requestMap.put('skip_decision_manager', false);
                    } else {
                        requestMap.put('skip_decision_manager', true);
                    }
                    signedFieldNames += ',override_custom_receipt_page';
                    // eslint-disable-next-line
                    requestMap.put('override_custom_receipt_page', dw.web.URLUtils.https('CYBSecureAcceptance-SilentPostResponse'));
                    break;
                default:
                    transactionType = CsTransactionType;
                    break;
            }
        }
        var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
        signedFieldNames += ',partner_solution_id';
        requestMap.put('partner_solution_id', CybersourceHelper.getPartnerSolutionID());
        var result = CreateLineItemCtnrRequestData(lineItemCtnr, requestMap, paymentMethod, signedFieldNames, unsignedFieldNames);
        requestMap = result.requestMap;
        requestMap.put('locale', locale);
        requestMap.put('access_key', accessKey);
        requestMap.put('profile_id', profileId);
        requestMap.put('transaction_type', transactionType);
        requestMap.put('transaction_uuid', transactionUuid);
        requestMap.put('signed_date_time', signedDateTime);
        requestMap.put('signed_field_names', result.signed_field_names);
        requestMap.put('unsigned_field_names', result.unsigned_field_names);

        return { success: true, requestMap: requestMap };
        /* Region request creation END: */
    } catch (exception) {
        Logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
}

/**
 * Create request data which needs to be send to third party to get the token for the requested credit card.
 * Signature is generated and if signature is not present then requested signature is matched with generated signature.
 * @param {dw.order.PaymentInstrument} paymentInstrument : paymentInstrument
 * @param {dw.order.LineItemCtnr} LineItemCtnr : contains object of basket or order
 * @param {Object} responseParameterMap : Map contains key which are send in response by create/update token service.
 * @param {Object} subscriptionToken : Token generated for the card, used for update call.
 * @returns {Object} obj
*/
function CreateHMACSignature(paymentInstrument, LineItemCtnr, responseParameterMap, subscriptionToken) {
    try {
        var saCountryCode = LineItemCtnr != null ? LineItemCtnr.billingAddress.countryCode.value : responseParameterMap.req_bill_to_address_country.value;
        var sitePreferenceData = GetSitePrefernceDetails(subscriptionToken, saCountryCode);
        var HashMap = require('dw/util/HashMap');
        var requestMapResult = new HashMap();
        var signatureAuthorize = false;
        var secretKey = sitePreferenceData.secretKey;
        var requestData = null; var dataToSign; var
            signature;
        var formAction = sitePreferenceData.formAction;
        // parse secure acceptance request and create signature
        if (paymentInstrument !== null && LineItemCtnr !== null) {
            requestMapResult = CreateRequestData(sitePreferenceData, paymentInstrument, LineItemCtnr, subscriptionToken);
            if (requestMapResult.success && requestMapResult.requestMap !== null) {
                dataToSign = buildDataToSign(requestMapResult.requestMap);
                signature = CommonHelper.signedDataUsingHMAC256(dataToSign, secretKey);
                requestMapResult.requestMap.put('signature', signature.toString());
                requestData = requestMapResult.requestMap;
            }
            return {
                success: true, requestData: requestData, signatureAuthorize: signatureAuthorize, formAction: formAction
            };
        }
        // parse secure acceptance response and create and authorize signature
        if (paymentInstrument !== null && responseParameterMap !== null) {
            dataToSign = buildDataFromResponse(responseParameterMap);
            var resposneSignature = responseParameterMap.signature.stringValue;
            signature = CommonHelper.signedDataUsingHMAC256(dataToSign, secretKey);
            if (signature.toString() === resposneSignature) {
                signatureAuthorize = true;
                CommonHelper.LogResponse(responseParameterMap.req_reference_number.stringValue, responseParameterMap.transaction_id.stringValue,
                    responseParameterMap.request_token.stringValue, responseParameterMap.reason_code.stringValue, responseParameterMap.decision.stringValue);
            }
        }
        return {
            success: true, requestData: null, signatureAuthorize: signatureAuthorize, formAction: null
        };
    } catch (exception) {
        Logger.error('Error in Secure acceptance update payment instrument in customer card ');
        return { error: true, errorMsg: exception.message };
    }
}

/**
 * Set response object for secure acceptance paymentmethod with the request parameters send by cybersource.
 * @param {Object} httpParameterMap httpParameterMap
 * @returns {Object} obj
 */
function mapSecureAcceptanceResponse(httpParameterMap) {
    var responseObject = {};
    if (httpParameterMap !== null) {
        responseObject.MerchantReferenceCode = httpParameterMap.req_reference_number.stringValue;
        responseObject.Decision = httpParameterMap.decision.stringValue;
        responseObject.ReasonCode = httpParameterMap.reason_code.stringValue;
        responseObject.RequestID = httpParameterMap.transaction_id.stringValue;
        responseObject.CardType = httpParameterMap.req_card_type.stringValue;
        responseObject.RequestToken = httpParameterMap.request_token.stringValue;
        responseObject.AuthorizationAmount = httpParameterMap.auth_amount.stringValue;
        responseObject.AuthorizationCode = httpParameterMap.auth_code.stringValue;
        responseObject.AuthorizationReasonCode = httpParameterMap.auth_response.stringValue;
        responseObject.SubscriptionID = httpParameterMap.payment_token.stringValue;
        responseObject.req_bill_to_address_line1 = httpParameterMap.req_bill_to_address_line1.stringValue;
        responseObject.req_bill_to_address_line2 = httpParameterMap.req_bill_to_address_line2;
        responseObject.req_bill_to_email = httpParameterMap.req_bill_to_email.stringValue;
        responseObject.req_bill_to_phone = httpParameterMap.req_bill_to_phone.stringValue;
        responseObject.req_bill_to_address_city = httpParameterMap.req_bill_to_address_city.stringValue;
        responseObject.req_bill_to_address_postal_code = httpParameterMap.req_bill_to_address_postal_code.stringValue;
        responseObject.req_bill_to_address_state = httpParameterMap.req_bill_to_address_state.stringValue;
        responseObject.req_bill_to_forename = httpParameterMap.req_bill_to_forename.stringValue;
        responseObject.req_bill_to_surname = httpParameterMap.req_bill_to_surname.stringValue;
        responseObject.req_bill_to_address_country = httpParameterMap.req_bill_to_address_country.stringValue;
        responseObject.req_ship_to_address_line1 = httpParameterMap.req_ship_to_address_line1.stringValue;
        responseObject.req_ship_to_address_line2 = httpParameterMap.req_ship_to_address_line2;
        responseObject.req_ship_to_forename = httpParameterMap.req_ship_to_forename.stringValue;
        responseObject.req_ship_to_phone = httpParameterMap.req_ship_to_phone.stringValue;
        responseObject.req_ship_to_address_city = httpParameterMap.req_ship_to_address_city.stringValue;
        responseObject.ship_to_address_postal_code = httpParameterMap.ship_to_address_postal_code.stringValue;
        responseObject.req_ship_to_address_state = httpParameterMap.req_ship_to_address_state.stringValue;
        responseObject.req_ship_to_surname = httpParameterMap.req_ship_to_surname.stringValue;
        responseObject.req_ship_to_address_country = httpParameterMap.req_ship_to_address_country.stringValue;
        responseObject.payment_token = httpParameterMap.payment_token.stringValue;
        responseObject.req_payment_token = httpParameterMap.req_payment_token.stringValue;
        responseObject.req_card_expiry_date = httpParameterMap.req_card_expiry_date.stringValue;
        responseObject.req_card_number = httpParameterMap.req_card_number.stringValue;
        responseObject.req_card_type = httpParameterMap.req_card_type.stringValue;
    }
    return responseObject;
}

/**
 * Function to set billto,shipto,amount,currency in request map to test seccure acceptance create token call.
 * @param {Object} billToObject : contains billing address of the order.
 * @param {Object} shipToObject : contains shipping address of the order.
 * @param {Object} purchaseObject : to get amount and currency of the order.
 * @param {Object} requestMap : Object will be used to create the signature and will be send to cybersource for creating/updating token.
 * @returns {Object} obj
 */
function TestLineItemCtnrRequestData(billToObject, shipToObject, purchaseObject, requestMap) {
    // var referenceNumber;
    /* Region BM Setting END: */
    /* Region request creation START: */
    if (purchaseObject !== null) {
        requestMap.put('amount', purchaseObject.getGrandTotalAmount());
        requestMap.put('currency', purchaseObject.getCurrency());
    }
    if (billToObject !== null) {
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
    if (shipToObject !== null) {
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
 * @param {Object} order order
 * @returns {Object} obj
 */
function GetPaymemtInstument(order) {
    if (order !== null) {
        var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
        return CardHelper.getNonGCPaymemtInstument(order);
    }
}

/**
 * Function to match the request has valid secure acceptance profile parameters for merchant POST URL.
 * @param {Object} httpParameterMap : parameter map
 * @returns {Object} obj
 */
function isSAMatchProfileForPost(httpParameterMap) {
    var reqAccessKey = httpParameterMap.req_access_key.stringValue;
    var reqProfileId = httpParameterMap.req_profile_id.stringValue;
    /* eslint-disable */
    if (!empty(reqAccessKey) && !empty(reqProfileId)) {
        var redirectAccessKey = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Redirect_AccessKey');
        var redirectProfileId = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Redirect_ProfileID');
        var redirectSecretKey = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Redirect_SecretKey');
        if (!empty(redirectAccessKey) && reqAccessKey.equals(redirectAccessKey)
            && !empty(redirectProfileId) && reqProfileId.equals(redirectProfileId)) {
            return { success: true, secretkey: redirectSecretKey };
        }
        var iframeAccessKey = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Iframe_AccessKey');
        var iframeProfileId = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Iframe_ProfileID');
        var iframeSecretKey = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Iframe_SecretKey');
        if (!empty(iframeAccessKey) && reqAccessKey.equals(iframeAccessKey)
            && !empty(iframeProfileId) && reqProfileId.equals(iframeProfileId)) {
            return { success: true, secretkey: iframeSecretKey };
        }
    }
    /* eslint-enable */
    var errorMsg = 'Missing or invalid profile parameters';
    Logger.error('[SecureAcceptanceHelper.js] isSAMatchProfileForPost - Error in Secure acceptance merchant post URL parameters ' + errorMsg);
    return { error: true, errorMsg: errorMsg };
}

/**
 * Function to to validate secure acceptance merchant POST request is valid.
 * @param {Object} httpParameterMap : parameter map
 * @returns {Object} obj
 */
function validateSAMerchantPostRequest(httpParameterMap) {
    // validate httpParameterMap exists along with order and signature in it
    // eslint-disable-next-line
    if (!empty(httpParameterMap) && !empty(httpParameterMap.req_reference_number.stringValue) && !empty(httpParameterMap.signature.stringValue)) {
        // match the request has valid secure acceptance profile parameters for merchant POST URL
        var result = isSAMatchProfileForPost(httpParameterMap);
        if (result.error) {
            return false;
        }
        // prepare signature and send match result
        var dataToSign = buildDataFromResponse(httpParameterMap);
        var signature = CommonHelper.signedDataUsingHMAC256(dataToSign, result.secretkey, null);
        if (signature.toString() === httpParameterMap.signature.stringValue) {
            // signature got Authorize
            return true;
        }
    }
    return false;
}

/**
 * JSON prepare for Merchant POST parameters
 * @param {Object} httpParameterMap httpParameterMap
 * @returns {Object} obj
 */
function jsonSecureAcceptanceResponse(httpParameterMap) {
    var responseJSON;
    var responseObject = [];
    if (httpParameterMap !== null) {
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
        responseJSON = '{' + responseObject.join(',') + '}';
    }
    return responseJSON;
}

/**
 * Function save the required secure acceptance merchant POST request data in JSOn form in custom object. This data will be processed by batch job.
 * @param {Object} httpParameterMap : parameter map
 * @returns {Object} obj
 */
function saveSAMerchantPostRequest(httpParameterMap) {
    try {
        // prepare JSON from merchant POST request parametrs
        var responseJSONString = jsonSecureAcceptanceResponse(httpParameterMap);

        // store JSON in custom object
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var Transaction = require('dw/system/Transaction');
        var co = CustomObjectMgr.getCustomObject('SA_MerchantPost', httpParameterMap.req_reference_number.stringValue);
        Transaction.wrap(function () {
            if (co == null) {
                co = CustomObjectMgr.createCustomObject('SA_MerchantPost', httpParameterMap.req_reference_number.stringValue);
                co.custom.processed = false;
                co.custom.postParams = responseJSONString;
            }
        });
        return true;
    } catch (ex) {
        Logger.error('[SecureAcceptanceHelper.js] saveSAMerchantPostRequest - error occured in JSON save in custom object' + ex.message);
        return false;
    }
}

/**
 * Handle the Card ReasonCode.
 * @param {Object} ReasonCode Reason Code
 * @returns {Object} obj
 */
function HandleDecision(ReasonCode) {
    var serviceResponse = {};
    serviceResponse.ReasonCode = ReasonCode;
    var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
    return CardHelper.HandleCardResponse(serviceResponse);
}

/**
 * Script method is used to Authorize payer, authorize if PAReasonCode 100
 * @param {Object} LineItemCtnrObj LineItemCtnrObj
 * @param {Object} paymentInstrument paymentInstrument
 * @param {Object} orderNo orderNo
 * @returns {Object} obj
 */
function AuthorizePayer(LineItemCtnrObj, paymentInstrument, orderNo) {
    var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var result;
    // var PAReasonCode;
    // var PAVReasonCode;
    // var AuthorizationReasonCode;
    var serviceResponse;
    var paEnabled = false;
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var paymentMethod = paymentInstrument.getPaymentMethod();
    // eslint-disable-next-line
    if (!empty(CybersourceHelper.getPAMerchantID())) {
        var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
        if ((paymentMethod.equals(CybersourceConstants.METHOD_CREDIT_CARD) && (CsSAType == null || CsSAType !== CybersourceConstants.METHOD_SA_FLEX)) || paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT) || paymentMethod.equals(CybersourceConstants.METHOD_GooglePay)) {
            result = CardHelper.PayerAuthEnable(paymentInstrument.creditCardType);
        } else if (CsSAType.equals(CybersourceConstants.METHOD_SA_FLEX)) {
            result = CardHelper.PayerAuthEnable(paymentInstrument.creditCardType);
        }
        if (result.error) {
            return result;
        } if (result.paEnabled) {
            paEnabled = result.paEnabled;
        }
    }

    // eslint-disable-next-line
    if (paEnabled && empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT)) && empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_GooglePay))) {
        var CardFacade = require('*/cartridge/scripts/facade/CardFacade');
        // eslint-disable-next-line
        result = CardFacade.PayerAuthEnrollCheck(LineItemCtnrObj, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.creditCardFields);
        serviceResponse = result.serviceResponse;
        if(serviceResponse.ReasonCode === 478 && session.custom.enroll == true){
            session.custom.enroll = false;
            return {sca: true};
        }
        if (result.error) {
            return result;
        }
        if (CybersourceHelper.getProofXMLEnabled()) {
            var PaymentInstrumentUtils = require('*/cartridge/scripts/utils/PaymentInstrumentUtils');
            PaymentInstrumentUtils.UpdatePaymentTransactionWithProofXML(paymentInstrument, serviceResponse.ProofXML);
        }
        /* eslint-disable */
        if (!empty(serviceResponse.veresEnrolled)) {
            session.privacy.veresEnrolled = serviceResponse.veresEnrolled;
        }
        if (!empty(serviceResponse.networkScore)) {
            session.privacy.networkScore = serviceResponse.networkScore;
        }
        if (serviceResponse.ReasonCode === 100 || serviceResponse.ReasonCode === 480) {
            return { OK: true, serviceResponse: serviceResponse };
        } if (!empty(serviceResponse.AcsURL)) {
            session.privacy.AcsURL = serviceResponse.AcsURL;
            session.privacy.PAReq = serviceResponse.PAReq;
            session.privacy.PAXID = serviceResponse.PAXID;
            session.privacy.orderId = orderNo;
            session.privacy.stepUpUrl = serviceResponse.stepUpUrl;
            session.privacy.authenticationTransactionID = serviceResponse.authenticationTransactionID;
            return { payerauthentication: true, serviceResponse: serviceResponse };
        }
        /* eslint-enable */
        Logger.error('An error occured during PayerAuthEnroll check. (ReasonCode: {0} , RequestID: {1}', serviceResponse.ReasonCode, serviceResponse.RequestID);
        return { error: true, serviceResponse: serviceResponse };
        // eslint-disable-next-line
    } if (paEnabled && !empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
        var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/helper/VisaCheckoutHelper');
        return VisaCheckoutHelper.PayerAuthEnroll(LineItemCtnrObj, paymentInstrument, orderNo);
    }
    return { success: true };
}

/**
 * Card processing for 3D cards
 * @param {Object} args args
 * @returns {Object} obj
 */
function HookIn3DRequest(args) {
    var result; var
        serviceResponse;
    var ReadFromBasket = true;
    var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
    // Service facade call for card authorization
    // eslint-disable-next-line
    if (!empty(args.Order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
        var VisaCheckoutFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/facade/VisaCheckoutFacade');
        result = VisaCheckoutFacade.CCAuthRequest(args.Order, args.orderNo, CommonHelper.getIPAddress());
    } else {
        var CardFacade = require('*/cartridge/scripts/facade/CardFacade');
        var Resource = require('dw/web/Resource');
        // var ipAddress = CommonHelper.getIPAddress();
        var payerAuthEnable = CardHelper.PayerAuthEnable(args.paymentInstrument.creditCardType);
        if (payerAuthEnable.error) {
            return { error: true };
        } if (payerAuthEnable.paEnabled && args.paymentInstrument.paymentMethod !== Resource.msg('paymentmethodname.googlepay', 'cybersource', null)) {
            // eslint-disable-next-line
            if (!empty(args.payerValidationResponse)) {
                result = { serviceResponse: args.payerValidationResponse };
            }
            // eslint-disable-next-line
            if (!empty(args.payerEnrollResponse)) {
                result = { serviceResponse: args.payerEnrollResponse };
            }
        } else {
            result = CardFacade.CCAuthRequest(args.Order, args.Order.orderNo, CommonHelper.getIPAddress(),
                args.SubscriptionID, args.payerEnrollResponse, args.payerValidationResponse, ReadFromBasket);
        }
    }
    // facade response handling
    if (result.error) {
        return { error: true };
    }
    serviceResponse = result.serviceResponse;
    return CardHelper.CardResponse(args.Order, args.paymentInstrument, serviceResponse);
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 * @param {Object} args args
 * @returns {Object} obj
 */
function AuthorizeCreditCard(args) {
    var paymentInstrument = args.PaymentInstrument;
    // eslint-disable-next-line
    if (empty(paymentInstrument)) {
        return { error: true };
    }

    //  When using saved credit cards, fill in the CC billing form fields that will be used later to build the request.
    /* eslint-disable */
    if (paymentInstrument.paymentMethod === 'CREDIT_CARD') {
        if (empty(session.forms.billing.creditCardFields.cardNumber.value)) {
            session.forms.billing.creditCardFields.cardNumber.value = paymentInstrument.creditCardNumber;
        }
        if (empty(session.forms.billing.creditCardFields.cardType.value)) {
            session.forms.billing.creditCardFields.cardType.value = paymentInstrument.creditCardType;
        }
        if (empty(session.forms.billing.creditCardFields.expirationMonth.value)) {
            session.forms.billing.creditCardFields.expirationMonth.value = paymentInstrument.creditCardExpirationMonth;
        }

        if (empty(session.forms.billing.creditCardFields.expirationYear.value)) {
            session.forms.billing.creditCardFields.expirationYear.value = paymentInstrument.creditCardExpirationYear;
        }
    }
    /* eslint-enable */

    var orderNo = args.Order.orderNo;
    var result = AuthorizePayer(args.Order, paymentInstrument, orderNo);
    if (result.error) {
        return { error: true };
    }
    if (result.failed) {
        return { declined: true };
    }
    if (result.cardresponse) {
        var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
        return CardHelper.CardResponse(result.order, paymentInstrument, result.serviceResponse);
    }
    if (result.payerauthentication) {
        // eslint-disable-next-line
        session.privacy.process3DRequestParent = true;
        var handle3DResponse = {
            process3DRedirection: true,
            jwt: result.serviceResponse.jwt
        };
        return handle3DResponse;
    }
    if(result.sca){
        return {sca:true};
    }
    if (paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT) && !result.success) {
        return result;
    }

    return HookIn3DRequest({
        Order: args.Order, orderNo: orderNo, payerEnrollResponse: result.serviceResponse, paymentInstrument: paymentInstrument, SubscriptionID: paymentInstrument.getCreditCardToken()
    });
}

/** Exported functions * */
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
