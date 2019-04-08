/**
* This script is used to update order status in  SFCC which are
*  in REVIEW state in Decision manager.
*/
var HashMap = require('dw/util/HashMap');
var Logger = require('dw/system/Logger');
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var dwsvc = require("dw/svc");
var Transaction = require('dw/system/Transaction');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');


function orderStatusUpdate(jobParams) {
    Logger.debug('ConversionDetailReport---------------- -');
    var message;

    //  Create hashmap of orders based on the query below
    var orderIterator = OrderMgr.searchOrders('confirmationStatus = {0} AND status != {1} AND status != {2}', 'orderNo asc', Order.CONFIRMATION_STATUS_NOTCONFIRMED, Order.ORDER_STATUS_FAILED, Order.ORDER_STATUS_CANCELLED);
    var orderHashMap = new HashMap();
    if (!empty(orderIterator)) {
        while (orderIterator.hasNext()) {
            var order = orderIterator.next();
            orderHashMap.put(order.orderNo, order);
            Logger.debug('order ID - ' + order.orderNo);
        }
    }
    Logger.debug('unconfirmend orders - ' + orderHashMap.length);
    //  Process Orders and change status in SFCC
    if (orderHashMap.length > 0) {
        //  Mapping request object with correct parameter
        var time = setDateTimeForParameter();
        var responseObj = null;
        var serviceParams = {};
        serviceParams.merchantId = jobParams.merchantId;
        serviceParams.username = jobParams.username;
        var Encoding = require('dw/crypto/Encoding');
        serviceParams.password = Encoding.toURI(jobParams.password);
        serviceParams.startDate = time.startDate;
        serviceParams.startTime = time.startTime;
        serviceParams.endDate = time.enddate;
        serviceParams.endTime = time.endtime;
        //  Call conversion report service
        Logger.debug('postValues sent to CyberSource for On Demand Conversion report :: ');

        var service = CSServices.CyberSourceConversionDetailReportService;
        responseObj = service.call(serviceParams);
        //  Handle error scenarios in case of error return from service
        handleErrorCases(responseObj);
        //  Set success response object in message object
        message = responseObj.object;
        //  Parse service XML response and set Order status based on response
        parseXMLResponse(message, orderHashMap);
        return;
    }

    return;

}
/**
* Function to parse XML response return from Conversion response
* service and change Order status in BM as per the decision received for Order.
**/
function parseXMLResponse(message, orderHashMap) {
    try {
        if (!empty(message)) {
            Logger.debug('Got the report....');
            Logger.debug('Message - ' + message);
            var xmlDocument = new XML(message);

            Logger.debug('Processing daily conversion report xml ......');
            Transaction.wrap(function () {
                for each(var xmlConversion in xmlDocument..*:: ['Conversion'])
            {
                var orderNumber = xmlConversion.attribute('MerchantReferenceNumber').toString();
                var order = orderHashMap.get(orderNumber);
                Logger.debug('Order Id - ' + xmlConversion.@RequestID.toString());
                if (order !== null) {

                    //new decision ACCEPT decision applied to order
                    if (xmlConversion..*:: ['NewDecision'].toString() === 'ACCEPT') {
                        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                        Logger.info('Order number: ( {0} ) is successfully placed  ', orderNumber);
                        //new decision REJECT decision applied to order
                    } else if (xmlConversion..*:: ['NewDecision'].toString() === 'REJECT') {
                        //  Cancel Order.
                        order.setStatus(Order.ORDER_STATUS_CANCELLED);
                        var reviewerComment = xmlConversion..*:: ['ReviewerComments'].toString();
                        order.cancelDescription = reviewerComment;
                        Logger.info('Order number: ( {0} ) is canceled   ', orderNumber);
                    } else {
                        Logger.debug('No records in ACCEPT/REJECT state.');
                    }
                } else {
                    Logger.debug('Order in Daily conversion report not found in the query results against Demandware DB');
                }
            }
        });
    }
}catch (error) {
    Logger.error('Error in conversionReportjob.js ' + error);
    throw new Error('Error in conversion detail report : service unavailable');
}
}
/**
* Function to handle multiple error scenarios in case of error 
* returned form Service
**/
function handleErrorCases(responseObj) {
    if (empty(responseObj)) {
        Logger.error('Error in conversion detail report request :', 'RESPONSE_EMPTY');
        throw new Error('Error in conversion detail report : RESPONSE_EMPTY');
    }
    else if ('status' in responseObj && responseObj.getStatus().equals('SERVICE_UNAVAILABLE')) {
        Logger.error('Error in conversion detail report request ( {0} )', 'service unavailable');
        throw new Error('Error in conversion detail report : service unavailable');
    }
    else if (responseObj.status === 'OK' && (responseObj.object === 'Invalid login credentials.' || responseObj.object === 'No merchant found for username.')) {
        Logger.error('Error in conversion detail report request ( {0} )', responseObj.object);
        throw new Error('Error in conversion detail report : Invalid login credentials.');
    } else {
        return;
    }
}
/**
* Function to set date time parameter to provide
* as an input. The date range will pick 
* records of 24 hours before the current time
**/
function setDateTimeForParameter() {
    var System = require('dw/system/System');
    var StringUtils = require('dw/util/StringUtils');
    var time = {};
    var endDate = System.getCalendar();
    endDate.setTimeZone('GMT');
    time.enddate = StringUtils.formatCalendar(endDate, 'yyyy-MM-dd');
    time.endtime = StringUtils.formatCalendar(endDate, 'HH:mm:ss');
    var currentDate = System.getCalendar();
    currentDate.setTimeZone('GMT');
    var Site = require('dw/system/Site');
    var lookBackPref = Site.getCurrent().getCustomPreferenceValue('CsOrderImportLookBack');
    var lookbackTime = empty(lookBackPref) ? -24 : (-1 * lookBackPref);
    currentDate.add(dw.util.Calendar.HOUR, lookbackTime);
    time.startDate = StringUtils.formatCalendar(currentDate, 'yyyy-MM-dd');
    time.startTime = StringUtils.formatCalendar(currentDate, 'HH:mm:ss');
    return time;
}
/** Exported functions **/
module.exports = {
    orderStatusUpdate: orderStatusUpdate
};