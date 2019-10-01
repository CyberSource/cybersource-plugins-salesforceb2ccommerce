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
function saredirect(args) {
    var secureAcceptanceAdapter = require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter');
    var secureAcceptanceResponse = secureAcceptanceAdapter.SAResponse(request.httpParameterMap);
    var returnVariable;
    session.privacy.order_id = request.httpParameterMap.req_reference_number.stringValue;
    switch (secureAcceptanceResponse.nextStep) {
        case CybersourceConstants.SA_SUBMITORDER: returnVariable = { submit: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_REVIEWORDER: returnVariable = { pending: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_SUMMARY: var PlaceOrderError = secureAcceptanceResponse.data;
            returnVariable = {
                cancelfail: true,
                PlaceOrderError: !empty(PlaceOrderError) ? PlaceOrderError : new Status(Status.ERROR, "confirm.error.declined")
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
				orderreview : true, 
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
function saiframe(args) {
    var secureAcceptanceAdapter = require('~/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter');
    var secureAcceptanceResponse = secureAcceptanceAdapter.SAResponse(request.httpParameterMap);
    var returnVariable;
    session.privacy.order_id = request.httpParameterMap.req_reference_number.stringValue;
    switch (secureAcceptanceResponse.nextStep) {
        case CybersourceConstants.SA_SUBMITORDER: returnVariable = { submit: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_REVIEWORDER: returnVariable = { pending: true, Order: secureAcceptanceResponse.data };
            break;
        case CybersourceConstants.SA_SUMMARY: var PlaceOrderError = secureAcceptanceResponse.data;
            returnVariable = {
                cancelfail: true,
                PlaceOrderError: !empty(PlaceOrderError) ? PlaceOrderError : new Status(Status.ERROR, "confirm.error.declined")
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
function alipay(order) {

    var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var orderResult = Cybersource.GetOrder(order);
    if (orderResult.error) {
        return { carterror: true };
    }
    var order = orderResult.Order;
    //call check status service
    var alipayResult = commonHelper.CheckStatusServiceRequest(order);
	/*show confirmation if check status service response is still pending,
	 * for success, place the order and fail the order in case of failed response
	 */
    if (alipayResult.pending) {
        return { pending: true, Order: order };
    } else if (alipayResult.submit) {
        return { submit: true, Order: order };
    } else if (alipayResult.error) {
        return { error: true, Order: order };
    }
}

/**
 * Process redirect url response of bank transfer
 */
function banktransfer(order) {

    var bankAdaptor = require('~/cartridge/scripts/banktransfer/adaptor/BankTransferAdaptor');
    // get the order
    var orderResult = Cybersource.GetOrder(order);
    //check if payment method is not specific to bank transfer
    if (orderResult.error) {
        return { carterror: true };
    }
    var order = orderResult.Order;
    //call check status service
    var bankTransferResult = bankAdaptor.CheckStatusServiceRequest(order);

	/*show confirmation if check status service response is still pending,
	 * for success, place the order and fail the order in case of failed response
	 */
    if (bankTransferResult.pending) {
        return { pending: true, Order: order };
    } else if (bankTransferResult.submit) {
        return { submit: true, Order: order };
    } else if (bankTransferResult.error || bankTransferResult.declined) {
        return { error: true, Order: order };
    }
}

/**
 * Process redirect url response of bank transfer
 */
function klarna(order) {

    var klarnaAdaptor = require('~/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    // get the order
    var orderResult = klarnaAdaptor.GetKlarnaOrder(order);
    //check if payment method is not specific to bank transfer
    if (orderResult.error) {
        return { carterror: true };
    }
    var order = orderResult.Order;

	/*show confirmation if check status service response is still pending,
	 * for success, place the order and fail the order in case of failed response
	 */
    for each(var paymentInstrument in order.paymentInstruments) {
        if (!paymentInstrument.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
            if (paymentInstrument.paymentTransaction.custom.apPaymentStatus !== null
                && CybersourceConstants.AUTHORIZED === paymentInstrument.paymentTransaction.custom.apPaymentStatus) {
                return { submit: true, Order: order };
            } else if (paymentInstrument.paymentTransaction.custom.apPaymentStatus !== null
                && CybersourceConstants.PENDING === paymentInstrument.paymentTransaction.custom.apPaymentStatus) {
                //call check status service
                var klarnaResult = klarnaAdaptor.CheckStatusServiceRequest(order);
				/*show confirmation if check status service response is still pending,
				 * for success, place the order and fail the order in case of failed response
				 */
                if (klarnaResult.pending) {
                    return { pending: true, Order: order };
                } else if (klarnaResult.submit) {
                    return { submit: true, Order: order };
                } else if (klarnaResult.error || klarnaResult.declined) {
                    return { error: true, Order: order };
                } else if (klarnaResult.review) {
                    return { review: true, Order: order };
                }
            }
        }
    }
}

/**
 * Process cancel or fail response from bank transfer
 */
function cancelfail(order) {

    var orderResult = {};
    if (!request.httpParameterMap.cfk.booleanValue) {
        orderResult = Cybersource.GetOrder(order);
    } else {
        var klarnaAdaptor = require('~/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');
        orderResult = klarnaAdaptor.GetKlarnaOrder({ Order: args.Order });
    }
    var order = orderResult.Order;
    if (orderResult.error) {
        return { carterror: true };
    }
    session.custom.SkipTaxCalculation = false;
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
    return;
}

/**
 * Process redirect url response of card 3d payer auth
 */
function card(args) {
    var orderResult = Cybersource.GetOrder(args);
    if (orderResult.error) {
        return { carterror: true };
    }
    var order = orderResult.Order;
    if (session.privacy.process3DRequest) {
        session.privacy.process3DRequest = false;
        session.privacy.process3DRequestParent = true;
        session.privacy.order_id = order.orderNo;
        return { load3DRequest: true, Order: order };
    } else if (session.privacy.process3DRequestParent) {
        var process3DResult = Cybersource.Process3DRequestParent({ Order: order });
        if (process3DResult.fail) {
            return { error: true, Order: order };
        } else if (process3DResult.review) {
            return { pending: true, Order: order };
        } else if (process3DResult.home) {
            return { carterror: true, Order: order };
        }
    }
    return { submit: true, Order: order };
}

/**
 * User is redirected to review order page, if order is not there then to cart page. 
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
 */

function check(args) {
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