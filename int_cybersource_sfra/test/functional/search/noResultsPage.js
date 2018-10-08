'use strict';

/*
 Query Search on string 'gold fish'
 verify a NoResultsPage is returned
 */

import { assert } from 'chai';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as search from '../../mocks/testDataMgr/pageObjects/searchResult';
import * as common from '../../mocks/testDataMgr/helpers/common';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as Resource from '../../mocks/dw/web/Resource';

describe('Testing a NoResultsPage presented when search for a non-existing product', () => {
    const queryString = 'gold fish';
    const s1 = Resource.msgf('label.noresultsfor', 'search', null);
    const s2 = Resource.msgf('label.searchtips', 'search', null);
    const s3 = Resource.msgf('label.searchtip1', 'search', null);
    const s4 = Resource.msgf('label.searchtip2', 'search', null);
    const s5 = Resource.msgf('label.searchtip3', 'search', null);

    before(() => testDataMgr.load()
        .then(() => homePage.navigateTo())
        .then(() => browser.waitForExist(search.searchForm))
    );

    it('should return noResultsPage when search for "gold fish" ', () => {
        let myQuerySelector;
        return common.getVisibleSelector(search.searchQuerySelector1, search.searchQuerySelector2)
            .then(mySelector => {
                myQuerySelector = mySelector;
                return browser.setValue(myQuerySelector, queryString);
            })
            .then(() => browser.submitForm(myQuerySelector))
            .then(() => browser.waitForExist(search.pdpMain))
            .then(() => browser.getText(search.searchResult))
            .then(displayText => assert.equal(displayText, [s1 + ' ' + queryString, s2, s3, s4, s5].join('\n')))
            .then(() => common.waitUntilPageLoaded());
    });
});
