'use strict';

import { assert } from 'chai';
import { config } from '../../../webdriver/wdio.conf';
import * as homePage from '../../../../mocks/testDataMgr/pageObjects/home';
import * as productDetailPage from '../../../../mocks/testDataMgr/pageObjects/productDetail';
import * as cartPage from '../../../../mocks/testDataMgr/pageObjects/cart';
import * as checkoutPage from '../../../../mocks/testDataMgr/pageObjects/checkout';
import * as checkoutInterceptPage from '../../../../mocks/testDataMgr/pageObjects/CheckoutLoginIntercept';
import * as orderConfPage from '../../../../mocks/testDataMgr/pageObjects/orderConfirmation.js';
import * as testDataMgr from '../../../../mocks/testDataMgr/main';
import * as common from '../../../../mocks/testDataMgr/helpers/common';
import * as Resource from '../../../../mocks/dw/web/Resource';


/*
Verify the ability to go back and edit shipping address from payment page.
From payment page, edit shipping and do the following:
 - update shipping address a new address, including address line 2
 - submit shipping form
 - verify shipping details on the payment page
 */

describe('Checkout - As Guest - Editing shipping details', () => {
    const locale = config.locale;
    const userEmail = config.userEmail;

    let shippingData = {};
    let shippingData2 = {};
    let paymentData = {};

    const productVariantId1 = '799927757202';
    let productVariant1;

    const groundShipMethodIndex = 0;

    const shipCostMap = {
        'x_default': '$9.99',
        'en_GB': '£7.99',
        'fr_FR': '7,99 €',
        'it_IT': '€ 7,99',
        'ja_JP': '¥ 18',
        'zh_CN': '¥17.99'
    };

    // in before block:
    // - prepare shipping and payment data
    // - add product to cart
    // - navigate to cart
    // - checkout
    // - fill shipping details and submit
    before(() => {
        return testDataMgr.load()
            .then(() => {
                const creditCard = testDataMgr.creditCard1;
                const customer = testDataMgr.getCustomerByLogin(userEmail);

                shippingData = common.createShippingData(customer, locale);
                shippingData2 = common.createShippingDataWithAddress2(locale);
                paymentData = common.createPaymentData(creditCard);

                productVariant1 = testDataMgr.getProductById(productVariantId1);
            })
            .then(() => browser.url(productVariant1.getUrlResourcePath()))
            .then(() => productDetailPage.clickAddToCartButton())
            .then(() => cartPage.navigateTo())
            .then(() => browser.waitForVisible(cartPage.SHIPPING_METHODS))
            .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, groundShipMethodIndex))
            .then(() => browser.waitForVisible(cartPage.BTN_CHECKOUT))
            .then(() => browser.click(cartPage.BTN_CHECKOUT))
            .then(() => browser.waitForVisible(checkoutInterceptPage.BTN_CHECKOUT_AS_GUEST))
            .then(() => browser.click(checkoutInterceptPage.BTN_CHECKOUT_AS_GUEST))
            .then(() => browser.waitForExist(checkoutPage.SHIPPING_ACTIVE_TAB))
            .then(() => checkoutPage.fillOutShippingForm(shippingData, locale))
            .then(() => browser.click(checkoutPage.BTN_NEXT_PAYMENT))
            .then(() => browser.waitForExist(checkoutPage.BTN_NEXT_PLACE_ORDER));
    });

    after(() => {
        return browser.waitForExist(checkoutPage.BTN_NEXT_PLACE_ORDER)
            .then(() => browser.waitForVisible(checkoutPage.PAYMENT_FORM))
            .then(() => checkoutPage.fillOutPaymentForm(paymentData))
            .then(() => browser.click(checkoutPage.BTN_NEXT_PLACE_ORDER))
            .then(() => browser.waitForExist(checkoutPage.BTN_PLACE_ORDER))
            .then(() => browser.waitForVisible(checkoutPage.PAYMENT_SUMMARY))
            .then(() => browser.click(checkoutPage.BTN_PLACE_ORDER))
            .then(() => browser.waitForVisible(orderConfPage.RECEIPT_CONTAINER))
            // in case order submittion failed, clean up the cart
            .then(() => homePage.navigateTo())
            .then(() => cartPage.emptyCart());
    });

    describe('Edit shipping information and set different shipping information', () => {
        it('should be able to edit shipping details', () => {
            return browser.waitForVisible(checkoutPage.BTN_SHIPPING_EDIT)
                .click(checkoutPage.BTN_SHIPPING_EDIT)
                .then(() => browser.waitForVisible(checkoutPage.SHIPPING_ACTIVE_TAB))
                .then(() => browser.getText(checkoutPage.SHIPPING_FORM_TITLE))
                .then((shippingFormTitle) => {
                    const expectedShippingFormTitle = Resource.msgf('heading.checkout.shipping', 'checkout', null);
                    return assert.equal(shippingFormTitle, expectedShippingFormTitle, 'Expected to be back on shipping page with form title = ' + expectedShippingFormTitle);
                });
        });

        it('should update shipping address, include address line 2, shipping method', () => {
            return checkoutPage.fillOutShippingForm(shippingData2, locale)
                .then(() => browser.click(checkoutPage.SHIPPING_METHOD_2DAY_EXPRESS))
                // need this pause because the waitForXXX is not working
                .then(() => browser.pause(500))
                .then(() => browser.click(checkoutPage.BTN_NEXT_PAYMENT))
                .then(() => browser.waitForVisible(checkoutPage.PAYMENT_FORM));
        });
    });

    // Verify shipping details updated
    describe('Summary of shipping information - on Payment page', () => {
        it('should display shipping address label', () => {
            return browser.getText(checkoutPage.SHIPPING_ADDRESS_LABEL)
                .then((shippingAddrLabel) => {
                    const expectedShippingAddrLabel = Resource.msgf('label.order.shipping.address', 'confirmation', null);
                    return assert.equal(shippingAddrLabel, expectedShippingAddrLabel, 'Expected to be have shipping address label = ' + expectedShippingAddrLabel);
                });
        });

        it.skip('should display name', () => {
            return browser.getText(checkoutPage.SHIPPING_ADDR_FIRST_NAME)
                .then((firstName) => {
                    const expectedFirstName = shippingData2[checkoutPage.SHIPPING_FIRST_NAME];
                    return assert.equal(firstName, expectedFirstName, 'Expected shipping first name to be = ' + expectedFirstName);
                })
                .then(() => browser.getText(checkoutPage.SHIPPING_ADDR_LAST_NAME))
                .then((lastName) => {
                    const expectedLastName = shippingData2[checkoutPage.SHIPPING_LAST_NAME];
                    return assert.equal(lastName, expectedLastName, 'Expected shipping last name to be = ' + expectedLastName);
                });
        });

        it.skip('should display street address 1', () => {
            return browser.getText(checkoutPage.SHIPPING_ADDR_ADDRESS1)
                .then((address1) => {
                    const expectedAddress1 = shippingData2[checkoutPage.SHIPPING_ADDRESS_ONE];
                    return assert.equal(address1, expectedAddress1, 'Expected shipping address1 to be = ' + expectedAddress1);
                });
        });

        it.skip('should display street address 2', () => {
            return browser.getText(checkoutPage.SHIPPING_ADDR_ADDRESS2)
                .then((address2) => {
                    const expectedAddress2 = shippingData2[checkoutPage.SHIPPING_ADDRESS_TWO];
                    return assert.equal(address2, expectedAddress2, 'Expected shipping address2 to be = ' + expectedAddress2);
                });
        });

        it.skip('should display city name', () => {
            return browser.getText(checkoutPage.SHIPPING_ADDR_CITY)
                .then((city) => {
                    const expectedCity = shippingData2[checkoutPage.SHIPPING_ADDRESS_CITY];
                    return assert.equal(city, expectedCity, 'Expected shipping city to be = ' + expectedCity);
                });
        });

        it('should display state code', () => {
            if (locale && locale === 'x_default') {
                return browser.getText(checkoutPage.SHIPPING_ADDR_STATE_CODE)
                    .then((stateCode) => {
                        const expectedStateCode = shippingData2[checkoutPage.SHIPPING_STATE];
                        return assert.equal(stateCode, expectedStateCode, 'Expected shipping state code to be = ' + expectedStateCode);
                    });
            }
            return Promise.resolve();
        });

        it.skip('should display postal code', () => {
            return browser.getText(checkoutPage.SHIPPING_ADDR_POSTAL_CODE)
                .then((zipCode) => {
                    const expectedZipCode = shippingData2[checkoutPage.SHIPPING_ZIP_CODE];
                    return assert.equal(zipCode, expectedZipCode, 'Expected shipping zip code to be = ' + expectedZipCode);
                });
        });

        it.skip('should display phone', () => {
            return browser.getText(checkoutPage.SHIPPING_ADDR_SHIPPING_PHONE)
                .then((phone) => {
                    const expectedPhone = shippingData2[checkoutPage.SHIPPING_PHONE_NUMBER];
                    return assert.equal(phone, expectedPhone, 'Expected shipping phone to be = ' + expectedPhone);
                });
        });

        it('should display method label', () => {
            return browser.getText(checkoutPage.SHIPPING_METHOD_LABEL)
                .then((shipMethodLabel) => {
                    const expectedShipMethodLabel = Resource.msgf('label.order.shipping.method', 'confirmation', null);
                    return assert.equal(shipMethodLabel, expectedShipMethodLabel, 'Expected shipping method label = ' + expectedShipMethodLabel);
                });
        });

        it('should display method title', () => {
            return browser.getText(checkoutPage.SHIPPING_METHOD_TITLE)
                .then((shipMethodName) => {
                    const expectedShipMethodName = '2-Day Express';
                    return assert.equal(shipMethodName, expectedShipMethodName, 'Expected shipping method name = ' + expectedShipMethodName);
                });
        });

        it('should display method arrival time', () => {
            return browser.getText(checkoutPage.SHIPPING_METHOD_ARRIVAL_TIME)
                .then((shipMethodArrivalTime) => {
                    const expectedShipMethodArrivalTime = '( 2 Business Days )';
                    return assert.equal(shipMethodArrivalTime, expectedShipMethodArrivalTime, 'Expected shipping method arrival time = ' + expectedShipMethodArrivalTime);
                });
        });

        it('should display method price', () => {
            return browser.getText(checkoutPage.SHIPPING_METHOD_PRICE)
                .then((shipMethodPrice) => {
                    const expectedShipMethodPrice = shipCostMap[locale];
                    return assert.equal(shipMethodPrice, expectedShipMethodPrice, 'Expected shipping method price = ' + expectedShipMethodPrice);
                });
        });
    });
});
