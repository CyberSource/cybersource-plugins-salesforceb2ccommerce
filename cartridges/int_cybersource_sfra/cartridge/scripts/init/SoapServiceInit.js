'use strict';

/** *******************************************************************************
*
* Description:     Class for Cybersource SOAP Service Initialization,
*
/******************************************************************************** */
var HashMap = require('dw/util/HashMap');
var WSUtil = require('dw/ws/WSUtil');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
/**
 *
 *    SOAP Services
 *
 */

/**
 * filterServiceLog
 * @param {*} msg msg
 * @returns {*} obj
 */
function filterServiceLog(msg) {
    //  Filter Logging on production system.
    // eslint-disable-next-line
    if (dw.system.System.getInstanceType() === dw.system.System.PRODUCTION_SYSTEM) {
        //  Filter Logic.
        try {
            // eslint-disable-next-line
            if (empty(msg)) {
                return 'Message Missing';
            }
            var messageData = JSON.parse(msg);

            var filteredData = {};
            if (Object.keys(messageData).indexOf('encryptionType')) {
                filteredData.encryptionType = messageData.encryptionType;
            }
            if (Object.keys(messageData).indexOF('targetOrigin') >= 0) {
                filteredData.targetOrigin = messageData.targetOrigin;
            }
            if (Object.keys(messageData).indexOf('merchantReferenceCode') >= 0) {
                filteredData.merchantReferenceCode = messageData.merchantReferenceCode;
            }
            if (Object.keys(messageData).indexOf('requestID') >= 0) {
                filteredData.requestID = messageData.requestID;
            }
            if (Object.keys(messageData).indexOf('reasonCode') >= 0) {
                filteredData.reasonCode = messageData.reasonCode;
            }
            if (Object.keys(messageData).indexOf('decision') >= 0) {
                filteredData.decision = messageData.decision;
            }

            if (Object.keys(messageData).indexOf('purchaseTotals') >= 0) {
                if (Object.keys(messageData.purchaseTotals).indexOf('currency') >= 0) {
                    filteredData.currency = messageData.purchaseTotals.currency;
                }
                if (Object.keys(messageData.purchaseTotals).indexOf('taxAmount') >= 0) {
                    filteredData.taxAmount = messageData.purchaseTotals.taxAmount;
                }
            }

            if (Object.keys(messageData).indexOf('taxReply') >= 0) {
                if (Object.keys(messageData.taxReply).indexOf('reasonCode') >= 0) {
                    filteredData.taxReasonCode = messageData.taxReply.reasonCode;
                }
                if (Object.keys(messageData.taxReply).indexOf('totalTaxAmount') >= 0) {
                    filteredData.totalTaxAmount = messageData.taxReply.totalTaxAmount;
                }
            }

            var filteredMessage = 'PRODUCTION SYSTEM DETECTED.  DATA HAS BEEN FILTERED : ';
            filteredMessage += JSON.stringify(filteredData);

            return filteredMessage;
        } catch (e) {
            //  Message was not a JSON string.
            return 'Unable to parse Service log message.';
        }
    } else {
        //  Return full message on other systems.
        return msg;
    }
}

/** *******************************************************************************
* Service Name : cybersource.soap.transactionprocessor.generic
* Input        : request object holds the input parameter for the respective service request(custom) Object
*
/******************************************************************************** */

// dwsvc.ServiceRegistry.configure("cybersource.soap.transactionprocessor.generic", {
/*
* Description  : Method to Initialize cybersource.soap.transactionprocessor service
* Input        : None
* output       : Service Client
*
/** */
var CyberSourceTransactionService = LocalServiceRegistry.createService('cybersource.soap.transactionprocessor.generic', {

    /**
    * Description  : Method to Create request for cybersource.soap.transactionprocessor.generic service
    * @param {Object} svc cybersource transaction processor generic service
    * @param {Object} requestObj request Object
    * @returns {Object} requestObj updated service Request
    */
    createRequest: function (svc, requestObj) {
        // eslint-disable-next-line
        var csReference = webreferences2.CyberSourceTransaction;
        var service = csReference.getDefaultService();

        var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
        var CybersourceHelper = libCybersource.getCybersourceHelper();
        CybersourceHelper.setEndpoint(service);

        // eslint-disable-next-line
        svc.webReference = csReference;
        // eslint-disable-next-line
        svc.serviceClient = service;

        if (requestObj) {
            return requestObj;
        }
        return null;
    },
    /**
    * Description  : Method to Execute service request for cybersource.soap.transactionprocessor.generic
    * Input        : Customer Object
    * output       : None
    */

    execute: function (svc, parameter) {
        var userName = parameter.merchantCredentials.merchantID;
        var password = parameter.merchantCredentials.merchantKey;
        var secretsMap = new HashMap();
        secretsMap.put(userName, password);
        var requestCfg = new HashMap();
        requestCfg.put(WSUtil.WS_ACTION, WSUtil.WS_USERNAME_TOKEN);
        requestCfg.put(WSUtil.WS_USER, userName);
        requestCfg.put(WSUtil.WS_PASSWORD_TYPE, WSUtil.WS_PW_TEXT);
        requestCfg.put(WSUtil.WS_SECRETS_MAP, secretsMap);

        var responseCfg = new HashMap();
        responseCfg.put(WSUtil.WS_ACTION, WSUtil.WS_TIMESTAMP);

        WSUtil.setWSSecurityConfig(svc.serviceClient, requestCfg, responseCfg); // Setting WS security

        return svc.serviceClient.runTransaction(parameter.request);
    },
    /**
    * Description  : Method to get the response from cybersource.soap.transactionprocessor.generic service
    * Input        : response object
    * @param {Object} service cybersource transaction processor generic service
    * @param {Object} response service response
    * @returns {Object} response: updated service response
    *
    /* */
    parseResponse: function (service, response) {
        return response;
    },

    filterLogMessage: function (msg) {
        return filterServiceLog(msg);
    }
});

/** *******************************************************************************
* Service Name : ybersource.conversiondetailreport
* Input        : request object holds the input parameter for the respective service request(custom) Object
*
/******************************************************************************** */

// dwsvc.ServiceRegistry.configure("cybersource.conversiondetailreport", {
var CyberSourceConversionDetailReportService = LocalServiceRegistry.createService('cybersource.conversiondetailreport', {
    createRequest: function (svc, args) {
        // Default request method is post
        svc.setRequestMethod('POST');
        svc.addHeader('Content-Type', 'text/xml');

        var url = svc.getURL();
        var paramArray = [];
        var urlParms = url.match(/{[^{}]+}/g) || paramArray;

        // remove url parms with blank values
        urlParms = (url + '&').match(/[\x3F&][^=&]*=(?=&)/g) || paramArray;

        urlParms.forEach(function (value) {
            url = url.replace(value.replace(/[\x3F&]/g, ''), ''); // 1) strip away ? and & from parm 2) strip result from url
        });
        url = url.replace(/&{2,}/g, '&'); // replace && with &
        url = url.replace(/\x3F&/g, '?'); // replace ?& with ?
        url = url.replace(/&$/, ''); // replace & at the end with blank

        // set timestamp parm

        url = url.replace(/{merchantID}/, args.merchantId);
        url = url.replace(/{username}/, args.username);
        url = url.replace(/{password}/, args.password);
        url = url.replace(/{startDate}/, args.startDate);
        url = url.replace(/{startTime}/, args.startTime);
        url = url.replace(/{endDate}/, args.endDate);
        url = url.replace(/{endTime}/, args.endTime);
        svc.setURL(url);
    },
    parseResponse: function (service, response) {
        return response.text;
    },

    filterLogMessage: function (msg) {
        return filterServiceLog(msg);
    }
});

exports.CyberSourceTransactionService = CyberSourceTransactionService;
exports.CyberSourceConversionDetailReportService = CyberSourceConversionDetailReportService;
