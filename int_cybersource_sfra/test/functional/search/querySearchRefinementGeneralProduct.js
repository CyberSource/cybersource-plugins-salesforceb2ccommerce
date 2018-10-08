'use strict';

/**
Query Search on General Product then do refinement
- Search for 'pants'
- refine by Color
- refine by Price
- refine by New Arrival
 */

import { assert } from 'chai';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as search from '../../mocks/testDataMgr/pageObjects/searchResult';
import * as common from '../../mocks/testDataMgr/helpers/common';
import { config } from '../webdriver/wdio.conf';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as Resource from '../../mocks/dw/web/Resource';

describe('Query Search and single Refinement - general product', () => {
    const locale = config.locale;
    const productGeneral = {
        x_default: 'pants',
        en_GB: 'trousers',
        fr_FR: 'pantalon',
        it_IT: 'pantaloni',
        jp_JP: 'パンツ',
        zh_CN: '裤子'
    };
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
        .then(() => common.getVisibleSelector(search.searchQuerySelector1, search.searchQuerySelector2))
        .then(mySelector => {
            myQuerySelector = mySelector;
            return browser.setValue(myQuerySelector, productGeneral[locale]);
        })
        .then(() => browser.submitForm(myQuerySelector))
        .then(() => common.waitUntilPageLoaded())
        .then(() => browser.waitForExist(search.pdpMain, 3000))
    );

    beforeEach(() => browser.refresh()
        .then(() => common.waitUntilPageLoaded())
        // I need this pause since wait for other condition has failed
        .then(() => browser.pause(2000)));

    it('#1 should return 79 Results for pants when query search for pants', () => {
        return common.getVisibleSelector(search.searchResultLarge, search.searchResultSmall)
            .then(() => verifySearchResults(search.searchResult, expectedString));
    });

    it('#2 should return 18 results for color refinements=blue', () => {
        const searchResultMsg2 = Resource.msgf('label.resultsfor', 'search', null, '18');
        const expectedString2 = searchResultMsg2 + ' ' + productGeneral[locale];
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                // access mobile devices
                if (isTrue) {
                    return browser.click(search.filterButton)
                        .then(() => browser.waitForExist(search.refinementBarColor))
                        .then(() => browser.click(search.refinementBarColor))
                        .then(() => browser.waitForExist(search.refinementBarColorActive))
                        .then(() => browser.click(search.blueColorRefinementSelector))
                        .then(() => common.waitUntilAjaxCallEnded())
                        .then(() => browser.click(search.buttonClose))
                        .then(() => verifySearchResults(search.searchResult, expectedString2));
                }
                // access desktop/laptop
                return browser.click(search.blueColorRefinementSelector)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => verifySearchResults(search.searchResult, expectedString2));
            });
    });

    it('#3 should return 8 results for pants when select price refinements $50-$99.00', () => {
        const searchResultMsg3 = Resource.msgf('label.resultsfor', 'search', null, '48');
        const expectedString3 = searchResultMsg3 + ' ' + productGeneral[locale];
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                if (isTrue) {
                    // access mobile devices
                    return browser.click(search.filterButton)
                        .then(() => browser.waitForExist(search.refinementBarPrice))
                        .then(() => browser.click(search.refinementBarPrice))
                        .then(() => browser.waitForExist(search.refinementBarPriceActive))
                        .then(() => browser.click(search.priceRefinementAppium))
                        .then(() => common.waitUntilAjaxCallEnded())
                        .then(() => browser.click(search.buttonClose))
                        .then(() => verifySearchResults(search.searchResultCount, expectedString3));
                }
                // access desktop/laptop
                return browser.click(search.priceRefinementBrowser)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => browser.getAttribute(search.priceRefinementTitleBrowser, 'title'))
                    .then(title => assert.equal(title, 'Currently Refined by Price: $50 - $99.99'))
                    .then(() => verifySearchResults(search.searchResult, expectedString3));
            });
    });

    it('#4 should return 8 results for pants when check New Arrival refinement', () => {
        const searchResultMsg4 = Resource.msgf('label.resultsfor', 'search', null, '8');
        const expectedString4 = searchResultMsg4 + ' ' + productGeneral[locale];
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                if (isTrue) {
                    // access mobile devices
                    return browser.click(search.filterButton)
                        .then(() => browser.waitForExist(search.refinementBarNewArrival))
                        .then(() => browser.click(search.refinementBarNewArrival))
                        .then(() => browser.waitForExist(search.refinementBarNewArrivalActive))
                        .then(() => browser.click(search.newArrivalRefinementUnchecked))
                        .then(() => common.waitUntilAjaxCallEnded())
                        .then(() => browser.click(search.buttonClose))
                        .then(() => verifySearchResults(search.searchResultCount, expectedString4));
                }
                // access desktop/laptop
                return browser.click(search.newArrivalRefinementUnchecked)
                    .then(() => common.waitUntilAjaxCallEnded())
                    .then(() => verifySearchResults(search.searchResult, expectedString4));
            });
    });
});
