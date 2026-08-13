'use strict';

/**
 * Helpers for running the Payer Auth Setup service call and for carrying the Device Data
 * Collection (DDC) browser fields through checkout.
 *
 * The Flex Microform flow calls the setup service as soon as the shopper finishes entering card
 * details, which is before SFRA has created a payment instrument on the basket. The returned
 * reference ID is therefore parked on the session and copied onto the payment instrument during
 * CheckoutServices-SubmitPayment, from where it travels to the order payment instrument when the
 * order is created.
 */

/* eslint-disable no-undef */

var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');

//  Browser fields accepted from the client. Anything else in the posted payload is dropped.
var BROWSER_FIELD_NAMES = [
    'httpBrowserScreenWidth',
    'httpBrowserScreenHeight',
    'httpBrowserColorDepth',
    'httpBrowserJavaEnabled',
    'httpBrowserJavaScriptEnabled',
    'httpBrowserLanguage',
    'httpBrowserTimeDifference',
    'httpUserAgent',
    'deviceChannel'
];

//  session.privacy only holds short strings, so cap the user agent rather than risk a write failure.
var MAX_USER_AGENT_LENGTH = 256;

/**
 * Checks whether payer authentication should run for a given card type.
 * Mirrors the conditions AuthorizePayer applies, but without needing a payment instrument.
 * @param {string} cardType - card type as configured on the payment card (e.g. 'Visa')
 * @returns {boolean} true when payer authentication is enabled for this card type
 */
function isApplicable(cardType) {
    var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
    if (empty(CybersourceHelper.getPAMerchantID())) {
        Logger.debug('[PayerAuthSetupHelper] Payer auth not applicable: no CsPaMerchantId configured');
        return false;
    }

    var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
    var payerAuthEnabled = CardHelper.PayerAuthEnable(cardType);
    if (payerAuthEnabled.error) {
        Logger.debug('[PayerAuthSetupHelper] Payer auth not applicable for card type "{0}": {1}', cardType, payerAuthEnabled.errorMsg);
        return false;
    }

    //  Truthiness rather than === true: csEnablePayerAuthentication is a boolean custom attribute, and
    //  a strict comparison would wrongly reject it if it ever arrives as a Java Boolean wrapper. A
    //  disabled card is false, which is falsy either way.
    var enabled = !!payerAuthEnabled.paEnabled;
    Logger.debug('[PayerAuthSetupHelper] Payer auth for card type "{0}": {1}', cardType, enabled);
    return enabled;
}

/**
 * Whether this site's secure acceptance configuration runs Payer Auth Setup + device data collection
 * at card entry, rather than at order time.
 *
 * In scope:
 *   CsSAType unset - plain card entry on our billing form
 *   SA_FLEX        - the Flex Microform
 *
 * Out of scope:
 *   SA_SILENTPOST  - the card is posted straight to Cybersource from an intermediate form, and the
 *                    flow already round-trips through CheckoutServices-SilentPostAuthorize, where the
 *                    order-time setup route fits naturally
 *   SA_REDIRECT
 *   SA_IFRAME      - card details are entered on a Cybersource page, so there is nothing to hook
 *
 * @returns {boolean} true when the early flow applies to this site
 */
function supportsEarlySetup() {
    var Site = require('dw/system/Site');
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

    //  An unset enum preference still returns an EnumValue object, so the object itself is truthy and
    //  only its value is null. Testing the value is what distinguishes "no secure acceptance type" -
    //  String(null) would produce the string "null", which is neither empty nor a known type.
    var preference = Site.getCurrent().getCustomPreferenceValue('CsSAType');
    var CsSAType = (preference && preference.value) ? String(preference.value) : null;

    return !CsSAType || CsSAType === CybersourceConstants.METHOD_SA_FLEX;
}

/**
 * Whether the basket carries an address the setup request can build its billTo from.
 *
 * CommonHelper.CreateCyberSourceBillToObject reads the billing address only when it has an address1,
 * and otherwise falls back to the default shipment's shipping address - which it dereferences without
 * a null check. Early in checkout neither is necessarily set yet: a shopper with no default address
 * reaches the billing markup, which SFRA renders up front, before entering a shipping address.
 * @param {dw.order.LineItemCtnr} basket - the current basket
 * @returns {boolean} true when a billTo object can be built
 */
function hasBillToAddress(basket) {
    if (!basket) {
        return false;
    }

    var billingAddress = basket.billingAddress;
    if (billingAddress && !empty(billingAddress.address1)) {
        return true;
    }

    var defaultShipment = basket.defaultShipment;
    return !!(defaultShipment && !empty(defaultShipment.shippingAddress));
}

/**
 * Card types with payer authentication switched on, read from the same active payment cards that
 * CardHelper.PayerAuthEnable inspects. Rendered into the billing page so the client can skip the
 * setup request entirely for a card that does not need payer auth.
 * @returns {string[]} enabled card type IDs, empty when payer auth is not configured at all
 */
function getPayerAuthEnabledCardTypes() {
    var types = [];

    var CybersourceHelper = require('*/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
    if (empty(CybersourceHelper.getPAMerchantID())) {
        return types;
    }

    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var paymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
    if (!paymentMethod) {
        return types;
    }

    var iter = paymentMethod.getActivePaymentCards().iterator();
    while (iter.hasNext()) {
        var paymentCard = iter.next();
        if (paymentCard.custom.csEnablePayerAuthentication) {
            types.push(String(paymentCard.cardType));
        }
    }

    return types;
}

/**
 * Runs the Payer Auth Setup service call and parks the returned reference ID on the session.
 * @param {Object} args - arguments
 * @param {dw.order.LineItemCtnr} args.basket - basket used to build the billTo object
 * @param {Object} args.paymentInstrument - payment instrument, or a stub when none exists yet
 * @param {Object} args.creditCardForm - billing credit card form, or a form shaped stub
 * @param {string} args.referenceNumber - merchant reference code for the request
 * @returns {Object} { error: false, jwtToken, ddcUrl, referenceID } or { error: true }
 */
function runSetup(args) {
    var CardFacade = require('*/cartridge/scripts/facade/CardFacade');
    var result;

    try {
        result = CardFacade.PayerAuthSetup(
            args.paymentInstrument,
            args.referenceNumber,
            args.creditCardForm,
            args.basket
        );
    } catch (e) {
        Logger.error('[PayerAuthSetupHelper] PayerAuthSetup threw: {0}', e.message);
        return { error: true };
    }

    if (empty(result) || result.error || empty(result.referenceID) || empty(result.deviceDataCollectionURL)) {
        Logger.error('[PayerAuthSetupHelper] PayerAuthSetup returned no device data collection URL for reference {0}', args.referenceNumber);
        return { error: true };
    }

    session.privacy.payerAuthSetupReferenceID = result.referenceID;

    return {
        error: false,
        referenceID: result.referenceID,
        jwtToken: result.accessToken,
        ddcUrl: result.deviceDataCollectionURL
    };
}

/**
 * Reserves the order number that the setup call will use as its merchantReferenceCode, so that the
 * later enrollment call - which runs with the real order - reports the same reference to Cybersource.
 * checkoutHelpers.createOrder then creates the order with this number.
 *
 * An existing reservation is reused: the number identifies the order this basket will become, not
 * the card, so re-running setup after a card edit must not burn a second number.
 * @returns {string|null} the reserved order number, or null when one could not be reserved
 */
function reserveOrderNo() {
    if (!empty(session.privacy.payerAuthOrderNo)) {
        return session.privacy.payerAuthOrderNo;
    }

    var OrderMgr = require('dw/order/OrderMgr');
    try {
        var orderNo = Transaction.wrap(function () {
            return OrderMgr.createOrderNo();
        });
        if (!empty(orderNo)) {
            session.privacy.payerAuthOrderNo = orderNo;
            return orderNo;
        }
    } catch (e) {
        Logger.error('[PayerAuthSetupHelper] Could not reserve an order number: {0}', e.message);
    }

    return null;
}

/**
 * @returns {string|null} the order number reserved for the payer auth setup call, or null
 */
function getReservedOrderNo() {
    return empty(session.privacy.payerAuthOrderNo) ? null : session.privacy.payerAuthOrderNo;
}

/**
 * Drops the reserved order number. A reservation is single use, so this is called as soon as order
 * creation has been attempted with it, whether or not that attempt succeeded.
 *
 * Deliberately not part of clear(): the reservation survives a card edit, because it describes the
 * order rather than the card.
 */
function clearOrderNo() {
    delete session.privacy.payerAuthOrderNo;
}

/**
 * Returns the setup reference ID for a payment instrument, falling back to the session copy
 * written by the pre-order setup call.
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument - payment instrument
 * @returns {string|null} the reference ID or null
 */
function getSetupReferenceID(paymentInstrument) {
    if (paymentInstrument && paymentInstrument.custom
        && !empty(paymentInstrument.custom.PayerAuthSetupReferenceID)) {
        return paymentInstrument.custom.PayerAuthSetupReferenceID;
    }
    return empty(session.privacy.payerAuthSetupReferenceID) ? null : session.privacy.payerAuthSetupReferenceID;
}

/**
 * Copies the session setup reference onto a basket payment instrument, so that it travels to the
 * order payment instrument when the order is created.
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument - basket payment instrument
 * @returns {boolean} true when a reference was copied
 */
function applySetupReferenceToPaymentInstrument(paymentInstrument) {
    var referenceID = session.privacy.payerAuthSetupReferenceID;
    if (empty(referenceID) || empty(paymentInstrument)) {
        return false;
    }

    Transaction.wrap(function () {
        paymentInstrument.custom.PayerAuthSetupReferenceID = referenceID;
    });
    return true;
}

/**
 * Whitelists and stores the browser properties collected during device data collection.
 * @param {string} rawJson - JSON string posted by the client
 * @returns {boolean} true when the fields were stored
 */
function saveBrowserFields(rawJson) {
    if (empty(rawJson)) {
        return false;
    }

    var parsed;
    try {
        parsed = JSON.parse(rawJson);
    } catch (e) {
        Logger.warn('[PayerAuthSetupHelper] Could not parse browser fields payload');
        return false;
    }

    if (!parsed || typeof parsed !== 'object') {
        return false;
    }

    var accepted = {};
    BROWSER_FIELD_NAMES.forEach(function (name) {
        var value = parsed[name];
        if (value === null || value === undefined || value === '') {
            return;
        }
        if (typeof value === 'string') {
            accepted[name] = name === 'httpUserAgent' ? value.substring(0, MAX_USER_AGENT_LENGTH) : value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            accepted[name] = value;
        }
    });

    if (!Object.keys(accepted).length) {
        return false;
    }

    session.privacy.payerAuthBrowserFields = JSON.stringify(accepted);
    return true;
}

/**
 * Returns the stored browser properties.
 * @returns {Object|null} the parsed browser fields or null when none were collected
 */
function getBrowserFields() {
    if (empty(session.privacy.payerAuthBrowserFields)) {
        return null;
    }
    try {
        return JSON.parse(session.privacy.payerAuthBrowserFields);
    } catch (e) {
        return null;
    }
}

/**
 * Drops the stored setup reference and browser fields. Called when the shopper changes the card,
 * when payer auth no longer applies to the selected payment, and after the order is placed.
 */
function clear() {
    delete session.privacy.payerAuthSetupReferenceID;
    delete session.privacy.payerAuthBrowserFields;
}

module.exports = {
    isApplicable: isApplicable,
    supportsEarlySetup: supportsEarlySetup,
    hasBillToAddress: hasBillToAddress,
    getPayerAuthEnabledCardTypes: getPayerAuthEnabledCardTypes,
    runSetup: runSetup,
    reserveOrderNo: reserveOrderNo,
    getReservedOrderNo: getReservedOrderNo,
    clearOrderNo: clearOrderNo,
    getSetupReferenceID: getSetupReferenceID,
    applySetupReferenceToPaymentInstrument: applySetupReferenceToPaymentInstrument,
    saveBrowserFields: saveBrowserFields,
    getBrowserFields: getBrowserFields,
    clear: clear
};
