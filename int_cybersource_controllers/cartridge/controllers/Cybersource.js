'use strict';
/**
 * Controller that performs card related services like (AVS, DAV, Payer Authentication,Tax Calculate, Capture Card, Fingerprint)and BML services and Alipay and PayPay services.
 * The authorize and required functions of selected payment method are invoked from respective controller/script in merchant site code.
 * @module controllers/Cybersource
 */

/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger.getLogger('Cybersource');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function AuthorizeCreditCard(args) {
	let pdict = Pipeline.execute('Cybersource-AuthorizeCreditCard', {
	    PaymentInstrument: args.PaymentInstrument,
	    Order:args.Order,
	    Basket:args.Order
	});
	logger.debug('AuthorizeCreditCard response EndNodeName {0}',pdict.EndNodeName);
	switch(pdict.EndNodeName)
	{
		case 'authorized':
			return {authorized: true};
		
		case 'declined':
			return {declined: true};
			
		case 'error':
			return {error: true};
		
		case 'review':
			return {review: true};
		
		case 'failed':
			return {error: true};

		case 'payerauthentication':
			session.custom.process3DRequest=true;
			app.getView({
		        Order: args.Order,
		        AcsURL:pdict.AcsURL,
		        PAReq:pdict.PAReq,
		        PAXID: pdict.PAXID
		    }).render('cart/payerauthentication');
			return {end: true};
	}
	
	return;
}

function AuthorizeBML(args) {
	let pdict = Pipeline.execute('Cybersource-AuthorizeBML', {
	    Order:args.Order,
	    Basket:args.Order
	});
	logger.debug('AuthorizeBML response EndNodeName {0}',pdict.EndNodeName);
	switch(pdict.EndNodeName)
	{
		case 'authorized':
			return {authorized: true};
		
		case 'declined':
			return {declined: true};
			
		case 'error':
			return {error: true};
		
		case 'review':
			return {review: true};
		
		case 'failed':
			return {error: true};
	}
	
	return;
}

function AuthorizeAlipay(args) {
	let pdict = Pipeline.execute('Cybersource-AuthorizeAlipay', {
	    Order:args.Order,
	    orderNo:args.orderNo,
	    PaymentInstrument: args.PaymentInstrument
	});
	logger.debug('AuthorizeAlipay response EndNodeName {0}',pdict.EndNodeName);
	switch(pdict.EndNodeName)
	{
		case 'authorized':
			return {authorized: true};
		
		case 'declined':
			return {declined: true};
			
		case 'error':
			return {error: true};
		
		case 'review':
			return {review: true};
		
		case 'failed':
			return {error: true};

		case 'pending':   
			if (dw.system.Site.getCurrent().getCustomPreferenceValue('CsEndpoint').value.equals('Test')) {
				return {pending: true, alipayReturnUrl:pdict.alipayReturnUrl};
			} else {
				response.redirect(pdict.RedirectURL);
				return {end:true};
			}
	}
}

function AuthorizePaypal(args) {
	var order = args.Order;
	var paymentInstrument = args.PaymentInstrument;
	let AuthPdict = Pipeline.execute('Cybersource-AuthorizePaypal',{
		Order:order,
		PaymentInstrument:paymentInstrument,
		orderSetupRequestId:args.orderSetupRequestId,
		orderSetupRequestToken:args.orderSetupRequestToken,
		orderSetupTransactionId:args.orderSetupTransactionId,
		purchaseTotals:null
	});
	
	switch(AuthPdict.EndNodeName){
		case 'authorized':
			if (dw.system.Site.getCurrent().getCustomPreferenceValue('CsPaypalPaymentOption').value.equals('AuthorizeAndCapture')) {
				let paypalCapturePdict = CapturePaypal({PaymentInstrument : paymentInstrument, Order : order});
				if (paypalCapturePdict.error == 'error'){
					return {error: true};
				}
			}
			return {authorized: true};
		case 'declined':
			return {declined: true};
			
		case 'error':
			return {error: true};
		
		case 'review':
			return {review: true};
		
		case 'failed':
			return {error: true};
		case 'pending':
			return { pending:true};
	}
	return;
}

function CalculateTaxes(args) {
	let pdict = Pipeline.execute('Cybersource-CalculateTaxes', {
	    Basket:args.Basket
	});
	logger.debug('CalculateTaxes response EndNodeName {0} Decision {1} ReasonCode {2} totalTaxAmount {3}',pdict.EndNodeName, pdict.Decision, pdict.ReasonCode, pdict.totalTaxAmount);
	switch(pdict.EndNodeName)
	{
		case 'OK':
			return {success: true};
		
		case 'ERROR':
			return {error: true};
	}
	return;
}

function CaptureCard(args) {
	let pdict = Pipeline.execute('Cybersource-CaptureCard', {
	    Order:args.Order
	});
	switch(pdict.EndNodeName)
	{
		case 'authorized':
			return {authorized: true,Decision:pdict.Decision, ReasonCode:pdict.ReasonCode, CaptureReasonCode:pdict.CaptureReasonCode, 
				CaptureAmount:pdict.CaptureAmount, RequestID:pdict.RequestID, RequestToken:pdict.RequestToken};
		
		case 'declined':
			return {declined: true,Decision:pdict.Decision, ReasonCode:pdict.ReasonCode, CaptureReasonCode:pdict.CaptureReasonCode, 
				ScriptLog:pdict.ScriptLog, RequestID:pdict.RequestID};
			
		case 'error':
			return {error: true,Decision:pdict.Decision, ReasonCode:pdict.ReasonCode, CaptureReasonCode:pdict.CaptureReasonCode, 
				ScriptLog:pdict.ScriptLog, RequestID:pdict.RequestID};
	}
	
	return;
}

function CapturePaypal(args) {
	return Pipeline.execute('Cybersource-CapturePaypal', {
	    PaymentInstrument: args.PaymentInstrument,
	    Order:args.Order,
	    Basket:args.Order
	});
}

function PaypalSetService(args) {
	let pdict = Pipeline.execute('Cybersource-PaypalSetService', {
		Basket:args.Basket,
		paypalOrigin:args.paypalOrigin,
		paypalCancelUrl:args.paypalCancelUrl,
		paypalReturnUrl:args.paypalReturnUrl
	});
	if(pdict.EndNodeName=='OK'){
		return {
			OK:true,
			paypalRedirectUrl:pdict.RedirectURL
		};
	}
	return { error:true	};
}

function PaypalGetService(args) {
	let pdict = Pipeline.execute('Cybersource-PaypalGetService', {
		Basket:args.Basket,
		PayPalToken:args.PayPalToken,
		SetRequestID:args.SetRequestID,
		SetRequestToken:args.SetRequestToken
	});
	switch(pdict.EndNodeName)
	{
		case "OK" :
			return {
			OK:true
		};
			 
		case "error":	
			return { error:true	};
	}
	return { error:true	};
}

function PaypalOrderSetup(args) {
	return Pipeline.execute('Cybersource-PaypalOrderSetup', {
	    Order:args.Order,
	    PaymentInstrument:args.PaymentInstrument
	});
}

function DAVCheck(args) {
	let pdict = Pipeline.execute('Cybersource-DAVCheck', {
		Basket:args.Basket
	});
	switch(pdict.EndNodeName)
	{
		case 'authorized':
			return {authorized: true, Decision:pdict.Decision, DAVReasonCode:pdict.DAVReasonCode, RequestID:pdict.RequestID, RequestToken:pdict.RequestToken};
		
		case 'decline':
			return {declined: true, Decision:pdict.Decision, DAVReasonCode:pdict.DAVReasonCode, RequestID:pdict.RequestID, RequestToken:pdict.RequestToken, ScriptLog:pdict.ScriptLog};
			
		case 'error':
			return {error: true, Decision:pdict.Decision, DAVReasonCode:pdict.DAVReasonCode, RequestID:pdict.RequestID, RequestToken:pdict.RequestToken, ScriptLog:pdict.ScriptLog};
	}
	
	return;
}

function IncludeDigitalFingerprint(args) {
	return  Pipeline.execute('Cybersource-IncludeDigitalFingerprint');
}

function RedirectFpLocation(args) {
	return  Pipeline.execute('Cybersource-RedirectFpLocation');
}



function ProcessPaypalExpress(args) {
	 var cart = app.getModel('Cart').get();
	 if(cart){
		 var correlationID = session.custom.correlationID;
		 var ppXpressRequestToken = session.custom.ppXpressRequestToken;
		 var ppXpressRequestId = session.custom.ppXpressRequestId;
		 var ppXpressToken = session.custom.ppOAuthToken;
		 
		 if(!empty(ppXpressToken) && ppXpressToken != request.httpParameterMap.token.stringValue){
			 if(session.custom.paypalOrigin == "billing"){
				  app.getController('COBilling').Start();
				  return;
			 }else{
				 app.getController('Cart').Show();
				 	return;
			 }
		 }
		 
		 if(empty(correlationID) && empty(ppXpressRequestToken)  && empty(ppXpressRequestId))
		 {
			 if(session.custom.paypalOrigin == "billing"){
				  app.getController('COBilling').Start();
				  return;
			 }else{
				 app.getController('Cart').Show();
				 	return;
			 }
		 }else{
			 Transaction.wrap(function () {
				// Remove All existing payment instruments 
			    cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
			    cart.removeExistingPaymentInstruments(dw.order.PaymentInstrument.METHOD_BML);
			    cart.removeExistingPaymentInstruments('PayPal');
			    cart.removeExistingPaymentInstruments('ALIPAY');
		       
		        var paymentInstrument = cart.createPaymentInstrument("PayPal", cart.getNonGiftCertificateAmount());
		            paymentInstrument.paymentTransaction.custom.paypalSetRequestCorrelationID=correlationID;
		         var paymentTransaction =   paymentInstrument.getPaymentTransaction();
		     	paymentTransaction.custom.paypalEcSetRequestToken=ppXpressRequestToken;
				paymentTransaction.custom.payPalPayerId=request.httpParameterMap.PayerID.stringValue;
				paymentTransaction.custom.paypalEcSetRequestID=ppXpressRequestId;
				paymentTransaction.custom.paypalToken=request.httpParameterMap.token.stringValue;
		    });
		 }
		  var billingAddress = cart.getBillingAddress();
		  var  defaultShipment = cart.getDefaultShipment();
		  var shippingAddress =defaultShipment.getShippingAddress();
		  if(!billingAddress && !shippingAddress){
			  if (!billingAddress) {
				   Transaction.wrap(function () {
		            billingAddress = cart.createBillingAddress();
				   });
		        }
			   if(!shippingAddress){
				   defaultShipment = cart.getDefaultShipment();
				   Transaction.wrap(function () {
			       shippingAddress = cart.createShipmentShippingAddress(defaultShipment.getID());
				   });
			   }
			   let pdict = PaypalGetService({Basket:cart.object,
					PayPalToken:request.httpParameterMap.token.value,
					SetRequestID:ppXpressRequestId,
					SetRequestToken:ppXpressRequestToken}); 
			 if (pdict.OK)
			 {
				  app.getForm('billing').object.paymentMethods.creditCard.clearFormElement();
				  var result = app.getController('COShipping').SelectShippingMethod();
				  Transaction.wrap(function () {
				        cart.calculate();
				    });
			 } else {
					app.getController('Cart').Show();
					return;
				}
		  }
		  app.getForm('billing').object.fulfilled.value = true;
		  app.getController('COSummary').Start();
		  return ;
	 }else{
		 app.getController('Cart').Show();
	 }
}



function Process3DRequest(args) {
	 Pipeline.execute('Cybersource-Process3DRequest', args);
	return;
}

function Process3DRequestParent(args) {
	let pdict = Pipeline.execute('Cybersource-Process3DRequestParent', args);
	switch(pdict.EndNodeName)
	{
		case 'fail':
			return {fail: true, PlaceOrderError: pdict.PlaceOrderError};
		
		case 'submit':
			return {submit: true};

		case 'home':
			return {home: true};
	}
	return;
}

function GetOrder(args) {
	var pdict = Pipeline.execute('Cybersource-GetOrder', {
			Order:args.Order
		});
	if (pdict.EndNodeName=="error") {
		return {error:true, PlaceOrderError:new dw.system.Status(dw.system.Status.ERROR, "confirm.error.technical")};
	}
	return pdict;
}


function ProcessPendingOrders(args) {
	Pipeline.execute('Cybersource-ProcessPendingOrders', {
		Order:args.Order
	});
	return;
}

function CheckAlipayPaymentStatus(args) {
	var pdict = Pipeline.execute('Cybersource-CheckAlipayPaymentStatus', args);
	switch(pdict.EndNodeName)
	{
		case 'summaryconfirmation':
			return {summaryconfirmation: true};
		
		case 'submit':
			return {submit: true};

		case 'error':
			return {error: true};
	}
	return;
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.AuthorizeCreditCard=AuthorizeCreditCard;
exports.AuthorizeBML=AuthorizeBML;
exports.AuthorizeAlipay=AuthorizeAlipay;
exports.AuthorizePaypal=AuthorizePaypal;
exports.CalculateTaxes=CalculateTaxes;
exports.CaptureCard=CaptureCard;
exports.CapturePaypal=CapturePaypal;
exports.PaypalSetService=PaypalSetService;
exports.PaypalGetService=PaypalGetService;
exports.PaypalOrderSetup=PaypalOrderSetup;
exports.DAVCheck=DAVCheck;
exports.IncludeDigitalFingerprint=guard.ensure(['https'], IncludeDigitalFingerprint);
exports.RedirectFpLocation=guard.ensure(['https'], RedirectFpLocation);
exports.GetOrder=GetOrder;
exports.Process3DRequest=Process3DRequest;
exports.Process3DRequestParent=Process3DRequestParent;
exports.ProcessPaypalExpress=guard.ensure(['https'], ProcessPaypalExpress);
exports.ProcessPendingOrders=guard.ensure(['https'], ProcessPendingOrders);
exports.CheckAlipayPaymentStatus=guard.ensure(['https'], CheckAlipayPaymentStatus);