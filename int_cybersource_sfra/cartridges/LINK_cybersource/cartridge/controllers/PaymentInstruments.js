'use strict';
var page = module.superModule;
var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
server.extend(page);
/**
 * Checks if a credit card is valid or not
 * @param {Object} card - plain object with card details
 * @param {Object} form - form object
 * @returns {boolean} a boolean representing card validation
 */


function verifyCard(card, form) {
    var collections = require('*/cartridge/scripts/util/collections');
    var Resource = require('dw/web/Resource');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');

    var paymentCard = PaymentMgr.getPaymentCard(card.cardType);
    var error = false;
    var cardNumber = card.cardNumber;
    var creditCardStatus;
    var formCardNumber = form.cardNumber;

    if (paymentCard) {
        creditCardStatus = paymentCard.verify(
            card.expirationMonth,
            card.expirationYear,
            cardNumber
        );
    } else {
        formCardNumber.valid = false;
        formCardNumber.error =
            Resource.msg('error.message.creditnumber.invalid', 'forms', null);
        error = true;
    }

    if (creditCardStatus && creditCardStatus.error) {
        collections.forEach(creditCardStatus.items, function (item) {
            switch (item.code) {
                case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                    formCardNumber.valid = false;
                    formCardNumber.error =
                        Resource.msg('error.message.creditnumber.invalid', 'forms', null);
                    error = true;
                    break;

                case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                    var expirationMonth = form.expirationMonth;
                    var expirationYear = form.expirationYear;
                    expirationMonth.valid = false;
                    expirationMonth.error =
                        Resource.msg('error.message.creditexpiration.expired', 'forms', null);
                    expirationYear.valid = false;
                    error = true;
                    break;
                default:
                    error = true;
            }
        });
    }
    return error;
}


/**
 * Creates an object from form values
 * @param {Object} paymentForm - form object
 * @returns {Object} a plain object of payment instrument
 */
function getDetailsObject(paymentForm) {
    return {
        name: paymentForm.cardOwner.value,
        cardNumber: paymentForm.cardNumber.value,
        cardType: paymentForm.cardType.value,
        expirationMonth: paymentForm.expirationMonth.value,
        expirationYear: paymentForm.expirationYear.value,
        paymentForm: paymentForm
    };
}


/**
 * Saves a  customer credit card payment instrument.
 * @param {Object} params
 * @param {dw.customer.CustomerPaymentInstrument} params.PaymentInstrument - credit card object.
 * @param {dw.web.FormGroup} params.CreditCardFormFields - new credit card form.
 */
function savePaymentInstrument(params) {
    var paymentInstrument = params.PaymentInstrument;
    var creditCardFields = params.CreditCardFields;
    paymentInstrument.setCreditCardHolder(creditCardFields.name);
    paymentInstrument.setCreditCardNumber(creditCardFields.cardNumber);
    paymentInstrument.setCreditCardType(creditCardFields.cardType);
    paymentInstrument.setCreditCardExpirationMonth(creditCardFields.expirationMonth);
    paymentInstrument.setCreditCardExpirationYear(creditCardFields.expirationYear);
}

server.replace('List', userLoggedIn.validateLoggedIn, consentTracking.consent, function (req, res, next) {
    var subscriptionError = null;
    var URLUtils = require('dw/web/URLUtils');
    var Resource = require('dw/web/Resource');
    var AccountModel = require('*/cartridge/models/account');
    var enableTokenization: String = dw.system.Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable").value;
    if (enableTokenization.equals('YES')) {
        var wallet = customer.getProfile().getWallet();
        var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
        if (('SubscriptionError' in session.custom) && !empty(session.custom.SubscriptionError)) {
            subscriptionError = session.custom.SubscriptionError;
            session.custom.SubscriptionError = null;
        }
        var migrateCard = require('*/cartridge/scripts/helper/migrateOldCardToken');
        migrateCard.MigrateOldCardToken(paymentInstruments);
    }
    res.render('account/payment/payment', {
        paymentInstruments: AccountModel.getCustomerPaymentInstruments(
            req.currentCustomer.wallet.paymentInstruments
        ),
        SubscriptionError: subscriptionError,
        actionUrl: URLUtils.url('PaymentInstruments-DeletePayment').toString(),
        breadcrumbs: [
            {
                htmlValue: Resource.msg('global.home', 'common', null),
                url: URLUtils.home().toString()
            },
            {
                htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                url: URLUtils.url('Account-Show').toString()
            }
        ]
    });
    next();
});

server.replace('SavePayment', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var formErrors = require('*/cartridge/scripts/formErrors');
    var HookMgr = require('dw/system/HookMgr');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var dwOrderPaymentInstrument = require('dw/order/PaymentInstrument');
    var verifyDuplicates = false;
    var tokenizationResult = { subscriptionID: "", error: "" };

    var paymentForm = server.forms.getForm('creditCard');
    var result = getDetailsObject(paymentForm);

    if (paymentForm.valid && !verifyCard(result, paymentForm)) {
        res.setViewData(result);
        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var URLUtils = require('dw/web/URLUtils');
            var CustomerMgr = require('dw/customer/CustomerMgr');
            var Transaction = require('dw/system/Transaction');

            var formInfo = res.getViewData();
            var customer = CustomerMgr.getCustomerByCustomerNumber(
                req.currentCustomer.profile.customerNo
            );

            var processor = PaymentMgr.getPaymentMethod(dwOrderPaymentInstrument.METHOD_CREDIT_CARD).getPaymentProcessor();
            var enableTokenization: String = dw.system.Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable").value;
            if (enableTokenization.equals('YES') && HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
                verifyDuplicates = true;
                tokenizationResult = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(), 'CreatePaymentToken', 'account');
            }

            if (!tokenizationResult.error) {
                var wallet = customer.getProfile().getWallet();
                var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
                Transaction.begin();
                var paymentInstrument = wallet.createPaymentInstrument(dwOrderPaymentInstrument.METHOD_CREDIT_CARD);
                savePaymentInstrument({ PaymentInstrument: paymentInstrument, CreditCardFields: formInfo });

                if (!empty(tokenizationResult.subscriptionID)) {
                	paymentInstrument.custom.isCSToken = true;
                    paymentInstrument.setCreditCardToken(tokenizationResult.subscriptionID);
                }
                if (verifyDuplicates) {
                    var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
                    PaymentInstrumentUtils.removeDuplicates({ PaymentInstruments: paymentInstruments, CreditCardFields: formInfo });
                }
                Transaction.commit();
                res.json({
                    success: true,
                    redirectUrl: URLUtils.url('PaymentInstruments-List').toString()
                });
            } else {
                res.json({
                    success: false,
                    message: tokenizationResult.subscriptionError,
                    fields: formErrors.getFormErrors(paymentForm)
                });
            }
        });
    } else {
        res.json({
            success: false,
            fields: formErrors.getFormErrors(paymentForm)
        });
    }
    return next();
});

server.replace('DeletePayment', userLoggedIn.validateLoggedInAjax, function (req, res, next) {
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
    var array = require(CybersourceConstants.SFRA_CORE + '/cartridge/scripts/util/array');
    var subscriptionError;
    var data = res.getViewData();
    if (data && !data.loggedin) {
        res.json();
        return next();
    }

    var UUID = req.querystring.UUID;
    var subscriptionID;
    var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
    var paymentToDelete = array.find(paymentInstruments, function (item) {
        return UUID === item.UUID;
    });
    res.setViewData(paymentToDelete);
    this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Transaction = require('dw/system/Transaction');
        var Resource = require('dw/web/Resource');
        var payment = res.getViewData();
        var customer = CustomerMgr.getCustomerByCustomerNumber(
            req.currentCustomer.profile.customerNo
        );
        var wallet = customer.getProfile().getWallet();
        var enableTokenization: String = dw.system.Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable").value;
        if (!empty(paymentToDelete)) {
            subscriptionID = paymentToDelete.raw.creditCardToken;
        }
        //  Will make delete token call even if tokenization has been turned off since card was saved.
        if (!empty(paymentToDelete) && (enableTokenization.equals('YES') || !empty(subscriptionID))) {
            //  If a card was saved while tokenization was disabled it will not have a token.  No need to make delete call.
            if (!empty(subscriptionID) && 'custom' in paymentToDelete.raw && 'isCSToken' in paymentToDelete.raw.custom
        			&& paymentToDelete.raw.custom.isCSToken) {
                var Cybersource_Subscription = require('*/cartridge/scripts/Cybersource')
                var deleteSubscriptionBillingResult = Cybersource_Subscription.DeleteSubscriptionAccount(subscriptionID);
                if (deleteSubscriptionBillingResult.error) {
                    subscriptionError = deleteSubscriptionBillingResult.reasonCode + "-" + deleteSubscriptionBillingResult.decision;
                    session.custom.SubscriptionError = subscriptionError;
                }
            }
        }

        if (empty(subscriptionError)) {
            Transaction.wrap(function () {
                wallet.removePaymentInstrument(payment.raw);
            });
        }
        if (wallet.getPaymentInstruments().length === 0) {
            res.json({
                UUID: UUID,
                message: Resource.msg('msg.no.saved.payments', 'payment', null)
            });
        } else if (!empty(subscriptionError)) {
            res.json({
                UUID: UUID,
                message: subscriptionError
            });
        }
        else {
            res.json({ UUID: UUID });
        }
    });
    return next();
});

module.exports = server.exports();
