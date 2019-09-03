'use strict';

var Status = require('dw/system/Status');
var server = require('server');
var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
var paymentMethodID = 'DW_APPLE_PAY';
var Transaction = require('dw/system/Transaction');

/**
 *
 * @param {Object} responseBillingAddress billing data from apple response
 */
function setBillingAddress(responseBillingAddress) {
    var billingForm = server.forms.getForm('billing');
    var billingAddress = {
        firstName: responseBillingAddress.givenName,
        lastName: responseBillingAddress.lastName,
        address1: responseBillingAddress.addressLines[0],
        address2: responseBillingAddress.addressLines[1] ? responseBillingAddress.addressLines[1] : '',
        city: responseBillingAddress.locality,
        stateCode: responseBillingAddress.administrativeArea,
        postalCode: responseBillingAddress.postalCode,
        country: responseBillingAddress.countryCode,
        paymentMethod: paymentMethodID
    };
    billingForm.copyFrom(billingAddress);
}

/**
 *
 * @param {Object} responseShippingAddress billing data from apple response
 */
function setShippingAddress(responseShippingAddress) {
    var shippingForm = server.forms.getForm('shipping');
    var shippingAddress = {
        firstName: responseShippingAddress.givenName,
        lastName: responseShippingAddress.lastName,
        address1: responseShippingAddress.addressLines[0],
        address2: responseShippingAddress.addressLines[1] ? responseShippingAddress.addressLines[1] : '',
        city: responseShippingAddress.locality,
        stateCode: responseShippingAddress.administrativeArea,
        postalCode: responseShippingAddress.postalCode,
        country: responseShippingAddress.countryCode,
        phone: responseShippingAddress.phoneNumber
    };
    shippingForm.copyFrom(shippingAddress);
}

exports.authorizeOrderPayment = function (order, responseData) {
    var status = Status.ERROR;
    var authResponseStatus;
    var paymentMethod = require('dw/order/PaymentMgr').getPaymentMethod(paymentMethodID);

    setBillingAddress(responseData.payment.billingContact);
    setShippingAddress(responseData.payment.shippingContact);
    Transaction.wrap(function () {
         //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
        var paymentInstrument = null;
        if ( !empty(order.getPaymentInstruments()) ) {
            paymentInstrument = order.getPaymentInstruments()[0];
            paymentInstrument.paymentTransaction.paymentProcessor = paymentMethod.getPaymentProcessor();
        }
        else {
            return new Status(status);
        }
        paymentInstrument.paymentTransaction.paymentProcessor = paymentMethod.getPaymentProcessor();
    });
    authResponseStatus = require('~/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter').processPayment(order);


    if (CardHelper.HandleCardResponse(authResponseStatus.ServiceResponse.serviceResponse).authorized || CardHelper.HandleCardResponse(authResponseStatus.ServiceResponse.serviceResponse).review) {
        status = Status.OK;
    }

    return new Status(status);
};
