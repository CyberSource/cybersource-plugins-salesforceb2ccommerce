'use strict';

var base = require('base/checkout/checkout');
var billingHelpers = require('./billing');
var shippingHelpers = require('./shipping');

[billingHelpers, shippingHelpers].forEach(function (library) {
    Object.keys(library).forEach(function (item) {
        if (typeof library[item] === 'object') {
            exports[item] = $.extend({}, exports[item], library[item]);
        } else {
            exports[item] = library[item];
        }
    });
});

// Wrap the base initialize to enable customer submit buttons after JS is ready
var originalInitialize = base.initialize;
base.initialize = function () {
    originalInitialize();
    // Enable customer form buttons now that JS event handlers are registered
    $('.submit-customer, .submit-customer-login').prop('disabled', false);
};

module.exports = base;
