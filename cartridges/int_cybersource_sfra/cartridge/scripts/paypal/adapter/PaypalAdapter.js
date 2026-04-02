/* eslint-disable */
'use strict';

/**
* This file contains adapter methods for Cybersource PayPal integration.
*
* V1 (PPL - Legacy PayPal API):
*   - Service: apBillingAgreementService
*   - Token Field: billingAgreementID (starts with 'B-', e.g., 'B-4JY29180XV7318025')
*   - Storage: customer.profile.custom.billingAgreementID
*   - First Order: apSessionsService (with billingAgreementIndicator) → apBillingAgreementService → apSaleService
*   - Subsequent Orders: apSaleService directly (with billingAgreementID in <ap>)
*/

/* Initialize session for transaction with Cybersource
 * param
 */
var Logger = require('dw/system/Logger').getLogger('Cybersource');
var Transaction = require('dw/system/Transaction');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var Site = require('dw/system/Site');

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
        return result;
    }

    var isV2Enabled = Site.getCurrent().getCustomPreferenceValue('CsEnablePayPalV2');

    // V2: Validate mandatory line items before API call
    if (isV2Enabled) {
        if (empty(lineItemCntr.getAllProductLineItems()) || lineItemCntr.getAllProductLineItems().length === 0) {
            Logger.error('[PaypalAdapter] V2 requires line items. Basket has no products.');
            result.success = false;
            result.error = true;
            result.errorMessage = 'Your basket must contain products to checkout with PayPal.';
            return result;
        }
    }

    var paypalFacade = require(CybersourceConstants.PATH_FACADE + 'PayPalFacade');
    var orderTypePref = Site.getCurrent().getCustomPreferenceValue('CsPaypalOrderType');
    args.orderType = orderTypePref ? orderTypePref.value : 'CUSTOM';

    var response;

    // V2 vs V1 routing: Call appropriate API directly
    if (isV2Enabled) {
        // V2: Round up line item taxes so per-unit tax is in whole smallest-currency-units
        var TaxHelper = require('*/cartridge/scripts/helper/TaxHelper');
        TaxHelper.RoundUpBasketTaxesForV2(lineItemCntr);

        response = paypalFacade.createOrderServiceV2(lineItemCntr, args);
    } else {
        // V1: Call Session API
        Logger.debug('[PaypalAdapter] Initiating PayPal V1 Session Service');
        response = paypalFacade.SessionService(lineItemCntr, args);
    }
    
    // process response received from service
    if (!empty(response) && Number(response.reasonCode) === 100) {
        result.success = true;
        result.requestID = response.requestID;

        // Handle V2 vs V1 response structure
        if (isV2Enabled) {
            // V2 returns apOrderReply
            if (response.apOrderReply) {
                // SDK expects orderProcessorTransactionId (with lowercase "d" in "Id")
                result.orderProcessorTransactionId = response.apOrderReply.orderProcessorTransactionId;
                result.merchantURL = response.apOrderReply.merchantURL;

                Logger.debug('[PaypalAdapter] V2 Create Order Success - status: {0}', response.apOrderReply.status);
            } else {
                Logger.error('[PaypalAdapter] V2 response has no apOrderReply. ReasonCode: {0}, Decision: {1}',
                    response.reasonCode, response.decision);
            }
        } else {
            // V1 returns apSessionsReply
            if (response.apSessionsReply) {
                result.processorTransactionID = response.apSessionsReply.processorTransactionID;
            }
        }
    } else {
        Logger.error('[PaypalAdapter] Create Order failed. ReasonCode: {0}, Decision: {1}',
            response ? response.reasonCode : 'null',
            response ? response.decision : 'null');
    }
    return result;
}

/**
 * Set the shipping address details
 * @param lineItemCtnr
 * redirect to cart's calculate method
 */

function setShippingMethod(lineItemCntr) {
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
   var paypalFacade = require('../facade/PayPalFacade'); var response;
    response = paypalFacade.BillingAgreement(requestId, order.UUID);
    if (!empty(response) && Number(response.reasonCode) === 100) {
        var paymentInstruments = order.paymentInstruments; var pi;
        collections.forEach(paymentInstruments, function (paymentInstrument) {
            if (paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL)) {
                // eslint-disable-next-line
                pi = paymentInstrument;
            }
        });
        // Add Billing AgreementID to Customer Profile for future use
        Transaction.wrap(function () {
            customer.profile.custom.billingAgreementID = response.apReply.billingAgreementID;
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
    var requestID = args.requestId;
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
        var commonHelper = require('*/cartridge/scripts/helper/CommonHelper');
        var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
        var skipShipAddressValidation;
        var checkStatusResult = paypalFacade.CheckStatusService(lineItemCntr, requestID, args.fundingSource);
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
        Logger.error('Error while executing method initSessionCallback in PayPal Adapter' + e);
    }
    return result;
}

/**
 * V2 Callback: Called after buyer approves on PayPal. Calls Check Status
 * and validates the response. V2 Check Status response does NOT contain
 * billTo/shipTo address fields, so this function skips address validation
 * against the response and only validates that the existing basket addresses
 * are complete.
 * @param {dw.order.LineItemCtnr} lineItemCntr - basket or order
 * @param {Object} args - callback args (requestId, fundingSource, billingAgreementFlag, etc.)
 * @returns {Object} result with success, payerID, transactionProcessorID, requestID, address flags
 */
function initPaypalV2Callback(lineItemCntr, args) {
    var result = {};
    var requestID = args.requestId;
    try {
        var paypalFacade = require('../facade/PayPalFacade');
        var commonHelper = require('*/cartridge/scripts/helper/CommonHelper');
        var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
        var checkStatusResult = paypalFacade.CheckStatusService(lineItemCntr, requestID, args.fundingSource);

        result.shippingAddressMissing = false;
        result.billingAddressMissing = false;

        if (!empty(checkStatusResult) && checkStatusResult.checkStatusResponse
            && Number(checkStatusResult.checkStatusResponse.reasonCode) === 100) {

            // If Check Status returned shipping details and the site pref allows
            // PayPal to override addresses, apply only the shipTo into the basket.
            var overrideAddressPaypalPreference = !CybersourceHelper.IsPaypalAddressOverride();
            var hasShipTo = checkStatusResult.checkStatusResponse.shipTo && (!empty(checkStatusResult.checkStatusResponse.shipTo.street1) || !empty(checkStatusResult.checkStatusResponse.shipTo.firstName));

            if (hasShipTo && overrideAddressPaypalPreference) {
                Transaction.wrap(function () {
                    var defaultShipment = lineItemCntr.getDefaultShipment();
                    var shippingAddress = defaultShipment ? defaultShipment.getShippingAddress() : null;
                    if (shippingAddress === null) {
                        shippingAddress = defaultShipment.createShippingAddress();
                    }
                    var shipTo = checkStatusResult.checkStatusResponse.shipTo;
                    if (!empty(shipTo.firstName)) { shippingAddress.setFirstName(shipTo.firstName); }
                    if (!empty(shipTo.lastName)) { shippingAddress.setLastName(shipTo.lastName); }
                    if (!empty(shipTo.street1)) { shippingAddress.setAddress1(shipTo.street1); }
                    if (!empty(shipTo.street2)) { shippingAddress.setAddress2(shipTo.street2); }
                    if (!empty(shipTo.city)) { shippingAddress.setCity(shipTo.city); }
                    if (!empty(shipTo.postalCode)) { shippingAddress.setPostalCode(shipTo.postalCode); }
                    if (!empty(shipTo.country)) { shippingAddress.setCountryCode(shipTo.country); }
                    if (!empty(shipTo.state)) { shippingAddress.setStateCode(shipTo.state); }
                    // Re-evaluate shipping method after applying shipTo
                    setShippingMethod(lineItemCntr);
                });
            }

            // Validate shipping address completeness (after possible update)
            var defaultShipment = lineItemCntr.getDefaultShipment();
            var shippingAddress = defaultShipment ? defaultShipment.getShippingAddress() : null;
            if (empty(shippingAddress) || empty(shippingAddress.firstName) || empty(shippingAddress.lastName)
                || empty(shippingAddress.address1) || empty(shippingAddress.city)
                || empty(shippingAddress.postalCode) || empty(shippingAddress.countryCode)
                || empty(shippingAddress.stateCode)) {
                result.shippingAddressMissing = true;
            }

            // Do NOT update billTo from check-status here — validate existing billing address only
            var billingAddress = lineItemCntr.getBillingAddress();
            if (empty(billingAddress) || empty(billingAddress.firstName) || empty(billingAddress.lastName)
                || empty(billingAddress.address1) || empty(billingAddress.city)
                || empty(billingAddress.postalCode) || empty(billingAddress.countryCode)
                || empty(billingAddress.stateCode) || empty(billingAddress.phone)
                || empty(lineItemCntr.customerEmail)) {
                result.billingAddressMissing = true;
            }

            // Ensure customer email is set if missing and customer is authenticated
            if (empty(lineItemCntr.customerEmail) && customer.authenticated) {
                Transaction.wrap(function () {
                    lineItemCntr.setCustomerEmail(customer.profile.email);
                });
                // Re-check after setting email
                if (!empty(billingAddress) && !empty(billingAddress.firstName) && !empty(billingAddress.lastName)
                    && !empty(billingAddress.address1) && !empty(billingAddress.city)
                    && !empty(billingAddress.postalCode) && !empty(billingAddress.countryCode)
                    && !empty(billingAddress.stateCode) && !empty(billingAddress.phone)
                    && !empty(lineItemCntr.customerEmail)) {
                    result.billingAddressMissing = false;
                }
            }

            result.success = true;
            result.transactionProcessorID = checkStatusResult.checkStatusResponse.apCheckStatusReply.processorTransactionID;
            result.requestID = checkStatusResult.checkStatusResponse.requestID;
            // V2 apReply may not have payerID — use args.payerID if available
            if (checkStatusResult.checkStatusResponse.apReply && checkStatusResult.checkStatusResponse.apReply.payerID) {
                result.payerID = checkStatusResult.checkStatusResponse.apReply.payerID;
            } else {
                result.payerID = args.payerID || '';
            }
        } else {
            result.success = false;
        }
    } catch (e) {
        Logger.error('Error while executing method initPaypalV2Callback in PayPal Adapter: ' + e);
        result.success = false;
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
    var isV2 = Site.getCurrent().getCustomPreferenceValue('CsEnablePayPalV2');
    try {
        var paymentTransaction = paymentInstrument.paymentTransaction;
        var paypalFacade = require('../facade/PayPalFacade');
        var response = paypalFacade.AuthorizeService(order, paymentInstrument);

        if (isV2) {
            // V2: apAuthReply.status = PENDING (success) or INVALID_REQUEST (failure)
            // PENDING means authorization accepted, PayPal is reviewing
            var v2Status = (!empty(response) && !empty(response.apAuthReply)) ? response.apAuthReply.status : '';
            if (!empty(response) && response.decision && response.decision.equals('ACCEPT') && Number(response.reasonCode) === 100 && (v2Status === 'PENDING' || v2Status === 'COMPLETED')) {
                Transaction.wrap(function () {
                    paymentTransaction.transactionID = response.requestID;
                    paymentTransaction.type = paymentTransaction.TYPE_AUTH;
                    paymentTransaction.custom.paymentStatus = v2Status;
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
            } else if (!empty(response) && response.decision && response.decision.equals('ACCEPT') && Number(response.reasonCode) === 100 && v2Status === 'INVALID_REQUEST') {
                result.error = true;
            } else if (!empty(response) && response.decision && response.decision.equals('REVIEW') && Number(response.reasonCode) === 480) {
                Transaction.wrap(function () {
                    paymentTransaction.transactionID = response.requestID;
                    paymentTransaction.custom.paymentStatus = v2Status;
                    if (!empty(response.apReply) && !empty(response.apReply.processorFraudDecisionReason)) {
                        paymentTransaction.custom.processorFraudDecisionReason = response.apReply.processorFraudDecisionReason;
                    }
                    paymentTransaction.custom.authProcessorTID = response.apAuthReply.processorTransactionID;
                    paymentTransaction.custom.authRequestID = response.requestID;
                    paymentTransaction.custom.authRequestToken = response.requestToken;
                });
                result.pending = true;
            } else if (!empty(response) && response.decision.equals('REJECT') && Number(response.reasonCode) === 481) {
                handlePayPalReject(paymentInstrument);
                result.rejected = true;
            } else {
                Logger.error('[PayPalAdapter] V2 Auth unexpected response: decision={0}, reasonCode={1}, status={2}',
                    response ? response.decision : 'null', response ? response.reasonCode : 'null', v2Status);
                result.error = true;
            }
        } else {
            // V1: apAuthReply.paymentStatus = AUTHORIZED, PENDING, etc.
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
        } // end V1 else
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
    
    // V2 Check: If V2 is enabled, we skip the separate OrderService step because
    // the order was already created in the initial session/createOrder step.
    // We proceed directly to Authorization.
    if (Site.getCurrent().getCustomPreferenceValue('CsEnablePayPalV2')) {
        var authResult = authorizeService(order, paymentInstrument);
        if (authResult.authorized) {
            result.authorized = true;
        } else if (authResult.pending) {
            result.pending = true;
        } else if (authResult.rejected) {
            result.rejected = true;
        } else {
            result.error = true;
        }
        return result;
    }

    // V1 Legacy Flow
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
    
    // V2 Check: If V2 is enabled, skip OrderService and go straight to Sale
    if (Site.getCurrent().getCustomPreferenceValue('CsEnablePayPalV2')) {
        saleOrderResponse = saleService(order, paymentInstrument);
        if (saleOrderResponse.authorized) {
            result.authorized = true;
        } else if (saleOrderResponse.pending) {
            result.pending = true;
        } else if (saleOrderResponse.rejected) {
            result.rejected = true;
        } else {
            result.error = true;
        }
        return result;
    }

    // V1 Legacy Flow
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
    var orderTypePref = dw.system.Site.getCurrent().getCustomPreferenceValue('CsPaypalOrderType');
    var orderType = orderTypePref ? orderTypePref.value : 'CUSTOM';
    var orderResponse = {};
    var isV2Enabled = Site.getCurrent().getCustomPreferenceValue('CsEnablePayPalV2');

    // V1: Check for billing agreement (saved payment credentials)
    if (!isV2Enabled) {
        var hasBillingAgreement = empty(customer.profile) ? false : !empty(customer.profile.custom.billingAgreementID);
        var paymentMethod = paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL) || paymentInstrument.paymentMethod.equals(CybersourceConstants.METHOD_PAYPAL_CREDIT);
        var billingAgreementsEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('payPalBillingAgreements');

        if (billingAgreementsEnabled && paymentMethod && hasBillingAgreement) {
            orderType = 'BILLINGAGREEMENT';
            Logger.debug('[PaypalAdapter] Using V1 billing agreement flow');
        }
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

function updateOrder(lineItemCntr, orderRequestID) {
    var result = {};
    if (lineItemCntr === null) {
        Logger.error('Basket is Empty!');
        result.success = false;
        return result;
    }
    if (!orderRequestID || !orderRequestID.orderRequestID) {
        Logger.error('[PaypalAdapter] UpdateOrder: Missing orderRequestID parameter');
        result.success = false;
        return result;
    }
    var paypalFacade = require(CybersourceConstants.PATH_FACADE + 'PayPalFacade');
    var response = paypalFacade.UpdateOrderServiceV2(lineItemCntr, orderRequestID.orderRequestID, orderRequestID.fundingSource);

    // Update Order returns apOrderReply (not apUpdateOrderReply)
    if (!empty(response) && Number(response.reasonCode) === 100 && response.apOrderReply && response.apOrderReply.status === 'COMPLETED') {
        result.success = true;
        Logger.debug('[PaypalAdapter] UpdateOrder success');
    } else {
        result.success = false;
        Logger.error('[PaypalAdapter] UpdateOrder failed - ReasonCode: {0}, Decision: {1}, Status: {2}',
            response ? response.reasonCode : 'null',
            response ? response.decision : 'null',
            response && response.apOrderReply ? response.apOrderReply.status : 'null');
    }
    return result;
}

function voidOrder(orderRequestID) {
    var result = {};
    if (orderRequestID === null) {
        Logger.error('OrderRequestID is missing!');
        result.success = false;
        return result;
    }
    var paypalFacade = require(CybersourceConstants.PATH_FACADE + 'PayPalFacade');
    var response = paypalFacade.VoidOrderServiceV2(orderRequestID);
    
    if (!empty(response) && Number(response.reasonCode) === 100 && response.apCancelReply && response.apCancelReply.status === 'VOIDED') {
        result.success = true;
    } else {
        result.success = false;
    }
    return result;
}

/**
 * Re-authorize a PayPal payment to refresh the 3-day honor period or update amount.
 * Per V2 spec: Requires both lineItemCntr (for purchaseTotals) and paymentInstrument (for orderRequestID).
 * @param {dw.order.LineItemCtnr} lineItemCntr - Order or basket
 * @param {dw.order.PaymentInstrument} paymentInstrument - Payment instrument with stored transaction data
 * @param {String} authRequestID - Previous authorization's requestID
 * @returns {Object} Result with success flag
 */
function reauthorize(lineItemCntr, paymentInstrument, authRequestID) {
    var result = {};
    if (lineItemCntr === null) {
        Logger.error('Basket is Empty!');
        result.success = false;
        return result;
    }
    if (!paymentInstrument) {
        Logger.error('Payment instrument is required for re-authorization!');
        result.success = false;
        return result;
    }
    var paypalFacade = require(CybersourceConstants.PATH_FACADE + 'PayPalFacade');
    // Updated call signature to include paymentInstrument per V2 spec
    var response = paypalFacade.ReauthorizeServiceV2(lineItemCntr, paymentInstrument, authRequestID);
    
    // Per V2 spec: COMPLETED status indicates successful re-auth (not just AUTHORIZED)
    if (!empty(response) && Number(response.reasonCode) === 100) {
        var paymentStatus = response.apAuthReply && response.apAuthReply.paymentStatus;
        if (paymentStatus === 'AUTHORIZED' || paymentStatus === 'COMPLETED') {
            result.success = true;
            result.requestID = response.requestID;
        } else {
            result.success = false;
            result.status = paymentStatus;
        }
    } else {
        result.success = false;
        result.reasonCode = response ? response.reasonCode : 'NO_RESPONSE';
    }
    return result;
}

module.exports = {
    InitiateExpressCheckout: initiateExpressCheckout,
    OrderService: orderService,
    AuthorizeService: authorizeService,
    SaleService: saleService,
    PaymentService: paymentService,
    SessionCallback: initSessionCallback,
    PaypalV2Callback: initPaypalV2Callback,
    BillingAgreementService: billingAgreementService,
    CustomOrder: customOrder,
    StandardOrder: standardOrder,
    UpdateOrder: updateOrder,
    VoidOrder: voidOrder,
    Reauthorize: reauthorize
};
