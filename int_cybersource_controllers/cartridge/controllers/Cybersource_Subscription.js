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
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');	
var app = require('app_storefront_controllers/cartridge/scripts/app');
var CardHelper = require('int_cybersource/cartridge/scripts/Helper/CardHelper');
var SubscriptionFacade = require('int_cybersource/cartridge/scripts/Facade/SubscriptionFacade');
var TestFacade = require('int_cybersource/cartridge/scripts/Facade/TestFacade');
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */

function CreateSubscriptionBilling(args) {
	 
	
	 var cardObject = CardHelper.CreateCybersourcePaymentCardObject("billing");
	 if(cardObject.success && cardObject.card !== null){
	 			
	 	 var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData("billing");
	 	 	if(billToResult.success && billToResult.billTo !== null){
	 						
	 				var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(args.Basket.getCurrencyCode(),args.Basket.getTotalGrossPrice().getValue().toFixed(2));
	 				if(purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null){
	 							
	 					var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals);
	 					if(subscriptionResult.success && subscriptionResult.serviceResponse !== null){
	 							cardObject = null;//null  the card object CyberSourcePaymentCard
	 							if(subscriptionResult.serviceResponse.reasonCode == 100 || subscriptionResult.serviceResponse.reasonCode == 480){
	 								return {ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode, subscriptionID: subscriptionResult.serviceResponse.SubscriptionIDToken};
	 							}
	 							else{
	 								return {error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
	 							}
	 					}
	 			}
	 		}
	 }
}

//Create Subscription for my account
function CreateSubscriptionMyAccount(args) {
	
	 var cardObject = CardHelper.CreateCybersourcePaymentCardObject("paymentinstruments");
	 if(cardObject.success && cardObject.card !== null){
	 			
	 	var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData("paymentinstruments");
 	 	if(billToResult.success && billToResult.billTo !== null){
 						
			var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(dw.system.Site.getCurrent().getDefaultCurrency(),"0");
			if(purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null){
						
				var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals)
				if(subscriptionResult.success && subscriptionResult.serviceResponse !== null){
						cardObject = null;//null  the card object CyberSourcePaymentCard
						if(subscriptionResult.serviceResponse.reasonCode == 100 || subscriptionResult.serviceResponse.reasonCode == 480){
							return {ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode, 
								subscriptionID: subscriptionResult.serviceResponse.SubscriptionIDToken};
						}
						else{
							return {error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
						}
				}
 			}
 		}
	 }
}

function DeleteSubscriptionAccount() {
	var TriggeredAction = request.triggeredFormAction;
	var subscriptionID = TriggeredAction.object.creditCardToken;
	if (empty(subscriptionID)) {
		return {ok: true};
	}
	var subscriptionResult = SubscriptionFacade.DeleteSubscription(subscriptionID);
	if(subscriptionResult.success && subscriptionResult.serviceResponse !== null){
		if(subscriptionResult.serviceResponse.reasonCode == 100){
			return {ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
		} else{
			return {error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
		}
	}
}


function CreateSubscription() {
	var result="";
	if(empty(request.httpParameterMap.service.stringValue)){
		session.forms.subscription.clearFormElement();
		app.getView().render('subscription/createsubscription');
		return;
	}
	var billTo,  purchaseTotals, card;
	result=CommonHelper.CreateCyberSourceBillToObject_UserData("subscription");
	if(result.success){
		billTo = result.billTo;
		result = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(session.forms.subscription.currency.htmlValue, session.forms.subscription.amount.htmlValue);
		if(result.success){
			purchaseTotals = result.purchaseTotals;
			result = CardHelper.CreateCybersourcePaymentCardObject("subscription");
			if(result.success){
				card = result.CyberSourceCard;
				result=SubscriptionFacade.CreateSubscription(billTo,card, purchaseTotals);
				session.forms.subscription.clearFormElement();
				if(result.success){
				app.getView({subscriptionResponse:result.serviceResponse}).render('subscription/createsubscriptionresult');
				return;
				}
			}
		}
		
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}
		
function ViewSubscription() {
	
	var subscriptionaction, subscriptionResult;
	if(empty(request.httpParameterMap.service.stringValue)){
		subscriptionaction=dw.web.URLUtils.https('Cybersource_Subscription-ViewSubscription','service','view');
		session.forms.subscription.clearFormElement();
		app.getView({subscriptionaction:subscriptionaction}).render('subscription/viewsubscriptionform');
		return;
	} else {
		 subscriptionResult=SubscriptionFacade.ViewSubscription(session.forms.subscription.subscriptionID.htmlValue);
		session.forms.subscription.clearFormElement();
		if(subscriptionResult.success){
			app.getView(subscriptionResult.response).render('subscription/viewsubscriptionresult');
			return;
		}		
	}
	app.getView({
        log : !empty(subscriptionResult.errorMsg) ? subscriptionResult.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}

function UpdateSubscription() {
	
	if(empty(request.httpParameterMap.service.stringValue)){
		session.forms.subscription.clearFormElement();
		app.getView().render('subscription/updatesubscriptionform');
		return;
	}
		var result={};
		var billTo,  purchaseTotals, card;
		result= CommonHelper.CreateCyberSourceBillToObject_UserData("subscription");
			if(result.success){
				billTo = result.billTo;
				result = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(session.forms.subscription.currency.htmlValue, session.forms.subscription.amount.htmlValue);
					if(result.success){
						purchaseTotals = result.purchaseObject;
						result = CardHelper.CreateCybersourcePaymentCardObject("subscription");
							if(result.success){
								card = result.card;
								var subscriptionID=session.forms.subscription.subscriptionID.htmlValue;
								result=SubscriptionFacade.UpdateSubscription(billTo,card, purchaseTotals,subscriptionID);
								session.forms.subscription.clearFormElement();
									if(result.success){
										app.getView(result.response).render('subscription/updatesubscriptionresult');
										return;
									}
							}
					}
		
			}
			app.getView({
		        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
		    }).render('custom/scripterror');
			return;
}

function DeleteSubscription() {

	var subscriptionaction;
		if(empty(request.httpParameterMap.service.stringValue)){
			subscriptionaction=dw.web.URLUtils.https('Cybersource_Subscription-DeleteSubscription','service','delete');
			session.forms.subscription.clearFormElement();
			app.getView({subscriptionaction:subscriptionaction}).render('subscription/viewsubscriptionform');
			return;
		}
	var deleteSubscriptionResult=SubscriptionFacade.DeleteSubscription(session.forms.subscription.subscriptionID.htmlValue);
		session.forms.subscription.clearFormElement();
		if(deleteSubscriptionResult.success){
			app.getView({serviceResponse:deleteSubscriptionResult.serviceResponse}).render('subscription/deletesubscriptionresult');
			return;
		}
		app.getView({
	        log : !empty(deleteSubscriptionResult.errorMsg) ? deleteSubscriptionResult.errorMsg : 'System Exception occured contact administrator' 
	    }).render('custom/scripterror');
		return;
}

function OnDemandPayment() {
	 Pipeline.execute('Cybersource_Subscription-OnDemandPayment');
	return;
}
function Start() {
	app.getView().render('subscription/subscription');
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

/*
 * Local methods testing
 */
/*
exports.CreateSubscription=guard.ensure(['https'], CreateSubscription);
exports.ViewSubscription=guard.ensure(['https'], ViewSubscription);
exports.UpdateSubscription=guard.ensure(['https'], UpdateSubscription);
exports.DeleteSubscription=guard.ensure(['https'], DeleteSubscription);
exports.OnDemandPayment=guard.ensure(['https'], OnDemandPayment);
exports.Start=guard.ensure(['https'], Start);
*/
/*
 * Local methods production uncomment them
 */
exports.CreateSubscription=CreateSubscription;
exports.ViewSubscription=ViewSubscription;
exports.UpdateSubscription=UpdateSubscription;
exports.DeleteSubscription=DeleteSubscription;
exports.OnDemandPayment=OnDemandPayment;
exports.Start=Start;
