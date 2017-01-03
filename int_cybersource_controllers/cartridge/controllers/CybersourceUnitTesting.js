'use strict';
/**
 * Controller that performs testing related services of cybersource.
 * @module controllers/CybersourceUnitTesting
 */

/* API Includes */

var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var TestFacade = require('int_cybersource/cartridge/scripts/facade/TestFacade');
var TestHelper = require('int_cybersource/cartridge/scripts/helper/TestHelper');
var URLUtils = require('dw/web/URLUtils');

/**
 * Controller function to unit test the credit card authorization service. 
 * With the hard coded data, just to verify services are working.
 */
function TestCCAuth(args) {
	var billTo, shipTo, purchaseTotals, card;
	var result = TestHelper.CreateCyberSourceBillToObject();
	if (result.success) {
		billTo = result.billTo;
		result = TestHelper.CreateCyberSourceShipToObject();
		if (result.success) {
			shipTo = result.shipTo;
			result = TestHelper.CreateCyberSourcePurchaseTotalsObject();
			if (result.success) {
				purchaseTotals = result.purchaseTotals;
				result = TestHelper.CreateCyberSourcePaymentCardObject();
				if (result.success) {
					card = result.card;
					result = TestFacade.TestCCAuth(billTo, shipTo, card, purchaseTotals);
					if (result.success) {
						app.getView({
							CCAuthResponse:result.serviceResponse
					    }).render('custom/CCAuthUnitTestResults');
						return;
					} 
				}
			}
		}
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
}

/**
 * Controller function to unit test the tax service. 
 * With the hard coded data, just to verify services are working.
 */
function TestTax(args) {
	var TaxHelper = require('int_cybersource/cartridge/scripts/helper/TaxHelper');
	var billTo, shipTo, purchaseTotals, card, taxRequestObject, shipFrom, items, itemMap;
	var result = TestHelper.CreateCyberSourceBillToObject();
	if (result.success) {
		billTo = result.billTo;
		result = TestHelper.CreateCyberSourceShipToObject();
		if (result.success) {
			shipTo = result.shipTo;
			result = TestHelper.CreateCyberSourcePurchaseTotalsObjectTax();
			if (result.success) {
				purchaseTotals = result.purchaseTotals;
				result = TestHelper.CreateCyberSourcePaymentCardObject();
				if (result.success) {
					card = result.card;
					result = TaxHelper.CreateCyberSourceTaxRequestObject();
					taxRequestObject = result.taxRequestObject;
					var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
					result = CommonHelper.CreateCybersourceShipFromObject();
					if (result.success) {
						shipFrom = result.shipFrom;
						result = TestHelper.CreateCybersourceTaxationItems();
						if (result.success) {
							items = result.items;
							itemMap = result.itemMap;
							result = TestFacade.TestTax(billTo, shipTo, card, purchaseTotals, shipFrom, taxRequestObject, items, itemMap);
							if (result.success) {
								app.getView({
									taxResponse:result.serviceResponse
							    }).render('custom/TaxUnitTestResults');
								return;
							} 
						}
					}
				}
			}
		}
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator'
    }).render('custom/scripterror');
}

/**
 * Controller function to unit test the DAV service. 
 * With the hard coded bill to and ship to data, just to verify services are working.
 */
function TestDAVCheck(args) {
	var result="";
	var billTo, shipTo;
	result = TestHelper.CreateMockCybersourceBillToObject();
	billTo = result.billTo;
	result = TestHelper.CreateMockCybersourceShipToObject();
	shipTo = result.shipTo;
	result = TestFacade.TestDAVRequest( billTo, shipTo );
	app.getView({
		davResponse : result.serviceResponse,
		shipto: shipTo,
		billto: billTo,
		StandardizedAddress: result.serviceResponse.StandardizedAddress,
		ScriptLog : !empty(result.errorMsg) ? result.errorMsg : '' 
    }).render('custom/TestDAVCheckResults');
}

/**
 * Controller function to unit test the Payer authentication service. 
 * With the hard coded card data, just to verify service is working.
 */

function TestPA(args) {
	if (!empty(request.httpParameterMap.MD.stringValue)) {
		app.getView({
			PAResponseMD:request.httpParameterMap.MD.stringValue,
			PAResponsePARes:request.httpParameterMap.PaRes.stringValue
	    }).render('cart/payerauthenticationredirecttest');
		return;
	}
	var result = "";
	var card, paResponse, pavResponse;
	if (empty(request.httpParameterMap.PAResponseMD.stringValue)) {
		result = TestHelper.CreateCyberSourcePaymentCardObject();
		card = result.card;
		result = TestFacade.TestPayerAuthEnrollCheck( card );
		if (result.success) {
			paResponse = result.serviceResponse;
			if (paResponse.ReasonCode === 100 || empty(paResponse.AcsURL)) {
				app.getView({PAResponse:paResponse, PAVResponse:''}).render('custom/PATestResult');
				return;
			} else {
				session.custom.PayerAuthEnrollResponseObj = paResponse;
				app.getView({
					AcsURL:paResponse.AcsURL,
					PAReq:paResponse.PAReq
	}).render('cart/payerauthenticationtest');
				return;
			}
		}
	} else {
		var PayerAuthEnrollResponseObj = session.custom.PayerAuthEnrollResponseObj;
		session.custom.PayerAuthEnrollResponseObj = "";
		if (empty(PayerAuthEnrollResponseObj)) {
			PayerAuthEnrollResponseObj = "";
		}
		var PAResponsePARes = request.httpParameterMap.PAResponsePARes.stringValue;
		var PAResponseMD = request.httpParameterMap.PAResponseMD.stringValue;
		
		if (PAResponseMD !== session.sessionID) {
			app.getView({PAResponse:PayerAuthEnrollResponseObj, PAVResponse:''}).render('custom/PATestResult');
			return;
		}
		
		result = TestFacade.TestPayerAuthValidation(PAResponsePARes);
		if (result.success) {
			pavResponse = result.serviceResponse;
		}
		app.getView({PAResponse:PayerAuthEnrollResponseObj, PAVResponse:pavResponse}).render('custom/PATestResult');
		return;
	}
}

/**
 * Controller function to unit test the Finger print service. 
 * With the hard coded card data, just to verify service is working.
 */

function TestFingerprint(args) {
	app.getView().render('custom/TestFingerPrintRedirect');
}

/**
 * Controller function to unit test the Alipay payment service. 
 * With the hard coded card data, just to verify service is working.
 */

function TestAlipayInitiateService(args) {
	var Site = require('dw/system/Site');
	var alipayPaymentType=Site.getCurrent().getCustomPreferenceValue("apPaymentType");
	var currency = alipayPaymentType.equals('APD') ? 'CNY': null;
	var result = TestHelper.CreateCyberSourcePurchaseTotalsObject({currency:currency});
	if (result.success) {
		var purchaseTotals = result.purchaseTotals;
		result = TestFacade.TestAlipayInitiateRequest(purchaseTotals);
		if (result.success) {
			app.getView({
				alipayInitiateResponse:result.serviceResponse
	}).render('custom/AlipayInitiateServiceTestResults');
			return;
		}
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator'
    }).render('custom/scripterror');
}

/**
 * Controller function to unit test the Alipay Status Check service. 
 * With the hard coded card data, just to verify service is working.
 */
function TestAlipayCheckStatusService(args) {
	var result="";
	var RequestID = request.httpParameterMap.requestID.stringValue;
	if (RequestID) {
		result = TestFacade.TestAlipayCheckStatusRequest(RequestID);
		if (result.success) {
			app.getView({
				alipayCheckResponse:result.serviceResponse
	    }).render('custom/AlipayCheckStatusServiceTestResults');
			return;
		}
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'Missing requestID in parameter' 
    }).render('custom/scripterror');
}


/**
 * Controller function to unit test the Card capture service. 
 * With the hard coded card data, just to verify service is working.
 */ 
function TestCaptureCard(args) {
	var result="";
	var orderNo = request.httpParameterMap.oid.stringValue;
	var OrderMgr = require('dw/order/OrderMgr');
	var order = OrderMgr.getOrder(orderNo);
	if (order && order.paymentStatus.value != 2) {
		var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
		result = Cybersource.CaptureCard({Order:order});
	} else {order=null;}
	app.getView({
		CaptureResponse:result.CaptureResponse,
		ErrorMsg:result.errorMsg,
		Order:order
    }).render('custom/TestCCCaptureTestResults');
}

/**
 * Controller function to unit test the POS service. 
 * With the hard coded card data, just to verify service is working.
 */

function StartPOS(args) {
	var result="";
	var ActionPOS = "CybersourceUnitTesting-StartPOS";
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.pos.clearFormElement();
		app.getView({
			ActionPOS:ActionPOS
	    }).render('pos/createpos');
		return;
	} else if (!session.forms.pos.valid) {
		app.getView({
			ActionPOS:ActionPOS
	    }).render('pos/createpos');
		return;
	}
	var POSHelper = require('int_cybersource/cartridge/scripts/helper/POSHelper');	
	var card, purchaseObject, posObject, trackData;
	var cardPresent = session.forms.pos.cardPresent.htmlValue;
	var terminalID = session.forms.pos.terminalID.htmlValue;
	var catLevel = session.forms.pos.catLevel.htmlValue;
	var entryMode = session.forms.pos.entryMode.htmlValue;
	var terminalCapability = session.forms.pos.terminalCapability.htmlValue;
	var currency = session.forms.pos.currency.htmlValue;
	var amount = session.forms.pos.amount.htmlValue;
	var storeLocation = session.forms.pos.storeLocation.htmlValue;
	var pos_ordernumber = 'POS';
	//Check if entry mode is keyed or swiped.
	if (session.forms.pos.entryMode.htmlValue.equals("keyed")) {
		var accountNumber = session.forms.pos.accountNumber.htmlValue;
		var cardType = session.forms.pos.cardType.htmlValue;
		var cvnNumber = session.forms.pos.cvnNumber.htmlValue;
		var expiryMonth = session.forms.pos.expiryMonth.htmlValue;
		var expiryYear = session.forms.pos.expiryYear.htmlValue;
		result = POSHelper.CreateCyberSourcePaymentCardObject_UserData(accountNumber, cardType, cvnNumber, expiryMonth, expiryYear);
		if (result.success) {
			card = result.card;
		}
	} else {
		trackData = session.forms.pos.trackData.htmlValue;
	}
	result = POSHelper.CreateCyberSourcePurchaseTotalsObject_UserData(amount, currency);
	if (result.success) {
		purchaseObject = result.purchaseObject;
		result = POSHelper.CreateCyberSourcePOSObject_UserData(cardPresent, entryMode, catLevel, terminalCapability, terminalID, trackData);
		if (result.success) {
			posObject = result.posObject;
			result = TestFacade.TestPOSAuth(card, purchaseObject, posObject);
			session.forms.pos.clearFormElement();
			app.getView({
				posAuthResponse:result.serviceResponse,
				ActionPOS:ActionPOS
		    }).render('pos/postransactionresult');
			return;
		}
	}
	session.forms.pos.clearFormElement();
	app.getView({
		posAuthResponse:'',
		ActionPOS:ActionPOS
    }).render('pos/postransactionresult');
	return;
}

/**
 * This method is used to test the standalone create token service.
 */

function TestSATokenCreate(args) {
	var billTo, shipTo, purchaseTotals;
	var TestHelper = require('int_cybersource/cartridge/scripts/helper/TestHelper');
	var result = TestHelper.CreateCyberSourceBillToObject();
	if (result.success) {
		billTo = result.billTo;
		result = TestHelper.CreateCyberSourceShipToObject();
		if (result.success) {
			shipTo = result.shipTo;
			result = TestHelper.CreateCyberSourcePurchaseTotalsObject();
			if (result.success) {
				purchaseTotals = result.purchaseTotals;
				var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
				result = secureAcceptanceHelper.TestSACreateToken( billTo, shipTo, purchaseTotals );
				
				if (result.success) {
					app.getView({
						formAction:result.formAction,
						requestData:result.requestMap
				    }).render('services/secureAcceptanceRequestForm');
					return;
				} 
			}
		}
	}
	app.getView({
		log : !empty(result.errorMsg) ? result.errorMsg : Resource.msg('silentpost.testCreateToken.error', 'cybersource', null)
    }).render('custom/scripterror');
}

/**
 * This method is used to test the response from the standalone create token service.
 */

function TestSATokenCreateResponse(args) {
	app.getView().render('services/secureAcceptanceCreateTokenResponse');
}


/**
 * Test Service for Create Subscription.
 */
function CreateSubscription() {
	var result="";
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.subscription.clearFormElement();
		app.getView().render('subscription/createsubscription');
		return;
	}
	var billTo,  purchaseTotals, card;
	var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
	result=CommonHelper.CreateCyberSourceBillToObject_UserData("subscription");
	if (result.success) {
		billTo = result.billTo;
		result = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(session.forms.subscription.currency.htmlValue, session.forms.subscription.amount.htmlValue);
		if (result.success) {
			purchaseTotals = result.purchaseTotals;
			var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
			result = CardHelper.CreateCybersourcePaymentCardObject("subscription");
			if (result.success) {
				card = result.card;
				var SubscriptionFacade = require('int_cybersource/cartridge/scripts/facade/SubscriptionFacade');
				result=SubscriptionFacade.CreateSubscription(billTo,card, purchaseTotals);
				session.forms.subscription.clearFormElement();
				if (result.success) {
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
		
/**
 * Test Service for View Subscription.
 */
function ViewSubscription() {
	
	var subscriptionaction, subscriptionResult;
	if (empty(request.httpParameterMap.service.stringValue)) {
		subscriptionaction=URLUtils.https('CybersourceUnitTesting-ViewSubscription','service','view');
		session.forms.subscription.clearFormElement();
		app.getView({subscriptionaction:subscriptionaction}).render('subscription/viewsubscriptionform');
		return;
	} else {
		var SubscriptionFacade = require('int_cybersource/cartridge/scripts/facade/SubscriptionFacade');
		subscriptionResult=SubscriptionFacade.ViewSubscription(session.forms.subscription.subscriptionID.htmlValue);
		session.forms.subscription.clearFormElement();
		if (subscriptionResult.success) {
			app.getView(subscriptionResult.response).render('subscription/viewsubscriptionresult');
			return;
		}		
	}
	app.getView({
        log : !empty(subscriptionResult.errorMsg) ? subscriptionResult.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}

/**
 * Test Service for Update Subscription.
 */
function UpdateSubscription() {
	
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.subscription.clearFormElement();
		app.getView().render('subscription/updatesubscriptionform');
		return;
	}
		var result={};
		var billTo,  purchaseTotals, card;
		var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
		result= CommonHelper.CreateCyberSourceBillToObject_UserData("subscription");
			if (result.success) {
				billTo = result.billTo;
				result = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(session.forms.subscription.currency.htmlValue, session.forms.subscription.amount.htmlValue);
					if (result.success) {
						purchaseTotals = result.purchaseTotals;
						var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
						result = CardHelper.CreateCybersourcePaymentCardObject("subscription");
							if (result.success) {
								card = result.card;
								var subscriptionID=session.forms.subscription.subscriptionID.htmlValue;
								var SubscriptionFacade = require('int_cybersource/cartridge/scripts/facade/SubscriptionFacade');
								result=SubscriptionFacade.UpdateSubscription(billTo,card, purchaseTotals,subscriptionID);
								session.forms.subscription.clearFormElement();
									if (result.success) {
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

/**
 * Test Service for Delete Subscription.
 */
function DeleteSubscription() {
	var subscriptionaction;
	if (empty(request.httpParameterMap.service.stringValue)) {
		subscriptionaction=URLUtils.https('CybersourceUnitTesting-DeleteSubscription','service','delete');
		session.forms.subscription.clearFormElement();
		app.getView({subscriptionaction:subscriptionaction}).render('subscription/viewsubscriptionform');
		return;
	}
	var SubscriptionFacade = require('int_cybersource/cartridge/scripts/facade/SubscriptionFacade');
	var deleteSubscriptionResult=SubscriptionFacade.DeleteSubscription(session.forms.subscription.subscriptionID.htmlValue);
	session.forms.subscription.clearFormElement();
	if (deleteSubscriptionResult.success) {
		app.getView({serviceResponse:deleteSubscriptionResult.serviceResponse}).render('subscription/deletesubscriptionresult');
		return;
	}
	app.getView({
		log : !empty(deleteSubscriptionResult.errorMsg) ? deleteSubscriptionResult.errorMsg : 'System Exception occured contact administrator' 
	}).render('custom/scripterror');
	return;
}

/**
 * Test Services for Subscription.
 */
function StartSubscription() {
	app.getView().render('subscription/subscription');
	return;
}

function Reversal(args) {
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.subscription.clearFormElement();
		app.getView().render('services/reversalform');
		return;
	} else {
		var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
		var ServiceFacade = require('int_cybersource/cartridge/scripts/facade/ServiceFacade');
		var purchaseTotals;
		var result = CardHelper.CreateCyberSourcePurchaseTotalsObject_UserData(session.forms.subscription.amount.htmlValue, session.forms.subscription.currency.htmlValue);
		purchaseTotals = result.purchaseTotals;
		session.forms.subscription.authorizationID.htmlValue
		result = ServiceFacade.CreateReversal(purchaseTotals, session.forms.subscription.authorizationID.htmlValue);
		session.forms.subscription.clearFormElement();
		if (result.success) {
			app.getView({
				reversalResponse : result.serviceResponse
			}).render('services/reversalresult');
			return;
		}
		app.getView({
			log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
		}).render('custom/scripterror');
	}
}

function StartAuthReversal() {
	app.getView().render('services/services');
}

/*
 * Module exports
 */
4824977767526403301011
/*
 * Local methods require guard change below usage
 */

exports.TestCCAuth=guard.ensure(['https'], TestCCAuth);
exports.TestTax=guard.ensure(['https'], TestTax);
exports.TestDAVCheck=guard.ensure(['https'], TestDAVCheck);
exports.TestPA=guard.ensure(['https'], TestPA);
exports.TestFingerprint=guard.ensure(['https'], TestFingerprint);
exports.TestAlipayInitiateService=guard.ensure(['https'], TestAlipayInitiateService);
exports.TestAlipayCheckStatusService=guard.ensure(['https'], TestAlipayCheckStatusService);
exports.TestCaptureCard=guard.ensure(['https'], TestCaptureCard);
exports.StartPOS=guard.ensure(['https'], StartPOS);
exports.CreateSubscription=guard.ensure(['https'], CreateSubscription);
exports.ViewSubscription=guard.ensure(['https'], ViewSubscription);
exports.UpdateSubscription=guard.ensure(['https'], UpdateSubscription);
exports.DeleteSubscription=guard.ensure(['https'], DeleteSubscription);
exports.StartSubscription=guard.ensure(['https'], StartSubscription);
exports.TestSATokenCreate=guard.ensure(['https'], TestSATokenCreate);
exports.TestSATokenCreateResponse=guard.ensure(['https'], TestSATokenCreateResponse);
exports.StartAuthReversal=guard.ensure(['https'], StartAuthReversal);
exports.Reversal=guard.ensure(['https'], Reversal);

/*
 * Local methods
 */
/*
exports.TestCCAuth=TestCCAuth;
exports.TestTax=TestTax;
exports.TestDAVCheck=TestDAVCheck;
exports.TestPA=TestPA;
exports.TestFingerprint=TestFingerprint;
exports.TestAlipayInitiateService=TestAlipayInitiateService;
exports.TestAlipayCheckStatusService=TestAlipayCheckStatusService;
exports.TestCaptureCard=TestCaptureCard;
exports.StartPOS=StartPOS;
exports.TestSATokenCreate=TestSATokenCreate;
exports.TestSATokenCreateResponse=TestSATokenCreateResponse;

exports.CreateSubscription=CreateSubscription;
exports.ViewSubscription=ViewSubscription;
exports.UpdateSubscription=UpdateSubscription;
exports.DeleteSubscription=DeleteSubscription;
exports.StartSubscription=StartSubscription;
exports.StartAuthReversal=StartAuthReversal;
exports.Reversal=Reversal;
*/

