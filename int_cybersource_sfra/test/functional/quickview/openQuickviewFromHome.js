'use strict';

import { assert } from 'chai';
import { config } from '../webdriver/wdio.conf';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as quickView from '../../mocks/testDataMgr/pageObjects/quickView';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as common from '../../mocks/testDataMgr/helpers/common';
import * as productTile from '../../mocks/testDataMgr/pageObjects/productTile';

/*
Verify Quickview can be opened and closed from Home Page.
 */

describe('Home product tile - Open Quickview', () => {
    const locale = config.locale;
    const productMasterId2 = '25697682';
    const productVariantId2 = '701644391737';
    const productMasterId4 = '25519318';

    // This flag is to indicate whether Quickview is expected to be present.
    // Currently it is only available on desktop and tablet-landscape.
    let isQuickViewExpected = false;

    before(() => {
        return homePage.navigateTo()
            .then(() => common.isQuickViewExpected())
            .then(expectedFlag => {
                isQuickViewExpected = expectedFlag;
            })
            .then(() => {
                if (isQuickViewExpected) {
                    return testDataMgr.load();
                }
                return Promise.resolve();
            });
    });

    it('Open Quickview - variant', () => {
        if (!isQuickViewExpected) {
            return Promise.resolve();
        }

        const productMaster = testDataMgr.getProductById(productMasterId2);
        const expectedDisplayName = productMaster.getLocalizedProperty('displayName', locale);

        const productVariant = testDataMgr.getProductById(productVariantId2);
        const expectedColor = productVariant.customAttributes.color;
        const expectedSize = productVariant.customAttributes.size;

        const expectedListedPrice = testDataMgr.getPricesByProductId(productVariantId2, locale).list;
        const expectedActiveImgSrc1 = 'images/large/PG.10256582.JJI15XX.PZ.jpg';
        const expectedActiveImgSrc2 = 'images/large/PG.10256582.JJI15XX.BZ.jpg';

        return productTile.clickOnProductTileQuickView(productVariantId2)
            .then(() => quickView.getProductName())
            .then(prodName => {
                return assert.equal(prodName, expectedDisplayName, 'Expected: product name = ' + expectedDisplayName);
            })
            .then(() => quickView.getSelectedSwatchColor())
            .then(selectedColor => {
                return assert.equal(selectedColor, expectedColor, 'Expected: selected color = ' + expectedColor);
            })
            .then(() => quickView.getSelectedSizeDataAttrValue())
            .then(selectedSize => {
                return assert.equal(selectedSize, expectedSize, 'Expected: selected size = ' + expectedSize);
            })
            .then(() => quickView.getSelectedQuantity())
            .then(quantity => {
                return assert.equal(quantity, 1, 'Expected: selected size = 1');
            })
            .then(() => quickView.getPrice())
            .then(price => {
                return assert.equal(price, expectedListedPrice, 'Expected: selected size = ' + expectedListedPrice);
            })
            .then(() => quickView.getActiveImageSrc())
            .then(activeImgSrc => {
                const assertMsg = 'actual variant active image 1 src = ' + activeImgSrc + ', expected variant active image 1 src end with = ' + expectedActiveImgSrc1;
                return assert.isTrue(activeImgSrc.endsWith(expectedActiveImgSrc1), assertMsg);
            })
            .then(() => quickView.clickOnNextImageIcon())
            .then(() => quickView.getActiveImageSrc())
            .then(activeImgSrc2 => {
                const assertMsg = 'actual variant active image 2 src = ' + activeImgSrc2 + ', expected variant active image 2 src end with = ' + expectedActiveImgSrc2;
                return assert.isTrue(activeImgSrc2.endsWith(expectedActiveImgSrc2), assertMsg);
            })
            .then(() => browser.isEnabled(quickView.ADD_TO_CART))
            .then(enabled => {
                return assert.equal(enabled, true, 'Expected: Add-to-cart button to be enabled.');
            })
            .then(() => quickView.closeQuickview())
            .then(() => browser.isVisible(quickView.QUICK_VIEW_DIALOG))
            .then(qwVisible => {
                return assert.isFalse(qwVisible, 'Expected: Quickview dialog to be NOT visible.');
            });
    });

    it('Open Quickview - master', () => {
        if (!isQuickViewExpected) {
            return Promise.resolve();
        }

        const productMaster = testDataMgr.getProductById(productMasterId4);
        const expectedDisplayName = productMaster.getLocalizedProperty('displayName', locale);

        const expectedListedPrice = testDataMgr.getPricesByProductId(productMasterId4, locale).list;
        const expectedActiveImgSrc1 = '/images/large/PG.10221714.JJ169XX.PZ.jpg';
        const expectedActiveImgSrc2 = '/images/large/PG.10221714.JJ169XX.BZ.jpg';

        return browser.refresh()
            .then(() => productTile.clickOnProductTileQuickView(productMasterId4))
            .then(() => quickView.getProductName())
            .then(prodName => {
                return assert.equal(prodName, expectedDisplayName, 'Expected: product name = ' + expectedDisplayName);
            })
            .then(() => browser.isVisible(quickView.SELECTED_SWATCH_COLOR))
            .then(colorSelected => {
                return assert.isFalse(colorSelected, 'Expected: no color selected for master product.');
            })
            .then(() => browser.isExisting(quickView.SELECTED_SIZE))
            .then(sizeSelected => {
                return assert.isFalse(sizeSelected, 'Expected: Size not selected.');
            })
            .then(() => quickView.getSelectedQuantity())
            .then(quantity => {
                return assert.equal(quantity, 1, 'Expected: selected size = 1');
            })
            .then(() => quickView.getPrice())
            .then(price => {
                return assert.equal(price, expectedListedPrice, 'Expected: selected size = ' + expectedListedPrice);
            })
            .then(() => quickView.getActiveImageSrc())
            .then(activeImgSrc => {
                const assertMsg = 'actual master active image 1 src = ' + activeImgSrc + ', expected master active image 1 src end with = ' + expectedActiveImgSrc1;
                return assert.isTrue(activeImgSrc.endsWith(expectedActiveImgSrc1), assertMsg);
            })
            .then(() => quickView.clickOnNextImageIcon())
            .then(() => quickView.getActiveImageSrc())
            .then(activeImgSrc2 => {
                const assertMsg = 'actual master active image 2 src = ' + activeImgSrc2 + ', expected master active image 2 src end with = ' + expectedActiveImgSrc2;
                return assert.isTrue(activeImgSrc2.endsWith(expectedActiveImgSrc2), assertMsg);
            })
            .then(() => browser.isEnabled(quickView.ADD_TO_CART))
            .then(enabled => {
                return assert.equal(enabled, false, 'Expected: Add-to-cart button to be disabled.');
            })
            .then(() => quickView.closeQuickview());
    });
});
