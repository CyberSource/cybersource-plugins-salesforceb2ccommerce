'use strict';

// var Status = require('dw/system/Status');

// var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var collections = require('*/cartridge/scripts/util/collections');

/**
 * Creates a token.
 * @param {*} module module
 * @returns {*} obj
 */
exports.CreatePaymentToken = function (module) {
    var subscriptionID; var subscriptionError; var
        createSubscriptionResult;
    var CybersourceSubscription = require('*/cartridge/scripts/Cybersource');
    if (module.equalsIgnoreCase('account')) {
        createSubscriptionResult = CybersourceSubscription.CreateSubscriptionMyAccount();
    } else {
        createSubscriptionResult = CybersourceSubscription.SaveCreditCard();
    }
    if (createSubscriptionResult.error) {
        subscriptionError = createSubscriptionResult.reasonCode + '-' + createSubscriptionResult.decision;
        return { error: true, subscriptionError: subscriptionError };
    }
    subscriptionID = createSubscriptionResult.subscriptionID;
    return { error: false, subscriptionID: subscriptionID };
};

// eslint-disable-next-line
exports.SilentPostAuthorize = function (orderNumber, paymentInstrument, paymentProcessor) {
    var SecureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);
    var pi = paymentInstrument;
    var paymentMethod = pi.getPaymentMethod();
    // eslint-disable-next-line
    if (empty(paymentMethod)) {
        return { error: true };
    }
    return SecureAcceptanceHelper.AuthorizeCreditCard({ PaymentInstrument: pi, Order: order });
};

/**
 * Verifies billing and shipping details and
 * possibly invalidates invalid form fields.
 * If the verification was successful a Secure Acceptance redirect payment instrument is created.
 * @param {*} basket basket
 * @param {*} paymentInformation paymentInformation
 * @returns {*} obj
 */
function SecureAcceptanceHandle(basket, paymentInformation) {
    // eslint-disable-next-line
    var PaymentMethod = session.forms.billing.paymentMethod.value;
    var BasketMgr = require('dw/order/BasketMgr');
    var cart = BasketMgr.getCurrentBasket();
    // var Transaction = require('dw/system/Transaction');
    var cardNumber = paymentInformation.cardNumber.value;
    var cardType = paymentInformation.cardType.value;
    var cardSecurityCode = paymentInformation.securityCode.value;
    var expirationMonth = paymentInformation.expirationMonth.value;
    var expirationYear = paymentInformation.expirationYear.value;
    var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'helper/CommonHelper');
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var amount = CommonHelper.CalculateNonGiftCertificateAmount(cart);
    var cardErrors = {};
    var serverErrors = [];
    var creditCardStatus;
    if (CsSAType.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
        var paymentCard = PaymentMgr.getPaymentCard(cardType);
        if (!paymentInformation.creditCardToken) {
            if (paymentCard) {
                creditCardStatus = paymentCard.verify(
                    expirationMonth,
                    expirationYear,
                    cardNumber,
                    cardSecurityCode
                );
            } else {
                cardErrors[paymentInformation.cardNumber.htmlName] = Resource.msg('error.invalid.card.number', 'creditCard', null);

                return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
            }

            if (creditCardStatus.error) {
                collections.forEach(creditCardStatus.items, function (item) {
                    switch (item.code) {
                        case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                            cardErrors[paymentInformation.cardNumber.htmlName] = Resource.msg('error.invalid.card.number', 'creditCard', null);
                            break;

                        case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                            cardErrors[paymentInformation.expirationMonth.htmlName] = Resource.msg('error.expired.credit.card', 'creditCard', null);
                            cardErrors[paymentInformation.expirationYear.htmlName] = Resource.msg('error.expired.credit.card', 'creditCard', null);
                            break;

                        case PaymentStatusCodes.CREDITCARD_INVALID_SECURITY_CODE:
                            cardErrors[paymentInformation.securityCode.htmlName] = Resource.msg('error.invalid.security.code', 'creditCard', null);
                            break;
                        default:
                            serverErrors.push(
                                Resource.msg('error.card.information.error', 'creditCard', null)
                            );
                    }
                });

                return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
            }
        }
    }

    var transStatus;
    var paymentInstrument;
    if (CsSAType !== CybersourceConstants.METHOD_SA_SILENTPOST && CsSAType !== CybersourceConstants.METHOD_SA_FLEX) {
        transStatus = Transaction.wrap(function () {
            CommonHelper.removeExistingPaymentInstruments(cart);
            paymentInstrument = cart.createPaymentInstrument(PaymentMethod, amount);
            return true;
        });
    } else if (CsSAType.equals(CybersourceConstants.METHOD_SA_FLEX)) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        transStatus = Transaction.wrap(function () {
            CommonHelper.removeExistingPaymentInstruments(cart);
            paymentInstrument = cart.createPaymentInstrument(PaymentMethod, amount);
            paymentInstrument.setCreditCardHolder(cart.billingAddress.fullName);
            paymentInstrument.setCreditCardNumber(cardNumber);
            paymentInstrument.setCreditCardExpirationMonth(expirationMonth);
            paymentInstrument.setCreditCardExpirationYear(expirationYear);
            // eslint-disable-next-line
            if (empty(paymentInformation.creditCardToken)) {
                paymentInstrument.setCreditCardType(CardHelper.getCardType(cardType));
                // eslint-disable-next-line
                var flexResponse = session.forms.billing.creditCardFields.flexresponse.value;
                var flexString = JSON.parse(flexResponse);
                var flexToken = flexString.token;
                paymentInstrument.setCreditCardToken(flexToken);
            } else {
                paymentInstrument.setCreditCardType(cardType);
                paymentInstrument.setCreditCardToken(paymentInformation.creditCardToken);
            }
            return true;
        });
    } else {
        // eslint-disable-next-line
        session.forms.billing.creditCardFields.securityCode.value = paymentInformation.securityCode.value;
        transStatus = Transaction.wrap(function () {
            CommonHelper.removeExistingPaymentInstruments(cart);
            paymentInstrument = cart.createPaymentInstrument(PaymentMethod, amount);
            paymentInstrument.setCreditCardHolder(cart.billingAddress.fullName);
            paymentInstrument.setCreditCardNumber(cardNumber);
            paymentInstrument.setCreditCardType(cardType);
            paymentInstrument.setCreditCardExpirationMonth(expirationMonth);
            paymentInstrument.setCreditCardExpirationYear(expirationYear);
            // eslint-disable-next-line
            if (!empty(paymentInformation.creditCardToken)) {
                paymentInstrument.setCreditCardToken(paymentInformation.creditCardToken);
            }
            return true;
        });
    }
    if (transStatus) {
        return { sucess: true };
    }
    return { error: true };
}

/**
 * Verifies a credit card against a valid card number and expiration date and
 * possibly invalidates invalid form fields. If the verification was successful
 * a credit card payment instrument is created. The Controller just reuses the
 * basic credit card validation Controller from processor CYBERSOURCE_CREDIT.
 *
 * @param {Basket}  basket - Current customers basket.
 * @param {Object}  paymentInformation - JSON object containing payment information.
 * @returns {Object} -  {fieldErrors: [], serverErrors: [], error: Boolean}
 */
exports.Handle = function (basket, paymentInformation) {
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    // eslint-disable-next-line
    var PaymentMethod = session.forms.billing.paymentMethod.value;
    // eslint-disable-next-line
    if (empty(PaymentMethod)) {
        return { error: true };
    }
    if (CsSAType == null) {
        var Cybersource = require('*/cartridge/scripts/Cybersource');
        return Cybersource.HandleCard(basket, paymentInformation);
    }
    return SecureAcceptanceHandle(basket, paymentInformation);
};

/**
 * Authorizes a payment using a secure acceptance redirect payment instrument.
 * Create signature with requested input
 * This function takes order No and payment instrument as Input
 */
// eslint-disable-next-line
function SecureAcceptanceAuthorize(orderNumber, pi, pmntProcessor) {
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    // var PaymentMgr = require('dw/order/PaymentMgr');
    // var Transaction = require('dw/system/Transaction');
    var paymentInstrument = pi;
    var paymentMethod = paymentInstrument.paymentMethod;
    var additionalArgs = {};
    // eslint-disable-next-line
    var saveCard = session.forms.billing.creditCardFields.saveCard.value;
    if (saveCard) {
        Transaction.wrap(function () {
            paymentInstrument.custom.savecard = true;
        });
    }
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).getPaymentProcessor();
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    if (CsSAType.equals(CybersourceConstants.METHOD_SA_REDIRECT)) {
        // eslint-disable-next-line
        additionalArgs.subscriptionToken = session.forms.billing.creditCardFields.selectedCardID.value;
        var secureAcceptanceAdapter = require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter');
        var saRedirectRequest = secureAcceptanceAdapter.Authorize(orderNumber, paymentInstrument, paymentProcessor, additionalArgs);
        if (saRedirectRequest.success) {
            if (saRedirectRequest.requestData != null) {
                // eslint-disable-next-line
                session.privacy.isPaymentRedirectInvoked = true;
                // eslint-disable-next-line
                session.privacy.paymentType = 'SARedirect';
                // eslint-disable-next-line
                session.privacy.orderID = orderNumber;
                var data = saRedirectRequest.requestData;
                var formAction = saRedirectRequest.formAction;
                return {
                    intermediateSA: true,
                    data: data,
                    formAction: formAction,
                    renderViewPath: 'services/secureAcceptanceRequestForm'
                };
            }
        } else {
            return { error: true };
        }
    } else if (CsSAType.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
        // eslint-disable-next-line
        additionalArgs.subscriptionToken = session.forms.billing.creditCardFields.selectedCardID.value;
        return require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter').Authorize(orderNumber, paymentInstrument, paymentProcessor, additionalArgs);
    } else {
        if (CsSAType.equals(CybersourceConstants.METHOD_SA_IFRAME)) {
            // eslint-disable-next-line
            session.privacy.order_id = orderNumber;
        }
        return require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter').Authorize(orderNumber, paymentInstrument, paymentProcessor, additionalArgs);
    }
}

/**
 * Authorizes a payment using a credit card. A real integration is not
 * supported, that's why the Controller returns this state back to the calling
 * checkout Controller.
 *
 * @param {number}  orderNumber - Order number.
 * @param {PaymentInstrument}  paymentInstrument - Payment Instrument
 * @param {PaymentProcessor}  paymentProcessor - Payment Processor
 * @returns {Object} -  {fieldErrors: [], serverErrors: [], error: Boolean}
 */
exports.Authorize = function (orderNumber, paymentInstrument, paymentProcessor) {
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);
    var pi = paymentInstrument;
    var paymentMethod = pi.getPaymentMethod();
    // eslint-disable-next-line
    if (empty(paymentMethod)) {
        return { error: true };
    }

    Transaction.wrap(function () {
        pi.paymentTransaction.paymentProcessor = paymentProcessor;
    });

    // var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
    if ((paymentMethod.equals(CybersourceConstants.METHOD_CREDIT_CARD)
            && (CsSAType == null || CsSAType.equals(CybersourceConstants.METHOD_SA_FLEX))) || paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT) || paymentMethod.equals(CybersourceConstants.METHOD_GooglePay)) {
        var SecureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
        return SecureAcceptanceHelper.AuthorizeCreditCard({ PaymentInstrument: pi, Order: order });
    }
    return SecureAcceptanceAuthorize(orderNumber, paymentInstrument, paymentProcessor);
};
