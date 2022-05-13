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

/**
 * function
 * @param {*} args args
 * @returns {*} obj
 */
function failOrder(args) {
    var Cybersource = require('~/cartridge/scripts/Cybersource');
    var orderResult = Cybersource.GetOrder(args.Order);
    if (orderResult.error) {
        // eslint-disable-next-line
        args.PlaceOrderError = orderResult.PlaceOrderError;
        return args;
    }
    var order = orderResult.Order;
    var PlaceOrderError = args.PlaceOrderError != null ? args.PlaceOrderError : new dw.system.Status(dw.system.Status.ERROR, 'confirm.error.declined', 'Payment Declined');
    session.privacy.SkipTaxCalculation = false;
    var failResult = dw.system.Transaction.wrap(function () {
        OrderMgr.failOrder(order, true);
        return {
            error: true,
            PlaceOrderError: PlaceOrderError
        };
    });
    if (failResult.error) {
        // eslint-disable-next-line
        args.PlaceOrderError = failResult.PlaceOrderError;
    }
    return args;
}

/**
 * Create Order and set to NOT CONFIRMED
 * @param {*} orderId orderId
 * @param {*} req req
 * @param {*} res res
 * @param {*} next next
 * @returns {*} obj
 */
function reviewOrder(orderId, req, res, next) {
    var currentBasket = BasketMgr.getCurrentBasket();
    var order = OrderMgr.getOrder(orderId);
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    var Transaction = require('dw/system/Transaction');

    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);
        res.redirect(URLUtils.https('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode));
        return next();
    }

    COHelpers.sendConfirmationEmail(order, req.locale.id);

    //  Set Order confirmation status to NOT CONFIRMED
    var Order = require('dw/order/Order');
    Transaction.wrap(function () {
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
    });

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);
    res.redirect(URLUtils.https('COPlaceOrder-SubmitOrderConformation', 'ID', order.orderNo, 'token', order.orderToken));
    return next();
}

/**
 * Submit the order and send order confirmation email
 * @param {*} orderId orderId
 * @param {*} req req
 * @param {*} res res
 * @param {*} next next
 * @returns {*} obj
 */
function submitOrder(orderId, req, res, next) {
    var currentBasket = BasketMgr.getCurrentBasket();
    var order = OrderMgr.getOrder(orderId);
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    var Transaction = require('dw/system/Transaction');
    var Resource = require('dw/web/Resource');

    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);
        res.redirect(URLUtils.https('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode));
        return next();
    }

    // Place the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'PlaceOrderError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }

    //  Set order confirmation status to not confirmed for REVIEW orders.
    if (session.privacy.CybersourceFraudDecision === 'REVIEW') {
        var Order = require('dw/order/Order');
        Transaction.wrap(function () {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        });
    }

    COHelpers.sendConfirmationEmail(order, req.locale.id);
    // Reset using MultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);
    res.redirect(URLUtils.https('COPlaceOrder-SubmitOrderConformation', 'ID', order.orderNo, 'token', order.orderToken));
    return next();
}

/**
 * function
 * @param {*} order order
 * @param {*} req req
 * @param {*} res res
 * @param {*} next next
 * @returns {*} obj
 */
function submitApplePayOrder(order, req, res, next) {
    var checkoutHelper = require('*/cartridge/scripts/checkout/checkoutHelpers');

    if (!order && req.querystring.order_token !== order.getOrderToken()) {
        return next(new Error('Order token does not match'));
    }
    // var HookMgr = require('dw/system/HookMgr');
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', order);
    var orderPlacementStatus = checkoutHelper.placeOrder(order, fraudDetectionStatus);

    if (orderPlacementStatus.error) {
        return next(new Error('Could not place order'));
    }

    var config = {
        numberOfLineItems: '*'
    };
    var orderModel = new OrderModel(order, { config: config });
    if (!req.currentCustomer.profile) {
        var passwordForm = server.forms.getForm('newPasswords');
        passwordForm.clear();
        res.render('checkout/confirmation/confirmation', {
            order: orderModel,
            returningCustomer: false,
            passwordForm: passwordForm
        });
    } else {
        res.render('checkout/confirmation/confirmation', {
            order: orderModel,
            returningCustomer: true
        });
    }
    return next();
}

// eslint-disable-next-line
server.use('Submit', csrfProtection.generateToken, function (req, res, next) {
    var order;
    if (!empty(req.querystring.order_id)) {
        order = OrderMgr.getOrder(req.querystring.order_id);
    } else {
        order = OrderMgr.getOrder(session.privacy.order_id);
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
                reviewOrder(providerResult.Order.orderNo, req, res, next);
                return next();
            } if (providerResult.load3DRequest) {
                res.render('cart/payerAuthenticationRedirect');
                return next();
            } if (providerResult.submit) {
                submitOrder(providerResult.Order.orderNo, req, res, next);
                return next();
            } if (providerResult.error) {
                var args = { Order: providerResult.Order };
                failOrder(args);
                res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', dw.web.Resource.msg('payerauthentication.carderror', 'cybersource', null)));
                return next();
            } if (providerResult.cancelfail) {
                var ReasonCode = request.httpParameterMap.SecureAcceptanceError.stringValue;
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
        } else {
            // do nothing
        }
    } else if (!empty(paymentInstrument) && paymentInstrument.paymentMethod === 'DW_APPLE_PAY') {
        submitApplePayOrder(order, req, res, next);
    }
});

server.get('SilentPostSubmitOrder', csrfProtection.generateToken, function (req, res, next) {
    var orderId = session.privacy.orderId;
    submitOrder(orderId, req, res, next);
});

server.get('SilentPostReviewOrder', csrfProtection.generateToken, function (req, res, next) {
    var orderId = session.privacy.orderId;
    reviewOrder(orderId, req, res, next);
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
