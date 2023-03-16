'use strict';
/**
 * BANK_TRANSFER controller contains all method related to this type of payment instrument
 * @module controllers/BANK_TRANSFER
 */
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var bankTransferAdaptor = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/banktransfer/adaptor/BankTransferAdaptor');
/**
 * This is where current implementation simply creates a payment method and returns 'success'.
*/

function Handle(args) {
	
	//get the basket from input
	var basket = args.Basket;	
	//call method to handle the request
	var response = bankTransferAdaptor.HandleRequest(basket);
	//return response
	return response;
}

/**
 * Authorizes a payment using a Bank Transfer. The payment is authorized by using the BANK_TRANSFER processor only and
 * setting the order no as the transaction ID. Customizations may use other processors and custom logic to authorize
 * payment.
 */
function Authorize(args) {
	//declare local variables
	var orderNo = args.OrderNo;
	var paymentInstrument = args.PaymentInstrument;
	//call method to handle the request
	var response = bankTransferAdaptor.AuthorizeRequest(orderNo,paymentInstrument);
	//return response
	return response;
}


/*
 * Module exports
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
