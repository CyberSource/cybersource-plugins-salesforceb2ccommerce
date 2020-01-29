'use strict';
/**
 * Controller that performs card related services like (AVS, DAV, Payer Authentication,Tax Calculate, Capture Card, Fingerprint) services and Alipay and PayPay services.
 * The authorize and required functions of selected payment method are invoked from respective controller/script in merchant site code.
 * @module controllers/Cybersource
 */

/* API Includes */

var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');

/**
 * Verifies a credit card against a valid card number and expiration date and possibly invalidates invalid form fields.
 * If the verification was successful a credit card payment instrument is created.
 */
function HandleCard(basket, paymentInformation) {
	var currentBasket = basket;
    var cardErrors = {};
    var cardNumber = paymentInformation.cardNumber.value;
    var cardSecurityCode = paymentInformation.securityCode.value;
    var expirationMonth = paymentInformation.expirationMonth.value;
    var expirationYear = paymentInformation.expirationYear.value;
    var serverErrors = [];
    var creditCardStatus;

    var cardType = paymentInformation.cardType.value;
    var PaymentMgr = require('dw/order/PaymentMgr');
    var paymentCard = PaymentMgr.getPaymentCard(cardType);

    if (!paymentInformation.creditCardToken) {
        if (paymentCard) {
            creditCardStatus = paymentCard.verify(
                expirationMonth,
                expirationYear,
                cardNumber,
                cardSecurityCode
            );
        } else {
            cardErrors[paymentInformation.cardNumber.htmlName] = dw.web.Resource.msg('error.invalid.card.number', 'creditCard', null);
            return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
        }

        if (creditCardStatus.error) {
        	var collections = require('*/cartridge/scripts/util/collections');
			var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
            collections.forEach(creditCardStatus.items, function (item) {
                switch (item.code) {

                    case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                        cardErrors[paymentInformation.cardNumber.htmlName] =
                            dw.web.Resource.msg('error.invalid.card.number', 'creditCard', null);
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                        cardErrors[paymentInformation.expirationMonth.htmlName] =
                            dw.web.Resource.msg('error.expired.credit.card', 'creditCard', null);
                        cardErrors[paymentInformation.expirationYear.htmlName] =
                            dw.web.Resource.msg('error.expired.credit.card', 'creditCard', null);
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_SECURITY_CODE:
                        cardErrors[paymentInformation.securityCode.htmlName] =
                            dw.web.Resource.msg('error.invalid.security.code', 'creditCard', null);
                        break;

                    default:
                        serverErrors.push(
                            dw.web.Resource.msg('error.card.information.error', 'creditCard', null)
                        );
                }
            });

            return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
        }
    }

    Transaction.wrap(function () {
        var Cart = require('*/cartridge/models/cart');
        var currentCart = new Cart(currentBasket);
        CommonHelper.removeExistingPaymentInstruments(currentBasket);
    	var PaymentInstrument = require('dw/order/PaymentInstrument');
        var paymentInstrument = currentBasket.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD, currentCart.getNonGiftCertificateAmount);

        paymentInstrument.setCreditCardHolder(currentBasket.billingAddress.fullName);
        paymentInstrument.setCreditCardNumber(cardNumber);
        paymentInstrument.setCreditCardType(cardType);
        paymentInstrument.setCreditCardExpirationMonth(expirationMonth);
        paymentInstrument.setCreditCardExpirationYear(expirationYear);
        if (!empty(paymentInformation.creditCardToken)) {
            paymentInstrument.setCreditCardToken(paymentInformation.creditCardToken);
        }
    });

    return { fieldErrors: cardErrors, serverErrors: serverErrors, error: false };
}

/**
 * Capture Credit Card paid amount, authorize if decision ACCEPT
 */
function CaptureCard(args) {
    var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    var captureResponse = CardFacade.CCCaptureRequest(args.Order);
    if (captureResponse.success) {
        var paymentInstrument = CardHelper.getNonGCPaymemtInstument(args.Order);
        var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
        PaymentInstrumentUtils.UpdatePaymentTransactionCardCapture(paymentInstrument, args.Order, captureResponse.serviceResponse);
        switch (captureResponse.serviceResponse.Decision) {
            case 'ACCEPT':
                return { authorized: true, CaptureResponse: captureResponse.serviceResponse };
            case 'ERROR':
                return { error: true, CaptureResponse: captureResponse.serviceResponse };
            default:
                return { declined: true, CaptureResponse: captureResponse.serviceResponse };
        }
    }
    return { error: true, errorMsg: captureResponse.errorMsg };
}


/**
 * Pipleline checks DAV request, authorize if DAVReasonCode 100
 */
function DAVCheck(args) {
    var basket = args.Basket;

    // Objects to set in the Service Request inside facade
    var billTo;
    var shipTo;
    var result = CommonHelper.CreateCyberSourceBillToObject(basket, true);
    billTo = result.billTo;
    result = CommonHelper.CreateCybersourceShipToObject(basket);
    shipTo = result.shipTo;
    var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
    result = CardFacade.DAVRequest(args.Order, billTo, shipTo);
    // facade response handling
    if (result.error) {
        return { error: true };
    }
    return HandleDAVResponse(result.serviceResponse);
}


/**
 * Process 3DRequest by closing the parent window where 3D input taken. Performs the actual validation of card based on 3D password input.
 */
function Process3DRequestParent(args) {
    session.privacy.process3DRequestParent = false;
    if (request.httpParameterMap.MD.stringValue === session.sessionID) {
        var order = args.Order;
        var paymentInstrument;
        var orderNo = order.orderNo;
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        session.privacy.order_id = orderNo;
        paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
        if (empty(paymentInstrument.getCreditCardToken()) && !empty(session.forms.billing.creditCardFields.selectedCardID.value)) {
            var subscriptionToken = CommonHelper.GetSubscriptionToken(session.forms.billing.creditCardFields.selectedCardID.value, customer);
            if (!empty(subscriptionToken)) {
                Transaction.wrap(function () {
                    paymentInstrument.setCreditCardToken(subscriptionToken);
                });
            }
        }
        if (paymentInstrument.paymentMethod !== CybersourceConstants.METHOD_VISA_CHECKOUT) {
            var PAResponsePARes = request.httpParameterMap.PaRes.value;
            var PAXID = request.httpParameterMap.PAXID.value;
            var transactionId = request.httpParameterMap.processorTransactionId.value != null? request.httpParameterMap.processorTransactionId.value : "";
            var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
            var result = CardFacade.PayerAuthValidation(PAResponsePARes, paymentInstrument.paymentTransaction.amount, orderNo, session.forms.billing.creditCardFields, paymentInstrument.getCreditCardToken(),transactionId);
            if (result.success && result.serviceResponse.ReasonCode === 100 && (!empty(PAXID) ? PAXID === result.serviceResponse.PAVXID : true)) {
                var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
                result = secureAcceptanceHelper.HookIn3DRequest({ Order: order, payerValidationResponse: result.serviceResponse, paymentInstrument: paymentInstrument, SubscriptionID: paymentInstrument.getCreditCardToken() });
                if (result.authorized) {
                    return { submit: true };
                }
                if (result.review) {
                    return { review: true };
                }
            }
            var Status = require('dw/system/Status');
            var PlaceOrderError = result.PlaceOrderError !== null ? PlaceOrderError : new Status(Status.ERROR, 'confirm.error.declined');
            return { fail: true, PlaceOrderError: PlaceOrderError };
        } else if (!empty(order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT))) {
            paymentInstrument = order.getPaymentInstruments(CybersourceConstants.METHOD_VISA_CHECKOUT)[0];
            var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/helper/VisaCheckoutHelper');
            return VisaCheckoutHelper.PayerAuthValidation(order, paymentInstrument);
        }
    } else {
        return { home: true };
    }
}

/**
 * Retrive order based on session privacy order_id. Helps to authenticate the valid request during return URL from cybersource to merchant site
 */
function GetOrder(order) {
    var order = order;
    if (empty(order)) {
        if (!empty(session.privacy.order_id)) {
            // GetOrder
            var OrderMgr = require('dw/order/OrderMgr');
            order = OrderMgr.getOrder(session.privacy.order_id);
            session.privacy.order_id = '';
        }
        if (order && order.orderToken === request.httpParameterMap.order_token.value) {
            return { success: true, Order: order };
        }
        var Status = require('dw/system/Status');
        return { error: true, PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical') };
    }
    return { success: true, Order: order };
}

/**
 * Reset Payment Forms on billing page
 */
function ResetPaymentForms(args) {
    var basket = args.Basket;
    var paymentType = args.PaymentType;
    if (basket === null || paymentType === null) {
        return { error: true, errorMsg: 'basket or paymentType is empty' };
    }

    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstrumentsExceptPaymentType(basket, paymentType);
    });
    return { success: true };
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
    var BasketMgr = require('dw/order/BasketMgr');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var basket = BasketMgr.getCurrentOrNewBasket();
    if (!empty(basket.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL))) {
        return true;
    }
    if (!empty(customer) && customer.authenticated && session.forms.billing.creditCardFields.saveCard.value
        && session.forms.billing.paymentMethod.value.equals(PaymentInstrument.METHOD_CREDIT_CARD)) {
        subscriptionID = CommonHelper.GetSubscriptionToken(session.forms.billing.creditCardFields.selectedCardID.value, customer);
        if (empty(subscriptionID)) {
            var createSubscriptionBillingResult = createSubscriptionBilling({ Basket: basket });
            return createSubscriptionBillingResult;
        }
    }
    return true;
}


/**
 * Create Subscription for my account.
 */
function createSubscriptionMyAccount(args) {
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    var cardObject = CardHelper.CreateCybersourcePaymentCardObject('paymentinstruments');
    if (cardObject.success && cardObject.card !== null) {
        var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData('paymentinstruments');
        if (billToResult.success && billToResult.billTo !== null) {
            var Site = require('dw/system/Site');
            var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(Site.getCurrent().getDefaultCurrency(), '0');
            if (purchaseTotalsResult.success && purchaseTotalsResult.purchaseTotals !== null) {
                var SubscriptionFacade = require('~/cartridge/scripts/facade/SubscriptionFacade');
                var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals);
                if (subscriptionResult.success && subscriptionResult.serviceResponse !== null) {
                    cardObject = null;// null  the card object CyberSourcePaymentCard
                    if (parseInt(subscriptionResult.serviceResponse.reasonCode) === 100 || parseInt(subscriptionResult.serviceResponse.reasonCode) === 480) {
                        return {
                            ok: true,
                            decision: subscriptionResult.serviceResponse.decision,
                            reasonCode: subscriptionResult.serviceResponse.reasonCode,
                            subscriptionID: subscriptionResult.serviceResponse.SubscriptionIDToken
                        };
                    }

                    return { error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode: subscriptionResult.serviceResponse.reasonCode };
                }
            }
        }
    }
}


/**
 * Create Subscription for checkout billing.
 */
function createSubscriptionBilling(args) {
    var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
    var cardObject = CardHelper.CreateCybersourcePaymentCardObject('billing');
    if (cardObject.success && !empty(cardObject.card)) {
        var billToResult = CommonHelper.CreateCyberSourceBillToObject_UserData('billing');
        if (billToResult.success && !empty(billToResult.billTo)) {
            var purchaseTotalsResult = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(args.Basket.getCurrencyCode(), args.Basket.getTotalGrossPrice().getValue().toFixed(2));
            if (purchaseTotalsResult.success && !empty(purchaseTotalsResult.purchaseTotals)) {
                var SubscriptionFacade = require('~/cartridge/scripts/facade/SubscriptionFacade');
                var subscriptionResult = SubscriptionFacade.CreateSubscription(billToResult.billTo, cardObject.card, purchaseTotalsResult.purchaseTotals);
                if (subscriptionResult.success && !empty(subscriptionResult.serviceResponse)) {
                    cardObject = null;// null  the card object CyberSourcePaymentCard
                    if (parseInt(subscriptionResult.serviceResponse.reasonCode) == 100 || parseInt(subscriptionResult.serviceResponse.reasonCode) == 480) {
                        return { ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode: subscriptionResult.serviceResponse.reasonCode, subscriptionID: subscriptionResult.serviceResponse.SubscriptionIDToken };
                    }

                    return { error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode: subscriptionResult.serviceResponse.reasonCode };
                }
            }
        }
    }
}


/**
 * Delete Subscription for My Account.
 */
function deleteSubscriptionAccount(subscriptionID) {
    var TriggeredAction = request.triggeredFormAction;
    if (empty(subscriptionID)) {
        return { ok: true };
    }
    var SubscriptionFacade = require('~/cartridge/scripts/facade/SubscriptionFacade');
    var subscriptionResult = SubscriptionFacade.DeleteSubscription(subscriptionID);
    if (subscriptionResult.success && subscriptionResult.serviceResponse !== null) {
        if (parseInt(subscriptionResult.serviceResponse.reasonCode) === 100) {
            return { ok: true, decision: subscriptionResult.serviceResponse.decision, reasonCode: subscriptionResult.serviceResponse.reasonCode };
        }
        return { error: true, decision: subscriptionResult.serviceResponse.decision, reasonCode: subscriptionResult.serviceResponse.reasonCode };
    }
}

/*
 * Module exports
 */

/*
 * Local methods
 */

exports.CaptureCard = CaptureCard;
exports.DAVCheck = DAVCheck;
exports.GetOrder = GetOrder;
exports.Process3DRequestParent = Process3DRequestParent;
exports.ResetPaymentForms = ResetPaymentForms;
exports.HandleCard = HandleCard;
exports.SaveCreditCard = saveCreditCard;
exports.CreateSubscriptionMyAccount = createSubscriptionMyAccount;
exports.CreateSubscriptionBilling = createSubscriptionBilling;
exports.DeleteSubscriptionAccount = deleteSubscriptionAccount;

