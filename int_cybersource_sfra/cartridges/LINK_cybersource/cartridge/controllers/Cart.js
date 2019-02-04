'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Show', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
	var currentBasket = BasketMgr.getCurrentBasket();
	var VisaCheckout = require('~/cartridge/scripts/visacheckout/helper/VisaCheckoutHelper');
    var visaCheckoutForm = server.forms.getForm('visacheckout');
    var VInitFormattedString = '';
    var signature = '';
  	var result = VisaCheckout.Initialize();
    if (result.success) {
    	VInitFormattedString = result.VInitFormattedString;
    	signature = result.signature;
    }
    // TO handle the visa checkout click even on cart and billing page from mini cart
    session.privacy.cyb_CurrentPage = 'CybCart'; 
    var viewData = res.getViewData();
    viewData = {
    		VInitFormattedString: VInitFormattedString,
            Signature: signature,
            visaCheckoutForm: visaCheckoutForm,
            Basket: currentBasket
    };
    res.setViewData(viewData);
    next();
});


server.append('MiniCartShow', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
	var currentBasket = BasketMgr.getCurrentBasket();
	var VisaCheckout = require('~/cartridge/scripts/visacheckout/helper/VisaCheckoutHelper');
    var visaCheckoutForm = server.forms.getForm('visacheckout');
    var VInitFormattedString = '';
    var signature = '';
  	var result = VisaCheckout.Initialize();
    if (result.success) {
    	VInitFormattedString = result.VInitFormattedString;
    	signature = result.signature;
    }
    var viewData = res.getViewData();
    viewData = {
    		VInitFormattedString: VInitFormattedString,
            Signature: signature,
            visaCheckoutForm: visaCheckoutForm,
            Basket: currentBasket
    };
    res.setViewData(viewData);
    next();
});

server.append('RemoveProductLineItem', function (req, res, next) {
	session.privacy.paypalShippingIncomplete = '';
	session.privacy.paypalBillingIncomplete = '';
	var BasketMgr = require('dw/order/BasketMgr');
	var currentBasket = BasketMgr.getCurrentBasket();
	var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
	var Transaction = require('dw/system/Transaction');
	Transaction.wrap(function () {
		COHelpers.handlePayPal(currentBasket);
	});
    next();
});

module.exports = server.exports();