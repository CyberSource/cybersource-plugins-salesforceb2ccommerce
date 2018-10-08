'use strict';

/*
Type in a keyword 'tops' in the query box
verify the expected search suggestions.
 */
import { assert } from 'chai';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as search from '../../mocks/testDataMgr/pageObjects/searchResult';
import * as common from '../../mocks/testDataMgr/helpers/common';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import { config } from '../webdriver/wdio.conf';

describe('search as you type', () => {
    const locale = config.locale;
    const localeStr = locale === 'x_default' ? 'en_US' : locale;
    const queryString = 'tops';
    const productName1 = 'Cowl Neck Top';
    const productName2 = 'Cowl Neck Top';
    const productName3 = 'Printed Two-Tops-In-One';
    const pid1 = '25593215';
    const pid2 = '25593188';
    const pid3 = '25565121';

    before(() => testDataMgr.load()
        .then(() => homePage.navigateTo())
        .then(() => browser.waitForExist(search.searchForm))
        .then(() => common.getVisibleSelector(search.searchQuerySelector1, search.searchQuerySelector2))
        .then(mySelector => browser.setValue(mySelector, queryString))
        .then(() => browser.waitForExist(search.suggestionsContainer))
    );

    it('should return correct search suggestion Header', () => {
        return browser.elements(search.suggestionsHeader)
            .then(headerElements => {
                return browser.elementIdText(headerElements.value[0].ELEMENT)
                    .then(ele => assert.equal(ele.value, 'Do you mean?'))
                    .then(() => browser.elementIdText(headerElements.value[1].ELEMENT))
                    .then(ele => assert.equal(ele.value, 'Products'))
                    .then(() => browser.elementIdText(headerElements.value[2].ELEMENT))
                    .then(ele => assert.equal(ele.value, 'Categories'))
                    .then(() => browser.elementIdText(headerElements.value[3].ELEMENT))
                    .then(ele => assert.equal(ele.value, 'Content'));
            });
    });

    it.skip('should return correct search suggestion items links', () => {
        return browser.elements(search.suggestionsHref)
            .then(itemElements => {
                return browser.elementIdAttribute(itemElements.value[0].ELEMENT, 'href')
                    .then(nameLink => {
                        const expectedLink = common.convertToUrlFormat(productName1) + '/' + pid1 + '.html?lang=' + localeStr;
                        assert.isTrue(nameLink.value.endsWith(expectedLink), 'Expected: product name link = ' + expectedLink);
                    })
                    .then(() => browser.elementIdAttribute(itemElements.value[1].ELEMENT, 'href'))
                    .then(nameLink => {
                        const expectedLink = common.convertToUrlFormat(productName2) + '/' + pid2 + '.html?lang=' + localeStr;
                        assert.isTrue(nameLink.value.endsWith(expectedLink), 'Expected: product name link = ' + expectedLink);
                    })
                    .then(() => browser.elementIdAttribute(itemElements.value[2].ELEMENT, 'href'))
                    .then(nameLink => {
                        const expectedLink = common.convertToUrlFormat(productName3) + '/' + pid3 + '.html?lang=' + localeStr;
                        assert.isTrue(nameLink.value.endsWith(expectedLink), 'Expected: product name link = ' + expectedLink);
                    });
            });
    });

    it.skip('should return correct search suggestion image links', () => {
        return browser.elements(search.suggestionsSrc)
            .then(itemElements => {
                return browser.elementIdAttribute(itemElements.value[0].ELEMENT, 'src')
                    .then(src => {
                        assert.isTrue(src.value.endsWith('images/medium/PG.10236638.JJ6TOXX.PZ.jpg'),
                            'Products Header first product image does not end with images/medium/PG.10236638.JJ6TOXX.PZ.jpg.');
                    })
                    .then(() => browser.elementIdAttribute(itemElements.value[1].ELEMENT, 'src'))
                    .then(src => {
                        assert.isTrue(src.value.endsWith('images/medium/PG.10235422.JJT02XX.PZ.jpg'),
                            'Products Header second product image url does not end with images/medium/PG.10235422.JJT02XX.PZ.jpg');
                    })
                    .then(() => browser.elementIdAttribute(itemElements.value[2].ELEMENT, 'src'))
                    .then(src => {
                        assert.isTrue(src.value.endsWith('images/medium/PG.10235350.JJ0CZXX.PZ.jpg'),
                            'Products Header third product image url does not end with images/medium/PG.10235350.JJ0CZXX.PZ.jpg');
                    });
            });
    });
});
