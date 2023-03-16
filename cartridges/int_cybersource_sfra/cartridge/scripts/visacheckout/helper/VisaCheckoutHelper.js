'use strict';

/* API includes */
/* Script Modules */

var server = require('server');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

/**
* Create or update basket ShippingAddress Visa Checkout decrypted payment data from cybersource
* @param {dw.order.OrderAddress} lineItemCtnrAddress lineItemCtnrAddress
* @param {Object} decryptedData decryptedData
* @returns {Object} object
*/
function createLineItemCtnrShippingAddress(lineItemCtnrAddress, decryptedData) {
    // validate the lineItemCtnrAddress exists
    if (decryptedData.shipTo === null) {
        throw new Error('Shipping Address not available in visa checkout decrypted payment data from cybersource');
    }

    // address line 1 and line 2
    lineItemCtnrAddress.setAddress1(decryptedData.shipTo_Address1);
    // eslint-disable-next-line
    if (!empty(decryptedData.shipTo_Address2)) {
        lineItemCtnrAddress.setAddress2(decryptedData.shipTo_Address2);
    }

    // country, city, state, post code
    lineItemCtnrAddress.setCity(decryptedData.shipTo_City);
    lineItemCtnrAddress.setStateCode(decryptedData.shipTo_StateCode);
    lineItemCtnrAddress.setPostalCode(decryptedData.shipTo_PostalCode);
    lineItemCtnrAddress.setCountryCode(decryptedData.shipTo_CountryCode);

    // phone number
    // eslint-disable-next-line
    if (!empty(decryptedData.shipTo_Phone)) {
        lineItemCtnrAddress.setPhone(decryptedData.shipTo_Phone);
    }

    // first name
    lineItemCtnrAddress.setFirstName(decryptedData.shipTo_FirstName);
    // last name
    lineItemCtnrAddress.setLastName(decryptedData.shipTo_LastName);
    return { success: true, lineItemCtnrAddress: lineItemCtnrAddress };
}

/**
* Fetches data of the site preferences.
* @param {Object} prefs prefs
* @returns {Object} arr
*/
function getSitePreferenceValues(prefs) {
    var arr = [];
    for (var i = 0; i < prefs.length; i += 1) {
        arr.push(prefs[i].valueOf());
    }
    return arr;
}

/**
* Checks whether object is empty or not.
* @param {Object} obj obj
* @returns {Object} flag
*/
function isObjectEmpty(obj) {
    if (obj == null) {
        return false;
    }
    if (obj.length > 0) {
        return true;
    } if (typeof obj === 'boolean') {
        return true;
    }
    // otherwise we have an object, so loop through the properties to check for at least one non-null
    var retval = false;

    // eslint-disable-next-line
    Object.keys(obj).forEach(function (key) {
        if (typeof obj[key] === 'object') {
            retval = retval || isObjectEmpty(obj[key]);
        } else if (obj[key] != null) {
            return true;
        }
    });
    return retval;
}

/**
 * Recursively transforms an object into the needed format for Visa to consume it.
 * The last two arguments are optional and aid in the recursion.
 * @param {Object} obj obj
 * @param {Object} inStr inStr
 * @param {Object} numSpc numSpc
 * @returns {Object} str
 */
function convertObjectToString(obj, inStr, numSpc) {
    // handle defaults
    var numSpaces = numSpc;
    if (numSpaces === undefined) { numSpaces = 0; }

    var str = (inStr === undefined) ? '' : inStr;
    var spaceStr = '';
    for (var i = 0; i < numSpaces; i += 1) {
        spaceStr += ' ';
    }
    str += (spaceStr + '{ \r\n');
    Object.keys(obj).forEach(function (key) {
        if (isObjectEmpty(obj[key])) {
            var newObj = obj[key];
            if (key === 'name' || key === 'value' || key === 'nvPair') {
                str += (spaceStr + '  "' + key + '": ');
            } else {
                str += (spaceStr + '  ' + key + ': ');
            }
            // recursive call for object types
            if (typeof newObj === 'object') {
                if (Array.isArray(newObj)) {
                    // eslint-disable-next-line
                    var arrStr = convertArrayToString(newObj);
                    str += arrStr;
                } else {
                    var newStr = str;
                    str = (convertObjectToString(newObj, newStr, (numSpaces + 2)));
                }
            } else {
                // handle value types (terminating condition)
                str += ('"' + newObj + '"');
            }
            str += ',\r\n';
        }
    });
    // remove last comma and white space
    str = str.replace(/,\s*$/, '');
    str += '\r\n' + spaceStr + '}';
    return str;
}

/**
 * Converts array to a string.
 * @param {Object} arr arr
 * @returns {Object} arrStr
 */
function convertArrayToString(arr) {
    var arrStr = '['; var
        arrValue;
    for (var i = 0; i < arr.length; i += 1) {
        if (typeof arr[i] === 'object') {
            arrValue = convertObjectToString(arr[i]);
        } else {
            arrValue = arr[i];
        }

        if (typeof arr[i] === 'object') {
            arrStr += arrValue;
        } else {
            arrStr += '"' + arrValue + '"';
        }
        if (i < (arr.length - 1)) {
            arrStr += ', ';
        }
    }
    arrStr += ']';
    return arrStr;
}

/**
* Prepare Visa Checkout lightbox launch settings object from site preferences and basket. Mainly used on cart and billing page
* @param {dw.order.Basket} cart cart
* @param {Object} requireDeliveryAddress address required for delivery
* @returns {Object} status
*/
function getButtonInitializeSettings(cart, requireDeliveryAddress) {
    // eslint-disable-next-line
    var logger = dw.system.Logger.getLogger('Cybersource');

    try {
        if (cart) {
            // return Visa Checkout v.init API object
            var vinitObject = {};

            // get the current site
            // eslint-disable-next-line
            var currentSite = dw.system.Site.getCurrent();

            // load initialization settings from site preferences
            vinitObject.apikey = currentSite.getCustomPreferenceValue('cybVisaAPIKey');
            vinitObject.externalProfileId = currentSite.getCustomPreferenceValue('cybVisaExternalProfileId');

            vinitObject.settings = {};
            // eslint-disable-next-line
            var visaLocale = (request.locale === 'default' || request.locale === 'en') ? 'en_US' : request.locale;
            vinitObject.settings.locale = visaLocale;
            vinitObject.settings.countryCode = visaLocale.substr(visaLocale.length - 2);

            vinitObject.settings.shipping = {};

            // Indicate Delivery Address to be collected from visa checkout, default to true.
            vinitObject.settings.shipping.collectShipping = (requireDeliveryAddress == null) ? true : requireDeliveryAddress;

            vinitObject.settings.threeDSSetup = {};
            vinitObject.settings.threeDSSetup.threeDSActive = currentSite.getCustomPreferenceValue('cybVisaThreeDSActive');
            vinitObject.settings.threeDSSetup.threeDSSuppressChallenge = currentSite.getCustomPreferenceValue('cybVisaThreeDSSuppressChallenge');

            vinitObject.settings.payment = {};
            vinitObject.settings.payment.cardBrands = getSitePreferenceValues(currentSite.getCustomPreferenceValue('cybVisaCardBrands'));

            vinitObject.settings.dataLevel = 'FULL';

            // create the container for payment information
            vinitObject.paymentRequest = {};
            vinitObject.paymentRequest.merchantRequestId = cart.getUUID();
            vinitObject.paymentRequest.currencyCode = cart.getCurrencyCode();
            vinitObject.paymentRequest.subtotal = cart.merchandizeTotalNetPrice.value.toFixed(2);
            vinitObject.paymentRequest.shippingHandling = cart.adjustedShippingTotalPrice.value.toFixed(2);

            // handle tax
            if (cart.totalTax.value !== 0) {
                vinitObject.paymentRequest.tax = cart.totalTax.value.toFixed(2);
            } else {
                vinitObject.paymentRequest.tax = cart.merchandizeTotalTax.value.toFixed(2);
            }

            // handle total
            if (cart.totalGrossPrice.value !== 0) {
                vinitObject.paymentRequest.total = cart.totalGrossPrice.value.toFixed(2);
            } else if (cart.totalNetPrice.value !== 0) {
                vinitObject.paymentRequest.total = cart.totalNetPrice.value.toFixed(2);
            } else {
                vinitObject.paymentRequest.total = cart.merchandizeTotalNetPrice.value.toFixed(2);
            }
            var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
            // eslint-disable-next-line
            var signature = CommonHelper.signedDataUsingHMAC256(cart.getUUID(), dw.system.Site.getCurrent().getCustomPreferenceValue('cybVisaSecretKey'));
            return { success: true, signature: signature, VInitFormattedString: convertObjectToString(vinitObject, '', 0) };
        }
        return { error: true, errorMsg: 'vinit string formation error : empty basket found' };
    } catch (err) {
        logger.error('vinit string formation error: {0}', err.message);
        return { error: true, errorMsg: err.message };
    }
}

/**
 * Initialization string formation for the v.init event handler function defined in onVisaCheckoutReady function.
 * @param {Object} requireDeliveryAddress requireDeliveryAddress
 * @returns {Object} status
 */
function getInitializeSettings(requireDeliveryAddress) {
    var PaymentMgr = require('dw/order/PaymentMgr');
    var BasketMgr = require('dw/order/BasketMgr');
    var isVisaCheckout = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT).isActive();
    if (isVisaCheckout) {
        var cart = BasketMgr.getCurrentBasket();
        cart = cart || null;
        server.forms.getForm('visaCheckout');
        return getButtonInitializeSettings(cart, requireDeliveryAddress);
    }
    return { error: true };
}

/**
* Create or update basket BillingAddress Visa Checkout decrypted payment data from cybersource
* @param {dw.order.OrderAddress} lineItemCtnrAddress lineItemCtnrAddress
* @param {Object} decryptedData decryptedData
* @returns {Object} status
*/
function createLineItemCtnrBillingAddress(lineItemCtnrAddress, decryptedData) {
    // validate the lineItemCtnrAddress exists
    // eslint-disable-next-line
    var vcCurrentPage = session.privacy.cyb_CurrentPage;
    if (vcCurrentPage !== 'CybBilling') {
        if (decryptedData.billTo == null) {
            throw new Error('Billing Address not available in visa checkout decrypted payment data from cybersource');
        }

        // address line 1 and line 2
        lineItemCtnrAddress.setAddress1(decryptedData.billTo_Address1);
        // eslint-disable-next-line
        if (!empty(decryptedData.billTo_Address2)) {
            lineItemCtnrAddress.setAddress2(decryptedData.billTo_Address2);
        }

        // country, city, state, post code
        lineItemCtnrAddress.setCity(decryptedData.billTo_City);
        // eslint-disable-next-line
        if (!empty(decryptedData.billTo_StateCode)) {
            lineItemCtnrAddress.setStateCode(decryptedData.billTo_StateCode);
        }
        lineItemCtnrAddress.setPostalCode(decryptedData.billTo_PostalCode);
        lineItemCtnrAddress.setCountryCode(decryptedData.billTo_CountryCode);

        // phone number
        // eslint-disable-next-line
        if (!empty(decryptedData.billTo_Phone)) {
            lineItemCtnrAddress.setPhone(decryptedData.billTo_Phone);
        }

        // company name
        // eslint-disable-next-line
        if (!empty(decryptedData.billTo_Company)) {
            lineItemCtnrAddress.setCompanyName(decryptedData.billTo_Company);
        }

        // first name
        lineItemCtnrAddress.setFirstName(decryptedData.billTo_FirstName);
        // last name
        lineItemCtnrAddress.setLastName(decryptedData.billTo_LastName);
    } else {
        // address line 1 and line 2
        lineItemCtnrAddress.setAddress1(lineItemCtnrAddress.address1);
        // eslint-disable-next-line
        if (!empty(lineItemCtnrAddress.address2)) {
            lineItemCtnrAddress.setAddress2(lineItemCtnrAddress.address2);
        }

        // country, city, state, post code
        lineItemCtnrAddress.setCity(lineItemCtnrAddress.city);
        // eslint-disable-next-line
        if (!empty(lineItemCtnrAddress.stateCode)) {
            lineItemCtnrAddress.setStateCode(lineItemCtnrAddress.stateCode);
        }
        lineItemCtnrAddress.setPostalCode(lineItemCtnrAddress.postalCode);
        lineItemCtnrAddress.setCountryCode(lineItemCtnrAddress.countryCode);

        // phone number
        // eslint-disable-next-line
        if (!empty(decryptedData.billTo_Phone)) {
            lineItemCtnrAddress.setPhone(lineItemCtnrAddress.phone);
        }

        // company name
        // eslint-disable-next-line
        if (!empty(decryptedData.billTo_Company)) {
            lineItemCtnrAddress.setCompanyName(lineItemCtnrAddress.companyName);
        }

        // first name
        lineItemCtnrAddress.setFirstName(lineItemCtnrAddress.firstName);
        // last name
        lineItemCtnrAddress.setLastName(lineItemCtnrAddress.lastName);
    }
    return { success: true, lineItemCtnrAddress: lineItemCtnrAddress };
}

/**
* Prepare Visa Checkout Button settings query string from site preferences
* @returns {Object} obj
*/
function getButtonDisplaySettings() {
    var BasketMgr = require('dw/order/BasketMgr');
    var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'helper/CommonHelper');
    var cart = BasketMgr.getCurrentBasket();
    var paymentAmount = CommonHelper.CalculateNonGiftCertificateAmount(cart);
    var Countries = require('~/cartridge/scripts/utils/Countries');
    var countryCode = Countries.getCurrent({
        CurrentRequest: {
            // eslint-disable-next-line
            locale: request.locale
        }
    }).countryCode;
    var PaymentMgr = require('dw/order/PaymentMgr');
    // eslint-disable-next-line
    var applicablePaymentMethods = PaymentMgr.getApplicablePaymentMethods(customer, countryCode, paymentAmount.value);
    var method = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT);
    // eslint-disable-next-line
    var isVisaCheckout = !!((!empty(applicablePaymentMethods) && method && applicablePaymentMethods.contains(method)));
    if (!isVisaCheckout) {
        return { error: true };
    }
    // get the current site
    // eslint-disable-next-line
    var currentSite = dw.system.Site.getCurrent();

    // image source url
    var imageSource = currentSite.getCustomPreferenceValue('cybVisaButtonImgUrl');

    // size
    var imageSize = (currentSite.getCustomPreferenceValue('cybVisaButtonSize') !== null) ? currentSite.getCustomPreferenceValue('cybVisaButtonSize') : null;

    // color
    var imageColor = (currentSite.getCustomPreferenceValue('cybVisaButtonColor') !== null) ? currentSite.getCustomPreferenceValue('cybVisaButtonColor') : null;

    // height
    var imageHeight = (currentSite.getCustomPreferenceValue('cybVisaButtonHeight') !== null) ? currentSite.getCustomPreferenceValue('cybVisaButtonHeight') : null;

    // width
    var imageWidth = (currentSite.getCustomPreferenceValue('cybVisaButtonWidth') !== null) ? currentSite.getCustomPreferenceValue('cybVisaButtonWidth') : null;

    // brand cards applicable
    var brandCards = (currentSite.getCustomPreferenceValue('cybVisaCardBrands') !== null) ? currentSite.getCustomPreferenceValue('cybVisaCardBrands') : null;

    // locale of current request
    // eslint-disable-next-line
    var locale = (request.locale === 'default' || request.locale === 'en') ? 'en_US' : request.locale;

    // tell Me More Link
    var tellMeMoreLinkActive = currentSite.getCustomPreferenceValue('cybVisaTellMeMoreLinkActive');

    var buttonDisplaySettings = [];
    buttonDisplaySettings.push(imageSource + '?color=' + imageColor);
    buttonDisplaySettings.push('size=' + imageSize);
    buttonDisplaySettings.push('height=' + imageHeight);
    buttonDisplaySettings.push('width=' + imageWidth);
    buttonDisplaySettings.push('cardBrands=' + brandCards.join(','));
    buttonDisplaySettings.push('locale=' + locale);
    return { success: true, ButtonDisplayURL: buttonDisplaySettings.join('&'), TellMeMoreActive: tellMeMoreLinkActive };
}

/**
 * Validates the PayerAuth information the customer provided with CCAuth request for visacheckout card payment
 * @param {dw.order.LineItemCtnr} lineItemCtnrObj lineItemCtnrObj
 * @param {dw.order.PaymentInstrument} paymentInstrument paymentInstrument
 * @returns {Object} obj
 */
function payerAuthValidation(lineItemCtnrObj, paymentInstrument) {
    var orderNo = lineItemCtnrObj.orderNo !== null ? lineItemCtnrObj.orderNo : lineItemCtnrObj.getUUID();
    // eslint-disable-next-line
    var PAResponsePARes = request.httpParameterMap.PaRes.value;
    // var PAXID = request.httpParameterMap.PAXID.value;
    // eslint-disable-next-line
    var transactionId = request.httpParameterMap.processorTransactionId.value != null ? request.httpParameterMap.processorTransactionId.value : '';

    var VisaCheckoutFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/facade/VisaCheckoutFacade');
    var result = VisaCheckoutFacade.PayerAuthValidationCCAuthRequest(lineItemCtnrObj, PAResponsePARes, paymentInstrument.paymentTransaction.amount, orderNo, transactionId);
    if (result.success) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        result = CardHelper.CardResponse(lineItemCtnrObj, paymentInstrument, result.serviceResponse);
        if (result.authorized) {
            return { submit: true };
        }
        if (result.review) {
            return { review: true };
        }
    }
    // eslint-disable-next-line
    var PlaceOrderError = result.PlaceOrderError !== null ? result.PlaceOrderError : new Status(Status.ERROR, 'confirm.error.declined');
    return {
        fail: true,
        PlaceOrderError: PlaceOrderError
    };
}

/**
 * Checks the PayerAuthEnrollment information with CCAuth request for visacheckout card payment
 * @param {dw.order.LineItemCtnr} lineItemCtnrObj lineItemCtnrObj
 * @param {dw.order.PaymentInstrument} paymentInstrument paymentInstrument
 * @param {Object} orderNo orderNo
 * @returns {Object} result
 */
function payerAuthEnroll(lineItemCtnrObj, paymentInstrument, orderNo) {
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    var VisaCheckoutFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/facade/VisaCheckoutFacade');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var result; var
        serviceResponse;

    result = VisaCheckoutFacade.PayerAuthEnrollCCAuthRequest(lineItemCtnrObj, paymentInstrument.paymentTransaction.amount, orderNo);
    if (result.error) {
        return result;
    }
    serviceResponse = result.serviceResponse;
    if (CybersourceHelper.getProofXMLEnabled()) {
        var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
        PaymentInstrumentUtils.UpdatePaymentTransactionWithProofXML(paymentInstrument, serviceResponse.ProofXML);
    }
    /* eslint-disable */
    if (!empty(serviceResponse.AcsURL) && serviceResponse.PAReasonCode === 475) {
        session.privacy.AcsURL = serviceResponse.AcsURL;
        session.privacy.PAReq = serviceResponse.PAReq;
        session.privacy.PAXID = serviceResponse.PAXID;
        session.privacy.order_id = orderNo;
        session.privacy.authenticationTransactionID = serviceResponse.authenticationTransactionID;
        return { payerauthentication: true, serviceResponse: serviceResponse };
    }
    /* eslint-enable */
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    return CardHelper.CardResponse(lineItemCtnrObj, paymentInstrument, serviceResponse);
}

module.exports = {
    CreateLineItemCtnrBillingAddress: createLineItemCtnrBillingAddress,
    CreateLineItemCtnrShippingAddress: createLineItemCtnrShippingAddress,
    GetButtonDisplaySettings: getButtonDisplaySettings,
    GetButtonInitializeSettings: getButtonInitializeSettings,
    Initialize: getInitializeSettings,
    PayerAuthEnroll: payerAuthEnroll,
    PayerAuthValidation: payerAuthValidation

};
