'use strict';
/**
 * CYBERSOURCE_CREDIT controller contains all method related to this type of payment instrument (CREDIT CARD)
 * @module controllers/CYBERSOURCE_CREDIT
 */

var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');

/**
 * Verifies a credit card against a valid card number and expiration date and
 * possibly invalidates invalid form fields. If the verification was successful
 * a credit card payment instrument is created. The Controller just reuses the
 * basic credit card validation Controller from processor CYBERSOURCE_CREDIT.
 */
function Handle(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');
	if (empty(PaymentMethod)) {
		return {error: true};
	}
	if (!PaymentMethod.equals(CybersourceConstants.METHOD_SA_IFRAME) && !PaymentMethod.equals(CybersourceConstants.METHOD_SA_REDIRECT) && !PaymentMethod.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
		var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
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
	var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');
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
    	var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
    	return Cybersource.AuthorizeCreditCard({PaymentInstrument:PaymentInstrument, Order:Order, Basket:Order});
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
	var cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel').get(args.Basket);
	var Transaction = require('dw/system/Transaction');
    var transStatus = Transaction.wrap(function () {
    	 var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
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
	
	var OrderMgr = require('dw/order/OrderMgr');
	var orderNo = args.OrderNo;
	var order = OrderMgr.getOrder(orderNo);
	var paymentInstrument = args.PaymentInstrument;
	var paymentMethod = paymentInstrument.paymentMethod;
	var saveCard = session.forms.billing.paymentMethods.creditCard.saveCard.value;
	var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');
	if (saveCard) {
		var Transaction = require('dw/system/Transaction');
		Transaction.wrap(function () {
			paymentInstrument.custom.savecard = true;
		});
	}
	if (paymentMethod == CybersourceConstants.METHOD_SA_REDIRECT) {
			var subscriptionToken = session.forms.billing.paymentMethods.creditCard.selectedCardID.value;
			var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
			return secureAcceptanceHelper.CreateSignature(paymentInstrument,order,subscriptionToken);
		}
		else if (paymentMethod == CybersourceConstants.METHOD_SA_IFRAME) {
			session.privacy.order_id = orderNo;
			return {
               	returnToPage :true
            };
		}
	  else if (paymentMethod == CybersourceConstants.METHOD_SA_SILENTPOST) {
	  	var Cybersource = require('int_cybersource_controllers/cartridge/scripts/Cybersource');
	  	return Cybersource.AuthorizeCreditCard({PaymentInstrument:paymentInstrument, Order:order, Basket:order});
  }
}



/**
 * This Controller is used to include digital fingerpirnt into billing isml template
 */
function IncludeDigitalFingerprint(args) {
	var app = require('app_storefront_controllers/cartridge/scripts/app');
	var Site = require('dw/system/Site');
	app.getView({
		DeviceFingerprintEnabled : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled'),
		DeviceFingerprintJetmetrixLocation : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation'),
		DeviceFingerprintOrgId : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId'),
		MerchantId : Site.getCurrent().getCustomPreferenceValue('CsMerchantId'),
		SessionId : session.sessionID,
		RedirectionType : Site.getCurrent().getCustomPreferenceValue("CsDeviceFingerprintRedirectionType")
    }).render('cart/fingerprint');
}


/**
 * This Controller redirects the finger print location based on static mapping configured in BM
 */
function RedirectFpLocation(args) {
	var app = require('app_storefront_controllers/cartridge/scripts/app');
	var Site = require('dw/system/Site');
	app.getView({
		DeviceFingerprintEnabled : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled'),
		DeviceFingerprintJetmetrixLocation : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation'),
		DeviceFingerprintOrgId : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId'),
		MerchantId : Site.getCurrent().getCustomPreferenceValue('CsMerchantId'),
		SessionId : session.sessionID,
		LinkType : request.httpParameterMap.type.value
    }).render('cart/fingerprintredirect');
}

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
exports.IncludeDigitalFingerprint=guard.ensure(['https'], IncludeDigitalFingerprint);
exports.RedirectFpLocation=guard.ensure(['https'], RedirectFpLocation);
