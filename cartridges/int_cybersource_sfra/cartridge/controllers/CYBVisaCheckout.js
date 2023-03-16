'use strict';

/* eslint-disable no-undef */
var server = require('server');

/*
 *Controller that handles the Cybersource Visa Checkout Processing
 */

/* API Includes */
var logger = dw.system.Logger.getLogger('Cybersource');
var Transaction = require('dw/system/Transaction');
// var Resource = require('dw/web/Resource');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/helper/VisaCheckoutHelper');
var VisaCheckoutAdaptor = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/adaptor/VisaCheckoutAdaptor');

/**
 * Load Visa Checkout Button via remote include where get th button settings from site preferences.
 */
// eslint-disable-next-line
server.get('Button', function (req, res, next) {
    try {
        var buttonsource = null;
        if (!empty(request.httpParameterMap.buttonsource.value)) {
            buttonsource = request.httpParameterMap.buttonsource.value;
        }
        var result = VisaCheckoutAdaptor.ButtonDisplay();
        if (!empty(result) && result.success) {
            res.render('visacheckout/buttonDisplay', {
                VisaCheckoutButtonQueryString: result.ButtonDisplayURL,
                VisaCheckoutTellMeMoreActive: result.TellMeMoreActive,
                buttonsource: buttonsource
            });
        } else {
            logger.error('Error retriveing Visa Checkout button');
        }
        return next();
    } catch (e) {
        logger.error('Error retriveing Visa Checkout button settings: {0}', e.message);
    }
});

/**
 * Update shipping details in cart object
 * @param {*} cart cart
 * @param {*} decryptedPaymentData decryptedPaymentData
 * @returns {*} obj
 */
function shippingUpdate(cart, decryptedPaymentData) {
    var shipment = cart.defaultShipment;
    if (!empty(shipment.getShippingAddress())) {
        return { success: true };
    }
    try {
        VisaCheckoutAdaptor.UpdateShipping(decryptedPaymentData);
        return { success: true };
    } catch (err) {
        logger.error('[VisaCheckout.js]Error creating shipment from Visa Checkout address: {0}', err.message);
        return { error: true, errorMsg: err.message };
    }
}

/**
 * Visa Checkout Light Box returned error back to merchant site, further return user back to user journey starting page, either cart or billing page
 * @param {*} req req
 * @param {*} res res
 * @param {*} next next
 * @returns {*} obj
 */
function visaCheckoutError(req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var BasketMgr = require('dw/order/BasketMgr');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'helper/CommonHelper');
    var cart = BasketMgr.getCurrentBasket();
    // basket uuid check for security handling
    if (empty(cart.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
        session.privacy.SkipTaxCalculation = false;
        session.privacy.cartStateString = null;
        var VInitFormattedString = '';
        var signature = '';
        var result = VisaCheckoutHelper.Initialize();
        if (result.success) {
            VInitFormattedString = result.VInitFormattedString;
            signature = result.signature;
        }
        COHelpers.recalculateBasket(cart);

        var Status = require('dw/system/Status');
        res.render('cart/cart', {
            cart: cart,
            RegistrationStatus: false,
            BasketStatus: new Status(Status.ERROR, 'VisaCheckoutError'),
            VInitFormattedString: VInitFormattedString,
            Signature: signature
        });
    } else {
        Transaction.wrap(function () {
            CommonHelper.removeExistingPaymentInstruments(cart);
        });
        COHelpers.recalculateBasket(cart);
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'VisaCheckoutError', true));
    }
    return next();
}

/**
 * Visa payload decrypt via cybersource and update the basket with billing and shipping details take user to review page or return back to cart page with error
 */
// eslint-disable-next-line
server.post('Decrypt', csrfProtection.generateToken, function (req, res, next) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var BasketMgr = require('dw/order/BasketMgr');
    var URLUtils = require('dw/web/URLUtils');
    var result = VisaCheckoutAdaptor.DecryptPayload();
    // check reason code in result
    if (result.success) {
        result = shippingUpdate(result.basket, result.decryptedPaymentData);
        if (result.success) {
            var cart = BasketMgr.getCurrentBasket();
            // calculate cart and redirect to summary page
            COHelpers.recalculateBasket(cart);
            res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder'));
            return next();
        }
    } else {
        logger.error('Error decrypting Visa Checkout payment: reason code not 100');
        visaCheckoutError(req, res, next);
    }
});

/**
* This method is used to create flex token
*/
server.get('InitializeVisaToken', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var VisaCheckout = require('~/cartridge/scripts/visacheckout/helper/VisaCheckoutHelper');
    var visaCheckoutForm = server.forms.getForm('visaCheckout');
    var VInitFormattedString = '';
    var signature = '';
    var result = VisaCheckout.Initialize();
    if (result.success) {
        VInitFormattedString = result.VInitFormattedString;
        signature = result.signature;
    }
    var Locale = require('dw/util/Locale');
    var currentLocale = Locale.getLocale(req.locale.id);
    // TO handle the visa checkout click even on cart and billing page from mini cart
    session.privacy.cyb_CurrentPage = '';
    session.privacy.cyb_CurrentPage = 'CybCart';
    // var viewData = res.getViewData();
    var visaToken = {
        VInitFormattedString: VInitFormattedString,
        Signature: signature,
        visaCheckoutForm: visaCheckoutForm,
        Basket: currentBasket,
        currentLocale: currentLocale.ID
    };
    res.render('visacheckout/launch', {
        VisaTokenResult: visaToken
    });
    next();
});

/*
 * Module exports
 */
module.exports = server.exports();
