'use strict';

/* eslint-disable no-undef */
var server = require('server');

var OrderMgr = require('dw/order/OrderMgr');
var HookMgr = require('dw/system/HookMgr');
var BasketMgr = require('dw/order/BasketMgr');
var URLUtils = require('dw/web/URLUtils');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var OrderModel = require('*/cartridge/models/order');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

// eslint-disable-next-line
server.use('Submit', csrfProtection.generateToken, function (req, res, next) {
    var order;
    if (!empty(req.querystring.order_id)) {
        order = OrderMgr.getOrder(req.querystring.order_id);
    } else {
        order = OrderMgr.getOrder(session.privacy.orderId);
    }
    if (!empty(order) && !empty(order.orderToken)) {
        // eslint-disable-next-line
        var orderToken = order.orderToken;
    }
    var Provider = require('*/cartridge/scripts/Provider');
    var providerParam = req.querystring.provider;
    // var processorTransactionId;
    COHelpers.clearPaymentAttributes();

    //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if (!empty(order) && !empty(order.getPaymentInstruments())) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }

    if (!empty(providerParam)) {
        var providerResult = Provider.Check(order);
        if (!empty(providerResult)) {
            if (providerResult.pending) {
                COHelpers.reviewOrder(providerResult.Order.orderNo, req, res, next);
                return next();
            } if (providerResult.load3DRequest) {
                res.render('cart/payerAuthenticationRedirect');
                return next();
            } if (providerResult.submit) {
                COHelpers.submitOrder(providerResult.Order.orderNo, req, res, next);
                return next();
            } if (providerResult.error) {
                var args = { Order: providerResult.Order };
                COHelpers.failOrder(args);
                res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', dw.web.Resource.msg('payerauthentication.carderror', 'cybersource', null)));
                return next();
            } if (providerResult.cancelfail) {
                var ReasonCode = request.httpParameterMap.SecureAcceptanceError.stringValue;
                if (!ReasonCode) {
                    ReasonCode = request.httpParameterMap.reason_code.stringValue;
                }
                res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'SecureAcceptanceError', ReasonCode));
                return next();
            } if (providerResult.carterror) {
                res.redirect(URLUtils.url('Cart-Show'));
                return next();
            } if (providerResult.redirect) {
                res.render(providerResult.render, {
                    Location: providerResult.location
                });
                return next();
            } if (providerResult.orderreview) {
                res.redirect(providerResult.location);
                return next();
            }
            if (providerResult.sca) {
                session.privacy.paSetup = true;
                session.privacy.orderId = order.orderNo;
                res.redirect(URLUtils.url('CheckoutServices-PlaceOrder'));
                return next();
            }
        }
    } else if (!empty(paymentInstrument) && paymentInstrument.paymentMethod === 'DW_APPLE_PAY') {
        COHelpers.submitApplePayOrder(order, req, res, next);
    }
});

server.get('SilentPostSubmitOrder', csrfProtection.generateToken, function (req, res, next) {
    var orderId = session.privacy.orderId;
    COHelpers.submitOrder(orderId, req, res, next);
});

server.get('SilentPostReviewOrder', csrfProtection.generateToken, function (req, res, next) {
    var orderId = session.privacy.orderId;
    COHelpers.reviewOrder(orderId, req, res, next);
});

server.get('SubmitOrderConformation', csrfProtection.generateToken, function (req, res, next) {
    var orderId = req.querystring.ID;
    var token = req.querystring.token;
    res.render('cart/RedirectToConformation', {
        orderId: orderId,
        orderToken: token
    });
    return next();
});
module.exports = server.exports();
