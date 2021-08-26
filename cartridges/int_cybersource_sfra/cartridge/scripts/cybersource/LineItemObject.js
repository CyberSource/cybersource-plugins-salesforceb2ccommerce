'use strict';

/**
* LineItemObject.js
* This Mock Object is used for the Cybersource Line Item xsd
*/
function MockLineItemObject() {
    this.tax = '';
    this.grossPrice = '';
    this.product = '';
    this.basePrice = '';
    this.quantity = '';
    this.lineItemClass = '';
    this.productName = '';
    this.productID = '';
    this.productCode = '';
    this.netPrice = '';
}
MockLineItemObject.prototype = {
    setTax: function (value) {
        this.tax = value;
    },
    getTax: function () {
        return this.tax;
    },

    setGrossPrice: function (value) {
        this.grossPrice = value;
    },
    // eslint-disable-next-line
    getGrossPrice: function (value) {
        return this.grossPrice;
    },

    setProduct: function (value) {
        this.product = value;
    },
    getProduct: function () {
        return this.product;
    },
    setProductCode: function (value) {
        this.productCode = value;
    },
    getProductCode: function () {
        return this.productCode;
    }
};

module.exports = MockLineItemObject;
