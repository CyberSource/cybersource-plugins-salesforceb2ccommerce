'use strict';

var Resource = require('dw/web/Resource');
var base = module.superModule;

/**
 * Order class that represents the current order
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
 * @param {Object} options - The current order's line items
 * @param {Object} options.config - Object to help configure the orderModel
 * @param {string} options.config.numberOfLineItems - helps determine the number of lineitems needed
 * @param {string} options.countryCode - the current request country code
 * @constructor
 */
function OrderModel(lineItemContainer, options) {
    base.call(this, lineItemContainer, options);

    if (lineItemContainer && options && options.config && options.config.numberOfLineItems === '*') {
        // Get the payment instrument
        var paymentInstruments = lineItemContainer.getPaymentInstruments();
        if (paymentInstruments.length > 0) {
            var paymentInstrument = paymentInstruments[0];

            // Google Pay Credit Card Details
            if (paymentInstrument.paymentMethod === Resource.msg('paymentmethodname.googlepay', 'cybersource', null)) {
                var cardType = paymentInstrument.creditCardType;
                this.billing.payment.selectedPaymentInstruments[0].type = cardType;
                this.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = paymentInstrument.creditCardNumber;
            }

            // Visa Checkout Credit Card Details
            if (paymentInstrument.paymentMethod === Resource.msg('paymentmethodname.visacheckout', 'cybersource', null)) {
                this.resources.cardType = '';
                this.resources.cardEnding = '';
                this.billing.payment.selectedPaymentInstruments[0].type = paymentInstrument.creditCardType;
                this.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = paymentInstrument.creditCardNumber;
                this.billing.payment.selectedPaymentInstruments[0].expirationMonth = paymentInstrument.creditCardExpirationMonth;
                this.billing.payment.selectedPaymentInstruments[0].expirationYear = paymentInstrument.creditCardExpirationYear;
            }
        }
    }
}

module.exports = OrderModel;

