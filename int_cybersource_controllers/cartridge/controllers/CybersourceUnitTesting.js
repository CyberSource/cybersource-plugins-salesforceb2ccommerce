'use strict';
/**
 * Controller that performs testing related services of cybersource.
 * @module controllers/CybersourceUnitTesting
 */

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var logger = dw.system.Logger.getLogger('Cybersource');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');
var TestFacade = require('int_cybersource/cartridge/scripts/Facade/TestFacade');
var TestHelper = require('int_cybersource/cartridge/scripts/Helper/TestHelper');

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
	var TaxHelper = require('int_cybersource/cartridge/scripts/Helper/TaxHelper');
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
	var billTo, shipTo, purchaseTotals, card, taxRequestObject, shipFrom, items, itemMap;
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
	app.getView().render('custom/FingerPrintRedirect');
}

/**
 * Controller function to unit test the Alipay payment service. 
 * With the hard coded card data, just to verify service is working.
 */

function TestAlipayInitiateService(args) {
	var alipayPaymentType=dw.system.Site.getCurrent().getCustomPreferenceValue("apPaymentType");
	currency = alipayPaymentType.equals('APD') ? 'CNY': null;
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
 * Controller function to unit test the Paypal Capture service. 
 * With the hard coded card data, just to verify service is working.
 */

function TestPaypalCaptureService(args) {
	var result="";
	var orderNo = request.httpParameterMap.orderNo.stringValue;
	var order = OrderMgr.getOrder(orderNo);
	if (order) {
		var PayPalFacade = require('int_cybersource/cartridge/scripts/Facade/PayPalFacade');
		result = PayPalFacade.PaypalCaptureRequest(order);
		if (result.success) {
			app.getView({
				Decision:result.Decision,
				RequestID:result.RequestID,
				RequestToken:result.RequestToken,
				AuthorizationId:result.AuthorizationId,
				CaptureAmount:result.CaptureAmount,
				CaptureReasonCode:result.CaptureReasonCode,
				CaptureTransactionID:result.CaptureTransactionID,
				ParentTransactionId:result.ParentTransactionId,
				PaymentStatus:result.PaymentStatus,
				CaptureCorrelationID:result.CaptureCorrelationID,
				CaptureFeeAmount:result.CaptureFeeAmount
		    }).render('custom/PaypalCaptureServiceTestResults');
			return;
		}
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'Missing or invalid orderNo in parameter' 
    }).render('custom/scripterror');
}

/**
 * Controller function to unit test the Card capture service. 
 * With the hard coded card data, just to verify service is working.
 */ 
function TestCaptureCard(args) {
	var result="";
	var orderNo = request.httpParameterMap.oid.stringValue;
	var order = OrderMgr.getOrder(orderNo);
	if (order && order.paymentStatus.value != 2) {
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
	var POSHelper = require('int_cybersource/cartridge/scripts/Helper/POSHelper');	
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
		var accountNumber = CurrentForms.pos.accountNumber.htmlValue
		var cardType = CurrentForms.pos.cardType.htmlValue
		var cvnNumber = CurrentForms.pos.cvnNumber.htmlValue
		var expiryMonth = CurrentForms.pos.expiryMonth.htmlValue
		var expiryYear = CurrentForms.pos.expiryYear.htmlValue
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

/*
 * Module exports
 */

/*
 * Local methods require guard change below usage
 */
/*
exports.TestCCAuth=guard.ensure(['https'], TestCCAuth);
exports.TestTax=guard.ensure(['https'], TestTax);
exports.TestDAVCheck=guard.ensure(['https'], TestDAVCheck);
exports.TestPA=guard.ensure(['https'], TestPA);
exports.TestFingerprint=guard.ensure(['https'], TestFingerprint);
exports.TestAlipayInitiateService=guard.ensure(['https'], TestAlipayInitiateService);
exports.TestAlipayCheckStatusService=guard.ensure(['https'], TestAlipayCheckStatusService);
exports.TestPaypalCaptureService=guard.ensure(['https'], TestPaypalCaptureService);
exports.TestCaptureCard=guard.ensure(['https'], TestCaptureCard);
exports.StartPOS=guard.ensure(['https'], StartPOS);
*/
/*
 * Local methods
 */

exports.TestCCAuth=TestCCAuth;
exports.TestTax=TestTax;
exports.TestDAVCheck=TestDAVCheck;
exports.TestPA=TestPA;
exports.TestFingerprint=TestFingerprint;
exports.TestAlipayInitiateService=TestAlipayInitiateService;
exports.TestAlipayCheckStatusService=TestAlipayCheckStatusService;
exports.TestPaypalCaptureService=TestPaypalCaptureService;
exports.TestCaptureCard=TestCaptureCard;
exports.StartPOS=StartPOS;
