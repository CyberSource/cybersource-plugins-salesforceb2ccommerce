'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./checkout/billing'));
    processInclude(require('./checkout/checkout'));
    processInclude(require('./checkout/shippingDAV'));
});
