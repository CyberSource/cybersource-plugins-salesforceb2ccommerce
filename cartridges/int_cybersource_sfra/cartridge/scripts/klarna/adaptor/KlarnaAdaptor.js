'use strict';

/**
* This file will contains adapter methods for Cybersource Klarna
* Integration.
*/
/* API includes */
var klarnaFacade = require('~/cartridge/scripts/klarna/facade/KlarnaFacade');
var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
/* Script Modules */

/**
 * Create payment instrument along and check if payment method for klarna
 * to handle the request and call klarna init session service by passing
 * basket object as input
 * @param {*} Basket comment
 * @param {*} isHandleRequired comment
 * @returns {*} obj
 */
function HandleRequest(Basket, isHandleRequired) {
    /* check if payment instrument creation is required in handle request or not.
     * For pipeline handle request is not required but for controller handle
     * request is required
     */
    var callSessionService;
    if (!isHandleRequired) {
        callSessionService = { success: true };
    }
    if (isHandleRequired) {
        // call handle method of helper
        callSessionService = CommonHelper.HandleRequest(Basket);
    }
    // call session service in case of success response
    return callSessionService;
}

/* Common function to update transaction level details */
// eslint-disable-next-line
function ProcessResponse(responseObject, pi, order) {
    var paymentInstrument = pi;
    // update instrument level variables
    paymentInstrument.paymentTransaction.custom.apInitiatePaymentReconciliationID = responseObject.reconciliationID;
    paymentInstrument.paymentTransaction.custom.apPaymentStatus = responseObject.paymentStatus;
}

/**
 * Update Payment Transaction details after sale service of klarna
 * @param {*} order comment
 * @param {*} responseObject comment
 */
function AuthorizeKlarnaOrderUpdate(order, responseObject) {
    // declare transaction
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        // get payment instrument detail
        var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
        // set transaction level object with custom values after getting response of sale service
        if (paymentInstrument != null && responseObject !== null) {
            paymentInstrument.paymentTransaction.transactionID = responseObject.requestID;
            paymentInstrument.paymentTransaction.custom.approvalStatus = Number(responseObject.reasonCode);
            paymentInstrument.paymentTransaction.custom.requestId = responseObject.requestID;
            paymentInstrument.paymentTransaction.custom.requestToken = responseObject.requestToken;
            paymentInstrument.paymentTransaction.custom.apPaymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;

            if (responseObject.apAuthReply !== null) {
                ProcessResponse(responseObject.apAuthReply, paymentInstrument, order);
            }
        }
    });
}

/**
 * This method set the request object along with other inputs to call check status
 * service of Klarna
 * @param {*} Order comment
 * @returns {*} obj
 */
function CheckStatusServiceRequest(Order) {
    // create helper variable
    // var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    // call check status service
    var response = CommonHelper.CheckStatusServiceRequest(Order);
    // return response
    return response;
}

/**
 * This method set the request object along with other inputs to call authorization
 * service of Klarna
 * @param {*} Order commebt
 * @param {*} preApprovalToken comment
 * @returns {*} obj
 */
function AuthorizationServiceRequest(Order, preApprovalToken) {
    // declare variables
    var shipTo; var billTo; var
        purchaseObject;
    // set the payment type of klarna from payment type
    var klarnaPaymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;

    // create billto, shipto, item and purchase total object
    var result = CommonHelper.CreateCyberSourceBillToObject(Order, true);
    billTo = result.billTo;

    // billTo.setLanguage(CommonHelper.GetRequestLocale());

    //  Use Klarna languge set in payment method custom attribute.
    var language = CommonHelper.GetRequestLocale();
    // eslint-disable-next-line
    var paymentMethod = dw.order.PaymentMgr.getPaymentMethod(Order.getPaymentInstruments()[0].paymentMethod);
    // eslint-disable-next-line
    if (!empty(paymentMethod) && paymentMethod.custom !== null && 'klarnaLocale' in paymentMethod.custom) {
        // eslint-disable-next-line
        if (!empty(paymentMethod.custom.klarnaLocale.value)) {
            language = paymentMethod.custom.klarnaLocale.value;
        }
    }
    billTo.setLanguage(language);

    result = CommonHelper.CreateCybersourceShipToObject(Order);
    shipTo = result.shipTo;
    result = CommonHelper.CreateCybersourcePurchaseTotalsObject(Order);
    purchaseObject = result.purchaseTotals;
    result = CommonHelper.CreateKlarnaItemObject(Order);
    var items = result.items;
    // eslint-disable-next-line
    var decisionManagerRequired = dw.system.Site.getCurrent().getCustomPreferenceValue('isKlarnaDecisionManagerRequired');
    // create auth object and set the value of different object
    var authorizationObject = {};
    authorizationObject.billTo = billTo;
    authorizationObject.shipTo = shipTo;
    authorizationObject.purchaseObject = purchaseObject;
    authorizationObject.items = items;
    authorizationObject.klarnaPaymentType = klarnaPaymentType;
    authorizationObject.preApprovalToken = preApprovalToken;
    authorizationObject.orderNo = Order.orderNo;
    authorizationObject.decisionManagerRequired = decisionManagerRequired;
    // set the response after service call invocation
    var authResponse = klarnaFacade.klarnaAuthorizationService(authorizationObject);

    // call method to set order level attribute
    AuthorizeKlarnaOrderUpdate(Order, authResponse);

    // Save decision so fraud handling hook can adjust order status later.
    // eslint-disable-next-line
    session.privacy.CybersourceFraudDecision = authResponse.decision;

    /* return the response as per decision and reason code, redirect the user to
     merchant site for payment completion */
    if ((authResponse.decision === 'ACCEPT' && Number(authResponse.reasonCode) === 100) || (authResponse.decision === 'REVIEW' && Number(authResponse.reasonCode) === 480)) {
        // eslint-disable-next-line
        session.privacy.order_id = Order.orderNo;
        var isRedirectionRequired = true; // dw.system.Site.getCurrent().getCustomPreferenceValue('isKlarnaRedirectionRequired');
        // eslint-disable-next-line
        switch (authResponse.apAuthReply.paymentStatus) {
            case 'authorized':
                if (isRedirectionRequired) {
                    return { redirection: true, redirectionURL: authResponse.apAuthReply.merchantURL };
                }
                return { submit: true };

            case 'pending':
                if (isRedirectionRequired) {
                    return { redirection: true, redirectionURL: authResponse.apAuthReply.merchantURL };
                }
                var checkStatusResponse = CheckStatusServiceRequest(Order);
                return checkStatusResponse;

            case 'failed':
                return { error: true };
        }
    } else if (authResponse.decision === 'REJECT') {
        return { declined: true };
    } else if (authResponse.decision === 'ERROR') {
        return { declined: true };
    } else {
        return { declined: true };
    }
}

/**
 * This method accept the token and pass to Cybersource Klarna
 * authorization service to authorize the request
 * @param {*} orderNo comment
 * @param {*} pi comment
 * @param {*} token comment
 * @returns {*} obj
 */
function AuthorizeRequest(orderNo, pi, token) {
    var paymentInstrument = pi;
    // set the value of processor token session variable as empty
    // eslint-disable-next-line
    session.privacy.processorToken = '';
    // create object of OrderMgr to get the order
    var OrderMgr = require('dw/order/OrderMgr');
    var Order = OrderMgr.getOrder(orderNo);
    var PaymentMgr = require('dw/order/PaymentMgr');
    // get the payment processor and assign its value in payment transaction object
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    // call authorization service and process the response
    var response = AuthorizationServiceRequest(Order, token);

    // eslint-disable-next-line
    session.privacy.SkipTaxCalculation = false;
    // eslint-disable-next-line
    session.privacy.cartStateString = null;

    return response;
}
/*
* This method set the request object along with other inputs to call session
* service of Klarna
*/
/* function CreateInitSessionServiceRequest(Basket) {
    // declare variables
    var signature = CreateKlarnaSecureKey(Basket);
    var shipTo; var billTo; var
        purchaseObject;
    var URLUtils = require('dw/web/URLUtils');
    var cancelURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'cancelfail', 'signature', encodeURIComponent(signature), 'cfk', true).toString();
    var successURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'klarna', 'signature', encodeURIComponent(signature)).toString();
    var failureURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'cancelfail', 'signature', encodeURIComponent(signature), 'cfk', true).toString();
    // setting the value of payment type after getting from common constant
    var klarnaPaymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    // set basket UUID
    var UUID = Basket.UUID;
    // create billto, shipto, item and purchase total object
    var result = CommonHelper.CreateCyberSourceBillToObject(Basket, true);
    billTo = result.billTo;

    // billTo.setLanguage(CommonHelper.GetRequestLocale());

    //  Use Klarna languge set in payment method custom attribute.
    var language = CommonHelper.GetRequestLocale();
    var paymentMethod = dw.order.PaymentMgr.getPaymentMethod(Basket.getPaymentInstruments()[0].paymentMethod);
    if (!empty(paymentMethod) && paymentMethod.custom !== null && 'klarnaLocale' in paymentMethod.custom) {
        if (!empty(paymentMethod.custom.klarnaLocale.value)) {
            language = paymentMethod.custom.klarnaLocale.value;
        }
    }
    billTo.setLanguage(language);

    result = CommonHelper.CreateCybersourceShipToObject(Basket);
    shipTo = result.shipTo;
    result = CommonHelper.CreateCybersourcePurchaseTotalsObject(Basket);
    purchaseObject = result.purchaseTotals;
    result = CommonHelper.CreateKlarnaItemObject(Basket);
    var items = result.items;
    // create a session object and set the value accordingly
    var sessionObject = {};
    sessionObject.billTo = billTo;
    sessionObject.shipTo = shipTo;
    sessionObject.purchaseObject = purchaseObject;
    sessionObject.items = items;
    sessionObject.klarnaPaymentType = klarnaPaymentType;
    sessionObject.cancelURL = cancelURL;
    sessionObject.successURL = successURL;
    sessionObject.failureURL = failureURL;
    sessionObject.UUID = UUID;

    // call session method of facade to create session request
    var response = klarnaFacade.klarnaInitSessionService(sessionObject);

    // return the response as per decision and reason code
    if (response.decision === 'ACCEPT' && Number(response.reasonCode) === 100) {
        // set the processor token into session variable
        session.privacy.processorToken = response.apSessionsReply.processorToken;
        return { submit: true };
    }
    var Status = require('dw/system/Status');
    return { error: true, KlarnaSessionError: new Status(Status.ERROR, 'confirm.error.declined') };
} */

/* Update Payment Transaction details after check status service of klarna */
/* function KlarnaOrderUpdate(order, responseObject) {
    // declare transaction
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
        // get payment instrument detail
        var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
        // set transaction level object with custom values after getting response of Check status service
        if (paymentInstrument != null && responseObject !== null) {
            paymentInstrument.paymentTransaction.custom.approvalStatus = Number(responseObject.reasonCode);
            paymentInstrument.paymentTransaction.custom.requestToken = responseObject.requestToken;

            if (responseObject.apCheckStatusReply !== null) {
                ProcessResponse(responseObject.apCheckStatusReply, paymentInstrument, order);
            }
        }
    });
} */

/**
 * This method create the signature to be used as a token in  cancel,
 * success and failure URL of init session service to validate the order
 * @param {*} Basket comment
 * @returns {*} obj
 */
function CreateKlarnaSecureKey(Basket) {
    // declare variables to create signature
    // eslint-disable-next-line
    var sessionId = session.sessionID;
    var paymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    var merchantId = CybersourceHelper.getMerchantID();
    var merchantKey = CybersourceHelper.getSoapSecurityKey();
    var amount = Basket.totalGrossPrice.value;
    var token = sessionId + paymentType + merchantId + amount;
    // call method of common helper to create a signature
    var signature = CommonHelper.signedDataUsingHMAC256(token, merchantKey);
    // return the signature
    return signature;
}

/**
 * Retrive order based on session privacy order_id.
 * @param {*} Order comment
 * @returns {*} obj
 */
function GetKlarnaOrder(Order) {
    var order = Order;
    // eslint-disable-next-line
    if (empty(order)) {
        // eslint-disable-next-line
        if (!empty(session.privacy.order_id)) {
            // GetOrder
            var OrderMgr = require('dw/order/OrderMgr');
            // eslint-disable-next-line
            order = OrderMgr.getOrder(session.privacy.order_id);
            // eslint-disable-next-line
            session.privacy.order_id = '';
        }
        var signature = CreateKlarnaSecureKey(order);
        // eslint-disable-next-line
        var netSignature = decodeURIComponent(request.httpParameterMap.signature.stringValue);
        if (order && signature === netSignature) {
            return { success: true, Order: order };
        }
        var Status = require('dw/system/Status');
        return { error: true, PlaceOrderError: new Status(Status.ERROR, 'confirm.error.technical') };
    }
    return { success: true, Order: order };
}

/** Exported functions * */
module.exports = {
    CheckStatusServiceRequest: CheckStatusServiceRequest,
    CreateKlarnaSecureKey: CreateKlarnaSecureKey,
    HandleRequest: HandleRequest,
    AuthorizeRequest: AuthorizeRequest,
    GetKlarnaOrder: GetKlarnaOrder
};