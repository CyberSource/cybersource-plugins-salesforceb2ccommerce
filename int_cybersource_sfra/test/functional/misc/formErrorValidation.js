'use strict';

/**
 * Navigate to Home->login->Create Account page
 * without providing any data, create account should error out
 */

import { assert } from 'chai';
import * as loginPage from '../../mocks/testDataMgr/pageObjects/login';
import * as homePage from '../../mocks/testDataMgr/pageObjects/home';

describe('Login Page Create Account Form', () => {
    before(() => homePage.navigateTo());

    it('Validate that client side returned expected error when required fields are not filled', () => {
        return browser.isVisible(homePage.navBarButton)
            .then(isVisible => {
                if (isVisible) {
                    // access mobile devices
                    // This test has been modified due to the appium 1.6.3 bug #7636
                    return browser.click(homePage.navBarButton)
                        .waitForVisible(homePage.navBar)
                        .click(homePage.signInButtonIpad)
                        .pause(3000)
                        .click(loginPage.checkStatusButton)
                        .elements(loginPage.getTrackOrderFormFeedback)
                        .then(elements => {
                            assert.equal(elements.value.length, 3, 'there should be 3 fields to fill');
                            return elements.value.forEach(ele => browser.elementIdText(ele.ELEMENT)
                                .then(msg => assert.isTrue(msg.value.isString, 'expected error return to be value missing')));
                        });
                }
                // access desktop browser
                return browser.click(homePage.signInButton)
                    .click(loginPage.createAccountTab)
                    .click(loginPage.createAccountButton)
                    .elements(loginPage.getRegisterFormFeedback)
                    .then(elements => {
                        assert.equal(elements.value.length, 7, 'there should be 7 fields to fill');
                        return elements.value.forEach(ele => browser.elementIdText(ele.ELEMENT)
                            .then(msg => assert.isTrue(msg.value.isString, 'expected error return to be Please fill out this field.')));
                    });
            });
    });
});
