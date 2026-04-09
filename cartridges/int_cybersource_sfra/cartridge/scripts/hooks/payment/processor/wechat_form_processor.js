'use strict';

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * Processes the payment form for Cybersource WeChat payments
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @return {Object} result object with viewData and error status
 */
function processForm(req, paymentForm, viewData) {
    var wechatFormErrors = {};

    // WeChat-specific form validation (uses SA-style form with email/phone)
    var SAForm = {
        paymentMethod: paymentForm.paymentMethod,
        email: paymentForm.creditCardFields ? paymentForm.creditCardFields.email : null,
        phone: paymentForm.creditCardFields ? paymentForm.creditCardFields.phone : null
    };
    wechatFormErrors = COHelpers.validateCreditCard(SAForm);

    // Check for validation errors
    if (Object.keys(wechatFormErrors).length) {
        return {
            error: true,
            fieldErrors: wechatFormErrors,
            serverErrors: [],
            viewData: viewData
        };
    }

    // Set up viewData for WeChat payment
    return setupWechatViewData(req, paymentForm, viewData);
}

/**
 * Sets up viewData for WeChat payments
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @return {Object} result object with populated viewData
 */
function setupWechatViewData(req, paymentForm, viewData) {
    // Configure payment method information
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    // Handle email and phone from creditCardFields
    if (paymentForm.creditCardFields && paymentForm.creditCardFields.email) {
        viewData.email = {
            value: paymentForm.creditCardFields.email.value
        };
    }

    if (paymentForm.creditCardFields && paymentForm.creditCardFields.phone) {
        viewData.phone = {
            value: paymentForm.creditCardFields.phone.value
        };
    }

    // Set payment information for WeChat
    // viewData.paymentInformation = {};

    return {
        error: false,
        fieldErrors: false,
        serverErrors: false,
        viewData: viewData
    };
}

/**
 * Saves payment information for WeChat payments
 * @param {Object} req - request object
 * @param {Object} currentBasket - current basket
 * @param {Object} billingData - billing data
 */
function savePaymentInformation(req, currentBasket, billingData) {
}

module.exports.processForm = processForm;
module.exports.savePaymentInformation = savePaymentInformation;
