'use strict';

/**
* CybersourcePurchaseTotalsObject.js
* This Object is used for the Cybersource PurchaseTotals xsd
*/
/* eslint-disable */
function PurchaseTotalsObject() {
    this.grandTotalAmount;
    this.currency;
    this.discountAmount;
    this.taxAmount;
    this.dutyAmount;
    this.freightAmount;
    this.shippingAmount;
    this.subtotalAmount;
    this.shippingDiscountAmount;
}
/* eslint-enable */

PurchaseTotalsObject.prototype = {
    setGrandTotalAmount: function (value) {
        this.grandTotalAmount = value;
    },
    getGrandTotalAmount: function () {
        return this.grandTotalAmount;
    },
    setCurrency: function (value) {
        this.currency = value;
    },
    getCurrency: function () {
        return this.currency;
    },
    setDiscountAmount: function (value) {
        this.discountAmount = value;
    },
    getDiscountAmount: function () {
        return this.discountAmount;
    },
    setTaxAmount: function (value) {
        this.taxAmount = value;
    },
    getTaxAmount: function () {
        return this.taxAmount;
    },
    setDutyAmount: function (value) {
        this.dutyAmount = value;
    },
    getDutyAmount: function () {
        return this.dutyAmount;
    },
    setFreightAmount: function (value) {
        this.freightAmount = value;
    },
    getFreightAmount: function () {
        return this.freightAmount;
    },
    setShippingAmount: function (value) {
        this.shippingAmount = value;
    },
    // eslint-disable-next-line
    getShippingAmount: function (value) {
        return this.shippingAmount;
    },
    setSubtotalAmount: function (value) {
        this.subtotalAmount = value;
    },
    // eslint-disable-next-line
    getSubtotalAmount: function (value) {
        return this.subtotalAmount;
    },
    setShippingDiscountAmount: function (value) {
        this.shippingDiscountAmount = value;
    },
    // eslint-disable-next-line
    getShippingDiscountAmount: function (value) {
        return this.shippingDiscountAmount;
    }
};
module.exports = PurchaseTotalsObject;
