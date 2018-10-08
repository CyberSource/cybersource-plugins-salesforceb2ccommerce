'use strict';

/**
Category Refinement on General Product
- Navigate to Women->Clothing->Tops
- Verify 275 results returned and the page title says Tops
- refine by color Red
- Verify 12 results returned
- refine by new arrivals, Verify 6 results returned
- refine by size  XS, verify returned 46 results
- refine by price $50-$99.99, verify returned by 172 results
 */

import { assert } from 'chai';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as keyboard from '../../mocks/testDataMgr/helpers/keyboard';
import * as common from '../../mocks/testDataMgr/helpers/common';
import * as search from '../../mocks/testDataMgr/pageObjects/searchResult';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as Resource from '../../mocks/dw/web/Resource';

describe('Category Navigation and single Refinement - General Product', () => {
    const topTitle = '.page-title';
    const searchResultMsg = Resource.msgf('label.results', 'search', null, '275');
    const expectedString = searchResultMsg;

    function verifySearchResults(selector, expectedResults) {
        return browser.getText(selector)
            .then(displayText => assert.equal(displayText, expectedResults));
    }
    before(() => testDataMgr.load()
        .then(() => homePage.navigateTo())
        .then(() => browser.waitForExist(search.searchForm))
        .then(() => browser.isVisible(homePage.navBarButton))
        .then((isVisible) => {
            if (isVisible) {
                //  Access mobile devices
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
                    .then(title => assert.equal(title, 'Tops'));
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
                .then(title => assert.equal(title, 'Tops'));
        })
    );

    beforeEach(() => browser.refresh()
        .then(() => common.waitUntilPageLoaded())
        // I need this pause since wait for other condition has failed
        .then(() => browser.pause(2000)));

    it('#1 should return 275 Results when Navigate to Women->Clothing->Tops', () => {
        return verifySearchResults(search.searchResult, expectedString);
    });


    it('#2 should return 12 results for color refinements=red', () => {
        const searchResultMsg2 = Resource.msgf('label.results', 'search', null, '12');
        return browser.isVisible(search.filterButton)
            .then((isVisible) => {
                if (isVisible) {
                    return browser.click(search.filterButton)
                        .then(() => browser.waitForExist(search.refinementBarColor))
                        .then(() => browser.click(search.refinementBarColor))
                        .then(() => browser.waitForExist(search.refinementBarColorActive))
                        .then(() => browser.click(search.redColorRefinementSelector))
                        .then(() => browser.pause(2000))
                        .then(() => browser.getText(search.searchResult))
                        .then(displayText => assert.equal(displayText, searchResultMsg2));
                }
                // access desktop or laptop browser
                return browser.click(search.redColorRefinementSelector)
                    .then(() => browser.waitForExist(search.redColorRefinementSelectorChecked))
                    .then(() => browser.getText(search.searchResult))
                    .then(displayText => assert.equal(displayText, searchResultMsg2))
                    .then(() => common.waitUntilPageLoaded());
            });
    });

    it('#3 should return 172 results when select price refinements $50-$99.00', () => {
        const searchResultMsg2 = Resource.msgf('label.results', 'search', null, '172');
        return browser.isVisible(search.filterButton)
            .then((isVisible) => {
                if (isVisible) {
                    return browser.click(search.filterButton)
                        .then(() => browser.waitForExist(search.refinementBarPrice))
                        .then(() => browser.click(search.refinementBarPrice))
                        .then(() => browser.waitForExist(search.refinementBarPriceActive))
                        .then(() => browser.click(search.price3RefinementAppium))
                        .then(() => browser.pause(2000))
                        .then(() => browser.getText(search.searchResult))
                        .then(displayText => assert.equal(displayText, searchResultMsg2));
                }
                // access desktop or laptop browser
                return browser.click(search.price3RefinementBrowser)
                    .then(() => browser.pause(2500))
                    .then(() => browser.getAttribute(search.price3RefinementTitleBrowser, 'title'))
                    .then(title => assert.equal(title, 'Currently Refined by Price: $50 - $99.99'))
                    .then(() => browser.waitForExist(search.pdpMain))
                    .then(() => browser.getText(search.searchResult))
                    .then(displayText => assert.equal(displayText, searchResultMsg2))
                    .then(() => common.waitUntilPageLoaded());
            });
    });

    it('#4 should return 6 results when check New Arrival refinement', () => {
        const searchResultMsg2 = Resource.msgf('label.results', 'search', null, '6');
        return browser.isVisible(search.filterButton)
            .then((isTrue) => {
                if (isTrue) {
                    return browser.click(search.filterButton)
                        .then(() => browser.waitForExist(search.refinementBarNewArrival))
                        .then(() => browser.click(search.refinementBarNewArrival))
                        .then(() => browser.waitForExist(search.refinementBarNewArrivalActive))
                        .then(() => browser.click(search.newArrivalRefinementUnchecked))
                        .then(() => browser.pause(2000))
                        .then(() => browser.waitForExist(search.pdpMain))
                        .then(() => browser.getText(search.searchResult))
                        .then(displayText => assert.equal(displayText, searchResultMsg2));
                }
                // access desktop or laptop browser
                return browser.click(search.newArrivalRefinementUnchecked)
                    .then(() => browser.pause(2000))
                    .then(() => browser.getText(search.searchResult))
                    .then(displayText => assert.equal(displayText, searchResultMsg2))
                    .then(() => common.waitUntilPageLoaded());
            });
    });
});

