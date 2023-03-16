/**
* 	APCheckStatusJob.js
*	This script get the order list for already placed orders having payment methods as ALIPAY/BankTransfer/Paypal 
*	and by passing different order status such as NEW, CREATED, OPEN and NOT EXPORTED
*
*/
var Order = require('dw/order/Order');
var Logger = require('dw/system/Logger');
var System = require('dw/system/System');
var SystemObjectMgr = require('dw/object/SystemObjectMgr');
function checkPaymentStatusJob(jobsParam)
{
	// pick order placed before 30 minutes from current time
	var CreationDate =System.getCalendar();
		CreationDate.add(dw.util.Calendar.MINUTE,-jobsParam.LagTime);
	// query to filter order based on below parameters 
	var type  = 'Order',
		queryString  = 'exportStatus={'+0+'} AND status={'+1+'} AND creationDate < {'+2+'}',
		sortString  = 'creationDate asc';
	var orderIterator = SystemObjectMgr.querySystemObjects(type,queryString,sortString,Order.EXPORT_STATUS_NOTEXPORTED,Order.ORDER_STATUS_CREATED,CreationDate.getTime());
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var pp;
	// Iterate through Order fetched in query result
	if (!empty(orderIterator))
	{
		var Transaction = require('dw/system/Transaction');
		Transaction.wrap(function () {
		while (orderIterator.hasNext())	
		{
			var order = orderIterator.next();
		 	var pIs = order.getPaymentInstruments();
		 	// Iterate order in available Payment processor list, if found set PP 
			for each(var pi in pIs ){
				if(pi.paymentTransaction.paymentProcessor !== null){
					pp = pi.paymentTransaction.paymentProcessor.ID;
				}
			var ppList = CybersourceConstants.PAYMENTPROCESSORARR;
			//check if order with same payment processor exist
			for each(var paymentProcessor in ppList){
			   	if(!empty(pp) && paymentProcessor.equals(pp)){
			   		//Call APCheck payment status service and update order status based on response 
			   		HandleCheckStatusServiceResponse(order);
				}
			}
		}		
	}
		});
}
return;
}
/**
* This method will call APCheck payment status service 
* and update order status based on response
**/
function HandleCheckStatusServiceResponse(order){
	var commonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	var OrderMgr = require('dw/order/OrderMgr');
	var orderStatus={};
	// check the existing order payment status using request Id and apPaymentType 
		var paymentResponse = commonHelper.CheckStatusServiceRequest({Order:order});					
		if(paymentResponse.submit){
			orderStatus = OrderMgr.placeOrder(order);
			if(orderStatus.code === 'OK'){
			order.setExportStatus(Order.EXPORT_STATUS_READY);									
			order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
			}else{
				Logger.error('[APCheckStatusJob.js] DECISION ACCEPT -  Placeorder Error for order:', order.OrderNo);
				throw new Error('Failed to update Order Status');
			}
		}
		else if(paymentResponse.pending || paymentResponse.review){
			//no action taken on order only payment instrument updated
		}
		// handle error cases
		else if(paymentResponse.error){
			orderStatus = OrderMgr.failOrder(order);									
			if(orderStatus.code === 'ERROR'){										
				Logger.error('[APCheckStatusJob.js] DECISION REJECT -  FailOrder Called for order:', order.OrderNo);
				throw new Error('Order failed');
			}										 
		}
		return ;
}
/** Exported functions **/
module.exports = {
    checkPaymentStatusJob: checkPaymentStatusJob
};