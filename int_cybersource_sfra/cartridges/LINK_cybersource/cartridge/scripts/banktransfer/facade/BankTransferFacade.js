'use strict';

/**
* This script call service to initiate payment for and
* set the response in response object. also handles the logging
* of different error scenarios while making service call.
**/
function BankTransferServiceInterface(request)
{   	
	//calling the service by passing Bank Transfer request
	var paymentMethod= session.forms.billing.paymentMethod.value;
	var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
	var serviceResponse =  commonFacade.CallCYBService(paymentMethod,request);
	//return response object
	return serviceResponse;
}

/**
* This function is creating the request for bank transfer sale service
* by getting saleObject and request reference as input
**/
function BankTransferSaleService(saleObject){
	// declare soap reference variable
	var csReference = webreferences.CyberSourceTransaction;
	// create reference of request object 
	var request = new csReference.RequestMessage();
	//declare variables for libcybersource and helper
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	//set the merchant ID in request
	request.merchantID = CybersourceHelper.getMerchantID();
	//set client data in request
	libCybersource.setClientData(request, saleObject.orderNo);
	//set purchase total and payment type
	request.purchaseTotals = libCybersource.copyPurchaseTotals(saleObject.purchaseObject);
	request.apPaymentType = saleObject.paymentType;
	var apSaleService = new CybersourceHelper.csReference.APSaleService();
	var invoiceHeader = new CybersourceHelper.csReference.InvoiceHeader();
	//decision manager changes
	var decisionManager = new CybersourceHelper.csReference.DecisionManager();
	if(!empty(saleObject.bicNumber)){
		var bankInfo = new CybersourceHelper.csReference.BankInfo();
		bankInfo.swiftCode = saleObject.bicNumber;
		request.bankInfo = bankInfo;
	}
	//set billTo object
	if(saleObject.billTo !== null){
		request.billTo  = libCybersource.copyBillTo( saleObject.billTo );
	}
	//set item object
	var items = [];
	if(!empty(saleObject.items))
	{
		var iter : dw.util.Iterator = saleObject.items.iterator();
		while(iter.hasNext())
		{
			items.push(libCybersource.copyItemFrom(iter.next()));
		}
	}
	request.item = items;
	//set cancel, success and failure URL
	invoiceHeader.merchantDescriptor = saleObject.merchantDescriptor;
	invoiceHeader.merchantDescriptorContact = saleObject.merchantDescriptorContact;
	invoiceHeader.merchantDescriptorStreet = saleObject.merchantDescriptorStreet;
	invoiceHeader.merchantDescriptorCity = saleObject.merchantDescriptorCity;
	invoiceHeader.merchantDescriptorState = saleObject.merchantDescriptorState;
	invoiceHeader.merchantDescriptorPostalCode = saleObject.merchantDescriptorPostalCode;
	invoiceHeader.merchantDescriptorCountry = saleObject.merchantDescriptorCountry;
	decisionManager.enabled = false;
	apSaleService.cancelURL = saleObject.cancelURL;
	apSaleService.successURL = saleObject.successURL;
	apSaleService.failureURL = saleObject.failureURL;
	//set invoice header and sale service
	request.invoiceHeader= invoiceHeader;
	//set Bank option if for iDeal bank
	if(saleObject.paymentOptionID){
		apSaleService.paymentOptionID = saleObject.paymentOptionID;
	}
	request.decisionManager = decisionManager;
	request.apSaleService= apSaleService;
	
	//set run instance to true
	request.apSaleService.run = true;
	
	//call service to get the response
	var response = BankTransferServiceInterface(request);
	//return response
	return response;
}

/*****************************************************************************
 * Name: RefundService
 * Description: Initiate refund CyberSource for Banktransfer order.
 * param : Request stub ,order object and Payment type
****************************************************************************/
function BanktransferRefundService(requestID, merchantRefCode, paymentType, amount, currency){
	var Logger = dw.system.Logger.getLogger('Cybersource');
	var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	
	var csReference = webreferences.CyberSourceTransaction;
	var serviceRequest = new csReference.RequestMessage();
	
	var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount);
	purchaseObject = purchaseObject.purchaseTotals;
	serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);
	
	libCybersource.setClientData(serviceRequest, merchantRefCode);
	CybersourceHelper.banktransferRefundService(serviceRequest, merchantRefCode, requestID, paymentType);
	
	//  Provide ability to customize request object with a hook.
	var HookMgr = require('dw/system/HookMgr');
	if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
	    var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Credit', serviceRequest);
	    if (!empty(modifiedServiceRequest)) {
	    serviceRequest = modifiedServiceRequest;
	    }
	}
	
	var serviceResponse = null;
	// send request
	try{
		var service = CSServices.CyberSourceTransactionService;
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.BANK_TRANSFER_PAYMENT_METHOD);
		var requestWrapper={};
	    serviceRequest.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request = serviceRequest;
		requestWrapper.merchantCredentials = merchantCrdentials; 
		serviceResponse = service.call(requestWrapper); 
	}catch(e){
		var err = e;
		Logger.error("[BankTransferFacade.ds] Error in BankTransferRefundService request ( {0} )",e.message);
		return {error:true, errorMsg:e.message};
	}
	
	if(empty(serviceResponse) || serviceResponse.status !== "OK"){
		Logger.error("[BankTransferFacade.ds] response in BankTransferFacadeService response ( {0} )",serviceResponse);
		return {error:true, errorMsg:"empty or error in BankTransferFacadeRefundService response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;
	return serviceResponse;
}

/** Exported functions **/
module.exports = {
		BankTransferSaleService : BankTransferSaleService,
		BanktransferRefundService : BanktransferRefundService
	};