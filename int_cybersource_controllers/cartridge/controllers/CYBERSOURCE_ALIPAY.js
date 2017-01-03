'use strict';
/**
 * CYBERSOURCE_ALIPAY controller contains all method related to this type of payment instrument (ALIPAY)
 * @module controllers/CYBERSOURCE_ALIPAY
 */

/* API Includes */
var Cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');

/**
 * This is where current implementation simply creates a payment method and returns 'success'.
*/

function Handle(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	if (!empty(PaymentMethod)) {
	    var cart = Cart.get(args.Basket);
	    var isPaymentInstrumentCreated = false;
	    var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
	    var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
        	CommonHelper.removeExistingPaymentInstruments(cart);
            
            cart.createPaymentInstrument(PaymentMethod, cart.getNonGiftCertificateAmount());
            isPaymentInstrumentCreated = true;
        });
        if (isPaymentInstrumentCreated) {
        	return {sucess: true};
        }
	}
	return {error:true};
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the CYBERSOURCE_ALIPAY processor only and
 * setting the order no as the transaction ID. Customizations may use other processors and custom logic to authorize
 * credit card payment.
 */
function Authorize(args) {
	var orderNo = args.OrderNo;
	var OrderMgr = require('dw/order/OrderMgr');
	var Order = OrderMgr.getOrder(orderNo);
    var paymentInstrument = args.PaymentInstrument;
    var PaymentMgr = require('dw/order/PaymentMgr');
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    
    var alipayResult = AuthorizeAlipay({Order:Order, orderNo:orderNo, PaymentInstrument: paymentInstrument});
	if (alipayResult.pending){
		app.getView({alipayReturnUrl:alipayResult.alipayReturnUrl}).render('custom/alipayintermediate');
		return {end:true};
	} else {
		return alipayResult;   
	}
}

/*
 *  This controller method authorize Alipay Initiate payment request and generates requestID, requestToken,
 *  reconciliationID and redirect URL which will redirect user to Alipay site and change the payment status as per the request.
 */
function AuthorizeAlipay(args) {
	var Order = args.Order;
	var cart = app.getModel('Cart').get();
	var orderNo = args.orderNo;
	var URLUtils = require('dw/web/URLUtils');
	var alipayReturnUrl =URLUtils.https('COPlaceOrder-Submit','provider','alipay','order_token',Order.orderToken);
	var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');
	var Site = require('dw/system/Site');
	var alipayPaymentType =  Site.getCurrent().getCustomPreferenceValue("apPaymentType");
	var alipayHelper = require('int_cybersource/cartridge/scripts/helper/AlipayHelper');
	session.custom.alipayOrderNo = orderNo;
	
	var libCybersource = require('int_cybersource/cartridge/scripts/cybersource/libCybersource');
	var cybersourceHelper = libCybersource.getCybersourceHelper();		
	var purchaseTotalsResult = alipayHelper.CreateCSPurchaseTotalForAlipay(Order);
	
		if (purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null) { 
		
			var setProductResult = alipayHelper.AlipaySetProductParameters(Order);
			if (setProductResult.success && setProductResult.productObject !== null) {
			
			var alipayFacade = require('int_cybersource/cartridge/scripts/facade/AlipayFacade');
			var response = alipayFacade.AlipayInitiatePaymentRequest(orderNo,alipayReturnUrl,purchaseTotalsResult.purchaseTotals,setProductResult.productObject);
			if (response.success && response.alipayInitiatePaymentResponse !== null) {
					
				switch(response.alipayInitiatePaymentResponse.Decision) {
						case "ACCEPT" :
							if (response.alipayInitiatePaymentResponse.ReasonCode === 100) {
								var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
								PaymentInstrumentUtils.authorizeAlipayOrderUpdate(Order,response.alipayInitiatePaymentResponse);
								session.privacy.order_id = orderNo;
									if (Site.getCurrent().getCustomPreferenceValue('CsEndpoint').value.equals('Test')) {
										return {pending: true, alipayReturnUrl:alipayReturnUrl};
									} else {
										response.redirect(response.alipayInitiatePaymentResponse.RedirectURL);
										return {end:true};
									}
							}
						break;
						case "REJECT" :
							if (response.alipayInitiatePaymentResponse.ReasonCode === 102 || response.alipayInitiatePaymentResponse.ReasonCode === 233) {
								return {declined: true};
							}
						break;
						case "ERROR" :
							if (response.alipayInitiatePaymentResponse.ReasonCode === 150) {
							return {error: true};
							}
						break;
						default :
							return {error: true};
				}
			}
		}		
	}
	return {error: true};
}


/*
 * Module exports
 */

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
//exports.CheckAlipayPaymentStatus=guard.ensure(['https'], CheckAlipayPaymentStatus);
