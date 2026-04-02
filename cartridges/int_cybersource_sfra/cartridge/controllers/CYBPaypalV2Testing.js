/* eslint-disable */
'use strict';

/**
 * Controller for testing PayPal V2 (PYPLP) payment operations.
 *
 * All endpoints derive payment details (authRequestID, amount, currency, paymentType)
 * from the order itself. Only the Order Number is required for Capture, Auth Reversal,
 * and Check Status. An optional amount override is available for partial captures.
 *
 * Endpoints:
 *   Index            - Links to all test forms
 *   TestCapture      - Render Capture form
 *   Capture          - Execute Capture (apCaptureService)
 *   TestAuthReversal - Render Auth Reversal form
 *   AuthReversal     - Execute Auth Reversal (apAuthReversalService)
 *   TestReauth       - Render Re-Authorization form
 *   Reauth           - Execute Re-Authorization (apAuthService + linkToRequest)
 *   TestCheckStatus  - Render Check Status form
 *   CheckStatus      - Execute Check Status (apCheckStatusService)
 *
 * @module controllers/CYBPaypalV2Testing
 */

var server = require('server');
var System = require('dw/system/System');
var URLUtils = require('dw/web/URLUtils');
var Logger = require('dw/system/Logger').getLogger('Cybersource');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var secureResponseHelper = require('*/cartridge/scripts/helpers/secureResponseHelper');
var secureRender = secureResponseHelper.secureRender;

/**
 * Guard: block on production instances.
 */
function productionGuard(res) {
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return true;
    }
    return false;
}

/**
 * Helper: get and clear the paypalV2TestForm.
 */
function getCleanForm(serverRef) {
    session.forms.paypalV2TestForm.clearFormElement();
    return serverRef.forms.getForm('paypalV2TestForm');
}

/**
 * Normalize an amount to a valid decimal string.
 * Strips leading zeros and ensures two decimal places (e.g. "000049.05" -> "49.05").
 */
function normalizeAmount(raw) {
    if (empty(raw)) return null;
    var parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) return null;
    return parsed.toFixed(2);
}

/**
 * Look up an order and extract the PayPal V2 payment instrument and its details.
 * Returns an object with all fields needed for post-order operations.
 *
 * @param {String} orderNo - The SFCC order number
 * @returns {Object} { order, pi, authRequestID, orderRequestID, merchantRefCode,
 *                      amount, currency, paymentType, fundingSource, error }
 */
function getOrderPaymentDetails(orderNo) {
    var result = { error: null };
    var OrderMgr = require('dw/order/OrderMgr');
    var collections = require('*/cartridge/scripts/util/collections');

    if (empty(orderNo)) {
        result.error = 'Order Number is required.';
        return result;
    }

    var order = OrderMgr.getOrder(orderNo);
    if (empty(order)) {
        result.error = 'Order not found: ' + orderNo;
        return result;
    }
    result.order = order;
    result.merchantRefCode = order.orderNo;
    result.currency = order.currencyCode;
    result.amount = order.totalGrossPrice.value.toFixed(2);

    // Find PayPal V2 payment instrument
    var paymentInstrument = null;
    collections.forEach(order.paymentInstruments, function (pi) {
        if (pi.paymentMethod === CybersourceConstants.METHOD_PAYPAL
            || pi.paymentMethod === CybersourceConstants.METHOD_PAYPAL_CREDIT) {
            paymentInstrument = pi;
        }
    });

    if (empty(paymentInstrument)) {
        result.error = 'No PayPal V2 payment instrument found on order ' + orderNo;
        return result;
    }
    result.pi = paymentInstrument;

    var txn = paymentInstrument.paymentTransaction;

    // Derive authRequestID (from authorization response)
    result.authRequestID = txn.custom.authRequestID || txn.transactionID || '';

    // Derive orderRequestID (from create order response)
    result.orderRequestID = txn.custom.orderRequestID || '';

    // Derive payment type from funding source
    var fundingSource = txn.custom.fundingSource || '';
    result.fundingSource = fundingSource;
    result.paymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;  // 'PYPLP'

    return result;
}

// --------------------------------------------------------------------------
// Index
// --------------------------------------------------------------------------

server.get('Index', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();
    secureRender(res, 'services/paypalV2Services');
    next();
});

// --------------------------------------------------------------------------
// Capture
// --------------------------------------------------------------------------

server.get('TestCapture', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();
    var form = getCleanForm(server);
    secureRender(res, 'services/paypalV2CaptureForm', {
        form: form,
        continueUrl: URLUtils.https('CYBPaypalV2Testing-Capture').toString()
    });
    next();
});

/**
 * POST handler: Capture a PayPal V2 authorized payment.
 *
 * Reads the order number and derives authRequestID, amount, currency,
 * and paymentType from the order's payment instrument.
 * An optional amount field allows partial captures.
 */
server.post('Capture', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();

    var form = session.forms.paypalV2TestForm;
    var orderNo = form.orderNo.htmlValue;
    var details = getOrderPaymentDetails(orderNo);

    if (details.error) {
        secureRender(res, 'common/scriptError', { log: details.error });
        return next();
    }

    if (empty(details.authRequestID)) {
        secureRender(res, 'common/scriptError', {
            log: 'No authRequestID found on payment instrument for order ' + orderNo
                + '. Capture requires a completed authorization.'
        });
        return next();
    }

    // Use override amount if provided, otherwise use the full order amount
    var overrideAmount = normalizeAmount(form.grandTotalAmount.htmlValue);
    var captureAmount = overrideAmount || details.amount;

    var PayPalFacade = require('*/cartridge/scripts/paypal/facade/PayPalFacade');
    var serviceResponse = PayPalFacade.PayPalCaptureService(
        details.authRequestID,
        details.merchantRefCode,
        details.paymentType,
        captureAmount,
        details.currency
    );

    form.clearFormElement();

    if (!empty(serviceResponse) ) {
        secureRender(res, 'services/transactionResult', {
            serviceReply: 'apCaptureReply',
            response: serviceResponse,
            msgHeader: 'PayPal V2 Capture Reply'
        });
    } else {
        secureRender(res, 'common/scriptError', {
            log: serviceResponse && serviceResponse.errorMsg
                ? serviceResponse.errorMsg
                : 'Capture service returned an error. Check CyberSource logs.'
        });
    }
    next();
});

// --------------------------------------------------------------------------
// Authorization Reversal
// --------------------------------------------------------------------------

server.get('TestAuthReversal', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();
    var form = getCleanForm(server);
    secureRender(res, 'services/paypalV2ReversalForm', {
        form: form,
        continueUrl: URLUtils.https('CYBPaypalV2Testing-AuthReversal').toString()
    });
    next();
});

/**
 * POST handler: Reverse a PayPal V2 authorization.
 *
 * Reads the order number and derives authRequestID, amount, currency,
 * and paymentType from the order's payment instrument.
 */
server.post('AuthReversal', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();

    var form = session.forms.paypalV2TestForm;
    var orderNo = form.orderNo.htmlValue;
    var details = getOrderPaymentDetails(orderNo);

    if (details.error) {
        secureRender(res, 'common/scriptError', { log: details.error });
        return next();
    }

    if (empty(details.authRequestID)) {
        secureRender(res, 'common/scriptError', {
            log: 'No authRequestID found on payment instrument for order ' + orderNo
                + '. Reversal requires a completed authorization.'
        });
        return next();
    }

    var PayPalFacade = require('*/cartridge/scripts/paypal/facade/PayPalFacade');
    var serviceResponse = PayPalFacade.PayPalReversalService(
        details.authRequestID,
        details.merchantRefCode,
        details.paymentType,
        details.amount,
        details.currency
    );

    form.clearFormElement();

    if (!empty(serviceResponse) && !serviceResponse.error) {
        secureRender(res, 'services/transactionResult', {
            serviceReply: 'apAuthReversalReply',
            response: serviceResponse,
            msgHeader: 'PayPal V2 Auth Reversal Reply'
        });
    } else {
        secureRender(res, 'common/scriptError', {
            log: serviceResponse && serviceResponse.errorMsg
                ? serviceResponse.errorMsg
                : 'Auth Reversal service returned an error. Check CyberSource logs.'
        });
    }
    next();
});

// --------------------------------------------------------------------------
// Re-Authorization (PayPal V2 only)
// --------------------------------------------------------------------------

server.get('TestReauth', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();
    var form = getCleanForm(server);
    secureRender(res, 'services/paypalV2ReauthForm', {
        form: form,
        continueUrl: URLUtils.https('CYBPaypalV2Testing-Reauth').toString()
    });
    next();
});

/**
 * POST handler: Re-authorize a PayPal V2 payment.
 *
 * Reads the order number and derives orderRequestID and payment details
 * from the order. The authRequestID (linkToRequest) must be provided
 * manually since it refers to the PREVIOUS authorization's requestID.
 */
server.post('Reauth', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();

    var form = session.forms.paypalV2TestForm;
    var orderNo = form.orderNo.htmlValue;
    var authRequestID = form.authRequestID.htmlValue;

    if (empty(authRequestID)) {
        secureRender(res, 'common/scriptError', {
            log: 'Previous Auth Request ID (linkToRequest) is required for Re-Authorization.'
        });
        return next();
    }

    var details = getOrderPaymentDetails(orderNo);
    if (details.error) {
        secureRender(res, 'common/scriptError', { log: details.error });
        return next();
    }

    if (empty(details.orderRequestID)) {
        secureRender(res, 'common/scriptError', {
            log: 'No orderRequestID stored on payment instrument for order ' + orderNo
                + '. Re-authorization requires the original Create Order requestID.'
        });
        return next();
    }

    var PayPalFacade = require('*/cartridge/scripts/paypal/facade/PayPalFacade');
    var serviceResponse = PayPalFacade.ReauthorizeServiceV2(details.order, details.pi, authRequestID);

    form.clearFormElement();

    if (!empty(serviceResponse) && !serviceResponse.error) {
        secureRender(res, 'services/transactionResult', {
            serviceReply: 'apAuthReply',
            response: serviceResponse,
            msgHeader: 'PayPal V2 Re-Authorization Reply'
        });
    } else {
        secureRender(res, 'common/scriptError', {
            log: serviceResponse && serviceResponse.errorMsg
                ? serviceResponse.errorMsg
                : 'Re-Authorization service returned an error. Check CyberSource logs.'
        });
    }
    next();
});

// --------------------------------------------------------------------------
// Check Status
// --------------------------------------------------------------------------

server.get('TestCheckStatus', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();
    var form = getCleanForm(server);
    secureRender(res, 'services/paypalV2CheckStatusForm', {
        form: form,
        continueUrl: URLUtils.https('CYBPaypalV2Testing-CheckStatus').toString()
    });
    next();
});

/**
 * POST handler: Check status of a PayPal V2 transaction.
 *
 * Accepts either:
 *   - Order Number only: derives the requestID and paymentType from the order
 *   - Manual requestID + paymentType: for checking status of any arbitrary request
 */
server.post('CheckStatus', server.middleware.https, function (req, res, next) {
    if (productionGuard(res)) return next();

    var form = session.forms.paypalV2TestForm;
    var orderNo = form.orderNo.htmlValue;
    var manualRequestID = form.authRequestID.htmlValue;
    var manualPaymentType = form.paymentType.htmlValue;

    var checkStatusRequestID;
    var merchantRefCode;
    var paymentType;

    // If order number is provided, derive values from it
    if (!empty(orderNo)) {
        var details = getOrderPaymentDetails(orderNo);
        if (details.error) {
            secureRender(res, 'common/scriptError', { log: details.error });
            return next();
        }
        checkStatusRequestID = details.authRequestID || details.orderRequestID;
        merchantRefCode = details.merchantRefCode;
        paymentType = details.paymentType;
    }

    // Manual overrides (take precedence if provided)
    if (!empty(manualRequestID)) {
        checkStatusRequestID = manualRequestID;
    }
    if (!empty(manualPaymentType)) {
        paymentType = manualPaymentType;
    }
    if (empty(merchantRefCode)) {
        merchantRefCode = form.merchantReferenceCode.htmlValue || ('CHECKSTATUS_' + Date.now());
    }

    if (empty(checkStatusRequestID)) {
        secureRender(res, 'common/scriptError', {
            log: 'Provide either an Order Number or a Request ID for Check Status.'
        });
        return next();
    }

    // Build the check status request
    var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var csReference = new CybersourceHelper.getcsReference();
    var CSServices = require('*/cartridge/scripts/init/SoapServiceInit');

    var serviceRequest = new csReference.RequestMessage();
    serviceRequest.merchantID = CybersourceHelper.getMerchantID();
    libCybersource.setClientData(serviceRequest, merchantRefCode);

    var apCheckStatusService = new csReference.APCheckStatusService();
    apCheckStatusService.checkStatusRequestID = checkStatusRequestID;
    apCheckStatusService.run = true;
    serviceRequest.apCheckStatusService = apCheckStatusService;

    serviceRequest.apPaymentType = CybersourceConstants.PAYPAL_V2_PAYMENT_TYPE;

    var serviceResponse = null;
    try {
        var service = CSServices.CyberSourceTransactionService;
        var requestWrapper = {};
        requestWrapper.request = serviceRequest;
        serviceResponse = service.call(requestWrapper);
    } catch (e) {
        Logger.error('[CYBPaypalV2Testing] CheckStatus error: {0}', e.message);
        secureRender(res, 'common/scriptError', { log: 'Check Status error: ' + e.message });
        return next();
    }

    form.clearFormElement();

    if (!empty(serviceResponse) && serviceResponse.status === 'OK') {
        serviceResponse = serviceResponse.object;
        secureRender(res, 'services/transactionResult', {
            serviceReply: 'apCheckStatusReply',
            response: serviceResponse,
            msgHeader: 'PayPal V2 Check Status Reply'
        });
    } else {
        secureRender(res, 'common/scriptError', {
            log: 'Check Status service returned an error. Status: '
                + (serviceResponse ? serviceResponse.status : 'null')
        });
    }
    next();
});

module.exports = server.exports();
