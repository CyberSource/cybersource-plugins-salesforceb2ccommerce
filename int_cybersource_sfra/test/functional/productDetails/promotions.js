'use strict';

import { assert } from 'chai';
import * as productDetailPage from '../../mocks/testDataMgr/pageObjects/productDetail';
import * as testDataMgr from '../../mocks/testDataMgr/main';


describe('Product Details - Promotions', function () {
    const masterPid = '25752986';
    const promotionId = 'PromotionTest_WithoutQualifying';
    let product = null;
    let promotion = null;

    before(() => {
        return testDataMgr.load()
            .then(() => {
                product = testDataMgr.getProductById(masterPid);
                promotion = testDataMgr.getPromotionById(promotionId);
                return browser.url(product.getUrlResourcePath());
            });
    });

    it('should display a Promotion callout', function () {
        return browser.waitForVisible(productDetailPage.PROMOTIONS)
            .getText(productDetailPage.PROMOTIONS)
            .then(callOutMsg => assert.equal(callOutMsg, promotion.calloutMsg.x_default));
    });

    it('should set the Promotion callout title attr to its details value', function () {
        return browser.getAttribute(productDetailPage.PROMOTION_CALLOUT, 'title')
            .then(promotionTitle => assert.equal(promotionTitle, promotion.details.x_default));
    });

    it('should not display a Promotion when none apply to a selected Variant', function () {
        const redTie = '[data-attr-value="REDSI"]';
        return browser.click(redTie)
            .waitForVisible(productDetailPage.PROMOTION_CALLOUT, 6000, true)
            .getText(productDetailPage.PROMOTIONS)
            .then(promotionsText => assert.equal(promotionsText, ''));
    });

    it('should display a Promotion when one applies to a selected Variant', function () {
        const blueTie = '[data-attr-value="TURQUSI"]';
        return browser.click(blueTie)
            .waitForVisible(productDetailPage.PROMOTION_CALLOUT)
            .getText(productDetailPage.PROMOTIONS)
            .then(promotionsText => assert.equal(promotionsText, promotion.calloutMsg.x_default));
    });
});
