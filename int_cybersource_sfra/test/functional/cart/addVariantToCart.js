'use strict';

import { assert } from 'chai';
import * as cartPage from '../../mocks/testDataMgr/pageObjects/cart';
import * as productDetailPage from '../../mocks/testDataMgr/pageObjects/productDetail';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as products from '../../mocks/testDataMgr/products';
import * as Resource from '../../mocks/dw/web/Resource';

describe.skip('Cart - Add Variant To Cart', () => {
    let catalog;
    let productVariationMaster;
    let resourcePath;

    const variant1 = {
        instance: undefined,
        color: {
            index: undefined,
            displayValue: undefined
        },
        size: {
            index: undefined,
            displayValue: undefined
        },
        width: {
            index: undefined,
            displayValue: undefined
        }
    };
    const variant2 = {
        instance: undefined,
        color: {
            index: undefined,
            displayValue: undefined
        },
        size: {
            index: undefined,
            displayValue: undefined
        },
        width: {
            index: undefined,
            displayValue: undefined
        }
    };

    before(() => {
        return testDataMgr.load()
            .then(() => {
                productVariationMaster = testDataMgr.getProductVariationMaster();
                return browser.url(productVariationMaster.getUrlResourcePath());
            })
            .then(() => {
                const variant1Selection = new Map();
                catalog = testDataMgr.parsedData.catalog;
                const variantIds = productVariationMaster.getVariantProductIds();

                // No-Iron Textured Dress Shirt (Color: White, Size: 14 1/2, Width: 32/33)
                variant1.instance = products.getProduct(catalog, variantIds[0]);
                // No-Iron Textured Dress Shirt (Color: White, Size: 17 1/2, Width: 34/35)
                variant2.instance = products.getProduct(catalog, variantIds[10]);

                // We must increment the index by 1 for the attribute selectors that use CSS nth-child which is one-based.
                variant1.color.index = productVariationMaster.getAttrTypeValueIndex('color', variant1.instance.customAttributes.color) + 1;
                variant1.size.index = productVariationMaster.getAttrTypeValueIndex('size', variant1.instance.customAttributes.size) + 1;
                variant1.width.index = productVariationMaster.getAttrTypeValueIndex('width', variant1.instance.customAttributes.width) + 1;

                variant1Selection.set('resourcePath', resourcePath);
                variant1Selection.set('colorIndex', variant1.color.index);
                variant1Selection.set('sizeIndex', variant1.size.index);
                variant1Selection.set('widthIndex', variant1.width.index);

                return productDetailPage.addProductVariationToCart(variant1Selection);
            })
            .then(() => cartPage.navigateTo());
    });

    it('should display the correct number of rows', () => {
        cartPage
            .getItemList()
            .then(rows => assert.equal(1, rows.value.length));
    });

    it('should display the correct name', () => {
        const expectedProductName = 'No-Iron Textured Dress Shirt';
        return cartPage
            .getItemNameByRow(1)
            .then(name => assert.equal(name, expectedProductName));
    });

    it('should display the correct color', () => {
        const expectedColor = 'Color: Slate';
        return cartPage
            .createCssNthLineItem(1, 1)
            .then(color => assert.equal(color[0], expectedColor));
    });

    it('should display the correct size', () => {
        const expectedSize = 'Size: 14 1/2';
        return cartPage
            .createCssNthLineItem(1, 2)
            .then(size => assert.equal(size, expectedSize));
    });

    it('should display the correct width', () => {
        const expectedWidth = 'Width: 32/33';
        return cartPage
            .createCssNthLineItem(1, 3)
            .then(width => assert.equal(width, expectedWidth));
    });

    it('should remove item in Cart', () => {
        var cartEmptyMsg = Resource.msgf('info.cart.empty.msg', 'cart', null);
        return cartPage.emptyCart()
            .then(() => browser.waitForVisible(cartPage.CART_EMPTY))
            .then(() => cartPage.verifyCartEmpty())
            .then((msg => assert.equal(msg, cartEmptyMsg)));
    });
});

