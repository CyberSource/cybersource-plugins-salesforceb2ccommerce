'use strict';

var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * Processes the payment form for Cybersource Credit Card payments
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @return {Object} result object with viewData and error status
 */
function processForm(req, paymentForm, viewData) {
    var logger = require('dw/system/Logger');
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var creditCardErrors = {};

    // Flex response handling for credit cards
    if (CsSAType === Resource.msg('cssatype.SA_FLEX', 'cybersource', null) && !req.form.storedPaymentUUID) {
        if (paymentForm.creditCardFields.flexresponse.value) {
            // Store flex response for later processing if needed
            var flexResponse = paymentForm.creditCardFields.flexresponse.value;
        } else {
            logger.info('Flex response has no value when submitting payment');
        }
    }

    // Handle PayPal billing fields cleanup if present
    if ('paypalBillingFields' in paymentForm) {
        delete paymentForm.paypalBillingFields;
    }

    // Credit card specific validation
    if (!req.form.storedPaymentUUID) {
        if (CsSAType == null || CsSAType === Resource.msg('cssatype.SA_SILENTPOST', 'cybersource', null)) {
            // Validate standard credit card form
            creditCardErrors = COHelpers.validateCreditCard(paymentForm);
        } else if (CsSAType === Resource.msg('cssatype.SA_REDIRECT', 'cybersource', null) ||
            CsSAType === Resource.msg('cssatype.SA_IFRAME', 'cybersource', null)) {
            // Create SA form for validation
            var SAForm = {
                paymentMethod: paymentForm.paymentMethod,
                email: paymentForm.creditCardFields.email,
                phone: paymentForm.creditCardFields.phone
            };
            creditCardErrors = COHelpers.validateCreditCard(SAForm);
        }
    }

    // Check for validation errors
    if (Object.keys(creditCardErrors).length) {
        return {
            error: true,
            fieldErrors: creditCardErrors,
            serverErrors: [],
            viewData: viewData
        };
    }

    // Set up viewData for credit card payment
    return setupCreditCardViewData(req, paymentForm, viewData, CsSAType);
}

/**
 * Sets up viewData for credit card payments
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @param {string} CsSAType - Cybersource SA type
 * @return {Object} result object with populated viewData
 */
function setupCreditCardViewData(req, paymentForm, viewData, CsSAType) {
    // Configure payment method information
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    // Handle email and phone from creditCardFields
    viewData.email = {
        value: paymentForm.creditCardFields.email.value
    };

    viewData.phone = {
        value: paymentForm.creditCardFields.phone.value
    };

    // Build credit card payment information
    viewData.paymentInformation = buildCreditCardPaymentInfo(paymentForm);

    // Handle stored payment UUID
    if (req.form.storedPaymentUUID) {
        viewData.storedPaymentUUID = req.form.storedPaymentUUID;
        viewData.paymentInformation.storedPaymentUUID = req.form.storedPaymentUUID;
    }

    // Handle save card checkbox
    viewData.saveCard = paymentForm.creditCardFields.saveCard.checked;
    viewData.paymentInformation.saveCard = paymentForm.creditCardFields.saveCard.checked;

    // Add credit card token if available
    if (paymentForm.creditCardFields.creditCardToken && paymentForm.creditCardFields.creditCardToken.value) {
        viewData.paymentInformation.creditCardToken = paymentForm.creditCardFields.creditCardToken.value;
    }

    return {
        error: false,
        fieldErrors: false,
        serverErrors: false,
        viewData: viewData
    };
}

/**
 * Creates payment information structure for credit card processing
 * @param {Object} paymentForm - the payment form object
 * @return {Object} structured payment information
 */
function buildCreditCardPaymentInfo(paymentForm) {
    var cardFields = paymentForm.creditCardFields;

    var paymentInfo = {
        cardType: {
            value: cardFields.cardType.value,
            htmlName: cardFields.cardType.htmlName
        },
        cardNumber: {
            value: cardFields.cardNumber.value,
            htmlName: cardFields.cardNumber.htmlName
        },
        securityCode: {
            value: cardFields.securityCode.value,
            htmlName: cardFields.securityCode.htmlName
        },
        paymentMethod: {
            value: paymentForm.paymentMethod.value,
            htmlName: paymentForm.paymentMethod.htmlName
        }
    };

    // Handle expiration month conversion
    var monthValue = cardFields.expirationMonth.selectedOption;
    paymentInfo.expirationMonth = {
        value: parseInt(monthValue, 10),
        htmlName: cardFields.expirationMonth.htmlName
    };

    // Handle expiration year conversion
    var yearValue = cardFields.expirationYear.value;
    paymentInfo.expirationYear = {
        value: parseInt(yearValue, 10),
        htmlName: cardFields.expirationYear.htmlName
    };

    return paymentInfo;
}

/**
 * Saves payment information for credit card payments
 * @param {Object} req - request object
 * @param {Object} currentBasket - current basket
 * @param {Object} billingData - billing data
 */
function savePaymentInformation(req, currentBasket, billingData) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;

    // Handle phone/email for credit card
    if (currentBasket && currentBasket.billingAddress) {
        Transaction.wrap(function () {
            if (billingData.storedPaymentUUID) {
                currentBasket.billingAddress.setPhone(req.currentCustomer.profile.phone);
                currentBasket.setCustomerEmail(req.currentCustomer.profile.email);
            } else {
                currentBasket.billingAddress.setPhone(billingData.phone.value);
                currentBasket.setCustomerEmail(billingData.email.value);
            }
        });
    }

    // Handle card saving logic for credit cards
    if (shouldSaveCard(req, billingData, CsSAType)) {
        var customer = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo);
        var saveCardResult = COHelpers.savePaymentInstrumentToWallet(billingData, currentBasket, customer);

        if (saveCardResult) {
            updateCustomerWallet(req, saveCardResult);
        }
    }
}

/**
 * Helper function to determine if card should be saved
 * @param {Object} req - request object
 * @param {Object} billingData - billing data
 * @param {string} CsSAType - Cybersource SA type
 * @return {boolean} true if card should be saved
 */
function shouldSaveCard(req, billingData, CsSAType) {
    return !billingData.storedPaymentUUID &&
        req.currentCustomer.raw.authenticated &&
        req.currentCustomer.raw.registered &&
        billingData.saveCard &&
        (CsSAType == null || CsSAType === Resource.msg('cssatype.SA_FLEX', 'cybersource', null));
}

/**
 * Helper function to update customer wallet
 * @param {Object} req - request object
 * @param {Object} saveCardResult - save card result
 */
function updateCustomerWallet(req, saveCardResult) {
    req.currentCustomer.wallet.paymentInstruments.push({
        creditCardHolder: saveCardResult.creditCardHolder,
        maskedCreditCardNumber: saveCardResult.maskedCreditCardNumber,
        creditCardType: saveCardResult.creditCardType,
        creditCardExpirationMonth: saveCardResult.creditCardExpirationMonth,
        creditCardExpirationYear: saveCardResult.creditCardExpirationYear,
        UUID: saveCardResult.UUID,
        creditCardNumber: Object.hasOwnProperty.call(saveCardResult, 'creditCardNumber') ? saveCardResult.creditCardNumber : null,
        raw: saveCardResult
    });
}

module.exports.processForm = processForm;
module.exports.savePaymentInformation = savePaymentInformation;
