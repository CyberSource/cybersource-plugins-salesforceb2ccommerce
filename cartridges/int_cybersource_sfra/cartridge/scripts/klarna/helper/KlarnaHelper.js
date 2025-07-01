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

function clearKlarnaSessionVariables() {
    delete session.privacy.KlarnaPaymentsAuthorizationToken;
    delete session.privacy.Klarna_IsExpressCheckout;
    delete session.privacy.Klarna_IsFinalizeRequired;
    delete session.privacy.klarna_client_token;
}

module.exports = {
    mapKlarnaExpressCheckoutAddress: mapKlarnaExpressCheckoutAddress,
    setBillingAddress: setBillingAddress,
    convAddressObj: convAddressObj,
    setKlarnaPaymentMethod: setKlarnaPaymentMethod,
    CreateKlarnaSecureKey: CreateKlarnaSecureKey,
    clearKlarnaSessionVariables: clearKlarnaSessionVariables
}