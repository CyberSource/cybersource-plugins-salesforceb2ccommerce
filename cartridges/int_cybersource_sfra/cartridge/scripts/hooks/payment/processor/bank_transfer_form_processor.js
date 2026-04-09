'use strict';

var Resource = require('dw/web/Resource');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * Processes the payment form for Bank Transfer payments (IDL, SOF, MCH)
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @return {Object} result object with viewData and error status
 */
function processForm(req, paymentForm, viewData) {
    var server = require('server');
    var paymentMethodID = paymentForm.paymentMethod.value;
    var bankTransferFormErrors = {};

    // Bank Transfer specific form validation
    var BankTransferForm = {
        paymentMethod: paymentForm.paymentMethod,
        email: paymentForm.creditCardFields ? paymentForm.creditCardFields.email : null,
        phone: paymentForm.creditCardFields ? paymentForm.creditCardFields.phone : null
    };

    // Add bank list selection for iDEAL payments
    if (paymentMethodID === Resource.msg('paymentmethodname.idl', 'cybersource', null)) {
        BankTransferForm.bankListSelection = server.forms.getForm('billing').bankListSelection;
    }

    bankTransferFormErrors = COHelpers.validateCreditCard(BankTransferForm);

    // Remove bank list selection from paymentForm for other payment methods
    if (paymentMethodID !== Resource.msg('paymentmethodname.idl', 'cybersource', null)) {
        delete paymentForm.bankListSelection;
    }

    // Check for validation errors
    if (Object.keys(bankTransferFormErrors).length) {
        return {
            error: true,
            fieldErrors: bankTransferFormErrors,
            serverErrors: [],
            viewData: viewData
        };
    }

    // Set up viewData for Bank Transfer payment
    return setupBankTransferViewData(req, paymentForm, viewData, paymentMethodID);
}

/**
 * Sets up viewData for Bank Transfer payments
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @param {string} paymentMethodID - payment method ID
 * @return {Object} result object with populated viewData
 */
function setupBankTransferViewData(req, paymentForm, viewData, paymentMethodID) {
    var server = require('server');

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

    // Set payment information for Bank Transfer
    viewData.paymentInformation = {};

    // Add bank selection for iDEAL payments
    if (paymentMethodID === Resource.msg('paymentmethodname.idl', 'cybersource', null)) {
        var billingForm = server.forms.getForm('billing');
        if (billingForm.bankListSelection) {
            viewData.paymentInformation.bankListSelection = {
                value: billingForm.bankListSelection.value,
                htmlName: billingForm.bankListSelection.htmlName
            };
        }
    }

    return {
        error: false,
        fieldErrors: false,
        serverErrors: false,
        viewData: viewData
    };
}

/**
 * Saves payment information for Bank Transfer payments
 * @param {Object} req - request object
 * @param {Object} currentBasket - current basket
 * @param {Object} billingData - billing data
 */
function savePaymentInformation(req, currentBasket, billingData) {
}

module.exports.processForm = processForm;
module.exports.savePaymentInformation = savePaymentInformation;
