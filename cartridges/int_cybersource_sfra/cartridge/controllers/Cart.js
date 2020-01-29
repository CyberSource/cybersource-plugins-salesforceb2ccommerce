'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Show', function (req, res, next) {
	var Locale = require('dw/util/Locale');
    var currentLocale = Locale.getLocale(req.locale.id);
    var viewData = res.getViewData();
    viewData = {
            currentLocale : currentLocale.ID
    };
    res.setViewData(viewData);
    next();
});


server.append('MiniCartShow', function (req, res, next) {
    var Locale = require('dw/util/Locale');
    var currentLocale = Locale.getLocale(req.locale.id);
    var viewData = res.getViewData();
    viewData = {
            currentLocale : currentLocale.ID
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