'use strict';

/* eslint-disable no-undef */
var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');

var klarnaFacade = require('*/cartridge/scripts/klarna/facade/KlarnaFacade');
var klarnaHelper = require('*/cartridge/scripts/klarna/helper/KlarnaHelper');
var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var Resource = require('dw/web/Resource');

server.post('GetSession', csrfProtection.generateToken, function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();

    var returnObject = {};

    //  Update billing address with posted form values and email param.
    klarnaHelper.updateBillingAddress(basket);

    // updating Payment Transaction amount for purchase object
    COHelpers.calculatePaymentTransaction(basket);

    //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if (!empty(basket.getPaymentInstruments())) {
        paymentInstrument = basket.getPaymentInstruments()[0];
    }

    //  Make sure payment information has been set.
    if (empty(paymentInstrument) || empty(paymentInstrument.paymentMethod) || (paymentInstrument.paymentMethod !== 'KLARNA')) {
        klarnaHelper.setKlarnaPaymentMethod(basket);
    }

    //  Initialize data.
    var signature = klarnaHelper.CreateKlarnaSecureKey(basket);
    var purchaseObject;
    var URLUtils = require('dw/web/URLUtils');
    var cancelURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'cancelfail', 'signature', encodeURIComponent(signature), 'cfk', true).toString();
    var successURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'klarna', 'signature', encodeURIComponent(signature)).toString();
    var failureURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'cancelfail', 'signature', encodeURIComponent(signature), 'cfk', true).toString();
    var klarnaPaymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    var UUID = basket.UUID;

    // Create billto, shipto, item and purchase total object
    var BillToObject = require('*/cartridge/scripts/cybersource/CybersourceBillToObject');
    var billTo = new BillToObject();
    // create billto, item and purchase total object
    var Locale = require('dw/util/Locale');
    var currentLocale = Locale.getLocale(req.locale.id);
    billTo.setCountry(currentLocale.country);

    // Handle billing address state and postal code for US and non-US addresses
    if (currentLocale.country === 'US') {
        // For US addresses, set dummy values if state or postal code is missing. Actual values will be updated later in session update.
        billTo.setState(basket.billingAddress.stateCode || 'CA');
        billTo.setPostalCode(basket.billingAddress.postalCode || '94043');
    } else {
        // For non-US addresses, use the billing address values directly
        billTo.setState(basket.billingAddress.stateCode || '');
        billTo.setPostalCode(basket.billingAddress.postalCode || '');
    }

    // Create billto, shipto, item and purchase total object
    if (!empty(basket.billingAddress.address1) || !empty(basket.defaultShipment.shippingAddress)) {
        var result = CommonHelper.CreateCyberSourceBillToObject(basket, true);
        billTo = result.billTo;
    }
    var shipTo;
    if (!empty(basket.defaultShipment.shippingAddress)) {
        result = CommonHelper.CreateCybersourceShipToObject(basket);
        shipTo = result.shipTo;
    }

    var result = CommonHelper.CreateCybersourcePurchaseTotalsObject(basket);
    purchaseObject = result.purchaseTotals;
    if (purchaseObject.currency === 'N/A' || purchaseObject.grandTotalAmount == 0) {
        var PurchaseTotalsObject = require('*/cartridge/scripts/cybersource/CybersourcePurchaseTotalsObject');
        var purchasetotals = new PurchaseTotalsObject();
        var StringUtils = require('dw/util/StringUtils');

        purchasetotals.setCurrency(basket.totalNetPrice.currencyCode);
        purchasetotals.setGrandTotalAmount(StringUtils.formatNumber(basket.totalNetPrice.value, '000000.00', CommonHelper.GetRequestLocale));

        purchaseObject = purchasetotals;
    }

    result = CommonHelper.CreateKlarnaItemObject(basket);
    var items = result.items;


    // Create a session object
    var sessionObject = {};
    sessionObject.billTo = billTo;
    if (shipTo)
        sessionObject.shipTo = shipTo;
    sessionObject.purchaseObject = purchaseObject;
    sessionObject.items = items;
    sessionObject.klarnaPaymentType = klarnaPaymentType;
    sessionObject.cancelURL = cancelURL;
    sessionObject.successURL = successURL;
    sessionObject.failureURL = failureURL;
    sessionObject.UUID = UUID;

    // call session method of facade to create session request
    var response = klarnaFacade.klarnaInitSessionService(sessionObject);

    // return the response as per decision and reason code
    if (response.decision === 'ACCEPT' && Number(response.reasonCode) === 100 && !empty(response.apSessionsReply.processorToken)) {
        // set the processor token into session variable
        session.privacy.processorToken = response.apSessionsReply.processorToken;
        session.privacy.requestID = response.requestID;
        returnObject.error = false;
        returnObject.decision = response.decision;
        returnObject.reasonCode = Number(response.reasonCode);
        returnObject.sessionToken = response.apSessionsReply.processorToken;
        //  Save token to session in case customer leaves billing page and goes back.
        session.privacy.klarna_client_token = response.apSessionsReply.processorToken;
        // returnObject.reconciliationID = response.apSessionsReply.reconciliationID;
    } else {
        returnObject.error = true;
        returnObject.decision = response.decision;
        returnObject.reasonCode = Number(response.reasonCode);
    }

    res.cacheExpiration(0);
    res.json(returnObject);
    next();
});

server.post('UpdateSession', csrfProtection.generateToken, function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();

    //  Make sure payment information has been set.
    if (empty(basket.getPaymentInstruments()) || empty(basket.getPaymentInstruments()[0].paymentMethod) || (basket.getPaymentInstruments()[0].paymentMethod !== 'KLARNA')) {
        klarnaHelper.setKlarnaPaymentMethod(basket);
    }
    // Recalculate payments and basket totals
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(basket);
        COHelpers.calculatePaymentTransaction(basket);
    });

    //  Initialize data.
    var signature = klarnaHelper.CreateKlarnaSecureKey(basket);
    var shipTo; var billTo; var
        purchaseObject;
    var URLUtils = require('dw/web/URLUtils');
    var cancelURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'cancelfail', 'signature', encodeURIComponent(signature), 'cfk', true).toString();
    var successURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'klarna', 'signature', encodeURIComponent(signature)).toString();
    var failureURL = URLUtils.https('COPlaceOrder-Submit', 'provider', 'cancelfail', 'signature', encodeURIComponent(signature), 'cfk', true).toString();
    var klarnaPaymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    var UUID = basket.UUID;

    // Create billto, shipto, item and purchase total object
    var result = CommonHelper.CreateCyberSourceBillToObject(basket, true);
    billTo = result.billTo;

    //  Use Klarna languge set in payment method custom attribute.
    var language = CommonHelper.GetRequestLocale();
    var paymentMethod = dw.order.PaymentMgr.getPaymentMethod(basket.getPaymentInstruments()[0].paymentMethod);
    if (!empty(paymentMethod) && paymentMethod.custom !== null && 'klarnaLocale' in paymentMethod.custom) {
        if (!empty(paymentMethod.custom.klarnaLocale.value)) {
            language = paymentMethod.custom.klarnaLocale.value;
        }
    }
    billTo.setLanguage(language);

    result = CommonHelper.CreateCybersourceShipToObject(basket);
    shipTo = result.shipTo;
    result = CommonHelper.CreateCybersourcePurchaseTotalsObject(basket);
    purchaseObject = result.purchaseTotals;
    result = CommonHelper.CreateKlarnaItemObject(basket);
    var items = result.items;

    // Create a session object
    var sessionObject = {};
    sessionObject.billTo = billTo;
    sessionObject.shipTo = shipTo;
    sessionObject.purchaseObject = purchaseObject;
    sessionObject.items = items;
    sessionObject.klarnaPaymentType = klarnaPaymentType;
    sessionObject.cancelURL = cancelURL;
    sessionObject.successURL = successURL;
    sessionObject.failureURL = failureURL;
    sessionObject.UUID = UUID;

    // call session method of facade to create session request
    var response = klarnaFacade.klarnaUpdateSessionService(sessionObject);
    var returnObject = {};

    // return the response as per decision and reason code
    if (response.decision === 'ACCEPT' && Number(response.reasonCode) === 100) {
        // set the processor token into session variable
        returnObject.error = false;
        returnObject.decision = response.decision;
        returnObject.reasonCode = Number(response.reasonCode);
        returnObject.sessionToken = response.apSessionsReply.processorToken;
        //  Save token to session in case customer leaves billing page and goes back.
        session.privacy.klarna_client_token = response.apSessionsReply.processorToken;
        // returnObject.reconciliationID = response.apSessionsReply.reconciliationID;
    } else {
        returnObject.error = true;
        returnObject.decision = response.decision;
        returnObject.reasonCode = Number(response.reasonCode);
        returnObject.errorMessage = Resource.msg('error.technical', 'checkout', null);
    }

    res.cacheExpiration(0);
    res.json(returnObject);
    next();
});

/**
 * Process Klarna authorization result callback and redirect the customer to the checkout step
 */
server.post('KlarnaAuthorizationCallback', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var HookMgr = require('dw/system/HookMgr');
    var PaymentMgr = require('dw/order/PaymentMgr');

    var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
    var collections = require('*/cartridge/scripts/util/collections');

    var Site = require('dw/system/Site');

    // Parse Klarna response from the request body
    var klarnaResponse = req.body ? JSON.parse(req.body) : null;

    // If response is missing, return error and redirect to cart
    if (!klarnaResponse) {
        res.json({
            success: false,
            errorMessage: 'Missing response.',
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var currentBasket = BasketMgr.getCurrentBasket();

    // If basket is missing, return error and redirect to cart
    if (!currentBasket) {
        res.json({
            success: false,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    // Convert Klarna shipping address to basket address format
    var klarnaDetails = klarnaHelper.mapKlarnaExpressCheckoutAddress(klarnaResponse.collected_shipping_address);

    // Store Klarna tokens and flags in session privacy
    if (klarnaResponse.authorization_token) {
        session.privacy.KlarnaPaymentsAuthorizationToken = klarnaResponse.authorization_token;
    }
    if (klarnaResponse.client_token) {
        session.privacy.klarna_client_token = klarnaResponse.client_token;
    }
    session.privacy.Klarna_IsExpressCheckout = true;
    session.privacy.Klarna_IsFinalizeRequired = klarnaResponse.finalize_required;

    // Validate products and inventory in the basket
    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error || !validatedProducts.hasInventory) {
        res.json({
            success: false,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    // Retrieve shipments from the basket
    var shipments = currentBasket.shipments;

    // Fill in shipping details for shipment
    var hasShippingMethod = true;
    collections.forEach(shipments, function (shipment) {
        // Copy Klarna address to shipment if not already set
        if (empty(shipment.custom.fromStoreId) && klarnaDetails) {
            COHelpers.copyCustomerAddressToShipment(klarnaDetails, shipment);
        }

        // Get available shipping methods for the shipment address
        var applicableShippingMethods = ShippingHelper.getApplicableShippingMethods(shipment, klarnaHelper.convAddressObj(shipment.shippingAddress));
        var hasShippingMethodSet = !!shipment.shippingMethod;

        applicableShippingMethods = new dw.util.ArrayList(applicableShippingMethods);
        // If a shipping method is set, check if it is still valid
        if (hasShippingMethodSet) {
            hasShippingMethodSet = collections.find(applicableShippingMethods, function (item) {
                return item.ID === shipment.shippingMethodID;
            });
        }

        // If no valid shipping method, select the first available one
        if (!hasShippingMethodSet) {
            var shippingMethod = collections.first(applicableShippingMethods);
            if (shippingMethod) {
                Transaction.wrap(function () {
                    ShippingHelper.selectShippingMethod(shipment, shippingMethod.ID);
                });
            } else {
                hasShippingMethod = false;
            }
        }
    });

    // Always update billing address and email from Klarna details
    if (klarnaDetails) {
        klarnaHelper.setBillingAddress(currentBasket, klarnaDetails);
    }

    // Remove any empty shipments from the basket
    Transaction.wrap(function () {
        COHelpers.ensureNoEmptyShipments(req);
    });

    var paymentMethodID = CybersourceConstants.KLARNA_PAYMENT_METHOD;

    // Handle the selection of this payment method - calculate if any payment promotions are available
    var result;
    var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();
    if (HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
        result = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(),
            'Handle',
            currentBasket,
            null,
            paymentMethodID,
            req
        );
    } else {
        result = HookMgr.callHook('app.payment.processor.default', 'Handle');
    }
    if (result.error) {
        res.json({
            success: false,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    // Recalculate payments and basket totals
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
        COHelpers.calculatePaymentTransaction(currentBasket);
    });

    // Decide which checkout stage to redirect to
    var stage;
    stage = 'placeOrder';

    if (!klarnaDetails) {
        stage = 'customer';
    }
    if (!hasShippingMethod) {
        // If shipping method is missing, redirect to shipping step
        stage = 'shipping';
    }

    res.json({
        success: true,
        redirectUrl: URLUtils.url('Checkout-Begin', 'stage', stage).toString()
    });
    return next();
});

server.get('saveKlarnaAuthDetails', function (req, res, next) {
    var token = req.httpHeaders['x-auth'];
    var finalizeRequired = req.httpHeaders['finalize-required'];

    if (finalizeRequired) {
        // Convert string 'true'/'false' to boolean true/false
        session.privacy.Klarna_IsFinalizeRequired = (finalizeRequired === 'true');
    }
    if (token) {
        session.privacy.KlarnaPaymentsAuthorizationToken = token;
    }

    res.setStatusCode(200);
});
/*
 * Module exports
 */
module.exports = server.exports();
