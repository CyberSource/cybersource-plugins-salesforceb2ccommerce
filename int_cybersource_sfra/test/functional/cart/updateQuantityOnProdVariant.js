'use strict';

import { assert } from 'chai';
import { config } from '../webdriver/wdio.conf';
import * as cartPage from '../../mocks/testDataMgr/pageObjects/cart';
import * as productDetailPage from '../../mocks/testDataMgr/pageObjects/productDetail';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as pricingHelpers from '../../mocks/testDataMgr/helpers/pricing';


describe('Cart - Update Quantity On Product Variant', () => {
    const locale = config.locale;

    const productVariantId1 = '701643421084';
    let productVariant1;
    const productVariantId2 = '701642923459';
    let productVariant2;
    const productVariantId3 = '883360524757';
    let productVariant3;

    const newQty = 3;
    const prodIdUnitPricesMap = {};

    const shippingCostMap = {
        'x_default': '$9.99',
        'en_GB': '£7.99',
        'fr_FR': '7,99 €',
        'it_IT': '€ 7,99',
        'ja_JP': '¥ 16',
        'zh_CN': '¥15.99'
    };

    const totalTaxMap = {
        'x_default': '$13.55',
        'en_GB': '£8.99',
        'fr_FR': '8,99 €',
        'it_IT': '€ 8,99',
        'ja_JP': '¥ 17',
        'zh_CN': '¥25.00'
    };

    before(() => {
        return testDataMgr.load()
            .then(() => {
                const unitPrices = testDataMgr.getPricesByProductId(productVariantId1, locale);
                prodIdUnitPricesMap[productVariantId1] = unitPrices;

                productVariant1 = testDataMgr.getProductById(productVariantId1);
                return browser.url(productVariant1.getUrlResourcePath());
            })
            .then(() => productDetailPage.clickAddToCartButton())
            .then(() => {
                const unitPrices = testDataMgr.getPricesByProductId(productVariantId2, locale);
                prodIdUnitPricesMap[productVariantId2] = unitPrices;

                productVariant2 = testDataMgr.getProductById(productVariantId2);
                return browser.url(productVariant2.getUrlResourcePath());
            })
            .then(() => productDetailPage.clickAddToCartButton())
            .then(() => {
                const unitPrices = testDataMgr.getPricesByProductId(productVariantId3, locale);
                prodIdUnitPricesMap[productVariantId3] = unitPrices;

                productVariant3 = testDataMgr.getProductById(productVariantId3);
                return browser.url(productVariant3.getUrlResourcePath());
            })
            .then(() => productDetailPage.clickAddToCartButton())
            .then(() => cartPage.navigateTo());
    });

    after(() => cartPage.emptyCart());

    it('Should be able to update quantity of variant item.', function () {
        return cartPage.updateQuantityByRow(2, newQty.toString())
            .then(quantity => {
                return assert.equal(quantity, newQty, 'Expected the product quantity updated to ' + newQty);
            });
    });

    it('Should have updated total line items', function () {
        return browser.getText(cartPage.NUMBER_OF_ITEMS)
            .then(totalItems => {
                return assert.equal(totalItems, '5 Items', 'Expected the total number of items to be 5 Items.');
            });
    });

    it('Should have correct line item each price', function () {
        return cartPage.getEachPriceByRow(2)
            .then(price => {
                const expectedUnitPrice = prodIdUnitPricesMap[productVariantId2].list;
                return assert.equal(price, expectedUnitPrice, 'Expected the line item 2 have total price of ' + expectedUnitPrice);
            });
    });

    it('Should have updated line item total price', function () {
        return cartPage.getTotalPriceByRow(2)
            .then(price => {
                const expectedUnitPrice = prodIdUnitPricesMap[productVariantId2].list;
                const listPriceValue = pricingHelpers.getCurrencyValue(expectedUnitPrice, locale);
                const expectedSubTotal = listPriceValue * newQty;
                const formattedExpectedSubTotal = pricingHelpers.getFormattedPrice(expectedSubTotal.toString(), locale);

                return assert.equal(price, formattedExpectedSubTotal, 'Expected the line item 2 have total price of ' + formattedExpectedSubTotal);
            });
    });

    it('Should have updated shipping cost', function () {
        const expectShipCost = shippingCostMap[locale];

        return browser.getText(cartPage.SHIPPING_COST)
            .then(shippingCost => {
                return assert.equal(shippingCost, expectShipCost, 'Expected shipping cost to be ' + expectShipCost);
            });
    });

    it('Should have updated tax total', function () {
        const expectTotalTax = totalTaxMap[locale];

        return browser.getText(cartPage.TAX_TOTAL)
            .then(taxTotal => {
                return assert.equal(taxTotal, expectTotalTax, 'Expected shipping cost to be ' + expectTotalTax);
            });
    });

    it('Should have updated estimated total', function () {
        const expectedUnitPrice1 = prodIdUnitPricesMap[productVariantId1].list;
        const listPriceValue1 = pricingHelpers.getCurrencyValue(expectedUnitPrice1, locale);

        const expectedUnitPrice2 = prodIdUnitPricesMap[productVariantId2].list;
        const listPriceValue2 = pricingHelpers.getCurrencyValue(expectedUnitPrice2, locale);

        const expectedUnitPrice3 = prodIdUnitPricesMap[productVariantId3].list;
        const listPriceValue3 = pricingHelpers.getCurrencyValue(expectedUnitPrice3, locale);

        const expectShipCost = shippingCostMap[locale];
        const shipCostValue = pricingHelpers.getCurrencyValue(expectShipCost, locale);

        const expectTotalTax = totalTaxMap[locale];
        const totalTaxValue = pricingHelpers.getCurrencyValue(expectTotalTax, locale);

        const expectedEstimatedTotal = listPriceValue1 + (listPriceValue2 * newQty) + listPriceValue3 +
            shipCostValue + totalTaxValue;
        const formattedExpectedSubTotal = pricingHelpers.getFormattedPrice(expectedEstimatedTotal.toString(), locale);

        return browser.getText(cartPage.GRAND_TOTAL)
            .then(subTotal => {
                return assert.equal(subTotal, formattedExpectedSubTotal, 'Expected shipping cost to be ' + formattedExpectedSubTotal);
            });
    });
});
