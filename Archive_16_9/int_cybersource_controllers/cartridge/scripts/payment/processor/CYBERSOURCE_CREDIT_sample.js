'use strict';

/**
 * Verifies a credit card against a valid card number and expiration date and
 * possibly invalidates invalid form fields. If the verification was successful
 * a credit card payment instrument is created. The pipeline just reuses the
 * basic credit card validation pipeline from processor BASIC_CREDIT.
 */
function Handle(args) {
    return require('./BASIC_CREDIT').Handle(args);
}

/**
 * Authorizes a payment using a credit card. A real integration is not
 * supported, that's why the pipeline returns this state back to the calling
 * checkout pipeline.
 */
function Authorize(args) {
	
	var OrderMgr = require('dw/order/OrderMgr');
	var app = require('~/cartridge/scripts/app');
	var Cart = app.getModel('Cart');
	
	var orderNo = args.OrderNo;
	var Order = OrderMgr.getOrder(orderNo);
	var PaymentInstrument = args.PaymentInstrument;
	
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
