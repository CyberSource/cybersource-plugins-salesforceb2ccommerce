'use strict';
/* API includes */
var Logger = dw.system.Logger.getLogger('Cybersource');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

/**
* This script call service to initiate payment for Alipay and set the response in response object
* and also handles the logging of different error scenarios while making service call.
**/

function AlipayInitiatePaymentRequest(request)
{	
  	//create service stubs
   	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
   	var CybersourceHelper = libCybersource.getCybersourceHelper();	
   	var csReference  = webreferences2.CyberSourceTransaction;
   	
	//set alipay payment type to pass it as input in request
	var alipayPaymentType  = CybersourceHelper.getAlipayPaymentType();
	var serviceRequest = new csReference.RequestMessage();
	
	//call alipay initiate service by passing required input parameters
	CybersourceHelper.apInitiateService(serviceRequest,request.alipayReturnUrl,request.purchaseTotals,request.productObject.productName,request.productObject.productDescription,request.orderNo,alipayPaymentType.value);
	//get the response in response object
	var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
	var serviceResponse =  commonFacade.CallCYBService(CybersourceConstants.METHOD_ALIPAY,serviceRequest);
	return serviceResponse;
}

module.exports = {
		AlipayInitiatePaymentRequest: AlipayInitiatePaymentRequest
};