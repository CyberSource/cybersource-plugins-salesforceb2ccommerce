'use strict';
/**
 * CYBERSOURCE_ALIPAY controller contains all method related to this type of payment instrument (ALIPAY)
 * @module controllers/CYBERSOURCE_ALIPAY
 */

/* API Includes */
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
/**
 * This is where current implementation simply creates a payment method and returns 'success'.
*/

function Handle(basket, paymentInformation) {
	 var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CommonHelper');
	//call method to handle the request
	var response = CommonHelper.HandleRequest(basket);
	return response;
}

/**
 * Authorizes a payment using a credit card. The payment is authorized by using the CYBERSOURCE_ALIPAY processor only and
 * setting the order no as the transaction ID. Customizations may use other processors and custom logic to authorize
 * credit card payment.
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
	var OrderMgr = require('dw/order/OrderMgr');
	var Order = OrderMgr.getOrder(orderNumber);
	var Site = require('dw/system/Site');
	
    var adaptor = require(CybersourceConstants.CS_CORE_SCRIPT+'alipay/adaptor/AlipayAdaptor');
    var alipayResult = adaptor.AuthorizeAlipay({Order:Order, orderNo:orderNumber, PaymentInstrument: paymentInstrument});
	if (alipayResult.pending){
		if (Site.getCurrent().getCustomPreferenceValue('CsEndpoint').value.equals('Test')) {
			return {intermediate:true , alipayReturnUrl:alipayResult.alipayReturnUrl , renderViewPath:'alipay/alipayintermediate'};
			
		}else{
			return {redirection : true, redirectionURL : alipayResult.RedirectURL};
			
		}
	} else {
		return alipayResult;
	}
}

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
