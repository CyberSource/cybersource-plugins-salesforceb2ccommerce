'use strict';

/* API Includes */
var Cart = require('~/cartridge/scripts/models/CartModel');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

/**
 * This is where additional BillMeLaterl integration would go. The current implementation simply creates a payment
 * method and returns 'success'.
 */
function Handle(args) {
    var cart = Cart.get(args.Basket);

    if (!session.forms.billing.paymentMethods.bml.termsandconditions.checked) {
        session.forms.billing.paymentMethods.bml.termsandconditions.invalidateFormElement();
        return {error: true};
    } else {
        Transaction.wrap(function () {
            cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_BML);
            cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            cart.removeExistingPaymentInstruments('PayPal');
            cart.removeExistingPaymentInstruments('ALIPAY');
            cart.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_BML, cart.getNonGiftCertificateAmount());
            
        });

        return {sucess: true};
    }
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the CYBERSOURCE_BML processor only and
 * setting the order no as the transaction ID. Customizations may use other processors and custom logic to authorize
 * credit card payment.
 */
function Authorize(args) {
	var OrderMgr = require('dw/order/OrderMgr');
	var app = require('~/cartridge/scripts/app');
	var Cart = app.getModel('Cart');
	
	var orderNo = args.OrderNo;
	var Order = OrderMgr.getOrder(orderNo);
	
	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource')
	
    return Cybersource.AuthorizeBML({Order:Order, Basket:Order});
}


/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
