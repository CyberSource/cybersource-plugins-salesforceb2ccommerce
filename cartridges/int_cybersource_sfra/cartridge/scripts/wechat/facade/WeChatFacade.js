'use strict';

/**
 * Description of the module and the logic it provides
 *
 * @module cartridge/scripts/wechat/facade/WeChatFacade
 * @param {Object} request Request Object
 * @returns {Object} serviceResponse
 */
function WeChatServiceInterface(request) {
    // calling the service by passing klarna request
    var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
    var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
    var serviceResponse = commonFacade.CallCYBService(CybersourceConstants.WECHAT_PAYMENT_METHOD, request);
    // return response object
    return serviceResponse;
}

/**
 * Description of the module and the logic it provides
 *
 * @param {Object} sessionObject Session Object
 * @returns {Object} response
 */
function WeChatSaleService(sessionObject) {
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    // declare soap reference variable
    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    // create reference of request object
    var request = new csReference.RequestMessage();
    // declare helper variable
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    // set the merchant id
    request.merchantID = CybersourceHelper.getMerchantID();
    // set client data
    libCybersource.setClientData(request, sessionObject.UUID);
    // set purchase total
    request.purchaseTotals = libCybersource.copyPurchaseTotals(sessionObject.purchaseObject);
    // set payment type
    request.apPaymentType = 'WQR';
    // set bill to and ship to objects
    var apSaleService = new CybersourceHelper.csReference.APSaleService();
    if (sessionObject.billTo != null) {
        request.billTo = libCybersource.copyBillTo(sessionObject.billTo);
        request.shipTo = libCybersource.copyShipTo(sessionObject.shipTo);
    }

    // set item object
    var items = [];
    // eslint-disable-next-line
    if (!empty(sessionObject.items)) {
        var iter = sessionObject.items.iterator();
        while (iter.hasNext()) {
            items.push(libCybersource.copyItemFrom(iter.next()));
        }
    }
    request.item = items;

    apSaleService.transactionTimeout = sessionObject.transactionTimeout;
    apSaleService.successURL = sessionObject.successURL;
    request.apSaleService = apSaleService;
    request.apSaleService.run = true;

    // call wechat service to get the response
    var response = WeChatServiceInterface(request);
    // return response
    return response;
}

/**
 * Description of the module and the logic it provides
 *
 * @param {Object} requestId Request ID
 * @param {Object} paymentType Payment Type
 * @param {Object} orderNo Order number
 * @returns {Object} response
 */
function WeChatCheckStatusService(requestId, paymentType, orderNo) {
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    // declare soap reference variable
    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    // create reference of request object
    var request = new csReference.RequestMessage();
    // declare helper variable
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    // set the merchant id
    request.merchantID = CybersourceHelper.getMerchantID();

    libCybersource.setClientData(request, orderNo);

    var testReconciliationID = CybersourceHelper.getTestWeChatReconciliationID() ? CybersourceHelper.getTestWeChatReconciliationID().value : null;
    CybersourceHelper.apCheckStatusService(request, orderNo, requestId, 'WQR', testReconciliationID);
    var response = WeChatServiceInterface(request);
    // eslint-disable-next-line
    session.privacy.CybersourceFraudDecision = response.decision;
    // return response
    return response;
}

module.exports = {
    WeChatSaleService: WeChatSaleService,
    WeChatCheckStatusService: WeChatCheckStatusService
};
