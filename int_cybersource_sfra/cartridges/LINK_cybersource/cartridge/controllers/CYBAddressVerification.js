'use strict';
/**
 * Controller dedicated to an independent Cybersource Delivery Address Verification API call.
 * @module controllers/Cybersourceunittesting
 */

var server = require('server');
var Logger = require('dw/system/Logger');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');

/**
 * API endpoint that can be utilized by front-end JS to access the CS DAV service.
 * 
 * Expects these http parameter in the url:
 *      firstName
 *      lastName
 *      address1
 *      address2 (optional)
 *      city
 *      state
 *      zipCode
 *      countryCode	
 * 
 */
server.get('VerifyAddress', function (req, res, next) {

    try {
            //  Gather shipping address information.
        var params = req.querystring;
        var shipToAddress = createShipToObject(params);
            //  Although not utilized by CS in the DAV call, they do require the presence of a billToAddress.
        var billToAddress = createBillToObject(params);
            //  Build DAV request.
        var csReference = webreferences.CyberSourceTransaction;
        var serviceRequest = new csReference.RequestMessage();
        var CybersourceHelper = libCybersource.getCybersourceHelper();
        CybersourceHelper.addDAVRequestInfo(serviceRequest, billToAddress, shipToAddress, false, "AddressVerification");

        var returnObject = {};

            // Send request
        returnObject.error = false;
        var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;
        returnObject.serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
    } catch (e) {
        Logger.error("CyberSource", e.message);
        returnObject = { error: true, errorMsg: e.message };
    }

    res.cacheExpiration(0);
    res.json(returnObject);
    next();
});


/*
 *  Create a CS ShipToOObject with the given parameters.
 */
function createShipToObject(params) {
        //  Validate input.
    if (empty(params.firstName)){
        throw new Error("Missing firstName http paramameter");
    }
    if (empty(params.lastName)){
        throw new Error("Missing lastName http paramameter");
    }
    if (empty(params.address1)){
        throw new Error("Missing address1 http paramameter");
    }
    if (empty(params.city)){
        throw new Error("Missing city http paramameter");
    }
    if (empty(params.state)){
        throw new Error("Missing state http paramameter");
    }
    if (empty(params.zipCode)){
        throw new Error("Missing zip http paramameter");
    }
    if (empty(params.countryCode)){
        throw new Error("Missing countryCode http paramameter");
    }
        //  Build ship to object.
    var ShipTo_Object = require('~/cartridge/scripts/cybersource/Cybersource_ShipTo_Object');
    var shipToObject = new ShipTo_Object();
    shipToObject.setFirstName(params.firstName);
    shipToObject.setLastName(params.lastName);
    shipToObject.setStreet1(params.address1);
    if (!empty(params.address2)){
        shipToObject.setStreet2(params.address2);
    }
    shipToObject.setCity(params.city);
    shipToObject.setState(params.state);
    shipToObject.setPostalCode(params.zipCode);
    shipToObject.setCountry(params.countryCode);

    return shipToObject;
}


/*
 *  Create a CS BillToOObject with the given parameters.
 */
function createBillToObject(params) {
        //  Validate input.
    if (empty(params.firstName)){
        throw new Error("Missing firstName http paramameter");
    }
    if (empty(params.lastName)){
        throw new Error("Missing lastName http paramameter");
    }
    if (empty(params.address1)){
        throw new Error("Missing address1 http paramameter");
    }
    if (empty(params.city)){
        throw new Error("Missing city http paramameter");
    }
    if (empty(params.state)){
        throw new Error("Missing state http paramameter");
    }
    if (empty(params.zipCode)){
        throw new Error("Missing zip http paramameter");
    }
    if (empty(params.countryCode)){
        throw new Error("Missing countryCode http paramameter");
    }
        //  Build ship to object.
    var BillTo_Object = require('~/cartridge/scripts/cybersource/Cybersource_BillTo_Object');
    var billToObject = new BillTo_Object();
    billToObject.setFirstName(params.firstName);
    billToObject.setLastName(params.lastName);
    billToObject.setStreet1(params.address1);
    if (!empty(params.address2)){
        billToObject.setStreet2(params.address2);
    }
    billToObject.setCity(params.city);
    billToObject.setState(params.state);
    billToObject.setPostalCode(params.zipCode);
    billToObject.setCountry(params.countryCode);

    return billToObject;
}


/*
 *  Send the giver request object to Cybersource, parse the results
 *  and return a pared-down JSON object that can utilized by the front-end.
 */
function getServiceResponse(request, paymentMethod) {

    var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');
    var service = CSServices.CyberSourceTransactionService;
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var merchantCrdentials = CybersourceHelper.getMerhcantCredentials(paymentMethod);
    var requestWrapper = {};
    var responseObject = {};

    request.merchantID = merchantCrdentials.merchantID;
    requestWrapper.request = request;
    requestWrapper.merchantCredentials = merchantCrdentials;
        
        //  Call the service.
    var serviceResponse = service.call(requestWrapper);

    if (empty(serviceResponse) || serviceResponse.status != "OK") {
        throw new error("DAV Service Response failure");
    }
    if (!empty(serviceResponse.errorMessage)) {
        throw new Error(serviceResponse.errorMessage);
    }
    if (empty(serviceResponse.object)) {
        throw new Error("Missing response object in CS DAV response.");
    }

        //  Create a return object from received data.
    responseObject.decision = serviceResponse.object.decision;
    responseObject.requestID = serviceResponse.object.requestID;
    responseObject.requestToken =  serviceResponse.object.requestToken;
    responseObject.reasonCode = serviceResponse.object.reasonCode.toString();
    
    if (!empty(serviceResponse.object.davReply)) {
        var davReply = serviceResponse.object.davReply;
        responseObject.davReasonCode = davReply.reasonCode.toString();              
        responseObject.standardizedAddress1 = davReply.standardizedAddress1;        
        responseObject.standardizedAddress2 = davReply.standardizedAddress2;
        responseObject.standardizedAddressNoApt = davReply.standardizedAddressNoApt;
        responseObject.standardizedCity = davReply.standardizedCity;
        responseObject.standardizedState = davReply.standardizedState;
        responseObject.standardizedPostalCode = davReply.standardizedPostalCode;
        responseObject.standardizedCounty = davReply.standardizedCounty;
        responseObject.standardizedCountry = davReply.standardizedCountry;
        responseObject.standardizedISOCountry = davReply.standardizedISOCountry;
        responseObject.standardizedCSP = davReply.standardizedCSP;
    }
        
    var missingFields = [];
    if (!empty(serviceResponse.object.missingField)) {
        for each (var mField in serviceResponse.object.missingField) {
            missingFields = missingFields.push(mField.toString());
        }
    }
    responseObject.missingFields = missingFields

    var invalidFields = [];
    if (!empty(serviceResponse.object.invalidField)) {
        for each (var iField in serviceResponse.object.invalidField) {
            invalidField = invalidFields.push(iField.toString());
        }
    }
    responseObject.invalidField = invalidFields;

    return responseObject;
}

/*
 * Module exports
 */
module.exports = server.exports();
