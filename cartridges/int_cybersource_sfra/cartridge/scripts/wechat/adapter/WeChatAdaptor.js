'use strict';

/**
* Get WeChat Product data and set length of prodname and
* description based on WeChat payment type.
* @param {Object} prodName product name
* @param {Object} prodDesc product description
* @returns {Object} productData
*/
function GetWeChatProduct(prodName, prodDesc) {
    var productData = {};
    /* get the substring of product name and description to 35 and 65 as required by alipay initiate payment service */
    // eslint-disable-next-line
    if (!empty(prodName) && prodName.length > 35) {
        productData.productName = prodName.substr(0, 35);
    } else {
        productData.productName = prodName;
    }
    // eslint-disable-next-line
    if (!empty(prodDesc) && prodDesc.length > 65) {
        productData.productDescription = prodDesc.substr(0, 65);
    } else {
        productData.productDescription = prodDesc;
    }
    return productData;
}

/**
 * This file will contains adapter methods for Cybersource Wechat
 * Integration.
 *
 * @module cartridge/scripts/wechat/adapter/WeChatAdaptor
 * @param {Object} Order order object
 * @return {Object} status
 */
function WeChatSetProductParameters(Order) {
    // get the order lineitem from order object
    var order = Order;
    var lineItems = order.allLineItems.iterator();
    var ProductLineItem = require('dw/order/ProductLineItem');

    while (lineItems.hasNext()) {
        // set the product line item to get the product name and description
        var lineItem = lineItems.next();
        var productData = {};
        // set the value of product name and description if the line item is an instance of product line item
        // eslint-disable-next-line
        if (lineItem instanceof ProductLineItem && !empty(lineItem.product)) {
            var prodName = lineItem.product.name;
            // eslint-disable-next-line
            var prodDesc = !empty(lineItem.product.shortDescription) ? lineItem.product.shortDescription.toString() : '';
            /* get the substring of product name and description to 35 and 65 as required by alipay initiate payment service
            in reference with payment type as domestic or international */
            productData = GetWeChatProduct(prodName, prodDesc);
            // set the product data into an object
            return { success: true, productObject: productData };
        }
    }
}

/* API includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var WeChatFacade = require('~/cartridge/scripts/wechat/facade/WeChatFacade');
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

/**
 * This method set the request object along with other inputs to call session
 * service of WeChat
 * @param {Object} Basket basket object
 * @returns {Object} status
 */
function CreateSaleServiceRequest(Basket) {
    var purchaseObject;
    var billToObject;
    var URLUtils = require('dw/web/URLUtils');
    var collections = require('*/cartridge/scripts/util/collections');
    var Transaction = require('dw/system/Transaction');
    var successURL = URLUtils.https('COSummary-Start').toString();
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
    var wechatPaymentType = CybersourceConstants.WECHAT_PAYMENT_TYPE;
    // set basket UUID
    var UUID = Basket.UUID;
    var transactionTimeout = libCybersource.getTransactionTimeOut();

    var result = CommonHelper.CreateCybersourcePurchaseTotalsObject(Basket);
    purchaseObject = result.purchaseTotals;
    result = CommonHelper.CreateCyberSourceBillToObject(Basket, true);
    billToObject = result.billTo;
    billToObject.email = 'noreply@cs.com';
    result = CommonHelper.CreateCybersourceShipToObject(Basket);

    var sessionObject = {};
    sessionObject.billTo = billToObject;
    sessionObject.shipTo = result.shipTo;
    var cyberSourceItem = CommonHelper.CreateCybersourceItemObject(Basket);
    var items = cyberSourceItem.items;
    sessionObject.purchaseObject = purchaseObject;
    var productParameters = WeChatSetProductParameters(Basket);
    sessionObject.productObject = productParameters.productObject;
    sessionObject.wechatPaymentType = wechatPaymentType;
    sessionObject.successURL = successURL;
    sessionObject.UUID = UUID;
    sessionObject.items = items;
    sessionObject.transactionTimeout = transactionTimeout;
    var paymentInstruments = Basket.paymentInstruments;
    var pi;
    // Iterate on All Payment Instruments and select WeChat
    collections.forEach(paymentInstruments, function (paymentInstrument) {
        if (paymentInstrument.paymentMethod.equals(CybersourceConstants.WECHAT_PAYMENT_METHOD)) {
            pi = paymentInstrument;
        }
    });
    // call session method of facade to create session request
    var response = WeChatFacade.WeChatSaleService(sessionObject);
    Transaction.wrap(function () {
        pi.paymentTransaction.transactionID = response.apSaleReply.processorTransactionID;
    });
    var saleReplyURL = response.apSaleReply.merchantURL;
    var returnURL = saleReplyURL.substring(0, saleReplyURL.length - 1);

    if (response.decision === 'ACCEPT' && Number(response.reasonCode) === 100) {
        // set the processor token into session variable
        if (Number(response.apSaleReply.reasonCode) === 100) {
            // eslint-disable-next-line
            session.privacy.WeChatSaleRequestId = response.requestID;
            return {
                submit: true,
                WeChatMerchantURL: returnURL,
                processWeChat: true
            };
        }
        return {
            error: true,
            WeChatMerchantURL: null,
            processWeChat: false
        };
    }

    return {
        error: true,
        WeChatMerchantURL: null,
        processWeChat: false
    };
}

/**
 * HandleRequest
 * @param {Object} Basket basket Object
 * @returns {Object} response
 */
function HandleRequest(Basket) {
    var response = CreateSaleServiceRequest(Basket);
    return response;
}

/**
 * CheckStatusServiceRequest
 * @param {Object} orderNo order number
 * @param {Object} paymentInstrument payment instrument
 * @returns {Object} result
 */
function CheckStatusServiceRequest(orderNo, paymentInstrument) {
    var PaymentInstrument = paymentInstrument;
    var Transaction = require('dw/system/Transaction');
    // eslint-disable-next-line
    var requestId = session.privacy.WeChatSaleRequestId;

    var paymentType = CybersourceConstants.WECHAT_PAYMENT_TYPE;
    var paymentProcessor = PaymentMgr.getPaymentMethod(PaymentInstrument.getPaymentMethod()).getPaymentProcessor();
    var response = WeChatFacade.WeChatCheckStatusService(requestId, paymentType, orderNo);
    var result = {};
    if (response.decision === 'ACCEPT' && Number(response.reasonCode) === 100) {
        // set the processor token into session variable
        if (Number(response.apCheckStatusReply.reasonCode) === 100 && response.apCheckStatusReply.paymentStatus === 'settled') {
            // eslint-disable-next-line
            session.privacy.wechatCheckStatus = true;
            result.submit = true;
        } else if (Number(response.apCheckStatusReply.reasonCode) === 100 && response.apCheckStatusReply.paymentStatus === 'pending') {
            result.pending = true;
        } else if (Number(response.apCheckStatusReply.reasonCode) === 100 && response.apCheckStatusReply.paymentStatus === 'abandoned') {
            result.error = true;
        } else {
            result.error = true;
        }
        Transaction.wrap(function () {
            PaymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
            PaymentInstrument.paymentTransaction.custom.paymentStatus = response.apCheckStatusReply.paymentStatus;
            PaymentInstrument.paymentTransaction.custom.processorResponse = response.apCheckStatusReply.processorResponse;
            PaymentInstrument.paymentTransaction.custom.reconsilationID = response.apCheckStatusReply.reconciliationID;
        });
    } else {
        result.error = true;
    }
    return result;
}

/**
 * AuthorizeRequest
 * @param {Object} orderNo orderNo
 * @param {Object} paymentInstrument paymentInstrument
 * @param {Object} paymentProcessor paymentProcessor
 * @returns {Object} response
 */
function AuthorizeRequest(orderNo, paymentInstrument, paymentProcessor) {
    // get the payment processor and assign its value in payment transaction object
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        // eslint-disable-next-line
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    // call authorization service and process the response
    var response = CheckStatusServiceRequest(orderNo);

    return response;
}

/** Exported functions * */
module.exports = {
    HandleRequest: HandleRequest,
    AuthorizeRequest: AuthorizeRequest,
    CheckStatusServiceRequest: CheckStatusServiceRequest
};
