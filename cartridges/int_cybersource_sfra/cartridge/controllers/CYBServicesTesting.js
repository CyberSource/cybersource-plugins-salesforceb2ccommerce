/* eslint-disable */
'use strict';

/**
 * Controller that performs testing related services of cybersource.
 * @module controllers/Cybersourceunittesting
 */

/* API Includes */
var server = require('server');
var System = require('dw/system/System');
var URLUtils = require('dw/web/URLUtils');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

var TestFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/facade/TestFacade');
var TestHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/helper/TestHelper');
var UnitTestHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/helper/UnitTestHelper');
var collections = require('*/cartridge/scripts/util/collections');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
/**
 * Index page with links to test individual services.
 */
// eslint-disable-next-line
server.get('Index', server.middleware.https, function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    res.render('services/services');
    next();
});

/**
 * Page displays results for all unit test cases executed in series
 */
// eslint-disable-next-line
server.get('RunTests', server.middleware.https, function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }
    var ResultsArray = [];
    var paymentType = 'CC';
    var currency = 'USD';
    var requestID; var merchantRefCode; var paymentTotal;

    // Unit test CC Auth
    var TestCCAuth1 = UnitTestHelper.TestCCAuth();
    ResultsArray.push(TestCCAuth1);

    // Unit test CC capture

    if (TestCCAuth1.success) {
        requestID = TestCCAuth1.response.RequestID;
        merchantRefCode = TestCCAuth1.response.MerchantReferenceCode;
        paymentTotal = TestCCAuth1.response.AuthorizationAmount;

        var TestCCCapture1 = UnitTestHelper.TestCaptureService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        ResultsArray.push(TestCCCapture1);

        // Unit test CC Credit
        requestID = TestCCCapture1.response.requestID;
        var TestCCCredit = UnitTestHelper.TestCreditService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        ResultsArray.push(TestCCCredit);

        // Unit test CC Auth for Reversal
        var TestCCAuth2 = UnitTestHelper.TestCCAuth();
        requestID = TestCCAuth2.response.RequestID;
        merchantRefCode = TestCCAuth2.response.MerchantReferenceCode;
        paymentTotal = TestCCAuth2.response.AuthorizationAmount;

        // Unit test CC auth Reverse
        var TestCCAuthReverse = UnitTestHelper.TestAuthReversal(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        ResultsArray.push(TestCCAuthReverse);
    }

    // Unit test for taxation service
    var taxResponse = UnitTestHelper.TestTax();
    ResultsArray.push(taxResponse);

    // Unit test for check status service
    // Provide a valid order number
    var checkStatusResponse = UnitTestHelper.TestCheckStatusService('00257201');
    ResultsArray.push(checkStatusResponse);

    // Render consolidated response of all services
    res.render('services/UnitTestResults', {
        TestResults: ResultsArray
    });

    next();
});

/**
 * Controller function to unit test the credit card authorization service.
 * With the hard coded data.
 */
// eslint-disable-next-line
server.get('TestCCAuth', server.middleware.https, function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

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
                        res.render('services/CCAuthUnitTestResults', {
                            CCAuthResponse: result.serviceResponse
                        });
                        next();
                    }
                }
            }
        }
    } else {
        res.render('common/scriptError', {
            log: !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator'
        });
        next();
    }
});

/**
 * Controller function to unit test the tax service with hard coded data.
 */
// eslint-disable-next-line
server.get('TestTax', server.middleware.https, function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    var TaxHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/helper/TestHelper');
    var taxResponse = TaxHelper.CreatTaxRequest();

    if (!empty(taxResponse)) {
        res.render('services/TaxUnitTestResults', {
            taxResponse: taxResponse
        });
    } else {
        res.render('common/scriptError', {
            log: !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator'
        });
    }
    next();
});

/**
 * Renders Test Capture Service Form.
 */
// eslint-disable-next-line
server.get('TestCaptureService', function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    // check if service parameter not available,display form
    if (empty(request.httpParameterMap.service.stringValue)) {
        session.forms.genericTestInterfaceForm.clearFormElement();
        var captureServiceForm = server.forms.getForm('genericTestInterfaceForm');
        // render the refund service form
        res.render('services/captureServiceForm', {
            captureServiceForm: captureServiceForm,
            continueUrl: dw.web.URLUtils.https('CYBServicesTesting-CaptureService').toString()
        });
        return next();
    }
});

/**
 * Test Capture Service Handler.
 */
server.post('CaptureService', function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    // get all the forms in session
    var requestID = session.forms.genericTestInterfaceForm.authRequestID.htmlValue;
    var merchantRefCode = session.forms.genericTestInterfaceForm.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.genericTestInterfaceForm.capturepaymenttype.htmlValue;
    var paymentTotal = session.forms.genericTestInterfaceForm.grandtotalamount.value;
    var currency = session.forms.genericTestInterfaceForm.currency.value;
    var serviceResponse; var captureReply; var
        captureReplyTitle;
    // capture the refund service response from test facade
    if (paymentType === 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        captureReplyTitle = 'Credit card Capture Reply';
        captureReply = 'ccCaptureReply';
    } else if (paymentType === 'visacheckout') {
        var orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
        captureReplyTitle = 'VisaCheckout Capture Reply';
        captureReply = 'ccCaptureReply';
    } else if (paymentType === 'KLI' || paymentType === 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalCaptureService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        if (paymentType === 'PPL') {
            captureReplyTitle = 'PayPal Capture Reply';
        }
        if (paymentType === 'KLI') {
            captureReplyTitle = 'Klarna Capture Reply';
        }
        captureReply = 'apCaptureReply';
        
    } else if (paymentType === 'googlepay') {
        // var orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        captureReplyTitle = 'GooglePay Capture Reply';
    }
    session.forms.genericTestInterfaceForm.clearFormElement();
    if (!empty(serviceResponse)) {
        res.render('services/transactionResult', {
            serviceReply: captureReply,
            response: serviceResponse,
            msgHeader: captureReplyTitle
        });
        return next();
    }
    res.render('custom/scriptError', {
        log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
    });
    return next();
});

/**
 * Renders CC Credit Service test form.
 */
server.get('TestCreditService', function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    session.forms.genericTestInterfaceForm.clearFormElement();
    var creditServiceForm = server.forms.getForm('genericTestInterfaceForm');
    // render the refund service form
    res.render('services/CCCreditServiceForm', {
        creditServiceForm: creditServiceForm,
        continueUrl: dw.web.URLUtils.https('CYBServicesTesting-CreditService').toString()
    });
    return next();
});

/**
 * Test Services for CreditCard Credit Service.
 */
server.post('CreditService', function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    // capture the refund service response from test facade
    var requestID = session.forms.genericTestInterfaceForm.authRequestID.htmlValue;
    var merchantRefCode = session.forms.genericTestInterfaceForm.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.genericTestInterfaceForm.refundpaymenttype.htmlValue;
    var paymentTotal = session.forms.genericTestInterfaceForm.grandtotalamount.value;
    var currency = session.forms.genericTestInterfaceForm.currency.value;
    var serviceResponse; var refundReply; var
        creditReplyTitle;
    var AliPayFacade = require('~/cartridge/scripts/alipay/facade/AlipayFacade');
    var orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;

    if (paymentType === 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        creditReplyTitle = 'Credit card Credit/Refund Reply';
        refundReply = 'ccCreditReply';
    } else if (paymentType === 'visacheckout') {
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
        creditReplyTitle = 'VisaCheckout Credit/Refund Reply';
        refundReply = 'ccCreditReply';
    } else if (paymentType === 'KLI' || paymentType === 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        creditReplyTitle = 'PayPal Credit/Refund Reply';
        refundReply = 'apRefundReply';
        creditReplyTitle = 'VisaCheckout Credit Reply';
    } else if (paymentType === 'googlepay') {
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency, orderid);
        creditReplyTitle = 'GooglePay Credit Reply';
    } else if (paymentType === 'APY') {
        serviceResponse = AliPayFacade.AliPayRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        reversalReplyTitle = 'AliPay Credit/Refund Reply';
        refundReply = 'apRefundReply';
    } else if (paymentType === 'MCH' || paymentType === 'IDL' || paymentType === 'SOF') {
        var BanktransferFacade = require('~/cartridge/scripts/banktransfer/facade/BankTransferFacade');
        serviceResponse = BanktransferFacade.BanktransferRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        creditReplyTitle = 'Banktransfer Credit/Refund Reply';
        refundReply = 'apRefundReply';
    } else if (paymentType === 'APY') {
        serviceResponse = AliPayFacade.AliPayRefundService(requestID, merchantRefCode, paymentType, paymentTotal, currency);
        reversalReplyTitle = 'AliPay Credit/Refund Reply';
        refundReply = 'apRefundReply';
    }

    session.forms.genericTestInterfaceForm.clearFormElement();

    if (!empty(serviceResponse)) {
        res.render('services/transactionResult', {
            serviceReply: refundReply,
            response: serviceResponse,
            msgHeader: creditReplyTitle
        });
        return next();
    }
    res.render('custom/scriptError', {
        log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
    });
    return next();
});

/**
 * Render the CCAuthReversalService service test form.
 */
server.get('TestAuthReversal', server.middleware.https, function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    var authReversalServiceForm = server.forms.getForm('genericTestInterfaceForm');
    authReversalServiceForm.clear();
    res.render('services/authReversalForm', {
        authreversalform: authReversalServiceForm
    });
    return next();
});

/**
 * Test Services for Auth Reversal Service.
 */
server.post('CCAuthReversalService', server.middleware.https, function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    // get all the forms in session
    var requestID = session.forms.genericTestInterfaceForm.authRequestID.htmlValue;
    var merchantRefCode = session.forms.genericTestInterfaceForm.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.genericTestInterfaceForm.authreversalpaymenttype.htmlValue;
    var currency = session.forms.genericTestInterfaceForm.currency.htmlValue;
    var amount = session.forms.genericTestInterfaceForm.grandtotalamount.value;
    var serviceResponse; var reversalReply; var
        reversalReplyTitle;
    var orderid = session.forms.genericTestInterfaceForm.orderRequestID.value;
    // capture the refund service response from test facade
    if (paymentType === 'CC') {
        var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
        serviceResponse = CardFacade.CCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount);
        reversalReplyTitle = 'Credit card Reversal Reply';
        reversalReply = 'ccAuthReversalReply';
    } else if (paymentType === 'visacheckout') {
        var VisaCheckoutFacade = require('~/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
        serviceResponse = VisaCheckoutFacade.VCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount, orderid);
        reversalReplyTitle = 'VisaCheckout Reversal Reply';
        reversalReply = 'ccAuthReversalReply';
    } else if (paymentType === 'KLI' || paymentType === 'PPL') {
        var PayPalFacade = require('~/cartridge/scripts/paypal/facade/PayPalFacade');
        serviceResponse = PayPalFacade.PayPalReversalService(requestID, merchantRefCode, paymentType, amount, currency);
        if (paymentType === 'PPL') {
            reversalReplyTitle = 'PayPal Reversal Reply';
        }
        if (paymentType === 'KLI') {
            reversalReplyTitle = 'Klarna Reversal Reply';
        }
        reversalReply = 'apAuthReversalReply';
    } else if (paymentType === 'googlepay') {
        var MobileCheckoutFacade = require('~/cartridge/scripts/mobilepayments/facade/MobilePaymentFacade');
        serviceResponse = MobileCheckoutFacade.GPAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount);
        reversalReplyTitle = 'Googlepay Reversal Reply';
    }

    if (!empty(serviceResponse)) {
        // display the result page
        res.render('services/transactionResult', {
            serviceReply: reversalReply,
            response: serviceResponse,
            msgHeader: reversalReplyTitle
        });
        return next();
    }
    res.render('common/scriptError', {
        log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
    });
    return next();
});

/**
 * Renders Check Status Form.
 */
// eslint-disable-next-line
server.get('TestCheckStatusService', function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    // check if service parameter not available,display form
    if (empty(request.httpParameterMap.service.stringValue)) {
        session.forms.genericTestInterfaceForm.clearFormElement();
        var checkStatusServiceForm = server.forms.getForm('genericTestInterfaceForm');
        // render the refund service form
        res.render('services/checkStatusServiceForm', {
            checkStatusServiceForm: checkStatusServiceForm,
            continueUrl: dw.web.URLUtils.https('CYBServicesTesting-CheckStatusService').toString()
        });
        return next();
    }
});

/**
 * Function to Test Services for Check Status.
 */
server.post('CheckStatusService', server.middleware.https, function (req, res, next) {
    //  When in production, Redirect to home page.
    if (System.getInstanceType() === System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    // get orderid from form field
    var Order = {}; var serviceResponse; var apCheckStatusTitle; var
        apCheckStatusReply;
    if (!empty(session.forms.genericTestInterfaceForm.merchantReferenceCode.value)) {
        Order = dw.order.OrderMgr.getOrder(session.forms.genericTestInterfaceForm.merchantReferenceCode.value);
    }
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    collections.forEach(Order.paymentInstruments, function (paymentInstrument) {
        // for each(var paymentInstrument in Order.paymentInstruments){
        if (!paymentInstrument.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
            paymentType = paymentInstrument.paymentTransaction.custom.apPaymentType;
        }
    });
    if (session.forms.genericTestInterfaceForm.checkstatuspaymenttype.htmlValue !== paymentType) {
        serviceResponse = { error: true, errorMsg: 'Payment Method didnt match with Order Placed' };
        res.render('common/scriptError', {
            log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
        });
        return next();
    }
    var CommonFacade = require('~/cartridge/scripts/facade/CommonFacade');
    serviceResponse = CommonFacade.CheckPaymentStatusRequest(Order);
    apCheckStatusTitle = 'Check payment Status';
    apCheckStatusReply = 'apCheckStatusReply';

    if (!empty(serviceResponse)) {
        // display the result page
        res.render('services/transactionresult', {
            serviceReply: apCheckStatusReply,
            response: serviceResponse,
            msgHeader: apCheckStatusTitle
        });
        return next();
    }
    res.render('common/scriptError', {
        log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
    });
    return next();
});

server.post('Generate', csrfProtection.generateToken, function (req, res, next) {
    res.json();
    next();
});

server.get('DMStandalone', server.middleware.https, function (req, res, next) {
    var bankTransferFacade = require('~/cartridge/scripts/banktransfer/facade/BankTransferFacade');
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var OrderMgr = require('dw/order/OrderMgr');

    var Order = OrderMgr.getOrder('00000202');
    var saleObject = {};

    var result = CommonHelper.CreateCyberSourceBillToObject(Order, true);
    saleObject.billTo = result.billTo;

    result = CommonHelper.CreateCybersourcePurchaseTotalsObject(Order);
    saleObject.purchaseObject = result.purchaseTotals;

    result = CommonHelper.CreateCybersourceItemObject(Order);
    saleObject.items = result.items;

    saleObject.paymentType = 'SOF';
    saleObject.cancelURL = 'https://zzkm-020.sandbox.us01.dx.commercecloud.salesforce.com/on/demandware.store/Sites-RefArch-Site/it_IT/COPlaceOrder-Submit?provider=cancelfail&cfk=false';
    saleObject.successURL = 'https://zzkm-020.sandbox.us01.dx.commercecloud.salesforce.com/on/demandware.store/Sites-RefArch-Site/it_IT/COPlaceOrder-Submit?provider=banktransfer';
    saleObject.failureURL = 'https://zzkm-020.sandbox.us01.dx.commercecloud.salesforce.com/on/demandware.store/Sites-RefArch-Site/it_IT/COPlaceOrder-Submit?provider=cancelfail&cfk=false';
    saleObject.merchantDescriptor = 'Online Store';
    saleObject.merchantDescriptorContact = '6504327350';
    saleObject.merchantDescriptorStreet = 'P.O. Box 8999';
    saleObject.merchantDescriptorCity = 'San Francisco';
    saleObject.merchantDescriptorState = 'CA';
    saleObject.merchantDescriptorPostalCode = '94128';
    saleObject.merchantDescriptorCountry = 'US';
    saleObject.orderNo = '00000202';

    var saleResponse = bankTransferFacade.BankTransferSaleService(saleObject, saleObject.paymentType);
    res.json();
    return next();
});

module.exports = server.exports();
