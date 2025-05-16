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
var BasketMgr = require('dw/order/BasketMgr');
var OrderMgr = require('dw/order/OrderMgr');


/**
 * This function is to handle the post payment authorization customizations
 * @param {Object} result - Authorization Result
 */
function postAuthorization(handlePaymentResult, order, options) { // eslint-disable-line no-unused-vars

    var currentBasket = options.currentBasket;
    var DFReferenceId = options.DFReferenceId;
    var req = options.req;
    var res = options.res;
    var paymentInstrument;

    if (!empty(order.getPaymentInstruments())) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }
    //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    if (handlePaymentResult.sca) {
        session.privacy.paSetup = true;
        res.redirect(URLUtils.url('CheckoutServices-PlaceOrder'));
        return { handleNext: true };
    }
    
    if (handlePaymentResult.error) {
        if (paymentInstrument.paymentMethod != null
            && (paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.creditcard', 'cybersource', null)
                || (CsSAType == Resource.msg('cssatype.SA_REDIRECT', 'cybersource', null)
                    || CsSAType == Resource.msg('cssatype.SA_SILENTPOST', 'cybersource', null)
                    || CsSAType == Resource.msg('cssatype.SA_FLEX', 'cybersource', null)))
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.alipay', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.sof', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.idl', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.mch', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.paypalcredit', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.googlepay', 'cybersource', null)


        ) {
            res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'PlaceOrderError', Resource.msg('error.technical', 'checkout', null)));
        } else {
            res.json({
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
        }
        return { handleNext: true };
    } if (handlePaymentResult.returnToPage) {
        res.render('secureacceptance/secureAcceptanceIframeSummmary', {
            Order: handlePaymentResult.order
        });
        return { handleEmitRouteComplete: true };
    } if (handlePaymentResult.intermediate) {
        res.render(handlePaymentResult.renderViewPath, {
            alipayReturnUrl: handlePaymentResult.alipayReturnUrl
        });
        return { handleEmitRouteComplete: true };
    } if (handlePaymentResult.intermediateSA) {
        res.render(handlePaymentResult.renderViewPath, {
            Data: handlePaymentResult.data, FormAction: handlePaymentResult.formAction
        });
        return { handleEmitRouteComplete: true };
    } if (handlePaymentResult.intermediateSilentPost) {
        res.render(handlePaymentResult.renderViewPath, {
            requestData: handlePaymentResult.data, formAction: handlePaymentResult.formAction, cardObject: handlePaymentResult.cardObject
        });
        return { handleEmitRouteComplete: true };
    }
    if (handlePaymentResult.redirection) {
        res.redirect(handlePaymentResult.redirectionURL);
        return { handleEmitRouteComplete: true };
    }

    //  Set order confirmation status to not confirmed for REVIEW orders.
    if (session.privacy.CybersourceFraudDecision === 'REVIEW') {
        var Order = require('dw/order/Order');
        Transaction.wrap(function () {
            // eslint-disable-next-line
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        });

        if (CybersourceConstants.BANK_TRANSFER_PROCESSOR.equals(order.paymentTransaction.paymentProcessor.ID)) {
            res.redirect(handlePaymentResult.redirectionURL);
            return { handleEmitRouteComplete: true };
        }
    }

    if (handlePaymentResult.declined) {
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
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.klarna', 'cybersource', null)
            || paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.paypalcredit', 'cybersource', null)
        ) {
            res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
        } else {
            res.json({
                error: true,
                errorMessage: Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)
            });
        }
        return { handleNext: true };
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
            res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'PlaceOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
        } else {
            res.json({
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
        }
        return { handleNext: true };
    } if (handlePaymentResult.rejected) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        Transaction.wrap(function () {
            COHelpers.handlePayPal(currentBasket);
        });
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)).toString());
        return { handleNext: true };
    } if (handlePaymentResult.process3DRedirection) {
        res.redirect(URLUtils.url('CheckoutServices-PayerAuthentication', 'accessToken', handlePaymentResult.jwt));
        return { handleNext: true };
    }
    if (handlePaymentResult.processWeChat) {
        res.render('checkout/confirmation/weChatConfirmation', {
            paymentResult: handlePaymentResult,
            weChatQRCode: handlePaymentResult.WeChatMerchantURL,
            orderNo: order.orderNo,
            order: order,
            noOfCalls: CybersourceHelper.getNumofCheckStatusCalls() != null ? CybersourceHelper.getNumofCheckStatusCalls() : 6,
            serviceCallInterval: CybersourceHelper.getServiceCallInterval() != null ? CybersourceHelper.getServiceCallInterval() : 10
        });
        return { handleEmitRouteComplete: true };
    }

    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return { handleNext: true };
    }

    // Places the order
    if (handlePaymentResult.authorized) {
        var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
        if (placeOrderResult.error) {
            res.json({
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
            return { handleNext: true };
        }
    }

    session.privacy.paypalShippingIncomplete = '';
    session.privacy.paypalBillingIncomplete = '';
    // eslint-disable-next-line
    COHelpers.sendConfirmationEmail(order, req.locale.id);

    //  Reset decision session variable
    session.privacy.CybersourceFraudDecision = '';
    session.privacy.SkipTaxCalculation = false;
    session.privacy.cartStateString = null;

    // Handle Authorized status for Payer Authentication flow
    if (DFReferenceId !== undefined && (handlePaymentResult.authorized || handlePaymentResult.review)) {
        // eslint-disable-next-line
        res.redirect(URLUtils.url('COPlaceOrder-SubmitOrderConformation', 'ID', order.orderNo, 'token', order.orderToken));
        return { handleNext: true };
    }

    if ((handlePaymentResult.authorized || handlePaymentResult.review) && (paymentInstrument.paymentMethod === Resource.msg('paymentmethodname.googlepay', 'cybersource', null) || (paymentInstrument.paymentMethod === Resource.msg('paymentmethodname.paypal', 'cybersource', null) && !session.privacy.paypalminiCart)) || paymentInstrument.paymentMethod === Resource.msg('paymentmethodname.paypalcredit', 'cybersource', null)) {
        // eslint-disable-next-line
        res.redirect(URLUtils.url('COPlaceOrder-SubmitOrderConformation', 'ID', order.orderNo, 'token', order.orderToken));
        return { handleNext: true };
    }

}

exports.postAuthorization = postAuthorization;
