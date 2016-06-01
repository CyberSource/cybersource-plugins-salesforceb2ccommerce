'use strict';
/**
 * Controller that performs POS related services of cards.
 * @module controllers/Cybersource_POS
 */

/* API Includes */
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger.getLogger('Cybersource');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the POS specific processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function AuthorizePOS(args) {
	let pdict = Pipeline.execute('Cybersource_POS-AuthorizePOS', {
		storeLocation: args.storeLocation,
		entryMode:args.entryMode,
		accountNumber:args.accountNumber,
		cardType:args.cardType,
		cvnNumber:args.cvnNumber,
		expiryMonth:args.expiryMonth,
		expiryYear:args.expiryYear,
		amount:args.amount,
		currency:args.currency,
		cardPresent:args.cardPresent,
		catLevel:args.catLevel,
		terminalCapability:args.terminalCapability,
		terminalID:args.terminalID,
		trackData:args.trackData,
		pos_ordernumber:args.pos_ordernumber,
		pos:args.pos
	});
	logger.debug('AuthorizePOS response EndNodeName {0}',pdict.EndNodeName);
	if(pdict.error)
	{
			return {error: true, decision: pdict.decision, reasonCode:pdict.reasonCode, cybersource_error:pdict.cybersource_error, errorCode:pdict.errorCode, 
				log:pdict.log, ScriptLog:pdict.ScriptLog, invalidField:pdict.invalidField, missingField:pdict.missingField};
	}
	
	return pdict;
}
function TestAuthorizePOS(args) {
	Pipeline.execute('Cybersource_POS-TestAuthorizePOS');
	return;
}
/*
 * Module exports
 */

/*
 * Local methods
 */
exports.AuthorizePOS=AuthorizePOS;
exports.TestAuthorizePOS=guard.ensure(['https'], TestAuthorizePOS);