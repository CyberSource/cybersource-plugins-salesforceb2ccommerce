'use strict';
var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
/**
 * Controller that handles the Cybersource paypal processing, manages redirection/callback from paypal,
 * 
 *
 * @module controllers/CYBPaypal
 */
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
server.post(
    'SessionCallback',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
		var URLUtils = require('dw/web/URLUtils');
		var BasketMgr = require('dw/order/BasketMgr');
		var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
		var cart = BasketMgr.getCurrentBasket();
		var adapter = require(CybersourceConstants.PAYPAL_ADAPTOR);
		var paymentId = request.httpParameterMap.paymentID.stringValue;
		var payerID = request.httpParameterMap.payerID.stringValue;
		var requestID = request.httpParameterMap.requestId.stringValue;
		var shippingAddressMissing = false;
		var billingAddressMissing = false;
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
		var Transaction = require('dw/system/Transaction');
		// call the call back method for initSession Service/check Status service
		result = adapter.SessionCallback(cart,args);
		if(result.shippingAddressMissing) 
			session.privacy.paypalShippingIncomplete = true;
		else
			session.privacy.paypalShippingIncomplete = false;
		if(result.billingAddressMissing) 
			session.privacy.paypalBillingIncomplete = true;
		else
			session.privacy.paypalBillingIncomplete = false;
		Transaction.wrap(function () {
			basketCalculationHelpers.calculateTotals(cart);
	 	});
	 	
		var PaymentMgr = require('dw/order/PaymentMgr');
		var processor = PaymentMgr.getPaymentMethod(paymentMethod).getPaymentProcessor();
		var HookMgr = require('dw/system/HookMgr');
		if(HookMgr.callHook(
                    'app.payment.processor.' + processor.ID.toLowerCase(),
                    'Handle',
                    cart,paymentMethod,
                    requestID,
                    payerID,paymentId
                ).error){
			result.success = false;
		}
		if(result.success) {
			var paymentInstruments = cart.paymentInstruments ,pi ;
	 		var paymentID = args.paymentID !== null ? args.paymentID: result.transactionProcessorID;
			var payerID = args.payerID !== null ? args.payerID : result.payerID;
			var requestID = args.requestId !== null ? args.requestId : result.requestID;
		 	// Iterate on All Payment Instruments and select PayPal
		 	for each(var paymentInstrument in paymentInstruments ){
				if(paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL) || 
					paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL_CREDIT))
				{
					pi = paymentInstrument;
				}
			}
		 	Transaction.wrap(function () {
	       		//set the request ID for payment instrument
		 		pi.paymentTransaction.custom.requestId = requestID;
		  	 	//set the payerID for payment instrument
		 		pi.paymentTransaction.custom.payerID = payerID;
		 		// Set the payment ID  	
		 		pi.paymentTransaction.custom.apSessionProcessorTID = paymentID;
		 		pi.paymentTransaction.custom.apPaymentType = CybersourceConstants.PAYPAL_PAYMENT_TYPE;
		 		if(pi.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL) && billingAgreementFlag && 
		 			('billingAgreementStatus' in session.privacy && session.privacy.billingAgreementStatus != null)) {
		 			pi.paymentTransaction.custom.billingAgreementStatus = session.privacy.billingAgreementStatus;
		 			session.privacy.billingAgreementStatus = '';
		 		}
		   	});
		}
		var Transaction = require('dw/system/Transaction');
	 	
		if(result.success) {
			session.forms.billing.addressFields.copyFrom(cart.getBillingAddress());
			if('states' in session.forms.billing.addressFields)
        		session.forms.billing.addressFields.states.copyFrom(cart.getBillingAddress());
			if('paypalShippingIncomplete' in session.privacy && session.privacy.paypalShippingIncomplete) {
				res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'shipping'));
				return next();
			}
			if('paypalBillingIncomplete' in session.privacy && session.privacy.paypalBillingIncomplete) {
				res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment'));
                session.privacy.paypalminiCart = true;
				return next();
			}
            session.privacy.paypalminiCart = false;
			res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder'));
		}else{
			res.redirect(URLUtils.https('Cart-Show'));
		}	
		return next();
});

/**
 *  Initiates Paypal express Checkout , create Paypal Payment intrument in basket
 */
server.post(
    'InitiatePaypalExpress',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
	var adapter = require(CybersourceConstants.PAYPAL_ADAPTOR);
	
	var BasketMgr = require('dw/order/BasketMgr');
	var cart = BasketMgr.getCurrentBasket();
	var billingAgreementFlag = request.httpParameterMap.billingAgreement.empty?false:request.httpParameterMap.billingAgreement.booleanValue,
		payPalCreditFlag = request.httpParameterMap.isPayPalCredit.empty?false:request.httpParameterMap.isPayPalCredit.booleanValue;
	var args={};
	args.billingAgreementFlag=billingAgreementFlag;
	args.payPalCreditFlag = payPalCreditFlag;
	
	var result = adapter.InitiateExpressCheckout(cart,args);
	if(result.success)
	{
		res.json(result);
	}
	 return next();
});

module.exports = server.exports();