'use strict';
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
	var selectedPayment;
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
       //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if ( !empty(currentBasket.getPaymentInstruments()) ) {
       paymentInstrument = currentBasket.getPaymentInstruments()[0];
    }
	if(paymentInstrument != null)
		selectedPayment = basketModel.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'PAYPAL' || 
							basketModel.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'PAYPAL_CREDIT'? 'PAYPAL' : 'others';
	paidWithPayPal = CommonHelper.ValidatePayPalInstrument(currentBasket, basketModel);
	session.privacy.paypalShippingIncomplete = false;
	var options = {'paidWithPayPal' : paidWithPayPal, 'selectedPayment': selectedPayment};
    viewData.options = options;
    res.setViewData(viewData);
	next();
});


module.exports = server.exports();
