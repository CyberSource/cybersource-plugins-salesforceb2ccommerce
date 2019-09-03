/**
* Demandware Script File - SAMerchantPostJob
* Update SA redirect/Iframe orders in SFCC which are 
* in created state due to network failure or any other issue. 
*/

var Order = require('dw/order/Order');
var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
var Logger = require('dw/system/Logger');
var CustomObjectMgr =require("dw/object/CustomObjectMgr");
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

function SAMerchantPostJob()
{
	// get all SA order with below query status
	var query = 'custom.processed = false';
	var coIterator = CustomObjectMgr.queryCustomObjects('SA_MerchantPost', query, null, null);
		if (!empty(coIterator))
			{
				Transaction.wrap(function () {
				while (coIterator.hasNext())
				{	var CO = coIterator.next();
					var orderID = CO.custom.OrderID;
					// Search all order which are in created state
					 var orders = OrderMgr.searchOrders('orderNo={0} AND status={1}', 'creationDate desc', orderID, dw.order.Order.ORDER_STATUS_CREATED);  
					 try{
                     if(orders.count > 0){
                     	var order = orders.next();
						var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
						var responseObject : Object = JSON.parse(CO.custom.postParams);
						 if(paymentInstrument == null || responseObject == null){
						 	Logger.error('[SAmerchantPost.ds] Error occured for order:', orderID);
						 	throw new Error('Error occured for order');
						 }
						 else{
							var Decision = responseObject.Decision;
							// update payment instrument, payment transaction, billing/shipping details, 
							updatePIDetails(order,responseObject,paymentInstrument);
							}
                     }
   					}catch(e){
   						Logger.error("[SAmerchantPost.ds] Error in Merchant post job request ( {0} )",e.message);
   						throw new Error('Error in Merchant post job request');
   					}
   					CO.custom.processed = true;              
				}
				});
			}
			removeProcessedOrders();
   return;
}

function updatePIDetails(order,responseObject,paymentInstrument){
	var Decision = responseObject.Decision;							
	if((Decision === 'ACCEPT' && responseObject.ReasonCode === '100') || Decision === 'REVIEW'){
		if(!empty(order) && !empty(responseObject)){
			// Update Billing/Shipping details
			PaymentInstrumentUtils.UpdateOrderBillingShippingDetails(order,responseObject,false,false);
			//Update Transaction details
			PaymentInstrumentUtils.UpdatePaymentTransactionSecureAcceptanceAuthorize(order,responseObject);
			var cardToken = !empty(responseObject.SubscriptionID)?responseObject.SubscriptionID:responseObject.req_payment_token;
			//update card details
			PaymentInstrumentUtils.updatePaymentInstumenSACard(paymentInstrument, responseObject.req_card_expiry_date, responseObject.req_card_number, responseObject.req_card_type, cardToken, responseObject.req_bill_to_forename, responseObject.req_bill_to_surname);
			var customerObj	= order.getCustomer();
			secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customerObj);
			// update Order status based on response recieved from service
			updateOrderStatus(order);							
		}
	}else{
			// if Decision is not ACCEPT, fail order in SFCC
			FailSAOrder(order,responseObject);
	}
}
function updateOrderStatus(order){
	var orderStatus = OrderMgr.placeOrder(order);
	if(orderStatus.code === 'OK'){
			order.setExportStatus(Order.EXPORT_STATUS_READY);									
			order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
			var MailFrom =  dw.system.Site.getCurrent().getCustomPreferenceValue('customerServiceEmail');
			var MailSubject =  dw.web.Resource.msg('order.orderconfirmation-email.001','order',null)+ '' + order.orderNo;
			var MailTemplate =  'mail/orderconfirmation';
			var MailTo =  order.customerEmail;
				if(!empty(MailFrom) && !empty(MailSubject) && !empty(MailTemplate) && !empty(MailTo)){
					 var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
					 	 CommonHelper.sendMail({
					        template: 'mail/orderconfirmation',
					        recipient: order.getCustomerEmail(),
					        subject: Resource.msg('order.orderconfirmation-email.001', 'order', null),
					        context: {
					            Order: order
					        	}
							});
				}
	   }else{
	   		Logger.error('[SAmerchantPost.ds] DECISION ACCEPT/REVIEW -  Placeorder Error for order:', order.orderNo);
	   		throw new Error('DECISION ACCEPT/REVIEW -  Placeorder Error for order');
	   	}
}

/**
* This method will fail Order in SFCC 
* for fa script call service to initiate payment for Alipay and set the response in response object
* and also handles the logging of different error scenarios while making service call.
**/
function FailSAOrder(order,responseObject){
	// if Decision is not ACCEPT 
	var orderStatus = OrderMgr.failOrder(order, true);									
	if(orderStatus.code === 'ERROR'){										
		Logger.error('[SAmerchantPost.ds] DECISION REJECT -  FailOrder Called for order:', order.orderNo);
		throw new Error('DECISION ERROR -  FailOrder Called for order');
	}
	if(responseObject.Decision === 'ERROR'  || responseObject.Decision === 'CANCEL'){
		PaymentInstrumentUtils.UpdatePaymentTransactionSecureAcceptanceAuthorize(order,responseObject);
		Logger.error('[SAmerchantPost.ds] DECISION ERROR -  FailOrder Called for order:', order.orderNo);
		throw new Error('DECISION ERROR -  FailOrder Called for order');
	}
}
/*Remove all custom objects for already processed Order*/
function removeProcessedOrders(){
	var query = 'custom.processed = true';
	var coIterator = CustomObjectMgr.queryCustomObjects("SA_MerchantPost", query, null, null);
	if (!empty(coIterator)){
		Transaction.wrap(function () {
			while (coIterator.hasNext()){
			var CO = coIterator.next();
			CustomObjectMgr.remove(CO);
			}
		});
	}
}

/** Exported functions **/
module.exports = {
	SAMerchantPostJob : SAMerchantPostJob
};
		