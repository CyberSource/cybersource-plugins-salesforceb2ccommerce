'use strict';

/**
*  CYBERSOURCE_WECHAT processor contains all method related to this type of payment instrument (WECHAT)
* @module cartridge/scripts/payment/processor/CYBERSOURCE_WECHAT
*
*/

var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var WeChatAdaptor = require('~/cartridge/scripts/wechat/adapter/WeChatAdaptor');
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');

function Handle(args) {
	//get the basket from input
	//call method to handle the request
	return CommonHelper.HandleRequest(args);
}

function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
	//declare local variables
	var BasketMgr = require('dw/order/BasketMgr');
	var OrderMgr = require('dw/order/OrderMgr');
	var currentBasket = !empty(BasketMgr.getCurrentBasket()) ? BasketMgr.getCurrentBasket() : OrderMgr.getOrder(orderNumber);
	CommonHelper.HandleRequest(currentBasket);
	var response = WeChatAdaptor.HandleRequest(currentBasket,true);
	//call method to handle the request
	//var response = WeChatAdaptor.AuthorizeRequest(orderNumber, paymentInstrument, paymentProcessor);
	
	return response;
	
}

exports.Handle = Handle;
exports.Authorize = Authorize;