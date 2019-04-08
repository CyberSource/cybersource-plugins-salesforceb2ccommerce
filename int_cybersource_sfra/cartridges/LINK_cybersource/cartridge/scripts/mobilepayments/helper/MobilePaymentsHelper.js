'use strict';

/**
* Demandware Script File
*
 To define helper method for the ApplePay APM
*
*/

var Logger = require('dw/system/Logger').getLogger('Cybersource');
var Order = require('dw/order/Order');
var Resource = require('dw/web/Resource');
/**
 * This function validates the ApplePayRequest, If request header does not have apple pay information then error message is returned back.
 * @param {Object} order order object
 * @returns {Object} ApplePayRequest validation object
 */
function validateMobilePaymentRequest(order) {
    var Site = require('dw/system/Site');
    var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

    var headersMap = request.httpHeaders; // eslint
    var requestParam = request.httpParameterMap.requestBodyAsString;
    var jsonObj;
    var paymentMethod;

    if (empty(order)) {
        Logger.error('[MobilePaymentsHelper.js] Missing order parameter');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.missingrequestparams', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.missingrequestparams', 'cybMobilePayments', null) };
    }

    if (empty(headersMap)) {
        Logger.error('[MobilePaymentsHelper.js] Missing credentials in header');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidrequestcredential', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidrequestcredential', 'cybMobilePayments', null) };
    }

    try {
        jsonObj = JSON.parse(requestParam);
        jsonObj.orderID = order.orderNo;
    } catch (ex) {
        Logger.error('[MobilePaymentsHelper.js] Invalid JSON for request parameters');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidjson', 'cybMobilePayments', null) };
    }
    if (empty(jsonObj.orderID) || jsonObj.orderID.length > 50) {
        Logger.error('[MobilePaymentsHelper.js] Missing orderID in JSON or exceed max length 50 char');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidorderid', 'cybMobilePayments', null) };
    } else {
        if (empty(order)) {
            return {
                error: true,
                ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.ordernotfound', 'cybMobilePayments', null),
                ERRORMSG: Resource.msgf('cyb.mobilePayment.errormsg.ordernotfound', 'cybMobilePayments', null, jsonObj.orderID)
            };
        } else {
            if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_GooglePay))) {
                paymentMethod = CybersourceConstants.METHOD_AndroidPay;
            } else if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_ApplePay))) {
                paymentMethod = CybersourceConstants.METHOD_ApplePay;
            }
            if (empty(order.getPaymentInstruments(paymentMethod))) {
                return {
                    error: true,
                    ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.nonmobilePaymentorder', 'cybMobilePayments', null),
                    ERRORMSG: Resource.msgf('cyb.mobilePayment.errormsg.nonmobilePaymentorder', 'cybMobilePayments', null, jsonObj.orderID)
                };
            } else if (order.status.value !== Order.ORDER_STATUS_CREATED) {
                return {
                    error: true,
                    ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.nonqualifiedorder', 'cybMobilePayments', null),
                    ERRORMSG: Resource.msgf('cyb.mobilePayment.errormsg.nonqualifiedorder', 'cybMobilePayments', null, jsonObj.orderID)
                };
            }
        }
    }

    if (paymentMethod === CybersourceConstants.METHOD_AndroidPay) {
        if (empty(headersMap.containsKey('dw_androidpay_user')) || empty(headersMap.containsKey('dw_androidpay_password'))) {
            Logger.error('[MobilePaymentsHelper.js] Missing credentials user or password in header');
            return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidrequestcredential', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidrequestcredential', 'cybMobilePayments', null) };
        }
    }

    if (paymentMethod === CybersourceConstants.METHOD_AndroidPay) {
        if (empty(headersMap.get('dw_androidpay_user')) || empty(headersMap.get('dw_androidpay_password'))) {
            Logger.error('[MobilePaymentsHelper.js] Missing credentials user or password in header');
            return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidrequestcredential', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidrequestcredential', 'cybMobilePayments', null) };
        }
    }

    if (paymentMethod === CybersourceConstants.METHOD_AndroidPay) {
        if (!headersMap.get('dw_androidpay_user').equals(Site.getCurrent().getCustomPreferenceValue('cybAndroidPayInterfaceUser'))) {
            Logger.error('[MobilePaymentsHelper.js] Wrong user in header');
            return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidrequestcredential', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invaliduser', 'cybMobilePayments', null) };
        }
    }

    if (paymentMethod === CybersourceConstants.METHOD_AndroidPay) {
        if (!headersMap.get('dw_androidpay_password').equals(Site.getCurrent().getCustomPreferenceValue('cybAndroidPayInterfacePassword'))) {
            Logger.error('[MobilePaymentsHelper.js] Wrong password in header, might be password didnot arrive in base64 encoded form');
            return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidrequestcredential', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidpassword', 'cybMobilePayments', null) };
        }
    }

    if (empty(requestParam)) {
        Logger.error('[MobilePaymentsHelper.js] Missing post parameters in JSON form');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.missingrequestparams', 'cybMobilePayments', null) };
    }

    if (empty(jsonObj.payment.token) && empty(jsonObj.payment.token)) {
        Logger.error('[MobilePaymentsHelper.js] Missing encryptedPaymentBlob or networkToken in JSON');
        return {
            error: true,
            RRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null),
            ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.missingblobortoken', 'cybMobilePayments', null)
        };
    }
    if (!empty(jsonObj.payment)) {
        return {
            success: true,
            RequestType: 'API',
            OrderNo: jsonObj.orderID,
            PaymentData: jsonObj.payment.token.paymentData,
            order: order,
            MobilePaymentType: paymentMethod
        };
    }

    if (empty(jsonObj.networkToken) || jsonObj.networkToken.length > 20) {
        Logger.error('[MobilePaymentsHelper.js] Missing networkToken in JSON  or exceed max length 20 char');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidtoken', 'cybMobilePayments', null) };
    }
    if (empty(jsonObj.tokenExpirationDate)) {
        Logger.error('[MobilePaymentsHelper.js] Missing tokenExpirationDate in JSON');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.missingtokenexpiry', 'cybMobilePayments', null) };
    }
    if (empty(jsonObj.cardType) || !(jsonObj.cardType.equalsIgnoreCase('visa') || jsonObj.cardType.equalsIgnoreCase('mastercard') || jsonObj.cardType.equalsIgnoreCase('amex'))) {
        Logger.error('[MobilePaymentsHelper.js] Missing cardType in JSON or not a supported card type (visa, mastercard, amex)');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidcardtype', 'cybMobilePayments', null) };
    }
    if (empty(jsonObj.cryptogram)) {
        Logger.error('[MobilePaymentsHelper.js] Missing cryptogram in JSON ');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.missingcryptogram', 'cybMobilePayments', null) };
    }
    if (jsonObj.cardType.equalsIgnoreCase('mastercard') && jsonObj.cryptogram.length > 32) {
        Logger.error('[MobilePaymentsHelper.js] for mastercard cryptogram in JSON length exceeds 32 char');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidmastercardcryptogram', 'cybMobilePayments', null) };
    } else if (jsonObj.cryptogram.length > 40) {
        Logger.error('[MobilePaymentsHelper.js] Missing cryptogram in JSON or length exceeds 40 char');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidcryptogram', 'cybMobilePayments', null) };
    }
    var Calendar = require('dw/util/Calendar');
    var currentDate = Number(require('dw/util/StringUtils').formatCalendar(new Calendar(), 'YYMMdd'));
    var tokenExpirationDate;
    try {
        if (jsonObj.tokenExpirationDate.length !== 6) throw new Error('invalid tokenExpirationDate length');
        tokenExpirationDate = Number(jsonObj.tokenExpirationDate);
    } catch (ex) {
        Logger.error('[MobilePaymentsHelper.js] Invalid tokenExpirationDate, must have format YYMMDD');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.missingtokenexpiry', 'cybMobilePayments', null) };
    }
    if (Number(currentDate) > Number(tokenExpirationDate)) {
        Logger.error('[MobilePaymentsHelper.js] Card tokenExpirationDate older than current date');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.invalidjson', 'cybMobilePayments', null), ERRORMSG: Resource.msg('cyb.mobilePayment.errormsg.invalidtokenexpiry', 'cybMobilePayments', null) };
    }


    requestParam = {};
    requestParam.NetworkToken = jsonObj.networkToken;
    requestParam.TokenExpirationMonth = jsonObj.tokenExpirationDate.substr(2, 2);
    requestParam.TokenExpirationYear = jsonObj.tokenExpirationDate.substr(0, 2);
    requestParam.CardType = jsonObj.cardType;
    requestParam.Cryptogram = jsonObj.cryptogram;
    return { success: true, RequestType: 'INAPP', OrderNo: jsonObj.orderID, requestParam: requestParam, order: order, MobilePaymentType: paymentMethod };
}

/**
 * This function creates data for authorization Request like Bill to , Ship to and purchase items.
 * @param {Object}lineItemCtnr : dw.order.LineItemCtnr this can hold object of basket or Order.
 * @returns {Object} data for authorization Request like Bill to , Ship to and purchase items.
 */
function PrepareAuthRequestObjects(lineItemCtnr) {
    // **************************************************************************//
    // Check if lineItemCtnr exists
    // **************************************************************************//
    if (lineItemCtnr == null) {
        Logger.error('Please provide a order or basket!');
        return { error: true, ERRORCODE: Resource.msg('cyb.mobilePayment.errorcode.ordernotfound', 'cybMobilePayments', null) };
    }

    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    // Objects to set in the Service Request inside facade
    var billTo;
    var shipTo;
    var purchaseObject;
    var result = CommonHelper.CreateCyberSourceBillToObject(lineItemCtnr, true);
    billTo = result.billTo;
    result = CommonHelper.CreateCybersourceShipToObject(lineItemCtnr);
    shipTo = result.shipTo;
    result = CommonHelper.CreateCybersourcePurchaseTotalsObject(lineItemCtnr);
    purchaseObject = result.purchaseTotals;
    result = CommonHelper.CreateCybersourceItemObject(lineItemCtnr);
    var items = result.items;
    return { success: true, billTo: billTo, shipTo: shipTo, purchaseObject: purchaseObject, items: items };
}

function createLineItemCtnrShippingAddress(lineItemCtnrAddress : dw.order.OrderAddress, decryptedData : Object) {
	// validate the lineItemCtnrAddress exists
	if (decryptedData.shipTo === null) {
		throw new Error('Shipping Address not available in visa checkout decrypted payment data from cybersource');
	}
	
	//address line 1 and line 2
	lineItemCtnrAddress.setAddress1(decryptedData.address1);
	if (!empty(decryptedData.address2)) {
		lineItemCtnrAddress.setAddress2(decryptedData.address2);
	}
	
	//country, city, state, post code
	lineItemCtnrAddress.setCity(decryptedData.locality);
	lineItemCtnrAddress.setStateCode(decryptedData.administrativeArea);
	lineItemCtnrAddress.setPostalCode(decryptedData.postalCode);
	lineItemCtnrAddress.setCountryCode(decryptedData.countryCode);
	
	//phone number 
	if (!empty(decryptedData.phoneNumber)) {
		lineItemCtnrAddress.setPhone(decryptedData.phoneNumber);
	}
	
	//first name
	lineItemCtnrAddress.setFirstName(decryptedData.name.split(' ')[0]);
	//last name
	lineItemCtnrAddress.setLastName(decryptedData.name.split(' ')[1]);
	return {success:true, lineItemCtnrAddress:lineItemCtnrAddress};
};

/**
* Create or update basket BillingAddress Google Checkout decrypted payment data from cybersource
* @param lineItemCtnrAddress : dw.order.OrderAddress
* @param decryptedData : Object
*/
function createLineItemCtnrBillingAddress(lineItemCtnrAddress : dw.order.OrderAddress, billingInfo : Object) {
	
	//address line 1 and line 2
	lineItemCtnrAddress.setAddress1(billingInfo.address1);
	if (!empty(billingInfo.address2)) {
		lineItemCtnrAddress.setAddress2(billingInfo.address2);
	}
	
	//country, city, state, post code
	lineItemCtnrAddress.setCity(billingInfo.locality);
	if (!empty(billingInfo.administrativeArea)) {
		lineItemCtnrAddress.setStateCode(billingInfo.administrativeArea);
	}
	lineItemCtnrAddress.setPostalCode(billingInfo.postalCode);
	lineItemCtnrAddress.setCountryCode(billingInfo.countryCode);
	
	//phone number 
	if (!empty(billingInfo.phoneNumber)) {
		lineItemCtnrAddress.setPhone(billingInfo.phoneNumber);
	}
	
	//company name 
	if (!empty(billingInfo.companyName)) {
		lineItemCtnrAddress.setCompanyName(billingInfo.companyName);
	}
	
	//first name
	lineItemCtnrAddress.setFirstName(billingInfo.name.split(' ')[0]);
	//last name
	var lastName = billingInfo.name.indexOf(' ') >= 0 ? billingInfo.name.substring(billingInfo.name.indexOf(' ')) : '';
	//lineItemCtnrAddress.setLastName(billingInfo.name.split(' ')[1]);
	lineItemCtnrAddress.setLastName(lastName);
	return {success:true, lineItemCtnrAddress:lineItemCtnrAddress};
};

module.exports = {
    validateMobilePaymentRequest: validateMobilePaymentRequest,
    PrepareAuthRequestObjects: PrepareAuthRequestObjects,
    CreateLineItemCtnrShippingAddress:createLineItemCtnrShippingAddress,
    CreateLineItemCtnrBillingAddress:createLineItemCtnrBillingAddress
};
