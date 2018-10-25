'use strict';

/*
	This line has to be updated to reference checkoutHelpers.js from the site cartridge's checkoutHelpers.js
*/
var base = require('app_storefront_base/cartridge/scripts/checkout/checkoutHelpers');

/**
 * saves payment instrument to customers wallet
 * @param {Object} billingData - billing information entered by the user
 * @param {dw.order.Basket} currentBasket - The current basket
 * @param {dw.customer.Customer} customer - The current customer
 * @returns {dw.customer.CustomerPaymentInstrument} newly stored payment Instrument
 */
function savePaymentInstrumentToWallet(billingData, currentBasket, customer) {
    var HookMgr = require('dw/system/HookMgr');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var Transaction = require('dw/system/Transaction');
    var BasketMgr = require('dw/order/BasketMgr');
    var Site = require('dw/system/Site');
    var CsSAType = Site.getCurrent().getCustomPreferenceValue("CsSAType").value;
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    if(CsSAType != null && CsSAType == "SA_FLEX") {
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
    Transaction.begin();
    var storedPaymentInstrument = wallet.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);

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
    if (!tokenizationResult.error && !empty(tokenizationResult.subscriptionID)) {
        storedPaymentInstrument.setCreditCardToken(tokenizationResult.subscriptionID);
        payInstrument.setCreditCardToken(tokenizationResult.subscriptionID);
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
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');
    var result = {};

    if (order.totalNetPrice !== 0.00) {
        var paymentInstruments = order.paymentInstruments;

        if (paymentInstruments.length === 0) {
            Transaction.wrap(function () { OrderMgr.failOrder(order); });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i++) {
                var paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr
                    .getPaymentMethod(paymentInstrument.paymentMethod)
                    .paymentProcessor;
                var authorizationResult;
                if (paymentProcessor === null) {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    Transaction.commit();
                } else {
                    if (HookMgr.hasHook('app.payment.processor.' +
                            paymentProcessor.ID.toLowerCase())) {
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
                        Transaction.wrap(function () { OrderMgr.failOrder(order); });
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

	var CsSAType = Site.getCurrent().getCustomPreferenceValue("CsSAType").value;
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

    for (var i = 0; i < paymentInstruments.length; i++) {
        var paymentInstrument = paymentInstruments[i];

        if (PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(paymentInstrument.paymentMethod)) {
            invalid = false;
        }
        
        if(CsSAType){
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
base.savePaymentInstrumentToWallet = savePaymentInstrumentToWallet;
base.handlePayments = handlePayments;
base.validatePayment = validatePayment;
module.exports = base;