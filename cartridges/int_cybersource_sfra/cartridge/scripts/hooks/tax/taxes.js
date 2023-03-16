'use strict';

/**
* This file will contains adapter methods for Cybersource Taxation
* Integration.
*/
var Status = require('dw/system/Status');
var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');

/**
 * calculateTax
 * @param {*} cart cart
 * @returns {*} obj
 */
function calculateTax(cart) {
    // Default tax calculation, if Cybersource Tax not enabled
    var EnableTaxation = Site.getCurrent().getCustomPreferenceValue('CsEnableTaxation');
    var IsCartridgeEnabled = Site.getCurrent().getCustomPreferenceValue('IsCartridgeEnabled');
    var status;

    if (IsCartridgeEnabled && EnableTaxation) {
        try {
            var TaxHelper = require('~/cartridge/scripts/helper/TaxHelper');
            var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
            var result;
            var cartStateString;

            // eslint-disable-next-line
            if (empty(cart)) {
                Logger.error('Please provide a Basket!');
                status = new Status(Status.ERROR);
            }
            // eslint-disable-next-line
            if (!empty(cart) && !empty(cart.getAllProductLineItems()) && !empty(cart.defaultShipment) && !empty(cart.defaultShipment.shippingAddress)) {
                result = CommonHelper.CreateCartStateString(cart);
                // eslint-disable-next-line
                session.privacy.updateBillingAddress = false;
                // eslint-disable-next-line
                if (result.success && !empty(result.CartStateString)) {
                    cartStateString = result.CartStateString;
                    // eslint-disable-next-line
                    if (((!empty(session.privacy.SkipTaxCalculation) || !session.privacy.SkipTaxCalculation)) && typeof session.privacy.SkipTaxCalculation !== 'undefined') {
                        var TaxFacade = require('~/cartridge/scripts/facade/TaxFacade');
                        var taxationResponse = TaxFacade.TaxationRequest(cart);
                        status = new Status(Status.ERROR);
                        if (taxationResponse.success && taxationResponse.response !== null) {
                            // eslint-disable-next-line
                            session.privacy.cartStateString = cartStateString;
                            // eslint-disable-next-line
                            session.privacy.SkipTaxCalculation = true;
                            status = new Status(Status.OK);
                        }
                        // eslint-disable-next-line
                        session.privacy.isTaxCalculationFailed = true;
                        // eslint-disable-next-line
                        session.privacy.updateBillingAddress = true;
                    }
                } else {
                    TaxHelper.UpdatePriceAdjustment(cart);// update price adjustment call
                }
                // eslint-disable-next-line
                session.privacy.isTaxCalculationFailed = false;
            }
            CommonHelper.UpdateTaxForGiftCertificate(cart);
            // eslint-disable-next-line
            session.privacy.SkipTaxCalculation = false;// update tax for gift certificate call
            status = new Status(Status.OK);
        } catch (e) {
            Logger.error('Error while calculating the taxes.' + e.message);
            status = new Status(Status.ERROR);
        }
    }
    return status;
}

exports.calculateTax = calculateTax;
