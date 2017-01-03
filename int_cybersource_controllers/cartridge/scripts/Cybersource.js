'use strict';
/**
 * Controller that performs card related services like (AVS, DAV, Payer Authentication,Tax Calculate, Capture Card, Fingerprint) services and Alipay and PayPay services.
 * The authorize and required functions of selected payment method are invoked from respective controller/script in merchant site code.
 * @module controllers/Cybersource
 */

/* API Includes */

//var PaymentInstrument = require('dw/order/PaymentInstrument');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var logger = dw.system.Logger;
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants');

/**
 * Verifies a credit card against a valid card number and expiration date and possibly invalidates invalid form fields.
 * If the verification was successful a credit card payment instrument is created.
 */
function HandleCard(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	
	var PaymentInstrument = require('dw/order/PaymentInstrument');
	
	if (empty(PaymentMethod) || !PaymentMethod.equals(PaymentInstrument.METHOD_CREDIT_CARD)) {
		return {error: true};
	}
	var Cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel');
    var cart = Cart.get(args.Basket);
    var creditCardForm = app.getForm('billing.paymentMethods.creditCard');
   	var subscriptionToken = CommonHelper.GetSubscriptionToken( creditCardForm.get('selectedCardID').value(), customer);
    var cardNumber = creditCardForm.get('number').value();
   	var cardSecurityCode = creditCardForm.get('cvn').value();
   	var cardType = creditCardForm.get('type').value();
   	var expirationMonth = creditCardForm.get('expiration.month').value();
   	var expirationYear = creditCardForm.get('expiration.year').value();
   	var PaymentMgr = require('dw/order/PaymentMgr');
   	var paymentCard = PaymentMgr.getPaymentCard(cardType);
    if (empty(subscriptionToken)) {
    	var creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber, cardSecurityCode);

    	if (creditCardStatus.error) {
    		
        	var invalidatePaymentCardFormElements = require('app_storefront_core/cartridge/scripts/checkout/InvalidatePaymentCardFormElements');
        	invalidatePaymentCardFormElements.invalidatePaymentCardForm(creditCardStatus, creditCardForm);

        	return {error: true};
    	}
    }

    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstruments(cart);
        
        var paymentInstrument = cart.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD, cart.getNonGiftCertificateAmount());

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
    if (empty(paymentInstrument.getCreditCardToken()) && !empty(app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value)) {
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
    	var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
    	return CardHelper.CardResponse(result.order, paymentInstrument, result.serviceResponse);
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
    if (paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT) && !result.success) {
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
	if (!empty(args.Order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
		var VisaCheckoutFacade = require('int_cybersource/cartridge/scripts/facade/VisaCheckoutFacade');
		result = VisaCheckoutFacade.CCAuthRequest(args.Order, args.orderNo, CommonHelper.GetIPAddress());
	} else {
		var CardFacade = require('int_cybersource/cartridge/scripts/facade/CardFacade');
		result = CardFacade.CCAuthRequest(args.Order, args.Order.orderNo, CommonHelper.GetIPAddress(), session.forms.billing.paymentMethods.creditCard, 
			args.SubscriptionID, args.payerEnrollResponse, args.payerValidationResponse, ReadFromBasket);
	}
	//facade response handling
	if (result.error) {
		return {error:true};
	}
	serviceResponse = result.serviceResponse;
	var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
	return CardHelper.CardResponse(args.Order, args.paymentInstrument, serviceResponse);
}

/**
 * Script method is used to Authorize payer, authorize if PAReasonCode 100
 */
function AuthorizePayer(LineItemCtnrObj, paymentInstrument, orderNo) {
	var libCybersource = require('int_cybersource/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var result, PAReasonCode, PAVReasonCode, AuthorizationReasonCode, serviceResponse;
	var paEnabled = false;
	if (!empty(CybersourceHelper.getPAMerchantID())) {
		var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
		result = CardHelper.PayerAuthEnable(session.forms.billing.paymentMethods.creditCard.type.value);
		if (result.error) {
			return result;
		} else if (result.paEnabled) {
			paEnabled = result.paEnabled;
		}
	}
	if (paEnabled && empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
		var CardFacade = require('int_cybersource/cartridge/scripts/facade/CardFacade');
		result = CardFacade.PayerAuthEnrollCheck(LineItemCtnrObj, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.paymentMethods.creditCard);
		if (result.error) {
			return result;
		}
		serviceResponse = result.serviceResponse;
		if (CybersourceHelper.getProofXMLEnabled()) {
			var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
			PaymentInstrumentUtils.UpdatePaymentTransactionWithProofXML(paymentInstrument, serviceResponse.ProofXML);
		}
		if (serviceResponse.ReasonCode == 100) {
			return {OK:true, serviceResponse:serviceResponse};
		} else if (!empty(serviceResponse.AcsURL)) {
			session.privacy.order_id = orderNo;
			return {payerauthentication:true, serviceResponse:serviceResponse};
		} else {
			Logger.fatal('An error occured during PayerAuthEnroll check. (ReasonCode: {0} , RequestID: {1}',serviceResponse.ReasonCode,serviceResponse.RequestID);
			return {error:true, serviceResponse:serviceResponse};
		}
	} else if (paEnabled && !empty(LineItemCtnrObj.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
		var VisaCheckoutHelper = require('int_cybersource/cartridge/scripts/helper/VisaCheckoutHelper');
		return VisaCheckoutHelper.PayerAuthEnroll(LineItemCtnrObj, paymentInstrument, orderNo);
	} else {
		return {success:true}
	}
}


/**
 * Calculate Taxes via cybersource if skipTaxCalculation is set as false 
 */
function CalculateTaxes(args) {
	
	var ReadFromBasket = false;
	var Basket = args.Basket;
	var shipFrom = null;
	var result,cartStateString, billTo, shipTo, card, purchaseTotal,itemArray,itemMap, taxService,taxationResponse ;
	var TaxHelper = require('int_cybersource/cartridge/scripts/helper/TaxHelper');
	
	if (!empty(Basket)&&!empty(Basket.getAllProductLineItems())&&!empty(Basket.defaultShipment)&&!empty(Basket.defaultShipment.shippingAddress))
	{
		result = CommonHelper.CreateCartStateString(Basket);
		if (result.success && !empty(result.CartStateString)) {
			cartStateString = result.CartStateString;
			if (empty(session.custom.SkipTaxCalculation)||!session.custom.SkipTaxCalculation) {
				ReadFromBasket = true;
				result = CommonHelper.CreateCyberSourceBillToObject(Basket, ReadFromBasket);
				billTo = result.billTo;
				
				result = CommonHelper.CreateCybersourceShipToObject(Basket);
				shipTo = result.shipTo;
						
				var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
				result = CardHelper.CreateCybersourcePaymentCardObject("billing");
				card = result.card;
				
				result = TaxHelper.CreateCybersourceTaxationPurchaseTotalsObject(Basket);
				purchaseTotal = result.CybersourcePurchaseTotals;//grand total not coming
								
				result = TaxHelper.CreateCybersourceTaxationItemsObject(Basket);
				itemArray = result.itemarray;
				itemMap = result.itemmap;
									
				result = TaxHelper.CreateCyberSourceTaxRequestObject();
				taxService = result.taxRequestObject;
										
				var TaxFacade = require('int_cybersource/cartridge/scripts/facade/TaxFacade');
				taxationResponse = TaxFacade.TaxationRequest(Basket, billTo, shipTo, card, shipFrom, itemArray, itemMap, purchaseTotal,taxService);
				if (taxationResponse.success && taxationResponse.response !== null) {

					logger.debug('CalculateTaxes response Decision {1} ReasonCode {2} totalTaxAmount {3}', taxationResponse.response.Decision, taxationResponse.response.ReasonCode, taxationResponse.response.totalTaxAmount);
					result = CommonHelper.Debug(null, request,result.response, Basket, billTo, shipTo, card, shipFrom,itemArray, itemMap, purchaseTotal, taxService);
					session.custom.cartStateString = cartStateString;
					session.custom.SkipTaxCalculation = true;
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
	var CardFacade = require('int_cybersource/cartridge/scripts/facade/CardFacade');
	var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
	var captureResponse = CardFacade.CCCaptureRequest(args.Order);
	if (captureResponse.success) {
		var paymentInstrument = CardHelper.getNonGCPaymemtInstument(args.Order);
		var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
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
 * Pipleline checks DAV request, authorize if DAVReasonCode 100
 */
function DAVCheck(args) {
    var basket = args.Basket;
    var orderNo = args.OrderNo;

    var libCybersource = require('int_cybersource/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
	//Objects to set in the Service Request inside facade
	var billTo, shipTo;
	var result = CommonHelper.CreateCyberSourceBillToObject(basket, true);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourceShipToObject(basket);
	shipTo = result.shipTo;
	var CardFacade = require('int_cybersource/cartridge/scripts/facade/CardFacade');
	result = CardFacade.DAVRequest(args.Order, billTo, shipTo);
	//facade response handling
	if (result.error) {
		return {error:true};
	}
	return HandleDAVResponse(result.serviceResponse);
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
		var order = args.Order;
		var paymentInstrument;
		var orderNo = order.orderNo;
		var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
		session.privacy.order_id = orderNo;
		paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
		if (empty(paymentInstrument.getCreditCardToken()) && !empty(session.forms.billing.paymentMethods.creditCard.selectedCardID.value)) {
			var subscriptionToken = CommonHelper.GetSubscriptionToken( app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value, customer);
			if (!empty(subscriptionToken)) {
				Transaction.wrap(function () {
					paymentInstrument.setCreditCardToken(subscriptionToken);
				});
			}
		}
		if ( paymentInstrument.paymentMethod != CybersourceConstants.METHOD_VISA_CHECKOUT) {
			var PAResponsePARes = request.httpParameterMap.PaRes.value;
			var PAXID = request.httpParameterMap.PAXID.value;
			
			var CardFacade = require('int_cybersource/cartridge/scripts/facade/CardFacade');
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
			var Status = require('dw/system/Status');
			var PlaceOrderError = result.PlaceOrderError != null ? PlaceOrderError : new Status(Status.ERROR, "confirm.error.declined");
			return {fail: true, PlaceOrderError : PlaceOrderError};
		} else if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
			paymentInstrument = order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT)[0];
			var VisaCheckoutHelper = require('int_cybersource/cartridge/scripts/helper/VisaCheckoutHelper');
			return VisaCheckoutHelper.PayerAuthValidation(order, paymentInstrument);
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
			var OrderMgr = require('dw/order/OrderMgr');
			order = OrderMgr.getOrder(session.privacy.order_id);
			session.privacy.order_id = "";
		} 
		if (order && order.orderToken == request.httpParameterMap.order_token.value) {
			return {success:true, Order:order};
		}
		var Status = require('dw/system/Status');
		return {error:true, PlaceOrderError:new Status(Status.ERROR, "confirm.error.technical")};
	} else {
		return {success:true, Order:order};
	}
}

/**
 * Reset Payment Forms on billing page
 */
function ResetPaymentForms(args) {
	var basket = args.Basket;
	var paymentType = args.PaymentType;
	if ( basket == null || paymentType == null) {
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
    var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants');
    if (!empty(cart.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL))) {
    	return true;
    }
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    if (customer.authenticated && app.getForm('billing').object.paymentMethods.creditCard.saveCard.value 
    		&& app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(PaymentInstrument.METHOD_CREDIT_CARD)) {
    	var enableTokenization = Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable");
	    subscriptionID = CommonHelper.GetSubscriptionToken( app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value, customer);
    	if (empty(subscriptionID) && enableTokenization=='YES' ) {
    		var createSubscriptionBillingResult = createSubscriptionBilling({Basket:cart});
    	    if (createSubscriptionBillingResult.error) {
    	    	var Status = require('dw/system/Status');
    	    	return {
                    error: true,
                    PlaceOrderError: new Status(Status.ERROR, 'confirm.error.session')
    	    	};
    	    }
    	    subscriptionID = createSubscriptionBillingResult.subscriptionID;
    	}

        var creditCards = customer.getProfile().getWallet().getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
        var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
        
        var payInstrument = CardHelper.getNonGCPaymemtInstument(cart.object);
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
        	if (!empty(subscriptionID)) {
        		newCreditCard.setCreditCardToken(subscriptionID);
        		if (empty(payInstrument.getCreditCardToken())) {
        			payInstrument.setCreditCardToken(subscriptionID);
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


/**
 * Create Subscription for my account.
 */
function createSubscriptionMyAccount(args) {
	var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
	var cardObject = CardHelper.CreateCybersourcePaymentCardObject("paymentinstruments");
	if (cardObject.success && cardObject.card !== null) {
		var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData("paymentinstruments");
		if (billToResult.success && billToResult.billTo !== null) {
			var Site = require('dw/system/Site');
			var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(Site.getCurrent().getDefaultCurrency(),"0");
			if (purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null) {
				var SubscriptionFacade = require('int_cybersource/cartridge/scripts/facade/SubscriptionFacade');		
				var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals);
				if (subscriptionResult.success && subscriptionResult.serviceResponse !== null) {
						cardObject = null;//null  the card object CyberSourcePaymentCard
						if (subscriptionResult.serviceResponse.reasonCode == 100 || subscriptionResult.serviceResponse.reasonCode == 480) {
							return {ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode, 
								subscriptionID: subscriptionResult.serviceResponse.SubscriptionIDToken};
						}
						else{
							return {error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
						}
				}
			}
		}
	}
}


/**
 * Create Subscription for checkout billing.
 */
function createSubscriptionBilling(args) {
	var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
	var cardObject = CardHelper.CreateCybersourcePaymentCardObject("billing");
	if (cardObject.success && cardObject.card !== null) {
		var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData("billing");
		if (billToResult.success && billToResult.billTo !== null) {
			var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(args.Basket.getCurrencyCode(),args.Basket.getTotalGrossPrice().getValue().toFixed(2));
			if (purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null) {
				var SubscriptionFacade = require('int_cybersource/cartridge/scripts/facade/SubscriptionFacade');		
				var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals);
				if (subscriptionResult.success && subscriptionResult.serviceResponse !== null) {
						cardObject = null;//null  the card object CyberSourcePaymentCard
							if (subscriptionResult.serviceResponse.reasonCode == 100 || subscriptionResult.serviceResponse.reasonCode == 480) {
								return {ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode, subscriptionID: subscriptionResult.serviceResponse.SubscriptionIDToken};
							}
							else{
								return {error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
							}
				}
			}
		}
	}
}


/**
 * Delete Subscription for My Account.
 */
function deleteSubscriptionAccount() {
	var TriggeredAction = request.triggeredFormAction;
	var subscriptionID = TriggeredAction.object.creditCardToken;
	if (empty(subscriptionID)) {
		return {ok: true};
	}
	var SubscriptionFacade = require('int_cybersource/cartridge/scripts/facade/SubscriptionFacade');
	var subscriptionResult = SubscriptionFacade.DeleteSubscription(subscriptionID);
	if (subscriptionResult.success && subscriptionResult.serviceResponse !== null) {
		if (subscriptionResult.serviceResponse.reasonCode == 100) {
			return {ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
		} else{
			return {error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode:subscriptionResult.serviceResponse.reasonCode};
		}
	}
}

/*
 * Module exports
 */

/*
 * Local methods
 */
exports.AuthorizeCreditCard=AuthorizeCreditCard;
exports.AuthorizePayer=AuthorizePayer;
exports.CalculateTaxes=CalculateTaxes;
exports.CaptureCard=CaptureCard;
exports.DAVCheck=DAVCheck;
exports.GetOrder=GetOrder;
exports.Process3DRequest=Process3DRequest;
exports.Process3DRequestParent=Process3DRequestParent;
exports.ResetPaymentForms=ResetPaymentForms;
exports.HandleCard=HandleCard;
exports.SaveCreditCard=saveCreditCard;
exports.CreateSubscriptionMyAccount=createSubscriptionMyAccount;
exports.CreateSubscriptionBilling=createSubscriptionBilling;
exports.DeleteSubscriptionAccount=deleteSubscriptionAccount;


