'use strict';


/**
* This file will contains adapter methods for Cybersource Taxation
* Integration.
*/
var Status = require('dw/system/Status');
var Logger = require('dw/system/Logger');
var Site   = require('dw/system/Site');


function calculateTax(cart) {
    // Default tax calculation, if Cybersource Tax not enabled
    var EnableTaxation = Site.getCurrent().getCustomPreferenceValue("CsEnableTaxation");
    if (EnableTaxation) {
        try {
            var TaxHelper = require('~/cartridge/scripts/helper/TaxHelper');
            var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
            var result;
            var cartStateString;

            if (empty(cart)) {
                Logger.error('Please provide a Basket!');
                return new Status(Status.ERROR);
            }
            if (!empty(cart) && !empty(cart.getAllProductLineItems()) && !empty(cart.defaultShipment) && !empty(cart.defaultShipment.shippingAddress)) {
                result = CommonHelper.CreateCartStateString(cart);
                if (result.success && !empty(result.CartStateString)) {
                    cartStateString = result.CartStateString;
                    if (((!empty(session.custom.SkipTaxCalculation) || !session.custom.SkipTaxCalculation)) && typeof session.custom.SkipTaxCalculation !== 'undefined') {
                        var TaxFacade = require('~/cartridge/scripts/facade/TaxFacade');
                        var taxationResponse = TaxFacade.TaxationRequest(cart);
                        if (taxationResponse.success && taxationResponse.response !== null) {
                            session.custom.cartStateString = cartStateString;
                            session.custom.SkipTaxCalculation = true;
                            return new Status(Status.OK);
                        }
                        return new Status(Status.ERROR);
                    }
                } else {
                    TaxHelper.UpdatePriceAdjustment(cart);// update price adjustment call
                }
            }	
            CommonHelper.UpdateTaxForGiftCertificate(cart);
            session.custom.SkipTaxCalculation = false;// update tax for gift certificate call
            return new Status(Status.OK);
        } catch (e) {
            Logger.error('Error while calculating the taxes.' + e.message);
            return new Status(Status.ERROR);
        }
    }
}

exports.calculateTax = calculateTax;
