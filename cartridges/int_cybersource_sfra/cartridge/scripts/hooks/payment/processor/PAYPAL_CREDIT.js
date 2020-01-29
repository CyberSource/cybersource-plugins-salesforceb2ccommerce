'use strict';
/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var CybersourceConstants =  require('~/cartridge/scripts/utils/CybersourceConstants');
var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CommonHelper');
/**
 * Verifies a credit card against a valid card number and expiration date and
 * possibly invalidates invalid form fields. If the verification was successful
 * a credit card payment instrument is created. The pipeline just reuses the
 * basic credit card validation pipeline from processor BASIC_CREDIT.
 */
function Handle(args) {
    
	var basket = args;
	Transaction.wrap(function () {
		CommonHelper.removeExistingPaymentInstruments(basket);
		basket.createPaymentInstrument(CybersourceConstants.METHOD_PAYPAL_CREDIT, CommonHelper.CalculateNonGiftCertificateAmount(basket));
    });

    return {success: true};
}

/**
 * Authorizes a payment using a credit card. A real integration is not
 * supported, that's why the pipeline returns this state back to the calling
 * checkout pipeline.
 */
function Authorize(orderNumber, paymentInstrument) {
	var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
	var adapter = require(CybersourceConstants.PAYPAL_ADAPTOR);
	//Logic to determine if this is standard/custom Paypal order
	Transaction.wrap(function () {
	        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
	});
	var OrderMgr = require('dw/order/OrderMgr');
	var order = OrderMgr.getOrder(orderNumber);
	var paymentResponse = adapter.PaymentService(order,paymentInstrument);
	if(paymentResponse.authorized)
	{	
		return {authorized: true}; 
	}else if(paymentResponse.pending){
		return {review: true}; 
	}else if(paymentResponse.rejected){
		return {rejected: true}; 
	}
	else{
		return {error: true};
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
