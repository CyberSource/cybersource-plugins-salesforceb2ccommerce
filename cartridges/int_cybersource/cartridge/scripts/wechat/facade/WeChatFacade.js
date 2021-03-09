'use strict';

/**
 * Description of the module and the logic it provides
 *
 * @module cartridge/scripts/wechat/facade/WeChatFacade
 */

/* API includes */
var Logger = dw.system.Logger.getLogger('Cybersource');
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');

function WeChatServiceInterface(request) {   	
	//calling the service by passing wechat request
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
	var serviceResponse =  commonFacade.CallCYBService(CybersourceConstants.WECHAT_PAYMENT_METHOD,request);
	//return response object
	return serviceResponse;
}

function WeChatSaleService(sessionObject) {
	// declare soap reference variable
	var csReference = webreferences2.CyberSourceTransaction;
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
    request.apPaymentType = sessionObject.wechatPaymentType;
    //set bill to and ship to objects
    var apSaleService = new CybersourceHelper.csReference.APSaleService();
    if(sessionObject.billTo != null)
    {
        request.billTo  = libCybersource.copyBillTo( sessionObject.billTo );
    }
    
    apSaleService.transactionTimeout = sessionObject.transactionTimeout;
    apSaleService.successURL = sessionObject.successURL;
    
    request.apSaleService= apSaleService;    
    request.apSaleService.run = true;
    
    //call wechat service to get the response
    var response = WeChatServiceInterface(request);
    // return response
    return response;
}

function WeChatCheckStatusService(requestId,paymentType,orderNo) {
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	// declare soap reference variable
	var csReference = webreferences2.CyberSourceTransaction;
	// create reference of request object 
	var request = new csReference.RequestMessage();
	//declare helper variable
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	//set the merchant id
	request.merchantID = CybersourceHelper.getMerchantID();
	
	libCybersource.setClientData(request, orderNo);
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();	
	var testReconciliationID = CybersourceHelper.getTestWeChatReconciliationID() ? CybersourceHelper.getTestWeChatReconciliationID().value : null;
	CybersourceHelper.apCheckStatusService(request,orderNo,requestId,'WQR', testReconciliationID);

	
	var response = WeChatServiceInterface(request);
    // return response
    return response;

}

module.exports = {
		WeChatSaleService : WeChatSaleService,
		WeChatCheckStatusService : WeChatCheckStatusService
};