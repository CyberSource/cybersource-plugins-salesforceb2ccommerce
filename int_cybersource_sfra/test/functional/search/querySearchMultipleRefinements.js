'use strict';
/**
Query Search on General Product then do multiple refinements
- Search for 'pants'
- refine by Color, Price and New Arrival
- click on reset button
 */

import { assert } from 'chai';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as search from '../../mocks/testDataMgr/pageObjects/searchResult';
import * as productTile from '../../mocks/testDataMgr/pageObjects/productTile';
import * as common from '../../mocks/testDataMgr/helpers/common';
import { config } from '../webdriver/wdio.conf';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as Resource from '../../mocks/dw/web/Resource';

describe('Query Search and multiple refinements -  general product', () => {
    const locale = config.locale;
    const product2ID = '12416789';
    const localeStr = locale === 'x_default' ? 'en_US' : locale;
    const productGeneral = {
        x_default: 'pants',
        en_GB: 'trousers',
        fr_FR: 'pantalon',
        it_IT: 'pantaloni',
        jp_JP: 'パンツ',
        zh_CN: '裤子'
    };

    var productMaster2;
    var expectedDisplayName2;

    const searchResultMsg = Resource.msgf('label.resultsfor', 'search', null, '79');
    const expectedString = searchResultMsg + ' ' + productGeneral[locale];
    let myQuerySelector;

    function verifySearchResults(selector, expectedResults) {
        return browser.getText(selector)
            .then(displayText => assert.equal(displayText, expectedResults));
    }

    before(() => testDataMgr.load()
        .then(() => homePage.navigateTo())
        .then(() => browser.waitForExist(search.searchForm))
        .then(() => {
            productMaster2 = testDataMgr.getProductById(product2ID);
            expectedDisplayName2 = productMaster2.getLocalizedProperty('displayName', locale);
        })
        .then(() => common.getVisibleSelector(search.searchQuerySelector1, search.searchQuerySelector2))
        .then(mySelector => {
            myQuerySelector = mySelector;
            return browser.setValue(myQuerySelector, productGeneral[locale]);
        })
        .then(() => browser.submitForm(myQuerySelector))
        // need this pause because other wait condition does not work
        .then(() => browser.pause(2000))
        .then(() => browser.isVisible(search.filterButton))
        .then((isTrue) => {
            if (isTrue) {
                // access mobile devices
                return browser.click(search.filterButton)
                    .then(() => browser.waitForExist(search.refinementBarColor))
                    .then(() => browser.click(search.refinementBarColor))
                    .then(() => browser.waitForExist(search.refinementBarColorActive))
                    .then(() => browser.click(search.blueColorRefinementSelector))
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => browser.waitForExist(search.refinementBarPrice))
                    .then(() => browser.click(search.refinementBarPrice))
                    .then(() => browser.waitForExist(search.refinementBarPriceActive))
                    .then(() => browser.click(search.priceRefinementAppium))
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => browser.waitForExist(search.refinementBarNewArrival))
                    .then(() => browser.click(search.refinementBarNewArrival))
                    .then(() => browser.waitForExist(search.refinementBarNewArrivalActive))
                    .then(() => browser.click(search.newArrivalRefinementUnchecked))
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => browser.click(search.buttonClose))
                    .then(() => common.waitUntilPageLoaded())
                    .then(() => browser.click(search.customSelect))
                    .then(() => browser.click(search.sortOrderProductAtoZ))
                    // need this pause since wait for other condition not working
                    .then(() => browser.pause(2000));
            }
            // access desktop/laptop
            return browser.click(search.blueColorRefinementSelector)
                .then(() => common.waitUntilAjaxCallEnded())
                .then(() => browser.click(search.priceRefinementBrowser))
                .then(() => common.waitUntilAjaxCallEnded())
                .then(() => browser.click(search.newArrivalRefinementUnchecked))
                .then(() => common.waitUntilAjaxCallEnded())
                .then(() => browser.click(search.customSelect))
                .then(() => browser.click(search.sortOrderProductAtoZ))
                // need this pause since wait for other condition not working
                .then(() => browser.pause(2000));
        })
    );

    it('#1 should return 1 results for pants when refine by Color, Price and New Arrival', () => {
        const searchResultMsg2 = Resource.msgf('label.resultsfor', 'search', null, '1');
        const expectedString2 = searchResultMsg2 + ' ' + productGeneral[locale];
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                if (isTrue) {
                    // access mobile devices
                    return verifySearchResults(search.searchResultCount, expectedString2);
                }
                // access desktop/laptop
                return verifySearchResults(search.searchResult, expectedString2);
            });
    });

    it('#2 should return the correct names of the products when refined by Color, Price and New Arrival', () => {
        return productTile.getProductTileProductName(product2ID)
            .then(productName => {
                return assert.equal(productName, expectedDisplayName2, 'Expected: displayed product name = ' + expectedDisplayName2);
            });
    });

    it('#3 should return the correct images when refined by Color, Price and New Arrival', () => {
        const product1ImageSrc = 'images/medium/B0274206_GYX_0.jpg';
        return productTile.getProductTileImageSrc(product2ID)
            .then(imageSrc => {
                return assert.isTrue(imageSrc.endsWith(product1ImageSrc),
                    'product image is not end with ' + product1ImageSrc);
            });
    });

    it('#4 should return the correct href links when refined by Color, Price and New Arrival', () => {
        const expectedLink1 = common.convertToUrlFormat(expectedDisplayName2) + '/' + product2ID + '.html?lang=' + localeStr;
        return productTile.getProductTileImageHref(product2ID)
            .then(imageLink1 => {
                return assert.isTrue(imageLink1.endsWith(expectedLink1), 'Expected image link not end with ' + expectedLink1);
            });
    });


    it('#5 should return the correct color swatch count when refined by Color, Price and New Arrival', () => {
        return productTile.getProductTileColorSwatchCount(product2ID)
            .then(count => {
                return assert.equal(count, 1, 'Expected: the number of color swatch to be 1.');
            });
    });

    it('#6 should return 79 results for pants when reset button is clicked', () => {
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                if (isTrue) {
                    // access mobile devices
                    return browser.click(search.filterButton)
                        .then(() => browser.waitForExist(search.buttonClose))
                        .then(() => browser.click(search.resetButton))
                        // need this pause since wait for other condition not working
                        .then(() => browser.pause(2000))
                        .then(() => verifySearchResults(search.searchResultCount, expectedString));
                }
                // access desktop/laptop
                return browser.click(search.resetButton)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => verifySearchResults(search.searchResult, expectedString));
            });
    });
});

