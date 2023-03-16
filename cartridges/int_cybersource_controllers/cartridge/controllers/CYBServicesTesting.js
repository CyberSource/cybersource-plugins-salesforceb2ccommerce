'use strict';
/**
 * Controller that performs testing related services of cybersource.
 * @module controllers/Cybersourceunittesting
 */

/* API Includes */
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var guard = require(CybersourceConstants.UNIT_TEST_GUARD);
var app = require(CybersourceConstants.APP);
var TestFacade = require(CybersourceConstants.CS_CORE_SCRIPT+'unittesting/facade/TestFacade');
var TestHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'unittesting/helper/TestHelper');

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
					    }).render('services/CCAuthUnitTestResults');
						return;
					} 
				}
			}
		}
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('common/scripterror');
}

/**
 * Controller function to unit test the tax service. 
 * With the hard coded data, just to verify services are working.
 */
function TestTax(args) {
	var TaxHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'unittesting/helper/TestHelper');
	var taxResponse =TaxHelper.CreatTaxRequest();
	if(!empty(taxResponse))
	{
		app.getView({taxResponse:taxResponse}).render('services/TaxUnitTestResults');
		return;
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
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
    }).render('services/TestDAVCheckResults');
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
	    }).render('services/payerauthenticationredirecttest');
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
				app.getView({PAResponse:paResponse, PAVResponse:''}).render('services/PATestResult');
				return;
			} else {
				session.privacy.PayerAuthEnrollResponseObj = paResponse;
				app.getView({
					AcsURL:paResponse.AcsURL,
					PAReq:paResponse.PAReq
	}).render('services/payerauthenticationtest');
				return;
			}
		}
	} else {
		var PayerAuthEnrollResponseObj = session.privacy.PayerAuthEnrollResponseObj;
		session.privacy.PayerAuthEnrollResponseObj = "";
		if (empty(PayerAuthEnrollResponseObj)) {
			PayerAuthEnrollResponseObj = "";
		}
		var PAResponsePARes = request.httpParameterMap.PAResponsePARes.stringValue;
		var PAResponseMD = request.httpParameterMap.PAResponseMD.stringValue;
		
		if (PAResponseMD !== session.sessionID) {
			app.getView({PAResponse:PayerAuthEnrollResponseObj, PAVResponse:''}).render('services/PATestResult');
			return;
		}
		
		result = TestFacade.TestPayerAuthValidation(PAResponsePARes);
		if (result.success) {
			pavResponse = result.serviceResponse;
		}
		app.getView({PAResponse:PayerAuthEnrollResponseObj, PAVResponse:pavResponse}).render('services/PATestResult');
		return;
	}
}

/**
 * Controller function to unit test the Finger print service. 
 * With the hard coded card data, just to verify service is working.
 */

function TestFingerprint(args) {
	app.getView().render('services/TestFingerPrintRedirect');
}

/**
 * Controller function to unit test the Alipay payment service. 
 * With the hard coded card data, just to verify service is working.
 */

function TestAlipayInitiateService() {
	var result = TestFacade.TestAlipayInitiateRequest();
	if (result.success) {
			app.getView({
				alipayInitiateResponse:result.serviceResponse
	}).render('services/AlipayInitiateServiceTestResults');
			return;
		}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator'
    }).render('common/scripterror');
}


/**
 * Controller function to unit test the POS service. 
 * With the hard coded card data, just to verify service is working.
 * Test POS static method to check for controller Authorize function
 */
function TestPOS(args) {
	var ActionPOS = "CYBServicesTesting-TestPOS";
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
	accountNumber = session.forms.pos.accountNumber.htmlValue;
	cardType = session.forms.pos.cardType.htmlValue;
	cvnNumber = session.forms.pos.cvnNumber.htmlValue;
	expiryMonth = session.forms.pos.expiryMonth.htmlValue;
	expiryYear = session.forms.pos.expiryYear.htmlValue;
	} else {
	trackData = session.forms.pos.trackData.htmlValue;
	}
	var POSAdaptor = require(CybersourceConstants.CS_CORE_SCRIPT+'pos/adaptor/POSAdaptor');
	var result = POSAdaptor.InitiatePOSAuthRequest({storeLocation:storeLocation, entryMode:entryMode,
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
		pos_ordernumber:pos_ordernumber
		});
	session.forms.pos.clearFormElement();
	app.getView({
			ActionPOS: ActionPOS,
			posAuthResponse: result.serviceResponse
		}).render('pos/postransactionresult');
	return;
	}
}
function StartPOS(args) {
	var result="";
	var ActionPOS = "CYBServicesTesting-StartPOS";
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
	var POSAdaptor = require(CybersourceConstants.CS_CORE_SCRIPT+'pos/adaptor/POSAdaptor');	
		result = POSAdaptor.createPOSTestRequest();
		session.forms.pos.clearFormElement();
		app.getView({
			posAuthResponse:result.serviceResponse,
			ActionPOS:ActionPOS
	    }).render('pos/postransactionresult');
		return;
}

/**
 * This method is used to test the standalone create token service.
 */

function TestSATokenCreate(args) {
	var billTo, shipTo, purchaseTotals;
	var result = TestHelper.CreateCyberSourceBillToObject();
	if (result.success) {
		billTo = result.billTo;
		result = TestHelper.CreateCyberSourceShipToObject();
		if (result.success) {
			shipTo = result.shipTo;
			result = TestHelper.CreateCyberSourcePurchaseTotalsObject();
			if (result.success) {
				purchaseTotals = result.purchaseTotals;
				result = TestFacade.TestSACreateToken( billTo, shipTo, purchaseTotals );
				
				if (result.success) {
					app.getView({
						FormAction:result.formAction,
						Data:result.requestMap
				    }).render('services/secureAcceptanceRequestForm');
					return;
				} 
			}
		}
	}
	app.getView({
		log : !empty(result.errorMsg) ? result.errorMsg : Resource.msg('silentpost.testCreateToken.error', 'cybersource', null)
    }).render('common/scripterror');
}

/*
 * This method is used to test standalone onDemand
 */


function OnDemandPayment(){
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.subscription.clearFormElement();
		app.getView().render('services/ondemandsubscriptionform');
		return;
	}
	var serviceResponse = TestFacade.TestOnDemandSubscription().response;
	session.forms.subscription.clearFormElement();
	if(!empty(serviceResponse))
	{
		// display the result page
		app.getView({response:serviceResponse}).render('services/ondemandsubscriptionresult');
		return;
	}
	app.getView({
		ScriptLog : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
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
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.subscription.clearFormElement();
		app.getView().render('services/createsubscription');
		return;
	}
	var SubscriptionFacade = require(CybersourceConstants.CS_CORE_SCRIPT+'facade/SubscriptionFacade');
	var result = GetCYBSubscriptionRequestData();
		result=SubscriptionFacade.CreateSubscription(result.billTo,result.card, result.purchaseTotals);
		session.forms.subscription.clearFormElement();
	if (result.success) {
		app.getView({subscriptionResponse:result.serviceResponse}).render('services/createsubscriptionresult');
		return;
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('common/scripterror');
	return;
}
		
/**
 * Test Service for View Subscription.
 */
function ViewSubscription() {
	
	var URLUtils = require('dw/web/URLUtils');
	var subscriptionaction, subscriptionResult;
	if (empty(request.httpParameterMap.service.stringValue)) {
		subscriptionaction=URLUtils.https('CYBServicesTesting-ViewSubscription','service','view');
		session.forms.subscription.clearFormElement();
		app.getView({subscriptionaction:subscriptionaction}).render('services/viewsubscriptionform');
		return;
	} else {
		var SubscriptionFacade = require(CybersourceConstants.CS_CORE_SCRIPT+'facade/SubscriptionFacade');
		subscriptionResult=SubscriptionFacade.ViewSubscription(session.forms.subscription.subscriptionID.htmlValue);
		session.forms.subscription.clearFormElement();
		if (subscriptionResult.success) {
			app.getView(subscriptionResult.response).render('services/viewsubscriptionresult');
			return;
		}		
	}
	app.getView({
        log : !empty(subscriptionResult.errorMsg) ? subscriptionResult.errorMsg : 'System Exception occured contact administrator' 
    }).render('common/scripterror');
	return;
}

/**
 * Collate subscription request data and return object.
 */
function GetCYBSubscriptionRequestData(){
	var   subscriptionData = {};
	var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CommonHelper');
	subscriptionData.billTo = CommonHelper.CreateCyberSourceBillToObject_UserData("subscription").billTo;
	subscriptionData.purchaseTotals = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(session.forms.subscription.currency.htmlValue, session.forms.subscription.amount.htmlValue).purchaseTotals;
	var CardHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CardHelper');
	subscriptionData.card = CardHelper.CreateCybersourcePaymentCardObject("subscription").card;
	return subscriptionData;
}
function UpdateSubscription() {
	
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.subscription.clearFormElement();
		app.getView().render('services/updatesubscriptionform');
		return;
	}
		var result = GetCYBSubscriptionRequestData();
		var subscriptionID=session.forms.subscription.subscriptionID.htmlValue;
		var SubscriptionFacade = require(CybersourceConstants.CS_CORE_SCRIPT+'facade/SubscriptionFacade');
		result=SubscriptionFacade.UpdateSubscription(result.billTo,result.card, result.purchaseTotals,subscriptionID);
		session.forms.subscription.clearFormElement();
		if (result.success) {
			app.getView(result.response).render('services/updatesubscriptionresult');
			return;
		}
			app.getView({
				log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
			}).render('common/scripterror');
			return;
}

/**
 * Test Service for Delete Subscription.
 */
function DeleteSubscription() {
	var URLUtils = require('dw/web/URLUtils');
	var subscriptionaction;
	if (empty(request.httpParameterMap.service.stringValue)) {
		subscriptionaction=URLUtils.https('CYBServicesTesting-DeleteSubscription','service','delete');
		session.forms.subscription.clearFormElement();
		var deletesubscription = true;
		app.getView({subscriptionaction:subscriptionaction,deletesubscription:deletesubscription}).render('services/viewsubscriptionform');
		return;
	}
	var SubscriptionFacade = require(CybersourceConstants.CS_CORE_SCRIPT+'facade/SubscriptionFacade');
	var deleteSubscriptionResult=SubscriptionFacade.DeleteSubscription(session.forms.subscription.subscriptionID.htmlValue);
	session.forms.subscription.clearFormElement();
	if (deleteSubscriptionResult.success) {
		app.getView({serviceResponse:deleteSubscriptionResult.serviceResponse}).render('services/deletesubscriptionresult');
		return;
	}
	app.getView({
		log : !empty(deleteSubscriptionResult.errorMsg) ? deleteSubscriptionResult.errorMsg : 'System Exception occured contact administrator' 
	}).render('common/scripterror');
	return;
}

function StartServices() {
	app.getView().render('services/services');
}


/**
 * Test Services for Sale.
 */

function TestSaleService()
{
	// check if service parameter not available,display form
	if (empty(request.httpParameterMap.service.stringValue))
	{
		session.forms.generictestinterfaceform.clearFormElement();
		var saleServiceForm = app.getForm('generictestinterfaceform');
		// render the sale service form 
		app.getView().render('services/saleserviceform');
		return;
	}
	var response={};
	// get all the forms in session 
	var CurrentForms = session.forms;
	// capture the sale service response from test facade
	var serviceResponse = TestFacade.TestSaleService(CurrentForms);
	session.forms.generictestinterfaceform.clearFormElement();
	if(!empty(serviceResponse))
	{
		// display the result page
		app.getView({response:serviceResponse}).render('services/serviceresult');
		return;
	}
	app.getView({
		ScriptLog : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}


/**
 * Test Services for Refund.
 */

function TestRefundService()
{
	// check if service parameter not available,display form
	if (empty(request.httpParameterMap.service.stringValue))
	{
		session.forms.generictestinterfaceform.clearFormElement();
		var refundServiceForm = app.getForm('generictestinterfaceform');
		// render the refund service form 
		app.getView().render('services/refundserviceform');
		return;
	}
	var response={};
	// get all the forms in session
	var CurrentForms = session.forms;
	// capture the refund service response from test facade
	var serviceResponse = TestFacade.TestRefundService(CurrentForms);
	session.forms.generictestinterfaceform.clearFormElement();
	if(!empty(serviceResponse))
	{
		// display the result page
		app.getView({response:serviceResponse}).render('services/serviceresult');
		return;
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}


/**
 * Test Services for PayPal Authorize.
 */

function TestAuthorizeService()
{
	if (empty(request.httpParameterMap.service.stringValue))
	{
		session.forms.generictestinterfaceform.clearFormElement();
		var authorizeServiceForm = app.getForm('generictestinterfaceform');
		app.getView().render('services/authorizeserviceform');
		return;
	}
	var saleServiceObject = {};
	var response={};
	var CurrentForms = session.forms;
	var serviceResponse = TestFacade.TestAuthorizeService(CurrentForms);
	session.forms.generictestinterfaceform.clearFormElement();
	if(!empty(serviceResponse))
	{
		app.getView({response:serviceResponse}).render('services/serviceresult');
		return;
	}
	app.getView({
        ScriptLog : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;


}


/**
 * Test Services for Cancel.
 */

function TestCancelService()
{
	// check if service parameter not available,display form
	if (empty(request.httpParameterMap.service.stringValue))
	{
		session.forms.generictestinterfaceform.clearFormElement();
		var cancelServiceForm = app.getForm('generictestinterfaceform');
		// render the refund service form 
		app.getView().render('services/cancelserviceform');
		return;
	}
	var response={};
	// get all the forms in session
	var CurrentForms = session.forms;
	// capture the refund service response from test facade
	var serviceResponse = TestFacade.TestCancelService(CurrentForms);
	session.forms.generictestinterfaceform.clearFormElement();
	if(!empty(serviceResponse))
	{
		// display the result page
		app.getView({response:serviceResponse}).render('services/serviceresult');
		return;
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}



/**
 * Test Services for Capture.
 */

function TestCaptureService()
{
	// check if service parameter not available,display form
	if (empty(request.httpParameterMap.service.stringValue))
	{
		session.forms.generictestinterfaceform.clearFormElement();
		var captureServiceForm = app.getForm('generictestinterfaceform');
		// render the refund service form 
		app.getView().render('services/captureserviceform');
		return;
	}
	var response={};
	// get all the forms in session
	var CurrentForms = session.forms;
	// capture the refund service response from test facade
	var serviceResponse = TestFacade.TestCaptureService(CurrentForms);
	session.forms.generictestinterfaceform.clearFormElement();
	if(!empty(serviceResponse))
	{
		// display the result page
		app.getView({response:serviceResponse}).render('services/serviceresult');
		return;
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}


/**
 * Test Services for Auth Reversal.
 */

function TestAuthReversalService()
{
	// check if service parameter not available,display form
	if (empty(request.httpParameterMap.service.stringValue))
	{
		session.forms.generictestinterfaceform.clearFormElement();
		var authReversalServiceForm = app.getForm('generictestinterfaceform');
		// render the refund service form 
		app.getView().render('services/authreversalform');
		return;
	}
	var response={};
	// get all the forms in session
	var CurrentForms = session.forms;
	// capture the refund service response from test facade
	var serviceResponse = TestFacade.TestAuthReversalService(CurrentForms);
	session.forms.generictestinterfaceform.clearFormElement();
	if(!empty(serviceResponse))
	{
		// display the result page
		app.getView({response:serviceResponse}).render('services/serviceresult');
		return;
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}


/**
 * Test Services for Check Status.
 */

function TestCheckStatusService()
{
	// check if service parameter not available,display form
	if (empty(request.httpParameterMap.service.stringValue))
	{
		session.forms.generictestinterfaceform.clearFormElement();
		var checkStatusServiceForm = app.getForm('generictestinterfaceform');
		// render the refund service form 
		app.getView().render('services/checkstatusserviceform');
		return;
	}
	var response={};
	// get all the forms in session
	var CurrentForms = session.forms;
	// capture the refund service response from test facade
	var serviceResponse = TestFacade.TestCheckStatusService();
	session.forms.generictestinterfaceform.clearFormElement();
	if(!empty(serviceResponse))
	{
		// display the result page
		app.getView({response:serviceResponse}).render('services/serviceresult');
		return;
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
	return;
}


/*
 * Module exports
 */

/*
 * Local methods require guard change below usage
 */

exports.TestCCAuth=guard.ensure(['https', 'devInstance'], TestCCAuth);
exports.TestTax=guard.ensure(['https', 'devInstance'], TestTax);
exports.TestDAVCheck=guard.ensure(['https', 'devInstance'], TestDAVCheck);
exports.TestPA=guard.ensure(['https', 'devInstance'], TestPA);
exports.TestFingerprint=guard.ensure(['https', 'devInstance'], TestFingerprint);
exports.TestAlipayInitiateService=guard.ensure(['https', 'devInstance'], TestAlipayInitiateService);
exports.StartPOS=guard.ensure(['https', 'devInstance'], StartPOS);
exports.CreateSubscription=guard.ensure(['https', 'devInstance'], CreateSubscription);
exports.ViewSubscription=guard.ensure(['https', 'devInstance'], ViewSubscription);
exports.UpdateSubscription=guard.ensure(['https', 'devInstance'], UpdateSubscription);
exports.DeleteSubscription=guard.ensure(['https', 'devInstance'], DeleteSubscription);
exports.TestSATokenCreate=guard.ensure(['https', 'devInstance'], TestSATokenCreate);
exports.TestSATokenCreateResponse=guard.ensure(['https', 'devInstance'], TestSATokenCreateResponse);
exports.StartServices=guard.ensure(['https', 'devInstance'], StartServices);
exports.TestSaleService=guard.ensure(['https', 'devInstance'], TestSaleService);
exports.TestRefundService=guard.ensure(['https', 'devInstance'], TestRefundService);
exports.TestAuthorizeService=guard.ensure(['https', 'devInstance'],TestAuthorizeService);
exports.TestCancelService=guard.ensure(['https', 'devInstance'],TestCancelService);
exports.TestCaptureService=guard.ensure(['https', 'devInstance'],TestCaptureService);
exports.TestAuthReversalService=guard.ensure(['https', 'devInstance'],TestAuthReversalService);
exports.TestCheckStatusService=guard.ensure(['https', 'devInstance'],TestCheckStatusService);
exports.TestPOS=guard.ensure(['https', 'devInstance'], TestPOS);
exports.OnDemandPayment=guard.ensure(['https', 'devInstance'], OnDemandPayment);