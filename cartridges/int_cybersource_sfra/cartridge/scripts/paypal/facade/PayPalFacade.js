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
 * Helper to check if PayPal V2 is enabled
 */
function isPayPalV2() {
    return Site.getCurrent().getCustomPreferenceValue('CsEnablePayPalV2');
}

/**
 * V2: Strip leading zeros from grandTotalAmount.
 * CommonHelper formats amounts as '000000.00' which PayPal V2 rejects.
 * Currency-aware: uses correct fraction digits for formatting.
 * @param {Object} purchaseTotals - WSDL PurchaseTotals object (mutated in place)
 * @param {String} currency - Currency code (e.g. 'USD', 'JPY')
 */
function stripLeadingZerosV2(purchaseTotals, currency) {
    if (!isPayPalV2() || !purchaseTotals || !purchaseTotals.grandTotalAmount) return;
    var CurrencyUtil = require('dw/util/Currency');
    var currencyObj = CurrencyUtil.getCurrency(currency || 'USD');
    var fractionDigits = currencyObj ? currencyObj.getDefaultFractionDigits() : 2;
    purchaseTotals.grandTotalAmount = parseFloat(purchaseTotals.grandTotalAmount).toFixed(fractionDigits);
    if (purchaseTotals.taxAmount) {
        purchaseTotals.taxAmount = parseFloat(purchaseTotals.taxAmount).toFixed(fractionDigits);
    }
}

/**
 * Copy shipTo object with only V2 required fields per spec:
 * firstName, lastName, street1, street2, city, country, postalCode, state
 * @param {Object} shipTo - The shipTo object from CommonHelper
 * @returns {Object} - WSDL ShipTo object with only required fields
 */
function copyShipToV2(shipTo) {
    var requestShipTo = new csReference.ShipTo();
    var v2RequiredFields = ['street1', 'street2', 'city', 'state', 'postalCode', 'country'];

    if (!empty(shipTo)) {
        v2RequiredFields.forEach(function (fieldName) {
            var value = shipTo[fieldName];
            if (value !== null && value !== undefined && !empty(value)) {
                requestShipTo[fieldName] = value;
            } else {
                requestShipTo[fieldName] = '';
            }
        });
    } else {
        Logger.error('[PayPalFacade] shipTo object is empty/null');
    }
    return requestShipTo;
}

/**
 * Copy billTo object with only V2 required fields per spec:
 * email, language
 * @param {Object} billTo - The billTo object from CommonHelper
 * @returns {Object} - WSDL BillTo object with only required fields
 */
function copyBillToV2(billTo) {
    var requestBillTo = new csReference.BillTo();
    var v2RequiredFields = ['email', 'language'];

    if (!empty(billTo)) {
        v2RequiredFields.forEach(function (fieldName) {
            var value = billTo[fieldName];
            if (value !== null && value !== undefined && value !== '') {
                requestBillTo[fieldName] = value;
            } else if (fieldName === 'language') {
                requestBillTo[fieldName] = 'en';
            }
        });
    } else {
        Logger.error('[PayPalFacade] billTo object is empty/null');
    }
    return requestBillTo;
}

/**
 * Copy item object with only V2 required/optional fields per spec.
 * Required: unitPrice, quantity, productName, taxAmount, totalAmount
 * Optional: productDescription, productSKU, typeOfSupply
 *
 * taxAmount is converted from total line item tax to per-unit tax inline.
 * Basket taxes are pre-rounded by TaxHelper.RoundUpBasketTaxesForV2(),
 * so totalTax / qty always produces a clean value within currency precision.
 *
 * @param {Object} item - The item object (taxAmount = total line item tax)
 * @param {Number} fractionDigits - Currency decimal places (e.g. 2 for USD, 0 for JPY)
 * @returns {Object} - WSDL Item object with per-unit taxAmount
 */
function copyItemV2(item, fractionDigits) {
    var requestItem = new csReference.Item();
    var v2AllowedFields = ['unitPrice', 'quantity', 'productName', 'taxAmount', 'totalAmount', 'productDescription', 'productSKU', 'typeOfSupply'];
    if (!empty(item)) {
        if (item.id !== null && item.id !== undefined) {
            requestItem.id = item.id;
        }
        v2AllowedFields.forEach(function (fieldName) {
            var value = item[fieldName];
            if (value !== '' && value !== null && value !== undefined) {
                requestItem[fieldName] = value;
            }
        });

        // Convert taxAmount from total to per-unit
        var qty = parseInt(item.quantity, 10) || 1;
        if (qty > 1 && requestItem.taxAmount) {
            var multiplier = Math.pow(10, fractionDigits);
            var totalTaxUnits = Math.round(parseFloat(requestItem.taxAmount) * multiplier);
            var perUnit = Math.floor(totalTaxUnits / qty);
            requestItem.taxAmount = (perUnit / multiplier).toFixed(fractionDigits);
        } else if (requestItem.taxAmount) {
            requestItem.taxAmount = parseFloat(requestItem.taxAmount).toFixed(fractionDigits);
        }
    }
    return requestItem;
}

/**
 * Copy purchaseTotals with only V2 required fields per spec.
 * Required: currency, grandTotalAmount, taxAmount
 * @param {Object} purchase - The purchase totals object
 * @returns {Object} - WSDL PurchaseTotals object with only required fields
 */
function copyPurchaseTotalsV2(purchase) {
    var requestPurchaseTotals = new csReference.PurchaseTotals();
    var v2RequiredFields = ['currency', 'grandTotalAmount', 'taxAmount'];

    if (!empty(purchase)) {
        v2RequiredFields.forEach(function (fieldName) {
            var value = purchase[fieldName];
            if (value !== '' && value !== null && value !== undefined) {
                requestPurchaseTotals[fieldName] = value;
            } else {
                Logger.warn('[PayPalFacade] MISSING REQUIRED FIELD: purchaseTotals.{0}', fieldName);
            }
        });
    } else {
        Logger.error('[PayPalFacade] purchase object is empty/null');
    }
    return requestPurchaseTotals;
}

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

function createBasicRequest(typeofService, request, lineItemCntr, args) {
    var commonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var purchase;
    var billTo;
    var shipTo;
    var itemList;
    purchase = commonHelper.GetPurchaseTotalPayPal(lineItemCntr);
    // V2: Only use spec-required purchaseTotals fields
    if (isPayPalV2()) {
        request.purchaseTotals = copyPurchaseTotalsV2(purchase);
    } else {
        request.purchaseTotals = libCybersource.copyPurchaseTotals(purchase);
    }
    if (lineItemCntr.getGiftCertificatePaymentInstruments().size() === 0) {
        itemList = commonHelper.GetItemObject(typeofService, lineItemCntr);
    }
    var items = [];
    var itemIndex = 0;
    // V2: Determine currency fraction digits for per-unit tax formatting
    var fractionDigits = 2;
    if (isPayPalV2()) {
        var CurrencyUtil = require('dw/util/Currency');
        var currencyCode = request.purchaseTotals.currency || session.currency.currencyCode || 'USD';
        var currencyObj = CurrencyUtil.getCurrency(currencyCode);
        fractionDigits = currencyObj ? currencyObj.getDefaultFractionDigits() : 2;
    }
    if (!empty(itemList)) {
        itemList.forEach(function (item) {
            if (isPayPalV2()) {
                // V2: Skip zero-value items (like free shipping)
                if (parseFloat(item.unitPrice) === 0) return;
                item.id = itemIndex++;
                items.push(copyItemV2(item, fractionDigits));
            } else {
                items.push(libCybersource.copyItemFrom(item));
            }
        });
    }
    request.item = items;

    // V2: Reconcile per-unit tax sum against order-level tax.
    // Basket taxes are pre-rounded by TaxHelper, so this should always match.
    // Safety net: if sums diverge (edge case), adjust purchaseTotals to match items.
    if (isPayPalV2() && !empty(items) && items.length > 0 && request.purchaseTotals) {
        var multiplier = Math.pow(10, fractionDigits);
        var itemTaxSum = 0;
        for (var t = 0; t < items.length; t++) {
            itemTaxSum += Math.round(parseFloat(items[t].taxAmount || 0) * multiplier)
                * parseInt(items[t].quantity, 10);
        }
        var orderTaxUnits = Math.round(parseFloat(request.purchaseTotals.taxAmount || 0) * multiplier);
        if (itemTaxSum !== orderTaxUnits) {
            var diff = orderTaxUnits - itemTaxSum;
            var oldGrand = Math.round(parseFloat(request.purchaseTotals.grandTotalAmount) * multiplier);
            request.purchaseTotals.taxAmount = (itemTaxSum / multiplier).toFixed(fractionDigits);
            request.purchaseTotals.grandTotalAmount = ((oldGrand - diff) / multiplier).toFixed(fractionDigits);
            Logger.warn('[PayPalFacade] V2 Tax reconciliation: adjusted tax {0}->{1}, grand {2}->{3}',
                orderTaxUnits, itemTaxSum, oldGrand, oldGrand - diff);
        }
    }
    if (lineItemCntr.defaultShipment.shippingAddress !== null) {
        shipTo = commonHelper.CreateCybersourceShipToObject(lineItemCntr).shipTo;
        if (shipTo !== null) {
            if (isPayPalV2()) {
                request.shipTo = copyShipToV2(shipTo);
            } else {
                request.shipTo = libCybersource.copyShipTo(shipTo);
            }
        }
        billTo = commonHelper.CreateCyberSourceBillToObject(lineItemCntr, true).billTo;
        if (billTo !== null) {
            if (isPayPalV2()) {
                request.billTo = copyBillToV2(billTo);
            } else {
                request.billTo = libCybersource.copyBillTo(billTo);
            }

        }
    }
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
    // Initialize request.ap if it doesn't exist (V2 createOrderServiceV2 doesn't create it by default)
    // Follow same pattern as addBillingAgreementId (line 456-462)
    if (request.ap == null) {
        var ap = new CybersourceHelper.getcsReference().AP();
        request.ap = ap;
    }
    request.ap.billingAgreementIndicator = true;
}

/** ***************************************************************************
     * Name: createOrderServiceV2
     * Description: Creates request for Cybersource AP Order Service (PayPal V2).
     * param : Request stub, lineitemcontainer
     *************************************************************************** */
function createOrderServiceV2(lineItemCntr, args) {
    var fundingSource = args.fundingSource ? args.fundingSource.toLowerCase().trim() : '';
    // V2 Validation: Line items are MANDATORY for PayPal V2
    if (empty(lineItemCntr) || empty(lineItemCntr.getAllProductLineItems()) || lineItemCntr.getAllProductLineItems().length === 0) {
        Logger.error('[PayPalFacade] V2 Create Order FAILED: Basket has no product line items');
        return {
            reasonCode: '102',
            decision: 'REJECT',
            error: true,
            errorMessage: 'Line items are required for PayPal V2 checkout'
        };
    }

    var request = new csReference.RequestMessage();
    createBasicRequest('createOrderServiceV2', request, lineItemCntr, args);

    // V2 Validation: Ensure items were actually added to request
    if (empty(request.item) || request.item.length === 0) {
        Logger.error('[PayPalFacade] V2 Create Order FAILED: No items in request after createBasicRequest');
        return {
            reasonCode: '102',
            decision: 'REJECT',
            error: true,
            errorMessage: 'Failed to create line items for PayPal V2 order'
        };
    }

    libCybersource.setClientData(request, lineItemCntr.UUID);
    addDecisionManager(request);
    var apOrderService = new csReference.APOrderService();
    apOrderService.run = true;

    var URLUtils = require('dw/web/URLUtils');
    apOrderService.successURL = URLUtils.https('CYBPaypal-PaypalV2Callback', 'billingAgreementFlag', args.billingAgreementFlag, 'isPayPalCredit', args.payPalCreditFlag, 'fundingSource', fundingSource).toString();
    apOrderService.cancelURL = URLUtils.https('Checkout-Begin', 'stage', 'payment').toString();

    request.apOrderService = apOrderService;
    request.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;

    request.authorizationOptions = new csReference.AuthorizationOptions();
    if (args.orderType === 'STANDARD') {
        request.authorizationOptions.authType = 'CAPTURE';
    } else {
        request.authorizationOptions.authType = 'AUTHORIZE';
    }

    // Use nested InvoiceHeader structure
    var descriptorValue = CybersourceConstants.MERCHANT_DESCRIPTOR || dw.system.Site.getCurrent().getName();
    if (!request.invoiceHeader) {
        request.invoiceHeader = new csReference.InvoiceHeader();
    }
    request.invoiceHeader.merchantDescriptor = descriptorValue;

    if (args.payPalCreditFlag) {
        session.forms.billing.paymentMethod.value = CybersourceConstants.METHOD_PAYPAL_CREDIT;
    } else {
        session.forms.billing.paymentMethod.value = CybersourceConstants.METHOD_PAYPAL;
    }

    return payPalSerivceInterface(request);
}

/** ***************************************************************************
     * Name: sessionService
     * Description: Creates request for Cybersource Session Service .
     * param : Request stub, lineitemcontainer
     *************************************************************************** */
function sessionService(lineItemCntr, args) {
    // V1 Only: This is the legacy Session Service API
    // V2 requests should call createOrderServiceV2 directly from the adapter

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
    if ((!isPayPalCredit || require('dw/system/Site').getCurrent().getCustomPreferenceValue('payPalBillingAgreements')) && customer.authenticated) {
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
     * Description: Returns customer information. Returns the billing agreement details
     * if you initiated the creation of a billing agreement.
     * Per V2 spec: Uses checkStatusRequestID and apPaymentType PYPLP.
     * @param {dw.order.LineItemCtnr} lineItemCntr - Order or basket
     * @param {String} requestId - The requestID from a previous service response
     * @param {String} fundingSource - Optional. Funding source identifier
     * @returns {Object} Check status result with response and billing agreement flag
*************************************************************************** */
function checkStatusService(lineItemCntr, requestId, fundingSource) {
    // create request stub for check status service
    var request = new csReference.RequestMessage();
    var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');

    request.merchantID = CybersourceHelper.getMerchantID();
    libCybersource.setClientData(request, lineItemCntr.UUID);

    var apCheckStatusService = new CybersourceHelper.getcsReference().APCheckStatusService();
    var isBillingAgreement = false;

    if (isPayPalV2()) {
        apCheckStatusService.checkStatusRequestID = requestId;

        request.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;
    } else {
        // V1: Use billingAgreementID if available, otherwise use checkStatusRequestID
        request.apPaymentType = 'PPL';
        if (!addBillingAgreementId(request, lineItemCntr)) {
            apCheckStatusService.checkStatusRequestID = requestId;
        } else {
            isBillingAgreement = true;
        }
    }

    request.apCheckStatusService = apCheckStatusService;
    request.apCheckStatusService.run = true;
    var result = {};
    result.checkStatusResponse = payPalSerivceInterface(request);
    result.isBillingAgreement = isBillingAgreement;

    // V1 only: decode non-ASCII address characters from billTo/shipTo
    // V2 Check Status response does not contain address fields
    if (!isPayPalV2() && result.checkStatusResponse && result.checkStatusResponse.billTo) {
        var encodedObj = CommonHelper.createEncodeObject(result);
        var translatedObject = CommonHelper.decodeObj(encodedObj);
        result = CommonHelper.updatePaypalAddressFields(result, translatedObject);
    }
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
    var serviceRequest = new csReference.RequestMessage();

    if (isPayPalV2()) {
        // V2 Auth: Include DM and fingerprint
        CybersourceHelper.apDecisionManagerService(paymentInstrument.paymentMethod, serviceRequest);
        if (serviceRequest.decisionManager && serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()) {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo, libCybersource.replaceCharsInSessionID(session.sessionID));
        } else {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo);
        }

        serviceRequest.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;

        var apAuthService = new CybersourceHelper.getcsReference().APAuthService();
        apAuthService.run = true;
        if (paymentInstrument.paymentTransaction.custom.orderRequestID) {
            apAuthService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
        }
        serviceRequest.apAuthService = apAuthService;
    } else {
        // V1: Full request with items, addresses, decision manager, etc.
        createBasicRequest('authorizeService', serviceRequest, lineItemCntr);
        CybersourceHelper.apDecisionManagerService(paymentInstrument.paymentMethod, serviceRequest);
        if (serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()) {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo, libCybersource.replaceCharsInSessionID(session.sessionID));
        } else {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo);
        }
        addFundingSource(serviceRequest);

        var apAuthService = new CybersourceHelper.getcsReference().APAuthService();
        serviceRequest.apPaymentType = 'PPL';
        apAuthService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
        apAuthService.run = true;
        serviceRequest.apAuthService = apAuthService;
    }

    return payPalSerivceInterface(serviceRequest);
}

/** ***************************************************************************
     * Name: SaleService
     * Description: Initiate the order at CyberSource for Paypal standard order.
     * Per V2 spec: Uses apSaleService with orderRequestID from Create Order.
     * param : Request stub ,order object and Payment type
     *************************************************************************** */
function saleService(lineItemCntr, paymentInstrument) {
    var serviceRequest = new csReference.RequestMessage();

    if (isPayPalV2()) {
        // V2 Sale: Include DM and fingerprint
        CybersourceHelper.apDecisionManagerService(paymentInstrument.paymentMethod, serviceRequest);
        if (serviceRequest.decisionManager && serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()) {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo,
                libCybersource.replaceCharsInSessionID(session.sessionID));
        } else {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo);
        }

        serviceRequest.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;

        var apSaleService = new CybersourceHelper.getcsReference().APSaleService();
        apSaleService.run = true;

        if (paymentInstrument.paymentTransaction.custom.orderRequestID) {
            apSaleService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
        }

        serviceRequest.apSaleService = apSaleService;
    } else {
        // V1: Full request with items, addresses, decision manager, etc.
        createBasicRequest('saleService', serviceRequest, lineItemCntr);
        addDecisionManager(serviceRequest);
        if (serviceRequest.decisionManager.enabled && CybersourceHelper.getDigitalFingerprintEnabled()) {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo, libCybersource.replaceCharsInSessionID(session.sessionID));
        } else {
            libCybersource.setClientData(serviceRequest, lineItemCntr.orderNo);
        }
        addFundingSource(serviceRequest);

        var apSaleService = new CybersourceHelper.getcsReference().APSaleService();
        serviceRequest.apPaymentType = 'PPL';
        if (!addBillingAgreementId(serviceRequest, lineItemCntr)) {
            apSaleService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
        }
        apSaleService.run = true;
        serviceRequest.apSaleService = apSaleService;
    }

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

    if (isPayPalV2()) {
        // V2 Refund does not supports leading zeros
        stripLeadingZerosV2(serviceRequest.purchaseTotals, currency);
    }
    // V1 Refund Logic
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

    libCybersource.setClientData(serviceRequest, merchantRefCode);

    if (isPayPalV2()) {
        // V2 Auth Reversal - per spec: only apAuthReversalService.authRequestID required
        // No purchaseTotals needed for V2 reversal
        serviceRequest.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;
        var apAuthReversalService = new CybersourceHelper.getcsReference().APAuthReversalService();
        apAuthReversalService.authRequestID = requestID;
        apAuthReversalService.run = true;
        serviceRequest.apAuthReversalService = apAuthReversalService;
    } else {
        // V1 Auth Reversal - requires purchaseTotals
        var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, purchaseTotal);
        purchaseObject = purchaseObject.purchaseTotals;
        serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);
        CybersourceHelper.payPalAuthReversalService(serviceRequest, merchantRefCode, requestID, paymentType);
    }

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

    if (isPayPalV2()) {
        //padding like 001000 for capture amount is invalid for paypalv2.
        stripLeadingZerosV2(serviceRequest.purchaseTotals, currency);
    }
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
function billagreementService(requestId, orderRef, paymentType) {
    var serviceRequest = new csReference.RequestMessage();
    serviceRequest.merchantID = CybersourceHelper.getMerchantID();
    libCybersource.setClientData(serviceRequest, orderRef);

    // V1 vs V2: Set appropriate payment type
    // V1: 'PPL' (default for backward compatibility)
    // V2: 'PYPLP' (passed as parameter when called from V2 context)
    var isV2 = (paymentType === CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE);
    serviceRequest.apPaymentType = paymentType || 'PPL';

    var apBillingAgreementService = new CybersourceHelper.getcsReference().APBillingAgreementService();

    // V1 vs V2: Different field names for request ID
    // V1: sessionsRequestID (from Session API)
    // V2: orderRequestID (from Create Order API)
    if (isV2) {
        apBillingAgreementService.orderRequestID = requestId;
        Logger.debug('[PayPalFacade] BillingAgreementService V2: paymentType={0}', paymentType);
    } else {
        apBillingAgreementService.sessionsRequestID = requestId;
        Logger.debug('[PayPalFacade] BillingAgreementService V1');
    }

    serviceRequest.apBillingAgreementService = apBillingAgreementService;
    serviceRequest.apBillingAgreementService.run = true;
    return payPalSerivceInterface(serviceRequest);
}

function updateOrderServiceV2(lineItemCntr, orderRequestID, fundingSource) {
    var request = new csReference.RequestMessage();
    createBasicRequest('updateOrderServiceV2', request, lineItemCntr);
    var commonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var shipTo = commonHelper.CreateCybersourceShipToObject(lineItemCntr).shipTo;
    request.shipTo = copyShipToV2(shipTo);
    libCybersource.setClientData(request, lineItemCntr.UUID);
    var apUpdateOrderService = new csReference.APUpdateOrderService();
    apUpdateOrderService.run = true;
    apUpdateOrderService.orderRequestID = orderRequestID;

    request.apUpdateOrderService = apUpdateOrderService;
    request.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;

    return payPalSerivceInterface(request);
}

function voidOrderServiceV2(orderRequestID) {
    var request = new csReference.RequestMessage();
    libCybersource.setClientData(request, null);

    var apCancelService = new csReference.APCancelService();
    apCancelService.run = true;
    apCancelService.orderRequestID = orderRequestID;

    request.apCancelService = apCancelService;
    request.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;

    return payPalSerivceInterface(request);
}

/**
 * Re-authorize a PayPal Payment
 * Per V2 spec: Re-authorization requires BOTH linkToRequest (previous auth) and orderRequestID (original create order).
 * Note: Cannot re-authorize transactions using saved credentials.
 * Note: For reversal after re-auth, use the INITIAL authorization requestID.
 * @param {dw.order.LineItemCtnr} lineItemCntr - Order or basket
 * @param {dw.order.PaymentInstrument} paymentInstrument - Payment instrument with orderRequestID
 * @param {String} authRequestID - Previous authorization's requestID (used in linkToRequest)
 * @returns {Object} Service response
 */
function reauthorizeServiceV2(lineItemCntr, paymentInstrument, authRequestID) {
    var request = new csReference.RequestMessage();

    // Per spec (page 68): Re-auth only requires linkToRequest, orderRequestID,
    // purchaseTotals (currency + grandTotalAmount), apPaymentType, merchantID,
    // and merchantReferenceCode. Do NOT include items, shipTo, or billTo —
    // extra fields can cause reasonCode 102 (INVALID_REQUEST).
    var commonHelper = require('*/cartridge/scripts/helper/CommonHelper');
    var purchase = commonHelper.GetPurchaseTotalPayPal(lineItemCntr);
    request.purchaseTotals = copyPurchaseTotalsV2(purchase);

    libCybersource.setClientData(request, lineItemCntr.orderNo || lineItemCntr.UUID);

    var apAuthService = new csReference.APAuthService();
    apAuthService.run = true;

    // Per spec: orderRequestID from original Create Order response is required
    if (paymentInstrument && paymentInstrument.paymentTransaction && paymentInstrument.paymentTransaction.custom.orderRequestID) {
        apAuthService.orderRequestID = paymentInstrument.paymentTransaction.custom.orderRequestID;
    } else {
        Logger.error('[PayPalFacade] reauthorizeServiceV2: Missing orderRequestID from paymentInstrument');
    }

    // Per spec: linkToRequest is the previous authorization's requestID
    request.linkToRequest = authRequestID;

    request.apAuthService = apAuthService;
    request.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;

    return payPalSerivceInterface(request);
}

module.exports = {
    SessionService: sessionService,
    createOrderServiceV2: createOrderServiceV2,
    UpdateOrderServiceV2: updateOrderServiceV2,
    VoidOrderServiceV2: voidOrderServiceV2,
    ReauthorizeServiceV2: reauthorizeServiceV2,
    CheckStatusService: checkStatusService,
    OrderService: orderService,
    AuthorizeService: authorizeService,
    SaleService: saleService,
    BillingAgreement: billagreementService,
    PayPalRefundService: PayPalRefundService,
    PayPalReversalService: PayPalReversalService,
    PayPalCaptureService: PayPalCaptureService
};
