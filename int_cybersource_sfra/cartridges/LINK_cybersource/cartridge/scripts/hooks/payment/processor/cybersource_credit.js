'use strict';

// var Status = require('dw/system/Status');

var collections = require('*/cartridge/scripts/util/collections');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

/**
 * Creates a token.
 * @returns {string} a token
 */
exports.CreatePaymentToken = function (module) {
    var subscriptionID, subscriptionError, createSubscriptionResult;
    var Cybersource_Subscription = require('LINK_cybersource/cartridge/scripts/Cybersource');
    if(module.equalsIgnoreCase('account')){
    	createSubscriptionResult = Cybersource_Subscription.CreateSubscriptionMyAccount();
    } else {
    	createSubscriptionResult = Cybersource_Subscription.SaveCreditCard();
    }
    if (createSubscriptionResult.error) {
        subscriptionError = createSubscriptionResult.reasonCode + '-' + createSubscriptionResult.decision;
        return { error: true, subscriptionError: subscriptionError };
    }
    subscriptionID = createSubscriptionResult.subscriptionID;
    return { error: false, subscriptionID: subscriptionID};
};


/**
 * Verifies a credit card against a valid card number and expiration date and
 * possibly invalidates invalid form fields. If the verification was successful
 * a credit card payment instrument is created. The Controller just reuses the
 * basic credit card validation Controller from processor CYBERSOURCE_CREDIT.
 *
 * @param {Basket}  basket - Current customers basket.
 * @param {Object}  paymentInformation - JSON object containing payment information.
 * @returns {Object} -  {fieldErrors: [], serverErrors: [], error: Boolean}
 */
exports.Handle = function (basket, paymentInformation) {
	var PaymentMethod = session.forms.billing.paymentMethod.value;
	if (empty(PaymentMethod)) {
		return {error: true};
	}
	if (!PaymentMethod.equals(CybersourceConstants.METHOD_SA_IFRAME) && !PaymentMethod.equals(CybersourceConstants.METHOD_SA_REDIRECT) && !PaymentMethod.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
		var Cybersource = require('LINK_cybersource/cartridge/scripts/Cybersource');
		return Cybersource.HandleCard(basket, paymentInformation);
	} else {
		return SecureAcceptanceHandle(basket, paymentInformation);
	}

};

/**
 * Authorizes a payment using a credit card. A real integration is not
 * supported, that's why the Controller returns this state back to the calling
 * checkout Controller.
 *
 * @param {number}  orderNumber - Order number.
 * @param {PaymentInstrument}  paymentInstrument - Payment Instrument
 * @param {PaymentProcessor}  paymentProcessor - Payment Processor
 * @returns {Object} -  {fieldErrors: [], serverErrors: [], error: Boolean}
 */
exports.Authorize = function (orderNumber, paymentInstrument, paymentProcessor) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderNumber);
    var pi = paymentInstrument;
    var paymentMethod = pi.getPaymentMethod();
    if (empty(paymentMethod)) {
        return { error: true };
    }

    Transaction.wrap(function () {
        pi.paymentTransaction.paymentProcessor = paymentProcessor;
    });

    var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
    if (!paymentMethod.equals(CybersourceConstants.METHOD_SA_IFRAME) && !paymentMethod.equals(CybersourceConstants.METHOD_SA_REDIRECT) && !paymentMethod.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
        var SecureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
        return SecureAcceptanceHelper.AuthorizeCreditCard({ PaymentInstrument: pi, Order: order });
    } else {
    	return SecureAcceptanceAuthorize(orderNumber, paymentInstrument, paymentProcessor);
    }
};

/**
 * Verifies billing and shipping details and 
 * possibly invalidates invalid form fields. 
 * If the verification was successful a Secure Acceptance redirect payment instrument is created.
 */
function SecureAcceptanceHandle(basket, paymentInformation) {
	 var PaymentMethod =  session.forms.billing.paymentMethod.value;
	 var BasketMgr = require('dw/order/BasketMgr');
	 var cart = BasketMgr.getCurrentBasket();
	 var Transaction = require('dw/system/Transaction');
	 var cardNumber = paymentInformation.cardNumber.value;
	 var cardType = paymentInformation.cardType.value;
	 var cardSecurityCode = paymentInformation.securityCode.value;
	 var expirationMonth = paymentInformation.expirationMonth.value;
	 var expirationYear = paymentInformation.expirationYear.value;
     var transStatus = Transaction.wrap(function () {
    	 var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CommonHelper');
    	 CommonHelper.removeExistingPaymentInstruments(cart);
    	 var amount = CommonHelper.CalculateNonGiftCertificateAmount(cart);
    	 var paymentInstrument = cart.createPaymentInstrument(PaymentMethod, amount);
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
function SecureAcceptanceAuthorize (orderNumber, paymentInstrument, paymentProcessor) {
	var PaymentMgr = require('dw/order/PaymentMgr'),
		Transaction = require('dw/system/Transaction');
	var paymentInstrument = paymentInstrument,
		paymentMethod = paymentInstrument.paymentMethod,
		additionalArgs={}; 
	var saveCard = session.forms.billing.creditCardFields.saveCard.value;
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
		additionalArgs.subscriptionToken = session.forms.billing.creditCardFields.selectedCardID.value;
	    var secureAcceptanceAdapter = require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter');
		var saRedirectRequest = secureAcceptanceAdapter.Authorize(orderNumber, paymentInstrument, paymentProcessor,additionalArgs);
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
			session.privacy.order_id = orderNumber;
		}
		return require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter').Authorize(orderNumber, paymentInstrument, paymentProcessor,additionalArgs);   
	}
}
