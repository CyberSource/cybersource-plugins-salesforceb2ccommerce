'use strict';

var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var Site = require('dw/system/Site');
var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
var Transaction = require('dw/system/Transaction');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var klarnaHelper = require('*/cartridge/scripts/klarna/helper/KlarnaHelper');
var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');


/**
 * This function is to handle the post payment authorization customizations
 * @param {Object} handlePaymentResult - Authorization Result
 * @param {Object} order - Order object
 * @param {Object} options - Options object containing req, res, etc.
 */
function postAuthorization(handlePaymentResult, order, options) { // eslint-disable-line no-unused-vars
    var Logger = require('dw/system/Logger');
    Logger.debug('postAuthorization hook called with handlePaymentResult: ' + JSON.stringify(handlePaymentResult));

    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var req = options.req;
    var res = options.res;

    session.privacy.orderId = order.orderNo;

    var paymentInstrument;

    if (!empty(order.getPaymentInstruments())) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }
    if (handlePaymentResult.sca) {
        return {
            error: false,
            orderID: order.orderNo,
            orderToken: order.orderToken,
            continueUrl: URLUtils.url('CheckoutServices-PayerAuthSetup').toString()
        };
    }

    if (handlePaymentResult.performPayerAuthSetup) {
        return {
            error: false,
            orderID: order.orderNo,
            orderToken: order.orderToken,
            continueUrl: URLUtils.url('CheckoutServices-PayerAuthSetup').toString()
        };
    }

    if (handlePaymentResult.error) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        klarnaHelper.clearKlarnaSessionVariables();
        return {
            error: true,
            redirectUrl: URLUtils.url('Checkout-Begin', 'stage', 'payment', 'PlaceOrderError', Resource.msg('error.technical', 'checkout', null)).toString()
        };
    } if (handlePaymentResult.returnToPage) {
        return {
            error: false,
            continueUrl: URLUtils.url('CheckoutServices-ProcessingPayment').toString(),
            renderTemplate: 'secureacceptance/secureAcceptanceIframeSummmary',
            orderID: order.orderNo,
        };
    } if (handlePaymentResult.intermediate) {
        return {
            error: false,
            continueUrl: URLUtils.url('CheckoutServices-ProcessingPayment').toString(),
            renderTemplate: handlePaymentResult.renderViewPath,
            templateData: {
                alipayReturnUrl: handlePaymentResult.alipayReturnUrl
            },
        };
    } if (handlePaymentResult.intermediateSA) { //SA - redirect
        return {
            error: false,
            continueUrl: URLUtils.url('CheckoutServices-ProcessingPayment').toString(),
            renderTemplate: handlePaymentResult.renderViewPath,
            templateData: {
                requestData:  CommonHelper.convertHashMapToJSONString(handlePaymentResult.data),
                FormAction: handlePaymentResult.formAction
            },
        };
    } if (handlePaymentResult.intermediateSilentPost) {
        return {
            error: false,
            continueUrl: URLUtils.url('CheckoutServices-ProcessingPayment').toString(),
            renderTemplate: handlePaymentResult.renderViewPath,
            templateData: {
                requestData:  CommonHelper.convertHashMapToJSONString(handlePaymentResult.data),
                formAction: handlePaymentResult.formAction,
                cardObject: handlePaymentResult.cardObject
            },
        };
    }
    if (handlePaymentResult.redirection) {
        klarnaHelper.clearKlarnaSessionVariables();

        return {
            error: false,
            continueUrl: handlePaymentResult.redirectionURL
        };
    }

    //  Set order confirmation status to not confirmed for REVIEW orders.
    if (session.privacy.CybersourceFraudDecision === 'REVIEW') {
        var Order = require('dw/order/Order');
        Transaction.wrap(function () {
            // eslint-disable-next-line
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        });

        if (CybersourceConstants.BANK_TRANSFER_PROCESSOR.equals(order.paymentTransaction.paymentProcessor.ID)) {
            return {
                error: false,
                continueUrl: handlePaymentResult.redirectionURL
            };
        }
    }
    
    if (handlePaymentResult.declined) {
        session.privacy.SkipTaxCalculation = false;
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            klarnaHelper.clearKlarnaSessionVariables();
            return {
                error: true,
                errorMessage: Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)
            };
    }
    if (handlePaymentResult.missingPaymentInfo) {
        session.privacy.SkipTaxCalculation = false;
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

        if (paymentInstrument.paymentMethod != null
            && (paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.creditcard', 'cybersource', null)
                && (CsSAType == Resource.msg('cssatype.SA_REDIRECT', 'cybersource', null)
                    || CsSAType == Resource.msg('cssatype.SA_SILENTPOST', 'cybersource', null)))
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.alipay', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.sof', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.idl', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.mch', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.paypalcredit', 'cybersource', null)
        ) {
            return {
                error: true,
                errorMessage: Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)
            };
        } else {
            return {
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            };
        }
    } if (handlePaymentResult.rejected) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        Transaction.wrap(function () {
            COHelpers.handlePayPal(currentBasket);
        });
        return {
            error: true,
            errorMessage: Resource.msg('payerauthentication.carderror', 'cybersource', null)
        };
    } if (handlePaymentResult.process3DRedirection) {
        return {
            error: false,
            stepUp: true,
            accessToken: handlePaymentResult.jwt,
            stepUpUrl: handlePaymentResult.stepUpUrl,
            sessionID: session.sessionID
        };
    }
    if (handlePaymentResult.processWeChat) {
        return {
            error: false,
            continueUrl: URLUtils.url('CheckoutServices-ProcessingPayment').toString(),
            renderTemplate: 'checkout/confirmation/weChatConfirmation',
            templateData: {
                weChatQRCode: handlePaymentResult.WeChatMerchantURL,
                orderNo: order.orderNo,
                noOfCalls: CybersourceHelper.getNumofCheckStatusCalls() != null ? CybersourceHelper.getNumofCheckStatusCalls() : 6,
                serviceCallInterval: CybersourceHelper.getServiceCallInterval() != null ? CybersourceHelper.getServiceCallInterval() : 10
            },
        };;
    }

    session.privacy.paypalShippingIncomplete = '';
    session.privacy.paypalBillingIncomplete = '';

    //  Reset decision session variable
    session.privacy.CybersourceFraudDecision = '';
    session.privacy.SkipTaxCalculation = false;
    session.privacy.cartStateString = null;

    delete session.privacy.orderId;

    klarnaHelper.clearKlarnaSessionVariables();
}

exports.postAuthorization = postAuthorization;
