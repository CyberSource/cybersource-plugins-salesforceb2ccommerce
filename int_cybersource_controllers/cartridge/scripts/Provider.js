'use strict';

/**
 * script that performs handling of all redirect URL responses from cybersource.
 *
 * @module scripts/Provider
 */

/* API Includes */
var app = require('app_storefront_controllers/cartridge/scripts/app');

/**
 * Process redirect url response of secure acceptance redirect
 */
function saredirect(args) {
	var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
	return secureAcceptanceHelper.SAResponse();
}

/**
 * Process redirect url response of secure acceptance iframe
 */
function saiframe(args) {
	var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
	return secureAcceptanceHelper.SAResponse();
}

/**
 * Process redirect url response of alipay
 */
function alipay(args) {
	
	var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
	var alipayHelper = require('int_cybersource/cartridge/scripts/helper/AlipayHelper');
    var orderResult = Cybersource.GetOrder({Order:args.Order});
    var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');
	if (orderResult.error || empty(orderResult.Order.getPaymentInstruments(CybersourceConstants.METHOD_ALIPAY))) {
		app.getController('Cart').Show();
        return;
	}
	var order = orderResult.Order;
	var alipayResult = alipayHelper.CheckAlipayPaymentStatus({Order:order});
	if (alipayResult.summaryconfirmation) {
		app.getController('COPlaceOrder').ReviewOrder({Order:order});
		return;
	} else if (alipayResult.submit) {
		app.getController('COPlaceOrder').SubmitOrder({Order:order});
		return;
	} else if (alipayResult.error)
	{
		app.getController('COPlaceOrder').Fail({Order:order});
        return;
	}
}

/**
 * Process redirect url response of card 3d payer auth
 */
function card(args) {
	var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
    var orderResult = Cybersource.GetOrder({Order:args.Order});
	if (orderResult.error) {
		app.getController('Cart').Show();
        return;
	}
	var order = orderResult.Order;
	if (session.privacy.process3DRequest) {
		Cybersource.Process3DRequest({Order:order});
		return;
	} else if (session.privacy.process3DRequestParent) {
		var process3DResult = Cybersource.Process3DRequestParent({Order:order});
		if (process3DResult.fail)
		{
			app.getController('COPlaceOrder').Fail({Order:order,PlaceOrderError:process3DResult.PlaceOrderError});
			return;
		} else if (process3DResult.review)
		{
			app.getController('COPlaceOrder').ReviewOrder({Order:order,skipOrderPlacement:false});
			return;
		} else if (process3DResult.home) {
			app.getController('Home').Show();
			return;
		}
	}
    app.getController('COPlaceOrder').SubmitOrder({Order:order,skipOrderPlacement:args.skipOrderPlacement});
}

/**
 * User is redirected to review order page, if order is not there then to cart page. 
 */

function saconfirm(args) {
	var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
    var orderResult = Cybersource.GetOrder({Order:args.Order});
	if (orderResult.error) {
		app.getController('Cart').Show();
        return;
	}
	var order = orderResult.Order;
	app.getController('COPlaceOrder').ReviewOrder({Order:order});
}

/**
 * User is redirected to summary page with the error message, if order is not there then to cart page. 
 */
function safail(args) {
	var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
    var orderResult = Cybersource.GetOrder({Order:args.Order});
	if (orderResult.error) {
		app.getController('Cart').Show();
        return;
	}
	var order = orderResult.Order;
	var Status = require('dw/system/Status');
	app.getController('COSummary').Start({Order:order, PlaceOrderError:new Status(Status.ERROR, "confirm.error.declined")});
}

/**
 * Switch case which ever provider is provided, according to that action is performed.
 */

function check(args) {
	var providerParam = request.httpParameterMap.provider.stringValue;
	switch (providerParam) {
		case 'saredirect':
			return saredirect(args);
		case 'saiframe':
			return saiframe(args);
		case 'card':
			return card(args);
		case 'alipay':
			return alipay(args);
		case 'saconfirm':
			return saconfirm(args);
		case 'safail':
			return safail(args);
		default:
			app.getController('Cart').Show();
			break;
	}
	return;
}

/*
* Module exports
*/
exports.card=card;
exports.alipay=alipay;
exports.saredirect=saredirect;
exports.saiframe=saiframe;
exports.saconfirm=saconfirm;
exports.safail=safail;
exports.Check=check;