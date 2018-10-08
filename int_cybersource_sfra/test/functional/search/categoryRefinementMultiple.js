'use strict';

/**
 * Navigate from Women->Clothing->Tops then
 * refine by color red, size XS and price $50-99.99 at the same time
 * verify 2 results returned and verify the product details
 */

import { assert } from 'chai';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as search from '../../mocks/testDataMgr/pageObjects/searchResult';
import * as productTile from '../../mocks/testDataMgr/pageObjects/productTile';
import * as keyboard from '../../mocks/testDataMgr/helpers/keyboard';
import * as common from '../../mocks/testDataMgr/helpers/common';
import { config } from '../webdriver/wdio.conf';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as Resource from '../../mocks/dw/web/Resource';

describe('Category Navigation and multiple refinements -  general product', () => {
    const topTitle = '.page-title';
    const locale = config.locale;
    const productID = '25565106';
    const localeStr = locale === 'x_default' ? 'en_US' : locale;

    var expectedDisplayName;
    var productMaster;

    function verifySearchResults(selector, expectedResults) {
        return browser.getText(selector)
            .then(displayText => assert.equal(displayText, expectedResults));
    }

    before(() => testDataMgr.load()
        .then(() => homePage.navigateTo())
        .then(() => browser.waitForExist(search.searchForm))
        .then(() => {
            productMaster = testDataMgr.getProductById(productID);
            expectedDisplayName = productMaster.getLocalizedProperty('displayName', locale);
        })
        .then(() => browser.isVisible(homePage.navBarButton))
        .then((isVisible) => {
            if (isVisible) {
                // access mobile devices
                return browser.click(homePage.navBarButton)
                    .waitForVisible(homePage.navBar)
                    .click(homePage.navWomenButton)
                    .waitForVisible(homePage.navWomenClothingButton)
                    .click(homePage.navWomenClothingButton)
                    .waitForVisible(homePage.navWomenClothingTopsButton)
                    .click(homePage.navWomenClothingTopsButton)
                    .waitForExist(homePage.navBarButton)
                    .pause(1000)
                    .getText(topTitle)
                    .then(title => assert.equal(title, 'Tops'))
                    .click(search.filterButton)
                    .waitForExist(search.refinementBarColor)
                    .click(search.refinementBarColor)
                    .waitForExist(search.refinementBarColorActive)
                    .click(search.redColorRefinementSelector)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => browser.waitForExist(search.refinementBarPrice))
                    .click(search.refinementBarPrice)
                    .waitForExist(search.refinementBarPriceActive)
                    .click(search.price3RefinementAppium)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => browser.waitForExist(search.refinementBarSize))
                    .click(search.refinementBarSize)
                    .waitForExist(search.refinementBarSizeActive)
                    .click(search.size8RefinementSelector)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => browser.click(search.buttonClose))
                    .then(() => common.waitUntilPageLoaded())
                    .then(() => browser.click(search.customSelect))
                    .then(() => browser.click(search.sortOrderProductAtoZ))
                    // need this pause since wait for other condition not working
                    .then(() => browser.pause(2000));
            }
            // access desktop/laptop
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
                .then(() => browser.click(search.redColorRefinementSelector))
                .then(() => common.waitUntilAjaxCallEnded())
                .click(search.price3RefinementBrowser)
                .then(() => common.waitUntilAjaxCallEnded())
                .click(search.size8RefinementBrowser)
                .then(() => common.waitUntilAjaxCallEnded())
                .then(() => browser.click(search.customSelect))
                .then(() => browser.click(search.sortOrderProductAtoZ))
                // need this pause since wait for other condition not working
                .then(() => browser.pause(2000));
        })
    );

    it('#1 should return 2 results when refine by Color, Price and Size', () => {
        const searchResultMsg2 = Resource.msgf('label.results', 'search', null, '2');
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                if (isTrue) {
                    // access mobile device
                    return verifySearchResults(search.searchResultCount, searchResultMsg2);
                }
                // access desktop or laptop browser
                return verifySearchResults(search.searchResult, searchResultMsg2);
            });
    });

    it('#2 should return the correct names of the products when refined by Color, Price and Size', () => {
        return productTile.getProductTileProductName(productID)
            .then(productName => {
                return assert.equal(productName, expectedDisplayName, 'Expected: displayed product name = ' + expectedDisplayName);
            });
    });

    it('#3 should return the correct images when refined by Color, Price and Size', () => {
        const product1ImageSrc = 'images/medium/PG.10229049.JJ1TOA0.PZ.jpg';
        return productTile.getProductTileImageSrc(productID)
            .then(imageSrc => {
                return assert.isTrue(imageSrc.endsWith(product1ImageSrc),
                    'product image: url not end with ' + product1ImageSrc);
            });
    });

    it('#4 should return the correct href links when refined by Color, Price and Size', () => {
        let expectedLink = common.convertToUrlFormat(expectedDisplayName) + '/' + productID + '.html?cgid=womens-clothing-tops&lang=' + localeStr;
        if (expectedLink.startsWith('https')) {
            expectedLink = common.convertHTTPsToHTTP(expectedLink);
        }
        return productTile.getProductTileImageHref(productID)
            .then(imageLink => {
                assert.include(imageLink, expectedLink, 'Actual image link does not include ' + expectedLink);
            });
    });

    it('#5 should return the correct color swatch count when refined by Color, Price and Size', () => {
        return productTile.getProductTileColorSwatchCount(productID)
            .then(count => assert.equal(count, 1, 'Expected: the number of color swatch to be 1.'));
    });

    it('#6 should return 275 results for pants when reset button is clicked', () => {
        const searchResultMsg = Resource.msgf('label.results', 'search', null, '275');
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                if (isTrue) {
                    // access mobile devices
                    return browser.click(search.filterButton)
                        .waitForExist(search.refinementBarColorActive, 3000)
                        .click(search.resetButton)
                        .then(() => common.waitUntilAjaxCallEnded())
                        .then(() => browser.pause(1000))
                        .then(() => verifySearchResults(search.searchResult, searchResultMsg));
                }
                // access desktop/laptop browsers
                return browser.click(search.resetButton)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => verifySearchResults(search.searchResult, searchResultMsg));
            });
    });
});
