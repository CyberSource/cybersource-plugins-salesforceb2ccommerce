'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Confirm', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Locale = require('dw/util/Locale');
    var OrderModel = require('*/cartridge/models/order');
    var viewData = res.getViewData();
    var order = OrderMgr.getOrder(req.querystring.ID);
    var config = {
            numberOfLineItems: '*'
        };
    var currentLocale = Locale.getLocale(req.locale.id);
    var orderModel = new OrderModel(
            order,
            { config: config, countryCode: currentLocale.country, containerView: 'order' }
        );
   //Google Pay Credit Card Details
    if(order.paymentInstrument != null && order.paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.googlepay','cybersource',null)){
		var cardType = order.paymentInstrument.creditCardType; 
		orderModel.billing.payment.selectedPaymentInstruments[0].type = cardType;
		orderModel.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = order.paymentInstrument.creditCardNumber;
	}
    //Visa Checkout Credit Card Details
    if(order.paymentInstrument != null && order.paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.visacheckout','cybersource',null)) {
			orderModel.resources.cardType = '';
			orderModel.resources.cardEnding = '';
			orderModel.billing.payment.selectedPaymentInstruments[0].type = order.paymentInstrument.creditCardType;
			orderModel.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = order.paymentInstrument.creditCardNumber;
			orderModel.billing.payment.selectedPaymentInstruments[0].expirationMonth = order.paymentInstrument.creditCardExpirationMonth;
			orderModel.billing.payment.selectedPaymentInstruments[0].expirationYear = order.paymentInstrument.creditCardExpirationYear;
	}
    viewData = {
    	order: orderModel
    };
    res.setViewData(viewData);
    next();
});

server.append('Details', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Locale = require('dw/util/Locale');
    var OrderModel = require('*/cartridge/models/order');
    var viewData = res.getViewData();
    var order = OrderMgr.getOrder(viewData.order.orderNumber);
    var config = {
            numberOfLineItems: '*'
        };
    var currentLocale = Locale.getLocale(req.locale.id);
    var orderModel = new OrderModel(
            order,
            { config: config, countryCode: currentLocale.country, containerView: 'order' }
        );
    //Google Pay Credit Card Details
    if(order.paymentInstrument != null && order.paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.googlepay','cybersource',null)){
		var cardType = order.paymentInstrument.creditCardType; 
		orderModel.billing.payment.selectedPaymentInstruments[0].type = cardType;
		orderModel.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = order.paymentInstrument.creditCardNumber;
	}
   //Visa Checkout Credit Card Details
    if(order.paymentInstrument != null && order.paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.visacheckout','cybersource',null)) {
			orderModel.resources.cardType = '';
			orderModel.resources.cardEnding = '';
			orderModel.billing.payment.selectedPaymentInstruments[0].type = order.paymentInstrument.creditCardType;
			orderModel.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = order.paymentInstrument.creditCardNumber;
			orderModel.billing.payment.selectedPaymentInstruments[0].expirationMonth = order.paymentInstrument.creditCardExpirationMonth;
			orderModel.billing.payment.selectedPaymentInstruments[0].expirationYear = order.paymentInstrument.creditCardExpirationYear;
	}
    viewData = {
    	order: orderModel
    };
    res.setViewData(viewData);
    next();
});

module.exports = server.exports();