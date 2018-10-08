'use strict';

import { assert } from 'chai';
import * as productDetailPage from '../../mocks/testDataMgr/pageObjects/productDetail';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as common from '../../mocks/testDataMgr/helpers/common';

describe('Product Details - Product Variant', () => {
    const variantId = '708141676190';
    const expectedPrimaryImage = 'PG.15J0037EJ.WHITEFB.PZ.jpg';
    const expectedSecondaryImage = 'PG.15J0037EJ.WHITEFB.BZ.jpg';
    const nextButton = '.carousel-control-next .icon-next';
    const elementPrimaryImage = '.carousel-item.active .img-fluid';
    const elementImage = '.img-fluid';

    before(() => {
        return testDataMgr.load()
            .then(() => {
                var variant = testDataMgr.getProductById(variantId);
                return browser.url(variant.getUrlResourcePath());
            });
    });

    it('should display its product ID', () => {
        return browser.getText('.product-id')
            .then(itemNumber => {
                return assert.equal(itemNumber, variantId);
            });
    });

    it('should display its product name', () => {
        return common.getVisibleSelector(productDetailPage.PRODUCT_NAME, productDetailPage.PRODUCT_NAME_SMALL)
            .then(mySelector => browser.getHTML(mySelector))
            .then(name => assert.include(name, 'No-Iron Textured Dress Shirt'));
    });

    it('should display its product image', () => {
        return browser.isExisting(elementImage)
            .then(exists => assert.isTrue(exists));
    });

    it('should display the default variant primary image', () => {
        return browser.element(elementPrimaryImage)
            .then(el => browser.elementIdAttribute(el.value.ELEMENT, 'src'))
            .then(displayedImgSrc => assert.isTrue(displayedImgSrc.value.endsWith(expectedPrimaryImage)));
    });

    it('should display the secondary default variant primary image after click', () => {
        return browser.element(nextButton)
            .click()
            .waitForVisible(elementImage, 2000, true)
            .then(() => browser.element(elementPrimaryImage))
            .then(el => browser.elementIdAttribute(el.value.ELEMENT, 'src'))
            .then(displayedImgSrc => assert.isTrue(displayedImgSrc.value.endsWith(expectedSecondaryImage)));
    });

    it('should enable the "Add to Cart" button', () => {
        return browser.isEnabled('.add-to-cart')
            .then(enabled => assert.isTrue(enabled));
    });
});
