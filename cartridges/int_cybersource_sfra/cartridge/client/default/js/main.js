'use strict';

// eslint-disable-next-line
window.jQuery = window.$ = require('jquery');
var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('base/main'));
    processInclude(require('./components/miniCart'));
});
