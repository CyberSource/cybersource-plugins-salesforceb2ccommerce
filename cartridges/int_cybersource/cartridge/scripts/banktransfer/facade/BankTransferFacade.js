'use strict';

/**
* This script call service to initiate payment for and
* set the response in response object. also handles the logging
* of different error scenarios while making service call.
**/
function BankTransferServiceInterface(request)
{   	
	//calling the service by passing Bank Transfer request
	var paymentMethod= session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
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
	var csReference = webreferences2.CyberSourceTransaction;
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

/** Exported functions **/
module.exports = {
		BankTransferSaleService : BankTransferSaleService
	};