'use strict';

var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
/**
 * Handle the DAVReasonCode when unavailable the use ReasonCode.
 * @param {Object} ResponseObject DAV response object
 * @returns {Object} response as authorized, error, declined
 */
function HandleDAVResponse(ResponseObject) {
    Logger.debug('[CardHelper.js] HandleDAVResponse DAVReasonCode : ' + ResponseObject.DAVReasonCode + ' ReasonCode : ' + ResponseObject.ReasonCode);
    var DAVReasonCode = ResponseObject.ReasonCode;
    if (ResponseObject.DAVReasonCode) {
        DAVReasonCode = ResponseObject.DAVReasonCode;
    }
    switch (DAVReasonCode) {
        case 100:
            return { authorized: true };
        case 101:
        case 102:
        case 450:
        case 451:
        case 452:
        case 453:
        case 454:
        case 455:
        case 456:
        case 457:
        case 458:
        case 459:
        case 460:
            return { declined: true };
        default:
            return { error: true };
    }
}

/**
 * Process the Card Service Response to create responseObject.
 * @param {Object} serviceResponse
 * @returns response as authorized, error, declined
 */
// eslint-disable-next-line
function ProcessCardAuthResponse(serviceResponse, shipTo, billTo) {
    var responseObject = {};
    responseObject.RequestID = serviceResponse.requestID;
    responseObject.RequestToken = serviceResponse.requestToken;
    responseObject.ReasonCode = Number(serviceResponse.reasonCode);
    responseObject.Decision = serviceResponse.decision;
    responseObject.ccAuthReply = (serviceResponse.ccAuthReply !== null) ? 'exists' : null;
    // eslint-disable-next-line
    if (!empty(serviceResponse.paySubscriptionCreateReply) && !empty(serviceResponse.paySubscriptionCreateReply.subscriptionID)) {
        responseObject.SubscriptionID = serviceResponse.paySubscriptionCreateReply.subscriptionID;
    }

    if (serviceResponse.ccAuthReply !== null) {
        responseObject.AuthorizationAmount = serviceResponse.ccAuthReply.amount;
        responseObject.AuthorizationCode = serviceResponse.ccAuthReply.authorizationCode;
        responseObject.AuthorizationReasonCode = Number(serviceResponse.ccAuthReply.reasonCode);
    }

    /** ******************************************* */
    /* DAV-related WebService response processing */
    /** ******************************************* */
    // eslint-disable-next-line
    if (!empty(serviceResponse.missingField)) {
        responseObject.MissingFieldsArray = serviceResponse.missingField;
    }
    // eslint-disable-next-line
    if (!empty(serviceResponse.invalidField)) {
        responseObject.InvalidFieldsArray = serviceResponse.invalidField;
    }
    if (serviceResponse.davReply !== null) {
        responseObject.DAVReasonCode = Number(serviceResponse.davReply.reasonCode);

        var updateShipAddress = Site.getCurrent().getCustomPreferenceValue('CsCorrectShipAddress');
        // eslint-disable-next-line
        if (updateShipAddress && !empty(serviceResponse.davReply.standardizedAddress1)) {
            var stdAddress = {};
            stdAddress.firstName = shipTo.firstName;
            stdAddress.lastName = shipTo.lastName;
            stdAddress.address1 = serviceResponse.davReply.standardizedAddress1;
            stdAddress.address2 = serviceResponse.davReply.standardizedAddress2;
            stdAddress.city = serviceResponse.davReply.standardizedCity;
            stdAddress.state = serviceResponse.davReply.standardizedState;
            stdAddress.postalCode = serviceResponse.davReply.standardizedPostalCode;
            stdAddress.country = serviceResponse.davReply.standardizedISOCountry;
            responseObject.StandardizedAddress = stdAddress;
        }
    }
    /* End of DAV response processing */

    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    CommonHelper.LogResponse(serviceResponse.merchantReferenceCode, serviceResponse.requestID, serviceResponse.requestToken, Number(serviceResponse.reasonCode), serviceResponse.decision);

    return { success: true, responseObject: responseObject };
}

/**
 * Handle the Card ReasonCode.
 * @param {*} ResponseObject ResponseObj
 * @returns {*} obj
 */
function HandleCardResponse(ResponseObject) {
    Logger.debug('[CardHelper.js] HandleDAVResponse ReasonCode : ' + ResponseObject.ReasonCode);
    switch (Number(ResponseObject.ReasonCode)) {
        case 100:
            return { authorized: true };

        case 101:
        case 102:
        case 231:
        case 202:
            return { error: true, declined: true };

        case 150:
        case 151:
        case 152:
        case 234:
        case 481:
        case 400:
        case 999:
            return { error: true };

        case 480:
            return { review: true };

        default:
            return { error: true, declined: true };
    }
}

/**
 * Write in debug log request object for card auth service for sandboxes only when sitepref CsDebugCybersource is true.
 * @param {*} serviceRequest serviceRequest
 */
function writeOutDebugLog(serviceRequest) {
    // Do not allow debug logging on production.
    // eslint-disable-next-line
    if (!dw.system.Logger.isDebugEnabled() || dw.system.System.getInstanceType() !== dw.system.System.DEVELOPMENT_SYSTEM) return;

    // eslint-disable-next-line
    var debug = dw.system.Site.getCurrent().getCustomPreferenceValue('CsDebugCybersource');
    if (debug) {
        // eslint-disable-next-line
        var log = dw.system.Logger.getLogger('CsDebugCybersource');
        log.debug('REQUEST DATA SENT TO CYBERSOURCE');
        log.debug('billTo.firstName {0}', serviceRequest.billTo.firstName);
        log.debug('billTo.lastName {0}', serviceRequest.billTo.lastName);
        log.debug('billTo.street1 {0}', serviceRequest.billTo.street1);
        log.debug('billTo.city {0}', serviceRequest.billTo.city);
        log.debug('billTo.state {0}', serviceRequest.billTo.state);
        log.debug('billTo.postalCode {0}', serviceRequest.billTo.postalCode);
        log.debug('billTo.country {0}', serviceRequest.billTo.country);
        log.debug('shipTo.firstName {0}', serviceRequest.shipTo.firstName);
        log.debug('shipTo.lastName {0}', serviceRequest.shipTo.lastName);
        log.debug('shipTo.street1 {0}', serviceRequest.shipTo.street1);
        log.debug('shipTo.city {0}', serviceRequest.shipTo.city);
        log.debug('shipTo.state {0}', serviceRequest.shipTo.state);
        log.debug('shipTo.postalCode {0}', serviceRequest.shipTo.postalCode);
        log.debug('shipTo.country {0}', serviceRequest.shipTo.country);
        log.debug('Currency {0}', serviceRequest.purchaseTotals.currency);
        log.debug('grandTotalAmount {0}', serviceRequest.purchaseTotals.grandTotalAmount);
    }
}

/**
 * Returns the value of the on basis of card type
 * @param {*} cardType cardType
 * @returns {*} obj
 */
function returnCardType(cardType) {
    var cardTypeNew = '';
    if (cardType) {
        // eslint-disable-next-line
        switch (cardType.toLowerCase()) {
            case 'visa':
                cardTypeNew = '001';
                break;
            //  SFRA front-end validation will not accept this CC type.
            //  Use OOTB type 'master card' instead
            case 'mastercard':
                cardTypeNew = '002';
                break;
            //  Account for OOTB version of Master Card,
            //  which is what the CC type detection on the front-end is built against
            case 'master card':
                cardTypeNew = '002';
                break;
            case 'amex':
                cardTypeNew = '003';
                break;
            case 'discover':
                cardTypeNew = '004';
                break;
            case 'maestro':
                cardTypeNew = '042';
                break;
            case 'jcb':
                cardTypeNew = '007';
                break;
            case 'diners':
                cardTypeNew = '005';
                break;
        }
    }
    return cardTypeNew;
}

/**
 * On basis of formType card object data is updated like firstname,lastname,cad details etc.
 * @param {*} formType formType
 * @param {*} SubscriptionID SubscriptionID
 * @returns {*} obj
 */
function CreateCybersourcePaymentCardObject(formType, SubscriptionID) {
    var fullName;
    var accounNumber;
    var cardType;
    var expiryMonth;
    var expiryYear;
    var cvnNumber;
    var subscriptionToken;
    var firstName;
    var lastName;
    var cardObject;
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');

    /* eslint-disable */
    switch (formType) {
        case 'subscription':
            fullName = session.forms.subscription.firstName.htmlValue + ' ' + session.forms.subscription.lastName.htmlValue;
            accounNumber = session.forms.subscription.accountNumber.htmlValue;
            cardType = session.forms.subscription.cardType.htmlValue;
            expiryMonth = session.forms.subscription.expiryMonth.htmlValue;
            expiryYear = session.forms.subscription.expiryYear.htmlValue;
            cvnNumber = session.forms.subscription.cvnNumber.htmlValue;
            break;
        case 'billing':
            firstName = session.forms.billing.addressFields.firstName.value;
            lastName = session.forms.billing.addressFields.lastName.value;
            fullName = !empty(firstName) ? firstName + ' ' + lastName : null;
            accounNumber = session.forms.billing.creditCardFields.cardNumber.value;
            cardType = session.forms.billing.creditCardFields.cardType.value;
            expiryMonth = '' + session.forms.billing.creditCardFields.expirationMonth.value;
            expiryYear = '' + session.forms.billing.creditCardFields.expirationYear.value;
            cvnNumber = session.forms.billing.creditCardFields.securityCode.value;
            if (SubscriptionID && !empty(SubscriptionID)) {
                subscriptionToken = SubscriptionID;
            }
            break;
        case 'paymentinstruments':
            firstName = session.forms.creditCard.addressFields.firstName.value;
            lastName = session.forms.creditCard.addressFields.lastName.value;
            accounNumber = session.forms.creditCard.cardNumber.value;
            cardType = '' + session.forms.creditCard.cardType.value;
            expiryMonth = '' + session.forms.creditCard.expirationMonth.value;
            expiryYear = '' + session.forms.creditCard.expirationYear.value;
            cvnNumber = session.forms.creditCard.securityCode.value;
            subscriptionToken = CommonHelper.GetSubscriptionToken(session.forms.creditCard.selectedCardID.value, customer);
            break;
    }
    /* eslint-enable */
    // eslint-disable-next-line
    if (!empty(cardType)) {
        var CardObject = require('~/cartridge/scripts/cybersource/CybersourceCardObject');
        cardObject = new CardObject();
        // eslint-disable-next-line
        if (empty(subscriptionToken)) {
            cardObject.setAccountNumber(accounNumber.replace(/\s/g, ''));
        }
        cardObject.setFullName(fullName);
        cardObject.setExpirationMonth(expiryMonth);
        cardObject.setExpirationYear(expiryYear);
        cardObject.setCvNumber(cvnNumber);
        cardObject.setCardType(returnCardType(cardType));
    }
    return { success: true, card: cardObject };
}

/**
 * Sets currency and amount in purchase object.
 * @param {*} currency currency
 * @param {*} Amount Amount
 * @returns {*} obj
 */
function CreateCyberSourcePurchaseTotalsObjectUserData(currency, Amount) {
    var amount = Amount;
    var PurchaseTotalsObject = require('~/cartridge/scripts/cybersource/CybersourcePurchaseTotalsObject');
    var purchaseObject = new PurchaseTotalsObject();
    purchaseObject.setCurrency(currency);
    amount = parseFloat(amount);
    var StringUtils = require('dw/util/StringUtils');
    purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amount.valueOf(), '000000.00', 'en_US'));
    return { success: true, purchaseTotals: purchaseObject };
}

/**
 * Returns the boolean variable if payer auth is available for the requested card type
 * @param {*} cardType cardType
 * @returns {*} obj
 */
function PayerAuthEnable(cardType) {
    // eslint-disable-next-line
    var paymentMethod = dw.order.PaymentMgr.getPaymentMethod(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
    if (paymentMethod === null) { return { error: true, errorMsg: 'Payment method CREDIT_CARD not found' }; }
    var paymentCard;
    var paymentCardList = paymentMethod.getActivePaymentCards();
    var iter = paymentCardList.iterator();
    while (iter.hasNext()) {
        paymentCard = iter.next();
        if (paymentCard.cardType === cardType) {
            break;
        }
        paymentCard = null;
    }
    if (paymentCard === null) { return { error: true, errorMsg: 'Card type match not found' }; }

    return { success: true, paEnabled: paymentCard.custom.csEnablePayerAuthentication };
}

/**
 * Returns the payment instrument which is not a gift certificate/ gift card type
 * @param {Object} lineItemCtnr : dw.order.LineItemCtnr contains object of basket or order
 * @returns {Object} paymentInstrument
 */
function getNonGCPaymemtInstument(lineItemCtnr) {
    var paymentInstruments = lineItemCtnr.getPaymentInstruments();
    if (paymentInstruments.size() > 0) {
        for (var i = 0; i < paymentInstruments.length; i += 1) {
            var paymentInstrument = paymentInstruments[i];
            // For GC we need to create an array of objects to be passed to PayeezyFacade-PaymentAuthorize.
            if (!'GIFT_CERTIFICATE'.equalsIgnoreCase(paymentInstrument.paymentMethod)) {
                return paymentInstrument;
            }
        }
    }
    return null;
}

/**
 * Returns the value of card type on basis of card value.
 * @param {string} cardTypeValue : String value like 001,002,003etc
 * @returns {string} cardType
 */
function getCardType(cardTypeValue) {
    var cardType = 'Visa';
    switch (cardTypeValue) {
        case '001':
            cardType = 'Visa';
            break;
        case '002':
            cardType = 'MasterCard';
            break;
        case '003':
            cardType = 'Amex';
            break;
        case '004':
            cardType = 'Discover';
            break;
        case '005':
            cardType = 'DinersClub';
            break;
        case '042':
            cardType = 'Maestro';
            break;
        case '007':
            cardType = 'JCB';
            break;
        default:
            cardType = '';
    }
    return cardType;
}

/**
 * If debug value id true then the response is printed in logs.
 * @param serviceResponse : Response from the service
 */
// eslint-disable-next-line
function protocolResponse(serviceResponse) {
    // eslint-disable-next-line
    var debug = dw.system.Site.getCurrent().getCustomPreferenceValue('CsDebugCybersource');
    var checkValue = true;
    if (checkValue || debug) {
        var HashMap = require('dw/util/HashMap');
        var arr = new HashMap();
        // var xx;

        Object.keys(serviceResponse).forEach(function (xx) {
            arr.put(xx, serviceResponse[xx]);
        });

        // eslint-disable-next-line
        if (!empty(serviceResponse.payPalPaymentReply)) {
            Object.keys(serviceResponse.payPalPaymentReply).forEach(function (xx) {
                // trace('checking ' + xx);
                try {
                    arr.put('PayPalPaymentReply.' + xx, serviceResponse.payPalPaymentReply[xx]);
                } catch (exception) {
                    arr.put('PayPalPaymentReply.' + xx, ' caused ex ' + exception);
                }
            });
        }

        var nullList = [];
        var qq;
        var iter;
        var retMap = new HashMap();
        for (iter = arr.keySet().iterator(); iter.hasNext();) {
            qq = iter.next();
            if (arr.get(qq) == null) {
                nullList.push(qq);
            } else {
                retMap.put(qq, arr.get(qq));
            }
        }
        if (qq.length > 0) {
            retMap.put('<<NullList>>', nullList);
        }
        return retMap;
    }
}

/**
 * addOrUpdateToken
 * @param {*} paymentInstrument paymentInstrument
 * @param {*} customer customer
 * @returns {*} obj
 */
function addOrUpdateToken(paymentInstrument, customer) {
    var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
    return secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customer);
}

/**
 * Card Response for processing service response
 * @param {*} order order
 * @param {*} paymentInstrument paymentInstrument
 * @param {*} serviceResponse serviceResponse
 * @returns {*} obj
 */
function CardResponse(order, paymentInstrument, serviceResponse) {
    // response validate
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();

    // eslint-disable-next-line
    if (!(CybersourceHelper.getDavEnable() && CybersourceHelper.getDavOnAddressVerificationFailure() === 'REJECT' && serviceResponse.ReasonCode !== 100 && !empty(serviceResponse.DAVReasonCode) && serviceResponse.DAVReasonCode !== 100)) {
        // simply logging detail response not utilized
        HandleDAVResponse(serviceResponse);
        if (serviceResponse.AVSCode === 'N') {
            // returns response based on AVS result to be ignored or not
            if (CybersourceHelper.getAvsIgnoreResult() === true) {
                return { review: true };
            }
            return { declined: true };
        }

        // order payment transaction updates
        var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
        var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
        PaymentInstrumentUtils.UpdatePaymentTransactionCardAuthorize(paymentInstrument, serviceResponse);
        if (serviceResponse.StandardizedAddress && (serviceResponse.ReasonCode === '100' || serviceResponse.ReasonCode === '480')) {
            // eslint-disable-next-line
            CommonHelper.UpdateOrderShippingAddress(serviceResponse.StandardizedAddress, order, session.forms.shipping.shippingAddress.shippingAddressUseAsBillingAddress.value);
        }
        if (serviceResponse.ReasonCode === '100' || serviceResponse.ReasonCode === '480') {
            // eslint-disable-next-line
            addOrUpdateToken(paymentInstrument, customer.authenticated ? customer : null);
        }
        // returns response as authorized, error, declined based on ReasonCode
        return HandleCardResponse(serviceResponse);
    }
    // returns response as authorized, error, declined based on DAVReasonCode or ReasonCode
    return HandleDAVResponse(serviceResponse);
}

module.exports = {
    CreateCyberSourcePurchaseTotalsObject_UserData: CreateCyberSourcePurchaseTotalsObjectUserData,
    CreateCybersourcePaymentCardObject: CreateCybersourcePaymentCardObject,
    CardResponse: CardResponse,
    PayerAuthEnable: PayerAuthEnable,
    HandleDAVResponse: HandleDAVResponse,
    HandleCardResponse: HandleCardResponse,
    ProcessCardAuthResponse: ProcessCardAuthResponse,
    writeOutDebugLog: writeOutDebugLog,
    protocolResponse: protocolResponse,
    getNonGCPaymemtInstument: getNonGCPaymemtInstument,
    getCardType: getCardType,
    ReturnCardType: returnCardType,
    addOrUpdateToken: addOrUpdateToken
};
