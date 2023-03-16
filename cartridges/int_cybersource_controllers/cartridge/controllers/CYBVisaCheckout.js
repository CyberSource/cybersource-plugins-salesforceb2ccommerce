'use strict';

/**
 * Controller that performs all visa checkout operation including button display, initiate/launch, decrypt payload, authorize using payer.
 *
 * @module controllers/VisaCheckout
 */

/* API Includes */
var logger = dw.system.Logger.getLogger('Cybersource');
var Transaction = require('dw/system/Transaction');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'visacheckout/helper/VisaCheckoutHelper');
var VisaCheckoutAdaptor = require(CybersourceConstants.CS_CORE_SCRIPT+'visacheckout/adaptor/VisaCheckoutAdaptor');
var guard = require(CybersourceConstants.GUARD);
var app = require(CybersourceConstants.APP);


/**
 * Load Visa Checkout Button via remote include where get th button settings from site preferences.
 */
function buttonDisplay(){
	try{
		var buttonsource = null;
		if(!empty(request.httpParameterMap.buttonsource.value))
			 buttonsource = request.httpParameterMap.buttonsource.value
		var result = VisaCheckoutAdaptor.ButtonDisplay();
		if (!empty(result) && result.success)
		{
			app.getView('VisaCheckout', {
				VisaCheckoutButtonQueryString : result.ButtonDisplayURL,
				VisaCheckoutTellMeMoreActive : result.TellMeMoreActive,
				buttonsource : buttonsource
			}).render('visacheckout/buttondisplay');
			return;
		}else
			app.getView('VisaCheckout').render('util/pt_empty');
	}catch(e){
		logger.error("Error retriveing Visa Checkout button settings: {0}", err.message);
	}
}

/**
 * Visa Checkout Light Box returned error back to merchant site, further return user back to user journey starting page, either cart or billing page
 */
function visaCheckoutError() {
	var cart = app.getModel('Cart').get();
	//basket uuid check for security handling
	if (empty(cart.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
		session.privacy.SkipTaxCalculation=false;
		session.privacy.cartStateString=null;
		var VInitFormattedString='';
		var signature='';
		var result = VisaCheckoutHelper.Initialize();
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
 * Update shipping details in cart object
 */
function shippingUpdate(cart,decryptedPaymentData) {
	// Prepares shipments.
	var homeDeliveries = app.getController('COShipping').PrepareShipments();
	if (homeDeliveries)
	{
		var shipment = cart.defaultShipment;
		if (!empty(shipment.getShippingAddress()))
		{
			return {success:true};
		}
		try{
			var result = VisaCheckoutAdaptor.UpdateShipping(decryptedPaymentData);
			return {success:true};
		}catch(err) {
			logger.error('[VisaCheckout.js]Error creating shipment from Visa Checkout address: {0}', err.message);
			return {error:true, errorMsg:err.message};
		}
	}else{
		var Resource = require('dw/web/Resource');
		return {error:true, errorMsg: Resource.msg('visaCheckout.shippingUpdate.prepareShipments', 'cybersource', null)};
	}
}

/**
 * Visa payload decrypt via cybersource and update the basket with billing and shipping details take user to review page or return back to cart page with error
 */
function Decrypt()
{
	var result = VisaCheckoutAdaptor.DecryptPayload();    
	// check reason code in result
	if (result.success)
	{
		result = shippingUpdate(result.basket,result.decryptedPaymentData);
		if (result.success)
		{
			var cart = app.getModel('Cart').get();
			//calculate cart and redirect to summary page
			Transaction.wrap(function ()
					{
				cart.calculate();
					});
			var URLUtils = require('dw/web/URLUtils');
			response.redirect(URLUtils.https('COSummary-Start'));
			return {};
		}
	}else{
		logger.error("Error decrypting Visa Checkout payment: reason code not 100");
		visaCheckoutError();
	}
}



/*
 * Exposed methods.
 */
/** Display the visa checkout button.
 * @see {@link module:controllers/VisaCheckout~buttonDisplay} */
exports.Button = guard.ensure(['get'], buttonDisplay);
/** Initializing settings of visa checkout button.
 * @see {@link module:controllers/VisaCheckout~Decrypt} */
exports.Decrypt = guard.ensure(['https', 'post'], Decrypt);
/** Error of visa checkout decryption.
 * @see {@link module:controllers/VisaCheckout~visaCheckoutError} */
exports.Error = guard.ensure(['https'], visaCheckoutError);