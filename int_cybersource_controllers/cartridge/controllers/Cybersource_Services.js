'use strict';
/**
 * Controller that performs subscription related services of cards.
 * @module controllers/Cybersource_Services
 */

/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger.getLogger('Cybersource');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var Status = require('dw/system/Status');
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function PaypalExpressCheckout(args) {

	var Basket = args;
	var paypalCancelUrl = dw.web.URLUtils.https('Cart-Show');
	var paypalReturnUrl = dw.web.URLUtils.https('Cybersource-ProcessPaypalExpress');
	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource')
	let pdict = Cybersource.PaypalSetService({Basket:Basket,
		paypalOrigin:'cart',
		paypalCancelUrl:paypalCancelUrl,
		paypalReturnUrl:paypalReturnUrl});
	if(pdict.OK){
		response.redirect(pdict.paypalRedirectUrl);
	}else{
		 app.getView({
             Basket: args,
             PlaceOrderError: new Status(Status.ERROR, "confirm.error.technical"),
             EnableCheckout:true
         }).render('checkout/cart/cart');
	}
}

function Reversal(args) {
	Pipeline.execute('Cybersource_Services-Reversal');
	return;
}

function Start() {
	Pipeline.execute('Cybersource_Services-Start');
	return;
}

/*
 * Module exports
 */

/*
 * Local methods require guard change below usage
 */

exports.Start=guard.ensure(['https'], Start);
//exports.Start=Start;
exports.Reversal=guard.ensure(['https'], Reversal);
//exports.Reversal=Reversal;
/*
 * Local methods
 */
exports.PaypalExpressCheckout=PaypalExpressCheckout;