'use strict';

/**
 * Controller that performs all visa checkout operation including button display, initiate/launch, decrypt payload, authorize using payer.
 *
 * @module controllers/VisaCheckout
 */

/* API Includes */
var logger = dw.system.Logger.getLogger('Cybersource');
var Transaction = require('dw/system/Transaction');
var VisaCheckoutHelper = require('int_cybersource/cartridge/scripts/helper/VisaCheckoutHelper');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants');

/**
 * Load Visa Checkout Button via remote include where get th button settings from site preferences.
 */
function buttonDisplay() {
	var PaymentMgr = require('dw/order/PaymentMgr');
	
	var isVisaCheckout = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT).isActive();
    if (isVisaCheckout) {
    	var buttonsource = request.httpParameterMap.buttonsource.value!=null?request.httpParameterMap.buttonsource.value:'cart';
    	//set the response header (X-FRAME-OPTIONS) to prevent clickjacking
		response.addHttpHeader("X-FRAME-OPTIONS","SAMEORIGIN");
		//Visa Checkout Button settings query string from site preferences
		var result = VisaCheckoutHelper.GetButtonDisplaySettings();
		if (result.success) {
			app.getView('VisaCheckout', {
				buttonsource : buttonsource,
				VisaCheckoutButtonQueryString : result.ButtonDisplayURL,
				VisaCheckoutTellMeMoreActive : result.TellMeMoreActive
			}).render('visacheckout/buttondisplay');
			return;
		}
    }
    app.getView('VisaCheckout').render('util/pt_empty');
}



/**
 * Visa Checkout Light Box returned error back to merchant site, further return user back to user journey starting page, either cart or billing page
 */
function visaCheckoutError() {
	var cart = app.getModel('Cart').get();
	//basket uuid check for security handling
	if (empty(cart.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
	    session.custom.SkipTaxCalculation=false;
	    session.custom.cartStateString=null;
	    var VInitFormattedString='';
	  	var signature='';
  		var result = VisaCheckoutHelper.getInitializeSettings();
	    if (result.success) {
	    	VInitFormattedString = result.VInitFormattedString;
	    	signature= result.signature;
	    }
	    Transaction.wrap(function () {
            cart.calculate();
        });
	    
	    var Status = require('dw/system/Status');
		app.getView('Cart', {
	        cart: cart,
	        RegistrationStatus: false,
	        BasketStatus: new Status(Status.ERROR, "VisaCheckoutError"),
	        VInitFormattedString:VInitFormattedString,
	        Signature:signature
	    }).render('checkout/cart/cart');
	    return;
    } else {
    	Transaction.wrap(function () {
            cart.removePaymentInstruments(cart.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT));
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
 * Update billing details in cart object
 */
function billingUpdate(cart, callId, decryptedPaymentData) {
	var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
	try{
		PaymentInstrumentUtils.UpdatePaymentInstrumentVisaDecrypt( cart, decryptedPaymentData, callId );
		session.forms.billing.paymentMethods.selectedPaymentMethodID.value=CybersourceConstants.METHOD_VISA_CHECKOUT;
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
					
					var ShippingMgr = require('dw/order/ShippingMgr');
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
		var Resource = require('dw/web/Resource');
		return {error:true, errorMsg: Resource.msg('visaCheckout.shippingUpdate.prepareShipments', 'cybersource', null)};
	}
}

/**
 * Visa payload decrypt via cybersource and update the basket with billing and shipping details take user to review page or return back to cart page with error
 */
function decryptPayload() {
	
	var PaymentMgr = require('dw/order/PaymentMgr');
    var isVisaCheckout = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT).isActive();
    
    if (isVisaCheckout) {
    	var callId = session.forms.visacheckout.callId.htmlValue;
    	var encryptedPaymentWrappedKey = session.forms.visacheckout.encryptedPaymentWrappedKey.htmlValue;
    	var encryptedPaymentData = session.forms.visacheckout.encryptedPaymentData.htmlValue;
    	var countryCode = session.forms.visacheckout.countryCode.htmlValue;
    	var postalCode = session.forms.visacheckout.postalCode.htmlValue;
    	var basketUUID = session.forms.visacheckout.basketUUID.htmlValue;
    	var cart = app.getModel('Cart').get();
    	var Site = require('dw/system/Site');
    	var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
    	var signature = CommonHelper.signedDataUsingHMAC256(cart.getUUID(), Site.getCurrent().getCustomPreferenceValue("cybVisaSecretKey"));
		
        if (null!==cart && basketUUID!=null && encryptedPaymentData!=null && encryptedPaymentWrappedKey!=null && callId!=null && basketUUID == signature) {
        	Transaction.wrap(function () {
        		CommonHelper.removeExistingPaymentInstruments(cart);
                cart.removeExistingPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT);
            });
        	var VisaCheckoutFacade = require('int_cybersource/cartridge/scripts/facade/VisaCheckoutFacade');
        	var result = VisaCheckoutFacade.VCDecryptRequest(cart.getUUID(), encryptedPaymentWrappedKey, encryptedPaymentData, callId);
    		// check reason code in result
    		if (result.success && result.serviceResponse.ReasonCode == 100) {
    			var decryptedPaymentData = result.serviceResponse;
    			if (!empty(cart) && !empty(decryptedPaymentData.MerchantReferenceCode) && cart.getUUID().equals(decryptedPaymentData.MerchantReferenceCode)) {
        			result = billingUpdate(cart.object, callId, decryptedPaymentData);
    				if (result.success) {
    					result = shippingUpdate(cart.object, decryptedPaymentData);
    					if (result.success) {
    					//calculate cart and redirect to summary page
    					Transaction.wrap(function () {
    		                cart.calculate();
    		            });
    					
    					var URLUtils = require('dw/web/URLUtils');
    					response.redirect(URLUtils.https('COSummary-Start'));
    					return {};
    					}
    				}
    			} else {
    			logger.error('Error decrypting Visa Checkout MerchantReferenceCode not match with basketUUID');
    			}
    		} else {
    			logger.error("Error decrypting Visa Checkout payment: reason code not 100");
    		}
    	}
    }
	//error flow
	visaCheckoutError();
}


/*
* Exposed methods.
*/
/** Display the visa checkout button.
 * @see {@link module:controllers/VisaCheckout~buttonDisplay} */
exports.Button = guard.ensure(['get'], buttonDisplay);
/** Initializing settings of visa checkout button.
 * @see {@link module:controllers/VisaCheckout~decryptPayload} */
exports.Decrypt = guard.ensure(['https', 'post'], decryptPayload);
/** Error of visa checkout decryption.
 * @see {@link module:controllers/VisaCheckout~visaCheckoutError} */
exports.Error = guard.ensure(['https'], visaCheckoutError);