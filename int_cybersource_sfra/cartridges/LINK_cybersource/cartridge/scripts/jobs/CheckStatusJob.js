/**
* 	CheckStatusJob.ds
*	This script get the order list for already placed orders having payment methods as ALIPAY/BankTransfer/Paypal 
*	and by passing different order status such as NEW, CREATED, OPEN and NOT EXPORTED
*
*/

var Order = require('dw/order/Order');
var Logger = require('dw/system/Logger');
var System = require('dw/system/System');
var Transaction = require('dw/system/Transaction');
var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var OrderMgr = require('dw/order/OrderMgr');

var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');


function checkPaymentStatusJob(jobsParam) {
        //  Get time X minutes ago, based on job parameter.
	var CreationDate = System.getCalendar();
        CreationDate.add(dw.util.Calendar.MINUTE,-jobsParam.LagTime);
        
        // TO-DO: Job should have a parameter that limits the time this looks back to avoid large query results filled with old orders that wont be processed.
	    // Find all non-confirmed, non-exported orders before the calculated lag time.
	var type  = 'Order',
		queryString  = 'confirmationStatus={'+0+'} AND creationDate < {'+1+'} AND status !={'+2+'} AND status != {'+3+'}';
		sortString  = 'creationDate asc';
    var orderIterator = SystemObjectMgr.querySystemObjects(type,queryString,sortString,
                            Order.CONFIRMATION_STATUS_NOTCONFIRMED,
                            CreationDate.getTime(),
                            Order.ORDER_STATUS_CANCELLED,
                            Order.ORDER_STATUS_FAILED
                        );
    
        // Iterate over Order query result
	if (!empty(orderIterator)) {

        while (orderIterator.hasNext()) {
            var order = orderIterator.next();
            var pIs = order.getPaymentInstruments();

                // For each payment processor in the order.
            for each(var pi in pIs ){
                var pp;
                if(pi.paymentTransaction.paymentProcessor !== null){
                    pp = pi.paymentTransaction.paymentProcessor.ID;
                }
                var ppList = CybersourceConstants.PAYMENTPROCESSORARR;
                    //  Check if order PI is one defined in the PAYMENTPROCESSORARR list.  Only these will have status checked.
                for each(var paymentProcessor in ppList){
                    if(!empty(pp) && paymentProcessor.equals(pp)){
                            //  Call APCheck payment status service and update order status based on response 
                        HandleCheckStatusServiceResponse(order);
                        break;
                    }
                }
            }	
        }
    }
    return;
}

/**
* This method will call APCheck payment status service 
* and update order status based on response
**/
function HandleCheckStatusServiceResponse(order) {
    
	    // Check the existing order payment status and get action to take.
    var paymentResponse = CommonHelper.CheckStatusServiceRequest(order);
                    
    if (paymentResponse.submit) {
            //  Order should have already been placed, just not confirmed.
            //  Mark it as confirmed.
        Transaction.wrap(function () {
            order.setExportStatus(Order.EXPORT_STATUS_READY);									
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        });
    }

    else if(paymentResponse.pending || paymentResponse.review){
        //  No action taken on order.
    }
        
    else if(paymentResponse.error){
            // Fail order and Log event.
        try {
            Transaction.wrap(function () {
                order.setStatus(Order.ORDER_STATUS_CANCELLED);									
            });
        }
        catch (e) {
            Logger.error('[APCheckStatusJob.ds] Error failing Order: ' + e.message);
        }										 
    }
    return ;
}

/** Exported functions **/
module.exports = {
    checkPaymentStatusJob: checkPaymentStatusJob
};