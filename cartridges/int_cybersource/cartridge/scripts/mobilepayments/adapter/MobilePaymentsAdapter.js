'use strict';
/**
 * Controller that performs Mobile Payment authorization.
 *
 * @module controllers/MobilePaymentsAdapter
 */

/**
 * Process mobile payment using a ApplePay or AndroidPay using API method. This would expect JSON input and returns JSON output.
 */
function processPayment(args) {
    
	/* API Includes */
	var Order = require('dw/order/Order');
	var OrderMgr = require('dw/order/OrderMgr');
	var Resource = require('dw/web/Resource');
	/* Script Modules */
	
	var ERRORCODE, ERRORMSG, serviceResponse;
    var MobilePaymentHelper = require('../helper/MobilePaymentsHelper');
    var MobilePaymentFacade = require('../facade/MobilePaymentFacade');
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var result = MobilePaymentHelper.ValidateMobilePaymentRequest();
	if (result.success) {
		var paymentAPIRequestParams = { "lineItemCtnr": result.order, "orderNo": result.OrderNo, "IPAddress": CommonHelper.GetIPAddress(), MobilePaymentType: result.MobilePaymentType};
		if (!empty(result.PaymentData)) {
			paymentAPIRequestParams.data = result.PaymentData;
			result.ServiceResponse = MobilePaymentFacade.MobilePaymentAuthRequest(paymentAPIRequestParams);
		} else {			
			paymentAPIRequestParams.cryptogram = result.requestParam.Cryptogram;
			paymentAPIRequestParams.networkToken = result.requestParam.NetworkToken;
			paymentAPIRequestParams.tokenExpirationMonth = result.requestParam.TokenExpirationMonth;
			paymentAPIRequestParams.tokenExpirationYear = result.requestParam.TokenExpirationYear;
			paymentAPIRequestParams.cardType = result.requestParam.CardType;		
			paymentAPIRequestParams.MobilePaymentType = result.MobilePaymentType;
			result.ServiceResponse = MobilePaymentFacade.MobilePaymentAuthRequest(paymentAPIRequestParams);
		}
		if (result.ServiceResponse.error) {
			return result;
		}
		serviceResponse = result.ServiceResponse.serviceResponse;
		var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
		var orderUpdateResult = PaymentInstrumentUtils.MobilePaymentOrderUpdate(result.order, result);
		if (!orderUpdateResult) {
			ERRORCODE = Resource.msg('cyb.applepay.errorcode.systemfailure', 'cybapplepay', null);
			ERRORMSG = Resource.msgf('cyb.applepay.errormsg.systemfailure', 'cybapplepay', null, result.OrderNo);													
		}	
	}
	return result;
}

//Module.exports
exports.ProcessPayment = processPayment;