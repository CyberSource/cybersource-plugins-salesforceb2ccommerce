'use strict';

/**
 * Controller that performs all visa checkout operation including button display, initiate/launch, decrypt payload, authorize using payer.
 *
 * @module controllers/VisaCheckout
 */

/* API Includes */
var ArrayList = require('dw/util/ArrayList');
var ISML = require('dw/template/ISML');
var logger = dw.system.Logger.getLogger('Cybersource');
var Resource = require('dw/web/Resource');
var ShippingMgr = require('dw/order/ShippingMgr');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');

/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');
var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
var libCybersource = require('int_cybersource/cartridge/scripts/cybersource/libCybersource');
var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
var VisaCheckoutFacade = require('int_cybersource/cartridge/scripts/Facade/VisaCheckoutFacade');
var VisaCheckoutHelper = require('int_cybersource/cartridge/scripts/Helper/VisaCheckoutHelper');

/**
 * Load Visa Checkout Button via remote include where get th button settings from site preferences.
 */
function buttonDisplay() {
    var isVisaCheckout = dw.order.PaymentMgr.getPaymentMethod('VISA_CHECKOUT').isActive();
    if (isVisaCheckout) {
    	var buttonsource = request.httpParameterMap.buttonsource.value!=null?request.httpParameterMap.buttonsource.value:'cart';
    	//set the response header (X-FRAME-OPTIONS) to prevent clickjacking
		response.addHttpHeader("X-FRAME-OPTIONS","SAMEORIGIN");
		//Visa Checkout Button settings query string from site preferences
		var result = VisaCheckoutHelper.GetButtonDisplaySettings();
	    app.getView('VisaCheckout', {
	    	buttonsource : buttonsource,
	    	VisaCheckoutButtonQueryString : result.ButtonDisplayURL,
	    	VisaCheckoutTellMeMoreActive : result.TellMeMoreActive
	    }).render('visacheckout/buttondisplay');
	    return;
    }
    app.getView('VisaCheckout').render('util/pt_empty');
}

/**
 * Initialization string formation for the v.init event handler function defined in onVisaCheckoutReady function.
 */
function getInitializeSettings(requireDeliveryAddress) {
    var isVisaCheckout = dw.order.PaymentMgr.getPaymentMethod('VISA_CHECKOUT').isActive();
    if (isVisaCheckout) {
    	var cart = app.getModel('Cart').get();
    	cart = cart ? cart.object : null;
		app.getForm('visacheckout').invalidate();
    	return VisaCheckoutHelper.GetButtonInitializeSettings(cart, requireDeliveryAddress);
    }
    return {error:true};
}

/**
 * Visa Checkout Light Box returned error back to merchant site, further return user back to user journey starting page, either cart or billing page
 */
function visaCheckoutError() {
	var cart = app.getModel('Cart').get();
	//basket uuid check for security handling
	if (null == session.forms.visacheckout.basketUUID.htmlValue || 
			cart.getUUID() != session.forms.visacheckout.basketUUID.htmlValue || 
			!empty(cart.getPaymentInstruments('VISA_CHECKOUT'))) {
	    session.custom.SkipTaxCalculation=false;
	    session.custom.cartStateString=null;
	    var VInitFormattedString='';
	  	var result = getInitializeSettings();
	    if (result.success) {
	    	VInitFormattedString = result.VInitFormattedString;
	    }
	    Transaction.wrap(function () {
            cart.calculate();
        });
		app.getView('Cart', {
	        cart: cart,
	        RegistrationStatus: false,
	        BasketStatus: new dw.system.Status(dw.system.Status.ERROR, "VisaCheckoutError"),
	        VInitFormattedString:VInitFormattedString
	    }).render('checkout/cart/cart');
	    return;
    } else {
    	Transaction.wrap(function () {
            cart.removePaymentInstruments(cart.getPaymentInstruments("VISA_CHECKOUT"));
    	});
		app.getController('COShipping').PrepareShipments();
		Transaction.wrap(function () {
            cart.calculate();
        });
		app.getController('COBilling').ReturnToForm(cart,{VisaCheckoutError:true});
		return;
    }
}

/**
 * Visa payload decrypt via cybersource and update the basket with billing and shipping details take user to review page or return back to cart page with error
 */
function decryptPayload() {
    var isVisaCheckout = dw.order.PaymentMgr.getPaymentMethod('VISA_CHECKOUT').isActive();
    if (isVisaCheckout) {
    	var callId = session.forms.visacheckout.callId.htmlValue;
    	var encryptedPaymentWrappedKey = session.forms.visacheckout.encryptedPaymentWrappedKey.htmlValue;
    	var encryptedPaymentData = session.forms.visacheckout.encryptedPaymentData.htmlValue;
    	var countryCode = session.forms.visacheckout.countryCode.htmlValue;
    	var postalCode = session.forms.visacheckout.postalCode.htmlValue;
    	var basketUUID = session.forms.visacheckout.basketUUID.htmlValue;
    	var cart = app.getModel('Cart').get();
        if (null!==cart && basketUUID!=null && encryptedPaymentData!=null && encryptedPaymentWrappedKey!=null && callId!=null && basketUUID == cart.getUUID()) {
        	Transaction.wrap(function () {
        		CommonHelper.removeExistingPaymentInstruments(cart);
                cart.removeExistingPaymentInstruments('VISA_CHECKOUT');
            });
        	var result = VisaCheckoutFacade.VCDecryptRequest(basketUUID, encryptedPaymentWrappedKey, encryptedPaymentData);
    		// check reason code in result
    		if (result.success && result.serviceResponse.ReasonCode == 100) {
    			var decryptedPaymentData = result.serviceResponse;
        		result = billingUpdate(cart.object, callId, decryptedPaymentData);
    			if (result.success) {
    				result = shippingUpdate(cart.object, decryptedPaymentData);
    				if (result.success) {
    					//calculate cart and redirect to summary page
    					Transaction.wrap(function () {
    		                cart.calculate();
    		            });
    					response.redirect(URLUtils.https('COSummary-Start'));
    					return {};
    				}
    			}
    		} else {
    			logger.error("Error decrypting Visa Checkout payment: reason code not 100");
    		}
    	}
    }
	//error flow
	visaCheckoutError();
}

/**
 * Update billing details in cart object
 */
function billingUpdate(cart, callId, decryptedPaymentData) {
	try{
		PaymentInstrumentUtils.UpdatePaymentInstrumentVisaDecrypt( cart, decryptedPaymentData, callId );
		session.forms.billing.paymentMethods.selectedPaymentMethodID.value='VISA_CHECKOUT';
		session.forms.billing.fulfilled.value=true;
		return {success:true};
	} catch(err) {
		logger.error('[VisaCheckout.js]Error creating Visa Checkout payment instrument: {0}', err.message);
		return {error:true, errorMsg:err.message};
	}
}

/**
 * Update shipping details in cart object
 */
function shippingUpdate(cart, decryptedPaymentData) {
    // Prepares shipments.
	var homeDeliveries = app.getController('COShipping').PrepareShipments();
	if (homeDeliveries) {
		var shipment = cart.defaultShipment;
		if (!empty(shipment.getShippingAddress())) {
			return {success:true};
		}
		try {
			Transaction.wrap(function () {
			    // Create or replace the shipping address
				var shippingAddress = shipment.createShippingAddress();	
				
				// Populate the shipping address from the visa object
				shippingAddress = VisaCheckoutHelper.CreateLineItemCtnrShippingAddress(shippingAddress, decryptedPaymentData);
				if (!shippingAddress.success) {return shippingAddress;}
				
				// Set shipping method to default if not already set
				if (shipment.shippingMethod == null) {
					shipment.setShippingMethod(ShippingMgr.getDefaultShippingMethod());
				}
			});
			session.forms.singleshipping.fulfilled.value=true;
			return {success:true};
		} catch(err) {
			logger.error('[VisaCheckout.js]Error creating shipment from Visa Checkout address: {0}', err.message);
			return {error:true, errorMsg:err.message};
		}
	} else {
		return {error:true, errorMsg:'PrepareShipments failed'};
	}
}

/**
 * Checks the PayerAuthEnrollment information with CCAuth request for visacheckout card payment
 * @param LineItemCtnrObj : dw.order.LineItemCtnr
 * @param paymentInstrument : dw.order.PaymentInstrument
 * @param orderNo : String
 */
function PayerAuthEnroll(lineItemCtnrObj : dw.order.LineItemCtnr, paymentInstrument : dw.order.PaymentInstrument, orderNo) {
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var result, PAReasonCode, PAVReasonCode, AuthorizationReasonCode, serviceResponse;
	result = VisaCheckoutFacade.PayerAuthEnrollCCAuthRequest(lineItemCtnrObj, paymentInstrument.paymentTransaction.amount, orderNo);
	if (result.error) {
		return result;
	}
	serviceResponse = result.serviceResponse;
	if (CybersourceHelper.getProofXMLEnabled()) {
		PaymentInstrumentUtils.UpdatePaymentTransactionWithProofXML(paymentInstrument, serviceResponse.ProofXML);
	}
	if (!empty(serviceResponse.AcsURL) && serviceResponse.PAReasonCode == 475) {
		session.privacy.order_id = orderNo;
		return {payerauthentication:true, serviceResponse:serviceResponse};
	} else {
	    return Cybersource.CardResponse(lineItemCtnrObj, paymentInstrument, serviceResponse);
	}
}

/**
 * Validates the PayerAuth information the customer provided with CCAuth request for visacheckout card payment
 * @param lineItemCtnrObj : dw.order.LineItemCtnr
 * @param paymentInstrument : dw.order.PaymentInstrument
 */
function PayerAuthValidation(lineItemCtnrObj, paymentInstrument) {
	var orderNo = null != lineItemCtnrObj.orderNo ? lineItemCtnrObj.orderNo : lineItemCtnrObj.getUUID();
	var PAResponsePARes = request.httpParameterMap.PaRes.value;
	var PAXID = request.httpParameterMap.PAXID.value;
	
	var result = VisaCheckoutFacade.PayerAuthValidationCCAuthRequest(lineItemCtnrObj, PAResponsePARes, paymentInstrument.paymentTransaction.amount, orderNo);
	if (result.success) {
		result = Cybersource.CardResponse(lineItemCtnrObj, paymentInstrument, result.serviceResponse);
		if (result.authorized || result.review)
		{
			return {submit: true};
		}
	}
	var PlaceOrderError = result.PlaceOrderError != null ? PlaceOrderError : new dw.system.Status(dw.system.Status.ERROR, "confirm.error.declined");
	return {fail: true, PlaceOrderError : PlaceOrderError};
}

/*
* Module exports
*/
exports.PayerAuthEnroll=PayerAuthEnroll;
exports.PayerAuthValidation=PayerAuthValidation;
/*
* Exposed methods.
*/
/** Display the visa checkout button.
 * @see {@link module:controllers/VisaCheckout~buttonDisplay} */
exports.Button = guard.ensure(['get'], buttonDisplay);
/** Initializing settings of visa checkout button.
 * @see {@link module:controllers/VisaCheckout~getInitializeSettings} */
exports.Initialize = getInitializeSettings;
/** Initializing settings of visa checkout button.
 * @see {@link module:controllers/VisaCheckout~decryptPayload} */
exports.Decrypt = guard.ensure(['https', 'post'], decryptPayload);
/** Error of visa checkout decryption.
 * @see {@link module:controllers/VisaCheckout~visaCheckoutError} */
exports.Error = guard.ensure(['https'], visaCheckoutError);