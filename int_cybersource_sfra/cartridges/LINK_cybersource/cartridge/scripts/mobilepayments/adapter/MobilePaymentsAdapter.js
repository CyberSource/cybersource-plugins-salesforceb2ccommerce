'use strict';
/**
 * Controller that performs Mobile Payment authorization.
 *
 * @module controllers/MobilePaymentsAdapter
 */

/**
 * Process mobile payment using a ApplePay or AndroidPay using API method. This would expect JSON input and returns JSON output.
 * @param {Object} order the order object payment processing
 * @returns {Object} result of payment processing
 */
function processPayment(order) {
    /* API Includes */
    var Resource = require('dw/web/Resource');
    var Logger = require('dw/system/Logger').getLogger('Cybersource');
    /* Script Modules */

    var ERRORCODE;
    var ERRORMSG;
    var MobilePaymentHelper = require('../helper/MobilePaymentsHelper');
    var MobilePaymentFacade = require('../facade/MobilePaymentFacade');
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    var result = MobilePaymentHelper.validateMobilePaymentRequest(order);
    if (result.success) {
        var paymentAPIRequestParams = {
            lineItemCtnr: result.order,
            orderNo: result.OrderNo,
            IPAddress: CommonHelper.getIPAddress(),
            MobilePaymentType: result.MobilePaymentType
        };
        var Bytes = require('dw/util/Bytes');
        if (!empty(result.PaymentData)) {
            paymentAPIRequestParams.data = require('dw/crypto/Encoding').toBase64(new Bytes(JSON.stringify(result.PaymentData)));
            result.ServiceResponse = MobilePaymentFacade.mobilePaymentAuthRequest(paymentAPIRequestParams);
        } else {
            paymentAPIRequestParams.cryptogram = result.requestParam.Cryptogram;
            paymentAPIRequestParams.networkToken = result.requestParam.NetworkToken;
            paymentAPIRequestParams.tokenExpirationMonth = result.requestParam.TokenExpirationMonth;
            paymentAPIRequestParams.tokenExpirationYear = result.requestParam.TokenExpirationYear;
            paymentAPIRequestParams.cardType = result.requestParam.CardType;
            paymentAPIRequestParams.MobilePaymentType = result.MobilePaymentType;
            result.ServiceResponse = MobilePaymentFacade.mobilePaymentAuthRequest(paymentAPIRequestParams);
        }
        if (result.ServiceResponse.error) {
            return result;
        }
        var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
        var orderUpdateResult = PaymentInstrumentUtils.mobilePaymentOrderUpdate(result.order, result);
        if (!orderUpdateResult) {
            ERRORCODE = Resource.msg('cyb.applepay.errorcode.systemfailure', 'cybapplepay', null);
            ERRORMSG = Resource.msgf('cyb.applepay.errormsg.systemfailure', 'cybapplepay', null, result.OrderNo);
            Logger.error('Mobile payment error \nError code: ' + ERRORCODE + '\nError message:' + ERRORMSG);
        }

        //  Save fraud response to session.
        if (!empty(result.ServiceResponse.serviceResponse) && !empty(result.ServiceResponse.serviceResponse.Decision)) {
            var Transaction = require('dw/system/Transaction');
            Transaction.wrap(function () {
                session.custom.CybersourceFraudDecision = result.ServiceResponse.serviceResponse.Decision;
            });
        }
    }
    return result;
}

/**
 * Process mobile payment using a GooglePay using API method. This would expect JSON input and returns JSON output.
 * @param {Object} order the order object payment processing
 * @returns {Object} result of payment processing
 */
function processPaymentGP(order) {
    /* API Includes */
    var Resource = require('dw/web/Resource');
    var Logger = require('dw/system/Logger').getLogger('Cybersource');
    /* Script Modules */

    var ERRORCODE;
    var ERRORMSG;
    var MobilePaymentHelper = require('../helper/MobilePaymentsHelper');
    var MobilePaymentFacade = require('../facade/MobilePaymentFacade');
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
        var paymentAPIRequestParams = {
            lineItemCtnr: order.order,
            orderNo: order.OrderNo,
            IPAddress: CommonHelper.getIPAddress(),
            MobilePaymentType: CybersourceConstants.METHOD_GooglePay
        };
        var Bytes = require('dw/util/Bytes');
        if (!empty(result.PaymentData)) {
        	paymentAPIRequestParams.data = session.privacy.encryptedDataGP;
            //paymentAPIRequestParams.data = require('dw/crypto/Encoding').toBase64(new Bytes(JSON.stringify(result.PaymentData)));
            result.ServiceResponse = MobilePaymentFacade.mobilePaymentAuthRequest(paymentAPIRequestParams);
        } 
        if (result.ServiceResponse.error) {
            return result;
        }
        var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
        var orderUpdateResult = PaymentInstrumentUtils.mobilePaymentOrderUpdate(result.order, result);
        if (!orderUpdateResult) {
            ERRORCODE = Resource.msg('cyb.applepay.errorcode.systemfailure', 'cybapplepay', null);
            ERRORMSG = Resource.msgf('cyb.applepay.errormsg.systemfailure', 'cybapplepay', null, result.OrderNo);
            Logger.error('Mobile payment error \nError code: ' + ERRORCODE + '\nError message:' + ERRORMSG);
        }

        //  Save fraud response to session.
        if (!empty(result.ServiceResponse.serviceResponse) && !empty(result.ServiceResponse.serviceResponse.Decision)) {
            var Transaction = require('dw/system/Transaction');
            Transaction.wrap(function () {
                session.custom.CybersourceFraudDecision = result.ServiceResponse.serviceResponse.Decision;
            });
        }
    return result;
}

/**
 * Update shipping details in cart object
 */

function UpdateShipping(shippingDetails)
{
	var BasketMgr = require('dw/order/BasketMgr');
	var ShippingMgr = require('dw/order/ShippingMgr');
	var basket = BasketMgr.getCurrentOrNewBasket();
	var shipment = basket.defaultShipment;
	var shippingAddress = {};
	var Transaction = require('dw/system/Transaction');
	var logger = require('dw/system/Logger');
	
	if(!empty(shipment.getShippingAddress())) {
		return {success:true};
	}	
	try {
		Transaction.wrap(function () {
			// Create or replace the shipping address
			shippingAddress = shipment.createShippingAddress();	
			// Populate the shipping address from the visa object
			var MobilePaymentHelper = require('../helper/MobilePaymentsHelper');
			shippingAddress = MobilePaymentHelper.CreateLineItemCtnrShippingAddress(shippingAddress,shippingDetails);
			if (!shippingAddress.success) { 
				return shippingAddress;
			}
		    // Set shipping method to default if not already set
			if (shipment.shippingMethod === null) {
				shipment.setShippingMethod(ShippingMgr.getDefaultShippingMethod());
			}
		});
		    return {success:true};
		} catch(err) {
			logger.error('Error creating shipment from Google Pay address: {0}', err.message);
			return {error:true, errorMsg:Resource.msg('visaCheckout.shippingUpdate.prepareShipments', 'cybersource', null)};
		}
}

/**
 * Update billing details in cart object
 */

function UpdateBilling(Basket,GPCheckoutPaymentData,email)
{
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var Site = require('dw/system/Site');
	var Transaction = require('dw/system/Transaction');
	var Resource = require('dw/web/Resource');
	var PaymentMgr = require('dw/order/PaymentMgr');
	var BasketMgr = require('dw/order/BasketMgr');
	var result = {};
	var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
	var logger = require('dw/system/Logger');
	
	try {
		var i = PaymentMgr.getPaymentMethod(Resource.msg('paymentmethodname.googlepay','cybersource',null));
		if(PaymentMgr.getPaymentMethod(Resource.msg('paymentmethodname.googlepay','cybersource',null)).isActive()){
			var basket = BasketMgr.getCurrentOrNewBasket();
			// Retrieve the inputs
			if (!empty(Basket)) {
				Transaction.wrap(function (){
		    		CommonHelper.removeExistingPaymentInstruments(basket);
		    		//removeExistingPaymentInstruments(basket,CybersourceConstants.METHOD_AndroidPay);
		        });
				PaymentInstrumentUtils.updatePaymentInstrumentGP(Basket,GPCheckoutPaymentData,email);
				result.success = true;
			}
			else {
		    	// if basket/basketUUID/encryptedPaymentData/encryptedPaymentWrappedKey/callId is empty
		    	// or basketUUID not equal to signature
		    	logger.error('basket is empty');
		    	result.error = true;
	    	}
		}
		else
		{
			// if payment method not Visa
			logger.error('payment method not Visa');
			result.error = true;
		}
	}catch(err) {
		var i = err.message;
			logger.error('Error creating Google Checkout payment instrument: {0}', err.message);
			result.error = true;
		} finally {
			return result;	
		}
}

// Module.exports

module.exports = {
		processPayment : processPayment,
		UpdateShipping : UpdateShipping,
		UpdateBilling : UpdateBilling,
		processPaymentGP : processPaymentGP
};
