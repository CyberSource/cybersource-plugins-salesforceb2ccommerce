'use strict';

/**
* This script is used to set Alipay Product details,
* set currency and prchase total object to pass as an input to
* Alipay Initiate service and authorize Alipay transaction
*
*/

/* API includes */
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');

/**
 * Get Alipay Product data and set length of prodname and
*   description based on Alipay payment type.
 * @param {*} prodName prodName
 * @param {*} prodDesc prodDesc
 * @returns {*} obj
 */
function GetAlipayProduct(prodName, prodDesc) {
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
 * This function set the value of product name and product description which is require
*     as input to pass in initiate payment service request.
 * @param {*} Order Order
 * @returns {*} obj
 */
function AlipaySetProductParameters(Order) {
    // get the order lineitem from order object
    var order = Order;
    var lineItems = order.allLineItems.iterator();
    // var productObject = {};

    while (lineItems.hasNext()) {
        // set the product line item to get the product name and description
        var lineItem = lineItems.next();
        var productData = {};
        // set the value of product name and description if the line item is an instance of product line item
        // eslint-disable-next-line
        if (lineItem instanceof dw.order.ProductLineItem && !empty(lineItem.product)) {
            var prodName = lineItem.product.name;
            // eslint-disable-next-line
            var prodDesc = !empty(lineItem.product.shortDescription) ? lineItem.product.shortDescription.toString() : '';
            /* get the substring of product name and description to 35 and 65 as required by alipay initiate payment service
            in reference with payment type as domestic or international */
            productData = GetAlipayProduct(prodName, prodDesc);
            // set the product data into an object
            return { success: true, productObject: productData };
        }
    }
}

/**
 * This function creates the PurchaseTotalsObject data object and set it to CybersourcePurchaseTotals output object.
*    This function also set the currency code based on alipay domestic and international payment type.
 * @param {*} Order Order
 * @returns {*} obj
 */
function CreateCSPurchaseTotalForAlipay(Order) {
    // get the order from pipeline dictionary
    var order = Order;
    var collections = require('*/cartridge/scripts/util/collections');
    var PurchaseTotalsObject = require('*/cartridge/scripts/cybersource/CybersourcePurchaseTotalsObject');
    var purchaseObject = new PurchaseTotalsObject();
    var Money = require('dw/value/Money');
    var amount = new Money(0, order.currencyCode);

    // get the payment instrument from order object and set the amount value
    var apPaymentInstruments = order.getPaymentInstruments();
    collections.forEach(apPaymentInstruments, function (pi) {
    // for each (var pi in apPaymentInstruments) {
        if (!pi.paymentMethod.equals('GIFT_CERTIFICATE')) {
            amount = amount.add(pi.paymentTransaction.amount);
        }
    });
    // get the value of alipay payment type from site preference
    var alipayPaymentType = Site.getCurrent().getCustomPreferenceValue('apPaymentType');

    // set the currency code on basis of international and domestic payment type
    // eslint-disable-next-line
    if (!empty(alipayPaymentType) && alipayPaymentType.value.equals(Resource.msg('alipaycheckout.domesticpaymenttype', 'cybersource', null))
        && !(amount.currencyCode.equals(Resource.msg('alipaycheckout.currency', 'cybersource', null)))) {
        purchaseObject.setCurrency(Resource.msg('alipaycheckout.currency', 'cybersource', null));
    } else {
        purchaseObject.setCurrency(amount.currencyCode);
    }
    var StringUtils = require('dw/util/StringUtils');
    purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amount.value, '000000.00', 'en_US'));
    // set the value of purchase total object in pipeline dictionary
    return { success: true, purchaseTotals: purchaseObject };
}

/*
 *  This function is used to handle Alipay initiate response and return
 *  respective status back to Authorize call
 */
// eslint-disable-next-line
function handleAlipayInitiatePaymentResponse(order, alipayReturnUrl, alipayResponse) {
    // var Site = require('dw/system/Site');
    var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    // set alipay payment type to pass it as input in request
    var alipayPaymentType = CybersourceHelper.getAlipayPaymentType();
    switch (alipayResponse.decision) {
        case 'ACCEPT':
            if (Number(alipayResponse.reasonCode) === 100) {
                var PaymentInstrumentUtils = require('*/cartridge/scripts/utils/PaymentInstrumentUtils');
                PaymentInstrumentUtils.authorizeAlipayOrderUpdate(order, alipayResponse, alipayPaymentType.value);
                // eslint-disable-next-line
                session.privacy.orderId = order.orderNo;
                if (Site.getCurrent().getCustomPreferenceValue('CsEndpoint').value.equals('Test')) {
                    return { pending: true, alipayReturnUrl: alipayReturnUrl };
                }
                return { pending: true, RedirectURL: alipayResponse.RedirectURL };
            }
            break;
        case 'REJECT':
            return { declined: true };
        case 'ERROR':
            return { error: true };
        default:
            return { error: true };
    }
}

/**
 * This function is used to fetch Purchase
 *  object and purchase total details for Alipay
 * @param {*} Order Order
 * @returns {*} obj
 */
function getAlipayRequestDetails(Order) {
    var alipayRequest = {};
    // get purchase total object for Alipay
    var result = CreateCSPurchaseTotalForAlipay(Order);
    alipayRequest.purchaseTotals = result.purchaseTotals;
    // get purchase product detail for Alipay
    result = AlipaySetProductParameters(Order);
    alipayRequest.productObject = result.productObject;
    return alipayRequest;
}

/**
 * This function authorize Alipay Initiate payment request and generates requestID, requestToken,
 *  reconciliationID and redirect URL which will redirect user to Alipay site and change the payment status as per the request.
 * @param {*} args args
 * @returns {*} obj
 */
function AuthorizeAlipay(args) {
    // declare storefront class variables
    var URLUtils = require('dw/web/URLUtils');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var alipayReturnUrl = URLUtils.https('COPlaceOrder-Submit', 'provider', 'alipay');
    // set Alipay request parameters
    var alipayRequest = {};
    // get the payment processor and assign its value in payment transaction object
    var paymentProcessor = PaymentMgr.getPaymentMethod(args.PaymentInstrument.getPaymentMethod()).getPaymentProcessor();
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        // eslint-disable-next-line
        args.PaymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
    // get Alipay Purchase total and product request details
    var result = getAlipayRequestDetails(args.Order);
    alipayRequest.orderNo = args.orderNo;
    alipayRequest.alipayReturnUrl = alipayReturnUrl;
    alipayRequest.purchaseTotals = result.purchaseTotals;
    alipayRequest.productObject = result.productObject;
    // call Alipay initiate service
    var alipayFacade = require('*/cartridge/scripts/alipay/facade/AlipayFacade');
    var authResponse = alipayFacade.AlipayInitiatePaymentRequest(alipayRequest);
    if (authResponse !== null) {
        // handle Alipay response
        return handleAlipayInitiatePaymentResponse(args.Order, alipayReturnUrl, authResponse);
    }
    return { error: true };
}

/** Exported functions * */
module.exports = {
    AuthorizeAlipay: AuthorizeAlipay
};
