/**
* Description of the Controller and the logic it provides
*
* @module  controllers/CYBWeChat
*/

'use strict';
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var guard = require(CybersourceConstants.GUARD);
var app = require(CybersourceConstants.APP);


function CheckStatusService() {
	 var cart = app.getModel('Cart').get();
	 var WeChatAdaptor = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/wechat/adaptor/WeChatAdaptor');
	 let r = require(CybersourceConstants.SG_CONTROLLER+'/cartridge/scripts/util/Response');
	 var paymentInstruments = cart.object.paymentInstruments ,pi ;
	 	// Iterate on All Payment Instruments and select PayPal
	 for each(var paymentInstrument in paymentInstruments ) {
		if(paymentInstrument.paymentMethod.equals(CybersourceConstants.WECHAT_PAYMENT_METHOD))
		{
			pi = paymentInstrument;
		}
	 }
	 var response = WeChatAdaptor.CheckStatusService(cart.object,pi);
	 	 
	 r.renderJSON(response);
	 return;
}

exports.CheckStatusService = guard.ensure(['https', 'get'],CheckStatusService);