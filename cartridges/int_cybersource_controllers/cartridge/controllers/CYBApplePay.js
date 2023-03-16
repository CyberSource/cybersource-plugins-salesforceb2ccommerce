'use strict';
/**
 * Controller that performs apple pay authorization.
 *
 * @module controllers/CYBApplePay
 */
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var guard = require(CybersourceConstants.GUARD);

/**
 * Authorizes a payment using a ApplePay using API method. This would expect JSON input and returns JSON output.
 */
function Authorize() {
    var response = require(CybersourceConstants.CS_CORE_SCRIPT+'mobilepayments/adapter/MobilePaymentsAdapter').ProcessPayment();	    
	var app = require(CybersourceConstants.APP);
	var returnObj = {ERRORCODE:  response.ERRORCODE || response.ServiceResponse.ERRORCODE, ERRORMSG: response.ERRORMSG || response.ServiceResponse.ERRORMSG, ServiceResponse: response.ServiceResponse ? response.ServiceResponse.serviceResponse : null};
	app.getView('ApplyePay', returnObj).render('mobilepayment/mobilepaymentresponse');
	return;
}

//Module.exports
exports.Authorize=guard.ensure(['https'], Authorize);