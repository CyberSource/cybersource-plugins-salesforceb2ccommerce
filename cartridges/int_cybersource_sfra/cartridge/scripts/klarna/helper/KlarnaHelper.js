'use strict';

var Transaction = require('dw/system/Transaction');
var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();

/**
 * function
 * @param {*} basket basket
 */
function setKlarnaPaymentMethod(basket) {
    var Cart = require('*/cartridge/models/cart');
    var currentCart = new Cart(basket);
    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstruments(basket);
        basket.createPaymentInstrument('KLARNA', currentCart.getNonGiftCertificateAmount);
    });
}

/**
 * function
 * @param {*} basket basket
 * @returns {*} obj
 */
function CreateKlarnaSecureKey(basket) {
    // declare variables to create signature
    var sessionId = session.sessionID;
    var paymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    var merchantId = CybersourceHelper.getMerchantID();
    var amount = basket.totalGrossPrice.value;
    var token = sessionId + paymentType + merchantId + amount;
    // call method of common helper to create a signature
    var signature = CommonHelper.signedDataUsingHMAC256(token, null, paymentType);
    // return the signature
    return signature;
}

function mapKlarnaExpressCheckoutAddress(collectedAddress) {
    var addressData = {};
    if (!collectedAddress) {
        return null;
    }
    addressData.firstName = collectedAddress.given_name || '';
    addressData.lastName = collectedAddress.family_name || '';
    addressData.address1 = collectedAddress.street_address || '';
    addressData.address2 = collectedAddress.street_address_2 || '';
    addressData.city = collectedAddress.city || '';
    addressData.postalCode = collectedAddress.postal_code || '';
    addressData.stateCode = collectedAddress.region || '';
    addressData.countryCode = { value: collectedAddress.country || '' };
    addressData.phone = collectedAddress.phone || '';
    addressData.email = collectedAddress.email || '';
    return addressData;
}

function setBillingAddress(cart, klarnaAddress, forceUpdate) {
    var Transaction = require('dw/system/Transaction');
    var billingAddress = cart.getBillingAddress();

    Transaction.wrap(function () {
        if (!billingAddress || forceUpdate) {
            billingAddress = cart.createBillingAddress();
        }

        billingAddress.setFirstName(klarnaAddress.firstName);
        billingAddress.setLastName(klarnaAddress.lastName);
        billingAddress.setAddress1(klarnaAddress.address1);
        billingAddress.setAddress2(klarnaAddress.address2);
        billingAddress.setCity(klarnaAddress.city);
        billingAddress.setPostalCode(klarnaAddress.postalCode);
        billingAddress.setStateCode(klarnaAddress.stateCode);
        billingAddress.setCountryCode(klarnaAddress.countryCode.value);
        billingAddress.setPhone(klarnaAddress.phone);

        cart.setCustomerEmail(klarnaAddress.email);
    });
}

/**
 * Converts address to object
 *
 * @param {dw.order.OrderAddress} address The Klarna or SFCC address
 * @return {Object} addressObj The converted address
 */
function convAddressObj(address) {
    var addressObj;

    if (address instanceof dw.order.OrderAddress) {
        addressObj = {
            firstName: address.firstName,
            lastName: address.lastName,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            postalCode: address.postalCode,
            stateCode: address.stateCode,
            countryCode: address.countryCode.value
        };
    } else if (address instanceof Object) {
        addressObj = address;
    }

    return addressObj;
}

/**
 * Sets a potentially large token value in session privacy by splitting it
 * across multiple session attributes to avoid the 2000-character limit.
 * @param {string} key - The base session privacy key name
 * @param {string} value - The token value to store
 */
function setLargeSessionToken(key, value) {
    var MAX_LENGTH = 2000;
    if (!value || value.length <= MAX_LENGTH) {
        session.privacy[key] = value || '';
        session.privacy[key + '_part2'] = '';
    } else {
        session.privacy[key] = value.substring(0, MAX_LENGTH);
        session.privacy[key + '_part2'] = value.substring(MAX_LENGTH);
    }
}

/**
 * Retrieves a potentially split token value from session privacy by
 * joining the parts back together.
 * @param {string} key - The base session privacy key name
 * @returns {string} The full token value
 */
function getLargeSessionToken(key) {
    var part1 = session.privacy[key] || '';
    var part2 = session.privacy[key + '_part2'] || '';
    var result = part1 + part2;
    return result || null;
}

/**
 * Deletes a potentially split token from session privacy.
 * @param {string} key - The base session privacy key name
 */
function deleteLargeSessionToken(key) {
    delete session.privacy[key];
    delete session.privacy[key + '_part2'];
}


function clearKlarnaSessionVariables() {
    delete session.privacy.KlarnaPaymentsAuthorizationToken;
    delete session.privacy.Klarna_IsExpressCheckout;
    delete session.privacy.Klarna_IsFinalizeRequired;
    deleteLargeSessionToken('klarna_client_token');
}

module.exports = {
    mapKlarnaExpressCheckoutAddress: mapKlarnaExpressCheckoutAddress,
    setBillingAddress: setBillingAddress,
    convAddressObj: convAddressObj,
    setKlarnaPaymentMethod: setKlarnaPaymentMethod,
    CreateKlarnaSecureKey: CreateKlarnaSecureKey,
    clearKlarnaSessionVariables: clearKlarnaSessionVariables,
    setLargeSessionToken: setLargeSessionToken,
    getLargeSessionToken: getLargeSessionToken,
    deleteLargeSessionToken: deleteLargeSessionToken
}
