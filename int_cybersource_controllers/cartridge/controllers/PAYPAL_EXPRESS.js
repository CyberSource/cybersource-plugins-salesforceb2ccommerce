'use strict';

/* API Includes */
var Cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Pipeline = require('dw/system/Pipeline'); 
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
//TODO
var app = require('app_storefront_controllers/cartridge/scripts/app');
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');
/**
 * This is where additional PayPal integration would go. The current implementation simply creates a PaymentInstrument and
 * returns 'success'.
 */
function Handle(args) {
    var cart = Cart.get(args.Basket);
    var paymentMethod = app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value;
    if (empty(paymentMethod) || paymentMethod !='PayPal') {
    	return {error :true};
    }
    Transaction.wrap(function () {
    	CommonHelper.removeExistingPaymentInstruments(cart);
    });
    var paypalCancelUrl = dw.web.URLUtils.https('COBilling-Start');
	var paypalReturnUrl = dw.web.URLUtils.https('Cybersource-ProcessPaypalExpress');
    var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
	return Cybersource.PaypalSetService({Basket:cart, paypalOrigin:'billing', paypalCancelUrl:paypalCancelUrl, paypalReturnUrl:paypalReturnUrl});
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the PAYPAL_EXPRESS processor only
 * and setting the order no as the transaction ID. Customizations may use other processors and custom logic to
 * authorize credit card payment.
 */
function Authorize(args) {
	var orderNo = args.OrderNo;
	var order = OrderMgr.getOrder(orderNo);
	var paymentInstrument = args.PaymentInstrument;
	var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
	 session.custom.correlationID=null;
	 session.custom.ppXpressRequestToken=null;
	 session.custom.ppXpressRequestId=null;				 
	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
	var pdict = Cybersource.PaypalOrderSetup({Order:order, PaymentInstrument: paymentInstrument});
	if(pdict.EndNodeName == "OK"){
		var paypalResult = Cybersource.AuthorizePaypal({Order:order, PaymentInstrument: paymentInstrument, orderSetupRequestId:pdict.orderSetupRequestId,
			orderSetupRequestToken:pdict.orderSetupRequestToken,
			orderSetupTransactionId:pdict.orderSetupTransactionId});
		if (paypalResult.review){
			//var PlaceOrderError = new dw.system.Status(dw.system.Status.ERROR, "confirm.error.review");			
			//return {error: true, PlaceOrderError : PlaceOrderError};
			return {review: true};
		} else if (paypalResult.declined) {
			var PlaceOrderError = new dw.system.Status(dw.system.Status.ERROR, "confirm.error.declined");			
			return {declined: true, PlaceOrderError : PlaceOrderError};
		} else {
			return paypalResult;   
		}
	}
	return { error:true	}
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;