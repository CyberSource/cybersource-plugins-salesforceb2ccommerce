'use strict';
/* API includes */
var Logger = dw.system.Logger.getLogger('Cybersource');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');


/**
* This script call service to initiate payment for Alipay and set the response in response object
* and also handles the logging of different error scenarios while making service call.
**/

function AlipayInitiatePaymentRequest(request)
{	
  	//create service stubs
   	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
   	var CybersourceHelper = libCybersource.getCybersourceHelper();	
   	var csReference  = webreferences.CyberSourceTransaction;
   	
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


/*****************************************************************************
 * Name: RefundService
 * Description: Initiate refund CyberSource for Alipay order.
 * param : Request stub ,order object and Payment type
****************************************************************************/
function AliPayRefundService(requestID, merchantRefCode, paymentType, amount, currency){
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
var CybersourceHelper = libCybersource.getCybersourceHelper();

var csReference = webreferences.CyberSourceTransaction;
var serviceRequest = new csReference.RequestMessage();

var purchaseObject = CommonHelper.CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount);
purchaseObject = purchaseObject.purchaseTotals;
serviceRequest.purchaseTotals = libCybersource.copyPurchaseTotals(purchaseObject);

libCybersource.setClientData(serviceRequest, merchantRefCode);
CybersourceHelper.aliPayRefundService(serviceRequest, requestID, paymentType);

//  Provide ability to customize request object with a hook.
var HookMgr = require('dw/system/HookMgr');
if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
    var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Credit', serviceRequest);
    if (!empty(modifiedServiceRequest)) {
    serviceRequest = modifiedServiceRequest;
    }
}

var serviceResponse = null;
// send request
try{
	var service = CSServices.CyberSourceTransactionService;
	var merchantCrdentials=CybersourceHelper.getMerhcantCredentials(CybersourceConstants.METHOD_ALIPAY);
	var requestWrapper={};
    serviceRequest.merchantID = merchantCrdentials.merchantID;
	requestWrapper.request =serviceRequest;
	requestWrapper.merchantCredentials = merchantCrdentials; 
	serviceResponse = service.call(requestWrapper); 
}catch(e){
	Logger.error("[AliPayFacade.ds] Error in AliPayRefundService request ( {0} )",e.message);
	return {error:true, errorMsg:e.message};
}

if(empty(serviceResponse) || serviceResponse.status !== "OK"){
	Logger.error("[AliPayFacade.ds] response in AliPayRefundService response ( {0} )",serviceResponse);
	return {error:true, errorMsg:"empty or error in AliPayRefundService response: "+serviceResponse};
}
serviceResponse = serviceResponse.object;
return serviceResponse;
}

module.exports = {
		AlipayInitiatePaymentRequest: AlipayInitiatePaymentRequest,
		AliPayRefundService : AliPayRefundService
};