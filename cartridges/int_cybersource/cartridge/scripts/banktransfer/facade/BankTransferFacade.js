'use strict';

var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var CybersourceHelper = libCybersource.getCybersourceHelper();

/**
* This script call service to initiate payment for and
* set the response in response object. also handles the logging
* of different error scenarios while making service call.
**/
function BankTransferServiceInterface(paymentMethod, request)
{   	
	//calling the service by passing Bank Transfer request
	// var paymentMethod= session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
	var serviceResponse =  commonFacade.CallCYBService(paymentMethod,request);
	//return response object
	return serviceResponse;
}

function buildRequestObject(saleObject, config) {
    var csReference = webreferences2.CyberSourceTransaction;
    // create reference of request object
    var request = new csReference.RequestMessage();

    // set the merchant ID in request
    request.merchantID = CybersourceHelper.getMerchantID();

    // if (empty(config.decision)) {
        libCybersource.setClientData(request, saleObject.orderNo);
    // }

    // set purchase total and payment type
    request.purchaseTotals = libCybersource.copyPurchaseTotals(saleObject.purchaseObject);
    request.apPaymentType = saleObject.paymentType;

    var invoiceHeader = new CybersourceHelper.csReference.InvoiceHeader();
    // eslint-disable-next-line
    if (!empty(saleObject.bicNumber)) {
        var bankInfo = new CybersourceHelper.csReference.BankInfo();
        bankInfo.swiftCode = saleObject.bicNumber;
        request.bankInfo = bankInfo;
    }
    // set billTo object
    // eslint-disable-next-line
    if (saleObject.billTo != null) {
        request.billTo = libCybersource.copyBillTo(saleObject.billTo);
    }
    // set item object
    var items = [];
    // eslint-disable-next-line
    if (!empty(saleObject.items)) {
        var iter = saleObject.items.iterator();
        while (iter.hasNext()) {
            items.push(libCybersource.copyItemFrom(iter.next()));
        }
    }
    request.item = items;
    // set cancel, success and failure URL
    invoiceHeader.merchantDescriptor = saleObject.merchantDescriptor;
    invoiceHeader.merchantDescriptorContact = saleObject.merchantDescriptorContact;
    invoiceHeader.merchantDescriptorStreet = saleObject.merchantDescriptorStreet;
    invoiceHeader.merchantDescriptorCity = saleObject.merchantDescriptorCity;
    invoiceHeader.merchantDescriptorState = saleObject.merchantDescriptorState;
    invoiceHeader.merchantDescriptorPostalCode = saleObject.merchantDescriptorPostalCode;
    invoiceHeader.merchantDescriptorCountry = saleObject.merchantDescriptorCountry;

    request.invoiceHeader = invoiceHeader;

    if (empty(config.decision)) {
        CybersourceHelper.apDecisionManagerService(config.paymentMethod, request);
    } else {
        request.decisionManager = new CybersourceHelper.csReference.DecisionManager();
        request.decisionManager.enabled = CybersourceHelper.getBankTransferDecisionManagerFlag();
    }

    return request;
}

/**
* This function is creating the request for bank transfer sale service
* by getting saleObject and request reference as input
**/
function BankTransferSaleService(saleObject, paymentMethod) {
	var config = {};
    config.paymentMethod = paymentMethod;

    // Build an object for the DM Standalon (AFSService) call
    var request = buildRequestObject(saleObject, config);
    // Make the AFSService call
    var response = BankTransferServiceInterface(paymentMethod, request);

    // session.privacy.CybersourceFraudDecision = response.decision;
    config.decision = response.decision;

    if (response.decision === 'ACCEPT' || response.decision === 'REVIEW') {
        // Build an object for ApSaleCall
        request = buildRequestObject(saleObject, config);
        CybersourceHelper.postPreAuth(saleObject, request);
        // Make the ApSale call
        return BankTransferServiceInterface(paymentMethod, request);
    }

    return response;
}

/** Exported functions **/
module.exports = {
	BankTransferSaleService : BankTransferSaleService
};