'use strict';

/**
*  CYBERSOURCE_WECHAT processor contains all method related to this type of payment instrument (WECHAT)
* @module cartridge/scripts/payment/processor/CYBERSOURCE_WECHAT
*
*/

var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var WeChatAdaptor = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/wechat/adaptor/WeChatAdaptor');


function Handle(args) {
	//get the basket from input
	var basket = args.Basket;	
	//call method to handle the request
	var response = WeChatAdaptor.HandleRequest(basket,true);
	//return response
	return response;
}

function Authorize(args) {
	//declare local variables
	var orderNo = args.OrderNo;
	var paymentInstrument = args.PaymentInstrument;
	//call method to handle the request
	var response = WeChatAdaptor.AuthorizeRequest(orderNo,paymentInstrument);
	
	return response;
	
}

exports.Handle = Handle;
exports.Authorize = Authorize;