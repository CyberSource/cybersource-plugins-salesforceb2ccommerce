'use strict';

/* API Includes */
var Cart = require('~/cartridge/scripts/models/CartModel');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var app = require('~/cartridge/scripts/app');
/**
 * This is where additional BillMeLaterl integration would go. The current implementation simply creates a payment
 * method and returns 'success'.
 */
function Handle(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	if (!empty(PaymentMethod)) {
	    var cart = Cart.get(args.Basket);
	    var isPaymentInstrumentCreated = false;
        Transaction.wrap(function () {
            cart.removeExistingPaymentInstruments(PaymentMethod);
            cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_BML);
            cart.removeExistingPaymentInstruments('PayPal');
            cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
            
            cart.createPaymentInstrument(PaymentMethod, cart.getNonGiftCertificateAmount());
            isPaymentInstrumentCreated = true;
        });
        if (isPaymentInstrumentCreated) {
        	return {success: true};
        }
	}
	return {error:true};
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
    var paymentInstrument = args.PaymentInstrument;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    
	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
	
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
