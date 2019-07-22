/*
* @input ProcessRequest :String
* @input PaymentInstrument : Object
* @input Order : Object
* @input Basket : Object
* @output ErrorMsg : Object
* @output Data : Object
* @output FormAction : String
* @output NextStep : String
* @output outputOrder : Object
* @output authenticationTransactionID : String
*/
var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants');
var secureAcceptanceAdapter =  require(CybersourceConstants.CS_CORE+'/cartridge/scripts/secureacceptance/adapter/SecureAcceptanceAdapter');
function execute( args : PipelineDictionary ) : Number
{
	var PaymentMgr = require('dw/order/PaymentMgr'),
	Transaction = require('dw/system/Transaction'),
	currentProcess = args.ProcessRequest,
	response = PIPELET_ERROR;
	switch(currentProcess){
		case CybersourceConstants.HANDLE :  
			var paymentMethod = args.CurrentForms.billing.paymentMethods.selectedPaymentMethodID.value;
			var additionalArgs = {};
			if(empty(paymentMethod)){
				response = PIPELET_ERROR;	
			} else{
				additionalArgs.PaymentMethod = paymentMethod;
				additionalArgs.cart = require('dw/order/BasketMgr').getCurrentBasket(); 
				var handleResponse = secureAcceptanceAdapter.HandleRequest(args,additionalArgs);
				if(handleResponse.sucess){
					response = PIPELET_NEXT;
				}else{
					response = PIPELET_ERROR;
				}
			}
		break;
		case CybersourceConstants.AUTHORIZE :
			var PaymentInstrument = args.PaymentInstrument,
			paymentMethod = PaymentInstrument.paymentMethod,
			saveCard = args.CurrentForms.billing.paymentMethods.creditCard.saveCard.value,
			additionalArgs={};
			if (saveCard) {
				Transaction.wrap(function () {
					PaymentInstrument.custom.savecard = true;
				});
			}
			if (paymentMethod == CybersourceConstants.METHOD_SA_REDIRECT) {
				additionalArgs.subscriptionToken = args.CurrentForms.billing.paymentMethods.creditCard.selectedCardID.value;
				var saRedirectRequest = secureAcceptanceAdapter.Authorize(args,additionalArgs);
				if (saRedirectRequest.success) {
					args.Data = saRedirectRequest.requestData;
					args.FormAction = saRedirectRequest.formAction;
					args.NextStep = CybersourceConstants.METHOD_SA_REDIRECT;
					response = PIPELET_NEXT;
				}else{
					response = PIPELET_ERROR;	
				}
			}else if(paymentMethod == CybersourceConstants.METHOD_SA_IFRAME){
				var authResponse = secureAcceptanceAdapter.Authorize(args,additionalArgs);
				if(authResponse.returnToPage){
					args.NextStep = CybersourceConstants.METHOD_SA_IFRAME;
					args.outputOrder = authResponse.order;
					response = PIPELET_NEXT;													
				}
			}else if(paymentMethod == CybersourceConstants.METHOD_SA_SILENTPOST){
				var authResponse = secureAcceptanceAdapter.Authorize(args,additionalArgs);
				if(authResponse.process3DRedirection){
					args.NextStep = CybersourceConstants.PROCESS3DREDIRECTION;
					var Data = {};
					Data.AcsURL = authResponse.AcsURL;
					Data.PAXID = authResponse.PAXID;
					Data.PAReq = authResponse.PAReq;
					args.Data = Data;
					args.authenticationTransactionID = authResponse.authenticationTransactionID;
					response = PIPELET_NEXT;
				}else if(authResponse.error){
					response = PIPELET_ERROR;
				} else{
					args.NextStep = CybersourceConstants.METHOD_SA_SILENTPOST;
					response = PIPELET_NEXT;
				}
			}
			var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).getPaymentProcessor();
			Transaction.wrap(function () {
				PaymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
			});
		break;
		case CybersourceConstants.SARESPONSE : 
			var secureAcceptanceResponse = secureAcceptanceAdapter.SAResponse(args.CurrentHttpParameterMap);
			args.NextStep = secureAcceptanceResponse.nextStep;
			args.Data = empty(secureAcceptanceResponse.location)?secureAcceptanceResponse.data:secureAcceptanceResponse.location;
			args.outputOrder = require('dw/order/OrderMgr').getOrder(args.CurrentHttpParameterMap.req_reference_number.stringValue);
			if(true == secureAcceptanceResponse.nextStep || false == secureAcceptanceResponse.nextStep){
				response = PIPELET_ERROR;
			} else {
				if(CybersourceConstants.SA_SUMMARY.equals(args.NextStep)){
					args.Data = secureAcceptanceResponse.data;
				}
				response = PIPELET_NEXT;
			}
		break; 
		case CybersourceConstants.OPENIFRAME : 
			var secureAcceptanceResponse = secureAcceptanceAdapter.OpenIframe(args.Order);
			if(secureAcceptanceResponse.success){
				args.Data = secureAcceptanceResponse.data;
				args.FormAction = secureAcceptanceResponse.formAction;
				response = PIPELET_NEXT;
			}else{
				response = PIPELET_ERROR;
			}
		break;
		case CybersourceConstants.GETSILENTPOST : 
			var basket = require('dw/order/BasketMgr').getCurrentBasket();
			if (request.httpHeaders.get("x-requested-with").equals("XMLHttpRequest")) {
				if (basket) {
					var response = secureAcceptanceAdapter.GetRequestDataForSilentPost(basket);
					if(response.success){
						args.Data = response.data;
						args.FormAction = response.formAction;
						args.NextStep = response.nextStep;
						response = PIPELET_NEXT;
					} else{
						args.ErrorMsg = response.errorMsg;
						response = PIPELET_ERROR;	
					}
				}	
			}else{
				response = PIPELET_ERROR;	
			}
		break;
		case CybersourceConstants.SILENTPOSTRESPONSE :
			args.NextStep = secureAcceptanceAdapter.SilentPostResponse(require('dw/order/BasketMgr').getCurrentBasket()).toString();
			response = PIPELET_NEXT;
		break;
		default : response = PIPELET_ERROR;
	}
	  return response;
}