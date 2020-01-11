'use strict';

var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var collections = require('../util/collections');

function proxyModel() {
    return proxyquire('../../../../storefront-reference-architecture/cartridges/app_storefront_base/cartridge/models/productLineItems', {
        '*/cartridge/scripts/util/collections': collections,
        '*/cartridge/scripts/factories/product': {
            get: function () {
                return { bonusProducts: null, bonusProductLineItemUUID: null };
            }
        }
    });
}

module.exports = proxyModel();
