'use strict';

/* eslint-disable no-undef */
var server = require('server');

var OrderMgr = require('dw/order/OrderMgr');
var HookMgr = require('dw/system/HookMgr');
var BasketMgr = require('dw/order/BasketMgr');
var URLUtils = require('dw/web/URLUtils');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var OrderModel = require('*/cartridge/models/order');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

// eslint-disable-next-line
server.use('Submit', csrfProtection.generateToken, function (req, res, next) {
    var order;
    if (!empty(req.querystring.order_id)) {
        order = OrderMgr.getOrder(req.querystring.order_id);
    } else {
        order = OrderMgr.getOrder(session.privacy.orderId);
    }
    if (!empty(order) && !empty(order.orderToken)) {
        // eslint-disable-next-line
        var orderToken = order.orderToken;
    }
    var Provider = require('*/cartridge/scripts/Provider');
    var providerParam = req.querystring.provider;
    // var processorTransactionId;
    COHelpers.clearPaymentAttributes();

    //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if (!empty(order) && !empty(order.getPaymentInstruments())) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }

    if (!empty(providerParam)) {
        var providerResult = Provider.Check(order);
        if (!empty(providerResult)) {
            if (providerResult.pending) {
                COHelpers.reviewOrder(providerResult.Order.orderNo, req, res, next);
                return next();
            } if (providerResult.load3DRequest) {
                res.render('cart/payerAuthenticationRedirect');
                return next();
            } if (providerResult.submit) {
                COHelpers.submitOrder(providerResult.Order.orderNo, req, res, next);
                return next();
            } if (providerResult.error) {
                var args = { Order: providerResult.Order };
                COHelpers.failOrder(args);
                res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', dw.web.Resource.msg('payerauthentication.carderror', 'cybersource', null)));
                return next();
            } if (providerResult.cancelfail) {
                var ReasonCode = request.httpParameterMap.SecureAcceptanceError.stringValue;
                if (!ReasonCode) {
                    ReasonCode = request.httpParameterMap.reason_code.stringValue;
                }
                res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'SecureAcceptanceError', ReasonCode));
                return next();
            } if (providerResult.carterror) {
                res.redirect(URLUtils.url('Cart-Show'));
                return next();
            } if (providerResult.redirect) {
                res.render(providerResult.render, {
                    Location: providerResult.location
                });
                return next();
            } if (providerResult.orderreview) {
                res.redirect(providerResult.location);
                return next();
            }
            if (providerResult.sca) {
                session.privacy.orderId = order.orderNo;
                res.redirect(URLUtils.https('COPlaceOrder-PayerAuth'));
                return next();
            }
        }
    } else if (!empty(paymentInstrument) && paymentInstrument.paymentMethod === 'DW_APPLE_PAY') {
        COHelpers.submitApplePayOrder(order, req, res, next);
    }
});

server.get('SilentPostSubmitOrder', csrfProtection.generateToken, function (req, res, next) {
    var orderId = session.privacy.orderId;
    COHelpers.submitOrder(orderId, req, res, next);
});

server.get('SilentPostReviewOrder', csrfProtection.generateToken, function (req, res, next) {
    var orderId = session.privacy.orderId;
    COHelpers.reviewOrder(orderId, req, res, next);
});

// Route to perform the payer auth setup and device data collection for silentpost and retrigger them for SCA cases.
server.post('PayerAuth', csrfProtection.generateToken, function (req, res, next) {

    var Resource = require('dw/web/Resource');
    var Site = require('dw/system/Site');
    var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
    var creditCardType;
    // var currentBasket = BasketMgr.getCurrentBasket();
    var URLUtils = require('dw/web/URLUtils');
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
    var CardFacade = require('*/cartridge/scripts/facade/CardFacade');
    var VisaCheckoutFacade = require('*/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
    var Transaction = require('dw/system/Transaction');

    var order = OrderMgr.getOrder(session.privacy.orderId);
    if (!order) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }
    var action;
    //if SA type is silentpost, check if Payer auth is enabled for the card type. if not enabled redirect to CheckoutServices-SilentPostAuthorize route. if payer auth is enabled, continue with PA setup and DDC.
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    if (CsSAType == Resource.msg('cssatype.SA_SILENTPOST', 'cybersource', null)) {
        action = URLUtils.url('CheckoutServices-SilentPostAuthorize');
        creditCardType = order.paymentInstrument.creditCardType;

        if (creditCardType == null) {
            creditCardType = session.forms.billing.creditCardFields.cardType.value;
        }

        var cardResult = CardHelper.PayerAuthEnable(creditCardType);
        if (cardResult.error) {
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
            return next();
        }

        if (!cardResult.paEnabled) {
            res.render('payerauthentication/3dsRedirect', {
                action: action
            });
            return next();
        }
    }
    else {
        action = URLUtils.url('COPlaceOrder-HandleSCARetrigger');
    }
    // delete session.privacy.PASetupMerchantRefCode;
    var paymentInstrument = null;
    if (!empty(order.getPaymentInstruments())) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }
    var paymentMethodID = paymentInstrument.paymentMethod;

    var result;
    if (paymentMethodID.equals(CybersourceConstants.METHOD_VISA_CHECKOUT)) {
        result = VisaCheckoutFacade.PayerAuthSetup(order.orderNo);
    } else {
        result = CardFacade.PayerAuthSetup(paymentInstrument, order.orderNo, session.forms.billing.creditCardFields);
    }
    Transaction.wrap(function () {
        paymentInstrument.custom.PayerAuthSetupReferenceID = result.referenceID;
        paymentInstrument.custom.PASetupMerchantRefCode = null;
    });
    if (result.deviceDataCollectionURL == null) {
        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }
    res.setContentType('application/json');
    res.render('payerauthentication/deviceDataCollection', {
        jwtToken: result.accessToken,
        referenceID: result.referenceID,
        ddcUrl: result.deviceDataCollectionURL,
        action: action
    });
    return next();
});

server.post('HandleSCARetrigger', csrfProtection.generateToken, function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');

    // Handle browser fields if submitted
    if (request.httpParameterMap.browserfields.submitted) {
        var browserfields = request.httpParameterMap.browserfields.value;
        if (browserfields) {
            var parsedBrowserfields = JSON.parse(browserfields);
            session.privacy.screenWidth = parsedBrowserfields.screenWidth;
            session.privacy.screenHeight = parsedBrowserfields.screenHeight;
        }
    }

    var order = OrderMgr.getOrder(session.privacy.orderId);
    if (!order) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }

    // Handles payment authorization (retrigger)
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);


    // Handle different payment result scenarios
    if (handlePaymentResult.error) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        delete session.privacy.orderId;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }

    if (handlePaymentResult.declined) {
        session.privacy.SkipTaxCalculation = false;
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        delete session.privacy.orderId;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
        return next();
    }

    if (handlePaymentResult.rejected) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        delete session.privacy.orderId;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)));
        return next();
    }

    // Handle 3D Redirection
    if (handlePaymentResult.process3DRedirection) {
        res.redirect(URLUtils.url('CheckoutServices-PayerAuthentication', 'accessToken', handlePaymentResult.jwt));
        return next();
    }

    // Handle authorized or review status
    if (handlePaymentResult.authorized || handlePaymentResult.review) {
        var HookMgr = require('dw/system/HookMgr');
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();

        // Run fraud detection
        var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
        if (fraudDetectionStatus.status === 'fail') {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            delete session.privacy.orderId;
            res.redirect(URLUtils.https('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode));
            return next();
        }

        // Place the order
        var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
        if (placeOrderResult.error) {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
            delete session.privacy.orderId;
            res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('error.technical', 'checkout', null)));
            return next();
        }

        // Save addresses to customer address book if logged in
        if (req.currentCustomer && req.currentCustomer.addressBook) {
            var allAddresses = addressHelpers.gatherShippingAddresses(order);
            allAddresses.forEach(function (address) {
                if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                    addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address));
                }
            });
        }
        //  Set order confirmation status to not confirmed for REVIEW orders.
        if (session.privacy.CybersourceFraudDecision === 'REVIEW') {
            var Order = require('dw/order/Order');
            Transaction.wrap(function () {
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
            });
        }
        // Send confirmation email
        if (order.getCustomerEmail()) {
            COHelpers.sendConfirmationEmail(order, req.locale.id);
        }

        // Clean up session
        delete session.privacy.orderId;
        req.session.privacyCache.set('usingMultiShipping', false);

        // Redirect to order confirmation
        res.redirect(URLUtils.url('COPlaceOrder-SubmitOrderConformation', 'ID', order.orderNo, 'token', order.orderToken).toString());
        return next();
    }

    // Default case - unexpected result
    Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
    delete session.privacy.orderId;
    res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
    return next();
});

server.get('SubmitOrderConformation', csrfProtection.generateToken, function (req, res, next) {
    var orderId = req.querystring.ID;
    var token = req.querystring.token;
    delete session.privacy.orderId;
    res.render('cart/RedirectToConformation', {
        orderId: orderId,
        orderToken: token
    });
    return next();
});
module.exports = server.exports();
