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
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	if (empty(PaymentMethod)) {
		return {error: true};
	}
	if (!PaymentMethod.equals('SA_IFRAME') && !PaymentMethod.equals('SA_REDIRECT') && !PaymentMethod.equals('SA_SILENTPOST')) {
		var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
		return Cybersource.HandleCard(args);
	} else {
		var SECURE_ACCEPTANCE = require('int_cybersource_controllers/cartridge/controllers/SECURE_ACCEPTANCE');
		return SECURE_ACCEPTANCE.Handle(args);
	}
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
	var paymentMethod = PaymentInstrument.getPaymentMethod();
	if (empty(paymentMethod)) {
		return {error:true};
	}
	var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).getPaymentProcessor();
    Transaction.wrap(function () {
    	PaymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    if (!paymentMethod.equals('SA_IFRAME') && !paymentMethod.equals('SA_REDIRECT') && !paymentMethod.equals('SA_SILENTPOST')) {
    	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
    	return Cybersource.AuthorizeCreditCard({PaymentInstrument:PaymentInstrument, Order:Order, Basket:Order});
    } else {
		var SECURE_ACCEPTANCE = require('int_cybersource_controllers/cartridge/controllers/SECURE_ACCEPTANCE');
		return SECURE_ACCEPTANCE.Authorize(args);
    }
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
