'use strict';

/**
* This file will contain adapter methods for Visa Checkout
* Integration.
*/

/**
 * Load Visa Checkout Button via remote include where get th button settings from site preferences.
 */

var logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

var VisaCheckoutFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/facade/VisaCheckoutFacade');
var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/helper/VisaCheckoutHelper');

/**
 * Method to display Visa checkout button
 * @returns {Object} result - Settings for Button to Display
 */
function ButtonDisplay() {
    var result;
    try {
        result = VisaCheckoutFacade.ButtonDisplay();
    } catch (err) {
        logger.error('Exception while executing ButtonDisplay in VisaCheckoutAdapter.js' + err);
    }
    return result;
}

/**
 * GetButtonInitializeSettings
 * @param {Object} Basket Basket
 * @param {Object} IsDeliveryAddress IsDeliveryAddress
 * @returns {Object} result
 */
function GetButtonInitializeSettings(Basket, IsDeliveryAddress) {
    var result = VisaCheckoutHelper.GetButtonInitializeSettings(Basket, IsDeliveryAddress);
    // eslint-disable-next-line
    session.forms.visaCheckout.clearFormElement();
    return result;
}

/**
 * Update shipping details in cart object
 * @param {Object} decryptedPaymentData decryptedPaymentData
 * @return {Object} obj
 */
function UpdateShipping(decryptedPaymentData) {
    var BasketMgr = require('dw/order/BasketMgr');
    var ShippingMgr = require('dw/order/ShippingMgr');
    var basket = BasketMgr.getCurrentOrNewBasket();
    var shipment = basket.defaultShipment;
    var shippingAddress = {};
    var Transaction = require('dw/system/Transaction');

    // eslint-disable-next-line
    if (!empty(shipment.getShippingAddress())) {
        return { success: true };
    }
    try {
        // eslint-disable-next-line
        Transaction.wrap(function () {
            // Create or replace the shipping address
            shippingAddress = shipment.createShippingAddress();
            // Populate the shipping address from the visa object
            shippingAddress = VisaCheckoutHelper.CreateLineItemCtnrShippingAddress(shippingAddress, decryptedPaymentData);
            if (!shippingAddress.success) {
                return shippingAddress;
            }
            // Set shipping method to default if not already set
            if (shipment.shippingMethod === null) {
                shipment.setShippingMethod(ShippingMgr.getDefaultShippingMethod());
            }
        });
        return {
            success: true
        };
    } catch (err) {
        logger.error('[VisaCheckout.js]Error creating shipment from Visa Checkout address: {0}', err.message);
        return {
            error: true,
            errorMsg: Resource.msg('visaCheckout.shippingUpdate.prepareShipments', 'cybersource', null)
        };
    }
}

/**
 * Update billing details in cart object
 * @param {Object} Basket Basket
 * @param {Object} VisaCheckoutCallId VisaCheckoutCallId
 * @param {Object} VisaCheckoutPaymentData VisaCheckoutPaymentData
 * @return {Object} result
 */
function UpdateBilling(Basket, VisaCheckoutCallId, VisaCheckoutPaymentData) {
    var result = {};
    var PaymentInstrumentUtils = require('*/cartridge/scripts/utils/PaymentInstrumentUtils');

    try {
        // Retrieve the inputs
        // eslint-disable-next-line
        if (!empty(Basket) && !empty(VisaCheckoutPaymentData.MerchantReferenceCode) && Basket.getUUID().equals(VisaCheckoutPaymentData.MerchantReferenceCode)) {
            PaymentInstrumentUtils.UpdatePaymentInstrumentVisaDecrypt(Basket, VisaCheckoutPaymentData, VisaCheckoutCallId);
            result.success = true;
        } else {
            logger.error('Error creating Visa Checkout MerchantReferenceCode not match with BasketUUID');
            result.error = true;
        }
    } catch (err) {
        logger.error('Error creating Visa Checkout payment instrument: {0}', err.message);
        result.error = true;
    }

    return result;
}

/**
 * Determines if the cart already contains payment instruments of the given payment method and removes them
 * from the basket.
 *
 * @transactional
 * @alias module:models/CartModel~CartModel/removeExistingPaymentInstruments
 * @param {Object} basket basket
 * @param {Object} method - Name of the payment method.
 */
function removeExistingPaymentInstruments(basket, method) {
    var iter = basket.getPaymentInstruments(method).iterator();

    // Remove payment instruments.
    while (iter.hasNext()) {
        basket.removePaymentInstrument(iter.next());
    }
}

/**
 * DecryptPayload
 * @returns {Object} result
 */
function DecryptPayload() {
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var Site = require('dw/system/Site');
    var Transaction = require('dw/system/Transaction');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var BasketMgr = require('dw/order/BasketMgr');
    var result = {};

    try {
        if (PaymentMgr.getPaymentMethod(Resource.msg('paymentmethodname.visacheckout', 'cybersource', null))?PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT).isActive():false) {
            var basket = BasketMgr.getCurrentOrNewBasket();
            var decryptedPaymentData = {};
            /* eslint-disable */
            var callId = session.forms.visaCheckout.callId.htmlValue;
            var encryptedPaymentWrappedKey = session.forms.visaCheckout.encryptedPaymentWrappedKey.value;
            var encryptedPaymentData = session.forms.visaCheckout.encryptedPaymentData.value;
            var basketUUID = session.forms.visaCheckout.basketUUID.value;
            var signature = CommonHelper.signedDataUsingHMAC256(basket.getUUID(), Site.getCurrent().getCustomPreferenceValue('cybVisaSecretKey'));
            /* eslint-enable */

            // eslint-disable-next-line
            if (!empty(basket && basketUUID && encryptedPaymentData && encryptedPaymentWrappedKey && callId) && (basketUUID === signature)) {
                Transaction.wrap(function () {
                    CommonHelper.removeExistingPaymentInstruments(basket);
                    removeExistingPaymentInstruments(basket, CybersourceConstants.METHOD_VISA_CHECKOUT);
                });
                result = VisaCheckoutFacade.VCDecryptRequest(basket.getUUID(), encryptedPaymentWrappedKey, encryptedPaymentData, callId);
                if (result.success && result.serviceResponse.ReasonCode === 100) {
                    decryptedPaymentData = result.serviceResponse;

                    // eslint-disable-next-line
                    if (!empty(basket) && !empty(decryptedPaymentData.MerchantReferenceCode) && basket.getUUID().equals(decryptedPaymentData.MerchantReferenceCode)) {
                        result = UpdateBilling(basket, callId, decryptedPaymentData);
                        if (decryptedPaymentData.shipTo == null && decryptedPaymentData.billTo != null) {
                            // If shipTo is empty, use billing address as shipping address
                            decryptedPaymentData.shipTo_Address1 = decryptedPaymentData.billTo_Address1;
                            decryptedPaymentData.shipTo_Address2 = decryptedPaymentData.billTo_Address2;
                            decryptedPaymentData.shipTo_City = decryptedPaymentData.billTo_City;
                            decryptedPaymentData.shipTo_StateCode = decryptedPaymentData.billTo_StateCode;
                            decryptedPaymentData.shipTo_County = decryptedPaymentData.billTo_County;
                            decryptedPaymentData.shipTo_PostalCode = decryptedPaymentData.billTo_PostalCode;
                            decryptedPaymentData.shipTo_CountryCode = decryptedPaymentData.billTo_CountryCode;
                            decryptedPaymentData.shipTo_Company = decryptedPaymentData.billTo_Company;
                            decryptedPaymentData.shipTo_Phone = decryptedPaymentData.billTo_Phone;
                            decryptedPaymentData.shipTo_Email = decryptedPaymentData.billTo_Email;
                            decryptedPaymentData.shipTo_FirstName = decryptedPaymentData.billTo_FirstName;
                            decryptedPaymentData.shipTo_LastName = decryptedPaymentData.billTo_LastName;
                            decryptedPaymentData.shipTo = decryptedPaymentData.billTo;
                        }
                        result.decryptedPaymentData = decryptedPaymentData;
                        result.basket = basket;
                    } else {
                        logger.error('Error while calling billing update method in decrypt payload in visacheckout adaptor');
                    }
                } else {
                    logger.error('error result in VCDecryptRequest');
                }
            } else {
                // if basket/basketUUID/encryptedPaymentData/encryptedPaymentWrappedKey/callId is empty
                // or basketUUID not equal to signature
                logger.error('basket/basketUUID/encryptedPaymentData/encryptedPaymentWrappedKey/callId is empty or basketUUID not equal to signature');
                result.error = true;
            }
        } else {
            // if payment method not Visa
            logger.error('payment method not Visa');
            result.error = true;
        }
    } catch (err) {
        logger.error('Error while executing DecryptpayLoad in VisaCheckoutAdapter', err.message);
    }
    return result;
}

module.exports = {
    ButtonDisplay: ButtonDisplay,
    GetButtonInitializeSettings: GetButtonInitializeSettings,
    DecryptPayload: DecryptPayload,
    UpdateBilling: UpdateBilling,
    UpdateShipping: UpdateShipping
};
