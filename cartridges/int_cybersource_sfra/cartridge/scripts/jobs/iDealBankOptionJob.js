'use strict';

var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');

var iDealBankOptionJob = (function () {
    var that = {};
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Logger = require('dw/system/Logger');
    try {
        /*
        * Delete all custom objects for a specific payment type e.g. IDL
        */
        var removePreviousBankList = function (paymentType) {
            var existingBankList = CustomObjectMgr.queryCustomObjects('BTBankList', 'custom.paymentType = {0}', null, paymentType);
            // eslint-disable-next-line
            if (!empty(existingBankList)) {
                while (existingBankList.hasNext()) {
                    var bank = existingBankList.next();
                    CustomObjectMgr.remove(bank);
                }
            }
        };

        /*
        * Job execution end points.
        * @param merchantId, merchantKey and paymentType
        */
        // eslint-disable-next-line
        var run = function (jobParams, otherParams) {
            // var _request = request;
            var txn = require('dw/system/Transaction');
            var UUIDUtils = require('dw/util/UUIDUtils');
            txn.wrap(function () {
                try {
                    var serviceRequest = require('./helper/BankOptionsRequestBuilder').GetOptionsRequestObj(jobParams);
                    var service = CSServices.CyberSourceTransactionService;
                    var requestWrapper = {};
                    serviceRequest.merchantID = jobParams.merchantId;
                    requestWrapper.request = serviceRequest;
                    requestWrapper.merchantCredentials = { merchantID: jobParams.merchantId, merchantKey: jobParams.merchantKey };

                    var serviceResponse = service.call(requestWrapper);
                    // eslint-disable-next-line
                    if (!empty(serviceResponse) && serviceResponse.ok === true && !empty(serviceResponse.object.apOptionsReply.option)) {
                        removePreviousBankList(jobParams.paymentType);
                        // eslint-disable-next-line
                        serviceResponse.object.apOptionsReply.option.forEach(function (bank, index) {
                            // var newbank = bank;
                            var newBankCustomObj = CustomObjectMgr.createCustomObject('BTBankList', UUIDUtils.createUUID());
                            newBankCustomObj.custom.BankID = bank.id;
                            newBankCustomObj.custom.paymentType = jobParams.paymentType;
                            newBankCustomObj.custom.BankName = bank.name;
                        });

                        // eslint-disable-next-line
                        return new dw.system.Status(dw.system.Status.OK);
                    }
                    // eslint-disable-next-line
                    return new dw.system.Status(dw.system.Status.ERROR);
                } catch (error) {
                    Logger.error('Error in iDealBankOPtionJob.js ' + error);
                    throw error;
                }
            });
        };
        that.run = run;
        return that;
    } catch (error) {
        Logger.debug('Error in iDealBankOPtionJob.js ');
        throw error;
    }
}());

module.exports.run = iDealBankOptionJob.run;
