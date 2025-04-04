'use strict';

var Logger = require('dw/system/Logger');

/**
 * Creates the data from basket / order to get tax calculated from cybersource.
 * @param {*} Basket Basket
 * @returns {*} obj
 */
function CreateCybersourceTaxationItemsObject(Basket) {
    var HashMap = require('dw/util/HashMap');
    var Money = require('dw/value/Money');
    var itemMap = new HashMap();
    var basket = Basket;
    var shipment = basket.getDefaultShipment();
    var shippingMethod = shipment.getShippingMethod();
    var lineItems = basket.allLineItems.iterator();
    var items = [];
    var idcount = 0;

    var shippingMethodTaxCode = null;
    // eslint-disable-next-line
    if (!empty(shippingMethod)) {
        shippingMethodTaxCode = shippingMethod.taxClassID;
    }

    // START adjust order level promos
    var basketSubTotalPrice = basket.getAdjustedMerchandizeTotalNetPrice();

    var orderDiscount = new Money(0, basket.currencyCode);
    var subTotal = basket.adjustedMerchandizeTotalNetPrice;
    for (var i = 0; i < basket.priceAdjustments.length; i += 1) {
        var promo = basket.priceAdjustments[i];
        orderDiscount = orderDiscount.add(promo.netPrice);
        if (promo.netPrice.value < 0) {
            basketSubTotalPrice = subTotal.add(promo.netPrice.multiply(-1));
        }
    }

    var orderLevelAdjustment = basket.getPriceAdjustments();

    var orderLevelIterator = orderLevelAdjustment.iterator();
    var orderLevelAdjustmentPrice = null;
    while (orderLevelIterator.hasNext()) {
        var oLevelPriceAdjustment = orderLevelIterator.next();

        // eslint-disable-next-line
        if (empty(orderLevelAdjustmentPrice)) {
            orderLevelAdjustmentPrice = oLevelPriceAdjustment.price;
        } else {
            orderLevelAdjustmentPrice = orderLevelAdjustmentPrice.add(oLevelPriceAdjustment.price);
        }
    }
    // END adjust order level promos

    var StringUtils = require('dw/util/StringUtils');
    var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var adjustedLineItemFinalPrice;

    /* eslint-disable */
    while (lineItems.hasNext()) {
        var actualQuantity = 0;
        var lineItem = lineItems.next();
        var item = new CybersourceHelper.getcsReference().Item();

        if (lineItem instanceof dw.order.ProductLineItem) {
            itemMap.put(idcount.toString(), lineItem);

            actualQuantity = lineItem.quantity.value;

            if (orderLevelAdjustmentPrice !== null) {
                orderLevelAdjustmentPrice = orderLevelAdjustmentPrice.multiply(-1);
            }
            if (orderLevelAdjustmentPrice !== null && !empty(orderLevelAdjustmentPrice)) {
                adjustedLineItemFinalPrice = getOrderLevelAdjustedLineItemPrice(lineItem.adjustedNetPrice, orderLevelAdjustmentPrice, basketSubTotalPrice, basket.currencyCode, actualQuantity);
            } else {
                adjustedLineItemFinalPrice = lineItem.adjustedNetPrice.divide(actualQuantity);
            }

            item.unitPrice = StringUtils.formatNumber(Math.abs(adjustedLineItemFinalPrice.getValue()), '#####0.00', 'en_US');
            item.quantity = lineItem.quantity.value;

            item.productName = lineItem.productName;
            item.productSKU = lineItem.productID;
            item.productCode = lineItem.taxClassID || lineItem.getProduct().taxClassID || CybersourceHelper.getDefaultProductTaxCode();

            item.id = idcount++;
            items.push(item);
        } else if (lineItem instanceof dw.order.ShippingLineItem) {
            itemMap.put(idcount.toString(), lineItem);
            item.quantity = 1;
            item.productName = lineItem.lineItemText;
            item.productSKU = lineItem.ID;
            item.productCode = lineItem.taxClassID || shippingMethodTaxCode || CybersourceHelper.getDefaultShippingMethodTaxCode();
            item.id = idcount++;

            var shipPriceAdjustTotal = 0;
            // var shipPriceTotal = 0;
            var basketShippingPriceAdjustments = basket.getShippingPriceAdjustments().iterator();
            while (basketShippingPriceAdjustments.hasNext()) {
                var lineItem = basketShippingPriceAdjustments.next();
                var shipPriceAdjust = lineItem.getPrice();

                if (shipPriceAdjust != null) {
                    shipPriceAdjustTotal += shipPriceAdjust.getValue();
                }
            }

            if (empty(shipPriceAdjustTotal) || shipPriceAdjustTotal === 0) {
                shipPriceAdjustTotal = lineItem.basePrice.value;
            }

            item.unitPrice = StringUtils.formatNumber(Math.abs(basket.getAdjustedShippingTotalNetPrice()), '#####0.00', 'en_US');
            items.push(item);
        } else {
            item.productName = lineItem.lineItemText;
            item.productSKU = 'PriceAdjustment';
            item.productCode = lineItem.taxClassID || CybersourceHelper.getDefaultCouponTaxCode();
            lineItem.updateTax(0);
        }
    }

    // besides shipment line items, we need to calculate tax for possible order-level price adjustments
    // this includes order-level shipping price adjustments
    if (!basket.getPriceAdjustments().empty || !basket.getShippingPriceAdjustments().empty) {
        var basketPriceAdjustments = basket.getPriceAdjustments().iterator();
        while (basketPriceAdjustments.hasNext()) {
            var lineItem = basketPriceAdjustments.next();
            itemMap.put(idcount.toString(), lineItem);

            var item = new CybersourceHelper.getcsReference().Item();
            item.unitPrice = StringUtils.formatNumber(Math.abs(lineItem.basePrice.value), '#####0.00', 'en_US');
            item.quantity = 1;
            item.productCode = '';
            item.productName = lineItem.lineItemText;
            item.productSKU = 'PriceAdjustment';
        }

        var basketShippingPriceAdjustments = basket.getShippingPriceAdjustments().iterator();
        while (basketShippingPriceAdjustments.hasNext()) {
            var lineItem = basketShippingPriceAdjustments.next();
            itemMap.put(idcount.toString(), lineItem);
            var item = new csReference.Item();
            item.unitPrice = StringUtils.formatNumber(Math.abs(lineItem.basePrice.value), '#####0.00', 'en_US');
            item.quantity = 1;
            item.productCode = '';
            item.productName = lineItem.lineItemText;
            item.productSKU = 'PriceAdjustment';
        }
    }
    /* eslint-enable */

    return { success: true, itemarray: items, itemmap: itemMap };
}

/**
 * Creates the data from basket / order to get tax calculated from cybersource.
 * @param {*} lineItemPrice lineItemPrice
 * @param {*} orderLevelAdjustmentPrice orderLevelAdjustmentPrice
 * @param {*} basketSubTotalPrice basketSubTotalPrice
 * @param {*} currencyCode currencyCode
 * @param {*} quantity quantity
 * @returns {*} obj
 */
function getOrderLevelAdjustedLineItemPrice(lineItemPrice, orderLevelAdjustmentPrice, basketSubTotalPrice, currencyCode, quantity) {
    var price = 0;
    var Money = require('dw/value/Money');

    // eslint-disable-next-line
    if (lineItemPrice != null && orderLevelAdjustmentPrice != null && basketSubTotalPrice != null && !empty(currencyCode)) {
        var ratioDivided = lineItemPrice.divide(basketSubTotalPrice.getValue());

        var ratioAdjustment = (ratioDivided * (Math.abs(orderLevelAdjustmentPrice.getValue())));

        var adjustedPrice = new Money(ratioAdjustment, currencyCode);

        price = lineItemPrice.subtract(adjustedPrice);

        // eslint-disable-next-line
        if (!empty(quantity) && quantity > 1) {
            price = price.divide(quantity);
        }
    }

    return price;
}

/**
 * Creates the purchase object for tax calculation
 * @param {*} Basket Basket
 * @returns {*} obj
 */
function CreateCybersourceTaxationPurchaseTotalsObject(Basket) {
    var basket = Basket;

    var PurchaseTotalsObject = require('*/cartridge/scripts/cybersource/CybersourcePurchaseTotalsObject');
    var purchaseObject = new PurchaseTotalsObject();
    // var amount = basket.totalGrossPrice;
    purchaseObject.setCurrency(basket.getCurrencyCode());

    return { success: true, CybersourcePurchaseTotals: purchaseObject };
}

/**
 * Sets data in taxServiceObject fro tax calculation.
 * @returns {*} obj
 */
function CreateCyberSourceTaxRequestObject() {
    var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    var TaxServiceObject = require('*/cartridge/scripts/cybersource/CybersourceTaxRequestObject');
    var taxServiceObject = new TaxServiceObject();

    taxServiceObject.setOrderAcceptanceCity(CybersourceHelper.getPOACity());
    taxServiceObject.setOrderAcceptanceState(CybersourceHelper.getPOAStateCode());
    taxServiceObject.setOrderAcceptancePostalCode(CybersourceHelper.getPOAZipCode());
    taxServiceObject.setOrderAcceptanceCountry(CybersourceHelper.getPOACountryCode());

    taxServiceObject.setOrderOriginCity(CybersourceHelper.getPOOCity());
    taxServiceObject.setOrderOriginState(CybersourceHelper.getPOOStateCode());
    taxServiceObject.setOrderOriginPostalCode(CybersourceHelper.getPOOZipCode());
    taxServiceObject.setOrderOriginCountry(CybersourceHelper.getPOOCountryCode());

    return { success: true, taxRequestObject: taxServiceObject };
}

/**
 * Update the price adjustments i.e if any promotion is applied on prodcut or order then tax is updated.
 * @param {*} Basket Basket
 * @returns {*} obj
 */
function UpdatePriceAdjustment(Basket) {
    var basket = Basket;
    if (basket == null) {
        return { error: true };
    }
    try {
        if (!basket.getPriceAdjustments().empty) {
            var basketPriceAdjustments = basket.getPriceAdjustments().iterator();
            while (basketPriceAdjustments.hasNext()) {
                var basketPriceAdjustment = basketPriceAdjustments.next();
                basketPriceAdjustment.updateTax(0);
            }
        }
        var shipments = basket.getShipments().iterator();
        while (shipments.hasNext()) {
            var shipment = shipments.next();

            var shipmentLineItems = shipment.getAllLineItems().iterator();
            while (shipmentLineItems.hasNext()) {
                var lineItem = shipmentLineItems.next();

                // eslint-disable-next-line
                if (lineItem instanceof dw.order.ProductLineItem) {
                    if (!lineItem.bonusProductLineItem) {
                        lineItem.updateTax(lineItem.taxRate, lineItem.proratedPrice);
                    } else {
                        // tax is not getting calculated for bonus product which is updating bonus line item's tax as /NA. it has the direct impact on basket totals
                        // Resolution - update line item tax with 0 which will resolve the tax calculation N/A for bonus line items.
                        lineItem.updateTax(0);
                    }
                    // eslint-disable-next-line
                } else if (lineItem instanceof dw.order.ShippingLineItem) {
                    lineItem.updateTax(lineItem.taxRate, lineItem.adjustedNetPrice);
                    // eslint-disable-next-line
                } else if (!lineItem instanceof dw.order.PriceAdjustment) { // eslint-disable-line no-unsafe-negation
                    lineItem.updateTax(lineItem.taxRate, lineItem.netPrice);
                } else {
                    lineItem.updateTax(lineItem.taxRate, lineItem.netPrice);
                }
            }
        }

        basket.updateTotals();
    } catch (e) {
        Logger.error('Error in [TaxHelper.js] ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    return { success: true };
}

module.exports = {
    CreateCyberSourceTaxRequestObject: CreateCyberSourceTaxRequestObject,
    UpdatePriceAdjustment: UpdatePriceAdjustment,
    CreateCybersourceTaxationPurchaseTotalsObject: CreateCybersourceTaxationPurchaseTotalsObject,
    CreateCybersourceTaxationItemsObject: CreateCybersourceTaxationItemsObject
};
