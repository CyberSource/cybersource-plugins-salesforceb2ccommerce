'use strict';

/* API includes */
var Logger = dw.system.Logger.getLogger('Cybersource');

/**
* This script call service to initiate payment for Klarna and
* set the response in response object. also handles the logging
* of different error scenarios while making service call.
**/
function KlarnaServiceInterface(request)
{   	
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	//calling the service by passing klarna request
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
	var serviceResponse =  commonFacade.CallCYBService(CybersourceConstants.KLARNA_PAYMENT_METHOD,request);
	//return response object
	return serviceResponse;
}

/*
* This method sets the request object with values required
* in session service of klarna
*/
function klarnaInitSessionService(sessionObject)
{
	//declare variables for libcybersource and helper
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	// declare soap reference variable
	var csReference = webreferences.CyberSourceTransaction;
	// create reference of request object 
	var request = new csReference.RequestMessage();
	//declare helper variable
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	//set the merchant id
	request.merchantID = CybersourceHelper.getMerchantID();
	//set client data
	libCybersource.setClientData(request, sessionObject.UUID);
	//set purchase total
	request.purchaseTotals = libCybersource.copyPurchaseTotals(sessionObject.purchaseObject);
	//set payment type
	request.apPaymentType = sessionObject.klarnaPaymentType;
	//set bill to and ship to objects
	var apSessionsService = new CybersourceHelper.csReference.APSessionsService();
	if(sessionObject.billTo != null)
	{
		request.billTo  = libCybersource.copyBillTo( sessionObject.billTo );
	}
	//set item object
	var items = [];
	if(!empty(sessionObject.items))
	{
		var iter : dw.util.Iterator = sessionObject.items.iterator();
		while(iter.hasNext())
		{
			items.push(libCybersource.copyItemFrom(iter.next()));
		}
	}
	request.item = items;
	//set cancel, success and failure URL
	apSessionsService.cancelURL = sessionObject.cancelURL;
	apSessionsService.successURL = sessionObject.successURL;
	apSessionsService.failureURL = sessionObject.failureURL;
	apSessionsService.sessionsType="N";
	request.apSessionsService= apSessionsService;	
	request.apSessionsService.run = true;
	
	//call klarna service to get the response
	var response = KlarnaServiceInterface(request);
	// return response
	return response;
}

function klarnaUpdateSessionService(sessionObject)
{
	//declare variables for libcybersource and helper
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	// declare soap reference variable
	var csReference = webreferences.CyberSourceTransaction;
	// create reference of request object 
	var request = new csReference.RequestMessage();
	//declare helper variable
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	//set the merchant id
	request.merchantID = CybersourceHelper.getMerchantID();
	//set client data
	libCybersource.setClientData(request, sessionObject.UUID);
	//set purchase total
	request.purchaseTotals = libCybersource.copyPurchaseTotals(sessionObject.purchaseObject);
	//set payment type
	request.apPaymentType = sessionObject.klarnaPaymentType;
	//set bill to and ship to objects
	var apSessionsService = new CybersourceHelper.csReference.APSessionsService();
	if(sessionObject.billTo != null && sessionObject.shipTo !=null)
	{
		request.billTo  = libCybersource.copyBillTo( sessionObject.billTo );
		request.shipTo  = libCybersource.copyShipTo( sessionObject.shipTo );
	}
	//set item object
	var items = [];
	if(!empty(sessionObject.items))
	{
		var iter : dw.util.Iterator = sessionObject.items.iterator();
		while(iter.hasNext())
		{
			items.push(libCybersource.copyItemFrom(iter.next()));
		}
	}
	request.item = items;
	//set cancel, success and failure URL
	apSessionsService.cancelURL = sessionObject.cancelURL;
	apSessionsService.successURL = sessionObject.successURL;
	apSessionsService.failureURL = sessionObject.failureURL;
    if(sessionObject.billTo != null && sessionObject.shipTo !=null)
    {
        apSessionsService.sessionsType="U";
    }
    apSessionsService.sessionsRequestID = session.privacy.requestID;
	request.apSessionsService= apSessionsService;	
	request.apSessionsService.run = true;
	
	//call klarna service to get the response
	var response = KlarnaServiceInterface(request);
	// return response
	return response;
}

/*
* This method set the request object with values required
* in authorization service of klarna
*/
function klarnaAuthorizationService(authorizationObject)
{
	//declare variables for libcybersource and helper
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	// declare soap reference variable
	var csReference = webreferences.CyberSourceTransaction;
	// create reference of request object 
	var request = new csReference.RequestMessage();
	//declare helper variable
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	//set merchant id
	request.merchantID = CybersourceHelper.getMerchantID();
	
	//set purchase total
	request.purchaseTotals = libCybersource.copyPurchaseTotals(authorizationObject.purchaseObject);
	//set payment type
	request.apPaymentType = authorizationObject.klarnaPaymentType;
	var apAuthService = new CybersourceHelper.csReference.APAuthService();
	//decision manager changes
	var decisionManager = new CybersourceHelper.csReference.DecisionManager();
	//set bill to and ship to objects
	if(authorizationObject.billTo != null && authorizationObject.shipTo !=null)
	{
		request.billTo  = libCybersource.copyBillTo( authorizationObject.billTo );
		request.shipTo  = libCybersource.copyShipTo( authorizationObject.shipTo );
	}
	//set item object
	var items  = [];
	if(!empty(authorizationObject.items))
	{
		var iter : dw.util.Iterator = authorizationObject.items.iterator();
		while(iter.hasNext())
		{
			items.push(libCybersource.copyItemFrom(iter.next()));
		}
	}
	request.item = items;
	//set preapproved token
	apAuthService.preapprovalToken = authorizationObject.preApprovalToken;
	decisionManager.enabled = authorizationObject.decisionManagerRequired;
	//set client data
	if(decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()){
		libCybersource.setClientData(request, authorizationObject.orderNo,session.sessionID);
	}else{
		libCybersource.setClientData(request, authorizationObject.orderNo);
	}
	request.decisionManager = decisionManager;
	request.apAuthService= apAuthService;	
	request.apAuthService.run = true;
	
	//call service to get the response
	var response = KlarnaServiceInterface(request);
	//return response
	return response;
}

module.exports = {
		klarnaInitSessionService : klarnaInitSessionService,
		klarnaUpdateSessionService : klarnaUpdateSessionService,
		klarnaAuthorizationService : klarnaAuthorizationService
	};