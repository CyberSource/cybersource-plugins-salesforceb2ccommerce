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


/**
 * Index page with links to test individual services.
 */
server.get('Index', server.middleware.https, function (req, res, next) {

        //  When in production, Redirect to home page.
    if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }
    
    res.render('services/services');
    next();
});


/**
 * Controller function to unit test the credit card authorization service. 
 * With the hard coded data.
 */
server.get('TestCCAuth', server.middleware.https, function (req, res, next) {

    //  When in production, Redirect to home page.
    if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    var billTo, shipTo, purchaseTotals, card;
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
        res.render('common/scripterror', {
            log: !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator'
        });
        next();
    }
});

/**
 * Controller function to unit test the tax service with hard coded data.
 */
server.get('TestTax', server.middleware.https, function (req, res, next) {

     //  When in production, Redirect to home page.
     if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
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
        res.render('common/scripterror', {
            log: !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator'
        });
    }
    next();;
});

/**
 * Renders Test Capture Service Form.
 */
server.get('TestCaptureService', function(req, res, next) {

     //  When in production, Redirect to home page.
     if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

	// check if service parameter not available,display form
	if (empty(request.httpParameterMap.service.stringValue)) {
		session.forms.generictestinterfaceform.clearFormElement();
		var captureServiceForm = server.forms.getForm('generictestinterfaceform');
		// render the refund service form 
		res.render('services/captureserviceform', {
			captureServiceForm : captureServiceForm,
			continueUrl: dw.web.URLUtils.https('CYBServicesTesting-CaptureService').toString()
		});
		return next();
	}
});

/**
 * Test Capture Service Handler.
 */
server.post('CaptureService', function(req, res, next) {

     //  When in production, Redirect to home page.
     if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

	// get all the forms in session
	var requestID = session.forms.generictestinterfaceform.authRequestID.htmlValue;
	var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
	var paymentType = session.forms.generictestinterfaceform.capturepaymenttype.htmlValue;
	var paymentTotal = session.forms.generictestinterfaceform.grandtotalamount.value;
	var currency = session.forms.generictestinterfaceform.currency.value;
	var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
	var serviceResponse = CardFacade.CCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
	session.forms.generictestinterfaceform.clearFormElement();
	if (!empty(serviceResponse)) {
		res.render('services/transactionresult', {
			serviceReply : 'ccCaptureReply',
			response : serviceResponse
		});
		return next();
	}
	res.render('custom/scripterror', {
		log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
	});
	return next();
});

/**
 * Renders CC Credit Service test form.
 */
server.get('TestCreditService', function(req, res, next) {

     //  When in production, Redirect to home page.
     if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

	session.forms.generictestinterfaceform.clearFormElement();
	var creditServiceForm = server.forms.getForm('generictestinterfaceform');
	// render the refund service form 
	res.render('services/cccreditserviceform', {
		creditServiceForm : creditServiceForm,
		continueUrl: dw.web.URLUtils.https('CYBServicesTesting-CreditService').toString()
	});
	return next();
});

/**
 * Test Services for CreditCard Credit Service.
 */
server.post('CreditService', function(req, res, next) {

     //  When in production, Redirect to home page.
     if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

	// capture the refund service response from test facade
	var requestID = session.forms.generictestinterfaceform.authRequestID.htmlValue;
	var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
	var paymentType = session.forms.generictestinterfaceform.capturepaymenttype.htmlValue;
	var paymentTotal = session.forms.generictestinterfaceform.grandtotalamount.value;
	var currency = session.forms.generictestinterfaceform.currency.value;
	var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
	var serviceResponse = CardFacade.CCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
	session.forms.generictestinterfaceform.clearFormElement();
	if (!empty(serviceResponse)) {
		res.render('services/transactionresult', {
			serviceReply : 'ccCreditReply',
			response : serviceResponse
		});
		return next();
	}
	res.render('custom/scripterror', {
		log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
	});
	return next();
});

/**
 * Render the CCAuthReversalService service test form. 
 */
server.get('TestAuthReversal', server.middleware.https, function (req, res, next) {

     //  When in production, Redirect to home page.
     if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }

    var authReversalServiceForm = server.forms.getForm('generictestinterfaceform');
    authReversalServiceForm.clear();
    res.render('services/authreversalform', {
		authreversalform: authReversalServiceForm
    });
    return next();
});

/**
 * Test Services for Auth Reversal Service.
 */
server.post('CCAuthReversalService', server.middleware.https, function (req, res, next) {

     //  When in production, Redirect to home page.
     if (System.getInstanceType() == System.PRODUCTION_SYSTEM) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }
    
    // get all the forms in session
    var requestID = session.forms.generictestinterfaceform.authRequestID.htmlValue;
    var merchantRefCode = session.forms.generictestinterfaceform.merchantReferenceCode.htmlValue;
    var paymentType = session.forms.generictestinterfaceform.authreversalpaymenttype.htmlValue;
    var currency = session.forms.generictestinterfaceform.currency.htmlValue;
    var amount = session.forms.generictestinterfaceform.grandtotalamount.value;
    // capture the refund service response from test facade
    var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
    var serviceResponse = CardFacade.CCAuthReversalService(requestID, merchantRefCode, paymentType, currency, amount);
    if (!empty(serviceResponse)) {
        // display the result page
    	res.render('services/ccAuthReversalresult', {
    		serviceReply : 'ccAuthReversalReply',
    		response: serviceResponse
        });
    	return next();
    } 
    res.render('common/scripterror', {
        log: !empty(serviceResponse.errorMsg) ? serviceResponse.errorMsg : 'System Exception occured contact administrator'
    });
    return next();
});

module.exports = server.exports();