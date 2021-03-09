'use strict';

/* API Includes */
var server = require('server');
var System = require('dw/system/System');
var URLUtils = require('dw/web/URLUtils');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

var TestFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/facade/TestFacade');
var TestHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/helper/TestHelper');

/**
 * Function to unit test the credit card authorization service.
 * With the hard coded data.
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
	    	var response = !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator';
	    	return { success: false, type: 'CC Auth', response: response };
	    }
}

function TestTax() {
	    var taxResponse = TestHelper.CreatTaxRequest();

	    if (!empty(taxResponse) && taxResponse.success) {
	    	return { success: true, type: 'Taxation', response: taxResponse.serviceResponse };
	    }
	    	return { success: false, type: 'Taxation', response: taxResponse.errorMsg };
}

function TestCaptureService(requestID, merchantRefCode, paymentType, paymentTotal, currency) {
    // get all the forms in session
    /* var requestID = session.forms.generictestinterfaceform.authRequestID.htmlValue;
	var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
	var paymentType = session.forms.generictestinterfaceform.capturepaymenttype.htmlValue;
	var paymentTotal = session.forms.generictestinterfaceform.grandtotalamount.value;
	var currency = session.forms.generictestinterfaceform.currency.value;
	*/
    var serviceResponse; var captureReply; var
        captureReplyTitle;
    // capture the refund service response from test facade
    if (paymentType == 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        captureReplyTitle = 'Credit card Capture Reply';
        captureReply = 'ccCaptureReply';
    } else if (paymentType == 'visacheckout') {
        var orderid = session.forms.generictestinterfaceform.orderRequestID.value;
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
        captureReplyTitle = 'VisaCheckout Capture Reply';
        captureReply = 'ccCaptureReply';
    } else if (paymentType == 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalCaptureService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        captureReplyTitle = 'PayPal Capture Reply';
        captureReply = 'apCaptureReply';
    } else if (paymentType == 'googlepay') {
        // var orderid = session.forms.generictestinterfaceform.orderRequestID.value;
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        captureReplyTitle = 'GooglePay Capture Reply';
    }
    if (!empty(serviceResponse)) {
        return { success: true, type: 'CC Capture', response: serviceResponse };

        /* res.render('services/transactionresult', {
			serviceReply : captureReply,
			response : serviceResponse,
			msgHeader : captureReplyTitle
		});
		return next(); */
    }

    return { success: false, type: 'CC Capture', response: '' };
}

function TestCreditService(requestID, merchantRefCode, paymentType, paymentTotal, currency) {
    if (paymentType == 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        creditReplyTitle = 'Credit card Credit/Refund Reply';
        refundReply = 'ccCreditReply';
    } else if (paymentType == 'visacheckout') {
        var orderid = session.forms.generictestinterfaceform.orderRequestID.value;
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
        creditReplyTitle = 'VisaCheckout Credit/Refund Reply';
        refundReply = 'ccCreditReply';
    } else if (paymentType == 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        creditReplyTitle = 'PayPal Credit/Refund Reply';
        refundReply = 'apRefundReply';
        creditReplyTitle = 'VisaCheckout Credit Reply';
    } else if (paymentType == 'googlepay') {
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
        creditReplyTitle = 'GooglePay Credit Reply';
    } else if (paymentType == 'APY') {
        var AliPayFacade = require('~/cartridge/scripts/alipay/facade/AlipayFacade');
        serviceResponse = AliPayFacade.AliPayRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        reversalReplyTitle = 'AliPay Credit/Refund Reply';
        refundReply = 'apRefundReply';
    } else if (paymentType == 'MCH' || paymentType == 'IDL' || paymentType == 'SOF') {
        var BanktransferFacade = require('~/cartridge/scripts/banktransfer/facade/BankTransferFacade');
        serviceResponse = BanktransferFacade.BanktransferRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        creditReplyTitle = 'Banktransfer Credit/Refund Reply';
        refundReply = 'apRefundReply';
    } else if (paymentType == 'APY') {
        var AliPayFacade = require('~/cartridge/scripts/alipay/facade/AlipayFacade');
        serviceResponse = AliPayFacade.AliPayRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        reversalReplyTitle = 'AliPay Credit/Refund Reply';
        refundReply = 'apRefundReply';
    }

    if (!empty(serviceResponse)) {
        return { success: true, type: 'CC Credit', response: serviceResponse };
    }

    return { success: false, type: 'CC Credit', response: serviceResponse };
}

function TestAuthReversal(requestID, merchantRefCode, paymentType, amount, currency) {
    var serviceResponse; var reversalReply; var
        reversalReplyTitle;
    // capture the refund service response from test facade
    if (paymentType == 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount);
        reversalReplyTitle = 'Credit card Reversal Reply';
        reversalReply = 'ccAuthReversalReply';
    } else if (paymentType == 'visacheckout') {
        var orderid = session.forms.generictestinterfaceform.orderRequestID.value;
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount, orderid);
        reversalReplyTitle = 'VisaCheckout Reversal Reply';
        reversalReply = 'ccAuthReversalReply';
    } else if (paymentType == 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
		    serviceResponse = PayPalFacade.PayPalReversalService(requestID, merchantRefCode, paymentType, amount, currency);
		    reversalReplyTitle = 'PayPal Reversal Reply';
		    reversalReply = 'apAuthReversalReply';
    } else if (paymentType == 'googlepay') {
        var orderid = session.forms.generictestinterfaceform.orderRequestID.value;
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount);
        reversalReplyTitle = 'Googlepay Reversal Reply';
    }

    if (!empty(serviceResponse)) {
        return { success: true, type: 'CC Auth Reverse', response: serviceResponse };
    }

    return { success: false, type: 'CC Auth Reverse', response: serviceResponse };
}

function TestCheckStatusService(merchantReferenceCode) {
    // get orderid from form field
	   var Order = {}; var serviceResponse; var apCheckStatusTitle; var
        apCheckStatusReply;
	   if (!empty(merchantReferenceCode)) {
        Order = dw.order.OrderMgr.getOrder(merchantReferenceCode);
	   }
	   if (empty(Order)) {
		   return { success: false, type: 'Check payment Status', response: 'No order found:' + merchantReferenceCode };
	   }
	   var collections = require('*/cartridge/scripts/util/collections');
	   var PaymentInstrument = require('dw/order/PaymentInstrument');
	   collections.forEach(Order.paymentInstruments, function (paymentInstrument) {
        if (!paymentInstrument.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
            paymentType = paymentInstrument.paymentTransaction.custom.apPaymentType;
        }
	   });
	  /* if(checkstatuspaymenttype != paymentType) {
		   serviceResponse = {error:true, errorMsg:'Payment Method didnt match with Order Placed'};
		   return {success: true, "type": "CC Auth Reverse", response: serviceResponse};

	   } */
	   var CommonFacade = require('~/cartridge/scripts/facade/CommonFacade');
		   serviceResponse = CommonFacade.CheckPaymentStatusRequest(Order);
		   apCheckStatusTitle = 'Check payment Status';
		   apCheckStatusReply = 'apCheckStatusReply';

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
