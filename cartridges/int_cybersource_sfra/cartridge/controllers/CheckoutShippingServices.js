'use strict';

/* eslint-disable no-undef */
var page = module.superModule;
var server = require('server');

server.extend(page);

/**
 * PayPal custom address validation handling. Validates and appends the paypal payment status on submit of shipping page.
 * If the basket totals are not updated after initial PayPal Authorization, PayPal details are not prompted
 * again on the billing page.
 */
server.append('SubmitShipping', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Locale = require('dw/util/Locale');
    var Resource = require('dw/web/Resource');
    var OrderModel = require('*/cartridge/models/order');
    var currentBasket = BasketMgr.getCurrentBasket();
    var viewData = res.getViewData();
    var paidWithPayPal = false;
    var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
    if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
        req.session.privacyCache.set('usingMultiShipping', false);
        usingMultiShipping = false;
    }
    var currentLocale = Locale.getLocale(req.locale.id);
    var basketModel = new OrderModel(
        currentBasket,
        {
            usingMultiShipping: usingMultiShipping,
            shippable: true,
            countryCode: currentLocale.country,
            containerView: 'basket'
        }
    );

    var taxError = false;
    if (session.privacy.isTaxCalculationFailed) {
        session.privacy.isTaxCalculationFailed = false;
        taxError = true;
    }
    var selectedPayment;
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if (!empty(currentBasket.getPaymentInstruments())) {
        paymentInstrument = currentBasket.getPaymentInstruments()[0];
    }
    if (paymentInstrument != null) {
        selectedPayment = basketModel.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'PAYPAL' || basketModel.billing.payment.selectedPaymentInstruments[0].paymentMethod === 'PAYPAL_CREDIT' ? 'PAYPAL' : 'others';
    }
    paidWithPayPal = CommonHelper.ValidatePayPalInstrument(currentBasket, basketModel);
    session.privacy.paypalShippingIncomplete = false;
    var options = { paidWithPayPal: paidWithPayPal, selectedPayment: selectedPayment };
    viewData.options = options;
    viewData.taxError = taxError;
    if (taxError) {
        viewData.taxErrorMsg = Resource.msg('error.message.taxcalculation.fail', 'cybersource', null);
    }
    res.setViewData(viewData);
    next();
});

server.append('UpdateShippingMethodsList', function (req, res, next) {
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var BasketMgr = require('dw/order/BasketMgr');
    var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    var currentBasket = BasketMgr.getCurrentBasket();
    var address = ShippingHelper.getAddressFromRequest(req);
    var billingAddress = CommonHelper.UpdateBillingAddress(address);
    next();
});

module.exports = server.exports();
