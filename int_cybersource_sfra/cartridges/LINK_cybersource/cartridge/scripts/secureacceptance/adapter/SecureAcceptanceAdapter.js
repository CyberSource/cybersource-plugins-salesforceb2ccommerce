'use strict';

var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
var Logger = require('dw/system/Logger');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');

/**
 * @param {Object} additionalArgs Secure acceptance request arguments
 * @returns {Object} response status
 */
function HandleRequest(additionalArgs) {
    var cart = additionalArgs.cart;
    var PaymentMethod = additionalArgs.PaymentMethod;
    var Transaction = require('dw/system/Transaction');
    var transStatus = Transaction.wrap(function () {
        var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
        CommonHelper.removeExistingPaymentInstruments(cart);
        var amount = CommonHelper.CalculateNonGiftCertificateAmount(cart);
        cart.createPaymentInstrument(PaymentMethod, amount);
        return true;
    });
    if (transStatus) {
        return { sucess: true };
    }
    return { error: true };
}

/**
 * @param {Object} args Secure acceptance authorize arguments
 * @param {Object} additionalArgs Additional Secure acceptance authorize arguments
 * @returns {Object} silent post response
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor, additionalArgs) {
    var OrderMgr = require('dw/order/OrderMgr');
	var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var order = OrderMgr.getOrder(orderNumber);
    var paymentInstrument = paymentInstrument;
    var paymentMethod = paymentInstrument.paymentMethod;
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var subscriptionToken = CommonHelper.GetSubscriptionToken(additionalArgs.subscriptionToken, customer);
    if (CsSAType.equals(CybersourceConstants.METHOD_SA_REDIRECT)) {
        return secureAcceptanceHelper.CreateHMACSignature(paymentInstrument, order, null, subscriptionToken);
    }
    else if (CsSAType.equals(CybersourceConstants.METHOD_SA_IFRAME)) {
        return {
            returnToPage: true,
            order: order
        };
    } else if (CsSAType.equals(CybersourceConstants.METHOD_SA_SILENTPOST)) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	    var cardObject = CardHelper.CreateCybersourcePaymentCardObject('billing', subscriptionToken);
    	var saSilentPostRequest = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument, order, null, subscriptionToken);
		return {
        	intermediateSilentPost: true,
        	data: saSilentPostRequest.requestData,
        	formAction : saSilentPostRequest.formAction,
        	cardObject: cardObject.card,
        	renderViewPath : 'secureacceptance/secureAcceptanceSilentPost'
        };
    } else {
    	var silentPostResponse = secureAcceptanceHelper.AuthorizeCreditCard({ PaymentInstrument: paymentInstrument, Order: order, Basket: order });
        if (silentPostResponse.authorized || silentPostResponse.process3DRedirection) {
            var customerObj = (!empty(customer) && customer.authenticated) ? customer : null;
            secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customerObj);
        }
        return silentPostResponse;
    }
}

/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 * @param {string} currentOrderNo current order ID
 * @returns {Object} return object
 */
function OpenIframe(currentOrderNo) {
    var saRequest = null;
    var orderNo = currentOrderNo;
    var returnObject = {};
    if (!empty(orderNo)) {
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNo);
        var paymentInstrument = secureAcceptanceHelper.GetPaymemtInstument(order);
        var server = require('server');
        var cardUUID = server.forms.getForm('billing').creditCardFields.selectedCardID.htmlValue;

        if (null !== order && null !== paymentInstrument) {
        var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
            var subscriptionToken = CommonHelper.GetSubscriptionToken(cardUUID, customer);
            saRequest = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument, order, null, subscriptionToken);
        if (saRequest.success && saRequest.requestData !== null) {
            returnObject.data = saRequest.requestData;
            returnObject.formAction = saRequest.formAction;
            returnObject.success = true;
        }
    }
    } else {
        returnObject.success = false;
    }
    return returnObject;
}

/**
 * Secure Acceptance response handling is done here.
 * On basis of decision and signature verification, checkout flow continues, if signature does not match then user is taken to summary page.
 * @input  httpParameterMap : this map as value of signed fields we get from cybersource.
 */
function SAResponse(currentRequestParameterMap) {
    var Order = require('dw/order/Order');
    var Status = require('dw/system/Status');
    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
    var result = SAHandleResponse(currentRequestParameterMap);
    if (result.success && !empty(result.responseObject)) {
        var orderNo = currentRequestParameterMap.req_reference_number.stringValue;
		var order = OrderMgr.getOrder(orderNo);
        var responseObject = result.responseObject;
        if ('saredirect'.equals(currentRequestParameterMap.provider.stringValue)) {
            var redirectResponse = SARedirectResponse(responseObject, order);
            if (!empty(redirectResponse)) {
                return redirectResponse;
            }
        } else if ('saiframe'.equals(currentRequestParameterMap.provider.stringValue)) {
            var redirectResponse = SAIframeResponse(responseObject, order);
            if (!empty(redirectResponse)) {
                return redirectResponse;
            }
        }
        Logger.error('[SECURE_ACCEPTANCE] SAResponse function Error in response process for order ' + orderNo + ' decision arrived ' + responseObject.Decision);
    }
    Logger.error('[SECURE_ACCEPTANCE] SAResponse function Error in response process does not expect to go to cart page in ideal case');
    if (currentRequestParameterMap.provider.stringValue === 'saiframe') {
        return {
            nextStep: CybersourceConstants.SA_GOTO,
            location: URLUtils.https('Cart-Show', 'saerror', 'true'),
            render: 'secureacceptance/saredirect'
        };
    }
    return {
        nextStep: CybersourceConstants.SA_GOTO,
        location: URLUtils.https('Cart-Show', 'saerror', 'true'),
        render: 'secureacceptance/saredirect'
    };
}

function SARedirectResponse(responseObject, order) {
    var Order = require('dw/order/Order'),
	Transaction = require('dw/system/Transaction'),
	Status = require('dw/system/Status'),
	OrderMgr = require('dw/order/OrderMgr');
	var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
	COHelpers.clearPaymentAttributes();
    switch (responseObject.Decision) {
        case 'ACCEPT':
            if ((order.status.value === Order.ORDER_STATUS_CREATED) && responseObject.ReasonCode === "100") {
                return { nextStep: CybersourceConstants.SA_SUBMITORDER, data: order };
            } else if (order.status.value !== Order.ORDER_STATUS_FAILED) {
                return { nextStep: CybersourceConstants.SA_REVIEWORDER, data: order };
            }
            break;
        case 'REVIEW':
            if (order.status.value === Order.ORDER_STATUS_CREATED) {
                return { nextStep: CybersourceConstants.SA_REVIEWORDER, data: order };
            }
            break;
        case 'ERROR':
        case 'DECLINE':
            var isOrderFailed = false;
            if (order.status.value !== Order.ORDER_STATUS_FAILED) {
                isOrderFailed = Transaction.wrap(function () {
                    OrderMgr.failOrder(order, true);
                    return true;
                });
            }
            if (isOrderFailed) {
                var PlaceOrderError = null;
                var result = secureAcceptanceHelper.HandleDecision(responseObject.ReasonCode);
                if (result.error) {
                    PlaceOrderError = new Status(Status.ERROR, "confirm.error.technical");
                } else {
                    PlaceOrderError = new Status(Status.ERROR, "confirm.error.declined");
                }
                return { nextStep: CybersourceConstants.SA_SUMMARY, data: PlaceOrderError };
            }
            break;
		case 'CANCEL':
    		var currentBasket = COHelpers.reCreateBasket(order);
    		return { nextStep: CybersourceConstants.SA_CANCEL, location : URLUtils.https('Cart-Show')};
    		break;
        default: break;
    }
    return;
}

function SAIframeResponse(responseObject, order) {
    var Order = require('dw/order/Order'),
        Transaction = require('dw/system/Transaction'),
        OrderMgr = require('dw/order/OrderMgr'),
        Status = require('dw/system/Status'),
        orderPlacementStatus = null;
    switch (responseObject.Decision) {
        case 'ACCEPT':
            if ((order.status.value === Order.ORDER_STATUS_CREATED) && responseObject.ReasonCode === "100") {
                orderPlacementStatus = Transaction.wrap(function () {
                    var statusOrder = OrderMgr.placeOrder(order);
                    if (Status.ERROR === statusOrder) {
                        session.custom.SkipTaxCalculation = false;
                        OrderMgr.failOrder(order, true);
                        return false;
                    } else {
                        order.setConfirmationStatus(order.CONFIRMATION_STATUS_CONFIRMED);
                        return true;
                    }
                });
                if (empty(orderPlacementStatus) || Status.ERROR !== orderPlacementStatus) {
                    return {
                        nextStep: CybersourceConstants.SA_GOTO,
                        location: URLUtils.https('COPlaceOrder-Submit', 'provider', 'sasubmit', 'order_id', order.orderNo, 'order_token', order.getOrderToken()),
                        render: 'secureacceptance/saredirect'
                    }
                } else {
                    Logger.error('[SECURE_ACCEPTANCE] SAIframeResponse function Error in order failure even if order got ACCEPT for order ' + orderNo);
                    return {
                        nextStep: CybersourceConstants.SA_GOTO,
                        location: URLUtils.https('COPlaceOrder-Submit', 'provider', 'safail', 'SecureAcceptanceError', 'true', 'order_token', order.getOrderToken()),
                        render: 'secureacceptance/saredirect'
                    };
                }
            } else if (Order.ORDER_STATUS_FAILED !== order.status.value) {
                return {
                    nextStep: CybersourceConstants.SA_GOTO,
                    location: URLUtils.https('COPlaceOrder-Submit', 'provider', 'saconfirm','order_id', order.orderNo, 'order_token', order.getOrderToken()),
                    render: 'secureacceptance/saredirect'
                };
            }
            break;
        case 'REVIEW':
            if (order.status.value === Order.ORDER_STATUS_CREATED) {
                return {
                    nextStep: CybersourceConstants.SA_GOTO,
                    location: URLUtils.https('COPlaceOrder-Submit', 'provider', 'saconfirm', 'order_token', order.getOrderToken()),
                    render: 'secureacceptance/saredirect'
                };
            }
            break;
        case 'CANCEL':
        case 'ERROR':
        case 'DECLINE':
            var isOrderFailed = false;
            if (order.status.value !== Order.ORDER_STATUS_FAILED) {
                isOrderFailed = Transaction.wrap(function () {
                    OrderMgr.failOrder(order, true);
                    return true;
                });
            }
            if (isOrderFailed) {
                var PlaceOrderError = null;
                var result = secureAcceptanceHelper.HandleDecision(responseObject.ReasonCode);
                if (result.error) {
                    PlaceOrderError = new Status(Status.ERROR, "confirm.error.technical");
                }
                if (empty(PlaceOrderError)) {
                    return {
                        nextStep: CybersourceConstants.SA_GOTO,
                        location: URLUtils.https('COPlaceOrder-Submit', 'provider', 'safail', 'order_token', order.getOrderToken()),
                        render: 'secureacceptance/saredirect'
                    };
                } else {
                    return {
                        nextStep: CybersourceConstants.SA_GOTO,
                        location: URLUtils.https('COPlaceOrder-Submit', 'provider', 'safail', 'SecureAcceptanceError', 'true', 'order_token', order.getOrderToken()),
                        render: 'secureacceptance/saredirect'
                    };
                }
            }
            break;
        default: break;
    }
    return;
}


/**
 * Handle Secure Acceptance Redirect and IFrame response, authenticate signature,
 * update payment Instrument with card information and updates billing/shipping in order object, if override value is true.
 */

function SAHandleResponse(httpParameterMap) {

    var secretKey = null;
    var paymentInstrument = null;
    var paymentMethod = null;

    if (!empty(httpParameterMap)) {
        var OrderMgr = require('dw/order/OrderMgr');
        var orderNo = httpParameterMap.req_reference_number.stringValue;
        var order = OrderMgr.getOrder(orderNo);
        var saResponse, responseObject;
        paymentInstrument = secureAcceptanceHelper.GetPaymemtInstument(order);
        if (null !== order && !empty(paymentInstrument)) {
            paymentMethod = paymentInstrument.paymentMethod;
            saResponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument, null, httpParameterMap, null);
            if (saResponse.success && saResponse.signatureAuthorize) {
                var customerObj = (!empty(customer) && customer.authenticated) ? customer : null;
                return updateSAResponse(request.httpParameterMap, order, paymentInstrument, customerObj);
            }
        }
    }
    return { error: true };
}

/**
* Function to update the order and payment instrument and customer save card updates based on SA response
*/
function updateSAResponse(responseParameterMap, order, paymentInstrument, customerObj) {
    var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
    var isOverrideShipping = dw.system.Site.getCurrent().getCustomPreferenceValue("CsSAOverrideShippingAddress");
    var isOverrideBilling = dw.system.Site.getCurrent().getCustomPreferenceValue("CsSAOverrideBillingAddress");
    var responseObject = secureAcceptanceHelper.mapSecureAcceptanceResponse(responseParameterMap);
    if (order.status.value === dw.order.Order.ORDER_STATUS_CREATED) {
        PaymentInstrumentUtils.UpdatePaymentTransactionSecureAcceptanceAuthorize(order, responseObject);
    }
    if (((responseObject.Decision == "ACCEPT") || (responseObject.Decision == "REVIEW")) && (order.status.value === dw.order.Order.ORDER_STATUS_CREATED)) {
        PaymentInstrumentUtils.UpdateOrderBillingShippingDetails(order, responseObject, isOverrideShipping, isOverrideBilling);
        var subsToken = !empty(responseParameterMap.payment_token.stringValue) ? responseParameterMap.payment_token.stringValue : responseParameterMap.req_payment_token.stringValue;
        PaymentInstrumentUtils.updatePaymentInstumenSACard(paymentInstrument, responseParameterMap.req_card_expiry_date.stringValue,
            responseParameterMap.req_card_number.stringValue, responseParameterMap.req_card_type.stringValue, subsToken,
            responseParameterMap.req_bill_to_forename.stringValue, responseParameterMap.req_bill_to_surname.stringValue);
        secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customerObj);
    }
    return { success: true, responseObject: responseObject };
}

function SilentPostResponse() {
    var URLUtils = require('dw/web/URLUtils');
    var httpParameterMap = request.httpParameterMap;
    if ((httpParameterMap !== null) && (!empty(httpParameterMap.decision.stringValue))) {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(httpParameterMap.req_reference_number.stringValue);
        var paymentInstrument = secureAcceptanceHelper.GetPaymemtInstument(order);
        var silentPostResponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument, null, httpParameterMap, null);
        if (silentPostResponse.success && silentPostResponse.signatureAuthorize) {
            session.forms.billing.paymentMethod.value = CybersourceConstants.METHOD_CREDIT_CARD;
            if ((('ACCEPT'.equals(httpParameterMap.decision.stringValue) && (httpParameterMap.reason_code.intValue === 100)))) {
                var Transaction = require('dw/system/Transaction');
                if (session.forms.billing.creditCardFields.saveCard.value) {
                    Transaction.wrap(function () {
                        paymentInstrument.custom.savecard = true;
                    });
                }
                var paymentToken = !empty(httpParameterMap.payment_token.stringValue) ? httpParameterMap.payment_token.stringValue : httpParameterMap.req_payment_token.stringValue;
                if (empty(paymentInstrument.creditCardToken)) {
	                Transaction.wrap(function () {
	                	 paymentInstrument.setCreditCardToken(paymentToken);
	                });
                }
                var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
                Transaction.wrap(function () {
                    PaymentInstrumentUtils.updatePaymentInstumenSACard(paymentInstrument, httpParameterMap.req_card_expiry_date.stringValue,
                        httpParameterMap.req_card_number.stringValue, httpParameterMap.req_card_type.stringValue, paymentToken,
                        httpParameterMap.req_bill_to_forename.stringValue, httpParameterMap.req_bill_to_surname.stringValue);
                });

				//Payer Auth 3DS updates
				session.privacy.orderId = order.orderNo;
				return URLUtils.https('CheckoutServices-InitPayerAuth');
            } else {
                return URLUtils.https('Checkout-Begin', 'stage', 'placeOrder' , 'SecureAcceptanceError', 'true' );
            }
        }
    } else {
        return URLUtils.https('Cart-Show', 'SecureAcceptanceError' , 'true');
    }
}

/** Exported functions **/
module.exports = {
    HandleRequest: HandleRequest,
    OpenIframe: OpenIframe,
    Authorize: Authorize,
    SAResponse: SAResponse,
    SilentPostResponse: SilentPostResponse
};