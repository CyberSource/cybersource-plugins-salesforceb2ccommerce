'use strict';

/**
 * This file will contains adapter methods for Cybersource Wechat
 * Integration.
 *
 * @module cartridge/scripts/wechat/adapter/WeChatAdaptor
 */

/* API includes */
var WeChatFacade = require('~/cartridge/scripts/wechat/facade/WeChatFacade');
var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var Transaction = require('dw/system/Transaction');

function HandleRequest(Basket, isHandleRequired) {

	var callSaleService;
	if(!isHandleRequired){
		callSessionService = {success:true};
	}
	if(isHandleRequired){
		//call handle method of helper
		callSaleService = CommonHelper.HandleRequest(Basket);
	}

	//call sale service in case of success response
	if(callSaleService.success){
		var response = CreateSaleServiceRequest(Basket);
		return response;
	} else {
		return {error:true};
	}

}

function AuthorizeRequest(orderNo,paymentInstrument){
	
	//create object of OrderMgr to get the order
	var OrderMgr = require('dw/order/OrderMgr');
	var Order = OrderMgr.getOrder(orderNo);
    var PaymentMgr = require('dw/order/PaymentMgr');
    //get the payment processor and assign its value in payment transaction object
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    //call authorization service and process the response
    var response = CheckStatusService(Order,paymentInstrument,orderNo);
    
    return response;
	
}


function CreateSaleServiceRequest(Basket) {

	var purchaseObject;
	var billToObject;
	var URLUtils = require('dw/web/URLUtils');
	var successURL = URLUtils.https('COSummary-Start').toString();
	var CyberSourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();

	var wechatPaymentType = CybersourceConstants.WECHAT_PAYMENT_TYPE;
	//set basket UUID
    var UUID = Basket.UUID;
    var transactionTimeout = CyberSourceHelper.getTransactionTimeOut();
	
	var result = CommonHelper.CreateCybersourcePurchaseTotalsObject(Basket);
    purchaseObject = result.purchaseTotals;
    result = CommonHelper.CreateCyberSourceBillToObject(Basket);
    billToObject = result.billTo;

    var sessionObject = {};
    sessionObject.billTo = billToObject;
    sessionObject.purchaseObject = purchaseObject;
    sessionObject.wechatPaymentType = wechatPaymentType;
    sessionObject.successURL = successURL;
    sessionObject.UUID = UUID;
    sessionObject.transactionTimeout = transactionTimeout;
    
    // call session method of facade to create session request
    var response = WeChatFacade.WeChatSaleService(sessionObject);
    
    if (response.decision === 'ACCEPT' && Number(response.reasonCode) === 100) {
        //set the processor token into session variable
        if (Number(response.apSaleReply.reasonCode) === 100 ) {  
        	var saleReplyURL = response.apSaleReply.merchantURL;
        	var returnURL = saleReplyURL.substring(0,saleReplyURL.length-1);
        	session.privacy.WeChatSaleRequestId = response.requestID;
        	return {submit : true, WechatMerchantURL : returnURL};
        }
        else {
        	return {error : true};
        }     
    } else {
        return {error: true};
    }
	
}

function CheckStatusService(Basket,paymentInstrument,orderNo) {
	
	var requestId = session.privacy.WeChatSaleRequestId;
	
	var paymentType = CybersourceConstants.WECHAT_PAYMENT_TYPE;
	
	var refcode = orderNo!=null ? orderNo : Basket.UUID;
	
	var response = WeChatFacade.WeChatCheckStatusService(requestId,paymentType,refcode);
	
	var result={};
	 
	if (response.decision === 'ACCEPT' && Number(response.reasonCode) === 100) {
	        //set the processor token into session variable
	        if (Number(response.apCheckStatusReply.reasonCode) === 100 && response.apCheckStatusReply.paymentStatus === 'settled') { 
	        	
	        	session.privacy.wechatCheckStatus = true;
	        	result.submit = true;      	
	        }
	        else if (Number(response.apCheckStatusReply.reasonCode) === 100 && response.apCheckStatusReply.paymentStatus === 'pending') {        	
	        	result.pending = true;   	 
	        }
	        else {	        	
	        	result.error = true;        	
	        }  
	    Transaction.wrap(function (){
        	paymentInstrument.paymentTransaction.custom.paymentStatus= response.apCheckStatusReply.paymentStatus;
			paymentInstrument.paymentTransaction.custom.processorResponse = response.apCheckStatusReply.processorResponse;
		    paymentInstrument.paymentTransaction.custom.reconsilationID = response.apCheckStatusReply.reconciliationID;		    	 
	    });
	    
	 } else {
	        result.error = true;
	 }
	return result;
}

/** Exported functions **/
module.exports = {
		HandleRequest : HandleRequest,
		AuthorizeRequest : AuthorizeRequest,
		CheckStatusService : CheckStatusService
};


