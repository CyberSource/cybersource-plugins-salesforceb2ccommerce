'use strict';

var page = module.superModule;
var server = require('server');
var MobilePaymentsHelper = require('*/cartridge/scripts/mobilepayments/helper/MobilePaymentsHelper');
server.extend(page);

server.append('Confirm', function (req, res, next) {
    var viewData = res.getViewData();
    viewData = MobilePaymentsHelper.addToOrderModel(viewData);
    delete session.privacy.orderId;
    res.setViewData(viewData);
    next();
});

server.append('Details', function (req, res, next) {
    var viewData = res.getViewData();
    viewData = MobilePaymentsHelper.addToOrderModel(viewData);
    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
