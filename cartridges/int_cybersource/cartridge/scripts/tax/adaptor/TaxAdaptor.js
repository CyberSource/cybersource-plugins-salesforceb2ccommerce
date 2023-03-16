'use strict';


/**
* This file will contains adapter methods for Cybersource Taxation
* Integration.
*/

function calculateTaxes(cart){
	var TaxHelper = require('~/cartridge/scripts/helper/TaxHelper');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var Logger = require('dw/system/Logger');
	var result,cartStateString;
	var shipFrom = null;
	if(empty(cart)){
		Logger.error("Please provide a Basket!");
		return {error:true};
	}
	if (!empty(cart)&&!empty(cart.getAllProductLineItems())&&!empty(cart.defaultShipment)&&!empty(cart.defaultShipment.shippingAddress))
	{
		result = CommonHelper.CreateCartStateString(cart);
		if (result.success && !empty(result.CartStateString)) {
			cartStateString = result.CartStateString;
			if (empty(session.privacy.SkipTaxCalculation)||!session.privacy.SkipTaxCalculation) {
				var TaxFacade = require('~/cartridge/scripts/tax/facade/TaxFacade');
				var taxationResponse = TaxFacade.TaxationRequest(cart);
				if (taxationResponse.success && taxationResponse.response !== null) {
					session.privacy.cartStateString = cartStateString;
					session.privacy.SkipTaxCalculation = true;
					return {success: true};	
				}
				return {error: true};
			}
		}else
		{
			TaxHelper.UpdatePriceAdjustment(cart);//update price adjustment call
		}
	}
	CommonHelper.UpdateTaxForGiftCertificate(cart);
	session.privacy.SkipTaxCalculation = false;//update tax for gift certificate call
	return {success: true};
}


exports.CalculateTaxes=calculateTaxes;