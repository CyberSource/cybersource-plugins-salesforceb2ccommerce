'use strict';
/**
 * Controller dedicated to an independent Cybersource Delivery Address Verification API call.
 * @module controllers/Cybersourceunittesting
 */

var server = require('server');
var Logger = require('dw/system/Logger');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var Resource = require('dw/web/Resource');

var resources= {
		 missingFirstName : Resource.msg('dav.missingfirstname', 'cybersource', null),
		 missingLastName : Resource.msg('dav.missinglastname', 'cybersource', null),
		 missingAddress1 : Resource.msg('dav.missingaddress1', 'cybersource', null),
	     missingCity : Resource.msg('dav.missingcity', 'cybersource', null),
	     missingState : Resource.msg('dav.missingstate', 'cybersource', null),
	     missingZipCode : Resource.msg('dav.missingzipcode', 'cybersource', null),
	     missingCountryCode : Resource.msg('dav.missingcountrycode', 'cybersource', null)	 
	};

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
        var CybersourceHelper = libCybersource.getCybersourceHelper();

        var returnObject = {};
            //  Check if DAV is enabled.
        var davEnabled = CybersourceHelper.getDavEnable();
        if (!davEnabled) {
            returnObject.davEnabled = false;
        }
        else {
                // "DECLINE OR ACCEPT"
            var onFailure = CybersourceHelper.getDavOnAddressVerificationFailure().toString();
            returnObject.onFailure = onFailure;

            returnObject.davEnabled = true;
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

                // Send request
            returnObject.error = false;
            var paymentMethod = PaymentInstrument.METHOD_CREDIT_CARD;
            returnObject.serviceResponse = getServiceResponse(serviceRequest, paymentMethod);
        }
    } 
    catch (e) {
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
        throw new Error(resources.missingFirstName);
    }
    if (empty(params.lastName)){
        throw new Error(resources.missingLastName);
    }
    if (empty(params.address1)){
        throw new Error(resources.missingAddress1);
    }
    if (empty(params.city)){
        throw new Error(resources.missingCity);
    }
    if (empty(params.zipCode)){
        throw new Error(resources.missingZipCode);
    }
    if (empty(params.countryCode)){
        throw new Error(resources.missingCountryCode);
    }
    if ( (params.countryCode == 'US' || params.countryCode == 'CA') && empty(params.state)){
        throw new Error(resources.missingState);
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
    if (!empty(params.state)){
        shipToObject.setState(params.state);
    }
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
        throw new Error(resources.missingFirstName);
    }
    if (empty(params.lastName)){
        throw new Error(resources.missingLastName);
    }
    if (empty(params.address1)){
        throw new Error(resources.missingAddress1);
    }
    if (empty(params.city)){
        throw new Error(resources.missingCity);
    }
    if ( (params.countryCode == 'US' || params.countryCode == 'CA') && empty(params.state)){
        throw new Error(resources.missingState);
    }
    if (empty(params.zipCode)){
        throw new Error(resources.missingZipCode);
    }
    if (empty(params.countryCode)){
        throw new Error(resources.missingCountryCode);
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
    if (!empty(params.state)){
        billToObject.setState(params.state);
    }
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


    responseObject.reasonMessage = getReasonMessage(responseObject.reasonCode, missingFields, invalidFields);
    
    if (!empty(serviceResponse.object.davReply)) {
        var davReply = serviceResponse.object.davReply;
        responseObject.davReasonCode = davReply.reasonCode.toString();              
        responseObject.standardizedAddress1 = davReply.standardizedAddress1;        
        responseObject.standardizedAddress2 = davReply.standardizedAddress2;
        responseObject.standardizedAddressNoApt = davReply.standardizedAddressNoApt;
        responseObject.standardizedCity = davReply.standardizedCity;
        if (request.shipTo.state == 'OTHER') {
            responseObject.standardizedState = "OTHER";
        }
        else {
            responseObject.standardizedState = davReply.standardizedState;
        }
        responseObject.standardizedPostalCode = davReply.standardizedPostalCode;
        responseObject.standardizedCounty = davReply.standardizedCounty;
        responseObject.standardizedCountry = davReply.standardizedISOCountry;
        responseObject.standardizedISOCountry = davReply.standardizedISOCountry;
        responseObject.standardizedCSP = davReply.standardizedCSP;
    }
        
   

    return responseObject;
}

function getReasonMessage(reasonCode, missingFields, invalidFields) {
    var message = "";

    if (reasonCode == "100") {
        return message;
    }

    if (!empty(missingFields)) {
        message = "The " + missingFields[0] + " field is missing."
        return message;
    }

    if (!empty(invalidFields)) {
        message = "The " + invalidFields[0] + " field is invalid."
        return message;
    }
    
    var resources= {
        	reasonmessage450: Resource.msg('dav.reasonmessage450', 'cybersource', null),
        	reasonmessage451: Resource.msg('dav.reasonmessage451', 'cybersource', null),
        	reasonmessage452: Resource.msg('dav.reasonmessage452', 'cybersource', null),
        	reasonmessage453: Resource.msg('dav.reasonmessage453', 'cybersource', null),
        	reasonmessage454: Resource.msg('dav.reasonmessage454', 'cybersource', null),
        	reasonmessage455: Resource.msg('dav.reasonmessage455', 'cybersource', null),
        	reasonmessage456: Resource.msg('dav.reasonmessage456', 'cybersource', null),
        	reasonmessage457: Resource.msg('dav.reasonmessage457', 'cybersource', null),
        	reasonmessage458: Resource.msg('dav.reasonmessage458', 'cybersource', null),
        	reasonmessage459: Resource.msg('dav.reasonmessage459', 'cybersource', null),
        	reasonmessage460: Resource.msg('dav.reasonmessage460', 'cybersource', null),
        	reasonmessage461: Resource.msg('dav.reasonmessage461', 'cybersource', null),
        	reasonmessageDefault: Resource.msg('dav.reasonmessageDefault', 'cybersource', null)        	
        };
    
    switch (reasonCode) {
        case '100':
            message = "";
            break;
        case '450':
            message = resources.reasonmessage450;
            break;
        case '451':
            message = resources.reasonmessage451;
            break;
        case '452':
            message = resources.reasonmessage452;
            break;
        case '453':
            message = resources.reasonmessage453;
            break;
        case '454':
            message = resources.reasonmessage454;
            break;
        case '455':
            message = resources.reasonmessage455;
            break;
        case '456':
            message = resources.reasonmessage456;
            break;
        case '457':
            message = resources.reasonmessage457;
            break;
        case '458':
            message = resources.reasonmessage458;
            break;
        case '459':
            message = resources.reasonmessage459;
            break;
        case '460':
            message = resources.reasonmessage460;
            break;
        case '461':
            message = resources.reasonmessage461;
            break;
        default:
            message = resources.reasonmessageDefault;
            break;
    }
        
    return message;

}

/*
 * Module exports
 */
module.exports = server.exports();
