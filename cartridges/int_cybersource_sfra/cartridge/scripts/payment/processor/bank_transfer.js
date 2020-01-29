'use strict';
/**
 * BANK_TRANSFER controller contains all method related to this type of payment instrument
 * @module controllers/BANK_TRANSFER
 */
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var bankTransferAdaptor = require(CybersourceConstants.CS_CORE_SCRIPT+'/banktransfer/adaptor/BankTransferAdaptor');
/**
 * This is where current implementation simply creates a payment method and returns 'success'.
*/

function Handle(basket) {
	
	var response = bankTransferAdaptor.HandleRequest(basket);
	//return response
	return response;	
}


/**
 * Authorizes a payment using a Bank Transfer. The payment is authorized by using the BANK_TRANSFER processor only and
 * setting the order no as the transaction ID. Customizations may use other processors and custom logic to authorize
 * payment.
 */
function Authorize(orderNumber,paymentInstrument) {
	
	var response = bankTransferAdaptor.AuthorizeRequest(orderNumber,paymentInstrument);
	//return response
	return response;
}


/*
 * Module exports
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
