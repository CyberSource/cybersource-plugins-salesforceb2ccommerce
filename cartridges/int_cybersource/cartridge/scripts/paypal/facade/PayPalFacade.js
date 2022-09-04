'use strict';
var Logger = dw.system.Logger.getLogger('Cybersource');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var csReference = webreferences2.CyberSourceTransaction;
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var CybersourceHelper = libCybersource.getCybersourceHelper();
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');
/**
 * Capture all theinformation relate dto paypal payment method.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */
function payPalSerivceInterface(request)
{
	var serviceResponse = null;
	//setting response in response object
	try{
		// Load the service configuration
		var service = CSServices.CyberSourceTransactionService;
		
		var paymentMethod= session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
		// getting merchant id and key for specific payment method
		var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(paymentMethod);
		var requestWrapper={};
	    request.merchantID = merchantCrdentials.merchantID;
		requestWrapper.request =request;
		requestWrapper.merchantCredentials = merchantCrdentials;
		// call the service based on input
		serviceResponse = service.call(requestWrapper);
	} catch(e) {
		Logger.error("[PayPalFacade.js] Error in ServiceInterface ( {0} )",e.message);
		return null;
	}

	if(empty(serviceResponse) || serviceResponse.status !== 'OK')
	{
		Logger.error("[libCybersource.js] Error in ServiceInterface: null response");
		return null;
	}
	serviceResponse = serviceResponse.object;
		
	
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	CommonHelper.LogResponse(serviceResponse.merchantReferenceCode, serviceResponse.requestID, serviceResponse.requestToken, Number(serviceResponse.reasonCode), serviceResponse.decision);
		   
	return serviceResponse;
}

/*****************************************************************************
	 * Name: sessionService
	 * Description: Creates request for Cybersource Session Service .
	 * param : Request stub, lineitemcontainer 
	 ****************************************************************************/
function sessionService(lineItemCntr,args){
	var request = new csReference.RequestMessage();
	createBasicRequest('sessionService',request,lineItemCntr);
	libCybersource.setClientData( request, lineItemCntr.UUID); 
	var sessionService = new csReference.APSessionsService();
	__addFundingSource(request);
	if(args.billingAgreementFlag){
		__addBillingAgreementIndicator(request);
	}
	if(args.payPalCreditFlag){
		//If User has agredd to make payment using PayPal Credit feature
		sessionService.paymentOptionID = 'Credit';
		session.forms.billing.paymentMethods.selectedPaymentMethodID.value=CybersourceConstants.METHOD_PAYPAL_CREDIT;
	}else{
		session.forms.billing.paymentMethods.selectedPaymentMethodID.value=CybersourceConstants.METHOD_PAYPAL;
	}
	sessionService.run = true;
	request.apPaymentType ='PPL';
	request.apSessionsService=sessionService;
	return payPalSerivceInterface(request);
}
/*****************************************************************************
	 * Name: addFundingSource
	 * Description: Adds the funding source.The value is based on site preference
	 * param : request
****************************************************************************/
function __addFundingSource(request){
	var ap  = new csReference.AP();
	ap.fundingSource = require('dw/system/Site').getCurrent().getCustomPreferenceValue('CsFundingSource');
	request.ap = ap;
}	

function __addBillingAgreementIndicator(request){
 	request.ap.billingAgreementIndicator = true;
}

function __addBillingAgreementId(request,lineItemCntr){
	var isPayPalCredit=false;
	var isBillingAgreement = false;
	var paymentInstruments = lineItemCntr.paymentInstruments;
	// Iterate on All Payment Instruments and check if PayPal Credit Payment Method was used
	for each(var paymentInstrument in paymentInstruments ){
		/*
	 	* Check if payment method used is PayPal Credit
	 	* If it is PayPal Credit then Billing Agreement Flag needs to be set as false
		*/
		if(paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL_CREDIT)){
			isPayPalCredit = true;
		}
	}
	
	//checking if customer is authenticated
	if(customer.authenticated && require('dw/system/Site').getCurrent().getCustomPreferenceValue('payPalBillingAgreements') && !isPayPalCredit){
	/*
	* If Billing Agreement is not null then add it to service request instead of the
	* session request ID
	*/
		if(!empty(customer.profile.custom.billingAgreementID)){
			if(null == request.ap){
				var ap = new CybersourceHelper.csReference.AP();
				ap.billingAgreementID = customer.profile.custom.billingAgreementID;
				request.ap = ap;
			} else{
				request.ap.billingAgreementID = customer.profile.custom.billingAgreementID;
			}
			isBillingAgreement = true;
			var Transaction = require('dw/system/Transaction');
			for each(var paymentInstrument in paymentInstruments ){
				if(paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL)){
					Transaction.wrap(function(){
						paymentInstrument.paymentTransaction.custom.billingAgreementID = customer.profile.custom.billingAgreementID;
					});
				}
			}
		} 
	}
 return isBillingAgreement;
}

/*****************************************************************************
	 * Name: addDecisionManager
	 * Description: Adds the decision manager.The value is based on site preference
	 * param : request
****************************************************************************/
function __addDecisionManager(request){
	request.decisionManager  = new csReference.DecisionManager();
	request.decisionManager.enabled = require('dw/system/Site').getCurrent().getCustomPreferenceValue('isDecisionManagerEnable');
	//request.decisionManager = decisionManager;
}
/*****************************************************************************
	 * Name: checkStatusService
	 * Description: Returns Returns customer information.Returns the billing agreement details 
	 * if you initiated the creation of a billing agreement
	 * param : request, orderNo , requestID, alipayPaymentType 
****************************************************************************/
function checkStatusService(lineItemCntr,requestId){
	//create request stub for check status service
	var request = new csReference.RequestMessage();
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	
	request.merchantID = CybersourceHelper.getMerchantID();
	libCybersource.setClientData(request,lineItemCntr.UUID);
	request.apPaymentType = 'PPL';
	
	var apCheckStatusService = new CybersourceHelper.csReference.APCheckStatusService();
	var isBillingAgreement = false;
	if(!__addBillingAgreementId(request,lineItemCntr)){
		apCheckStatusService.checkStatusRequestID = requestId;
	}else{
		isBillingAgreement = true;
	}
	request.apCheckStatusService=apCheckStatusService;
	request.apCheckStatusService.run=true;
	var result ={};
	result.checkStatusResponse = payPalSerivceInterface(request);
	result.isBillingAgreement = isBillingAgreement;
	var translatedObject = CommonHelper.decodeObj({
        street1: result.checkStatusResponse.shipTo.street1,
        city: result.checkStatusResponse.shipTo.city
        });
    result.checkStatusResponse.shipTo.street1 = translatedObject.street1;
    result.checkStatusResponse.shipTo.city = translatedObject.city;
	return result;
}
	 
/*****************************************************************************
	 * Name: OrderService
	 * Description: Initiate the order at CyberSource.
	 * param : Request stub ,order object and Payment type
****************************************************************************/
function orderService(lineItemCntr,paymentInstrument){
	//create request stub for order service
	var serviceRequest = new csReference.RequestMessage(),sessionRequestID;
	createBasicRequest('orderService',serviceRequest,lineItemCntr);
	libCybersource.setClientData( serviceRequest, lineItemCntr.orderNo); 
	serviceRequest.apPaymentType = 'PPL';
	var paymentInstruments = lineItemCntr.paymentInstruments;
	
	var ap =new CybersourceHelper.csReference.AP();
	// Set the payerID 
	ap.payerID = paymentInstrument.paymentTransaction.custom.payerID;
	serviceRequest.ap =ap;
	sessionRequestID = paymentInstrument.paymentTransaction.custom.requestId;
	
	var apOrderService = new CybersourceHelper.csReference.APOrderService();
	//set the request ID
	apOrderService.sessionsRequestID = sessionRequestID;
	serviceRequest.apOrderService=apOrderService;
	serviceRequest.apOrderService.run=true;
	return payPalSerivceInterface(serviceRequest);
}

function createBasicRequest(typeofService,request,lineItemCntr){
	var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var purchase,itemList,billTo,shipTo;
	purchase = commonHelper.GetPurchaseTotal(lineItemCntr);
	request.purchaseTotals = libCybersource.copyPurchaseTotals( purchase );
	if(lineItemCntr.getGiftCertificatePaymentInstruments().size() === 0){
		itemList = commonHelper.GetItemObject(typeofService,lineItemCntr);
	}
	var items  = [];
	if(!empty(itemList))
	{
		for each(var item in itemList){
			items.push(libCybersource.copyItemFrom(item));
		}
	}
	request.item = items;
	if(lineItemCntr.defaultShipment.shippingAddress !==null){
	   billTo = commonHelper.CreateCyberSourceBillToObject(lineItemCntr,true).billTo;
	   shipTo = commonHelper.CreateCybersourceShipToObject(lineItemCntr).shipTo;
	 	if(billTo!==null && shipTo!==null ){
	 	  	request.billTo = libCybersource.copyBillTo( billTo );
		  	request.shipTo = libCybersource.copyShipTo( shipTo );
	 	  }
	 }
}


	/*****************************************************************************
	 * Name: AuthorizeService
	 * Description: Initiate the authorization service at CyberSource for PayPal custom order.
	 * param : Request stub ,order object and Payment type
	 ****************************************************************************/
	function authorizeService(lineItemCntr,paymentInstrument){
		//create request stub for sale service
		var serviceRequest = new csReference.RequestMessage();
		createBasicRequest('authorizeService', serviceRequest,lineItemCntr);
		CybersourceHelper.apDecisionManagerService(paymentInstrument.paymentMethod, serviceRequest);
		if(serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()){
			libCybersource.setClientData( serviceRequest, lineItemCntr.orderNo,session.sessionID); 	
		}else{
			libCybersource.setClientData( serviceRequest, lineItemCntr.orderNo); 
		}
		__addFundingSource(serviceRequest);
		serviceRequest.apPaymentType = 'PPL';
		var apAuthService = new CybersourceHelper.csReference.APAuthService();
		//set the request ID
		apAuthService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
		serviceRequest.apAuthService=apAuthService;
		serviceRequest.apAuthService.run=true;	
		return payPalSerivceInterface(serviceRequest);
	}
	
	
	/*****************************************************************************
	 * Name: SaleService
	 * Description: Initiate the order at CyberSource for Paypal standard order.
	 * param : Request stub ,order object and Payment type
	 ****************************************************************************/
	 function saleService(lineItemCntr,paymentInstrument){
	 	//create request stub for sale service
		var serviceRequest = new csReference.RequestMessage();
		var paymentTransaction =  paymentInstrument.paymentTransaction;
		createBasicRequest('saleService',serviceRequest,lineItemCntr);
		__addDecisionManager(serviceRequest);
		if(serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()){
			libCybersource.setClientData( serviceRequest, lineItemCntr.orderNo,session.sessionID); 	
		}else{
			libCybersource.setClientData( serviceRequest, lineItemCntr.orderNo); 
		}
		var apSaleService = new CybersourceHelper.csReference.APSaleService();
		__addFundingSource(serviceRequest);
		if(!__addBillingAgreementId(serviceRequest,lineItemCntr)){
			apSaleService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
		}
		serviceRequest.apSaleService=apSaleService;
		serviceRequest.apPaymentType = 'PPL';
		serviceRequest.apSaleService.run=true;	
		return payPalSerivceInterface(serviceRequest);
	 }
	 
	 /*****************************************************************************
	 *Name : BillngAggrementService
	 *Description this method will create the request and submit the request for billing agreement
	 *Param : 
	 *****************************************************************************/
	 function billagreementService(requestId,orderRef){
	 	var serviceRequest = new csReference.RequestMessage()
	 	serviceRequest.merchantID = CybersourceHelper.getMerchantID();
	 	libCybersource.setClientData( serviceRequest, orderRef); 
	 	serviceRequest.apPaymentType = 'PPL';
	 	var apBillingAgreementService = new CybersourceHelper.csReference.APBillingAgreementService();
		apBillingAgreementService.sessionsRequestID = requestId;
		serviceRequest.apBillingAgreementService = apBillingAgreementService;
		serviceRequest.apBillingAgreementService.run = true;
		return payPalSerivceInterface(serviceRequest);
	 }
module.exports = {
		SessionService : sessionService,
		CheckStatusService : checkStatusService,
		OrderService : orderService,
		AuthorizeService : authorizeService,
		SaleService : saleService,
		BillingAgreement : billagreementService
}