'use strict';

/* eslint-disable no-undef */
var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');

var klarnaFacade = require('*/cartridge/scripts/klarna/facade/KlarnaFacade');
var klarnaHelper = require('*/cartridge/scripts/klarna/helper/KlarnaHelper');
var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');


/**
 * function
 * @param {*} basket basket
 */
function setKlarnaPaymentMethod(basket) {
    var Cart = require('*/cartridge/models/cart');
    var currentCart = new Cart(basket);
    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstruments(basket);
        basket.createPaymentInstrument('KLARNA', currentCart.getNonGiftCertificateAmount);
    });
}

/**
 * function
 * @param {*} basket basket
 * @returns {*} obj
 */
function CreateKlarnaSecureKey(basket) {
    // declare variables to create signature
    var sessionId = session.sessionID;
    var paymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    var merchantId = CybersourceHelper.getMerchantID();
    var amount = basket.totalGrossPrice.value;
    var token = sessionId + paymentType + merchantId + amount;
    // call method of common helper to create a signature
    var signature = CommonHelper.signedDataUsingHMAC256(token, null, paymentType);
    // return the signature
    return signature;
}

server.post('GetSession', csrfProtection.generateToken, function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();

    var returnObject = {};

    var email = session.forms.billing.klarnaEmail.value;

    if (email == null) {
        returnObject.error = true;
        returnObject.decision = 'REJECT';
        res.cacheExpiration(0);
        res.json(returnObject);
        next();
    }
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
        setKlarnaPaymentMethod(basket);
    }

    //  Initialize data.
    var signature = CreateKlarnaSecureKey(basket);
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
    billTo.setCountry(basket.billingAddress.countryCode);
    billTo.setState(basket.billingAddress.stateCode);
    billTo.setPostalCode(basket.billingAddress.postalCode);
    var result = CommonHelper.CreateCybersourcePurchaseTotalsObject(basket);
    purchaseObject = result.purchaseTotals;
    result = CommonHelper.CreateKlarnaItemObject(basket);
    var items = result.items;

    // Create a session object
    var sessionObject = {};
    sessionObject.billTo = billTo;
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
        session.privacy.klarnaSessionToken = response.apSessionsReply.processorToken;
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
        setKlarnaPaymentMethod(basket);
    }

    //  Initialize data.
    var signature = CreateKlarnaSecureKey(basket);
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
        session.privacy.klarnaSessionToken = response.apSessionsReply.processorToken;
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

/*
 * Module exports
 */
module.exports = server.exports();
