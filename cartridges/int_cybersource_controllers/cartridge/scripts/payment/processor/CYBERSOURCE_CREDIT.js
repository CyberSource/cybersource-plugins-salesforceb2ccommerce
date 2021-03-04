'use strict';
/**
 * CYBERSOURCE_CREDIT controller contains all method related to this type of payment instrument (CREDIT CARD)
 * @module controllers/CYBERSOURCE_CREDIT
 */

var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants'),
	guard = require(CybersourceConstants.GUARD),
	secureAcceptanceAdapter =  require(CybersourceConstants.CS_CORE+'/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter'),
	SecureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER),
	app = require(CybersourceConstants.APP);

/**
 * Verifies a credit card against a valid card number and expiration date and
 * possibly invalidates invalid form fields. If the verification was successful
 * a credit card payment instrument is created. The Controller just reuses the
 * basic credit card validation Controller from processor CYBERSOURCE_CREDIT.
 */
function Handle(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	if (empty(PaymentMethod)) {
		return {error: true};
	}
	if (!PaymentMethod.equals(CybersourceConstants.METHOD_SA_IFRAME) && !PaymentMethod.equals(CybersourceConstants.METHOD_SA_REDIRECT) && !PaymentMethod.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
		var Cybersource = require(CybersourceConstants.CS_CONTROLLER+'/cartridge/scripts/Cybersource');
		return Cybersource.HandleCard(args);
	} else {
		return SecureAcceptanceHandle(args);
	}
}


/**
 * Authorizes a payment using a credit card. A real integration is not
 * supported, that's why the Controller returns this state back to the calling
 * checkout Controller.
 */
function Authorize(args) {
	
	var OrderMgr = require('dw/order/OrderMgr');
	var orderNo = args.OrderNo;
	var Order = OrderMgr.getOrder(orderNo);
	var PaymentInstrument = args.PaymentInstrument;
	var paymentMethod = PaymentInstrument.getPaymentMethod();
	if (empty(paymentMethod)) {
		return {error:true};
	}
	var PaymentMgr = require('dw/order/PaymentMgr');
	var Transaction = require('dw/system/Transaction');
	var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).getPaymentProcessor();
    Transaction.wrap(function () {
    	PaymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    if (!paymentMethod.equals(CybersourceConstants.METHOD_SA_IFRAME) && !paymentMethod.equals(CybersourceConstants.METHOD_SA_REDIRECT) && !paymentMethod.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
    	return SecureAcceptanceHelper.AuthorizeCreditCard({PaymentInstrument:PaymentInstrument, Order:Order, Basket:Order});
    } else {
    	return SecureAcceptanceAuthorize(args);
    }		    
}


/**
 * Verifies billing and shipping details and 
 * possibly invalidates invalid form fields. 
 * If the verification was successful a Secure Acceptance redirect payment instrument is created.
 */
function SecureAcceptanceHandle(args) {

	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	var cart = require(CybersourceConstants.SG_CONTROLLER +'/cartridge/scripts/models/CartModel').get(args.Basket);
	var Transaction = require('dw/system/Transaction');
    var transStatus = Transaction.wrap(function () {
    	 var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CommonHelper');
    	 CommonHelper.removeExistingPaymentInstruments(cart);
    	 cart.createPaymentInstrument(PaymentMethod, cart.getNonGiftCertificateAmount());
        return true;
    });
    if (transStatus) {
    	return {sucess: true};
    }
    return {error:true};
}

/**
 * Authorizes a payment using a secure acceptance redirect payment instrument. 
 * Create signature with requested input 
 * This function takes order No and payment instrument as Input
 */
function SecureAcceptanceAuthorize(args) {
	
var PaymentMgr = require('dw/order/PaymentMgr'),
		Transaction = require('dw/system/Transaction');
	var paymentInstrument = args.PaymentInstrument,
		paymentMethod = paymentInstrument.paymentMethod,
		additionalArgs={}; 
	var saveCard = session.forms.billing.paymentMethods.creditCard.saveCard.value;
	if (saveCard) {
		Transaction.wrap(function () {
			paymentInstrument.custom.savecard = true;
		});
	}
	var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).getPaymentProcessor();
	Transaction.wrap(function () {
									paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
								 });
	if (paymentMethod == CybersourceConstants.METHOD_SA_REDIRECT) {
		additionalArgs.subscriptionToken = session.forms.billing.paymentMethods.creditCard.selectedCardID.value;
		var saRedirectRequest = secureAcceptanceAdapter.Authorize(args,additionalArgs);
		if (saRedirectRequest.success) {
	  		 if (saRedirectRequest.requestData != null) {
	  			 var data = saRedirectRequest.requestData;
	  		 	 var formAction = saRedirectRequest.formAction;
			 		 return {
			 		 	intermediateSA : true,
			 		 	data : data,
			 		 	formAction : formAction,
			 		 	renderViewPath : 'services/secureAcceptanceRequestForm'
						};
	  		 }
		 }else{
	  	return {error:true};
		}
	}else{
		if (paymentMethod == CybersourceConstants.METHOD_SA_IFRAME) {
			session.privacy.order_id = args.Order.orderNo;
		}
		return secureAcceptanceAdapter.Authorize(args,additionalArgs);   
	}
}

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;