'use strict';

/** *******************************************************************************
*
* Description:     Class for Cybersource HTTP Service Initialization,
*
/******************************************************************************** */
// var HashMap = require('dw/util/HashMap');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');

var logger = Logger.getLogger('CyberSource', 'RestAPIServices');
/**
 *
 *    HTTP Services
 *
 */
/** *******************************************************************************
* Service Name : cybersource.http.flextoken
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
var CyberSourceFlexTokenService = LocalServiceRegistry.createService('cybersource.http.flextoken', {
    createRequest: function (svc, requestObj, digestString) {
        var collections = require('*/cartridge/scripts/util/collections');
        svc.setRequestMethod('POST');
        svc.addHeader('Accept', 'application/json; charset=utf-8');
        svc.addHeader('Content-Type', 'application/json; charset=utf-8');
        collections.forEach(requestObj.keySet(), function (key) {
            //  for each (var key in requestObj.keySet()) {
            svc.addHeader(key, requestObj.get(key));
        });
        return digestString;
    },
    parseResponse: function (svc, client) {
        return client.text;
    },
    filterLogMessage: function (msg) {
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
                if (Object.keys(messageData).indexOf('targetOrigins') >= 0) {
                    filteredData.targetOrigins = messageData.targetOrigins;
                }
                if (Object.keys(messageData).indexOf('allowedCardNetworks') >= 0) {
                    filteredData.allowedCardNetworks = messageData.allowedCardNetworks;
                }
                if (Object.keys(messageData).indexOf('clientVersion') >= 0) {
                    filteredData.clientVersion = messageData.clientVersion;
                }

                var filteredMessage = 'PRODUCTION SYSTEM DETECTED.  RESPONSE HAS BEEN FILTERED : ';
                filteredMessage += JSON.stringify(filteredData);

                return filteredMessage;
            } catch (e) {
                //  msg was not a JSON string.
                //  In this case, we hide all data.
                return 'Unable to parse Service log message.';
            }
        } else {
            //  Return full message on other systems.
            return msg;
        }
    }
});

var CyberSourceAssymentricKeyManagement = LocalServiceRegistry.createService('cybersource.assymentrickeymanagement', {
    createRequest: function (svc, requestObj, keyId) {
        var collections = require('*/cartridge/scripts/util/collections');
        svc.setRequestMethod('GET');
        svc.addHeader('Accept', 'application/json');
        svc.addHeader('Content-Type', 'application/json;charset=utf-8');
        collections.forEach(requestObj.keySet(), function (key) {
            //  for each (var key in requestObj.keySet()) {
            svc.addHeader(key, requestObj.get(key));
        });
        // eslint-disable-next-line
        svc.URL += "/" + keyId;
    },
    parseResponse: function (svc, client) {
        return client.text;
    },
    filterLogMessage: function (msg) {
        //  No need to filter logs.  No sensitive information.
        return msg;
    }
});



var CyberSourceDMService = LocalServiceRegistry.createService('cybersource.conversiondetailreport', {
    createRequest: function (svc, requestObj, starttime, endtime, merchantId) {
        var collections = require('*/cartridge/scripts/util/collections');
        svc.setRequestMethod('GET');
        svc.addHeader('Content-Type', 'application/json');
        collections.forEach(requestObj.keySet(), function (key) {
            //  for each (var key in requestObj.keySet()) {
            svc.addHeader(key, requestObj.get(key));
        });
        // eslint-disable-next-line
        svc.URL += '?startTime=' + starttime + '&endTime=' + endtime + '&organizationId=' + merchantId;
    },
    parseResponse: function (svc, client) {
        logger.debug('Conversion Detail Report Request Data: {0}', JSON.stringify(svc.requestData));
        return client.text;
    },
    filterLogMessage: function (msg) {
        //  No need to filter logs.  No sensitive information.
        return msg;
    }
});

module.exports = {
    CyberSourceFlexTokenService: CyberSourceFlexTokenService,
    CyberSourceDMService: CyberSourceDMService,
    CyberSourceAssymentricKeyManagement: CyberSourceAssymentricKeyManagement
};
