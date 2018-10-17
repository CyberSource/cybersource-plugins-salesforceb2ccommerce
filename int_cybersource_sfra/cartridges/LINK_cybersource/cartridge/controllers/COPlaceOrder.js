'use strict';
var server = require('server');

var OrderMgr = require('dw/order/OrderMgr');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var OrderModel = require('*/cartridge/models/order');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var HookMgr = require('dw/system/HookMgr');
var BasketMgr = require('dw/order/BasketMgr');

server.use('Submit', csrfProtection.generateToken, function (req, res, next) {
    var order = OrderMgr.getOrder(req.querystring.order_id);
	var Provider = require('LINK_cybersource/cartridge/scripts/Provider');
	var providerParam = req.querystring.provider;
	if(!empty(providerParam)) {
		var providerResult = Provider.Check(order);
		if(!empty(providerResult)){
			if(providerResult.pending){
				res.redirect(dw.web.URLUtils.https('COPlaceOrder-ReviewOrder', 'order_id', providerResult.Order.orderNo));
				return next();
			} else if (providerResult.load3DRequest) {
				res.render('cart/payerauthenticationredirect');
				return next();
			} else if (providerResult.submit) {
				res.redirect(dw.web.URLUtils.https('COPlaceOrder-SubmitOrder', 'order_id', providerResult.Order.orderNo));
				return next();
			} else if (providerResult.error) {
				var args = {Order : providerResult.Order};
				var failOrderResult = failOrder(args);
				res.redirect(dw.web.URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', dw.web.Resource.msg('payerauthentication.carderror', 'cybersource', null)));
				return next();
			} else if (providerResult.cancelfail) {
				res.redirect(dw.web.URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderResult', providerResult.PlaceOrderError));
				return next();
			} else if (providerResult.carterror) {
				res.redirect(URLUtils.url('Cart-Show'));
				return next();
			} else if (providerResult.redirect) {
				res.render(providerResult.render, {
					Location:providerResult.location
				});
				return next();
			}
		} else {
			return;
		}
	}
});

server.get('SubmitOrder', csrfProtection.generateToken, function (req, res, next) {
		var currentBasket = BasketMgr.getCurrentBasket();
		var order = OrderMgr.getOrder(req.querystring.order_id);
		var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
	    if (fraudDetectionStatus.status === 'fail') {
	        Transaction.wrap(function () { OrderMgr.failOrder(order); });

	        // fraud detection failed
	        req.session.privacyCache.set('fraudDetectionStatus', true);

	        res.json({
	            error: true,
	            cartError: true,
	            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
	            errorMessage: Resource.msg('error.technical', 'checkout', null)
	        });

	        return next();
	    }

	    // Places the order
	    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
	    if (placeOrderResult.error) {
	        res.json({
	            error: true,
	            errorMessage: Resource.msg('error.technical', 'checkout', null)
	        });
	        return next();
	    }

	    COHelpers.sendConfirmationEmail(order, req.locale.id);

	    // Reset usingMultiShip after successful Order placement
	    req.session.privacyCache.set('usingMultiShipping', false);
		res.redirect(dw.web.URLUtils.https('Order-Confirm', 'ID' , order.orderNo, 'token', order.orderToken));


	    return next();
});

function failOrder(args){
	var Cybersource = require('~/cartridge/scripts/Cybersource');
	var orderResult = Cybersource.GetOrder(args.Order);
	if (orderResult.error) {
		args.PlaceOrderError = orderResult.PlaceOrderError;
		return args;
	}
	var order = orderResult.Order;
	var PlaceOrderError = args.PlaceOrderError!= null ? args.PlaceOrderError : new dw.system.Status(dw.system.Status.ERROR, "confirm.error.declined", "Payment Declined");
	session.custom.SkipTaxCalculation=false;
	var failResult = dw.system.Transaction.wrap(function () {
		OrderMgr.failOrder(order);
		return {
			error: true,
			PlaceOrderError: PlaceOrderError
		};
	});
	if (failResult.error){
	args.PlaceOrderError = failResult.PlaceOrderError;
   }
	return args;
}

/**
 * Leave order in created state in demandware and send order confirmation email
 * @param args
 */
server.get('ReviewOrder', csrfProtection.generateToken, function (req, res, next) {
	var currentBasket = BasketMgr.getCurrentBasket();
	var order = OrderMgr.getOrder(req.querystring.order_id);
	var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order); });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // Places the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    COHelpers.sendConfirmationEmail(order, req.locale.id);

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);
	res.redirect(dw.web.URLUtils.https('Order-Confirm', 'ID' , order.orderNo, 'token', order.orderToken));
    return next();
});

module.exports = server.exports();