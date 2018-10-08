'use strict';

import { assert } from 'chai';
import { config } from '../webdriver/wdio.conf';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';
import * as testDataMgr from '../../mocks/testDataMgr/main';

/*
 - Verify product tile swatch selection.
   Selecting a swatch will cause the image to be displayed in the selected color.
 */

// Due to issue reported in RAP-5271, disabling swatch selection tests for now.

describe.skip('Home - Product Tiles Swatch Selection', () => {
    const locale = config.locale;
    const localeStr = locale === 'x_default' ? 'en_US' : locale;

    const productMasterId2 = '25697682';
    const productMasterId4 = '25519318';

    before(() => {
        return testDataMgr.load()
            .then(() => homePage.navigateTo());
    });

    it('Product variant: selecting swatch.', function () {
        const expectEndPoint = '/' + localeStr + '/Product-Show?';
        const expectPidParam = 'pid=' + productMasterId2;
        const expectColorParam = '&dwvar_' + productMasterId2 + '_color=JJAE6A0';
        const expectSizeParam = '&dwvar_' + productMasterId2 + '_size=9LG';

        return homePage.clickProductTileColorSwatch(3, 1)
            .then(() => homePage.getNthProductTileImageSrc(3))
            .then(imageSrc => {
                const expectedImage = '/images/medium/PG.10256582.JJAE6A0.PZ.jpg';
                assert.isTrue(imageSrc.endsWith(expectedImage), 'product image: url not end with ' + expectedImage);
            })

            .then(() => homePage.getNthProductTileImageHref(3))
            .then(imageLink => {
                assert.isTrue(imageLink.includes(expectEndPoint), 'product image: url not contain ' + expectEndPoint);
                assert.isTrue(imageLink.includes(expectPidParam), 'product image: url not contain pid param ' + expectPidParam);
                assert.isTrue(imageLink.includes(expectColorParam), 'product image: url not contain color param ' + expectColorParam);
                assert.isTrue(imageLink.includes(expectSizeParam), 'product image: url not contain size param ' + expectSizeParam);
            })

            .then(() => homePage.getNthProductTileProductNameHref(3))
            .then(nameLink => {
                assert.isTrue(nameLink.includes(expectEndPoint), 'product name: url not contain ' + expectEndPoint);
                assert.isTrue(nameLink.includes(expectPidParam), 'product name: url not contain pid param ' + expectPidParam);
                assert.isTrue(nameLink.includes(expectColorParam), 'product name: url not contain color param ' + expectColorParam);
                assert.isTrue(nameLink.includes(expectSizeParam), 'product name: url not contain size param ' + expectSizeParam);
            });
    });

    it('Product master: selecting swatch.', function () {
        const expectEndPoint = '/' + localeStr + '/Product-Show?';
        const expectPidParam = 'pid=' + productMasterId4;
        const expectColorParam = '&dwvar_' + productMasterId4 + '_color=JJ8UTXX';
        const expectSizeParam = '&dwvar_' + productMasterId4 + '_size=';

        return homePage.clickProductTileColorSwatch(5, 3)
            .then(() => homePage.getNthProductTileImageSrc(5))
            .then(imageSrc => {
                const expectedImage = '/images/medium/PG.10221714.JJ8UTXX.PZ.jpg';
                assert.isTrue(imageSrc.endsWith(expectedImage), 'product image: url not end with ' + expectedImage);
            })

            .then(() => homePage.getNthProductTileImageHref(5))
            .then(imageLink => {
                assert.isTrue(imageLink.includes(expectEndPoint), 'product image: url not contain ' + expectEndPoint);
                assert.isTrue(imageLink.includes(expectPidParam), 'product image: url not contain pid param ' + expectPidParam);
                assert.isTrue(imageLink.includes(expectColorParam), 'product image: url not contain color param ' + expectColorParam);
                assert.isFalse(imageLink.includes(expectSizeParam), 'product image: url contain size param ' + expectSizeParam);
            })

            .then(() => homePage.getNthProductTileProductNameHref(5))
            .then(nameLink => {
                assert.isTrue(nameLink.includes(expectEndPoint), 'product name: url not contain ' + expectEndPoint);
                assert.isTrue(nameLink.includes(expectPidParam), 'product name: url not contain pid param ' + expectPidParam);
                assert.isTrue(nameLink.includes(expectColorParam), 'product name: url not contain color param ' + expectColorParam);
                assert.isFalse(nameLink.includes(expectSizeParam), 'product name: url contain size param ' + expectSizeParam);
            })
            .then(() => browser.pause(5000));
    });
});
