'use strict';

/*
    This line has to be updated to reference checkoutHelpers.js from the site cartridge's checkoutHelpers.js
*/

var base = module.superModule;
var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
var Transaction = require('dw/system/Transaction');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

/**
 * creates a new payment instrument in customers wallet if payment instrument is new
 * otherwise returns the already existing payment instrument
 * @param {*} billingDataObj billing information entered by the user
 * @param {*} currentBasket The current basket
 * @param {*} customer The current customer
 * @returns {*} obj
 */
function savePaymentInstrumentToWallet(billingDataObj, currentBasket, customer) {
    var billingData = billingDataObj;
    var HookMgr = require('dw/system/HookMgr');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    // var Transaction = require('dw/system/Transaction');
    var BasketMgr = require('dw/order/BasketMgr');
    var Site = require('dw/system/Site');
    var Resource = require('dw/web/Resource');
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    if (CsSAType != null && CsSAType === Resource.msg('cssatype.SA_FLEX', 'cybersource', null)) {
        billingData.paymentInformation.cardType.value = CardHelper.getCardType(billingData.paymentInformation.cardType.value);
    }
    var verifyDuplicates = false;

    var basket = BasketMgr.getCurrentOrNewBasket();
    var tokenizationResult = { subscriptionID: '', error: '' };
    var wallet = customer.getProfile().getWallet();
    var paymentInstruments = wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
    var enableTokenization = Site.getCurrent().getCustomPreferenceValue('CsTokenizationEnable').value;
    var processor = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD).getPaymentProcessor();
    if (enableTokenization.equals('YES') && HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
        verifyDuplicates = true;
        tokenizationResult = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(), 'CreatePaymentToken', 'billing');
    }
    var payInstrument = CardHelper.getNonGCPaymemtInstument(basket);
    var storedPaymentInstrument;
    var alreadyExists = false;

    Transaction.begin();
    var savedCreditCards = customer.getProfile().getWallet().getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
    var ccNumber = billingData.paymentInformation.cardNumber.value;
    // eslint-disable-next-line
    for (var i = 0; i < savedCreditCards.length; i++) {
        var creditcard = savedCreditCards[i];
        var creditcardNo = creditcard.getCreditCardNumber();
        if (creditcard.creditCardExpirationMonth === billingData.paymentInformation.expirationMonth.value
            && creditcard.creditCardExpirationYear === billingData.paymentInformation.expirationYear.value
            && creditcard.creditCardType === billingData.paymentInformation.cardType.value
            && creditcardNo.toString().substring(creditcardNo.length - 4).equals(ccNumber.substring(ccNumber.length - 4))) {
            storedPaymentInstrument = creditcard;
            alreadyExists = true;
            break;
        }
    }

    if (!alreadyExists) {
        storedPaymentInstrument = wallet.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);

        storedPaymentInstrument.setCreditCardHolder(
            currentBasket.billingAddress.fullName
        );
        storedPaymentInstrument.setCreditCardNumber(
            billingData.paymentInformation.cardNumber.value
        );
        storedPaymentInstrument.setCreditCardType(
            billingData.paymentInformation.cardType.value
        );
        storedPaymentInstrument.setCreditCardExpirationMonth(
            billingData.paymentInformation.expirationMonth.value
        );
        storedPaymentInstrument.setCreditCardExpirationYear(
            billingData.paymentInformation.expirationYear.value
        );

        // eslint-disable-next-line
        if (!tokenizationResult.error && !empty(tokenizationResult.subscriptionID)) {
            storedPaymentInstrument.setCreditCardToken(tokenizationResult.subscriptionID);
            storedPaymentInstrument.custom.isCSToken = true;
            payInstrument.setCreditCardToken(tokenizationResult.subscriptionID);
        }
        if (CsSAType != null && CsSAType === Resource.msg('cssatype.SA_FLEX', 'cybersource', null)) {
            // eslint-disable-next-line
            var flexResponse = session.forms.billing.creditCardFields.flexresponse.value;
            var flexString = JSON.parse(flexResponse);
            storedPaymentInstrument.setCreditCardToken(flexString.token);
        }
    }

    if (verifyDuplicates) {
        var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
        PaymentInstrumentUtils.removeDuplicates({
            PaymentInstruments: paymentInstruments,
            CreditCardFields: {
                expirationMonth: billingData.paymentInformation.expirationMonth.value,
                expirationYear: billingData.paymentInformation.expirationYear.value,
                cardType: billingData.paymentInformation.cardType.value,
                cardNumber: billingData.paymentInformation.cardNumber.value
            }
        });
    }
    Transaction.commit();
    return storedPaymentInstrument;
}

/**
 * handles the payment authorization for each payment instrument
 * @param {dw.order.Order} order - the order object
 * @param {string} orderNumber - The order number for the order
 * @returns {Object} an error object
 */
function handlePayments(order, orderNumber) {
    var PaymentMgr = require('dw/order/PaymentMgr');
    var HookMgr = require('dw/system/HookMgr');
    // var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');
    var authorizationResult;
    var result = {};

    if (order.totalNetPrice !== 0.00) {
        var paymentInstruments = order.paymentInstruments;

        if (paymentInstruments.length === 0) {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i += 1) {
                var paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;
                if (paymentProcessor === null) {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    Transaction.commit();
                } else {
                    if (HookMgr.hasHook('app.payment.processor.' + paymentProcessor.ID.toLowerCase())) {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                            'Authorize',
                            orderNumber,
                            paymentInstrument,
                            paymentProcessor
                        );
                    } else {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.default',
                            'Authorize'
                        );
                    }

                    if (authorizationResult.error) {
                        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
                        result.error = true;
                        break;
                    }
                }
            }
        }
    }

    return authorizationResult;
}

/**
 * Validates payment
 * @param {Object} req - The local instance of the request object
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an object that has error information
 */
function validatePayment(req, currentBasket) {
    var Site = require('dw/system/Site');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentInstrument = require('dw/order/PaymentInstrument');

    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var applicablePaymentCards;
    var applicablePaymentMethods;
    var creditCardPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
    var paymentAmount = currentBasket.totalGrossPrice.value;
    var countryCode = req.geolocation.countryCode;
    var currentCustomer = req.currentCustomer.raw;
    var paymentInstruments = currentBasket.paymentInstruments;
    var result = {};

    applicablePaymentMethods = PaymentMgr.getApplicablePaymentMethods(
        currentCustomer,
        countryCode,
        paymentAmount
    );
    applicablePaymentCards = creditCardPaymentMethod.getApplicablePaymentCards(
        currentCustomer,
        countryCode,
        paymentAmount
    );

    var invalid = true;

    for (var i = 0; i < paymentInstruments.length; i += 1) {
        var paymentInstrument = paymentInstruments[i];

        if (PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(paymentInstrument.paymentMethod)) {
            invalid = false;
        }

        if (CsSAType) {
            invalid = false;
        }

        var paymentMethod = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod());

        if (paymentMethod && applicablePaymentMethods.contains(paymentMethod)) {
            if (PaymentInstrument.METHOD_CREDIT_CARD.equals(paymentInstrument.paymentMethod)) {
                var card = PaymentMgr.getPaymentCard(paymentInstrument.creditCardType);

                // Checks whether payment card is still applicable.
                if (card && applicablePaymentCards.contains(card)) {
                    invalid = false;
                }
            } else {
                invalid = false;
            }
        }

        if (invalid) {
            break; // there is an invalid payment instrument
        }
    }

    result.error = invalid;
    return result;
}

/**
 * renders the user's stored payment Instruments
 * @param {*} req The request object
 * @param {*} paymentInstruments paymentInstruments
 * @param {*} paymentID paymentID
 * @returns {*} obj
 */
function getOrderPaymentInstruments(req, paymentInstruments, paymentID) {
    var result;
    var context;
    var template = 'checkout/billing/orderPaymentInstrument';

    context = { paymentInstruments: paymentInstruments, paymentOption: paymentID };
    result = renderTemplateHelper.getRenderedHtml(
        context,
        template
    );

    return result || null;
}

/**
 * Function
 * @param {*} basket basket
 * @returns {*} obj
 */
function getPayPalInstrument(basket) {
    for (var i = 0; i < basket.paymentInstruments.length; i += 1) {
        var paymentInstrument = basket.paymentInstruments[i];
        if (paymentInstrument.paymentMethod === 'PAYPAL' || paymentInstrument.paymentMethod === 'PAYPAL_CREDIT') {
            return paymentInstrument;
        }
    }
    return null;
}

/**
 * Validate PayPal email & phone number fields
 * @param {Object} form - the form object with pre-validated form fields
 * @returns {Object} the names of the invalid form fields
 */
function validatePPLForm(form) {
    return base.validateFields(form);
}

/**
 * Function
 * @param {*} basket basket
 */
function handlePayPal(basket) {
    var ccPaymentInstrs = basket.getPaymentInstruments();

    // get all credit card payment instruments

    var iter = ccPaymentInstrs.iterator();
    var existingPI = null;
    var PaymentInstrument = require('dw/order/PaymentInstrument');

    // remove them
    while (iter.hasNext()) {
        existingPI = iter.next();
        if (existingPI.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
            // eslint-disable-next-line
            continue;
        } else if (existingPI.paymentMethod.equals('PAYPAL') || existingPI.paymentMethod.equals('PAYPAL_CREDIT')) {
            basket.removePaymentInstrument(existingPI);
        }
    }
}

/**
 * Function
 */
function clearPaymentAttributes() {
    /* eslint-disable */
    session.privacy.isPaymentRedirectInvoked = '';
    session.privacy.paymentType = '';
    session.privacy.orderID = '';
    /* eslint-enable */
}

/**
 * Function
 * @param {*} order order
 * @returns {*} obj
 */
function reCreateBasket(order) {
    // var Transaction = require('dw/system/Transaction');
    var BasketMgr = require('dw/order/BasketMgr');
    var OrderMgr = require('dw/order/OrderMgr');
    Transaction.wrap(function () {
        OrderMgr.failOrder(order, true);
    });
    // var BasketMgr = require('dw/order/BasketMgr');
    return BasketMgr.getCurrentBasket();
}

/**
 * Function
 * @param {*} order order
 * @returns {*} obj
 */
function handleSilentPostAuthorize(order) {
    var PaymentMgr = require('dw/order/PaymentMgr');
    var HookMgr = require('dw/system/HookMgr');
    var paymentInstrument;
    if (order !== null) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
    }
    var authorizationResult;
    // var result = {};
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.paymentMethod).paymentProcessor;
    if (HookMgr.hasHook('app.payment.processor.' + paymentProcessor.ID.toLowerCase())) {
        authorizationResult = HookMgr.callHook(
            'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
            'SilentPostAuthorize',
            order.orderNo,
            paymentInstrument,
            paymentProcessor
        );
    }
    return authorizationResult;
}

/**
 * Function
 * @param {*} order order
 * @param {*} customerObj customerObj
 * @param {*} res res
 */
function addOrUpdateToken(order, customerObj, res) {
    var URLUtils = require('dw/web/URLUtils');
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    var paymentInstrument;
    if (order !== null) {
        paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
    }
    CardHelper.addOrUpdateToken(paymentInstrument, customerObj);
    // eslint-disable-next-line
    session.privacy.orderId = order.orderNo;
    res.redirect(URLUtils.https('COPlaceOrder-SilentPostSubmitOrder'));
}

/**
 * Function
 * @param {*} basket basket
 * @returns {*} obj
 */
function getNonGCPaymemtInstument(basket) {
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    return CardHelper.getNonGCPaymemtInstument(basket);
}

/**
 * Sets the payment transaction amount
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an error object
 */
function calculatePaymentTransaction(currentBasket) {
    var result = { error: false };

    try {
        Transaction.wrap(function () {
            var paymentInstruments = currentBasket.paymentInstruments;

            if (!paymentInstruments.length) {
                return;
            }
            var orderTotal = currentBasket.totalGrossPrice;
            var paymentInstrument = paymentInstruments[0];

            if (!(paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL) || paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL_CREDIT))) {
                paymentInstrument.paymentTransaction.setAmount(orderTotal);
            }
        });
    } catch (e) {
        result.error = true;
    }

    return result;
}

base.savePaymentInstrumentToWallet = savePaymentInstrumentToWallet;
base.handlePayments = handlePayments;
base.validatePayment = validatePayment;
base.getOrderPaymentInstruments = getOrderPaymentInstruments;
base.validatePPLForm = validatePPLForm;
base.getPayPalInstrument = getPayPalInstrument;
base.handlePayPal = handlePayPal;
base.clearPaymentAttributes = clearPaymentAttributes;
base.handleSilentPostAuthorize = handleSilentPostAuthorize;
base.reCreateBasket = reCreateBasket;
base.addOrUpdateToken = addOrUpdateToken;
base.getNonGCPaymemtInstument = getNonGCPaymemtInstument;
base.calculatePaymentTransaction = calculatePaymentTransaction;

module.exports = base;
