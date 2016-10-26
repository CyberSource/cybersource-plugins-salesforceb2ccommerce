'use strict';
/**
 * Controller that performs card related services like (AVS, DAV, Payer Authentication,Tax Calculate, Capture Card, Fingerprint) services and Alipay and PayPay services.
 * The authorize and required functions of selected payment method are invoked from respective controller/script in merchant site code.
 * @module controllers/Cybersource
 */

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger;
var Cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel');
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var libCybersource = require('int_cybersource/cartridge/scripts/cybersource/libCybersource');
var alipayHelper = require('int_cybersource/cartridge/scripts/Helper/AlipayHelper');
var alipayFacade = require('int_cybersource/cartridge/scripts/Facade/AlipayFacade');
var CardFacade = require('int_cybersource/cartridge/scripts/Facade/CardFacade');
var CardHelper = require('int_cybersource/cartridge/scripts/Helper/CardHelper');
var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');
var Cybersource_Subscription = require('int_cybersource_controllers/cartridge/controllers/Cybersource_Subscription');
var TaxHelper = require('int_cybersource/cartridge/scripts/Helper/TaxHelper');
var TaxFacade = require('int_cybersource/cartridge/scripts/Facade/TaxFacade');
var VisaCheckoutFacade = require('int_cybersource/cartridge/scripts/Facade/VisaCheckoutFacade');
var VisaCheckoutHelper = require('int_cybersource/cartridge/scripts/Helper/VisaCheckoutHelper');
var VisaCheckout = require('int_cybersource_controllers/cartridge/controllers/VisaCheckout');

/**
 * Verifies a credit card against a valid card number and expiration date and possibly invalidates invalid form fields.
 * If the verification was successful a credit card payment instrument is created.
 */
function HandleCard(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	if (empty(PaymentMethod) || !PaymentMethod.equals('CREDIT_CARD')) {
		return {error: true};
	}
    var cart = Cart.get(args.Basket);
    var creditCardForm = app.getForm('billing.paymentMethods.creditCard');
   	var subscriptionToken = CommonHelper.GetSubscriptionToken( creditCardForm.get('selectedCardID').value(), customer);
    var cardNumber = creditCardForm.get('number').value();
   	var cardSecurityCode = creditCardForm.get('cvn').value();
   	var cardType = creditCardForm.get('type').value();
   	var expirationMonth = creditCardForm.get('expiration.month').value();
   	var expirationYear = creditCardForm.get('expiration.year').value();
   	var paymentCard = PaymentMgr.getPaymentCard(cardType);
    if (empty(subscriptionToken)) {
    	var creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber, cardSecurityCode);

    	if (creditCardStatus.error) {

        	var invalidatePaymentCardFormElements = require('int_cybersource/cartridge/scripts/utils/InvalidatePaymentCardFormElements');
        	invalidatePaymentCardFormElements.invalidatePaymentCardForm(creditCardStatus, creditCardForm);

        	return {error: true};
    	}
    }

    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstruments(cart);
        var paymentInstrument = cart.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD, cart.getNonGiftCertificateAmount());

        paymentInstrument.creditCardHolder = creditCardForm.get('owner').value();
        paymentInstrument.creditCardNumber = cardNumber;
        paymentInstrument.creditCardType = cardType;
        paymentInstrument.creditCardExpirationMonth = expirationMonth;
        paymentInstrument.creditCardExpirationYear = expirationYear;
        if (!empty(subscriptionToken)) {
        	paymentInstrument.custom.isSubscription = true;
        	paymentInstrument.setCreditCardToken(subscriptionToken);
        }
    });

    return {success: true};
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function AuthorizeCreditCard(args) {
    var paymentInstrument = args.PaymentInstrument;
    if (null==paymentInstrument) {
    	return {error: true};
    }
    if(empty(paymentInstrument.getCreditCardToken()) && !empty(app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value)){
    	var subscriptionToken = CommonHelper.GetSubscriptionToken( app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value, customer);
    	if (!empty(subscriptionToken)) {
	    	Transaction.wrap(function () {
			paymentInstrument.setCreditCardToken(subscriptionToken);
	    	});
    	}
	}
	var orderNo = args.orderNo;
    if (null==orderNo) {
    	orderNo = args.Order.orderNo;
    }
    var result = AuthorizePayer(args.Order, paymentInstrument, orderNo);
	if (result.error) {
    	return {error: true};
	} else if (result.failed) {
    	return {declined: true};
    } else if (result.cardresponse) {
    	return CardResponse(result.order, paymentInstrument, result.serviceResponse);
    } else if (result.payerauthentication) {
		session.privacy.process3DRequest=true;
		app.getView({
	        Order: args.Order,
	        AcsURL:result.serviceResponse.AcsURL,
	        PAReq:result.serviceResponse.PAReq,
	        PAXID: result.serviceResponse.PAXID
	    }).render('cart/payerauthentication');
		return {end: true};
    }
    if (paymentInstrument.paymentMethod.equals('VISA_CHECKOUT') && !result.success) {
    	return result;
    }
    return HookIn3DRequest({Order:args.Order, orderNo:orderNo, payerEnrollResponse:result.serviceResponse, paymentInstrument:paymentInstrument,SubscriptionID:paymentInstrument.getCreditCardToken()});
}

/**
 * Card processing for 3D cards
 * @param args
 * @returns
 */
function HookIn3DRequest(args) {
	var result, serviceResponse;
	var ReadFromBasket = true;
	//Service facade call for card authorization
	if (!empty(args.Order.getPaymentInstruments('VISA_CHECKOUT'))) {
		result = VisaCheckoutFacade.CCAuthRequest(args.Order, args.orderNo, CommonHelper.GetIPAddress());
	} else {
		result = CardFacade.CCAuthRequest(args.Order, args.Order.orderNo, CommonHelper.GetIPAddress(), session.forms.billing.paymentMethods.creditCard, 
			args.SubscriptionID, args.payerEnrollResponse, args.payerValidationResponse, ReadFromBasket);
	}
	//facade response handling
	if (result.error) {
		return {error:true};
	}
	serviceResponse = result.serviceResponse;
	return CardResponse(args.Order, args.paymentInstrument, serviceResponse);
}

/**
 * Card Response for processing service response
 * @param order
 * @param paymentInstrument
 * @param serviceResponse
 * @returns
 */
function CardResponse(order, paymentInstrument, serviceResponse) {
	//response validate
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	if (!(CybersourceHelper.getDavEnable() && CybersourceHelper.getDavOnAddressVerificationFailure()=='REJECT'
		&& serviceResponse.ReasonCode!=100 && !empty(serviceResponse.DAVReasonCode) && serviceResponse.DAVReasonCode!=100)) {
		//simply logging detail response not utilized
		CardHelper.HandleDAVResponse(serviceResponse);
		if (serviceResponse.AVSCode == 'N') {
			//returns response based on AVS result to be ignored or not
			if (true == CybersourceHelper.getAvsIgnoreResult()) {
				return {review:true};
			}
			return {declined:true};
		}
		
		//order payment transaction updates
		PaymentInstrumentUtils.UpdatePaymentTransactionCardAuthorize(paymentInstrument, serviceResponse);
		if (serviceResponse.StandardizedAddress && (serviceResponse.ReasonCode == "100" || serviceResponse.ReasonCode == "480")) {
			CommonHelper.UpdateOrderShippingAddress(serviceResponse.StandardizedAddress, order, session.forms.singleshipping.shippingAddress.useAsBillingAddress.value);
		}
		if (serviceResponse.ReasonCode == "100" || serviceResponse.ReasonCode == "480") {
			var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/Helper/SecureAcceptanceHelper');
			secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customer.authenticated?customer:null);
		}
		//returns response as authorized, error, declined based on ReasonCode
		return CardHelper.HandleCardResponse(serviceResponse);
	}
	//returns response as authorized, error, declined based on DAVReasonCode or ReasonCode
	return CardHelper.HandleDAVResponse(serviceResponse);
}

/**
 * Pipeline is used to Authorize payer, authorize if PAReasonCode 100
 */
function AuthorizePayer(LineItemCtnrObj : dw.order.LineItemCtnr, paymentInstrument : dw.order.PaymentInstrument, orderNo) {
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var result, PAReasonCode, PAVReasonCode, AuthorizationReasonCode, serviceResponse;
	var paEnabled = false;
	if (!empty(CybersourceHelper.getPAMerchantID())) {
		result = CardHelper.PayerAuthEnable(session.forms.billing.paymentMethods.creditCard.type.value);
		if (result.error) {
			return result;
		} else if (result.paEnabled) {
			paEnabled = result.paEnabled;
		}
	}
	if (paEnabled && empty(LineItemCtnrObj.getPaymentInstruments('VISA_CHECKOUT'))) {
		result = CardFacade.PayerAuthEnrollCheck(LineItemCtnrObj, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.paymentMethods.creditCard);
		if (result.error) {
			return result;
		}
		serviceResponse = result.serviceResponse;
		if (CybersourceHelper.getProofXMLEnabled()) {
			PaymentInstrumentUtils.UpdatePaymentTransactionWithProofXML(paymentInstrument, serviceResponse.ProofXML);
		}
		if (serviceResponse.ReasonCode == 100) {
			return {OK:true, serviceResponse:serviceResponse};
		} else if (!empty(serviceResponse.AcsURL)) {
			session.privacy.order_id = orderNo;
			return {payerauthentication:true, serviceResponse:serviceResponse};
		} else {
			logger.getRootLogger().fatal('An error occured during PayerAuthEnroll check. (ReasonCode: {0} , RequestID: {1}',serviceResponse.ReasonCode,serviceResponse.RequestID);
			return {error:true, serviceResponse:serviceResponse};
		}
	} else if(paEnabled && !empty(LineItemCtnrObj.getPaymentInstruments('VISA_CHECKOUT'))) {
		return VisaCheckout.PayerAuthEnroll(LineItemCtnrObj, paymentInstrument, orderNo);
	} else {
		return {success:true}
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
	var alipayReturnUrl =dw.web.URLUtils.https('COPlaceOrder-Submit','provider','alipay','order_token',Order.orderToken);
	var alipayPaymentType =  dw.system.Site.getCurrent().getCustomPreferenceValue("apPaymentType");
		session.custom.alipayOrderNo = orderNo;
		
			var cybersourceHelper = libCybersource.getCybersourceHelper();		
			var purchaseTotalsResult = alipayHelper.CreateCSPurchaseTotalForAlipay(Order);
			
				if(purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null){ 
				
					var setProductResult = alipayHelper.AlipaySetProductParameters(Order);
					if(setProductResult.success && setProductResult.productObject !== null){
					
					var response = alipayFacade.AlipayInitiatePaymentRequest(orderNo,alipayReturnUrl,purchaseTotalsResult.purchaseTotals,setProductResult.productObject);
					if(response.success && response.alipayInitiatePaymentResponse !== null){
							
						switch(response.alipayInitiatePaymentResponse.Decision){
								case "ACCEPT" :
									if(response.alipayInitiatePaymentResponse.ReasonCode === 100){
										PaymentInstrumentUtils.authorizeAlipayOrderUpdate(Order,response.alipayInitiatePaymentResponse);
										session.privacy.order_id = orderNo;
											if (dw.system.Site.getCurrent().getCustomPreferenceValue('CsEndpoint').value.equals('Test')) {
												return {pending: true, alipayReturnUrl:alipayReturnUrl};
											} else {
												response.redirect(response.alipayInitiatePaymentResponse.RedirectURL);
												return {end:true};
											}
									}
								break;
								case "REJECT" :
									if(response.alipayInitiatePaymentResponse.ReasonCode === 102 || response.alipayInitiatePaymentResponse.ReasonCode === 233){
										return {declined: true};
									}
								break;
								case "ERROR" :
									if(response.alipayInitiatePaymentResponse.ReasonCode === 150){
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

/**
 * This pipeline Authorize the Order for paypal. This require order setup transactionID, OrderSetupRequestId, orderSetupRequestToken as pipeline param.
 */
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

/**
 * Calculate Taxes via cybersource if skipTaxCalculation is set as false 
 */
function CalculateTaxes(args) {
	
	var ReadFromBasket = false;
	var Basket = args.Basket;
	var shipFrom = null;
	var result,cartStateString, billTo, shipTo, card, purchaseTotal,itemArray,itemMap, taxService,taxationResponse ;
	
	if(!empty(Basket)&&!empty(Basket.defaultShipment)&&!empty(Basket.defaultShipment.shippingAddress)){
		
		result = CommonHelper.CreateCartStateString(Basket);
		if(result.success && !empty(result.CartStateString)){
			cartStateString = result.CartStateString;
			
			if(empty(session.custom.SkipTaxCalculation)||!session.custom.SkipTaxCalculation){
						ReadFromBasket = true;
						result = CommonHelper.CreateCyberSourceBillToObject(Basket, ReadFromBasket);
						billTo = result.billTo;
						
						result = CommonHelper.CreateCybersourceShipToObject(Basket);
						shipTo = result.shipTo;
								
						result = CardHelper.CreateCybersourcePaymentCardObject("billing");
						card = result.card;
						
						result = TaxHelper.CreateCybersourceTaxationPurchaseTotalsObject(Basket);
						purchaseTotal = result.CybersourcePurchaseTotals;//grand total not coming
										
						result = TaxHelper.CreateCybersourceTaxationItemsObject(Basket);
						itemArray = result.itemarray;
						itemMap = result.itemmap;
											
						result = TaxHelper.CreateCyberSourceTaxRequestObject();
						taxService = result.taxRequestObject;
												
						taxationResponse = TaxFacade.TaxationRequest(Basket, billTo, shipTo, card, shipFrom, itemArray, itemMap, purchaseTotal,taxService);
						if(taxationResponse.success && taxationResponse.response !== null){

								logger.debug('CalculateTaxes response Decision {1} ReasonCode {2} totalTaxAmount {3}', taxationResponse.response.Decision, taxationResponse.response.ReasonCode, taxationResponse.response.totalTaxAmount);
								result = CommonHelper.Debug(null, request,result.response, Basket, billTo, shipTo, card, shipFrom,itemArray, itemMap, purchaseTotal, taxService);
								session.custom.cartStateString = cartStateString;
								session.custom.SkipTaxCalculation = false;
								card = null;
								return {success: true};	
						}
								return {error: true};
			}
		}else
		{
			result = TaxHelper.UpdatePriceAdjustment(Basket);//update price adjustment call
		}
	}
		result = CommonHelper.UpdateTaxForGiftCertificate(Basket);
		session.custom.SkipTaxCalculation = false;//update tax for gift certificate call
		return {success: true};
		
}

/**
 * Capture Credit Card paid amount, authorize if decision ACCEPT
 */
function CaptureCard(args) {
	var captureResponse = CardFacade.CCCaptureRequest(args.Order);
	if (captureResponse.success) {
		var paymentInstrument = CardHelper.getNonGCPaymemtInstument(args.Order);
		PaymentInstrumentUtils.UpdatePaymentTransactionCardCapture( paymentInstrument, args.Order, captureResponse.serviceResponse ) ;
		switch(captureResponse.serviceResponse.Decision)
		{
			case 'ACCEPT':
				return {authorized: true, CaptureResponse:captureResponse.serviceResponse};
			case 'ERROR':
				return {error: true, CaptureResponse:captureResponse.serviceResponse};
			default:
				return {declined: true, CaptureResponse:captureResponse.serviceResponse};
		}
	}
	return {error:true, errorMsg:captureResponse.errorMsg};
}

/**
 * Capture paypal order amount, If reason code return 100 or 480
 */
function CapturePaypal(args) {
	var cybersourceHelper = libCybersource.getCybersourceHelper();
	var paypalFacade = require('int_cybersource/cartridge/scripts/Facade/PayPalFacade');
	var result = paypalFacade.PaypalCaptureRequest(args.Order);
		
		if(result.success && result.paypalCaptureResponse != null){
			if(result.paypalCaptureResponse.ReasonCode == "100" || result.paypalCaptureResponse.ReasonCode == "480"){
				PaymentInstrumentUtils.capturePaypalOrderUpdate(args.Order,result.paypalCaptureResponse);
				return {authorized: true};
			}
				else if(result.paypalCaptureResponse.ReasonCode == "481" || result.paypalCaptureResponse.Decision == "ERROR"){
					return {error: true};
				}else{
					return {declined: true};
				}
		}else{
			return {error: true};
		}
}

/**
 * This pipeline initiate the Paypal Set Service for payment through paypal
 */
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

/**
 * This pipeline will used for Get Service of paypal. This require paypal token, set request id and set request token as pipeline param
 */
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

/**
 * This Pipeline initiate the Order at Cybersource, This require Set Request Id, Set Request Token as pipeline input param.
 */
function PaypalOrderSetup(args) {
	return Pipeline.execute('Cybersource-PaypalOrderSetup', {
	    Order:args.Order,
	    PaymentInstrument:args.PaymentInstrument
	});
}

/**
 * Pipleline checks DAV request, authorize if DAVReasonCode 100
 */
function DAVCheck(args) {
    var basket = Basket;
    var orderNo = OrderNo;

	var CybersourceHelper = libCybersource.getCybersourceHelper();
	//Objects to set in the Service Request inside facade
	var billTo, shipTo;
	var result = CommonHelper.CreateCyberSourceBillToObject(basket, true);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourceShipToObject(basket);
	shipTo = result.shipTo;
	result = CardFacade.DAVRequest(args.Order, billTo, shipTo);
	//facade response handling
	if (result.error) {
		return {error:true};
	}
	return HandleDAVResponse(result.serviceResponse);
}

/**
 * This pipeline is used to include digital fingerpirnt into billing isml template
 */
function IncludeDigitalFingerprint(args) {
	app.getView({
		DeviceFingerprintEnabled : dw.system.Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled'),
		DeviceFingerprintJetmetrixLocation : dw.system.Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation'),
		DeviceFingerprintOrgId : dw.system.Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId'),
		MerchantId : dw.system.Site.getCurrent().getCustomPreferenceValue('CsMerchantId'),
		SessionId : session.sessionID,
		RedirectionType : dw.system.Site.getCurrent().getCustomPreferenceValue("CsDeviceFingerprintRedirectionType")
    }).render('cart/fingerprint');
}

/**
 * This pipleline redirects the finger print location based on static mapping configured in BM
 */
function RedirectFpLocation(args) {
	app.getView({
		DeviceFingerprintEnabled : dw.system.Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled'),
		DeviceFingerprintJetmetrixLocation : dw.system.Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation'),
		DeviceFingerprintOrgId : dw.system.Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId'),
		MerchantId : dw.system.Site.getCurrent().getCustomPreferenceValue('CsMerchantId'),
		SessionId : session.sessionID,
		LinkType : request.httpParameterMap.type.value
    }).render('cart/fingerprintredirect');
}

/**
 * Process the paypal express response to display summary page or billing or cart page
 */
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
				CommonHelper.removeExistingPaymentInstruments(cart);
				
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


/**
 * Process 3D request to display the 3D window
 */
function Process3DRequest(args) {
	session.privacy.process3DRequest = false;
	session.privacy.process3DRequestParent = true;
	session.privacy.order_id = args.Order.orderNo;
	app.getView().render('cart/payerauthenticationredirect');
	return;
}

/**
 * Process 3DRequest by closing the parent window where 3D input taken. Performs the actual validation of card based on 3D password input.
 */
function Process3DRequestParent(args) {
	session.privacy.process3DRequestParent = false;
	if (request.httpParameterMap.MD.stringValue == session.sessionID) {
		var order : dw.order.Order = args.Order;
		var paymentInstrument;
		var orderNo = order.orderNo;
		session.privacy.order_id = orderNo;
		paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
		if(empty(paymentInstrument.getCreditCardToken()) && !empty(session.forms.billing.paymentMethods.creditCard.selectedCardID.value)){
			var subscriptionToken = CommonHelper.GetSubscriptionToken( app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value, customer);
			if (!empty(subscriptionToken)) {
				Transaction.wrap(function () {
					paymentInstrument.setCreditCardToken(subscriptionToken);
				});
			}
		}
		if ( paymentInstrument.paymentMethod != "VISA_CHECKOUT") {
			var PAResponsePARes = request.httpParameterMap.PaRes.value;
			var PAXID = request.httpParameterMap.PAXID.value;
			//paymentInstrument = args.Order.getPaymentInstruments('CREDIT_CARD')[0];
			
			var result = CardFacade.PayerAuthValidation(PAResponsePARes, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.paymentMethods.creditCard, paymentInstrument.getCreditCardToken());
			if (result.success && result.serviceResponse.ReasonCode == 100 && PAXID==result.serviceResponse.PAVXID) {
				result = HookIn3DRequest({Order:order, payerValidationResponse:result.serviceResponse, paymentInstrument:paymentInstrument,SubscriptionID:paymentInstrument.getCreditCardToken()});
				if (result.authorized)
				{
					return {submit: true};
				}
				if (result.review)
				{
					return {review: true};
				}
			}
			var PlaceOrderError = result.PlaceOrderError != null ? PlaceOrderError : new dw.system.Status(dw.system.Status.ERROR, "confirm.error.declined");
			return {fail: true, PlaceOrderError : PlaceOrderError};
		} else if (!empty(order.getPaymentInstruments('VISA_CHECKOUT'))) {
			paymentInstrument = order.getPaymentInstruments('VISA_CHECKOUT')[0];
			return VisaCheckout.PayerAuthValidation(order, paymentInstrument);
		}
	} else {
		return {home:true};
	}
}

/**
 * Retrive order based on session privacy order_id. Helps to authenticate the valid request during return URL from cybersource to merchant site
 */
function GetOrder(args) {
	var order = args.Order;
	if (empty(order)) {
		if (!empty(session.privacy.order_id)) {
			//GetOrder
			order = OrderMgr.getOrder(session.privacy.order_id);
			session.privacy.order_id = "";
		} 
		if (order && order.orderToken == request.httpParameterMap.order_token.value) {
			return {success:true, Order:order};
		}
		return {error:true, PlaceOrderError:new dw.system.Status(dw.system.Status.ERROR, "confirm.error.technical")};
	} else {
		return {success:true, Order:order};
	}
}

/**
 * This pipeline process cybersource pending orders for PayPal only
 */
function ProcessPendingOrders(args) {
	Pipeline.execute('Cybersource-ProcessPendingOrders', {
		Order:args.Order
	});
	return;
}

/*
 * 	This controller method check the payment status of initiated payment request through alipay and change the status in demandware for placed order to NEW, CREATED, FAILED
 *  after getting from service call response in relation to Alipay payment status such as COMPLETED, PENDING, ABANDONED and TRADE_NOT_EXIST.
 *  */
function CheckAlipayPaymentStatus(args) {
	var requestID = args.Order.getPaymentInstruments("ALIPAY")[0].paymentTransaction.custom.apInitiatePaymentRequestID;
	var Order = args.Order;
		
		var response = alipayFacade.AlipayCheckPaymentStatusRequest(Order,requestID);
		if(response.success && response.alipayPaymentStatusResponse !== null){
				
			if(response.alipayPaymentStatusResponse.Decision == "ACCEPT" && response.alipayPaymentStatusResponse.ReasonCode == "100"){
					PaymentInstrumentUtils.checkAlipayPaymentStatusOrderUpdate(Order,response.alipayPaymentStatusResponse);
					
					switch(response.alipayPaymentStatusResponse.apPaymentStatus)
					{
						case 'COMPLETED':
							return {submit: true};
							
						case 'PENDING':
							return {summaryconfirmation: true};
							
						case 'ABANDONED':
						case 'TRADE_NOT_EXIST':
							return {error: true};
					}
			}
			else{
				if(response.alipayPaymentStatusResponse.Decision == "REJECT" || response.alipayPaymentStatusResponse.Decision == "ERROR"){
						
						PaymentInstrumentUtils.checkAlipayPaymentStatusOrderUpdate(Order,response.alipayPaymentStatusResponse);
						if(response.alipayPaymentStatusResponse.ReasonCode === 102 || response.alipayPaymentStatusResponse.ReasonCode === 233 || response.alipayPaymentStatusResponse.ReasonCode === 150){
							return {error: true};
						}
						
				}
			}
		}
		return {error: true};
}

/**
 * Reset Payment Forms on billing page
 */
function ResetPaymentForms(args) {
	var basket = args.Basket;
	var paymentType = args.PaymentType;
	if( basket == null || paymentType == null) {
		return {error:true, errorMsg:'basket or paymentType is empty'};
	}
	
	Transaction.wrap(function () {
		CommonHelper.removeExistingPaymentInstrumentsExceptPaymentType(basket, paymentType);
	});
	return {success:true};
}

/**
 * Attempts to save the used credit card in the customer payment instruments.
 * The logic replaces an old saved credit card with the same masked credit card
 * number of the same card type with the new credit card. This ensures creating
 * only unique cards as well as replacing expired cards.
 * @transactional
 * @return {Boolean} true if credit card is successfully saved.
 */
function saveCreditCard() {
    var i, creditCards, GetCustomerPaymentInstrumentsResult, subscriptionID;
    var cart = app.getModel('Cart').get();
    if(!empty(cart.getPaymentInstruments("PayPal"))) {
    	return true;
    }
    if (customer.authenticated && app.getForm('billing').object.paymentMethods.creditCard.saveCard.value 
    		&& app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(dw.order.PaymentInstrument.METHOD_CREDIT_CARD)) {
    	var enableTokenization : String = dw.system.Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable");
	    subscriptionID = CommonHelper.GetSubscriptionToken( app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value, customer);
    	if (empty(subscriptionID) && enableTokenization=='YES' ){
    		var createSubscriptionBillingResult = Cybersource_Subscription.CreateSubscriptionBilling({Basket:cart});
    	    if (createSubscriptionBillingResult.error) {
    	    	return {
                    error: true,
                    PlaceOrderError: new dw.system.Status(dw.system.Status.ERROR, 'confirm.error.session')
    	    	};
    	    }
    	    subscriptionID = createSubscriptionBillingResult.subscriptionID;
    	}

        var creditCards = customer.getProfile().getWallet().getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
        
        var paymentInstrument = CardHelper.getNonGCPaymemtInstument(cart.object);
        Transaction.wrap(function () {
        	var newCreditCard = null;
        	var wallet = customer.getProfile().getWallet();
            newCreditCard = customer.getProfile().getWallet().createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD);

            // coy the credit card details to the payment instrument
            newCreditCard.setCreditCardHolder(app.getForm('billing').object.paymentMethods.creditCard.owner.value);
            newCreditCard.setCreditCardNumber(app.getForm('billing').object.paymentMethods.creditCard.number.value);
            newCreditCard.setCreditCardExpirationMonth(app.getForm('billing').object.paymentMethods.creditCard.expiration.month.value);
            newCreditCard.setCreditCardExpirationYear(app.getForm('billing').object.paymentMethods.creditCard.expiration.year.value);
            newCreditCard.setCreditCardType(app.getForm('billing').object.paymentMethods.creditCard.type.value);
        	if(!empty(subscriptionID)) {
        		newCreditCard.setCreditCardToken(subscriptionID);
        		if (empty(paymentInstrument.getCreditCardToken())) {
        		paymentInstrument.setCreditCardToken(subscriptionID);
        		}
        	}
        	
        	  var isDuplicateCard = false;
              var oldCard;
        	
            var ccNumber = newCreditCard.getCreditCardNumber();
            for (i = 0; i < creditCards.length; i++) {
                var creditcard = creditCards[i];
                var creditcardNo = creditcard.getCreditCardNumber();
                if (creditcard.creditCardExpirationMonth === newCreditCard.creditCardExpirationMonth && creditcard.creditCardExpirationYear === newCreditCard.creditCardExpirationYear 
                		&& creditcard.creditCardType === newCreditCard.creditCardType && creditcardNo.toString().substring(creditcardNo.length-4).equals(ccNumber.substring(ccNumber.length-4))) {
                    isDuplicateCard = true;
                    oldCard = creditcard;
                    break;
                }
                }
            if (isDuplicateCard) {
                wallet.removePaymentInstrument(oldCard);
            }
        });

    }
    return true;
}


/*
 * Module exports
 */

/*
 * Local methods
 */
exports.AuthorizeCreditCard=AuthorizeCreditCard;
exports.AuthorizeAlipay=AuthorizeAlipay;
exports.AuthorizePaypal=AuthorizePaypal;
exports.AuthorizePayer=AuthorizePayer;
exports.CalculateTaxes=CalculateTaxes;
exports.CaptureCard=CaptureCard;
exports.CapturePaypal=CapturePaypal;
exports.PaypalSetService=PaypalSetService;
exports.PaypalGetService=PaypalGetService;
exports.PaypalOrderSetup=PaypalOrderSetup;
exports.DAVCheck=DAVCheck;
exports.CardResponse=CardResponse;
exports.IncludeDigitalFingerprint=guard.ensure(['https'], IncludeDigitalFingerprint);
exports.RedirectFpLocation=guard.ensure(['https'], RedirectFpLocation);
exports.GetOrder=GetOrder;
exports.Process3DRequest=Process3DRequest;
exports.Process3DRequestParent=Process3DRequestParent;
exports.ProcessPaypalExpress=guard.ensure(['https'], ProcessPaypalExpress);
exports.ProcessPendingOrders=guard.ensure(['https'], ProcessPendingOrders);
exports.CheckAlipayPaymentStatus=guard.ensure(['https'], CheckAlipayPaymentStatus);
exports.ResetPaymentForms=ResetPaymentForms;
exports.HandleCard=HandleCard;
exports.SaveCreditCard=saveCreditCard;