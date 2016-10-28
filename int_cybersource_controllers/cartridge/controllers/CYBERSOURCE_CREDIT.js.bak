'use strict';

var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');



/**
 * Verifies a credit card against a valid card number and expiration date and
 * possibly invalidates invalid form fields. If the verification was successful
 * a credit card payment instrument is created. The pipeline just reuses the
 * basic credit card validation pipeline from processor CYBERSOURCE_CREDIT.
 */
function Handle(args) {
	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource')
	return Cybersource.HandleCard(args);
}


/**
 * Authorizes a payment using a credit card. A real integration is not
 * supported, that's why the pipeline returns this state back to the calling
 * checkout pipeline.
 */
function Authorize(args) {
	
	var OrderMgr = require('dw/order/OrderMgr');
	var app = require('app_storefront_controllers/cartridge/scripts/app');
	var Cart = app.getModel('Cart');
	
	var orderNo = args.OrderNo;
	var Order = OrderMgr.getOrder(orderNo);
	var PaymentInstrument = args.PaymentInstrument;
	    var paymentProcessor = PaymentMgr.getPaymentMethod("CREDIT_CARD").getPaymentProcessor();
    Transaction.wrap(function () {
    	PaymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource')
	
    return Cybersource.AuthorizeCreditCard({PaymentInstrument:PaymentInstrument, Order:Order, Basket:Order});
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
