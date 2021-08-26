'use strict';

var Logger = require('dw/system/Logger');
// var dwsvc = require('dw/svc');
var UUIDUtils = require('dw/util/UUIDUtils');
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');

/**
 * This function creates subscription on basis of billto,card object,amount and currency of the order.
 * @param {*} billTo billing address of the order
 * @param {*} card details of the card like name,account number, expiry year and month
 * @param {*} purchaseTotals Object having value of currency and amount.
 * @returns {*} obj
 */
function CreateSubscription(billTo, card, purchaseTotals) {
    var billToObject = billTo;
    var cardObject = card;
    var purchaseObject = purchaseTotals;

    var CybersourceHelper = libCybersource.getCybersourceHelper();
    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();

    CybersourceHelper.addPaySubscriptionCreateService(serviceRequest, billToObject, purchaseObject, cardObject, UUIDUtils.createUUID());

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
        var requestWrapper = {};
        serviceRequest.merchantID = merchantCrdentials.merchantID;
        requestWrapper.request = serviceRequest;
        requestWrapper.merchantCredentials = merchantCrdentials;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[subscriptionFacade.js] Error in subscription request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    // eslint-disable-next-line
    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        return { error: true, errorMsg: 'empty or error in CreateSubscription response: ' + serviceResponse };
    }
    serviceResponse = serviceResponse.object;
    var createSubscriptionResponse = {};

    if (serviceResponse.paySubscriptionCreateReply !== null) {
        createSubscriptionResponse.SubscriptionIDToken = serviceResponse.paySubscriptionCreateReply.subscriptionID;
    }
    createSubscriptionResponse.decision = serviceResponse.decision;
    createSubscriptionResponse.invalidField = serviceResponse.invalidField;
    createSubscriptionResponse.missingField = serviceResponse.missingField;
    createSubscriptionResponse.reasonCode = serviceResponse.reasonCode;
    createSubscriptionResponse.requestID = serviceResponse.requestID;
    createSubscriptionResponse.requestToken = serviceResponse.requestToken;
    return { success: true, serviceResponse: createSubscriptionResponse };
}

/**
 * This function deletes the  subscription on basis of its ID.
 * @param {*} subscriptionID unique value of the subscription.
 * @returns {*} obj
 */
function DeleteSubscription(subscriptionID) {
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();

    CybersourceHelper.addPaySubscriptionDeleteService(serviceRequest, UUIDUtils.createUUID(), subscriptionID);

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
        var requestWrapper = {};
        serviceRequest.merchantID = merchantCrdentials.merchantID;
        requestWrapper.request = serviceRequest;
        requestWrapper.merchantCredentials = merchantCrdentials;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[libCybersource.js] Error in subscription request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    // eslint-disable-next-line
    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        return { error: true };
    }
    serviceResponse = serviceResponse.object;
    var deleteSubscriptionResponse = {};
    deleteSubscriptionResponse.decision = serviceResponse.decision;
    deleteSubscriptionResponse.invalidField = serviceResponse.invalidField;
    deleteSubscriptionResponse.missingField = serviceResponse.missingField;
    deleteSubscriptionResponse.reasonCode = serviceResponse.reasonCode;
    deleteSubscriptionResponse.requestID = serviceResponse.requestID;
    deleteSubscriptionResponse.requestToken = serviceResponse.requestToken;
    return { success: true, serviceResponse: deleteSubscriptionResponse };
}

/**
 * This function updates the  subscription on basis of subscription Id with updated values of billto,card object,amount and currency of the order.
 * @param {*} billTo billing address of the order
 * @param {*} card details of the card like name,account number, expiry year and month
 * @param {*} purchaseTotals Object having value of currency and amount.
 * @param {*} storedSubscriptionID unique value of the subscription.
 * @returns {*} obj
 */
function UpdateSubscription(billTo, card, purchaseTotals, storedSubscriptionID) {
    var billToObject = billTo;
    var cardObject = card;
    var purchaseObject = purchaseTotals;
    // var storedSubscriptionID = storedSubscriptionID;

    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var subscriptionObject = {};

    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();

    CybersourceHelper.addSubscriptionUpdateInfo(serviceRequest, billToObject, purchaseObject, cardObject, storedSubscriptionID);

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
        var requestWrapper = {};
        serviceRequest.merchantID = merchantCrdentials.merchantID;
        requestWrapper.request = serviceRequest;
        requestWrapper.merchantCredentials = merchantCrdentials;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[UpdateSubscription.js] Error in Service Call', e.message);
        return { error: true, errorMsg: e.message };
    }

    // eslint-disable-next-line
    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[UpdateSubscription.js] response is null');
        return { error: true };
    }

    serviceResponse = serviceResponse.object;
    subscriptionObject.decision = serviceResponse.decision;
    subscriptionObject.invalidField = serviceResponse.invalidField;
    subscriptionObject.missingField = serviceResponse.missingField;
    subscriptionObject.reasonCode = serviceResponse.reasonCode;
    subscriptionObject.requestID = serviceResponse.requestID;
    subscriptionObject.requestToken = serviceResponse.requestToken;
    if (serviceResponse.paySubscriptionUpdateReply !== null) {
        subscriptionObject.NewSubscriptionID = serviceResponse.paySubscriptionUpdateReply.subscriptionID;
    }

    Logger.info('[UpdateSubscriptionID.js] Leaving');
    return { success: true, response: subscriptionObject };
}

/**
 * This function fetches details of the particular subscription on basis of its ID.
 * @param {*} subscriptionID unique value of the subscription.
 * @returns {*} obj
 */
function ViewSubscription(subscriptionID) {
    var subscriptionObject = {};
    var CybersourceHelper = libCybersource.getCybersourceHelper();

    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();

    CybersourceHelper.addPaySubscriptionRetrieveService(serviceRequest, UUIDUtils.createUUID(), subscriptionID);

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_CREDIT_CARD);
        var requestWrapper = {};
        serviceRequest.merchantID = merchantCrdentials.merchantID;
        requestWrapper.request = serviceRequest;
        requestWrapper.merchantCredentials = merchantCrdentials;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[libCybersource.js] Error in subscription request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    // eslint-disable-next-line
    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        return { error: true };
    }

    serviceResponse = serviceResponse.object;
    if (serviceResponse.paySubscriptionRetrieveReply !== null) {
        subscriptionObject.response = serviceResponse.paySubscriptionRetrieveReply;
    }
    subscriptionObject.decision = serviceResponse.decision;
    subscriptionObject.invalidField = serviceResponse.invalidField;
    subscriptionObject.missingField = serviceResponse.missingField;
    subscriptionObject.reasonCode = serviceResponse.reasonCode;
    subscriptionObject.requestID = serviceResponse.requestID;
    subscriptionObject.requestToken = serviceResponse.requestToken;

    return { success: true, response: subscriptionObject };
}

module.exports = {
    CreateSubscription: CreateSubscription,
    DeleteSubscription: DeleteSubscription,
    UpdateSubscription: UpdateSubscription,
    ViewSubscription: ViewSubscription
};
