'use strict';

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');	
var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');
/**
 * This is where current implementation simply creates a payment method and returns 'success'.
 */
function Handle(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	if (!empty(PaymentMethod)) {
	    var cart = Cart.get(args.Basket);
	    var isPaymentInstrumentCreated = false;
        Transaction.wrap(function () {
        	CommonHelper.removeExistingPaymentInstruments(cart);
            
            cart.createPaymentInstrument(PaymentMethod, cart.getNonGiftCertificateAmount());
            isPaymentInstrumentCreated = true;
        });
        if (isPaymentInstrumentCreated) {
        	return {sucess: true};
        }
	}
	return {error:true};
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the CYBERSOURCE_ALIPAY processor only and
 * setting the order no as the transaction ID. Customizations may use other processors and custom logic to authorize
 * credit card payment.
 */
function Authorize(args) {
	var orderNo = args.OrderNo;
	var Order = OrderMgr.getOrder(orderNo);
    var paymentInstrument = args.PaymentInstrument;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    
    var alipayResult = Cybersource.AuthorizeAlipay({Order:Order, orderNo:orderNo, PaymentInstrument: paymentInstrument});
	if (alipayResult.pending){
		app.getView({alipayReturnUrl:alipayResult.alipayReturnUrl}).render('custom/alipayintermediate');
		return {end:true};
	} else {
		return alipayResult;   
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
