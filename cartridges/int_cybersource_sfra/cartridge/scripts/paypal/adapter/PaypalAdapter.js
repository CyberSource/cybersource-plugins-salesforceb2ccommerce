/* eslint-disable */
'use strict';

/**
* This file will contains adapter methods for Cybersource paypal
* Integration.
*/

/* Initialize session for transaction with Cybersource
 * param
 */
var Logger = require('dw/system/Logger').getLogger('Cybersource');
var Transaction = require('dw/system/Transaction');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
// var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();

// var csReference = webreferences2.CyberSourceTransaction;

/**
 * Initialize call to CyberSource Init Session service
 * @param LineItemCtnr,BillingAgreementFlag
 * @returns response from CyberSource Init Session service
 */

function initiateExpressCheckout(lineItemCntr, args) {
    var result = {};
    if (lineItemCntr === null) {
        Logger.error('Basket is Empty!');
        result.success = false;
    }
    var paypalFacade = require(CybersourceConstants.PATH_FACADE + 'PayPalFacade');
    var response = paypalFacade.SessionService(lineItemCntr, args);
    // process response received from service
    if (!empty(response) && Number(response.reasonCode) === 100) {
        result.success = true;
        result.requestID = response.requestID;
        result.processorTransactionID = response.apSessionsReply.processorTransactionID;
    }
    return result;
}

/**
 * Set the shipping address details
 * @param lineItemCtnr
 * redirect to cart's calculate method
 */

function setShippingMethod(lineItemCntr) {
    // var applicableShippingMethods;
    var shipment = lineItemCntr.getDefaultShipment();
    var ShippingMgr = require('dw/order/ShippingMgr');
    if (!empty(session.forms.shipping.shippingAddress.shippingMethodID.value)) {
        var shippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods();
        // Tries to set the shipment shipping method to the passed one.
        for (var i = 0; i < shippingMethods.length; i += 1) {
            var method = shippingMethods[i];
            if (method.ID.equals(session.forms.shipping.shippingAddress.shippingMethodID.value)) {
                shipment.setShippingMethod(method);
            }
        }
    } else {
        var defaultShippingMethod = ShippingMgr.getDefaultShippingMethod();
        shipment.setShippingMethod(defaultShippingMethod);
    }
}

/**
 * Initialize call to CyberSource Order service
 * @param order
 * @returns response from CyberSource Order Service
 */
function orderService(order, pi) {
    var paymentInstrument = pi;
    var response = {};
    try {
        var paypalFacade = require('../facade/PayPalFacade');
        var orderServiceResponse;
        orderServiceResponse = paypalFacade.OrderService(order, paymentInstrument);
        // process response received from service
        if (!empty(orderServiceResponse) && Number(orderServiceResponse.reasonCode) === 100 && orderServiceResponse.apOrderReply.status === 'CREATED') {
            Transaction.wrap(function () {
                // save order Request ID to be used in Sale service
                paymentInstrument.paymentTransaction.custom.orderRequestID = orderServiceResponse.requestID;
                paymentInstrument.paymentTransaction.custom.orderID = orderServiceResponse.apReply.orderID;
                if (!empty(orderServiceResponse.apReply) && !empty(orderServiceResponse.apReply.fundingSource)) {
                    paymentInstrument.paymentTransaction.custom.fundingSource = orderServiceResponse.apReply.fundingSource;
                }
                paymentInstrument.paymentTransaction.custom.processorResponse = orderServiceResponse.apOrderReply.processorResponse;
                paymentInstrument.paymentTransaction.custom.reconsilationID = orderServiceResponse.apOrderReply.reconciliationID;
            });
            response.orderCreated = true;
        } else {
            response.orderCreated = false;
        }
    } catch (e) {
        Logger.error('Error while executing orderService method in PayPal Adatper' + e);
    }
    return response;
}

/**
 * Initialize call to PayPal Billing Agreement Service
 * @param
 * @returns response from PayPal Billing Agreement Service
 */
function billingAgreementService(requestId, order) {
    var result = {};
    var collections = require('*/cartridge/scripts/util/collections');
    // var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var paypalFacade = require('../facade/PayPalFacade'); var response;
    response = paypalFacade.BillingAgreement(requestId, order.UUID);
    if (!empty(response) && Number(response.reasonCode) === 100) {
        var paymentInstruments = order.paymentInstruments; var pi;
        collections.forEach(paymentInstruments, function (paymentInstrument) {
            // for each(var paymentInstrument in paymentInstruments ){
            if (paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL)) {
                // eslint-disable-next-line
                pi = paymentInstrument;
            }
        });
        // Add Billing AgreementID to Customer Profile for future use
        Transaction.wrap(function () {
            customer.profile.custom.billingAgreementID = response.apReply.billingAgreementID;
            // commonHelper.AddAddressToCart(order,response,true);
            // pi.paymentTransaction.custom.billingAgreementStatus = response.apBillingAgreementReply.status;
            session.privacy.billingAgreementStatus = response.apBillingAgreementReply.status;
        });
        result.created = true;
    } else {
        result.created = false;
    }
    return result;
}

/**
 * Initialize call to CyberSource Check Status service
*
 * @returns response from CyberSource Check Status Service
 */

function initSessionCallback(lineItemCntr, args) {
    var result = {};
    // var paymentID = args.paymentID;
    // var payerID = args.payerID;
    var requestID = args.requestId;
    // var paymentID = args.paymentID;
    var billingAgreementFlag = args.billingAgreementFlag;
    try {
        // If the flag for creation of Billing Agreement is checked
        if (customer.authenticated && billingAgreementFlag) {
            if (!billingAgreementService(requestID, lineItemCntr).created) {
                result.success = false;
                return result;
            }
        }
        var paypalFacade = require('../facade/PayPalFacade');
        var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
        var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
        var skipShipAddressValidation;
        var checkStatusResult = paypalFacade.CheckStatusService(lineItemCntr, requestID);
        result.shippingAddressMissing = false;
        result.billingAddressMissing = false;
        skipShipAddressValidation = !!checkStatusResult.isBillingAgreement;
        if (!empty(checkStatusResult) && Number(checkStatusResult.checkStatusResponse.reasonCode) === 100) {
            // Shipping address is overriden with billing address for PayPal Billing Agreement, no need to validate shipping address.
            if (!skipShipAddressValidation && !commonHelper.ValidatePayPalShippingAddress(checkStatusResult.checkStatusResponse, lineItemCntr)) {
                result.shippingAddressMissing = true;
            }
            if (!commonHelper.ValidatePayPalBillingAddress(checkStatusResult.checkStatusResponse, lineItemCntr)) {
                result.billingAddressMissing = true;
            }
            var overrideAddressPaypalPreference = !CybersourceHelper.IsPaypalAddressOverride();
            Transaction.wrap(function () {
                var addressUpdateStatus;
                if (checkStatusResult.isBillingAgreement) {
                    addressUpdateStatus = commonHelper.AddAddressToCart(lineItemCntr, checkStatusResult.checkStatusResponse, true);
                } else {
                    addressUpdateStatus = commonHelper.AddAddressToCart(lineItemCntr, checkStatusResult.checkStatusResponse, overrideAddressPaypalPreference);
                }
                result.shippingAddressMissing = !!addressUpdateStatus.shippingAddressMissing;
                result.billingAddressMissing = !!addressUpdateStatus.billingAddressMissing;
                setShippingMethod(lineItemCntr);
            });
            result.success = true;
            result.payerID = checkStatusResult.checkStatusResponse.apReply.payerID;
            result.transactionProcessorID = checkStatusResult.checkStatusResponse.apCheckStatusReply.processorTransactionID;
            result.requestID = checkStatusResult.checkStatusResponse.requestID;
        }
    } catch (e) {
        // var testparam = e;
        Logger.error('Error while executing method initSessionCallback in PayPal Adapter' + e);
    }
    return result;
}

function handlePayPalReject(pi) {
    var paymentInstrument = pi;
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.custom.orderRequestID = '';
        paymentInstrument.paymentTransaction.custom.orderID = '';
        paymentInstrument.paymentTransaction.custom.fundingSource = '';
        paymentInstrument.paymentTransaction.custom.processorResponse = '';
        paymentInstrument.paymentTransaction.custom.reconsilationID = '';
    });
}

/**
 * Initialize call to CyberSource Authorize service
 * @param order
 * @returns response from CyberSource Authorize Service
 */

function authorizeService(order, paymentInstrument) {
    var result = {};
    try {
        var paymentTransaction = paymentInstrument.paymentTransaction;
        var paypalFacade = require('../facade/PayPalFacade');
        var response = paypalFacade.AuthorizeService(order, paymentInstrument);
        // process response received from sale service
        if (!empty(response) && response.decision.equals('ACCEPT') && response.apAuthReply.paymentStatus === 'AUTHORIZED' && Number(response.reasonCode) === 100) {
            Transaction.wrap(function () {
                paymentTransaction.transactionID = response.requestID;
                paymentTransaction.type = paymentTransaction.TYPE_AUTH;
                paymentTransaction.custom.paymentStatus = response.apAuthReply.paymentStatus;
                if (!empty(response.apReply) && !empty(response.apReply.processorFraudDecisionReason)) {
                    paymentTransaction.custom.processorFraudDecisionReason = response.apReply.processorFraudDecisionReason;
                }
                paymentTransaction.custom.authProcessorTID = response.apAuthReply.processorTransactionID;
                paymentTransaction.custom.authRequestID = response.requestID;
                paymentTransaction.custom.authRequestToken = response.requestToken;
                if (!empty(response.apReply) && !empty(response.apReply.fundingSource)) {
                    paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
                }
            });
            result.authorized = true;
        } else if (!empty(response) && response.decision.equals('ACCEPT') && response.apAuthReply.paymentStatus === 'PENDING' && Number(response.reasonCode) === 100) {
            Transaction.wrap(function () {
                paymentTransaction.transactionID = response.apAuthReply.processorTransactionID;
                paymentTransaction.custom.paymentStatus = response.apAuthReply.paymentStatus;
                if (!empty(response.apReply) && !empty(response.apReply.processorFraudDecisionReason)) {
                    paymentTransaction.custom.processorFraudDecisionReason = response.apReply.processorFraudDecisionReason;
                }
                paymentTransaction.custom.authProcessorTID = response.apAuthReply.processorTransactionID;
                paymentTransaction.custom.authRequestID = response.requestID;
                paymentTransaction.custom.authRequestToken = response.requestToken;
                if (!empty(response.apReply) && !empty(response.apReply.fundingSource)) {
                    paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
                }
            });
            result.pending = true;
        } else if (!empty(response) && response.decision.equals('REVIEW') && Number(response.reasonCode) === 480) {
            Transaction.wrap(function () {
                paymentTransaction.transactionID = response.apAuthReply.processorTransactionID;
                paymentTransaction.custom.paymentStatus = response.apAuthReply.paymentStatus;
                if (!empty(response.apReply) && !empty(response.apReply.processorFraudDecisionReason)) {
                    paymentTransaction.custom.processorFraudDecisionReason = response.apReply.processorFraudDecisionReason;
                }
                paymentTransaction.custom.authProcessorTID = response.apAuthReply.processorTransactionID;
                paymentTransaction.custom.authRequestID = response.requestID;
                paymentTransaction.custom.authRequestToken = response.requestToken;
                if (!empty(response.apReply) && !empty(response.apReply.fundingSource)) {
                    paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
                }
            });
            result.pending = true;
        } else if (!empty(response) && response.decision.equals('REJECT') && Number(response.reasonCode) === 481) {
            handlePayPalReject(paymentInstrument);
            result.rejected = true;
        } else {
            result.error = true;
        }
    } catch (e) {
        Logger.error('Error while executing authorizeService method in PayPal Adatper' + e);
    }
    return result;
}

/**
 * Initialize call to CyberSource Sale service
 * @param order
 * @returns response from CyberSource Sale Service
 */

function saleService(Order, paymentInstrument) {
    var order = Order;
    var result = {};
    try {
        var paymentTransaction = paymentInstrument.paymentTransaction;
        var paypalFacade = require('../facade/PayPalFacade');
        var response = paypalFacade.SaleService(order, paymentInstrument);
        // process response received from sale service
        if (!empty(response) && response.decision.equals('ACCEPT') && response.apSaleReply.paymentStatus === 'SETTLED' && Number(response.reasonCode) === 100) {
            Transaction.wrap(function () {
                paymentTransaction.transactionID = response.requestID;
                paymentTransaction.type = paymentTransaction.TYPE_CAPTURE;
                paymentTransaction.custom.paymentStatus = response.apSaleReply.paymentStatus;
                paymentTransaction.custom.saleProcessorTID = response.apSaleReply.processorTransactionID;
                paymentTransaction.custom.saleRequestID = response.requestID;
                paymentTransaction.custom.saleRequestToken = response.requestToken;
                if (!empty(response.apReply) && !empty(response.apReply.fundingSource)) {
                    paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
                }
                order.paymentStatus = 2;
            });
            result.authorized = true;
        } else if (!empty(response) && response.decision.equals('ACCEPT') && response.apSaleReply.paymentStatus === 'PENDING' && Number(response.reasonCode) === 100) {
            Transaction.wrap(function () {
                paymentTransaction.transactionID = response.apSaleReply.processorTransactionID;
                paymentTransaction.custom.paymentStatus = response.apSaleReply.paymentStatus;
                paymentTransaction.custom.saleProcessorTID = response.apSaleReply.processorTransactionID;
                paymentTransaction.custom.saleRequestID = response.requestID;
                paymentTransaction.custom.saleRequestToken = response.requestToken;
                if (!empty(response.apReply) && !empty(response.apReply.fundingSource)) {
                    paymentTransaction.custom.fundingSource = response.apReply.fundingSource;
                }
            });
            result.pending = true;
        } else if (!empty(response) && response.decision.equals('REVIEW') && Number(response.reasonCode) === 480) {
            Transaction.wrap(function () {
                paymentTransaction.custom.saleRequestID = response.requestID;
                paymentTransaction.custom.saleRequestToken = response.requestToken;
            });
            result.pending = true;
        } else if (!empty(response) && response.decision.equals('REJECT') && Number(response.reasonCode) === 481) {
            handlePayPalReject(paymentInstrument);
            result.rejected = true;
        } else {
            result.error = true;
        }
    } catch (e) {
        Logger.error('Error while executing saleService method in PayPal Adatper' + e);
    }
    return result;
}
/**
 * paypal Custom order flow, manage Custom order flow for merchant
 * Site preference would drive the invocation of this method
 * param order
 *
 */
function customOrder(order, paymentInstrument) {
    var result = {};
    // if order created successfully , call authorization service
    if (orderService(order, paymentInstrument).orderCreated) {
        var authResult = authorizeService(order, paymentInstrument);
        if (authResult.authorized) {
            result.authorized = true;
        } else if (authResult.pending) {
            // returning pending flag for pending orders
            result.pending = true;
        } else if (authResult.rejected) {
            result.rejected = true;
        } else {
            result.error = true;
        }
    } else {
        result.error = false;
    }
    return result;
}

/**
 * paypal Standard order flow, manage Standard order flow for merchant
 * Site preference would drive the invocation of this method
 * param order
 *
 */
function standardOrder(order, paymentInstrument) {
    var result = {}; var saleOrderResponse;
    // if order created successfully , call sale service
    if (orderService(order, paymentInstrument).orderCreated) {
        saleOrderResponse = saleService(order, paymentInstrument);
        if (saleOrderResponse.authorized) {
            result.authorized = true;
        } else if (saleOrderResponse.pending) {
            // returning pending flag for pending orders
            result.pending = true;
        } else if (saleOrderResponse.rejected) {
            result.rejected = true;
        } else {
            result.error = true;
        }
    } else {
        result.error = false;
    }
    return result;
}

/**
 * Paypal Paymane
 */
function paymentService(order, paymentInstrument) {
    var orderType = dw.system.Site.getCurrent().getCustomPreferenceValue('CsPaypalOrderType').value;
    var orderResponse = {};

    // If customer has an already existin billing agreement ID
    var billingAgreementIDFlag = empty(customer.profile) ? false : !empty(customer.profile.custom.billingAgreementID);
    if (billingAgreementIDFlag && dw.system.Site.getCurrent().getCustomPreferenceValue('payPalBillingAgreements') && paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL)) {
        orderType = 'BILLINGAGREEMENT';
    }
    switch (orderType) {
        case 'STANDARD':
            orderResponse = standardOrder(order, paymentInstrument);
            break;
        case 'CUSTOM':
            orderResponse = customOrder(order, paymentInstrument);
            break;
        case 'BILLINGAGREEMENT':
            orderResponse = saleService(order, paymentInstrument);
            break;
        default:
            orderResponse = customOrder(order, paymentInstrument);
            break;
    }
    return orderResponse;
}

module.exports = {
    InitiateExpressCheckout: initiateExpressCheckout,
    OrderService: orderService,
    AuthorizeService: authorizeService,
    SaleService: saleService,
    PaymentService: paymentService,
    SessionCallback: initSessionCallback,
    BillingAgreementService: billingAgreementService,
    CustomOrder: customOrder,
    StandardOrder: standardOrder
};
