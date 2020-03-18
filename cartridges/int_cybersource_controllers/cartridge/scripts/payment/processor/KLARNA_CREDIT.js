'use strict';
/**
 * KLARNA_CREDIT controller contains all method related to this type of payment instrument (Klarna Credit)
 * @module controllers/KLARNA_CREDIT
 */

/* API Includes */
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var klarnaAdaptor = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');

/**
 * This is where current implementation simply creates a payment method and returns 'success'.
*/

function Handle(args) {
	
	//get the basket from input
	var basket = args.Basket;	
	//call method to handle the request
	var response = klarnaAdaptor.HandleRequest(basket,true);
	//return response
	return response;
}

/**
 * Authorizes a payment using a Klarna. The payment is authorized by using the KLARNA_CREDIT processor only and
 * setting the order no as the transaction ID. Customizations may use other processors and custom logic to authorize
 * payment.
 */
function Authorize(args) {
	//declare local variables
	var orderNo = args.OrderNo;
	var paymentInstrument = args.PaymentInstrument;
	//get the token from parameter map
	var token = request.httpParameterMap.klarnaAuthToken.value;
	//call method to handle the request
	var response = klarnaAdaptor.AuthorizeRequest(orderNo,paymentInstrument,token);
	//return response
	return response;
}

/*
 * Module exports
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
