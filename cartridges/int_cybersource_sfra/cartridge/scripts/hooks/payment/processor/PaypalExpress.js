'use strict';

/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'helper/CommonHelper');

/**
 * This is where additional PayPal integration would go. The current implementation simply creates a PaymentInstrument and
 * returns 'success'.
 * @param {*} args args
 * @returns {*} obj
 */
function Handle(args) {
    var basket = args;
    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstruments(basket);
        basket.createPaymentInstrument(
            CybersourceConstants.METHOD_PAYPAL,
            CommonHelper.CalculateNonGiftCertificateAmountPaypal(basket)
        );
    });
    return { success: true };
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the PAYPAL_EXPRESS processor only
 * and setting the order no as the transaction ID. Customizations may use other processors and custom logic to
 * authorize credit card payment.
 * @param {*} orderNumber orderNumber
 * @param {*} pi pi
 * @returns {*} obj
 */
function Authorize(orderNumber, pi) {
    var paymentInstrument = pi;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    var adapter = require(CybersourceConstants.PAYPAL_ADAPTOR);
    // Logic to determine if this is standard/custom Paypal order
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);
    var paymentResponse = adapter.PaymentService(order, paymentInstrument);

    if (paymentResponse.authorized) {
        return { authorized: true };
    } if (paymentResponse.pending) {
        return { review: true };
    }
    if (paymentResponse.rejected) {
        return { rejected: true };
    }

    return { error: true };
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
