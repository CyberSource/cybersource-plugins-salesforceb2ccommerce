'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./checkout/checkout'));
    processInclude(require('./checkout/cybersource/flexMicroform'));
    processInclude(require('./checkout/shippingDAV'));
});