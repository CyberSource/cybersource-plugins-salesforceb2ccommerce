'use strict';

var BankOptionsRequestBuilder = (function () {
    var that = {};
    var buildOptionsRequest = function (params) {
        var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
        var CybersourceHelper = libCybersource.getCybersourceHelper();
        // eslint-disable-next-line
        var csReference = new CybersourceHelper.getcsReference();
        var serviceRequest = new csReference.RequestMessage();
        serviceRequest.merchantID = params.merchantId;
        serviceRequest.merchantReferenceCode = 'BankOptionList-' + params.paymentType + '-' + new Date().toDateString();
        serviceRequest.apOptionsService = csReference.APOptionsService();
        serviceRequest.apPaymentType = params.paymentType;
        serviceRequest.apOptionsService.run = true;
        return serviceRequest;
    };

    that.GetOptionsRequestObj = buildOptionsRequest;
    return that;
}());

module.exports = BankOptionsRequestBuilder;
