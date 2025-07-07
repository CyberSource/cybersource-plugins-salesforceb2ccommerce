/* eslint-disable */
'use strict';

var page = module.superModule;
var server = require('server');

var Site = require('dw/system/Site');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

var IsCartridgeEnabled = Site.getCurrent().getCustomPreferenceValue('IsCartridgeEnabled');

var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
var PaymentInstrumentUtils = require('*/cartridge/scripts/utils/PaymentInstrumentUtils');
server.extend(page);

if (IsCartridgeEnabled) {
    server.append('List', userLoggedIn.validateLoggedIn, consentTracking.consent, function (req, res, next) {
        var subscriptionError = null;
        var URLUtils = require('dw/web/URLUtils');
        var Resource = require('dw/web/Resource');
        var AccountModel = require('*/cartridge/models/account');
        var enableTokenization = dw.system.Site.getCurrent().getCustomPreferenceValue('CsTokenizationEnable').value;
        if (enableTokenization.equals('YES')) {
            var wallet = customer.getProfile().getWallet();
            var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            if (('SubscriptionError' in session.privacy) && !empty(session.privacy.SubscriptionError)) {
                subscriptionError = session.privacy.SubscriptionError;
                session.privacy.SubscriptionError = null;
            }
            var migrateCard = require('*/cartridge/scripts/helper/migrateOldCardToken');
            migrateCard.MigrateOldCardToken(paymentInstruments);
        }
        res.CONTENT_SECURITY_POLICY = "default-src 'self'";
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

    server.append('SavePayment', csrfProtection.validateAjaxRequest, function (req, res, next) {
        var formErrors = require('*/cartridge/scripts/formErrors');
        var HookMgr = require('dw/system/HookMgr');
        var PaymentMgr = require('dw/order/PaymentMgr');
        var dwOrderPaymentInstrument = require('dw/order/PaymentInstrument');
        var verifyDuplicates = false;
        var tokenizationResult = { subscriptionID: '', error: '' };
        var paymentForm = server.forms.getForm('creditCard');
        var result = PaymentInstrumentUtils.getDetailsObject(paymentForm);

        var billingForm = server.forms.getForm('billing');
        if (!empty(billingForm.creditCardFields.flexresponse.value)) {
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
                var enableTokenization = dw.system.Site.getCurrent().getCustomPreferenceValue('CsTokenizationEnable').value;
                if (enableTokenization.equals('YES') && HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
                    verifyDuplicates = true;
                    tokenizationResult = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(), 'CreatePaymentToken', 'account');
                }

                if (!tokenizationResult.error) {
                    var wallet = customer.getProfile().getWallet();
                    Transaction.begin();

                    if (!empty(tokenizationResult.subscriptionID)) {

                        if (verifyDuplicates) {
                            PaymentInstrumentUtils.removeDuplicates(formInfo);
                        }
                        var paymentInstrument = wallet.createPaymentInstrument(dwOrderPaymentInstrument.METHOD_CREDIT_CARD);
                        PaymentInstrumentUtils.savePaymentInstrument({ PaymentInstrument: paymentInstrument, CreditCardFields: formInfo });
    
                        paymentInstrument.custom.isCSToken = true;
                        paymentInstrument.setCreditCardToken(tokenizationResult.subscriptionID);
                    }

                    Transaction.commit();
                    // Reseting the formData because response had CC#
                    res.setViewData(PaymentInstrumentUtils.setDetailsObject(paymentForm));
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

    server.prepend('SavePayment', csrfProtection.validateAjaxRequest, function (req, res, next) {
        var Resource = require('dw/web/Resource');
        var Transaction = require('dw/system/Transaction');
        var customerProfile = customer.getProfile();
        var saveCard = PaymentInstrumentUtils.cardSaveLimit(customerProfile);
        if (saveCard.addCardLimitError) {
            res.json({
                success: false,
                message: Resource.msg('error.message.addcard.fail', 'cybersource', null)
            });
            this.emit('route:Complete', req, res);
        } else {
            if (saveCard.addCardLimit && saveCard.savedCCTimeNew) {
                Transaction.wrap(function () {
                    customerProfile.custom.savedCCRateLookBack = new Date();
                    customerProfile.custom.savedCCRateCount = 1;
                });
            }
            next();
        }
    });

    server.append('DeletePayment', userLoggedIn.validateLoggedInAjax, function (req, res, next) {
        var array = require('*/cartridge/scripts/util/array');
        var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
        var UUID = req.querystring.UUID;
        var paymentToDelete = array.find(paymentInstruments, function (item) {
            return UUID === item.UUID;
        });

        this.removeListener('route:BeforeComplete');
        this.on('route:BeforeComplete', function () {
            var subscriptionError;
            var subscriptionID;
            var CustomerMgr = require('dw/customer/CustomerMgr');
            var Transaction = require('dw/system/Transaction');
            var Resource = require('dw/web/Resource');
            var payment = res.getViewData();

            var customer = CustomerMgr.getCustomerByCustomerNumber(
                req.currentCustomer.profile.customerNo
            );

            var wallet = customer.getProfile().getWallet();
            var enableTokenization = dw.system.Site.getCurrent().getCustomPreferenceValue('CsTokenizationEnable').value;

            if (!empty(paymentToDelete)) {
                subscriptionID = paymentToDelete.raw.creditCardToken;
            }

            //  Will make delete token call even if tokenization has been turned off since card was saved.
            if (!empty(paymentToDelete) && (enableTokenization.equals('YES') || !empty(subscriptionID))) {
                //  If a card was saved while tokenization was disabled it will not have a token.  No need to make delete call.
                if (!empty(subscriptionID) && 'custom' in paymentToDelete.raw && 'isCSToken' in paymentToDelete.raw.custom
                    && paymentToDelete.raw.custom.isCSToken) {
                    var CybersourceSubscription = require('*/cartridge/scripts/Cybersource');
                    var deleteSubscriptionBillingResult = CybersourceSubscription.DeleteSubscriptionAccount(subscriptionID);
                    if (deleteSubscriptionBillingResult.error) {
                        subscriptionError = deleteSubscriptionBillingResult.reasonCode + '-' + deleteSubscriptionBillingResult.decision;
                        session.privacy.SubscriptionError = subscriptionError;
                    }
                }
            }

            if (empty(subscriptionError)) {
                Transaction.wrap(function () {
                    wallet.removePaymentInstrument(payment.raw);
                });
            }
            paymentInstruments = wallet.getPaymentInstruments();
            if (paymentInstruments.length === 0) {
                res.json({
                    UUID: UUID,
                    message: Resource.msg('msg.no.saved.payments', 'payment', null)
                });
            } else if (!empty(subscriptionError)) {
                res.json({
                    UUID: UUID,
                    message: subscriptionError
                });
            } else {
                res.json({ UUID: UUID });
            }
        });
        return next();
    });
}
module.exports = server.exports();
