'use strict';

/**
 * Processes the payment form for Klarna Credit payments
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @return {Object} result object with viewData and error status
 */
function processForm(req, paymentForm, viewData) {
    // Configure payment method information
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    // Set basic payment information for Klarna
    // viewData.paymentInformation = {};

    return {
        error: false,
        fieldErrors: false,
        serverErrors: false,
        viewData: viewData
    };
}

/**
 * Saves payment information for Klarna payments
 * No additional processing needed for Klarna
 * @param {Object} req - request object
 * @param {Object} currentBasket - current basket
 * @param {Object} billingData - billing data
 */
function savePaymentInformation(req, currentBasket, billingData) {
    // Klarna doesn't require additional payment information saving
    // Email and phone are handled by the base checkout flow
}

module.exports.processForm = processForm;
module.exports.savePaymentInformation = savePaymentInformation;
