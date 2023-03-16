'use strict';

 

var assert = require('chai').assert;
var collectionsMock = require('../../../mocks/dw.util.Collection');
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var toProductMock = require('../../../util');
var mockSuperModule = require('../../../mocks/superModule');
var baseTotalsMock = require('../../../mocks/models/totals');
var Money = require('../../../mocks/dw.value.Money');
var Cart;

global.empty = function (variable) {
    var isEmpty = true;
    if (variable) {
        isEmpty = false;
    }
    return isEmpty;
};

var productVariantMock = {
	ID: '1234567',
	name: 'test product',
	variant: true,
	availabilityModel: {
		isOrderable: {
			return: true,
			type: 'function'
		},
		inventoryRecord: {
			ATS: {
				value: 100
			}
		}
	},
	minOrderQuantity: {
	   value: 2
	}
};

var productMock = {
	variationModel: {
		productVariationAttributes: [{
			attributeID: '',
			value: ''
		}],
		selectedVariant: productVariantMock
	}

};

var createApiBasket = function (options) {
	
	var safeOptions = options || {};
	var basket = {
		allProductLineItems: [{
			bonusProductLineItem: false,
			gift: false,
			UUID: 'some UUID',
			adjustedPrice: {
				value: 'some value',
				currencyCode: 'US'
			},
			quantity: {
				value: 1
			},
			product: toProductMock(productMock)
		}],
		couponLineItems:[{
			applied: true
		}],
		totalGrossPrice: new Money(true),
		totalTax: new Money(true),
		shippingTotalPrice: new Money(true),
		discountPlan: {
			getLineItemCtnr: function(){
				return {
					getAllShippingPriceAdjustments: function(){
						let shippingAdjustment = [{
							appliedDiscount:{
								type: 'FREE'
							}
						}];
						return shippingAdjustment;
					}
				}
			}
		},
		paymentInstruments : {
			paymentInstrumentArray:[
				{
					paymentTransaction :{
						getAmount : function()
						{
							return new Money()
						}  
					},			
					getPaymentTransaction: function(){
						return this.paymentTransaction;
					}
					
				}
			],
			index : 0,
			iterator: function () {
				return {
					items: basket.paymentInstruments.paymentInstrumentArray,
					hasNext: function () {
						return basket.paymentInstruments.index < basket.paymentInstruments.paymentInstrumentArray.length;
					},
					next: function () {
						return basket.paymentInstruments.paymentInstrumentArray[basket.paymentInstruments.index++];
					}
				};
			}
		} 

	};

	basket.getAdjustedMerchandizeTotalPrice = function () {
		return new Money(true);
	};

	basket.getCurrencyCode = function () {
		return 'USD';
	};
	
	basket.getGiftCertificatePaymentInstruments = function () {
		return basket.paymentInstruments;
	};
	basket.getTotalGrossPrice = function () {
		return basket.totalGrossPrice;
	};
	if (safeOptions.productLineItems) {
		basket.productLineItems = safeOptions.productLineItems;
	}
	if (safeOptions.totals) {
		basket.totals = safeOptions.totals;
	}
	return basket;
};

describe('cart', function () {

before(function () {
	mockSuperModule.create(baseTotalsMock);
	
	Cart = proxyquire('../../../../cartridges/int_cybersource_sfra/cartridge/models/cart', {
		'dw/system/Site':{},  
		'dw/value/Money': Money,
		'empty' : function(basket)
			{
			return false;
			}
	});

});
after(function () {
	mockSuperModule.remove();
});

it('should get non-gift certicaticate amount', function () {
	var result = new Cart(createApiBasket());
	assert.isNotNull(result.getNonGiftCertificateAmount);
});

});