'use strict';

import { assert } from 'chai';
import * as homePage from '../../../mocks/testDataMgr/pageObjects/home';
import * as footer from '../../../mocks/testDataMgr/pageObjects/footer';
import * as common from '../../../mocks/testDataMgr/helpers/common';
import * as search from '../../../mocks/testDataMgr/pageObjects/searchResult';
import * as productDetails from '../../../mocks/testDataMgr/pageObjects/productDetail';
import url from 'url';

describe('Top Level category navigation', () => {
    let sparams;
    const newArrivalLink = 'new%20arrivals/';
    const womenLink = 'womens/';
    const menLink = 'mens/';
    const electronicLink = 'electronics/';
    const topSellersLink = 'top-sellers';

    beforeEach(() => homePage.navigateTo()
        .then(() => browser.waitForExist(search.searchForm))
    );

    function verifyURL(currentURL, expectedValue) {
        const parseUrl = url.parse(currentURL.value);
        return assert.isTrue(parseUrl.pathname.endsWith(expectedValue));
    }

    function verifyTopSellersURL() {
        common.getSearchParams()
            .then(params => {
                sparams = params;
                return assert.equal(sparams.srule, topSellersLink);
            });
    }
    it('#1 Navigate to NewArrivals', () => {
        return browser.isVisible(homePage.navBarButton)
            .then((isVisible) => {
                //  Access mobile devices
                if (isVisible) {
                    return browser.click(homePage.navBarButton)
                        .then(() => browser.waitForVisible(homePage.closeButton))
                        .then(() => browser.click(homePage.navNewArrivalsButton))
                        .then(() => browser.waitForVisible(homePage.backButton))
                        .then(() => browser.click(homePage.navNewArrivalNewArrivalButton))
                        .then(() => browser.waitForExist(homePage.dropdownMenu, true))
                        .then(() => browser.url())
                        .then(currentUrl => verifyURL(currentUrl, newArrivalLink));
                }
                //  Access desktop or laptop browsers
                return browser.waitForVisible(footer.FOOTER_CONTAINER)
                    .click(homePage.navNewArrival)
                    .waitForVisible(common.PRIMARY_CONTENT)
                    .url()
                    .then(currentUrl => verifyURL(currentUrl, newArrivalLink))
                    .then(() => common.waitUntilPageLoaded());
            });
    });

    it('#2 Navigate to Womens', () => {
        return browser.isVisible(homePage.navBarButton)
            .then((isVisible) => {
                //  Access mobile devices
                if (isVisible) {
                    return browser.click(homePage.navBarButton)
                        .then(() => browser.waitForVisible(homePage.closeButton))
                        .then(() => browser.click(homePage.navWomenButton))
                        .then(() => browser.waitForVisible(homePage.backButton))
                        .then(() => browser.click(homePage.navWomenWomenButton))
                        .then(() => browser.waitForExist(homePage.dropdownMenu, true))
                        .then(() => browser.url())
                        .then(currentUrl => verifyURL(currentUrl, womenLink))
                        .then(() => common.waitUntilPageLoaded());
                }
                //  Access desktop or laptop browsers
                return browser.waitForVisible(footer.FOOTER_CONTAINER)
                    .click(homePage.navWomen)
                    .waitForVisible(common.PRIMARY_CONTENT)
                    .url()
                    .then(currentUrl => verifyURL(currentUrl, womenLink));
            });
    });

    it('#3 Navigate to Mens', () => {
        return browser.isVisible(homePage.navBarButton)
            .then((isVisible) => {
                //  Access mobile devices
                if (isVisible) {
                    return browser.click(homePage.navBarButton)
                        .then(() => browser.waitForVisible(homePage.closeButton))
                        .then(() => browser.click(homePage.navMenButton))
                        .then(() => browser.waitForVisible(homePage.backButton))
                        .then(() => browser.click(homePage.navMenMenButton))
                        .then(() => browser.waitForExist(homePage.dropdownMenu, true))
                        .then(() => browser.url())
                        .then(currentUrl => verifyURL(currentUrl, menLink))
                        .then(() => common.waitUntilPageLoaded());
                }
                //  Access desktop or laptop browsers
                return browser.waitForVisible(footer.FOOTER_CONTAINER)
                    .click(homePage.navMen)
                    .waitForVisible(common.PRIMARY_CONTENT)
                    .url()
                    .then(currentUrl => verifyURL(currentUrl, menLink));
            });
    });

    it('#4 Navigate to Electronics', () => {
        return browser.isVisible(homePage.navBarButton)
            .then((isVisible) => {
                if (isVisible) {
                    return browser.click(homePage.navBarButton)
                        .then(() => browser.waitForVisible(homePage.closeButton))
                        .then(() => browser.click(homePage.navElectronicsButton))
                        .then(() => browser.waitForVisible(homePage.backButton))
                        .then(() => browser.click(homePage.navElectronicsElectronicsButton))
                        .then(() => browser.waitForExist(homePage.dropdownMenu, true))
                        .then(() => browser.url())
                        .then(currentUrl => verifyURL(currentUrl, electronicLink))
                        .then(() => common.waitUntilPageLoaded());
                }
                //  Access desktop or laptop browsers
                return browser.waitForVisible(footer.FOOTER_CONTAINER)
                    .click(homePage.navElectronics)
                    .waitForVisible(common.PRIMARY_CONTENT)
                    .url()
                    .then(currentUrl => verifyURL(currentUrl, electronicLink));
            });
    });

    it('#5 Navigate to Top Sellers', () => {
        return browser.isVisible(homePage.navBarButton)
            .then((isVisible) => {
                //  Access mobile devices
                if (isVisible) {
                    return browser.click(homePage.navBarButton)
                        .then(() => browser.waitForVisible(homePage.closeButton))
                        .then(() => browser.click(homePage.navTopSellerButton))
                        .then(() => browser.waitForVisible(productDetails.PRODUCT_GRID))
                        .then(() => verifyTopSellersURL())
                        .then(() => common.waitUntilPageLoaded());
                }
                //  Access desktop or laptop browsers
                return browser.waitForVisible(footer.FOOTER_CONTAINER)
                    .click(homePage.navTopSeller)
                    .waitForVisible(common.PRIMARY_CONTENT)
                    .then(() => verifyTopSellersURL());
            });
    });
});
