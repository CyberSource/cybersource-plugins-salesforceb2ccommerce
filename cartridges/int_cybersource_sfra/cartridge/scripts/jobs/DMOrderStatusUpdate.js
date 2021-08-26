'use strict';

/**
* This script is used to update order status in  SFCC which are
*  in REVIEW state in Decision manager.
*/
var HashMap = require('dw/util/HashMap');
var Logger = require('dw/system/Logger');
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
// var dwsvc = require('dw/svc');
var Transaction = require('dw/system/Transaction');
var CRServices = require('~/cartridge/scripts/init/RestServiceInit');

var logger = Logger.getLogger('CyberSource', 'ConversionDetailReport');

/**
 * Function to parse XML response return from Conversion response
 * service and change Order status in BM as per the decision received for Order.
 * @param {*} message message
 * @param {*} orderHashMap orderHashMap
 */
function parseJSONResponse(message, orderHashMap) {
    try {
        // eslint-disable-next-line
        if (!empty(message)) {
            logger.debug('Message - ' + message);
            var obj = JSON.parse(message);

            logger.debug('Processing daily conversion report JSON ......');
            Transaction.wrap(function () {
                obj.conversionDetails.forEach(function (conversionDetails) {
                // for each(var conversionDetails in obj['conversionDetails']){
                    var orderNumber = conversionDetails.merchantReferenceNumber;
                    var order = orderHashMap.get(orderNumber);
                    logger.debug('Order Id - ' + conversionDetails.requestId);
                    if (order !== null) {
                        // new decision ACCEPT decision applied to order
                        if (conversionDetails.newDecision === 'ACCEPT') {
                            OrderMgr.placeOrder(order);
                            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                            logger.info('Order number: ( {0} ) is successfully placed  ', orderNumber);
                            // new decision REJECT decision applied to order
                        } else if (conversionDetails.newDecision === 'REJECT') {
                            //  Cancel Order.
                            OrderMgr.failOrder(order);
                            var reviewerComment = conversionDetails.reviewerComments;
                            order.cancelDescription = reviewerComment;
                            logger.info('Order number: ( {0} ) is canceled   ', orderNumber);
                        } else {
                            logger.debug('No records in ACCEPT/REJECT state.');
                        }
                    } else {
                        logger.debug('Order in Daily conversion report not found in the query results against DB');
                    }
                });
            });
        }
    } catch (error) {
        logger.error('Error in conversionReportjob.js ' + error);
        throw new Error('Error in conversion detail report : service unavailable');
    }
}

/**
 * Function to set date time parameter to provide
 * as an input. The date range will pick
 * records of 24 hours before the current time
 * @returns {*} obj
 */
function setDateTimeForParameter() {
    var System = require('dw/system/System');
    var StringUtils = require('dw/util/StringUtils');
    var time = {};
    var endDate = System.getCalendar();
    endDate.setTimeZone('GMT');
    time.end = StringUtils.formatCalendar(endDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
    var currentDate = System.getCalendar();
    currentDate.setTimeZone('GMT');
    var Site = require('dw/system/Site');
    var lookBackPref = Site.getCurrent().getCustomPreferenceValue('CsOrderImportLookBack');
    // eslint-disable-next-line
    var lookbackTime = empty(lookBackPref) ? -24 : (-1 * lookBackPref);
    // eslint-disable-next-line
    currentDate.add(dw.util.Calendar.HOUR, lookbackTime);
    time.start = StringUtils.formatCalendar(currentDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');

    return time;
}

/**
 * calculates time for script
 * @returns {*} obj
 */
function getTime() {
    var Calendar = require('dw/util/Calendar');
    var StringUtils = require('dw/util/StringUtils');

    try {
        // eslint-disable-next-line
        var date = StringUtils.formatCalendar(new dw.util.Calendar(), 'en_US', Calendar.LONG_DATE_PATTERN);
        return date;
    } catch (exception) {
        logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
}

/**
 * Creates the signature
 * @param {*} signedHeaders signedHeaders
 * @param {*} keyID keyID
 * @param {*} sharedSecret sharedSecret
 * @param {*} date date
 * @param {*} merchantId merchantId
 * @param {*} time time
 * @returns {*} obj
 */
function generateSignature(signedHeaders, keyID, sharedSecret, date, merchantId, time) {
    var Bytes = require('dw/util/Bytes');
    var Mac = require('dw/crypto/Mac');
    var Encoding = require('dw/crypto/Encoding');
    // eslint-disable-next-line
    var host = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_HostName');

    try {
        var encryptor = new Mac(Mac.HMAC_SHA_256);
        var secret = Encoding.fromBase64(sharedSecret);
        var signatureString = '';
        // var headerString = '';
        signatureString = signatureString + 'host: ' + host + '\n';
        signatureString = signatureString + 'date: ' + date + '\n';
        signatureString = signatureString + '(request-target): get /reporting/v3/conversion-details?startTime=' + time.start + '&endTime=' + time.end + '&organizationId=' + merchantId + '\n';
        signatureString = signatureString + 'v-c-merchant-id: ' + merchantId;

        var signatureDigest = encryptor.digest(new Bytes(signatureString.toString(), 'UTF-8'), secret);
        var signature = Encoding.toBase64(signatureDigest);
        return signature;
    } catch (exception) {
        logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
}

/**
 * Function to handle multiple error scenarios in case of error
 * returned form Service
 * @param {*} responseObj responeObj
 */
function handleErrorCases(responseObj) {
    // eslint-disable-next-line
    if (empty(responseObj)) {
        logger.error('Error in conversion detail report request :', 'RESPONSE_EMPTY');
        throw new Error('Error in conversion detail report : RESPONSE_EMPTY');
    } else if ('status' in responseObj && responseObj.getStatus().equals('SERVICE_UNAVAILABLE')) {
        logger.error('Error in conversion detail report request ( {0} )', 'service unavailable');
        throw new Error('Error in conversion detail report : service unavailable');
    } else if (responseObj.status === 'OK' && (responseObj.object === 'Invalid login credentials.' || responseObj.object === 'No merchant found for username.')) {
        logger.error('Error in conversion detail report request ( {0} )', responseObj.object);
        throw new Error('Error in conversion detail report : Invalid login credentials.');
        // eslint-disable-next-line
    } else if ('errorMessage' in responseObj && !empty(responseObj.errorMessage)) {
        //  Log all error messages.
        logger.error('Service Error: ' + responseObj.errorMessage);
    } else { // eslint-disable-line no-empty

    }
}

/**
 * orderStatusUpdate
 * @param {*} jobParams jobParams
 */
function orderStatusUpdate(jobParams) {
    var collections = require('*/cartridge/scripts/util/collections');
    logger.debug('ConversionDetailReport---------------- -');
    var message;

    //  Create hashmap of orders based on the query below
    var orderIterator = OrderMgr.searchOrders('confirmationStatus = {0} AND status != {1} AND status != {2}', 'orderNo asc', Order.CONFIRMATION_STATUS_NOTCONFIRMED, Order.ORDER_STATUS_FAILED, Order.ORDER_STATUS_CANCELLED);
    var orderHashMap = new HashMap();
    // eslint-disable-next-line
    if (!empty(orderIterator)) {
        while (orderIterator.hasNext()) {
            var order = orderIterator.next();
            orderHashMap.put(order.orderNo, order);
            logger.debug('order ID - ' + order.orderNo);
        }
    }
    logger.debug('unconfirmend orders - ' + orderHashMap.length);
    //  Process Orders and change status in SFCC
    if (orderHashMap.length > 0) {
        //  Mapping request object with correct parameter
        var time = setDateTimeForParameter();
        var responseObj = null;

        //  Call conversion report service
        var signedHeaders = new HashMap();
        // var ArrayList = require('dw/util/ArrayList');
        // var Site = require('dw/system/Site');

        // Collected values for secret, key and merchant id from job parameters.
        var sharedSecret = jobParams.SAFlexSharedSecret;
        var keyID = jobParams.SAFlexKeyID;
        var merchantId = jobParams.MerchantId;

        // eslint-disable-next-line
        var host = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_HostName');
        // eslint-disable-next-line
        var targetOrigin = 'https://' + host;
        signedHeaders.put('host', host);
        signedHeaders.put('date', getTime());
        signedHeaders.put('(request-target)', 'get /reporting/v3/conversion-details?startTime=' + time.start + '&endTime=' + time.end + '&organizationId=' + merchantId);
        signedHeaders.put('v-c-merchant-id', merchantId);

        var signature = generateSignature(signedHeaders, keyID, sharedSecret, signedHeaders.get('date'), merchantId, time);
        var headerString = '';
        collections.forEach(signedHeaders.keySet(), function (key) {
            // for each(var key in signedHeaders.keySet()){
            headerString = headerString + ' ' + key;
        });
        var signatureMap = new HashMap();
        signatureMap.put('keyid', keyID);
        signatureMap.put('algorithm', 'HmacSHA256');
        signatureMap.put('headers', headerString);
        signatureMap.put('signature', signature);
        var signaturefields = '';

        signaturefields = 'keyid="' + signatureMap.get('keyid') + '", algorithm="HmacSHA256", headers="host date (request-target) v-c-merchant-id", signature="' + signatureMap.get('signature') + '"';

        signedHeaders.put('Signature', signaturefields);
        signedHeaders.remove('(request-target)');

        var service = CRServices.CyberSourceDMService;
        responseObj = service.call(signedHeaders, time.start, time.end, merchantId);
        //  Handle error scenarios in case of error return from service
        handleErrorCases(responseObj);
        //  Set success response object in message object
        message = responseObj.object;
        //  Parse service JSON response and set Order status based on response
        parseJSONResponse(message, orderHashMap);
    }
}

/**
* Creates Digest String for signature
* */
/* function getDigest(digestString) {
    var MessageDigest = require('dw/crypto/MessageDigest');
    var Bytes = require('dw/util/Bytes');
    var StringUtils = require('dw/util/StringUtils');
    var Encoding = require('dw/crypto/Encoding');

    try {
        var digester = new MessageDigest(MessageDigest.DIGEST_SHA_256);
        var digest = digester.digestBytes(new Bytes(digestString, 'UTF-8'));
        var base64String = Encoding.toBase64(digest);
        return StringUtils.format('SHA-256={0}', base64String);
    } catch (exception) {
        logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
} */

/** Exported functions * */
module.exports = {
    orderStatusUpdate: orderStatusUpdate
};
