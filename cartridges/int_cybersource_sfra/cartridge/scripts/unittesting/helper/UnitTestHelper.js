'use strict';

/* API Includes */
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

var TestFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/facade/TestFacade');
var TestHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/helper/TestHelper');

/**
 * Function to unit test the credit card authorization service.
 * With the hard coded data.
 * @returns {Object} obj
 */
function TestCCAuth() {
    var billTo; var shipTo; var purchaseTotals; var
        card;
    var TaxHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/helper/TestHelper');
    var result = TaxHelper.CreateCyberSourceBillToObject();

    if (result.success) {
        billTo = result.billTo;
        result = TestHelper.CreateCyberSourceShipToObject();
        if (result.success) {
            shipTo = result.shipTo;
            result = TestHelper.CreateCyberSourcePurchaseTotalsObject();
            if (result.success) {
                purchaseTotals = result.purchaseTotals;
                result = TestHelper.CreateCyberSourcePaymentCardObject();
                if (result.success) {
                    card = result.card;
                    result = TestFacade.TestCCAuth(billTo, shipTo, card, purchaseTotals);
                    if (result.success) {
                        var CCAuthResponse = result.serviceResponse;
                        return { success: true, type: 'CC Auth', response: CCAuthResponse };
                    }

                    return { success: false, type: 'CC Auth', response: result.errorMsg };
                }
            }
        }
    } else {
        // eslint-disable-next-line
        var response = !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator';
        return { success: false, type: 'CC Auth', response: response };
    }
}

/**
 * TestTax
 * @returns {Object} Obj
 */
function TestTax() {
    var taxResponse = TestHelper.CreatTaxRequest();

    // eslint-disable-next-line
    if (!empty(taxResponse) && taxResponse.success) {
        return { success: true, type: 'Taxation', response: taxResponse.serviceResponse };
    }
    return { success: false, type: 'Taxation', response: taxResponse.errorMsg };
}

/**
 * TestCaptureService
 * @param {Object} requestID requestID
 * @param {Object} merchantRefCode merchantRefCode
 * @param {Object} paymentType paymentType
 * @param {Object} paymentTotal paymentTotal
 * @param {Object} currency currency
 * @returns {Object} Obj
 */
function TestCaptureService(requestID, merchantRefCode, paymentType, paymentTotal, currency) {
    // get all the forms in session
    /* var requestID = session.forms.genericTestInterfaceForm.authRequestID.htmlValue;
    var merchantRefCode = session.forms.genericTestInterfaceForm.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.genericTestInterfaceForm.capturepaymenttype.htmlValue;
    var paymentTotal = session.forms.genericTestInterfaceForm.grandtotalamount.value;
    var currency = session.forms.genericTestInterfaceForm.currency.value;
    */
    var serviceResponse;
    // capture the refund service response from test facade
    if (paymentType === 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        // captureReplyTitle = 'Credit card Capture Reply';
    } else if (paymentType === 'visacheckout') {
        // eslint-disable-next-line
        var orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
    } else if (paymentType === 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalCaptureService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
    } else if (paymentType === 'googlepay') {
        // var orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
    }
    // eslint-disable-next-line
    if (!empty(serviceResponse)) {
        return { success: true, type: 'CC Capture', response: serviceResponse };
    }

    return { success: false, type: 'CC Capture', response: '' };
}

/**
 * TestCreditService
 * @param {Object} requestID requestID
 * @param {Object} merchantRefCode merchantRefCode
 * @param {Object} paymentType paymentType
 * @param {Object} paymentTotal paymentTotal
 * @param {Object} currency currency
 * @returns {Object} object
 */
function TestCreditService(requestID, merchantRefCode, paymentType, paymentTotal, currency) {
    var orderid;
    var serviceResponse;
    var AliPayFacade = require('~/cartridge/scripts/alipay/facade/AlipayFacade');
    if (paymentType === 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
    } else if (paymentType === 'visacheckout') {
        // eslint-disable-next-line
        orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
    } else if (paymentType === 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
    } else if (paymentType === 'googlepay') {
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
    } else if (paymentType === 'APY') {
        serviceResponse = AliPayFacade.AliPayRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
    } else if (paymentType === 'MCH' || paymentType === 'IDL' || paymentType === 'SOF') {
        var BanktransferFacade = require('~/cartridge/scripts/banktransfer/facade/BankTransferFacade');
        serviceResponse = BanktransferFacade.BanktransferRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
    } else if (paymentType === 'APY') {
        serviceResponse = AliPayFacade.AliPayRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
    }

    // eslint-disable-next-line
    if (!empty(serviceResponse)) {
        return { success: true, type: 'CC Credit', response: serviceResponse };
    }

    return { success: false, type: 'CC Credit', response: serviceResponse };
}

/**
 * TestAuthReversal
 * @param {Object} requestID requestID
 * @param {Object} merchantRefCode merchantRefCode
 * @param {Object} paymentType paymentType
 * @param {Object} amount amount
 * @param {Object} currency currency
 * @returns {Object} object
 */
function TestAuthReversal(requestID, merchantRefCode, paymentType, amount, currency) {
    var serviceResponse;
    // eslint-disable-next-line
    var orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;
    // capture the refund service response from test facade
    if (paymentType === 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount);
    } else if (paymentType === 'visacheckout') {
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount, orderid);
    } else if (paymentType === 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalReversalService(requestID, merchantRefCode, paymentType, amount, currency);
    } else if (paymentType === 'googlepay') {
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount);
    }

    // eslint-disable-next-line
    if (!empty(serviceResponse)) {
        return { success: true, type: 'CC Auth Reverse', response: serviceResponse };
    }

    return { success: false, type: 'CC Auth Reverse', response: serviceResponse };
}

/**
 * TestCheckStatusService
 * @param {Object} merchantReferenceCode merchantReferenceCode
 * @returns {Object} object
 */
function TestCheckStatusService(merchantReferenceCode) {
    // get orderid from form field
    var Order = {};
    var serviceResponse;
    // eslint-disable-next-line
    if (!empty(merchantReferenceCode)) {
        // eslint-disable-next-line
        Order = dw.order.OrderMgr.getOrder(merchantReferenceCode);
    }
    // eslint-disable-next-line
    if (empty(Order)) {
        return { success: false, type: 'Check payment Status', response: 'No order found:' + merchantReferenceCode };
    }
    var collections = require('*/cartridge/scripts/util/collections');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    collections.forEach(Order.paymentInstruments, function (paymentInstrument) {
        if (!paymentInstrument.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
            // eslint-disable-next-line
            paymentType = paymentInstrument.paymentTransaction.custom.apPaymentType;
        }
    });
    /* if(checkstatuspaymenttype != paymentType) {
           serviceResponse = {error:true, errorMsg:'Payment Method didnt match with Order Placed'};
           return {success: true, "type": "CC Auth Reverse", response: serviceResponse};

       } */
    var CommonFacade = require('~/cartridge/scripts/facade/CommonFacade');
    serviceResponse = CommonFacade.CheckPaymentStatusRequest(Order);

    // eslint-disable-next-line
    if (!empty(serviceResponse)) {
        return { success: true, type: 'Check payment Status', response: serviceResponse };
    }

    return { success: false, type: 'Check payment Status', response: 'No response from service' };
}

module.exports = {
    TestCCAuth: TestCCAuth,
    TestTax: TestTax,
    TestCaptureService: TestCaptureService,
    TestCreditService: TestCreditService,
    TestAuthReversal: TestAuthReversal,
    TestCheckStatusService: TestCheckStatusService
};
