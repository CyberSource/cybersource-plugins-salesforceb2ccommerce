'use strict';

var Transaction = require('dw/system/Transaction');
var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
/**
 * Update the order payment instrument when card capture response arrived.
 * @param {Object} paymentInstrmt paymentInstrmt
 * @param {Object} Order Order
 * @param {Object} responseObject responseObject
 */
function UpdatePaymentTransactionCardCapture(paymentInstrmt, Order, responseObject) {
    var order = Order;
    var paymentInstrument = paymentInstrmt;
    Transaction.wrap(function () {
        if (responseObject.Decision === 'ACCEPT') {
            paymentInstrument.paymentTransaction.custom.AmountPaid = Number(responseObject.CaptureAmount.toString());
            order.paymentStatus = 2;
        }
        paymentInstrument.paymentTransaction.transactionID = responseObject.RequestID;
        paymentInstrument.paymentTransaction.custom.requestToken = responseObject.RequestToken;
    });
}

/**
 * Update Payment Transaction details in order's payment transaction from card authorize response
 * @param {Object} paymentInstrmt paymentInstrmt
 * @param {Object} responseObject responseObject
 */
function UpdateMobilePaymentTransactionCardAuthorize(paymentInstrmt, responseObject) {
    var paymentInstrument = paymentInstrmt;

    var svcResponse = responseObject.ServiceResponse.serviceResponse;
    if (paymentInstrument != null && svcResponse != null) {
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.transactionID = svcResponse.RequestID;
            // eslint-disable-next-line
            if (!empty(responseObject.CardType)) {
                paymentInstrument.paymentTransaction.custom.cardType = svcResponse.CardType;
            }

            // eslint-disable-next-line
            if (!empty(responseObject.requestParam)) {
                var PaymentMgr = require('dw/order/PaymentMgr');
                var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
                paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
                /* eslint-disable */
                paymentInstrument.creditCardNumber = !empty(responseObject.requestParam.NetworkToken) === true ? responseObject.requestParam.NetworkToken : 'N/A';
                paymentInstrument.creditCardType = !empty(responseObject.requestParam.CardType) === true ? responseObject.requestParam.CardType : 'N/A';
                paymentInstrument.creditCardExpirationMonth = !empty(responseObject.requestParam.TokenExpirationMonth) === true ? responseObject.requestParam.TokenExpirationMonth : 'N/A';
                paymentInstrument.creditCardExpirationYear = !empty(responseObject.requestParam.TokenExpirationYear) === true ? responseObject.requestParam.TokenExpirationYear : 'N/A';
                /* eslint-enable */
            }
            paymentInstrument.paymentTransaction.custom.requestId = svcResponse.RequestID;
            paymentInstrument.paymentTransaction.custom.requestToken = svcResponse.RequestToken;
            paymentInstrument.paymentTransaction.custom.authAmount = svcResponse.AuthorizationAmount;
            paymentInstrument.paymentTransaction.custom.authCode = svcResponse.AuthorizationCode;
            paymentInstrument.paymentTransaction.custom.approvalStatus = svcResponse.AuthorizationReasonCode;
            // eslint-disable-next-line
            if ((svcResponse.ReasonCode === '100' || svcResponse.ReasonCode === '480') && !empty(svcResponse.SubscriptionID) && empty(paymentInstrument.creditCardToken)) {
                paymentInstrument.setCreditCardToken(responseObject.SubscriptionID);
            }
        });
    }
}

/**
 * Update Payment Transaction details in order's payment transaction from card authorize response
 * @param {Object} paymentInstrmt paymentInstrmt
 * @param {Object} responseObject responseObject
 */
function UpdatePaymentTransactionCardAuthorize(paymentInstrmt, responseObject) {
    var paymentInstrument = paymentInstrmt;
    if (paymentInstrument != null && responseObject != null) {
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.transactionID = responseObject.RequestID;
            // eslint-disable-next-line
            if (!empty(responseObject.CardType)) {
                paymentInstrument.paymentTransaction.custom.cardType = responseObject.CardType;
            }

            paymentInstrument.paymentTransaction.custom.requestId = responseObject.RequestID;
            paymentInstrument.paymentTransaction.custom.requestToken = responseObject.RequestToken;
            paymentInstrument.paymentTransaction.custom.authAmount = responseObject.AuthorizationAmount;
            paymentInstrument.paymentTransaction.custom.authCode = responseObject.AuthorizationCode;
            paymentInstrument.paymentTransaction.custom.approvalStatus = responseObject.AuthorizationReasonCode;
            paymentInstrument.paymentTransaction.custom.decision = responseObject.Decision;
            //  SFRA uses a hook (app.fraud.detection) called after handlePayments to handle fraud responses.
            //  We get the fraud response here, so we save it to the session for future use.
            //  Also note, that on a fraud rejection, this function will return error:true back to handlePayments,
            //  which will cause the Order to be immediately canceled, skipping the fraud detection hook.
            //  We only need to save the fraud status, and use the hook to handle the Review state.
            // eslint-disable-next-line
            session.privacy.CybersourceFraudDecision = responseObject.Decision;

            // eslint-disable-next-line
            if ((responseObject.ReasonCode === '100' || responseObject.ReasonCode === '480') && !empty(responseObject.SubscriptionID) && empty(paymentInstrument.creditCardToken)) {
                paymentInstrument.setCreditCardToken(responseObject.SubscriptionID);
            }
        });
    }
}

/**
 * Update Payment Transaction ProofXML in order's payment transaction from card payer enrollment response
 * @param {Object} paymentInstrmt paymentInstrmt
 * @param {Object} proofXML proofXML
 */
function UpdatePaymentTransactionWithProofXML(paymentInstrmt, proofXML) {
    var paymentInstrument = paymentInstrmt;
    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.custom.proofXML = proofXML;
    });
}

/**
 * Update Payment Transaction details after the Order get authorize from ALIPAY
 * @param {Object} order order
 * @param {Object} alipayInitiatePaymentObject alipayInitiatePaymentObject
 * @param {Object} apPaymentType apPaymentType
 */
function authorizeAlipayOrderUpdate(order, alipayInitiatePaymentObject, apPaymentType) {
    Transaction.wrap(function () {
        var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
        if (paymentInstrument != null && alipayInitiatePaymentObject !== null) {
            paymentInstrument.paymentTransaction.custom.apMerchantURL = alipayInitiatePaymentObject.apInitiateReply.merchantURL;
            paymentInstrument.paymentTransaction.custom.approvalStatus = Number(alipayInitiatePaymentObject.reasonCode);
            paymentInstrument.paymentTransaction.custom.apInitiatePaymentReconciliationID = alipayInitiatePaymentObject.apInitiateReply.reconciliationID;
            paymentInstrument.paymentTransaction.custom.apInitiatePaymentRequestID = alipayInitiatePaymentObject.requestID;
            paymentInstrument.paymentTransaction.custom.requestToken = alipayInitiatePaymentObject.requestToken;
            paymentInstrument.paymentTransaction.custom.apInitiatePaymentType = apPaymentType;
            // map response RequestID,InitiatePaymentType to generic custom.requestId and apPaymentType to use further in checkStatus job
            paymentInstrument.paymentTransaction.custom.requestId = alipayInitiatePaymentObject.requestID;
            paymentInstrument.paymentTransaction.custom.apPaymentType = apPaymentType;
        }
    });
}

/**
 * Update Payment Transaction details after the Payment Status verified
 * @param {Object} Order Order
 * @param {Object} responseObject responseObject
 * @param {Object} paymentType paymentType
 */
function checkStatusOrderUpdate(Order, responseObject, paymentType) {
    var order = Order;
    Transaction.wrap(function () {
        var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
        if (paymentInstrument != null && responseObject !== null) {
            paymentInstrument.paymentTransaction.custom.approvalStatus = Number(responseObject.reasonCode);
            paymentInstrument.paymentTransaction.custom.requestToken = responseObject.requestToken;
            if (responseObject.apCheckStatusReply !== null) {
                paymentInstrument.paymentTransaction.custom.apPaymentStatus = responseObject.apCheckStatusReply.paymentStatus;
                paymentInstrument.paymentTransaction.custom.apInitiatePaymentReconciliationID = responseObject.apCheckStatusReply.reconciliationID;
                // eslint-disable-next-line
                switch (paymentType) {
                    case 'APY':
                    case 'APD':
                        paymentInstrument.paymentTransaction.transactionID = responseObject.apCheckStatusReply.processorTransactionID;
                }
            }
            if (Number(responseObject.reasonCode) === 100 && (responseObject.apCheckStatusReply.paymentStatus === 'COMPLETED'
                || responseObject.apCheckStatusReply.paymentStatus === 'settled')) {
                order.paymentStatus = 2;
            } else if (CybersourceConstants.SOFORT_PAYMENT_METHOD.equals(paymentInstrument.paymentMethod)
                && Number(responseObject.reasonCode) === 100 && responseObject.apCheckStatusReply.paymentStatus === 'authorized') {
                order.paymentStatus = 2;
            }
        }
    });
}

/**
 * capturePaypalOrderUpdate
 * @param {Object} Order Order
 * @param {Object} capturePaypalObject capturePaypalObject
 */
function capturePaypalOrderUpdate(Order, capturePaypalObject) {
    var order = Order;
    // eslint-disable-next-line
    if (order != null && !empty(order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)) && capturePaypalObject != null) {
        Transaction.wrap(function () {
            if (capturePaypalObject.ReasonCode === '100' || capturePaypalObject.ReasonCode === '480') {
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalCaptureTransactionID = capturePaypalObject.CaptureTransactionID;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalPaymentStatus = capturePaypalObject.PaymentStatus;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalReceiptId = capturePaypalObject.paypalReceiptId;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalParentTransactionId = capturePaypalObject.ParentTransactionId;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalAutorizationId = capturePaypalObject.AuthorizationId;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalCaptureRequestId = capturePaypalObject.RequestID;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalCaptureRequestToken = capturePaypalObject.RequestToken;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalCaptureCorrelationID = capturePaypalObject.CaptureCorrelationID;
                order.getPaymentInstruments(CybersourceConstants.METHOD_PAYPAL)[0].paymentTransaction.custom.paypalCaptureFeeAmount = capturePaypalObject.CaptureFeeAmount;
                if (capturePaypalObject.ReasonCode === '100') {
                    order.paymentStatus = 2;
                }
            }
        });
    }
}

/**
 * updatePaymentInstrumentVisaDecrypt
 * @param {Object} basket basket
 * @param {Object} decryptedPaymentData decryptedPaymentData
 * @param {Object} visaCheckoutCallId visaCheckoutCallId
 */
function updatePaymentInstrumentVisaDecrypt(basket, decryptedPaymentData, visaCheckoutCallId) {
    var cart = basket;
    // Retrieve the inputs
    var visa = decryptedPaymentData;

    // eslint-disable-next-line
    Transaction.wrap(function () {
        var instrument = cart.createPaymentInstrument(CybersourceConstants.METHOD_VISA_CHECKOUT, cart.totalGrossPrice);
        var billingAddress;
        // eslint-disable-next-line
        var vcCurrentPage = session.privacy.cyb_CurrentPage;
        if (vcCurrentPage !== 'CybBilling') {
            billingAddress = cart.createBillingAddress();
        } else {
            billingAddress = cart.getBillingAddress();
        }
        // Validate our payment instrument was previously properly created
        if (instrument == null || instrument.paymentMethod !== CybersourceConstants.METHOD_VISA_CHECKOUT) {
            throw new Error('Invalid payment instrument for Visa Checkout');
        }
        var cardType;
        // eslint-disable-next-line
        switch (visa.VCCardType) {
            case 'VISA':
                cardType = 'Visa';
                break;
            case 'MASTERCARD':
                cardType = 'MasterCard';
                break;
            case 'AMEX':
                cardType = 'Amex';
                break;
            case 'DISCOVER':
                cardType = 'Discover';
                break;
        }

        // Populate payment instrument values
        instrument.setCreditCardType(cardType);
        instrument.setCreditCardHolder(visa.VCNameOnCard);
        instrument.setCreditCardNumber('************' + visa.CardSuffix);
        var month = parseFloat(visa.ExpirationMonth);
        var year = parseFloat(visa.ExpirationYear);
        instrument.setCreditCardExpirationMonth(month.valueOf());
        instrument.setCreditCardExpirationYear(year.valueOf());

        if (visaCheckoutCallId) {
            instrument.custom.callId = visaCheckoutCallId;
        }
        instrument.custom.vcDecryptRequestId = visa.RequestID;
        instrument.custom.vcDecryptReasonCode = visa.ReasonCode;

        if (visa.VCRiskAdvice != null) {
            instrument.custom.riskAdvice = visa.VCRiskAdvice;
        }
        if (visa.VCRiskScore != null) {
            instrument.custom.riskScore = visa.VCRiskScore;
        }
        if (visa.VCAvsCodeRaw != null) {
            instrument.custom.avsCodeRaw = visa.VCAvsCodeRaw;
        }

        // card art
        if (visa.cardArt != null) {
            instrument.custom.cardArtFileName = visa.VCCardArtFileName;
            instrument.custom.cardArtHeight = visa.VCCardArtHeight;
            instrument.custom.cardArtWidth = visa.VCCardArtWidth;
        }

        // threeDS
        if (visa.vcReply != null) {
            instrument.custom.eciRaw = visa.VCEciRaw;
            instrument.custom.cavv = visa.VCCAVV;
            instrument.custom.veresEnrolled = visa.VCVeresEnrolled;
            instrument.custom.veresTimeStamp = visa.VCVeresTimeStamp;
            instrument.custom.paresStatus = visa.VCParesStatus;
            instrument.custom.paresTimeStamp = visa.VCParesTimeStamp;
            instrument.custom.xid = visa.VCXID;
        }
        // Populate the billing address
        var VisaCheckoutHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'visacheckout/helper/VisaCheckoutHelper');
        billingAddress = VisaCheckoutHelper.CreateLineItemCtnrBillingAddress(billingAddress, visa);
        if (!billingAddress.success) { return billingAddress; }

        // set the email
        cart.customerEmail = visa.VCAccountEmail;
    });
}

/**
 * update payment instrument for secure acceptance redirect response
 * @param {Object} order order
 * @param {Object} responseObject responseObject
 */
function UpdatePaymentTransactionSecureAcceptanceAuthorize(order, responseObject) {
    if (order != null && responseObject != null) {
        var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.transactionID = responseObject.RequestID;
            paymentInstrument.paymentTransaction.custom.cardType = responseObject.CardType;
            paymentInstrument.paymentTransaction.custom.requestId = responseObject.RequestID;
            paymentInstrument.paymentTransaction.custom.requestToken = responseObject.RequestToken;
            paymentInstrument.paymentTransaction.custom.authAmount = responseObject.AuthorizationAmount;
            paymentInstrument.paymentTransaction.custom.authCode = responseObject.AuthorizationCode;
            paymentInstrument.paymentTransaction.custom.approvalStatus = responseObject.AuthorizationReasonCode;
            paymentInstrument.paymentTransaction.custom.decision = responseObject.Decision;
            //  SFRA uses a hook (app.fraud.detection) called after handlePayments to handle fraud responses.
            //  We get the fraud response here, so we save it to the session for future use.
            //  Also note, that on a fraud rejection, this function will return error:true back to handlePayments,
            //  which will cause the Order to be immediately canceled, skipping the fraud detection hook.
            //  We only need to save the fraud status, and use the hook to handle the Review state.
            // eslint-disable-next-line
            session.privacy.CybersourceFraudDecision = responseObject.Decision;
        });
    }
}

/**
 * update payment instrument for secure acceptance redirect response
 * @param {Object} Order Order
 * @param {Object} responseHttpMap responseHttpMap
 * @param {Object} isOverrideShipping isOverrideShipping
 * @param {Object} isOverrideBilling isOverrideBilling
 * @returns {Object} obj
 */
function UpdateOrderBillingShippingDetails(Order, responseHttpMap, isOverrideShipping, isOverrideBilling) {
    var order = Order;
    if (order != null && responseHttpMap != null) {
        var responseMap = responseHttpMap;

        Transaction.wrap(function () {
            if (isOverrideBilling) {
                order.billingAddress.address1 = responseMap.req_bill_to_address_line1;
                // eslint-disable-next-line
                order.billingAddress.address2 = !empty(responseMap.req_bill_to_address_line2) ? responseMap.req_bill_to_address_line2 : null;
                order.customerEmail = responseMap.req_bill_to_email;
                order.billingAddress.phone = responseMap.req_bill_to_phone;
                order.billingAddress.city = responseMap.req_bill_to_address_city;
                order.billingAddress.postalCode = responseMap.req_bill_to_address_postal_code;
                order.billingAddress.stateCode = responseMap.req_bill_to_address_state;
                order.billingAddress.firstName = responseMap.req_bill_to_forename;
                order.billingAddress.lastName = responseMap.req_bill_to_surname;
                order.billingAddress.countryCode = responseMap.req_bill_to_address_country;
            }
            if (isOverrideShipping) {
                var shippingAddress = order.defaultShipment.shippingAddress;
                shippingAddress.address1 = responseMap.req_ship_to_address_line1;
                // eslint-disable-next-line
                shippingAddress.address2 = !empty(responseMap.req_ship_to_address_line2) ? responseMap.req_ship_to_address_line2 : null;
                shippingAddress.firstName = responseMap.req_ship_to_forename;
                shippingAddress.phone = responseMap.req_ship_to_phone;
                shippingAddress.city = responseMap.req_ship_to_address_city;
                shippingAddress.postalCode = responseMap.ship_to_address_postal_code;
                shippingAddress.stateCode = responseMap.req_ship_to_address_state;
                shippingAddress.lastName = responseMap.req_ship_to_surname;
                shippingAddress.countryCode = responseMap.req_ship_to_address_country;
            }
        });
        return { success: true };
    }
    return { error: true };
}

/**
 * updatePaymentInstumenSACard
 * @param {Object} paymentInstrument paymentInstrument
 * @param {Object} expiryDateString expiryDateString
 * @param {Object} maskedNumber maskedNumber
 * @param {Object} cardType cardType
 * @param {Object} cardToken cardToken
 * @param {Object} firstname firstname
 * @param {Object} lastName lastName
 */
function updatePaymentInstumenSACard(paymentInstrument, expiryDateString, maskedNumber, cardType, cardToken, firstname, lastName) {
    var dateFieldsArr = [];
    // eslint-disable-next-line
    if (!empty(expiryDateString)) {
        dateFieldsArr = expiryDateString.split('-');
    }
    var cardtype = CardHelper.getCardType(cardType);
    /* eslint-disable */
    if (empty(paymentInstrument.getCreditCardType()) || empty(paymentInstrument.getCreditCardExpirationMonth())
        || empty(paymentInstrument.getCreditCardNumber()) || empty(paymentInstrument.getCreditCardHolder())) {
            /* eslint-enable */
        Transaction.wrap(function () {
            paymentInstrument.setCreditCardType(cardtype);
            if (dateFieldsArr.length === 2) {
                var mon = dateFieldsArr[0];
                if (mon.charAt(0).equals('0')) { mon = mon.substr(1); }
                // eslint-disable-next-line
                paymentInstrument.setCreditCardExpirationMonth(parseInt(mon));
                // eslint-disable-next-line
                paymentInstrument.setCreditCardExpirationYear(parseInt(dateFieldsArr[1]));
            }
            // eslint-disable-next-line
            if (empty(paymentInstrument.getCreditCardNumber())) {
                paymentInstrument.setCreditCardNumber(maskedNumber);
            }
            paymentInstrument.setCreditCardHolder(firstname + ' ' + lastName);
            // eslint-disable-next-line
            if (!empty(cardToken)) {
                paymentInstrument.setCreditCardToken(cardToken);
            }
        });
    }
    // eslint-disable-next-line
    session.forms.billing.creditCardFields.cardType.value = cardtype;
    // eslint-disable-next-line
    session.forms.billing.creditCardFields.selectedCardID.value = cardToken;
}

/**
 * MobilePaymentOrderUpdate
 * @param {Object} order order
 * @param {Object} serviceResponse serviceResponse
 * @returns {Object} flag
 */
function MobilePaymentOrderUpdate(order, serviceResponse) {
    UpdateMobilePaymentTransactionCardAuthorize(CardHelper.getNonGCPaymemtInstument(order), serviceResponse);
    var OrderMgr = require('dw/order/OrderMgr');
    var Status = require('dw/system/Status');
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    if (serviceResponse.ServiceResponse.serviceResponse.StandardizedAddress && (serviceResponse.ServiceResponse.serviceResponse.ReasonCode === '100' || serviceResponse.ServiceResponse.serviceResponse.ReasonCode === '480')) {
        CommonHelper.UpdateOrderShippingAddress(serviceResponse.ServiceResponse.serviceResponse.StandardizedAddress, order, false);
    }
    if (serviceResponse.ServiceResponse.serviceResponse.Decision.equalsIgnoreCase('ACCEPT')) {
        var orderPlacementStatus = Transaction.wrap(function () {
            if (OrderMgr.placeOrder(order) === Status.ERROR) {
                OrderMgr.failOrder(order, true);
                return false;
            }

            // eslint-disable-next-line
            order.setConfirmationStatus(dw.order.Order.CONFIRMATION_STATUS_CONFIRMED);
            return true;
        });

        if (orderPlacementStatus === Status.ERROR) {
            return false;
        }
    } else if (!serviceResponse.ServiceResponse.serviceResponse.Decision.equalsIgnoreCase('REVIEW')) {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
    }
    return true;
}

/**
 * Removes a duplicate customer credit card payment instrument.
 * @param {Object} creditCardFields creditCardFields
 */
function removeDuplicates(creditCardFields) {
    // eslint-disable-next-line
    var wallet = customer.getProfile().getWallet();
    // eslint-disable-next-line
    var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD).toArray().sort(function (a, b) {
        return b.getCreationDate() - a.getCreationDate();
    });
    var ccNumber = creditCardFields.cardNumber;
    var isDuplicateCard = false;
    var oldCard;

    for (var i = 0; i < paymentInstruments.length; i += 1) {
        var card = paymentInstruments[i];
        if (card.creditCardExpirationMonth === creditCardFields.expirationMonth && card.creditCardExpirationYear === creditCardFields.expirationYear
            && card.creditCardType === creditCardFields.cardType && (card.getCreditCardNumber().indexOf(ccNumber.substring(ccNumber.length - 4)) > 0)) {
            isDuplicateCard = true;
            oldCard = card;
            break;
        }
    }
    if (isDuplicateCard) {
        wallet.removePaymentInstrument(oldCard);
    }
}

/**
 * updatePaymentInstrumentGP
 * @param {Object} basket basket
 * @param {Object} cardInfo cardInfo
 * @param {Object} email email
 */
function updatePaymentInstrumentGP(basket, cardInfo, email) {
    var cart = basket;
    // eslint-disable-next-line
    Transaction.wrap(function () {
        var instrument = cart.createPaymentInstrument(CybersourceConstants.METHOD_GooglePay, cart.totalGrossPrice);

        // Validate our payment instrument was previously properly created
        if (instrument == null || instrument.paymentMethod !== CybersourceConstants.METHOD_GooglePay) {
            throw new Error('Invalid payment instrument for Google Pay Checkout');
        }
        var cardType;
        // eslint-disable-next-line
        switch (cardInfo.cardNetwork) {
            case 'VISA':
                cardType = 'Visa';
                break;
            case 'MASTERCARD':
                cardType = 'MasterCard';
                break;
            case 'AMEX':
                cardType = 'Amex';
                break;
            case 'DISCOVER':
                cardType = 'Discover';
                break;
        }
        // eslint-disable-next-line
        session.forms.billing.creditCardFields.cardType.value = cardType;
        // Populate payment instrument values
        instrument.setCreditCardType(cardType);
        if (false) { // eslint-disable-line no-constant-condition
            instrument.setCreditCardHolder(cardInfo.billingAddress.name); // add condition only for billing address name in google response
        }
        instrument.setCreditCardNumber('************' + cardInfo.cardDetails);

        // Populate the billing address
        var MobilePaymentHelper = require('../mobilepayments/helper/MobilePaymentsHelper');
        var billingAddress = cart.billingAddress;

        if (billingAddress == null) {
            billingAddress = cart.createBillingAddress();
            billingAddress = MobilePaymentHelper.CreateLineItemCtnrBillingAddress(billingAddress, cardInfo.billingAddress);
            if (!billingAddress.success) { return billingAddress; }
        }

        // set the email
        cart.customerEmail = email;
    });
}

module.exports = {
    UpdatePaymentTransactionCardCapture: UpdatePaymentTransactionCardCapture,
    authorizeAlipayOrderUpdate: authorizeAlipayOrderUpdate,
    capturePaypalOrderUpdate: capturePaypalOrderUpdate,
    checkStatusOrderUpdate: checkStatusOrderUpdate,
    UpdatePaymentTransactionCardAuthorize: UpdatePaymentTransactionCardAuthorize,
    UpdatePaymentTransactionWithProofXML: UpdatePaymentTransactionWithProofXML,
    UpdatePaymentInstrumentVisaDecrypt: updatePaymentInstrumentVisaDecrypt,
    UpdatePaymentTransactionSecureAcceptanceAuthorize: UpdatePaymentTransactionSecureAcceptanceAuthorize,
    updatePaymentInstumenSACard: updatePaymentInstumenSACard,
    UpdateOrderBillingShippingDetails: UpdateOrderBillingShippingDetails,
    mobilePaymentOrderUpdate: MobilePaymentOrderUpdate,
    removeDuplicates: removeDuplicates,
    updatePaymentInstrumentGP: updatePaymentInstrumentGP
};
