'use strict';

import { assert } from 'chai';
import * as cartPage from '../../mocks/testDataMgr/pageObjects/cart';
import * as productDetailPage from '../../mocks/testDataMgr/pageObjects/productDetail';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as Resource from '../../mocks/dw/web/Resource';

/*
/verify a bundle can be added to Cart
 */
describe('Cart - Add bundle To Cart', () => {
    let productBundle;

    before(() => {
        return testDataMgr.load()
            .then(() => {
                productBundle = testDataMgr.getProductBundle();
                return browser.url(productBundle.getUrlResourcePath())
                    .then(() => productDetailPage.clickAddToCartButton())
                    .then(() => cartPage.navigateTo());
            });
    });

    it('should display the correct number of rows', () => {
        cartPage.getItemList()
            .then(rows => assert.equal(1, rows.value.length));
    });

    it('should display the correct name', () => {
        const expectedBundleName = ['Xbox 360 Bundle',
            'Microsoft X-Box 360 Game Console',
            'Fight Night: Round 3 (for X-Box 360)',
            'Grand Theft Auto 4 (for X-Box 360)',
            'Robert Ludlum\'s: The Bourne Conspiracy (for X-Box 360)'];

        return cartPage.getItemNameByRow(1)
            .then(names => {
                assert.equal(names[0], expectedBundleName[0]);
                assert.equal(names[1], expectedBundleName[1]);
                assert.equal(names[2], expectedBundleName[2]);
                assert.equal(names[3], expectedBundleName[3]);
                assert.equal(names[4], expectedBundleName[4]);
            });
    });

    it('should display the correct total price', () => {
        const expectedTotal = '$299.99';
        return cartPage.getTotalPriceByRow(1)
            .then(totalPrice => assert.equal(totalPrice, expectedTotal));
    });

    it('should enable AddToCart Button', () => {
        return browser.isEnabled(cartPage.BTN_CHECKOUT)
            .then(isEnabled => assert.isTrue(isEnabled));
    });

    it('should remove bundle in Cart', () => {
        var cartEmptyMsg = Resource.msgf('info.cart.empty.msg', 'cart', null);
        return cartPage.emptyCart()
            .then(() => browser.waitForVisible(cartPage.CART_EMPTY))
            .then(() => cartPage.verifyCartEmpty())
            .then((msg => assert.equal(msg, cartEmptyMsg)));
    });
});
