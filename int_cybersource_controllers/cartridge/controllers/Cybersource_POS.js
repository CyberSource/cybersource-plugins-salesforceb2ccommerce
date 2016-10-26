'use strict';
/**
 * Controller that performs POS related services of cards.
 * @module controllers/Cybersource_POS
 */

/* API Includes */
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger.getLogger('Cybersource');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var POSFacade = require('int_cybersource/cartridge/scripts/Facade/POSFacade');
var POSHelper = require('int_cybersource/cartridge/scripts/Helper/POSHelper');
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the POS specific processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function AuthorizePOS(args) {
	var result, card, purchaseObject;
	var storeLocation = args.storeLocation;
	var entryMode = args.entryMode;
	var accountNumber:args.accountNumber;
	var cardType:args.cardType;
	var cvnNumber:args.cvnNumber;
	var expiryMonth:args.expiryMonth;
	var expiryYear:args.expiryYear;
	var amount:args.amount;
	var currency:args.currency;
	var cardPresent:args.cardPresent;
	var catLevel:args.catLevel;
	var terminalCapability:args.terminalCapability;
	var terminalID:args.terminalID;
	var trackData:args.trackData;
	var pos_ordernumber:args.pos_ordernumber;
	var posObject:args.posObject;
	if (!empty(storeLocation)) {
		if (!(!empty(entryMode) && entryMode.equals("swiped"))) {
			result = POSHelper.CreateCyberSourcePaymentCardObject_UserData(accountNumber, cardType, cvnNumber, expiryMonth, expiryYear);
			if (result.error) {return result;} 
			card = result.card;
		}
		result = POSHelper.CreateCyberSourcePurchaseTotalsObject_UserData(amount, currency);
		if (result.error) {return result;} 
		purchaseObject = result.purchaseObject;
		result = POSHelper.CreateCyberSourcePOSObject_UserData(cardPresent, entryMode, catLevel, terminalCapability, terminalID, trackData);
		if (result.error) {return result;} 
		posObject = result.posObject;
		return POSFacade.POSAuthRequest(storeLocation,pos_ordernumber,card,purchaseObject,posObject);
	}
	return {error:true;}
}
function TestAuthorizePOS(args) {
	var ActionPOS = "Cybersource_POS-TestAuthorizePOS";
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.pos.clearFormElement();
		app.getView({
			ActionPOS: ActionPOS
		}).render('pos/createpos');
		return;	
	} else if (!session.forms.pos.valid) {
		app.getView({
			ActionPOS: ActionPOS
		}).render('pos/createpos');
		return;	
	} else {
	var cardPresent = session.forms.pos.cardPresent.htmlValue;
	var terminalID = session.forms.pos.terminalID.htmlValue;
	var catLevel = session.forms.pos.catLevel.htmlValue;
	var entryMode = session.forms.pos.entryMode.htmlValue;
	var terminalCapability = session.forms.pos.terminalCapability.htmlValue;
	var currency = session.forms.pos.currency.htmlValue;
	var amount = session.forms.pos.amount.htmlValue;
	var storeLocation = session.forms.pos.storeLocation.htmlValue;
	var pos_ordernumber = 'POS';
	var accountNumber, cardType, cvnNumber, expiryMonth, expiryYear, trackData;
	if (session.forms.pos.entryMode.htmlValue.equals("keyed")) {
	accountNumber = CurrentForms.pos.accountNumber.htmlValue
	cardType = CurrentForms.pos.cardType.htmlValue
	cvnNumber = CurrentForms.pos.cvnNumber.htmlValue
	expiryMonth = CurrentForms.pos.expiryMonth.htmlValue
	expiryYear = CurrentForms.pos.expiryYear.htmlValue
	} else {
	trackData = CurrentForms.pos.trackData.htmlValue;
	}
	var result = AuthorizePOS({storeLocation:storeLocation, entryMode:entryMode,
		accountNumber:accountNumber,
		cardType:cardType,
		cvnNumber:cvnNumber,
		expiryMonth:expiryMonth,
		expiryYear:expiryYear,
		amount:amount,
		currency:currency,
		cardPresent:cardPresent,
		catLevel:catLevel,
		terminalCapability:terminalCapability,
		terminalID:terminalID,
		trackData:trackData,
		pos_ordernumber:pos_ordernumber,
		posObject:posObject});
	session.forms.pos.clearFormElement();
	app.getView({
			ActionPOS: ActionPOS,
			posAuthResponse: result.serviceResponse
		}).render('pos/postransactionresult');
	return;
	}
}
/*
 * Local methods
 */
exports.AuthorizePOS=AuthorizePOS;
//exports.TestAuthorizePOS=guard.ensure(['https'], TestAuthorizePOS);
/*
 * Local methods testing
 */
exports.TestAuthorizePOS=TestAuthorizePOS;