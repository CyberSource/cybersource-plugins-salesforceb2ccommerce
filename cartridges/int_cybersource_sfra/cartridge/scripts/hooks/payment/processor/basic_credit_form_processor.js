'use strict';

var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * Processes the payment form for Cybersource payments
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @return {Object} result object with viewData and error status
 */
function processForm(req, paymentForm, viewData) {
    var paymentMethodID = paymentForm.paymentMethod.value;
    var logger = require('dw/system/Logger');
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var errors = [];
    var fieldErrors = {};
    var billingFormErrors = {};
    var creditCardErrors = {};

    // Flex response handling
    if (CsSAType == Resource.msg('cssatype.SA_FLEX', 'cybersource', null) && !req.form.storedPaymentUUID) {
        if (paymentForm.creditCardFields.flexresponse.value) {
            var flexResponse = paymentForm.creditCardFields.flexresponse.value;
        } else {
            logger.info('Flex response has no value when submitting payment');
        }
    }

    // Step 1: Billing form validation (same as base cartridge)
    billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);

    // Step 2: Handle PayPal billing fields cleanup
    if ('paypalBillingFields' in paymentForm) {
        delete paymentForm.paypalBillingFields;
    }

    // Step 3: Cybersource-specific validation logic
    if (!req.form.storedPaymentUUID) {
        if (paymentMethodID == Resource.msg('paymentmethodname.creditcard', 'cybersource', null) &&
            (CsSAType == null || CsSAType == Resource.msg('cssatype.SA_SILENTPOST', 'cybersource', null))) {
            // Validate standard credit card form
            creditCardErrors = COHelpers.validateCreditCard(paymentForm);
        }
        else if (needsSecureAcceptanceValidation(paymentMethodID, CsSAType)) {
            // Create SA form for validation
            var SAForm = createSecureAcceptanceForm(paymentForm);
            creditCardErrors = COHelpers.validateCreditCard(SAForm);
        }
        else if (isBankTransferPayment(paymentMethodID)) {
            // Use stored bank transfer form from session
            var BankTransferForm = getBankTransferFormFromSession(paymentForm, paymentMethodID);
            creditCardErrors = COHelpers.validateCreditCard(BankTransferForm);
        } else {
            delete paymentForm.bankListSelection;
        }
    }

    // Step 4: Check for validation errors
    if (Object.keys(creditCardErrors).length || Object.keys(billingFormErrors).length) {
        // Combine all field errors
        var combinedFieldErrors = {};
        Object.assign(combinedFieldErrors, billingFormErrors);
        Object.assign(combinedFieldErrors, creditCardErrors);

        return {
            error: true,
            fieldErrors: combinedFieldErrors,
            serverErrors: [],
            viewData: viewData
        };
    }

    // Step 5: If validation passes, set up viewData (continue in next step)
    return setupViewDataForCybersource(req, paymentForm, viewData, paymentMethodID, CsSAType);
}

/**
 * Helper function to check if payment method needs Secure Acceptance validation
 * @param {string} paymentMethodID - payment method ID
 * @param {string} CsSAType - Cybersource SA type
 * @return {boolean} true if needs SA validation
 */
function needsSecureAcceptanceValidation(paymentMethodID, CsSAType) {
    var Resource = require('dw/web/Resource');

    return ((paymentMethodID == Resource.msg('paymentmethodname.creditcard', 'cybersource', null) &&
        (CsSAType == Resource.msg('cssatype.SA_REDIRECT', 'cybersource', null) ||
            CsSAType == Resource.msg('cssatype.SA_IFRAME', 'cybersource', null))) ||
        paymentMethodID == Resource.msg('paymentmethodname.alipay', 'cybersource', null) ||
        paymentMethodID == Resource.msg('paymentmethodname.wechat', 'cybersource', null));
}

/**
 * Helper function to create Secure Acceptance form for validation
 * @param {Object} paymentForm - payment form
 * @return {Object} SA form object
 */
function createSecureAcceptanceForm(paymentForm) {
    var SAForm = {};
    SAForm.paymentMethod = paymentForm.paymentMethod;
    SAForm.email = paymentForm.creditCardFields.email;
    SAForm.phone = paymentForm.creditCardFields.phone;
    return SAForm;
}

/**
 * Helper function to check if payment method is bank transfer
 * @param {string} paymentMethodID - payment method ID
 * @return {boolean} true if bank transfer payment
 */
function isBankTransferPayment(paymentMethodID) {
    var Resource = require('dw/web/Resource');

    return (paymentMethodID == Resource.msg('paymentmethodname.idl', 'cybersource', null) ||
        paymentMethodID == Resource.msg('paymentmethodname.sof', 'cybersource', null) ||
        paymentMethodID == Resource.msg('paymentmethodname.mch', 'cybersource', null));
}

/**
 * Helper function to get bank transfer form from session/form data
 * @param {Object} paymentForm - payment form
 * @param {string} paymentMethodID - payment method ID
 * @return {Object} bank transfer form object
 */
function getBankTransferFormFromSession(paymentForm, paymentMethodID) {
    var Resource = require('dw/web/Resource');
    var server = require('server');

    var BankTransferForm = {};

    if (paymentMethodID == Resource.msg('paymentmethodname.idl', 'cybersource', null)) {
        BankTransferForm.bankListSelection = server.forms.getForm('billing').bankListSelection;
    }

    BankTransferForm.paymentMethod = paymentForm.paymentMethod;
    BankTransferForm.email = paymentForm.creditCardFields.email;
    BankTransferForm.phone = paymentForm.creditCardFields.phone;

    return BankTransferForm;
}

/**
 * Sets up viewData for Cybersource payment methods when validation passes
 * @param {Object} req - request object
 * @param {Object} paymentForm - payment form
 * @param {Object} viewData - view data object
 * @param {string} paymentMethodID - payment method ID
 * @param {string} CsSAType - Cybersource SA type
 * @return {Object} result object with populated viewData
 */
function setupViewDataForCybersource(req, paymentForm, viewData, paymentMethodID, CsSAType) {
    var Resource = require('dw/web/Resource');

    // Configure payment method information
    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    // Handle Cybersource-specific email and phone from creditCardFields
    viewData.email = {
        value: paymentForm.creditCardFields.email.value
    };

    viewData.phone = {
        value: paymentForm.creditCardFields.phone.value
    };

    // IMPORTANT: Set paymentInformation object for the payment processor hook
    viewData.paymentInformation = {};

    // Configure payment information for credit card methods
    if (paymentMethodID == Resource.msg('paymentmethodname.creditcard', 'cybersource', null)) {
        viewData.paymentInformation = buildCreditCardPaymentInfo(paymentForm);
    } else {
        // For non-credit card methods, still set basic payment info
        viewData.paymentInformation = {
            paymentMethod: {
                value: paymentForm.paymentMethod.value,
                htmlName: paymentForm.paymentMethod.value
            }
        };
    }

    // Handle stored payment UUID in paymentInformation
    if (req.form.storedPaymentUUID) {
        viewData.storedPaymentUUID = req.form.storedPaymentUUID;
        viewData.paymentInformation.storedPaymentUUID = req.form.storedPaymentUUID;
    }

    // Handle save card checkbox
    viewData.saveCard = paymentForm.creditCardFields.saveCard.checked;
    viewData.paymentInformation.saveCard = paymentForm.creditCardFields.saveCard.checked;

    // Add Cybersource-specific fields to paymentInformation
    if (session.privacy.flexResponse) {
        viewData.paymentInformation.flexResponse = session.privacy.flexResponse;
    }

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
 * Creates payment information structure for Cybersource credit card processing
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
 * Saves payment information for Cybersource payments
 * @param {Object} req - request object
 * @param {Object} currentBasket - current basket
 * @param {Object} billingData - billing data
 */
function savePaymentInformation(req, currentBasket, billingData) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var Resource = require('dw/web/Resource');
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var paymentMethodID = billingData.paymentMethod.value;

    // Handle Cybersource-specific phone/email logic
    if (currentBasket && currentBasket.billingAddress) {
        Transaction.wrap(function () {
            if (billingData.storedPaymentUUID) {
                currentBasket.billingAddress.setPhone(req.currentCustomer.profile.phone);
                currentBasket.setCustomerEmail(req.currentCustomer.profile.email);
            } else if (currentBasket.customerEmail && paymentMethodID == Resource.msg('paymentmethodname.klarna', 'cybersource', null)) {
                currentBasket.billingAddress.setPhone(billingData.phone.value);
            } else {
                currentBasket.billingAddress.setPhone(billingData.phone.value);
                currentBasket.setCustomerEmail(billingData.email.value);
            }
        });
    }
    // Handle Cybersource-specific card saving logic
    if (shouldSaveCard(req, billingData, paymentMethodID, CsSAType)) {
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
 * @param {string} paymentMethodID - payment method ID
 * @param {string} CsSAType - Cybersource SA type
 * @return {boolean} true if card should be saved
 */
function shouldSaveCard(req, billingData, paymentMethodID, CsSAType) {
    var Resource = require('dw/web/Resource');

    return !billingData.storedPaymentUUID &&
        req.currentCustomer.raw.authenticated &&
        req.currentCustomer.raw.registered &&
        billingData.saveCard &&
        (paymentMethodID === 'CREDIT_CARD') &&
        (CsSAType == null || CsSAType.equals(Resource.msg('cssatype.SA_FLEX', 'cybersource', null)));
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

// Export the main functions
module.exports.processForm = processForm;
module.exports.savePaymentInformation = savePaymentInformation;