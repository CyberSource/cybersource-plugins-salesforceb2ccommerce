/* eslint-disable */
'use strict';

var Logger = dw.system.Logger.getLogger('Cybersource');
var Site = require('dw/system/Site');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

var CSServices = require('*/cartridge/scripts/init/SoapServiceInit');
var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');

var CybersourceHelper = libCybersource.getCybersourceHelper();
var csReference = new CybersourceHelper.getcsReference();

/**
 * Capture all theinformation relate dto paypal payment method.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */
function payPalSerivceInterface(request) {
    var serviceResponse = null;
    // setting response in response object
    try {
        // Load the service configuration
        var service = CSServices.CyberSourceTransactionService;

        var paymentMethod = session.forms.billing.paymentMethod.value;
        // getting merchant id and key for specific payment method
        var requestWrapper = {};
        request.merchantID = CybersourceHelper.getMerchantID();
        requestWrapper.request = request;
        // call the service based on input
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[PayPalFacade.js] Error in ServiceInterface ( {0} )', e.message);
        return null;
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[libCybersource.js] Error in ServiceInterface: null response');
        return null;
    }
    serviceResponse = serviceResponse.object;

    //  Set decision manager decision for later use by fraud hook.
    var dmEnabledForPP = Site.current.getCustomPreferenceValue('isDecisionManagerEnable');
    if (dmEnabledForPP && !empty(serviceResponse) && !empty(serviceResponse.decision)) {
        session.privacy.CybersourceFraudDecision = serviceResponse.decision;
    }

    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    CommonHelper.LogResponse(serviceResponse.merchantReferenceCode, serviceResponse.requestID, serviceResponse.requestToken, Number(serviceResponse.reasonCode), serviceResponse.decision);

    return serviceResponse;
}

function createBasicRequest(typeofService, request, lineItemCntr) {
    var commonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var purchase;
    var billTo;
    var shipTo;
    var itemList;
    purchase = commonHelper.GetPurchaseTotalPayPal(lineItemCntr);
    request.purchaseTotals = libCybersource.copyPurchaseTotals(purchase);
    if (lineItemCntr.getGiftCertificatePaymentInstruments().size() === 0) {
        itemList = commonHelper.GetItemObject(typeofService, lineItemCntr);
    }
    var items = [];
    if (!empty(itemList)) {
        itemList.forEach(function (item) {
            items.push(libCybersource.copyItemFrom(item));
        });
    }
    request.item = items;
    if (lineItemCntr.defaultShipment.shippingAddress !== null) {
        billTo = commonHelper.CreateCyberSourceBillToObject(lineItemCntr, true).billTo;
        shipTo = commonHelper.CreateCybersourceShipToObject(lineItemCntr).shipTo;
        if (billTo !== null && shipTo !== null) {
            request.billTo = libCybersource.copyBillTo(billTo);
            request.shipTo = libCybersource.copyShipTo(shipTo);
        }
    }
    Logger.error('Req object: ' + request.purchaseTotals);
}

/** ***************************************************************************
     * Name: addFundingSource
     * Description: Adds the funding source.The value is based on site preference
     * param : request
*************************************************************************** */
function addFundingSource(request) {
    var ap = new csReference.AP();
    ap.fundingSource = require('dw/system/Site').getCurrent().getCustomPreferenceValue('CsFundingSource');
    request.ap = ap;
}

function addBillingAgreementIndicator(request) {
    request.ap.billingAgreementIndicator = true;
}

/** ***************************************************************************
     * Name: sessionService
     * Description: Creates request for Cybersource Session Service .
     * param : Request stub, lineitemcontainer
     *************************************************************************** */
function sessionService(lineItemCntr, args) {
    var request = new csReference.RequestMessage();
    createBasicRequest('sessionService', request, lineItemCntr);
    libCybersource.setClientData(request, lineItemCntr.UUID);
    var sessionSvc = new csReference.APSessionsService();
    addFundingSource(request);
    if (args.billingAgreementFlag) {
        addBillingAgreementIndicator(request);
    }
    if (args.payPalCreditFlag) {
        // If User has agredd to make payment using PayPal Credit feature
        sessionSvc.paymentOptionID = 'Credit';
        session.forms.billing.paymentMethod.value = CybersourceConstants.METHOD_PAYPAL_CREDIT;
    } else {
        session.forms.billing.paymentMethod.value = CybersourceConstants.METHOD_PAYPAL;
    }
    sessionSvc.run = true;
    request.apPaymentType = 'PPL';
    request.apSessionsService = sessionSvc;
    return payPalSerivceInterface(request);
}

function addBillingAgreementId(request, lineItemCntr) {
    // eslint-disable-next-line
    var collections = require('*/cartridge/scripts/util/collections');
    var isPayPalCredit = false;
    var isBillingAgreement = false;
    var paymentInstruments = lineItemCntr.paymentInstruments;
    // Iterate on All Payment Instruments and check if PayPal Credit Payment Method was used
    // eslint-disable-next-line
    collections.forEach(paymentInstruments, function (paymentInstrument) {
        /*
         * Check if payment method used is PayPal Credit
         * If it is PayPal Credit then Billing Agreement Flag needs to be set as false
        */
        if (paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL_CREDIT)) {
            isPayPalCredit = true;
        }
    });

    // checking if customer is authenticated
    if ((!isPayPalCredit || require('dw/system/Site').getCurrent().getCustomPreferenceValue('payPalBillingAgreements')) && customer.authenticated){  
    /*
    * If Billing Agreement is not null then add it to service request instead of the
    * session request ID
    */
        if (!empty(customer.profile.custom.billingAgreementID)) {
            if (request.ap == null) {
                var ap = new CybersourceHelper.getcsReference().AP();
                ap.billingAgreementID = customer.profile.custom.billingAgreementID;
                request.ap = ap;
            } else {
                request.ap.billingAgreementID = customer.profile.custom.billingAgreementID;
            }
            isBillingAgreement = true;
            var Transaction = require('dw/system/Transaction');
            collections.forEach(paymentInstruments, function (pi) {
                var paymentInstrument = pi;
                // for each(var paymentInstrument in paymentInstruments ){
                if (paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL)) {
                    Transaction.wrap(function () {
                        paymentInstrument.paymentTransaction.custom.billingAgreementID = customer.profile.custom.billingAgreementID;
                    });
                }
            });
        }
    }
    return isBillingAgreement;
}

/** ***************************************************************************
     * Name: addDecisionManager
     * Description: Adds the decision manager.The value is based on site preference
     * param : request
*************************************************************************** */
function addDecisionManager(request) {
    request.decisionManager = new csReference.DecisionManager();
    request.decisionManager.enabled = require('dw/system/Site').getCurrent().getCustomPreferenceValue('isDecisionManagerEnable');
    // CybersourceHelper.apDecisionManagerService(, request);
}
/** ***************************************************************************
     * Name: checkStatusService
     * Description: Returns Returns customer information.Returns the billing agreement details
     * if you initiated the creation of a billing agreement
     * param : request, orderNo , requestID, alipayPaymentType
*************************************************************************** */
function checkStatusService(lineItemCntr, requestId) {
    // create request stub for check status service
    var request = new csReference.RequestMessage();
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');

    request.merchantID = CybersourceHelper.getMerchantID();
    libCybersource.setClientData(request, lineItemCntr.UUID);
    request.apPaymentType = 'PPL';

    var apCheckStatusService = new CybersourceHelper.getcsReference().APCheckStatusService();
    var isBillingAgreement = false;
    if (!addBillingAgreementId(request, lineItemCntr)) {
        apCheckStatusService.checkStatusRequestID = requestId;
    } else {
        isBillingAgreement = true;
    }
    request.apCheckStatusService = apCheckStatusService;
    request.apCheckStatusService.run = true;
    var result = {};
    result.checkStatusResponse = payPalSerivceInterface(request);
    result.isBillingAgreement = isBillingAgreement;
    var encodedObj = CommonHelper.createEncodeObject(result);
    var translatedObject = CommonHelper.decodeObj(encodedObj);
    result = CommonHelper.updatePaypalAddressFields(result, translatedObject);
    return result;
}

/** ***************************************************************************
     * Name: OrderService
     * Description: Initiate the order at CyberSource.
     * param : Request stub ,order object and Payment type
*************************************************************************** */
function orderService(lineItemCntr, paymentInstrument) {
    // create request stub for order service
    var serviceRequest = new csReference.RequestMessage(); var sessionRequestID;
    createBasicRequest('orderService', serviceRequest, lineItemCntr);
    libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo);
    serviceRequest.apPaymentType = 'PPL';

    var ap = new CybersourceHelper.getcsReference().AP();
    // Set the payerID
    ap.payerID = paymentInstrument.paymentTransaction.custom.payerID;
    serviceRequest.ap = ap;
    sessionRequestID = paymentInstrument.paymentTransaction.custom.requestId;

    var apOrderService = new CybersourceHelper.getcsReference().APOrderService();
    // set the request ID
    apOrderService.sessionsRequestID = sessionRequestID;
    serviceRequest.apOrderService = apOrderService;
    serviceRequest.apOrderService.run = true;
    return payPalSerivceInterface(serviceRequest);
}

/** ***************************************************************************
     * Name: AuthorizeService
     * Description: Initiate the authorization service at CyberSource for PayPal custom order.
     * param : Request stub ,order object and Payment type
     *************************************************************************** */
function authorizeService(lineItemCntr, paymentInstrument) {
    // create request stub for sale service
    var serviceRequest = new csReference.RequestMessage();
    createBasicRequest('authorizeService', serviceRequest, lineItemCntr);    
    CybersourceHelper.apDecisionManagerService(paymentInstrument.paymentMethod, serviceRequest);
    if (serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()) {
        libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo, libCybersource.replaceCharsInSessionID(session.sessionID));
    } else {
        libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo);
    }
    addFundingSource(serviceRequest);
    serviceRequest.apPaymentType = 'PPL';
    var apAuthService = new CybersourceHelper.getcsReference().APAuthService();
    // set the request ID
    apAuthService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
    serviceRequest.apAuthService = apAuthService;
    serviceRequest.apAuthService.run = true;
    return payPalSerivceInterface(serviceRequest);
}

/** ***************************************************************************
     * Name: SaleService
     * Description: Initiate the order at CyberSource for Paypal standard order.
     * param : Request stub ,order object and Payment type
     *************************************************************************** */
function saleService(lineItemCntr, paymentInstrument) {
    // create request stub for sale service
    var serviceRequest = new csReference.RequestMessage();
    createBasicRequest('saleService', serviceRequest, lineItemCntr);
    addDecisionManager(serviceRequest);
    if (serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()) {
        libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo, libCybersource.replaceCharsInSessionID(session.sessionID));
    } else {
        libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo);
    }
    var apSaleService = new CybersourceHelper.getcsReference().APSaleService();
    addFundingSource(serviceRequest);
    if (!addBillingAgreementId(serviceRequest, lineItemCntr)) {
        apSaleService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
    }
    serviceRequest.apSaleService = apSaleService;
    serviceRequest.apPaymentType = 'PPL';
    serviceRequest.apSaleService.run = true;
    return payPalSerivceInterface(serviceRequest);
}

/** ***************************************************************************
     * Name: RefundService
     * Description: Initiate refund CyberSource for Paypal order.
     * param : Request stub ,order object and Payment type
*************************************************************************** */
function PayPalRefundService(requestID, merchantRefCode, paymentType, amount, currency) {
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');

    var serviceRequest = new csReference.RequestMessage();

    var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount);
    purchaseObject = purchaseObject.purchaseTotals;
    serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);

    libCybersource.setClientData(serviceRequest, merchantRefCode);
    CybersourceHelper.payPalRefundService(serviceRequest, merchantRefCode, requestID, paymentType);

    //  Provide ability to customize request object with a hook.
    var HookMgr = require('dw/system/HookMgr');
    if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
        var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Credit', serviceRequest);
        if (!empty(modifiedServiceRequest)) {
            serviceRequest = modifiedServiceRequest;
        }
    }

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var requestWrapper = {};
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        // var err = e;
        Logger.error('[PayPalFacade.js] Error in PayPalRefundService request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[PayPalFacade.js] response in PayPalRefundService response ( {0} )', serviceResponse);
        return { error: true, errorMsg: 'empty or error in PayPalRefundService response: ' + serviceResponse };
    }
    serviceResponse = serviceResponse.object;
    return serviceResponse;
}

/**
 * CC Credit call is made to cybersource and response is sent back.
 * @param requestID : Capture request ID, which is same as that of CC Authorize service
 * @param merchantRefCode : Cybersource Merchant Reference Code
 * @param paymentType : Payment Type for Credit
 * @param purchaseTotal : Order total for current request
 * @param currency :
 */
function PayPalReversalService(requestID, merchantRefCode, paymentType, purchaseTotal, currency) {
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var serviceRequest = new csReference.RequestMessage();

    var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, purchaseTotal);
    purchaseObject = purchaseObject.purchaseTotals;
    serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);
    libCybersource.setClientData(serviceRequest, merchantRefCode);
    CybersourceHelper.payPalAuthReversalService(serviceRequest, merchantRefCode, requestID, paymentType);

    //  Provide ability to customize request object with a hook.
    var HookMgr = require('dw/system/HookMgr');
    if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
        var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Credit', serviceRequest);
        if (!empty(modifiedServiceRequest)) {
            serviceRequest = modifiedServiceRequest;
        }
    }

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var requestWrapper = {};
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[PayPalFacade.js] Error in PayPalReversalService request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[PayPalFacade.js] response in PayPalReversalService response ( {0} )', serviceResponse);
        return { error: true, errorMsg: 'empty or error in PayPalReversalService response: ' + serviceResponse };
    }
    serviceResponse = serviceResponse.object;
    return serviceResponse;
}

/**
 * Credit Card Capture call is made to cybersource and response is sent back.
 * @param requestID : Capture request ID, which is same as that of CC Authorize service
 * @param merchantRefCode : Cybersource Merchant Reference Code
 * @param paymentType : Payment Type for Capture
 * @param purchaseTotal : Order total for current request
 * @param currency :
 */

function PayPalCaptureService(requestID, merchantRefCode, paymentType, purchaseTotal, currency) {
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var serviceRequest = new csReference.RequestMessage();

    var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, purchaseTotal);
    purchaseObject = purchaseObject.purchaseTotals;
    serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);

    libCybersource.setClientData(serviceRequest, merchantRefCode);
    CybersourceHelper.payPalCaptureService(serviceRequest, merchantRefCode, requestID, paymentType);

    //  Provide ability to customize request object with a hook.
    var HookMgr = require('dw/system/HookMgr');
    if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
        var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Capture', serviceRequest);
        if (!empty(modifiedServiceRequest)) {
            serviceRequest = modifiedServiceRequest;
        }
    }

    var serviceResponse = null;
    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var requestWrapper = {};
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[PayPalFacade.js] Error in PayPalCaptureService request ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    if (empty(serviceResponse) || serviceResponse.status !== 'OK') {
        Logger.error('[PayPalFacade.js] response in PayPalCaptureService response ( {0} )', serviceResponse);
        return { error: true, errorMsg: 'empty or error in PayPalCaptureService response: ' + serviceResponse };
    }
    serviceResponse = serviceResponse.object;
    return serviceResponse;
}

/** ***************************************************************************
 *Name : BillngAggrementService
 *Description this method will create the request and submit the request for billing agreement
 *Param :
 **************************************************************************** */
function billagreementService(requestId, orderRef) {
    var serviceRequest = new csReference.RequestMessage();
    serviceRequest.merchantID = CybersourceHelper.getMerchantID();
    libCybersource.setClientData(serviceRequest, orderRef);
    serviceRequest.apPaymentType = 'PPL';
    var apBillingAgreementService = new CybersourceHelper.getcsReference().APBillingAgreementService();
    apBillingAgreementService.sessionsRequestID = requestId;
    serviceRequest.apBillingAgreementService = apBillingAgreementService;
    serviceRequest.apBillingAgreementService.run = true;
    return payPalSerivceInterface(serviceRequest);
}

module.exports = {
    SessionService: sessionService,
    CheckStatusService: checkStatusService,
    OrderService: orderService,
    AuthorizeService: authorizeService,
    SaleService: saleService,
    BillingAgreement: billagreementService,
    PayPalRefundService: PayPalRefundService,
    PayPalReversalService: PayPalReversalService,
    PayPalCaptureService: PayPalCaptureService
};
