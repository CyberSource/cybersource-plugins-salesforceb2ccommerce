'use strict';

var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var CybersourceHelper = libCybersource.getCybersourceHelper();

/**
 * This script call service to initiate payment for and
* set the response in response object. also handles the logging
* of different error scenarios while making service call.
 * @param {*} paymentMethod paymentMethod
 * @param {*} request request
 * @returns {*} obj
 */
function BankTransferServiceInterface(paymentMethod, request) {
    // calling the service by passing Bank Transfer request
    // eslint-disable-next-line
    var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
    var serviceResponse = commonFacade.CallCYBService(paymentMethod, request);
    // return response object
    return serviceResponse;
}

/**
 * @param {*} saleObject saleObject
 * @param {*} config config
 * @returns {*} obj
 */
function buildRequestObject(saleObject, config) {
    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    // create reference of request object
    var request = new csReference.RequestMessage();

    // set the merchant ID in request
    request.merchantID = CybersourceHelper.getMerchantID();

    // if (empty(config.decision)) {
    libCybersource.setClientData(request, saleObject.orderNo);
    // }

    // set purchase total and payment type
    request.purchaseTotals = libCybersource.copyPurchaseTotals(saleObject.purchaseObject);
    request.apPaymentType = saleObject.paymentType;

    var invoiceHeader = new CybersourceHelper.csReference.InvoiceHeader();
    // eslint-disable-next-line
    if (!empty(saleObject.bicNumber)) {
        var bankInfo = new CybersourceHelper.csReference.BankInfo();
        bankInfo.swiftCode = saleObject.bicNumber;
        request.bankInfo = bankInfo;
    }
    // set billTo object
    // eslint-disable-next-line
    if (saleObject.billTo != null) {
        request.billTo = libCybersource.copyBillTo(saleObject.billTo);
    }
    // set item object
    var items = [];
    // eslint-disable-next-line
    if (!empty(saleObject.items)) {
        var iter = saleObject.items.iterator();
        while (iter.hasNext()) {
            items.push(libCybersource.copyItemFrom(iter.next()));
        }
    }
    request.item = items;
    // set cancel, success and failure URL
    invoiceHeader.merchantDescriptor = saleObject.merchantDescriptor;
    invoiceHeader.merchantDescriptorContact = saleObject.merchantDescriptorContact;
    invoiceHeader.merchantDescriptorStreet = saleObject.merchantDescriptorStreet;
    invoiceHeader.merchantDescriptorCity = saleObject.merchantDescriptorCity;
    invoiceHeader.merchantDescriptorState = saleObject.merchantDescriptorState;
    invoiceHeader.merchantDescriptorPostalCode = saleObject.merchantDescriptorPostalCode;
    invoiceHeader.merchantDescriptorCountry = saleObject.merchantDescriptorCountry;

    request.invoiceHeader = invoiceHeader;

    // eslint-disable-next-line
    if (empty(config.decision)) {
        CybersourceHelper.apDecisionManagerService(config.paymentMethod, request);
    } else {
        request.decisionManager = new CybersourceHelper.csReference.DecisionManager();
        request.decisionManager.enabled = CybersourceHelper.getBankTransferDecisionManagerFlag();
    }

    return request;
}

/**
 * This function is creating the request for bank transfer sale service
* by getting saleObject and request reference as input
 * @param {*} saleObject salesObject
 * @param {*} paymentMethod contains testMethod or the current paymentMethod ID
 * @returns {*} obj
 */
function BankTransferSaleService(saleObject, paymentMethod) {
    var config = {};
    config.paymentMethod = paymentMethod;

    // Build an object for the DM Standalon (AFSService) call
    var request = buildRequestObject(saleObject, config);
    // Make the AFSService call
    var response = BankTransferServiceInterface(paymentMethod, request);

    // session.privacy.CybersourceFraudDecision = response.decision;
    config.decision = response.decision;

    if (response.decision === 'ACCEPT' || response.decision === 'REVIEW') {
        // Build an object for ApSaleCall
        request = buildRequestObject(saleObject, config);
        CybersourceHelper.postPreAuth(saleObject, request);
        // Make the ApSale call
        return BankTransferServiceInterface(paymentMethod, request);
    }

    return response;
}

/**
 * Initiate refund CyberSource for Banktransfer order.
 * @param {*} requestID requestID
 * @param {*} merchantRefCode merchantRefCode
 * @param {*} paymentType parentType
 * @param {*} amount amount
 * @param {*} currency currency
 * @returns {*} obj
 */
function BanktransferRefundService(requestID, merchantRefCode, paymentType, amount, currency) {
    // eslint-disable-next-line
    var Logger = dw.system.Logger.getLogger('Cybersource');
    var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');
    var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
    // var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    // var CybersourceHelper = libCybersource.getCybersourceHelper();

    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    var serviceRequest = new csReference.RequestMessage();

    var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount);
    purchaseObject = purchaseObject.purchaseTotals;
    serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);

    libCybersource.setClientData(serviceRequest, merchantRefCode);
    CybersourceHelper.banktransferRefundService(serviceRequest, merchantRefCode, requestID, paymentType);

    //  Provide ability to customize request object with a hook.
    var HookMgr = require('dw/system/HookMgr');
    if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
        var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Credit', serviceRequest);
        // eslint-disable-next-line
        if (!empty(modifiedServiceRequest)) {
            serviceRequest = modifiedServiceRequest;
        }
    }

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(CybersourceConstants.BANK_TRANSFER_PAYMENT_METHOD);
        var requestWrapper = {};
        serviceRequest.merchantID = merchantCrdentials.merchantID;
        requestWrapper.request = serviceRequest;
        requestWrapper.merchantCredentials = merchantCrdentials;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[BankTransferFacade.js] Error in BankTransferRefundService request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    // eslint-disable-next-line
    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[BankTransferFacade.js] response in BankTransferFacadeService response ( {0} )', serviceResponse);
        return { error: true, errorMsg: 'empty or error in BankTransferFacadeRefundService response: ' + serviceResponse };
    }
    serviceResponse = serviceResponse.object;
    return serviceResponse;
}

/** Exported functions * */
module.exports = {
    BankTransferSaleService: BankTransferSaleService,
    BanktransferRefundService: BanktransferRefundService
};
