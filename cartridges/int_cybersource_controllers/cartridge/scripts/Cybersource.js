'use strict';

/**
 * Controller that performs card related services like (AVS, DAV, Payer Authentication,Tax Calculate, Capture Card, Fingerprint) services and Alipay and PayPay services.
 * The authorize and required functions of selected payment method are invoked from respective controller/script in merchant site code.
 * @module controllers/Cybersource
 */

/* API Includes */

var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var CommonHelper = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/helper/CommonHelper');
var guard = require(CybersourceConstants.GUARD);
var app = require(CybersourceConstants.APP);

/**
 * Verifies a credit card against a valid card number and expiration date and possibly invalidates invalid form fields.
 * If the verification was successful a credit card payment instrument is created.
 */
function HandleCard(args) {
	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
	var PaymentInstrument = require('dw/order/PaymentInstrument');
	
	if (empty(PaymentMethod)) {
		return {error: true};
	}
	var Cart = require(CybersourceConstants.SG_CONTROLLER +'/cartridge/scripts/models/CartModel');
    var cart = Cart.get(args.Basket);
    var creditCardForm = app.getForm('billing.paymentMethods.creditCard');
   	var subscriptionToken = CommonHelper.GetSubscriptionToken( creditCardForm.get('selectedCardID').value(), customer);
    var cardNumber = creditCardForm.get('number').value();
   	var cardSecurityCode = creditCardForm.get('cvn').value();
   	var cardType = creditCardForm.get('type').value();
   	var expirationMonth = creditCardForm.get('expiration.month').value();
   	var expirationYear = creditCardForm.get('expiration.year').value();
   	var flexResponse = creditCardForm.get('flexresponse').value();
   	var PaymentMgr = require('dw/order/PaymentMgr');
   	var paymentCard = PaymentMgr.getPaymentCard(cardType);
    if (empty(subscriptionToken) && !empty(flexResponse)) {
    	var creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber);

    	if (creditCardStatus.error) {
    		var invalidatePaymentCardFormElements = require(CybersourceConstants.SG_CORE +'/cartridge/scripts/checkout/InvalidatePaymentCardFormElements');
        	invalidatePaymentCardFormElements.invalidatePaymentCardForm(creditCardStatus, creditCardForm);

        	return {error: true};
    	}
    } else  {
    	if(empty(subscriptionToken)){
	    	var creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber, cardSecurityCode);
	
	    	if (creditCardStatus.error) {
	    		var invalidatePaymentCardFormElements = require(CybersourceConstants.SG_CORE +'/cartridge/scripts/checkout/InvalidatePaymentCardFormElements');
	        	invalidatePaymentCardFormElements.invalidatePaymentCardForm(creditCardStatus, creditCardForm);
	
	        	return {error: true};
	    	}
    	}
    }

    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstruments(cart);
        var paymentInstrument = cart.createPaymentInstrument(PaymentMethod, cart.getNonGiftCertificateAmount());

        paymentInstrument.creditCardHolder = creditCardForm.get('owner').value();
        paymentInstrument.creditCardNumber = cardNumber;
        paymentInstrument.creditCardType = cardType;
        paymentInstrument.creditCardExpirationMonth = expirationMonth;
        paymentInstrument.creditCardExpirationYear = expirationYear;
        if (!empty(subscriptionToken)) {
        	paymentInstrument.setCreditCardToken(subscriptionToken);
        }
    });

    return {success: true};
}

/**
 * Capture Credit Card paid amount, authorize if decision ACCEPT
 */
function CaptureCard(args) {
	var CardFacade = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/facade/CardFacade');
	var CardHelper = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/helper/CardHelper');
	var captureResponse = CardFacade.CCCaptureRequest(args.Order);
	if (captureResponse.success) {
		var paymentInstrument = CardHelper.getNonGCPaymemtInstument(args.Order);
		var PaymentInstrumentUtils = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/utils/PaymentInstrumentUtils');
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

    var libCybersource = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
	//Objects to set in the Service Request inside facade
	var billTo, shipTo;
	var result = CommonHelper.CreateCyberSourceBillToObject(basket, true);
	billTo = result.billTo;
	result = CommonHelper.CreateCybersourceShipToObject(basket);
	shipTo = result.shipTo;
	var CardFacade = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/facade/CardFacade');
	result = CardFacade.DAVRequest(args.Order, billTo, shipTo);
	//facade response handling
	if (result.error) {
		return {error:true};
	}
	return HandleDAVResponse(result.serviceResponse);
}




/**
 * Process 3DRequest by closing the parent window where 3D input taken. Performs the actual validation of card based on 3D password input.
 */
function Process3DRequestParent(args) {
	session.privacy.process3DRequestParent = false;
	var Status = require('dw/system/Status');
	if (request.httpParameterMap.MD.stringValue === session.sessionID) {
		var order = args.Order;
		var paymentInstrument;
		var orderNo = order.orderNo;
		var CardHelper = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/helper/CardHelper');
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
		if ( paymentInstrument.paymentMethod !== CybersourceConstants.METHOD_VISA_CHECKOUT) {
			var PAResponsePARes = request.httpParameterMap.PaRes.value;
			var PAXID = request.httpParameterMap.PAXID.value;
            var transactionId = request.httpParameterMap.processorTransactionId.value != null? request.httpParameterMap.processorTransactionId.value : "";
            if(empty(transactionId))
            {
    			return {fail: true, PlaceOrderError : new Status(Status.ERROR, "confirm.error.declined")};
            }	
			var CardFacade = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/facade/CardFacade');
			var payerAuthbillTo = CommonHelper.CreateCyberSourceBillToObject(order, true);
            var payerAuthshipTo= CommonHelper.CreateCybersourceShipToObject(order);
            var purchaseObject = CommonHelper.CreateCybersourcePurchaseTotalsObject(order);
            var payerAuthsitems = CommonHelper.CreateCybersourceItemObject(order);
            var items = payerAuthsitems.items;
			var scaEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('IsSCAEnabled');
            var result = CardFacade.PayerAuthValidation(PAResponsePARes, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.paymentMethods.creditCard, paymentInstrument.getCreditCardToken(),transactionId, payerAuthbillTo.billTo, paymentInstrument, payerAuthshipTo.shipTo, purchaseObject.purchaseTotals, items);
            if (scaEnabled && result.success && result.serviceResponse.ReasonCode === 478) {
                // eslint-disable-next-line
				session.custom.SCA = true ;
                result = CardFacade.PayerAuthValidation(PAResponsePARes, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.paymentMethods.creditCard, paymentInstrument.getCreditCardToken(),transactionId, payerAuthbillTo.billTo, paymentInstrument, payerAuthshipTo.shipTo, purchaseObject.purchaseTotals, items);
                }
			if (result.success && (result.serviceResponse.ReasonCode === 100 || result.serviceResponse.ReasonCode === '480')) {
            	var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
				result = secureAcceptanceHelper.HookIn3DRequest({Order:order, payerValidationResponse:result.serviceResponse, paymentInstrument:paymentInstrument,SubscriptionID:paymentInstrument.getCreditCardToken()});
				if (result.authorized)
				{
					return {submit: true};
				}
				if (result.review)
				{
					return {review: true};
				}
			}
			
			var PlaceOrderError = result.PlaceOrderError !== null ? PlaceOrderError : new Status(Status.ERROR, "confirm.error.declined");
			return {fail: true, PlaceOrderError : PlaceOrderError};
		} else if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
			paymentInstrument = order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT)[0];
			var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'visacheckout/helper/VisaCheckoutHelper');
            var transactionId = request.httpParameterMap.processorTransactionId.value != null? request.httpParameterMap.processorTransactionId.value : "";
            return VisaCheckoutHelper.PayerAuthValidation(order, paymentInstrument,transactionId);
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
		if (order && order.orderToken) {
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
	if ( basket === null || paymentType === null) {
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
    if (!empty(cart.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL))) {
    	return true;
    }
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    if (customer.authenticated && app.getForm('billing').object.paymentMethods.creditCard.saveCard.value 
    		&& (app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(PaymentInstrument.METHOD_CREDIT_CARD) || app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value.equals(CybersourceConstants.METHOD_SA_FLEX))) {
    	var enableTokenization = Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable").value;
	    subscriptionID = CommonHelper.GetSubscriptionToken( app.getForm('billing').object.paymentMethods.creditCard.selectedCardID.value, customer);
    	if (empty(subscriptionID) && enableTokenization =='YES' ) {
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

        creditCards = customer.getProfile().getWallet().getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
        var CardHelper = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/helper/CardHelper');
        
        var payInstrument = CardHelper.getNonGCPaymemtInstument(cart.object);
		if (!empty(subscriptionID)) {
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
        	newCreditCard.setCreditCardToken(subscriptionID);
        	if (empty(payInstrument.getCreditCardToken())) {
        		payInstrument.setCreditCardToken(subscriptionID);
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

    }
    return true;
}


/**
 * Create Subscription for my account.
 */
function createSubscriptionMyAccount(args) {
	var CardHelper = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/helper/CardHelper');
	var cardObject = CardHelper.CreateCybersourcePaymentCardObject("paymentinstruments");
	if (cardObject.success && cardObject.card !== null) {
		var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData("paymentinstruments");
		if (billToResult.success && billToResult.billTo !== null) {
			var Site = require('dw/system/Site');
			var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(Site.getCurrent().getDefaultCurrency(),"0");
			if (purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null) {
				var SubscriptionFacade = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/facade/SubscriptionFacade');		
				var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals);
				if (subscriptionResult.success && subscriptionResult.serviceResponse !== null) {
						cardObject = null;//null  the card object CyberSourcePaymentCard
						if (parseInt(subscriptionResult.serviceResponse.reasonCode) === 100 || parseInt(subscriptionResult.serviceResponse.reasonCode) === 480) {
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
	var CardHelper = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/helper/CardHelper');
	var cardObject = CardHelper.CreateCybersourcePaymentCardObject("billing");
	if (cardObject.success && !empty(cardObject.card)) {
		var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData("billing");
		if (billToResult.success && !empty(billToResult.billTo)) {
			var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(args.Basket.getCurrencyCode(),args.Basket.getTotalGrossPrice().getValue().toFixed(2));
			if (purchaseTotalsResult.success && !empty(purchaseTotalsResult.purchaseTotals)) {
				var SubscriptionFacade = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/facade/SubscriptionFacade');		
				var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals);
				if (subscriptionResult.success && !empty(subscriptionResult.serviceResponse)) {
						cardObject = null;//null  the card object CyberSourcePaymentCard
							if (parseInt(subscriptionResult.serviceResponse.reasonCode) == 100 || parseInt(subscriptionResult.serviceResponse.reasonCode) == 480) {
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
	var SubscriptionFacade = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/facade/SubscriptionFacade');
	var subscriptionResult = SubscriptionFacade.DeleteSubscription(subscriptionID);
	if (subscriptionResult.success && subscriptionResult.serviceResponse !== null) {
		if (parseInt(subscriptionResult.serviceResponse.reasonCode) === 100) {
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

exports.CaptureCard=CaptureCard;
exports.DAVCheck=DAVCheck;
exports.GetOrder=GetOrder;
exports.Process3DRequestParent=Process3DRequestParent;
exports.ResetPaymentForms=ResetPaymentForms;
exports.HandleCard=HandleCard;
exports.SaveCreditCard=saveCreditCard;
exports.CreateSubscriptionMyAccount=createSubscriptionMyAccount;
exports.CreateSubscriptionBilling=createSubscriptionBilling;
exports.DeleteSubscriptionAccount=deleteSubscriptionAccount;


