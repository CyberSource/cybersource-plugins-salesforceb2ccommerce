'use strict';

/**
 * Description of the module and the logic it provides
 *
 * @module cartridge/scripts/wechat/facade/WeChatFacade
 */

/* API includes */
var Logger = dw.system.Logger.getLogger('Cybersource');

function WeChatServiceInterface(request)
{   	
	var csReference = webreferences.CyberSourceTransaction;
	//create service stubs
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
//calling the service by passing klarna request
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
	var serviceResponse =  commonFacade.CallCYBService(CybersourceConstants.WECHAT_PAYMENT_METHOD,request);
	//return response object
	return serviceResponse;
}

function WeChatSaleService(sessionObject) {

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
	request.apPaymentType = 'WQR';
    //set bill to and ship to objects
    var apSaleService = new CybersourceHelper.csReference.APSaleService();
    if(sessionObject.billTo != null)
    {
		request.billTo  = libCybersource.copyBillTo( sessionObject.billTo );
		request.shipTo  = libCybersource.copyShipTo( sessionObject.shipTo );
	}
	
	//set item object
	var items  = [];
	if(!empty(sessionObject.items))
	{
		var iter : dw.util.Iterator = sessionObject.items.iterator();
		while(iter.hasNext())
		{
			items.push(libCybersource.copyItemFrom(iter.next()));
		}
	}
	request.item = items;
    
    apSaleService.transactionTimeout = sessionObject.transactionTimeout;
    apSaleService.successURL = sessionObject.successURL;
    request.apSaleService= apSaleService;    
    request.apSaleService.run = true;
    
    //call wechat service to get the response
    var response = WeChatServiceInterface(request);
    // return response
    return response;
}

function WeChatCheckStatusService(requestId,paymentType,orderNo)
{
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	// declare soap reference variable
	var csReference = webreferences.CyberSourceTransaction;
	// create reference of request object 
	var request = new csReference.RequestMessage();
	//declare helper variable
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	//set the merchant id
	request.merchantID = CybersourceHelper.getMerchantID();
	
	libCybersource.setClientData(request, orderNo);
	
	//create service stubs
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();	
	var testReconciliationID = CybersourceHelper.getTestWeChatReconciliationID() ? CybersourceHelper.getTestWeChatReconciliationID().value : null;
	CybersourceHelper.apCheckStatusService(request,orderNo,requestId,'WQR', testReconciliationID);
	var response = WeChatServiceInterface(request);
	session.privacy.CybersourceFraudDecision = response.decision;
    // return response
    return response;

}

module.exports = {
		WeChatSaleService : WeChatSaleService,
		WeChatCheckStatusService : WeChatCheckStatusService
};