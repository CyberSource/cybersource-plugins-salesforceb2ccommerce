'use strict';
/**
 * Controller that performs paypal external call.
 * @module controllers/Cybersource_External
 */

/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger.getLogger('Cybersource');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
/**
 * Authorizes a payment using a paypal external call.
 */
function AuthorizePaypal(args) {
	Pipeline.execute('Cybersource_External-AuthorizePaypal');
	return;
}
/*
 * Module exports
 */

/*
 * Local methods require guard change below usage
 */

exports.Start=guard.ensure(['https'], Start);
