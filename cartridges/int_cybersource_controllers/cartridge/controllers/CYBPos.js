'use strict';
/**
 * Controller that performs POS related services of cards.
 * @module controllers/CYB_Pos
 */

/* API Includes */
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var guard = require(CybersourceConstants.GUARD);
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the POS specific processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function AuthorizePOS(args) {
	var POSAdaptor = require(CybersourceConstants.CS_CORE_SCRIPT+'pos/adaptor/POSAdaptor');
	var result = POSAdaptor.InitiatePOSAuthRequest(args);
	if (result.success){
		return {authorized:true, posAuthResponse:result.serviceResponse};
	}
	return {error:true};
}
/*
 * Local methods
 */
exports.AuthorizePOS=AuthorizePOS;
exports.AuthorizePOS=guard.ensure(['https'],AuthorizePOS);

