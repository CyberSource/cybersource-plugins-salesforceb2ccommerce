'use strict';
/**
 * Controller that performs subscription related services of cards.
 * @module controllers/Cybersource_Subscription
 */

/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger.getLogger('Cybersource');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function CreateSubscriptionBilling(args) {
	let pdict = Pipeline.execute('Cybersource_Subscription-CreateSubscriptionBilling', {
	    Basket:args.Basket
	});
	logger.debug('CreateSubscriptionBilling response EndNodeName {0}',pdict.EndNodeName);
	switch(pdict.EndNodeName)
	{
		case 'ok':
			return {ok: true, decision: pdict.decision, reasonCode:pdict.reasonCode, subscriptionID: pdict.subscriptionID};
		
		case 'error':
			return {error: true, decision: pdict.decision, reasonCode:pdict.reasonCode};
		
	}
	
	return;
}

function CreateSubscriptionMyAccount(args) {
	let pdict = Pipeline.execute('Cybersource_Subscription-CreateSubscriptionMyAccount');
	logger.debug('CreateSubscriptionMyAccount response EndNodeName {0}',pdict.EndNodeName);
	switch(pdict.EndNodeName)
	{
		case 'ok':
			return {ok: true, decision: pdict.decision, reasonCode:pdict.reasonCode, subscriptionID: pdict.subscriptionID};
		
		case 'error':
			return {error: true, decision: pdict.decision, reasonCode:pdict.reasonCode};
		
	}
	
	return;
}

function DeleteSubscriptionAccount() {
	let pdict = Pipeline.execute('Cybersource_Subscription-DeleteSubscriptionAccount', {
	    TriggeredAction:request.triggeredFormAction
	});
	logger.debug('DeleteSubscriptionAccount response EndNodeName {0}',pdict.EndNodeName);
	switch(pdict.EndNodeName)
	{
		case 'ok':
			return {ok: true, decision: pdict.decision, reasonCode:pdict.reasonCode};
		
		case 'error':
			return {error: true, decision: pdict.decision, reasonCode:pdict.reasonCode};
		
	}
	
	return;
}

function CreateSubscription() {
	 Pipeline.execute('Cybersource_Subscription-CreateSubscription');
	return;
}

function ViewSubscription() {
	 Pipeline.execute('Cybersource_Subscription-ViewSubscription');
	return;
}

function UpdateSubscription() {
	 Pipeline.execute('Cybersource_Subscription-UpdateSubscription');
	return;
}

function DeleteSubscription() {
	 Pipeline.execute('Cybersource_Subscription-DeleteSubscription');
	return;
}

function OnDemandPayment() {
	 Pipeline.execute('Cybersource_Subscription-OnDemandPayment');
	return;
}
function Start() {
	 Pipeline.execute('Cybersource_Subscription-Start');
	return;
}
/*
 * Module exports
 */

/*
 * Local methods
 */
exports.CreateSubscriptionMyAccount=CreateSubscriptionMyAccount;
exports.CreateSubscriptionBilling=CreateSubscriptionBilling;
exports.DeleteSubscriptionAccount=DeleteSubscriptionAccount;
//exports.CreateSubscription=guard.ensure(['https'], CreateSubscription);
//exports.ViewSubscription=guard.ensure(['https'], ViewSubscription);
//exports.UpdateSubscription=guard.ensure(['https'], UpdateSubscription);
//exports.DeleteSubscription=guard.ensure(['https'], DeleteSubscription);
//exports.OnDemandPayment=guard.ensure(['https'], OnDemandPayment);
//exports.Start=guard.ensure(['https'], Start);

/*
 * Local methods testing
 */
exports.CreateSubscription=CreateSubscription;
exports.ViewSubscription=ViewSubscription;
exports.UpdateSubscription=UpdateSubscription;
exports.DeleteSubscription=DeleteSubscription;
exports.OnDemandPayment=OnDemandPayment;
exports.Start=Start;
