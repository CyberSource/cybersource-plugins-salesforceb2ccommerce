'use strict';
/**
 * Controller that performs apple pay authorization along with services like (AVS, DAV, Fingerprint).
 *
 * @module controllers/Cybersource_ApplePay
 */

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var ApplePayHelper = require('int_cybersource/cartridge/scripts/Helper/ApplePayHelper');
var ApplePayFacade = require('int_cybersource/cartridge/scripts/Facade/ApplePayFacade');
var CardHelper = require('int_cybersource/cartridge/scripts/Helper/CardHelper');
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');
var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');

/**
 * Authorizes a payment using a ApplePay using API method. This would expect JSON input and returns JSON output.
 */
function Authorize(args) {
    var ERRORCODE, ERRORMSG, serviceResponse, rawXMLResponse;
	var result = ApplePayHelper.validateApplePayRequest();
	if (result.success) {
	    var orders = OrderMgr.searchOrders('orderNo={0}', 'creationDate desc', result.OrderNo);
	    if (empty(orders)) {
	    	ERRORCODE = Resource.msg('cyb.applepay.errorcode.ordernotfound', 'cybapplepay', null);
	    	ERRORMSG = Resource.msgf('cyb.applepay.errormsg.ordernotfound', 'cybapplepay', null, result.OrderNo);
	    } else {
		    var order = orders.next();
		    if (empty(order.getPaymentInstruments('DW_APPLE_PAY'))) {
		    	ERRORCODE = Resource.msg('cyb.applepay.errorcode.nonapplepayorder', 'cybapplepay', null);
		    	ERRORMSG = Resource.msgf('cyb.applepay.errormsg.nonapplepayorder', 'cybapplepay', null, result.OrderNo);
		    } else if (order.status!=dw.order.Order.ORDER_STATUS_CREATED) {
		    	ERRORCODE = Resource.msg('cyb.applepay.errorcode.nonqualifiedorder', 'cybapplepay', null);
		    	ERRORMSG = Resource.msgf('cyb.applepay.errormsg.nonqualifiedorder', 'cybapplepay', null, result.OrderNo);
		    } else {
		    	if (!empty(result.PaymentData)) {
		    		result = ApplePayFacade.ApplePayAPIAuthRequest(order, result.OrderNo, CommonHelper.GetIPAddress(), result.PaymentData);
		    	} else {
		    		var param = result.requestParam;
		    		result = ApplePayFacade.ApplePayInAppAuthRequest(order, result.OrderNo, CommonHelper.GetIPAddress(), param.Cryptogram, param.NetworkToken, 
		    				param.TokenExpirationMonth,	param.TokenExpirationYear, param.CardType);
		    	}
		    	if (result.error) {
		    		ERRORCODE = result.ErrorCode;
		    		ERRORMSG = Resource.msgf('cyb.applepay.errormsg.servicefailure', 'cybapplepay', null, result.OrderNo);
		    	} else {
		    		serviceResponse = result.serviceResponse;
		    		var orderUpdateResult = PaymentInstrumentUtils.ApplePayOrderUpdate(order, serviceResponse);
		    		if (!orderUpdateResult) {
		    			ERRORCODE = Resource.msg('cyb.applepay.errorcode.systemfailure', 'cybapplepay', null);
				    	ERRORMSG = Resource.msgf('cyb.applepay.errormsg.systemfailure', 'cybapplepay', null, result.OrderNo);
		    		}
		    	}
		    }
	    }
	} else if (result.error) {
		ERRORCODE = result.ErrorCode;
		ERRORMSG = result.ErrorMsg;
	}
	app.getView('ApplePay',{ERRORCODE:ERRORCODE, ERRORMSG:ERRORMSG, ServiceResponse:serviceResponse}).render('applepay/applepayjson');
	return;
}

//Module.exports
exports.Authorize=guard.ensure(['https'], Authorize);