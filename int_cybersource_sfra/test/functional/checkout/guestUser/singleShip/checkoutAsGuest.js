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
 Verify checkout flow for Guest user with same billing and shipping address
 */

describe('Checkout - As Guest, same Billing and Shipping address ', () => {
    const locale = config.locale;
    const userEmail = config.userEmail;

    let shippingData = {};
    let paymentData = {};

    const productVariantId1 = '708141677203';
    let productVariant1;

    const prodIdUnitPricesMap = {};

    const groundShipMethodIndex = 0;

    // in before block:
    // - prepare shipping and payment data
    // - add product to cart
    // - navigate to cart
    before(() => {
        return testDataMgr.load()
            .then(() => {
                const creditCard = testDataMgr.creditCard1;
                const customer = testDataMgr.getCustomerByLogin(userEmail);

                shippingData = common.createShippingData(customer, locale);
                paymentData = common.createPaymentData(creditCard);

                prodIdUnitPricesMap[productVariantId1] = testDataMgr.getPricesByProductId(productVariantId1, locale);

                productVariant1 = testDataMgr.getProductById(productVariantId1);
            })
            .then(() => browser.url(productVariant1.getUrlResourcePath()))
            .then(() => productDetailPage.clickAddToCartButton())
            .then(() => cartPage.navigateTo())
            .then(() => browser.waitForVisible(cartPage.SHIPPING_METHODS))
            .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, groundShipMethodIndex));
    });

    // in case checkout process failed half way, we need to clean up cart
    after(() => homePage.navigateTo()
        .then(() => cartPage.emptyCart())
    );

    it('Should be able to checkout from cart.', function () {
        return browser.click(cartPage.BTN_CHECKOUT)
            .then(() => browser.waitForVisible(checkoutInterceptPage.BTN_CHECKOUT_AS_GUEST))
            .then(() => browser.getText(checkoutPage.PAGE_TITLE))
            .then((pageTitle) => {
                const defaultTitle = 'Checkout';
                const expectedPageTitle = Resource.msgf('title.checkout', 'checkout', null, defaultTitle);
                return assert.equal(pageTitle, expectedPageTitle, 'Expected to be on checkout page with page title = ' + expectedPageTitle);
            });
    });

    it('Should be on checkout login intercept page with ability to checkout as guest.', function () {
        return browser.click(checkoutInterceptPage.BTN_CHECKOUT_AS_GUEST)
            .then(() => browser.waitForVisible(checkoutPage.SHIPPING_ACTIVE_TAB))
            .then(() => browser.getText(checkoutPage.SHIPPING_ACTIVE_TAB))
            .then((activeTabTitle) => {
                const defaultTabTitle = 'Shipping';
                const expectedActiveTabTitle = Resource.msgf('action.shipping.form', 'checkout', null, defaultTabTitle);
                return assert.equal(activeTabTitle, expectedActiveTabTitle, 'Expected to be on checkout page with active tab title = ' + expectedActiveTabTitle);
            });
    });

    // Fill in Shipping Form
    it('should be able to fill required fields in Shipping form.', () =>
        checkoutPage.fillOutShippingForm(shippingData, locale)
            .then(() => browser.isEnabled(checkoutPage.BTN_NEXT_PAYMENT))
            .then(btnEnabled => assert.ok(btnEnabled))
    );

    it('should direct to the Payment page after Shipping page has been submitted', () =>
        browser.click(checkoutPage.BTN_NEXT_PAYMENT)
            .waitForExist(checkoutPage.BTN_NEXT_PLACE_ORDER)
            .waitForVisible(checkoutPage.PAYMENT_FORM)
    );

    // Fill in Billing Form
    it('should be able to fill required fields in Payment Form.', () =>
        checkoutPage.fillOutPaymentForm(paymentData)
            .then(() => browser.isEnabled(checkoutPage.BTN_NEXT_PLACE_ORDER))
            .then(enabled => assert.ok(enabled))
    );

    it('should direct to the Place Order page after Payment page has been submitted', () =>
        browser.click(checkoutPage.BTN_NEXT_PLACE_ORDER)
            .then(() => browser.waitForExist(checkoutPage.BTN_PLACE_ORDER))
            .then(() => browser.waitForVisible(checkoutPage.PAYMENT_SUMMARY))
            .then(() => browser.isEnabled(checkoutPage.BTN_PLACE_ORDER))
            .then(enabled => assert.ok(enabled))
    );

    // placing order
    it('should redirect to a thank you page after a successful order submission', () => {
        return browser.click(checkoutPage.BTN_PLACE_ORDER)
            .waitForVisible(orderConfPage.RECEIPT_CONTAINER)
            .then(() => browser.getText(orderConfPage.PAGE_TITLE))
            .then((pageTitle) => {
                const defaultTitle = 'Thank You';
                const expectedPageTitle = Resource.msgf('title.thank.you.page', 'confirmation', null, defaultTitle);
                return assert.equal(pageTitle, expectedPageTitle, 'Expected to be on order confirmation page with page title = ' + expectedPageTitle);
            });
    });
});

