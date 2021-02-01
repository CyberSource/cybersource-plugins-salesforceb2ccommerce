'use strict';

/**
 * Controller that handles the Cybersource paypal processing, manages redirection/callback from paypal,
 * 
 *
 * @module controllers/CYBPaypal
 */
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var guard = require(CybersourceConstants.GUARD);
var app = require(CybersourceConstants.APP);
function initSessionCallback() 
{
	let r = require(CybersourceConstants.SG_CONTROLLER+'/cartridge/scripts/util/Response');
	var URLUtils = require('dw/web/URLUtils');
	var cart = app.getModel('Cart').get();
	var adapter = require(CybersourceConstants.PAYPAL_ADAPTOR);
	var paymentId = request.httpParameterMap.paymentID.stringValue;
	var payerID = request.httpParameterMap.payerID.stringValue;
	var requestID = request.httpParameterMap.requestId.stringValue;
	//Flag to check if PayPal Credit is used
	var isPayPalCredit = request.httpParameterMap.isPayPalCredit.booleanValue;
	var billingAgreementFlag =  request.httpParameterMap.billingAgreementFlag.booleanValue;
	
	var args={};
	args.payerID =  payerID;
	args.paymentID = paymentId; 
	args.requestId = requestID ;
	args.billingAgreementFlag = billingAgreementFlag ?true : false;  
	args.isPayPalCredit = isPayPalCredit ?true :false;
	var paymentMethod ;
	if(args.isPayPalCredit){
		paymentMethod = CybersourceConstants.METHOD_PAYPAL_CREDIT;
	}else{
		paymentMethod = CybersourceConstants.METHOD_PAYPAL;
	}
	
	var result = {};
	if(app.getModel('PaymentProcessor').handle(cart.object,paymentMethod,requestID,payerID,paymentId).error){
		result.success = false;
	}
	// call the call back method for initSession Service/check Status service
	result = adapter.SessionCallback(cart.object,args);
	var Transaction = require('dw/system/Transaction');
	 Transaction.wrap(function () {
	cart.calculate();
	 });
	if(result.success)
	{ 
		
		var applicableShippingMethods = cart.getApplicableShippingMethods(adapter.GetAddress(cart.object.getDefaultShipment()));
		Transaction.wrap(function () {
	        cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), request.httpParameterMap.shippingMethodID.stringValue, null, applicableShippingMethods);
	        cart.calculate();
	    });
		app.getForm('billing.billingAddress.addressFields').copyFrom(cart.getBillingAddress());
        app.getForm('billing.billingAddress.addressFields.states').copyFrom(cart.getBillingAddress());
		session.forms.singleshipping.fulfilled.value = true;
		app.getForm('billing').object.fulfilled.value = true;
		response.redirect(URLUtils.https('COSummary-Start'));
	}else{
		response.redirect(URLUtils.https('Cart-Show'));
	}
};

/**
 *  Initiates Paypal express Checkout , create Paypal Payment intrument in basket
 */
function paypalExpress(){
	var adapter = require(CybersourceConstants.PAYPAL_ADAPTOR);
	let r = require(CybersourceConstants.SG_CONTROLLER+'/cartridge/scripts/util/Response');
	var cart = app.getModel('Cart').get();
	var billingAgreementFlag = request.httpParameterMap.billingAgreement.empty?false:request.httpParameterMap.billingAgreement.booleanValue,
		payPalCreditFlag = request.httpParameterMap.isPayPalCredit.empty?false:request.httpParameterMap.isPayPalCredit.booleanValue;
	var args={};
	args.billingAgreementFlag=billingAgreementFlag;
	args.payPalCreditFlag = payPalCreditFlag;
	
	var result = adapter.InitiateExpressCheckout(cart.object,args);
	if(result.success)
	{
		r.renderJSON(result);
	}
	
}
/** Handle the redirection/callback from paypal.
 * @see {@link module:controllers/CYBPaypal~initSessionCallback} */
exports.SessionCallback = guard.ensure(['post', 'https'], initSessionCallback);
/**
* Cybersource - Paypal Express Checkout */
exports.InitiatePaypalExpress = guard.ensure(['post'],paypalExpress);