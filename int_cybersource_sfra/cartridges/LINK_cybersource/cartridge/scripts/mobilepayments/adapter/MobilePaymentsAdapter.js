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

// Module.exports
exports.processPayment = processPayment;
