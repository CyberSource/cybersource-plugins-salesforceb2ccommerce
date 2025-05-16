'use strict';

/* eslint-disable no-undef */
/**
 * Controller dedicated to an independent Cybersource Delivery Address Verification API call.
 * @module controllers/Cybersourceunittesting
 */

var server = require('server');
var Logger = require('dw/system/Logger');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Cipher = require('dw/crypto/Cipher');
var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
var addressVerificationHelper = require('*/cartridge/scripts/helper/AddressVerificationHelper');

server.get('VerifyAddress', function (req, res, next) {
    var returnObject = {};
    try {
        var CybersourceHelper = libCybersource.getCybersourceHelper();

        //  Check if DAV is enabled.
        var davEnabled = CybersourceHelper.getDavEnable();
        if (!davEnabled) {
            returnObject.davEnabled = false;
        } else {
            // "DECLINE OR ACCEPT"
            var onFailure = CybersourceHelper.getDavOnAddressVerificationFailure().toString();
            returnObject.onFailure = onFailure;

            returnObject.davEnabled = true;
            //  Gather shipping address information.
            // var params = req.querystring;
            Cipher = new Cipher();
            var params = JSON.parse(Cipher.decrypt(req.querystring.encryptedData, req.querystring.key, 'AES/CBC/PKCS5Padding', req.querystring.iv, 0));
            var shipToAddress = addressVerificationHelper.createShipToObject(params);
            //  Although not utilized by CS in the DAV call, they do require the presence of a billToAddress.
            var billToAddress = addressVerificationHelper.createBillToObject(params);
            //  Build DAV request.
            var csReference =  new CybersourceHelper.getcsReference();
            var serviceRequest = new csReference.RequestMessage();
            CybersourceHelper.addDAVRequestInfo(serviceRequest, billToAddress, shipToAddress, false, 'AddressVerification');

            // Send request
            returnObject.error = false;
            var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;
            returnObject.serviceResponse = addressVerificationHelper.getServiceResponse(serviceRequest, paymentMethod);
        }
    } catch (e) {
        Logger.error('CyberSource', e.message);
        returnObject = { error: true, errorMsg: e.message };
    }

    res.cacheExpiration(0);
    res.json(returnObject);
    next();
});

/*
 * Module exports
 */
module.exports = server.exports();
