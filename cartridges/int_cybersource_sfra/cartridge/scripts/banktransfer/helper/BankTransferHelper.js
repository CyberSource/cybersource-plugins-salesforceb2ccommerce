/**
* Utility methods for Bank Transfer payment methods.
*
* @module cartridge/scripts/banktransfer/helper/BankTransferHelper
*/

'use strict';

/**
* Description of the function
*
* @return {String} Supported bank list for provided bank transfer payment method 'getBankListJson'
*/

var BankTransferHelper = (function () {
    var that = {};
    var getBankListJson = function (paymentMethod) {
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var retObj = null;
        // eslint-disable-next-line
        if (!empty(paymentMethod)) {
            var existingBankList = CustomObjectMgr.queryCustomObjects('BTBankList', 'custom.paymentType = {0}', null, paymentMethod.ID);
            retObj = [];
            // eslint-disable-next-line
            while (!empty(existingBankList) && existingBankList.hasNext()) {
                var bank = existingBankList.next();
                retObj.push({ name: bank.custom.BankName, id: bank.custom.BankID });
            }
        }
        return retObj;
    };
    var isBankListRequired = function (paymentMethodObj) {
        var paymentMethod = paymentMethodObj;
        // eslint-disable-next-line
        paymentMethod = dw.order.PaymentMgr.getPaymentMethod(paymentMethod);
        if ('isSupportedBankListRequired' in paymentMethod.custom && paymentMethod.custom.isSupportedBankListRequired) {
            return paymentMethod.custom.isSupportedBankListRequired;
        }
        return false;
    };
    var isBicRequired = function (paymentMethodObj) {
        var paymentMethod = paymentMethodObj;
        // eslint-disable-next-line
        paymentMethod = dw.order.PaymentMgr.getPaymentMethod(paymentMethod);
        if ('isBicEnabled' in paymentMethod.custom && paymentMethod.custom.isBicEnabled) {
            return paymentMethod.custom.isBicEnabled;
        }
        return false;
    };
    that.getBankListJson = getBankListJson;
    that.isBankListRequired = isBankListRequired;
    that.isBicRequired = isBicRequired;
    return that;
}());

exports.getBankListJson = BankTransferHelper.getBankListJson;
exports.isBankListRequired = BankTransferHelper.isBankListRequired;
exports.isBicRequired = BankTransferHelper.isBicRequired;
