var Status = require('dw/system/Status');
var Logger = require('dw/system/Logger');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');

/**
 * Creatres the request input for POS authorization call and parses its response, sets them in map and returns to the calling method.
 * @param location : dw.order.LineItemCtnr
 * @param card : Object
 * @param purchaseTotal : Object
 * @param pos : Object
 * @param orderNo : String
 */


function POSAuthRequest(location, orderNo, cardObject, purchaseObject, posObject)
{
	
	//**************************************************************************//
	// Set WebReference & Stub
	//**************************************************************************//	
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var csReference = webreferences2.CyberSourceTransaction;

	//**************************************************************************//
	// the request object holds the input parameter for the AUTH request
	//**************************************************************************//	
	var serviceRequest = new csReference.RequestMessage();
	CybersourceHelper.addPOSAuthRequestInfo(serviceRequest, location, purchaseObject, cardObject, orderNo, CybersourceHelper.getDigitalFingerprintEnabled(), posObject);		


	//**************************************************************************//
	// Execute Request
	//**************************************************************************//	
	var serviceResponse = null;
	try
	{
		var service = CSServices.CyberSourceTransactionPOSService; 
		var requestObj = {location:location,requestObj:serviceRequest};
		serviceResponse = service.call(requestObj);
	}
	catch(e)
	{
		Logger.error("[POSFacade.js] Error in POSAuthRequest ( {0} )", e.message);
		return {error:true, errorMsg:e.message};
	}

	if(empty(serviceResponse) || serviceResponse.status !== "OK")
	{
		Logger.error("[POSFacade.js] POSAuthRequest Error : null response");
		return {error:true, errorMsg:"empty or error in test POSAuthRequest response: "+serviceResponse};
	}
	serviceResponse = serviceResponse.object;	
	//**************************************************************************//
	// Process Response
	//**************************************************************************//		
	var POSAdaptor = require('~/cartridge/scripts/pos/adaptor/POSAdaptor');
	var result = POSAdaptor.ProcessPOSResponse(serviceResponse);
    return {success:true, serviceResponse:result.responseObject};
}

module.exports= {
		POSAuthRequest:POSAuthRequest
}