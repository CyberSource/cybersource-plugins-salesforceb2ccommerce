'use strict';

/**
* This file will contains adapter methods for Cybersource paypal
* Integration.
*/

/* Initialize session for transaction with Cybersource
 * param
 */
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var Logger =require('dw/system/Logger').getLogger('Cybersource');
var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
var csReference = webreferences.CyberSourceTransaction;
var Transaction = require('dw/system/Transaction');


/**
 * Initialize call to CyberSource Init Session service
 * @param LineItemCtnr,BillingAgreementFlag
 * @returns response from CyberSource Init Session service
 */


function initiateExpressCheckout(lineItemCntr,args){
	var result={};
	if(lineItemCntr === null){
		Logger.error("Basket is Empty!");
		result.success = false;
	}
	var paypalFacade = require(CybersourceConstants.PATH_FACADE+'PayPalFacade');
	var response = paypalFacade.SessionService(lineItemCntr,args);
	//process response received from service
	if(!empty(response) && response.reasonCode.get() === 100){
		result.success = true;
		result.requestID = response.requestID;
		result.processorTransactionID = response.apSessionsReply.processorTransactionID;
	}
	return result;
}




/**
 * Set the shipping address details
 * @param lineItemCtnr
 * redirect to cart's calculate method
 */

function setShippingMethod(lineItemCntr){
	var applicableShippingMethods;
    var shipment = lineItemCntr.getDefaultShipment();
    var ShippingMgr = require('dw/order/ShippingMgr');
    if(!empty(session.forms.shipping.shippingAddress.shippingMethodID.value)){
    	  var shippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods();
          // Tries to set the shipment shipping method to the passed one.
          for (var i = 0; i < shippingMethods.length; i++) {
              var method = shippingMethods[i];
              if(method.ID.equals(session.forms.shipping.shippingAddress.shippingMethodID.value))
               {
            	  shipment.setShippingMethod(method);
               }
          }
    }else{
    	var defaultShippingMethod = ShippingMgr.getDefaultShippingMethod();
        shipment.setShippingMethod(defaultShippingMethod);
    }
}

/**
 * Initialize call to CyberSource Order service
 * @param order
 * @returns response from CyberSource Order Service
 */
function orderService(order,paymentInstrument){
	try{
		var paypalFacade = require('../facade/PayPalFacade');
		var response = {};
		var orderServiceResponse;
		orderServiceResponse = paypalFacade.OrderService(order,paymentInstrument);
		//process response received from service
		if(!empty(orderServiceResponse) && orderServiceResponse.reasonCode.get() === 100 && orderServiceResponse.apOrderReply.status==='CREATED'){
		    Transaction.wrap(function ()
	    		{
		    	 // save order Request ID to be used in Sale service	
		    	 paymentInstrument.paymentTransaction.custom.orderRequestID = orderServiceResponse.requestID;
		    	 paymentInstrument.paymentTransaction.custom.orderID = orderServiceResponse.apReply.orderID;
		    	 if(!empty(orderServiceResponse.apReply) && !empty(orderServiceResponse.apReply.fundingSource)){
		    		 paymentInstrument.paymentTransaction.custom.fundingSource =orderServiceResponse.apReply.fundingSource;
		    	 }
		    	 paymentInstrument.paymentTransaction.custom.processorResponse = orderServiceResponse.apOrderReply.processorResponse;
		    	 paymentInstrument.paymentTransaction.custom.reconsilationID = orderServiceResponse.apOrderReply.reconciliationID;
		    	  
	   			});
		    	response.orderCreated=true;
			}else{
				response.orderCreated=false;
			}
		}catch(e){
			Logger.error('Error while executing orderService method in PayPal Adatper' +e);
		}finally{
			return response;
		}
}


/**
 * Initialize call to CyberSource Check Status service
*
 * @returns response from CyberSource Check Status Service
 */

function initSessionCallback(lineItemCntr,args){
	var result = {};	
	var paymentID = args.paymentID;
	var payerID = args.payerID;
	var requestID = args.requestId;
	var paymentID = args.paymentID;
	var billingAgreementFlag = args.billingAgreementFlag;
	try{
		//If the flag for creation of Billing Agreement is checked
		if(customer.authenticated && billingAgreementFlag){
			if(!billingAgreementService(requestID,lineItemCntr).created){
				result.success = false;
				return result;	
			}
		 }
		 var paypalFacade = require('../facade/PayPalFacade');
		 var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
		 var skipShipAddressValidation;
		 var checkStatusResult = paypalFacade.CheckStatusService(lineItemCntr,requestID);
		 result.shippingAddressMissing = false;
		 result.billingAddressMissing = false;
		 skipShipAddressValidation = checkStatusResult.isBillingAgreement ? true : false;
		 if(!empty(checkStatusResult) && checkStatusResult.checkStatusResponse.reasonCode.get() === 100){
		 	// Shipping address is overriden with billing address for PayPal Billing Agreement, no need to validate shipping address.
		 	if (!skipShipAddressValidation && !commonHelper.ValidatePayPalShippingAddress(checkStatusResult.checkStatusResponse, lineItemCntr)){
		 		result.shippingAddressMissing = true;
		 	}
		 	if (!commonHelper.ValidatePayPalBillingAddress(checkStatusResult.checkStatusResponse, lineItemCntr)){
		 		result.billingAddressMissing = true;
		 	}
		 	 Transaction.wrap(function () {
		 		if(checkStatusResult.isBillingAgreement){
		 			commonHelper.AddAddressToCart(lineItemCntr,checkStatusResult.checkStatusResponse,true);
		 		}else{
		 			commonHelper.AddAddressToCart(lineItemCntr,checkStatusResult.checkStatusResponse,false);
		 		} 
		 	    setShippingMethod(lineItemCntr);
		 	 });
			result.success = true;
				result.payerID = checkStatusResult.checkStatusResponse.apReply.payerID;
				result.transactionProcessorID = checkStatusResult.checkStatusResponse.apCheckStatusReply.processorTransactionID;
				result.requestID = checkStatusResult.checkStatusResponse.requestID;
		}		
	}catch(e){
		var testparam = e;
		Logger.error('Error while executing method initSessionCallback in PayPal Adapter'+e);
	}finally{
	  return result;
	}
}

/**
 * Initialize call to PayPal Billing Agreement Service
 * @param 
 * @returns response from PayPal Billing Agreement Service
 */
function billingAgreementService(requestId,order){
	var result={};
	var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var paypalFacade = require('../facade/PayPalFacade'),response;
	response = paypalFacade.BillingAgreement(requestId,order.UUID);
	if(!empty(response) && response.reasonCode.get() === 100){
		
		 var paymentInstruments = order.paymentInstruments,pi;
		 for each(var paymentInstrument in paymentInstruments ){
			 if(paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL)){
				pi = paymentInstrument;
			 } 
		 }
		//Add Billing AgreementID to Customer Profile for future use
		Transaction.wrap(function(){
			customer.profile.custom.billingAgreementID = response.apReply.billingAgreementID;
			//commonHelper.AddAddressToCart(order,response,true);
			//pi.paymentTransaction.custom.billingAgreementStatus = response.apBillingAgreementReply.status;
			session.privacy.billingAgreementStatus = response.apBillingAgreementReply.status;
		});
		result.created=true;
	}else{
		result.created=false;
	}
	return result;
}


/**
 * Initialize call to CyberSource Authorize service
 * @param order
 * @returns response from CyberSource Authorize Service
 */

function authorizeService(order,paymentInstrument)
{
	var result={};
try{
		var paymentTransaction =  paymentInstrument.paymentTransaction;
		var paypalFacade = require('../facade/PayPalFacade');
		var response = paypalFacade.AuthorizeService(order,paymentInstrument);
		//process response received from sale service
		if(!empty(response) && response.decision.equals('ACCEPT')&& response.apAuthReply.paymentStatus === 'AUTHORIZED' && response.reasonCode.get() === 100){
			 Transaction.wrap(function (){
				paymentTransaction.transactionID = response.apAuthReply.processorTransactionID;
				paymentTransaction.custom.paymentStatus= response.apAuthReply.paymentStatus;
				if(!empty(response.apReply) && !empty(response.apReply.processorFraudDecisionReason)){
					paymentTransaction.custom.processorFraudDecisionReason= response.apReply.processorFraudDecisionReason;
				}
				paymentTransaction.custom.authProcessorTID = response.apAuthReply.processorTransactionID;
				paymentTransaction.custom.authRequestID = response.requestID;
				paymentTransaction.custom.authRequestToken =  response.requestToken;
				if(!empty(response.apReply) && !empty(response.apReply.fundingSource)){
				  paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
				}
			 });
			result.authorized = true;
		}else if(!empty(response) && response.decision.equals('ACCEPT')&& response.apAuthReply.paymentStatus === 'PENDING' && response.reasonCode.get() === 100){
			     Transaction.wrap(function (){
			     paymentTransaction.transactionID = response.apAuthReply.processorTransactionID;
				 paymentTransaction.custom.paymentStatus= response.apAuthReply.paymentStatus;
				 if(!empty(response.apReply) && !empty(response.apReply.processorFraudDecisionReason)){
						paymentTransaction.custom.processorFraudDecisionReason= response.apReply.processorFraudDecisionReason;
				 }
				 paymentTransaction.custom.authProcessorTID = response.apAuthReply.processorTransactionID;
				 paymentTransaction.custom.authRequestID = response.requestID;
				 paymentTransaction.custom.authRequestToken =  response.requestToken;
				 if(!empty(response.apReply) && !empty(response.apReply.fundingSource)){
				  paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
				 }
			 });
			result.pending = true;
		}else if(!empty(response) && response.decision.equals('REVIEW') && response.reasonCode.get() === 480){
			     Transaction.wrap(function (){
				 paymentTransaction.transactionID = response.apAuthReply.processorTransactionID;
			     paymentTransaction.custom.paymentStatus= response.apAuthReply.paymentStatus;
			     if(!empty(response.apReply) && !empty(response.apReply.processorFraudDecisionReason)){
						paymentTransaction.custom.processorFraudDecisionReason= response.apReply.processorFraudDecisionReason;
			     }
			     paymentTransaction.custom.authProcessorTID = response.apAuthReply.processorTransactionID;
			     paymentTransaction.custom.authRequestID = response.requestID;
			     paymentTransaction.custom.authRequestToken =  response.requestToken;
			     if(!empty(response.apReply) && !empty(response.apReply.fundingSource)){
					 paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
			     }
			 });
			result.pending = true;
		}else if(!empty(response) && response.decision.equals('REJECT') && response.reasonCode.get() === 481) {
			handlePayPalReject(paymentInstrument);
			result.rejected = true;
		}
		else{
			result.error = true;
		}
	}catch(e){
			Logger.error('Error while executing authorizeService method in PayPal Adatper' + e);
	}finally{
			return result;
	}

}

/**
 * Initialize call to CyberSource Sale service
 * @param order
 * @returns response from CyberSource Sale Service
 */

function saleService(order,paymentInstrument){
	var result={};
	try{
		var paymentTransaction =  paymentInstrument.paymentTransaction;
		var paypalFacade = require('../facade/PayPalFacade');
		var response = paypalFacade.SaleService(order,paymentInstrument);
		//process response received from sale service
		if(!empty(response) && response.decision.equals('ACCEPT') && response.apSaleReply.paymentStatus === 'SETTLED' && response.reasonCode.get() === 100){
			 Transaction.wrap(function (){
				paymentTransaction.transactionID = response.apSaleReply.processorTransactionID;
				paymentTransaction.custom.paymentStatus= response.apSaleReply.paymentStatus;
				paymentTransaction.custom.saleProcessorTID = response.apSaleReply.processorTransactionID;
				paymentTransaction.custom.saleRequestID = response.requestID;
				paymentTransaction.custom.saleRequestToken = response.requestToken;
			    if(!empty(response.apReply) && !empty(response.apReply.fundingSource)){
					paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
			    }
				order.paymentStatus = 2;
			 });
			 result.authorized = true;
		}else if(!empty(response) && response.decision.equals('ACCEPT') && response.apSaleReply.paymentStatus === 'PENDING' && response.reasonCode.get() === 100){
			Transaction.wrap(function (){
				paymentTransaction.transactionID = response.apSaleReply.processorTransactionID;
				paymentTransaction.custom.paymentStatus= response.apSaleReply.paymentStatus;
				paymentTransaction.custom.saleProcessorTID = response.apSaleReply.processorTransactionID;
				paymentTransaction.custom.saleRequestID = response.requestID;
				paymentTransaction.custom.saleRequestToken = response.requestToken;
			    if(!empty(response.apReply) && !empty(response.apReply.fundingSource)){
					paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
			    }
			});
			result.pending = true;
		}else if(!empty(response) && response.decision.equals('REVIEW')&& response.reasonCode.get() === 480 ){
			Transaction.wrap(function (){
				paymentTransaction.custom.saleRequestID = response.requestID;
				paymentTransaction.custom.saleRequestToken = response.requestToken;
			});
			result.pending = true;
		} else if(!empty(response) && response.decision.equals('REJECT') && response.reasonCode.get() === 481) {
			handlePayPalReject(paymentInstrument);
			result.rejected = true;
		}
		else{
			result.error = true;
		}
		}catch(e){
			Logger.error('Error while executing saleService method in PayPal Adatper' +e);
		}finally{
			return result;
		}

}
/**
 * paypal Custom order flow, manage Custom order flow for merchant
 * Site preference would drive the invocation of this method
 * param order
 * 
 */
function customOrder(order,paymentInstrument){
 var result={}; 
 // if order created successfully , call authorization service
 if(orderService(order,paymentInstrument).orderCreated){
	 var authResult = authorizeService(order,paymentInstrument);
	 if(authResult.authorized){
		 result.authorized = true;
	 }else if(authResult.pending){
		 // returning pending flag for pending orders
		 result.pending = true;
	 }else if(authResult.rejected) {
	 	 result.rejected = true;
	 }
	 else{
		 result.error = true;
	 }
 }else{
	 result.error = false;
 }
return result;
}

/**
 * paypal Standard order flow, manage Standard order flow for merchant
 * Site preference would drive the invocation of this method
 * param order
 * 
 */
function standardOrder(order,paymentInstrument){
	 var result={},saleOrderResponse;
	 // if order created successfully , call sale service 
	 if(orderService(order,paymentInstrument).orderCreated){
		 saleOrderResponse=  saleService(order,paymentInstrument);
		 if(saleOrderResponse.authorized){
			 result.authorized = true;
		 }else if(saleOrderResponse.pending){
			 // returning pending flag for pending orders
			 result.pending = true;
		 } else if(saleOrderResponse.rejected) {
	 		 result.rejected = true;
		 }
		 else{
			 result.error = true;
		 }
	 }else{
		result.error = false;
	}
	 return result;
}

/**
 * Paypal Paymane 
 */
function paymentService(order,paymentInstrument){
	var orderType=dw.system.Site.getCurrent().getCustomPreferenceValue("CsPaypalOrderType").value,
	orderResponse={};
	
	//If customer has an already existin billing agreement ID
	var billingAgreementIDFlag = empty(customer.profile)?false:!empty(customer.profile.custom.billingAgreementID);
	if(billingAgreementIDFlag && dw.system.Site.getCurrent().getCustomPreferenceValue('payPalBillingAgreements') && paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL)){
		orderType = 'BILLINGAGREEMENT';
	}
	switch(orderType){
	case 'STANDARD':
		orderResponse = standardOrder(order,paymentInstrument);
	    break;
	case 'CUSTOM':
		orderResponse = customOrder(order,paymentInstrument);
		break;
	case 'BILLINGAGREEMENT':
		orderResponse = saleService(order,paymentInstrument);
		break;
	 default :
		 orderResponse = customOrder(order,paymentInstrument);
	    break;
	}
  return orderResponse;
}

function handlePayPalReject(paymentInstrument) {
	Transaction.wrap(function ()
	    		{
				paymentInstrument.paymentTransaction.custom.orderRequestID = '';
				paymentInstrument.paymentTransaction.custom.orderID = '';
		    	paymentInstrument.paymentTransaction.custom.fundingSource = '';
		    	 paymentInstrument.paymentTransaction.custom.processorResponse = '';
		    	 paymentInstrument.paymentTransaction.custom.reconsilationID = '';
			});
}

module.exports = {
		'InitiateExpressCheckout': initiateExpressCheckout,
		'OrderService': orderService,
		'AuthorizeService': authorizeService,
		'SaleService':  saleService,
		'PaymentService': paymentService,
		'SessionCallback' : initSessionCallback,
		'BillingAgreementService':billingAgreementService,
		'CustomOrder':customOrder,
		'StandardOrder':standardOrder
};
