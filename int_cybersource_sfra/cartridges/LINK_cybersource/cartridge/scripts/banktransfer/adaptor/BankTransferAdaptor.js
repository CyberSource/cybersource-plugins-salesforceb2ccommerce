'use strict';

/**
* This file will contains adapter methods for Cybersource Bank Transfer
* Integration.
*/
/* API includes */
var bankTransferFacade = require('~/cartridge/scripts/banktransfer/facade/BankTransferFacade');
var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var bankTransferHelper = require(CybersourceConstants.CS_CORE_SCRIPT + '/banktransfer/helper/BankTransferHelper');
/* Script Modules */ 

/*
* This method set the request object along with other inputs to call session 
* service of bank transfer
*/
function CreateSaleServiceRequest(Order){
	
	// declare variables	
	var billingForm = session.forms.billing;
	//declare common helper variable to call its required methods
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');	
	var selectedPaymentMethod =session.forms.billing.paymentMethod.value;
	var billTo, purchaseObject, paymentType;
	var URLUtils = require('dw/web/URLUtils');
	var cancelURL = URLUtils.https('COPlaceOrder-Submit','provider','cancelfail','order_id', Order.orderNo,'order_token', Order.orderToken,'cfk',false).toString();
	var successURL = URLUtils.https('COPlaceOrder-Submit','provider','banktransfer','order_id', Order.orderNo,'order_token', Order.orderToken).toString();
	var failureURL = URLUtils.https('COPlaceOrder-Submit','provider','cancelfail','order_id', Order.orderNo,'order_token', Order.orderToken,'cfk',false).toString();
	//setting the value of payment type after getting from payment method
	paymentType = session.forms.billing.paymentMethod.value;	
	// create billto, shipto, item and purchase total object
	var result = CommonHelper.CreateCyberSourceBillToObject(Order,true);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourcePurchaseTotalsObject(Order);
	purchaseObject = result.purchaseTotals;
	result = CommonHelper.CreateCybersourceItemObject(Order);
	var items = result.items;	
	var merchantDescriptorValue;
	// get bank contact custom preference from SFCC
	var customPref = GetCustomPreferencesForBT();
	if(paymentType == 'IDL' || paymentType == 'IDL') {
		merchantDescriptorValue = customPref.merchantDescriptor.substring(0,35);
	} else {
		merchantDescriptorValue = customPref.merchantDescriptor.substring(0,27);
	}

	//declare an object to collate the input to service call
	var saleObject = {};
	saleObject.billTo = billTo;
	saleObject.purchaseObject = purchaseObject;
	saleObject.items = items;
	saleObject.paymentType = paymentType;
	saleObject.cancelURL = cancelURL;
	saleObject.successURL = successURL;
	saleObject.failureURL = failureURL;
	saleObject.merchantDescriptor = merchantDescriptorValue;
	saleObject.merchantDescriptorContact = customPref.merchantDescriptorContact;
	saleObject.merchantDescriptorStreet = customPref.merchantDescriptorStreet;
	saleObject.merchantDescriptorCity = customPref.merchantDescriptorCity;
	saleObject.merchantDescriptorState = customPref.merchantDescriptorState;
	saleObject.merchantDescriptorPostalCode = customPref.merchantDescriptorPostalCode;
	saleObject.merchantDescriptorCountry = customPref.merchantDescriptorCountry;
	saleObject.orderNo = Order.orderNo;
	if(paymentType == 'IDL') {
		if(bankTransferHelper.isBankListRequired(session.forms.billing.paymentMethod.value)){
			 saleObject.paymentOptionID = session.forms.billing.bankListSelection.value;
		}
	}
	//set the swiftcode (bank swift code), if available
	if(bankTransferHelper.isBicRequired(session.forms.billing.paymentMethod.value)) {
		if(paymentType == 'EPS') {
			saleObject.bicNumber = session.forms.billing.epsBic.value;
		} else if(paymentType == 'GPY'){
			saleObject.bicNumber = session.forms.billing.giropayBic.value;
		}
	}
	
	//call session method of libCybersourceHelper to create session request
	var saleResponse = bankTransferFacade.BankTransferSaleService(saleObject);
	
	AuthorizeBankTransferOrderUpdate(Order,saleResponse,paymentType);
	/*return the response as per decision and reason code, redirect the user to
	 merchant site for payment completion*/
	if (saleResponse.decision === 'ACCEPT' && saleResponse.reasonCode.get() === 100) {
		session.privacy.order_id = Order.orderNo;
		switch(saleResponse.apSaleReply.paymentStatus)
		{				
			case 'pending':
				return {redirection : true, redirectionURL : saleResponse.apSaleReply.merchantURL};
			case 'failed':
				return {error : true};
			default:
				return {error : true};
		}
	} else if(saleResponse.decision === 'REJECT'){
			return {declined: true};
	} else if(saleResponse.decision === 'REVIEW'){
			return {pending: true};
	} else {
		return {error: true};
	}
}

/*
* This method will get custom preference for Bank transfer
* from SFCC and set the value is object 
*/
function GetCustomPreferencesForBT(){
	var Site = require('dw/system/Site');
	var customPref = {};
	customPref.merchantDescriptor = Site.getCurrent().getCustomPreferenceValue('merchantDescriptor');
	customPref.merchantDescriptorContact = Site.getCurrent().getCustomPreferenceValue('merchantDescriptorContact');
	customPref.merchantDescriptorStreet = Site.getCurrent().getCustomPreferenceValue('merchantDescriptorStreet');
	customPref.merchantDescriptorCity = Site.getCurrent().getCustomPreferenceValue('merchantDescriptorCity');
	customPref.merchantDescriptorState = Site.getCurrent().getCustomPreferenceValue('merchantDescriptorState');
	customPref.merchantDescriptorPostalCode = Site.getCurrent().getCustomPreferenceValue('merchantDescriptorPostalCode');
	customPref.merchantDescriptorCountry = Site.getCurrent().getCustomPreferenceValue('merchantDescriptorCountry');
	return customPref;
}
/*
* This method set the request object along with other inputs to call check status 
* service of Bank Transfer
*/
function CheckStatusServiceRequest(Order){
	//create helper variable
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper.js');
	//call check status service
	var response = CommonHelper.CheckStatusServiceRequest(Order);
	//return response
	return response;
}

/*Create payment instrument along and check if payment method for bank 
 * transfer is not as per the value mentioned in site preference 
 * */
function HandleRequest(Basket){
	
	//create helper variable
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper.js');
	//call handle request method
	var response = CommonHelper.HandleRequest(Basket);
	//return response
	return response;
	
}

function AuthorizeRequest(orderNo,paymentInstrument){
	
	var OrderMgr = require('dw/order/OrderMgr');
	var Order = OrderMgr.getOrder(orderNo);
    var PaymentMgr = require('dw/order/PaymentMgr');
    //get the payment processor and assign its value in payment transaction object
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    //call sale service and process the response
    var response = CreateSaleServiceRequest(Order);
    session.privacy.isPaymentRedirectInvoked = true;
	session.privacy.orderID = orderNo;
    return response;
	
}
/*Update Payment Transaction details after sale service of bank transfer */
function AuthorizeBankTransferOrderUpdate(order,responseObject,paymentType) 
{
	//declare transaction
	var Transaction = require('dw/system/Transaction');
	Transaction.wrap(function () {
	var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	//get payment instrument detail
	var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
	//set transaction level object with custom values after getting response of sale service
	if( paymentInstrument != null && responseObject !== null){
		paymentInstrument.paymentTransaction.custom.approvalStatus = responseObject.reasonCode.get();
		paymentInstrument.paymentTransaction.custom.requestId = responseObject.requestID;
		paymentInstrument.paymentTransaction.custom.requestToken = responseObject.requestToken;
		paymentInstrument.paymentTransaction.custom.apPaymentType = paymentType;
		if(responseObject.apSaleReply !== null){
			ProcessResponse(responseObject.apSaleReply, paymentInstrument, order);
		}	
	}
	});	
}

/*Common function to update transaction level details*/
function ProcessResponse(responseObject, paymentInstrument, order){
	
	//update instrument level variables
	paymentInstrument.paymentTransaction.custom.apInitiatePaymentReconciliationID = responseObject.reconciliationID;
	paymentInstrument.paymentTransaction.custom.apPaymentStatus = responseObject.paymentStatus;
	//change the order payment status to paid after getting authorized or settled response
	if(responseObject.reasonCode.get() === 100 && (responseObject.paymentStatus === "authorized"
		|| responseObject.paymentStatus === "settled")){
		order.paymentStatus = 2;
	}
}

/** Exported functions **/
module.exports = {
		CheckStatusServiceRequest : CheckStatusServiceRequest,
		HandleRequest : HandleRequest,
		AuthorizeRequest : AuthorizeRequest
		
};