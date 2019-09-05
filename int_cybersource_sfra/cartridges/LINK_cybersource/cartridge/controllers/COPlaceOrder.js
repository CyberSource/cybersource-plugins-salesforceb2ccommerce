'use strict';
var server = require('server');

var OrderMgr = require('dw/order/OrderMgr');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var OrderModel = require('*/cartridge/models/order');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var HookMgr = require('dw/system/HookMgr');
var BasketMgr = require('dw/order/BasketMgr');
var URLUtils = require('dw/web/URLUtils');

function submitApplePayOrder(order,req, res, next){
    var checkoutHelper = require('*/cartridge/scripts/checkout/checkoutHelpers');

    if (!order && req.querystring.order_token !== order.getOrderToken()) {
        return next(new Error('Order token does not match'));
    }
    var HookMgr = require('dw/system/HookMgr');
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

server.use('Submit', csrfProtection.generateToken, function (req, res, next) {
    var order = OrderMgr.getOrder(req.querystring.order_id);
	var Provider = require('*/cartridge/scripts/Provider');
	var providerParam = req.querystring.provider;
	var processorTransactionId;
    COHelpers.clearPaymentAttributes();

        //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if ( !empty(order) && !empty(order.getPaymentInstruments()) ) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }

	if(!empty(providerParam)) {
		var providerResult = Provider.Check(order);
		if(!empty(providerResult)){
			if(providerResult.pending){
				reviewOrder(providerResult.Order.orderNo, req, res, next)
				return next();
			} else if (providerResult.load3DRequest) {
				res.render('cart/payerauthenticationredirect');
				return next();
			} else if (providerResult.submit) {
				submitOrder(providerResult.Order.orderNo, req, res, next);
				return next();
			} else if (providerResult.error) {
				var args = {Order : providerResult.Order};
				var failOrderResult = failOrder(args);
				res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', dw.web.Resource.msg('payerauthentication.carderror', 'cybersource', null)));
				return next();
			} else if (providerResult.cancelfail) {
				res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderResult', providerResult.PlaceOrderError));
				return next();
			} else if (providerResult.carterror) {
				res.redirect(URLUtils.url('Cart-Show'));
				return next();
			} else if (providerResult.redirect) {
				res.render(providerResult.render, {
					Location:providerResult.location
				});
				return next();
			} else if(providerResult.orderreview) {
				res.redirect(providerResult.location);
				return next();
			}
		} else {
			return;
		}
	} else if( !empty(paymentInstrument) && paymentInstrument.paymentMethod === 'DW_APPLE_PAY' ){
        submitApplePayOrder(order,req, res, next);
    } 
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
		OrderMgr.failOrder(order, true);
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
 * Create Order and set to NOT CONFIRMED
 * @param args
 */
function reviewOrder(order_id, req, res, next) {
	var currentBasket = BasketMgr.getCurrentBasket();
	var order = OrderMgr.getOrder(order_id);
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    var Transaction = require('dw/system/Transaction');

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

    COHelpers.sendConfirmationEmail(order, req.locale.id);
        
    //  Set Order confirmation status to NOT CONFIRMED
    var Order = require('dw/order/Order');
    Transaction.wrap(function () {
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
    });

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);
	res.redirect(URLUtils.https('Order-Confirm', 'ID' , order.orderNo, 'token', order.orderToken));
    return next();
}

/**
*Submit the order and send order confirmation email
*@paramargs
*/
function submitOrder(order_id, req, res, next) {
	var currentBasket = BasketMgr.getCurrentBasket();
	var order = OrderMgr.getOrder(order_id);
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
    if (session.custom.CybersourceFraudDecision == "REVIEW") {
        var Order = require('dw/order/Order');
        Transaction.wrap(function () {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        });
    }

    COHelpers.sendConfirmationEmail(order, req.locale.id);
    // Reset using MultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);
	res.redirect(URLUtils.https('Order-Confirm', 'ID' , order.orderNo, 'token', order.orderToken));
    return next();
}


server.get('SilentPostSubmitOrder', csrfProtection.generateToken, function (req, res, next) {
	var order_id = session.privacy.orderId;
	submitOrder(order_id, req, res, next);
});

module.exports = server.exports();
