'use strict';

var Status = require('dw/system/Status');
var server = require('server');
var Transaction = require('dw/system/Transaction');
var CardHelper = require('~/cartridge/scripts/helper/CardHelper');

var paymentMethodID = 'DW_APPLE_PAY';

exports.authorizeOrderPayment = function (order, responseData) {
    var status = Status.ERROR;

    var paymentInstruments = order.getPaymentInstruments();
    if (empty(paymentInstruments)) {
        return new Status(status);
    }

    var authResponseStatus;
    var paymentMethod = require('dw/order/PaymentMgr').getPaymentMethod(paymentMethodID);

    Transaction.wrap(function () {
        var paymentInstrument = paymentInstruments[0];
        paymentInstrument.paymentTransaction.paymentProcessor = paymentMethod.getPaymentProcessor();
    });
    authResponseStatus = require('~/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter').processPayment(order);

    if (CardHelper.HandleCardResponse(authResponseStatus.ServiceResponse.serviceResponse).authorized || CardHelper.HandleCardResponse(authResponseStatus.ServiceResponse.serviceResponse).review) {
        status = Status.OK;
    }

    return new Status(status);
};
