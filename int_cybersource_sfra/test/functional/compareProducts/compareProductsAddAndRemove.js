'use strict';

/**
 * Compare women->Clothing->tops
 * - Navigate to Women->Clothing->tops
 * - select 4 products to compare
 * - Verify the compare bar at the bottom of the page contains the 4 products
 * - Verify compare return the products expected.
 * - Click on the Back To Results Page Button
 * - Remove one product from the compareBar
 * - Add a new product to the compareBar
 * - Click on Compare button
 * - Verify that there are 4 products in the Result page
 */

import { assert } from 'chai';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as keyboard from '../../mocks/testDataMgr/helpers/keyboard';
import * as common from '../../mocks/testDataMgr/helpers/common';
import * as search from '../../mocks/testDataMgr/pageObjects/searchResult';
import * as compareProducts from '../../mocks/testDataMgr/pageObjects/compareProducts';
import * as testDataMgr from '../../mocks/testDataMgr/main';

describe.skip('Select 4 products for Compare', () => {
    const topTitle = '.page-title';
    const selector1 = [compareProducts.dataPid + ':nth-child(1)', compareProducts.compareCheckbox].join(' ');
    const selector2 = [compareProducts.dataPid + ':nth-child(2)', compareProducts.compareCheckbox].join(' ');
    const selector3 = [compareProducts.dataPid + ':nth-child(3)', compareProducts.compareCheckbox].join(' ');
    const selector4 = [compareProducts.dataPid + ':nth-child(4)', compareProducts.compareCheckbox].join(' ');
    const selector5 = [compareProducts.dataPid + ':nth-child(5)', compareProducts.compareCheckbox].join(' ');

    before(() => testDataMgr.load()
        .then(() => homePage.navigateTo())
        .then(() => browser.waitForExist(search.searchForm))
        .then(() => browser.isVisible(homePage.navBarButton))
        .then((isVisible) => {
            if (isVisible) {
                //  Access mobile devices
                return browser.click(homePage.navBarButton)
                    .pause(500)
                    .waitForVisible(homePage.navBar, 5000)
                    .click(homePage.navWomenButton)
                    .pause(500)
                    .waitForVisible(homePage.navWomenClothingButton, 5000)
                    .click(homePage.navWomenClothingButton)
                    .pause(500)
                    .waitForVisible(homePage.navWomenClothingTopsButton, 5000)
                    .click(homePage.navWomenClothingTopsButton)
                    .pause(1000)
                    .waitForExist(homePage.navBarButton, 5000)
                    .then(() => browser.getText(topTitle))
                    .then(title => assert.equal(title, 'Tops'))
                    .then(() => browser.click(selector1))
                    .click(selector2)
                    .click(selector3)
                    .click(selector4)
                    .waitForEnabled(compareProducts.buttonCompare, 5000)
                    .pause(500);
            }
            //  Access desktop or laptop browsers
            return browser.click(search.searchForm)
                .keys(keyboard.TAB)
                .keys(keyboard.TAB)
                .keys(keyboard.TAB)
                .keys(keyboard.DOWN)
                .keys(keyboard.RIGHT)
                .keys(keyboard.DOWN)
                .keys(keyboard.ENTER)
                .getText(topTitle)
                .then(title => assert.equal(title, 'Tops'))
                .then(() => browser.click(selector1))
                .scroll(selector2)
                .click(selector2)
                .click(selector3)
                .scroll(selector4)
                .click(selector4);
        })
    );

    it('should be able to select 4 products for compare', () => {
        return browser.elements(compareProducts.selectedProduct)
            .then(selectedProducts => assert.isTrue(selectedProducts.value.length === 4, 'there are 4 products in compare bar'));
    });

    it('should return 4 products at compare result page', () => {
        return browser.click(compareProducts.buttonCompare)
            .pause(500)
            .then(() => homePage.getProductTileCount())
            .then(productCount => assert.isTrue(productCount === 4, 'Expected to have 4 product tiles on the compare result page'));
    });

    it('should be able to remove a product from compare table and add a new product', () => {
        return browser.click(compareProducts.buttonGoBack)
            .pause(500)
            .elements(compareProducts.selectedProductImg)
            .then(selectedProducts => assert.isTrue(selectedProducts.value.length === 4, 'there should be 4 products in compare bar'))
            .then(() => browser.waitForVisible(compareProducts.selectorProdToRemoveIpad))
            .then(() => common.getVisibleSelector(compareProducts.selectorProdToRemoveIpad, compareProducts.selectorProdToRemove))
            .then(selector => browser.click(selector))
            .pause(500)
            .elements(compareProducts.selectedProductImg)
            .then(selectedProducts => assert.isTrue(selectedProducts.value.length === 3, 'there should be 3 products in compare bar'))
            .then(() => browser.click(selector5))
            .then(() => browser.elements(compareProducts.selectedProductImg))
            .then(prod => assert.isTrue(prod.value.length === 4, 'there should be 4 products in compare bar'));
    });

    it('should return 4 products at compare result page after remove and add', () => {
        return browser.click(compareProducts.compareButton)
            .pause(500)
            .then(() => common.waitUntilPageLoaded())
            .then(() => homePage.getProductTileCount())
            .then(productCount => assert.isTrue(productCount === 4, 'Expected to have 4 product tiles on the compare result page'));
    });
});

