'use strict';

/**
 * script that performs handling of all redirect URL responses from cybersource.
 *
 * @module scripts/Provider
 */

/* API Includes */
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var Cybersource = require('~/cartridge/scripts/Cybersource');

/**
 * Process redirect url response of secure acceptance redirect
 */
// eslint-disable-next-line
function saredirect(args) {
    var secureAcceptanceAdapter = require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter');
    // eslint-disable-next-line
    var secureAcceptanceResponse = secureAcceptanceAdapter.SAResponse(request.httpParameterMap);
    var returnVariable;
    // eslint-disable-next-line
    session.privacy.order_id = request.httpParameterMap.req_reference_number.stringValue;
    switch (secureAcceptanceResponse.nextStep) {
        case CybersourceConstants.SA_SUBMITORDER: returnVariable = { submit: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_REVIEWORDER: returnVariable = { pending: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_SUMMARY: var PlaceOrderError = secureAcceptanceResponse.data;
            returnVariable = {
                cancelfail: true,
                // eslint-disable-next-line
                PlaceOrderError: !empty(PlaceOrderError) ? PlaceOrderError : new Status(Status.ERROR, 'confirm.error.declined')
            };
            break;
        case CybersourceConstants.SA_GOTO:
            returnVariable = {
                redirect: true,
                location: secureAcceptanceResponse.location,
                render: secureAcceptanceResponse.render
            };
            break;
        case CybersourceConstants.SA_CANCEL:
            returnVariable = {
                orderreview: true,
                location: secureAcceptanceResponse.location
            };
            break;
        default: break;
    }
    return returnVariable;
}

/**
 * Process redirect url response of secure acceptance iframe
 */
// eslint-disable-next-line
function saiframe(args) {
    var secureAcceptanceAdapter = require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter');
    // eslint-disable-next-line
    var secureAcceptanceResponse = secureAcceptanceAdapter.SAResponse(request.httpParameterMap);
    var returnVariable;
    // eslint-disable-next-line
    session.privacy.order_id = request.httpParameterMap.req_reference_number.stringValue;
    switch (secureAcceptanceResponse.nextStep) {
        case CybersourceConstants.SA_SUBMITORDER: returnVariable = { submit: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_REVIEWORDER: returnVariable = { pending: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_SUMMARY: var PlaceOrderError = secureAcceptanceResponse.data;
            returnVariable = {
                cancelfail: true,
                // eslint-disable-next-line
                PlaceOrderError: !empty(PlaceOrderError) ? PlaceOrderError : new Status(Status.ERROR, 'confirm.error.declined')
            };
            break;
        case CybersourceConstants.SA_GOTO: returnVariable = {
            redirect: true,
            location: secureAcceptanceResponse.location,
            render: secureAcceptanceResponse.render
        };
            break;
        default: break;
    }
    return returnVariable;
}

/**
 * Process redirect url response of alipay
 */
// eslint-disable-next-line
function alipay(Order) {
    var order = Order;
    var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var orderResult = Cybersource.GetOrder(order);
    if (orderResult.error) {
        return { carterror: true };
    }
    order = orderResult.Order;
    // call check status service
    var alipayResult = commonHelper.CheckStatusServiceRequest(order);
    /* show confirmation if check status service response is still pending,
     * for success, place the order and fail the order in case of failed response
     */
    if (alipayResult.pending) {
        return { pending: true, Order: order };
    } if (alipayResult.submit) {
        return { submit: true, Order: order };
    } if (alipayResult.error) {
        return { error: true, Order: order };
    }
}

/**
 * Process redirect url response of bank transfer
 */
// eslint-disable-next-line
function banktransfer(Order) {
    var order = Order;
    var bankAdaptor = require('~/cartridge/scripts/banktransfer/adaptor/BankTransferAdaptor');
    // get the order
    var orderResult = Cybersource.GetOrder(order);
    // check if payment method is not specific to bank transfer
    if (orderResult.error) {
        return { carterror: true };
    }
    order = orderResult.Order;
    // call check status service
    var bankTransferResult = bankAdaptor.CheckStatusServiceRequest(order);

    /* show confirmation if check status service response is still pending,
     * for success, place the order and fail the order in case of failed response
     */
    if (bankTransferResult.pending) {
        return { pending: true, Order: order };
    } if (bankTransferResult.submit) {
        return { submit: true, Order: order };
    } if (bankTransferResult.error || bankTransferResult.declined) {
        return { error: true, Order: order };
    }
}

/**
 * Process redirect url response of bank transfer
 * @param {*} Order Order
 * @returns {*} obj
 */
function klarna(Order) {
    var order = Order;
    var klarnaAdaptor = require('~/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var collections = require('*/cartridge/scripts/util/collections');
    // get the order
    var orderResult = klarnaAdaptor.GetKlarnaOrder(order);
    // check if payment method is not specific to bank transfer
    if (orderResult.error) {
        return { carterror: true };
    }
    order = orderResult.Order;

    /* show confirmation if check status service response is still pending,
     * for success, place the order and fail the order in case of failed response
     */
    var result;
    collections.forEach(order.paymentInstruments, function (paymentInstrument) {
    // for each(var paymentInstrument in order.paymentInstruments) {

        if (!paymentInstrument.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
            if (paymentInstrument.paymentTransaction.custom.apPaymentStatus !== null
                && CybersourceConstants.AUTHORIZED === paymentInstrument.paymentTransaction.custom.apPaymentStatus) {
                result = { submit: true, Order: order };
            } if (paymentInstrument.paymentTransaction.custom.apPaymentStatus !== null
                && CybersourceConstants.PENDING === paymentInstrument.paymentTransaction.custom.apPaymentStatus) {
                // call check status service
                var klarnaResult = klarnaAdaptor.CheckStatusServiceRequest(order);
                /* show confirmation if check status service response is still pending,
                 * for success, place the order and fail the order in case of failed response
                 */
                if (klarnaResult.pending) {
                    result = { pending: true, Order: order };
                } if (klarnaResult.submit) {
                    result = { submit: true, Order: order };
                } if (klarnaResult.error || klarnaResult.declined) {
                    result = { error: true, Order: order };
                } if (klarnaResult.review) {
                    result = { review: true, Order: order };
                }
            }
        }
    });
    return result;
}

/**
 * Process cancel or fail response from bank transfer
 */
// eslint-disable-next-line
function cancelfail(Order) {
    var order = Order;
    var orderResult = {};
    // eslint-disable-next-line
    if (!request.httpParameterMap.cfk.booleanValue) {
        orderResult = Cybersource.GetOrder(order);
    } else {
        var klarnaAdaptor = require('~/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');
        // eslint-disable-next-line
        orderResult = klarnaAdaptor.GetKlarnaOrder({ Order: args.Order });
    }
    order = orderResult.Order;
    if (orderResult.error) {
        return { carterror: true };
    }
    // eslint-disable-next-line
    session.privacy.SkipTaxCalculation = false;
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');
    var failResult = Transaction.wrap(function () {
        OrderMgr.failOrder(order, true);
        return {
            error: true,
            PlaceOrderError: orderResult.PlaceOrderError
        };
    });
    if (failResult.error) {
        return { cancelfail: true, PlaceOrderError: failResult.PlaceOrderError };
    }
}

/**
 * Process redirect url response of card 3d payer auth
 * @param {*} args args
 * @returns {*} obj
 */
function card(args) {
    var orderResult = Cybersource.GetOrder(args);
    if (orderResult.error) {
        return { carterror: true };
    }
    var order = orderResult.Order;
    /* eslint-disable */
    if (session.privacy.process3DRequest) {
        session.privacy.process3DRequest = false;
        session.privacy.process3DRequestParent = true;
        session.privacy.order_id = order.orderNo;
        return { load3DRequest: true, Order: order };
    } if (session.privacy.process3DRequestParent) {
        var process3DResult = Cybersource.Process3DRequestParent({ Order: order });
        if (process3DResult.fail) {
            return { error: true, Order: order };
        } if (process3DResult.review) {
            return { pending: true, Order: order };
        } if (process3DResult.home) {
            return { carterror: true, Order: order };
        }
    }
    /* eslint-enable */
    return { submit: true, Order: order };
}

/**
 * User is redirected to review order page, if order is not there then to cart page.
 * @param {*} order order
 * @returns {*} obj
 */
function saconfirm(order) {
    var orderResult = Cybersource.GetOrder(order);
    if (orderResult.error) {
        return { carterror: true };
    }
    return { pending: true, Order: orderResult.Order };
}

/**
 * User is redirected to submit order page.
 * @param {*} order order
 * @returns {*} obj
 */
function sasubmit(order) {
    var orderResult = Cybersource.GetOrder(order);
    if (orderResult.error) {
        return { carterror: true };
    }
    return { submit: true, Order: orderResult.Order };
}

/**
 * User is redirected to summary page with the error message, if order is not there then to cart page.
 * @param {*} order order
 * @returns {*} obj
 */
function safail(order) {
    var orderResult = Cybersource.GetOrder(order);
    if (orderResult.error) {
        return { carterror: true };
    }
    return { cancelfail: true };
}

/**
 * Switch case which ever provider is provided, according to that action is performed.
 * @param {*} args args
 * @returns {*} obj
 */
function check(args) {
    // eslint-disable-next-line
    var providerParam = request.httpParameterMap.provider.stringValue;
    var result = {};
    switch (providerParam) {
        case 'saredirect':
            result = saredirect(args);
            break;
        case 'saiframe':
            result = saiframe(args);
            break;
        case 'card':
            result = card(args);
            break;
        case 'alipay':
            result = alipay(args);
            break;
        case 'saconfirm':
            result = saconfirm(args);
            break;
        case 'sasubmit':
            result = sasubmit(args);
            break;
        case 'safail':
            result = safail(args);
            break;
        case 'banktransfer':
            result = banktransfer(args);
            break;
        case 'klarna':
            result = klarna(args);
            break;
        case 'cancelfail':
            result = cancelfail(args);
            break;
        default:
            result = { carterror: true };
            break;
    }
    return result;
}

/*
* Module exports
*/
exports.Check = check;
