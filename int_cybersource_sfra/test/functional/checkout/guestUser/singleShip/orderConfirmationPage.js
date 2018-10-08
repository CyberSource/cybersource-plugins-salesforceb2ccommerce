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
import * as pricingHelpers from '../../../../mocks/testDataMgr/helpers/pricing';


/*
Verify the order confirmation page having the correct information.
 */

describe.skip('Checkout - Order confirmation page', () => {
    const locale = config.locale;
    const userEmail = config.userEmail;

    let shippingData = {};
    let billingData = {};
    let paymentData = {};

    const productVariantId1 = '701644130756';
    let productVariant1;

    const prodIdUnitPricesMap = {};

    const TwoDayExpressShipMethodIndex = 1;

    const shipCostMap = {
        'x_default': '$11.99',
        'en_GB': '£9.99',
        'fr_FR': '9,99 €',
        'it_IT': '€ 9,99',
        'ja_JP': '¥ 22',
        'zh_CN': '¥21.99'
    };

    const totalTaxMap = {
        'x_default': '$6.50',
        'en_GB': '£5.64',
        'fr_FR': '5,64 €',
        'it_IT': '€ 5,64',
        'ja_JP': '¥ 14',
        'zh_CN': '¥20.00'
    };

    // in before block:
    // - prepare shipping and payment data
    // - add product to cart
    // - navigate to cart
    // - proceed to checkout
    // - place the order
    before(() => {
        return testDataMgr.load()
            .then(() => {
                const creditCard = testDataMgr.creditCard1;
                const customer = testDataMgr.getCustomerByLogin(userEmail);

                shippingData = common.createShippingData(customer, locale);
                billingData = common.createBillingData(locale);
                paymentData = common.createPaymentData(creditCard);

                prodIdUnitPricesMap[productVariantId1] = testDataMgr.getPricesByProductId(productVariantId1, locale);

                productVariant1 = testDataMgr.getProductById(productVariantId1);
            })
            .then(() => browser.url(productVariant1.getUrlResourcePath()))
            .then(() => productDetailPage.clickAddToCartButton())
            .then(() => cartPage.navigateTo())
            .then(() => browser.waitForVisible(cartPage.SHIPPING_METHODS))
            .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, TwoDayExpressShipMethodIndex))
            .then(() => browser.waitForVisible(cartPage.BTN_CHECKOUT))
            .then(() => browser.waitForEnabled(cartPage.BTN_CHECKOUT))
            .then(() => browser.click(cartPage.BTN_CHECKOUT))
            .then(() => browser.waitForVisible(checkoutInterceptPage.BTN_CHECKOUT_AS_GUEST))
            .then(() => browser.click(checkoutInterceptPage.BTN_CHECKOUT_AS_GUEST))
            .then(() => browser.waitForExist(checkoutPage.SHIPPING_ACTIVE_TAB))
            .then(() => checkoutPage.fillOutShippingForm(shippingData, locale))
            .then(() => browser.click(checkoutPage.BTN_NEXT_PAYMENT))
            .then(() => browser.waitForExist(checkoutPage.BTN_NEXT_PLACE_ORDER))
            .then(() => browser.waitForExist(checkoutPage.BTN_ADD_NEW))
            .then(() => browser.waitForVisible(checkoutPage.BTN_ADD_NEW))
            .then(() => browser.click(checkoutPage.BTN_ADD_NEW))
            .then(() => browser.waitForVisible(checkoutPage.BILLING_ADDRESS_FORM))
            .then(() => checkoutPage.fillOutBillingForm(billingData, locale))
            .then(() => browser.waitForVisible(checkoutPage.PAYMENT_FORM))
            .then(() => checkoutPage.fillOutPaymentForm(paymentData))
            .then(() => browser.click(checkoutPage.BTN_NEXT_PLACE_ORDER))
            .then(() => browser.waitForExist(checkoutPage.BTN_PLACE_ORDER))
            .then(() => browser.waitForVisible(checkoutPage.PAYMENT_SUMMARY))
            .then(() => browser.click(checkoutPage.BTN_PLACE_ORDER))
            .then(() => browser.waitForVisible(orderConfPage.RECEIPT_CONTAINER));
    });

    // in case checkout process failed half way, we need to clean up cart
    after(() => homePage.navigateTo()
        .then(() => cartPage.emptyCart())
    );

    describe('Thank you message email', () => {
        it('should display thank you message', () => {
            return browser.getText(orderConfPage.ORDER_THANK_YOU_MSG)
                .then((thankYouMsg) => {
                    const expectedThankYouMsg = Resource.msgf('msg.placed.order.thank.you', 'confirmation', null);
                    return assert.equal(thankYouMsg, expectedThankYouMsg, 'Expected to have thank you message = ' + expectedThankYouMsg);
                });
        });

        it('should display email message', () => {
            return browser.getText(orderConfPage.ORDER_THANK_YOU_EMAIL_MSG)
                .then((emailMsg) => {
                    const emailAddr = paymentData[checkoutPage.PAYMENT_EMAIL];
                    const expectedEmailMsg = Resource.msgf('info.receive.email.confirmation', 'confirmation', null, emailAddr);
                    return assert.equal(emailMsg, expectedEmailMsg, 'Expected to have thank you email message = ' + expectedEmailMsg);
                });
        });
    });

    describe('Order number and Date', () => {
        it('should display receipt title', () => {
            return browser.getText(orderConfPage.RECEIPT_HEADER)
                .then((receiptHeaderStr) => {
                    const expectedReceiptHeader = Resource.msgf('title.receipt', 'confirmation', null);
                    return assert.equal(receiptHeaderStr, expectedReceiptHeader, 'Expected receipt card to have title = ' + expectedReceiptHeader);
                });
        });

        it('should display order number', () => {
            return browser.getText(orderConfPage.ORDER_NUMBER_LABEL)
                .then((orderNumLabel) => {
                    const expectedOrderNumLabel = Resource.msgf('label.order.number', 'confirmation', null);
                    return assert.equal(orderNumLabel, expectedOrderNumLabel, 'Expected to have order number label = ' + expectedOrderNumLabel);
                })
                .then(() => browser.getText(orderConfPage.ORDER_NUMBER))
                .then((orderNumber) => {
                    const orderNumberLength = orderNumber.length;
                    return assert.isAbove(orderNumberLength, 0, 'Expected confirmation page to have order number ');
                });
        });

        it('should display order date', () => {
            return browser.getText(orderConfPage.ORDER_DATE_LABEL)
                .then((orderDateLabel) => {
                    const expectedOrderDateLabel = Resource.msgf('label.order.date', 'confirmation', null);
                    return assert.equal(orderDateLabel, expectedOrderDateLabel, 'Expected to have order date label = ' + expectedOrderDateLabel);
                })
                .then(() => browser.getText(orderConfPage.ORDER_DATE))
                .then((orderDate) => {
                    const expectedOrderDate = common.getCurrentUTCDate();
                    return assert.equal(orderDate, expectedOrderDate, 'Expected to have order date  = ' + expectedOrderDate);
                });
        });
    });

    describe('Shipping address details', () => {
        it('should display address label', () => {
            return browser.getText(orderConfPage.SHIPPING_ADDR_LABEL)
                .then((shipAddrLabel) => {
                    const expectedShipAddrLabel = Resource.msgf('label.order.shipping.address', 'confirmation', null);
                    return assert.equal(shipAddrLabel, expectedShipAddrLabel, 'Expected shipping address label to be = ' + expectedShipAddrLabel);
                });
        });

        it('should display name', () => {
            return browser.getText(orderConfPage.SHIPPING_ADDR_FIRST_NAME)
                .then((firstName) => {
                    const expectedFirstName = shippingData[checkoutPage.SHIPPING_FIRST_NAME];
                    return assert.equal(firstName, expectedFirstName, 'Expected shipping first name to be = ' + expectedFirstName);
                })
                .then(() => browser.getText(orderConfPage.SHIPPING_ADDR_LAST_NAME))
                .then((lastName) => {
                    const expectedLastName = shippingData[checkoutPage.SHIPPING_LAST_NAME];
                    return assert.equal(lastName, expectedLastName, 'Expected shipping last name to be = ' + expectedLastName);
                });
        });

        it('should display street name', () => {
            return browser.getText(orderConfPage.SHIPPING_ADDR_ADDRESS1)
                .then((address1) => {
                    const expectedAddress1 = shippingData[checkoutPage.SHIPPING_ADDRESS_ONE];
                    return assert.equal(address1, expectedAddress1, 'Expected shipping address1 to be = ' + expectedAddress1);
                });
        });

        it('should display city name', () => {
            return browser.getText(orderConfPage.SHIPPING_ADDR_CITY)
                .then((city) => {
                    const expectedCity = shippingData[checkoutPage.SHIPPING_ADDRESS_CITY] + ',';
                    return assert.equal(city, expectedCity, 'Expected shipping city to be = ' + expectedCity);
                });
        });

        it('should display state code', () => {
            if (locale && locale === 'x_default') {
                return browser.getText(orderConfPage.SHIPPING_ADDR_STATE_CODE)
                    .then((stateCode) => {
                        const expectedStateCode = shippingData[checkoutPage.SHIPPING_STATE];
                        return assert.equal(stateCode, expectedStateCode, 'Expected shipping state code to be = ' + expectedStateCode);
                    });
            }
            return Promise.resolve();
        });

        it('should display postal code', () => {
            return browser.getText(orderConfPage.SHIPPING_ADDR_POSTAL_CODE)
                .then((zipCode) => {
                    const expectedZipCode = shippingData[checkoutPage.SHIPPING_ZIP_CODE];
                    return assert.equal(zipCode, expectedZipCode, 'Expected shipping zip code to be = ' + expectedZipCode);
                })
                .then(() => browser.getText(orderConfPage.SHIPPING_ADDR_SHIPPING_PHONE))
                .then((shippingPhone) => {
                    const expectedShippingPhone = shippingData[checkoutPage.SHIPPING_PHONE_NUMBER];
                    return assert.equal(shippingPhone, expectedShippingPhone, 'Expected shipping phone to be = ' + expectedShippingPhone);
                });
        });

        it('should display phone number', () => {
            return browser.getText(orderConfPage.SHIPPING_ADDR_SHIPPING_PHONE)
                .then((shippingPhone) => {
                    const expectedShippingPhone = shippingData[checkoutPage.SHIPPING_PHONE_NUMBER];
                    return assert.equal(shippingPhone, expectedShippingPhone, 'Expected shipping phone to be = ' + expectedShippingPhone);
                });
        });
    });

    describe('Shipping method information', () => {
        it('should display method label', () => {
            return browser.getText(orderConfPage.SHIPPING_METHOD_LABEL)
                .then((shipMethodLabel) => {
                    const expectedShipMethodLabel = Resource.msgf('label.order.shipping.method', 'confirmation', null);
                    return assert.equal(shipMethodLabel, expectedShipMethodLabel, 'Expected shipping method label = ' + expectedShipMethodLabel);
                });
        });

        it('should display method title', () => {
            return browser.getText(orderConfPage.SHIPPING_METHOD_TITLE)
                .then((shipMethodName) => {
                    const expectedShipMethodName = '2-Day Express';
                    return assert.equal(shipMethodName, expectedShipMethodName, 'Expected shipping method name = ' + expectedShipMethodName);
                });
        });

        it('should display method arrival time', () => {
            return browser.getText(orderConfPage.SHIPPING_METHOD_ARRIVAL_TIME)
                .then((shipMethodArrivalTime) => {
                    const expectedShipMethodArrivalTime = '( 2 Business Days )';
                    return assert.equal(shipMethodArrivalTime, expectedShipMethodArrivalTime, 'Expected shipping method arrival time = ' + expectedShipMethodArrivalTime);
                });
        });

        it('should display method price', () => {
            return browser.getText(orderConfPage.SHIPPING_METHOD_PRICE)
                .then((shipMethodPrice) => {
                    const expectedShipMethodPrice = '$11.99';
                    return assert.equal(shipMethodPrice, expectedShipMethodPrice, 'Expected shipping method price = ' + expectedShipMethodPrice);
                });
        });
    });

    describe('Payment information:', () => {
        it('should display payment label', () => {
            return browser.getText(orderConfPage.PAYMENT_LABEL)
                .then((paymentLabel) => {
                    const expectedPaymentLabel = Resource.msgf('label.order.payment.info', 'confirmation', null);
                    return assert.equal(paymentLabel, expectedPaymentLabel, 'Expected payment label = ' + expectedPaymentLabel);
                });
        });

        it('should display credit card type', () => {
            return browser.getText(orderConfPage.PAYMENT_CREDIT_TYPE)
                .then((creditCardType) => {
                    const expectedCreditCardType = 'Credit Visa';
                    return assert.equal(creditCardType, expectedCreditCardType, 'Expected credit card type = ' + expectedCreditCardType);
                });
        });

        it('should display credit card number', () => {
            return browser.getText(orderConfPage.PAYMENT_CREDIT_NUMBER)
                .then((creditCardNumber) => {
                    let expectedCreditCardNumber = paymentData[checkoutPage.PAYMENT_CARD_NUMBER].substr(12, 4);
                    expectedCreditCardNumber = '************' + expectedCreditCardNumber;
                    return assert.equal(creditCardNumber, expectedCreditCardNumber, 'Expected credit card number = ' + expectedCreditCardNumber);
                });
        });

        it('should display credit card expiration date', () => {
            return browser.getText(orderConfPage.PAYMENT_CREDIT_EXPIRATION_DATE)
                .then((expirationDate) => {
                    const endDateLabel = 'Ending';
                    let expectedExpirationDate = Resource.msgf('msg.card.type.ending', 'confirmation', null, endDateLabel);
                    const yearStr = paymentData[checkoutPage.PAYMENT_EXPIRATION_YEAR].split('.')[0];

                    expectedExpirationDate += ' ' + paymentData[checkoutPage.PAYMENT_EXPIRATION_MONTH] + '/' + yearStr;
                    return assert.equal(expirationDate, expectedExpirationDate, 'Expected credit card expiration date = ' + expectedExpirationDate);
                });
        });
    });

    describe('Billing information:', () => {
        it('should display address label', () => {
            return browser.getText(orderConfPage.BILLING_ADDR_LABEL)
                .then((addrLabel) => {
                    const expectedBillingAddrLabel = Resource.msgf('label.order.billing.address', 'confirmation', null);
                    return assert.equal(addrLabel, expectedBillingAddrLabel, 'Expected billing address label to be = ' + expectedBillingAddrLabel);
                });
        });

        it('should display name', () => {
            return browser.getText(orderConfPage.BILLING_ADDR_FIRST_NAME)
                .then((firstName) => {
                    const expectedFirstName = billingData[checkoutPage.BILLING_FIRST_NAME];
                    return assert.equal(firstName, expectedFirstName, 'Expected billing first name to be = ' + expectedFirstName);
                })
                .then(() => browser.getText(orderConfPage.BILLING_ADDR_LAST_NAME))
                .then((lastName) => {
                    const expectedLastName = billingData[checkoutPage.BILLING_LAST_NAME];
                    return assert.equal(lastName, expectedLastName, 'Expected billing last name to be = ' + expectedLastName);
                });
        });

        it('should display street name', () => {
            return browser.getText(orderConfPage.BILLING_ADDR_ADDRESS1)
                .then((address1) => {
                    const expectedAddress1 = billingData[checkoutPage.BILLING_ADDRESS_ONE];
                    return assert.equal(address1, expectedAddress1, 'Expected billing address1 to be = ' + expectedAddress1);
                });
        });

        it('should display city name', () => {
            return browser.getText(orderConfPage.BILLING_ADDR_CITY)
                .then((city) => {
                    const expectedCity = billingData[checkoutPage.BILLING_ADDRESS_CITY] + ',';
                    return assert.equal(city, expectedCity, 'Expected billing city to be = ' + expectedCity);
                });
        });

        it('should display state code', () => {
            if (locale && locale === 'x_default') {
                return browser.getText(orderConfPage.BILLING_ADDR_STATE_CODE)
                    .then((stateCode) => {
                        const expectedStateCode = billingData[checkoutPage.BILLING_STATE];
                        return assert.equal(stateCode, expectedStateCode, 'Expected billing state code to be = ' + expectedStateCode);
                    });
            }
            return Promise.resolve();
        });

        it('should display zip code', () => {
            return browser.getText(orderConfPage.BILLING_ADDR_POSTAL_CODE)
                .then((zipCode) => {
                    const expectedZipCode = billingData[checkoutPage.BILLING_ZIP_CODE];
                    return assert.equal(zipCode, expectedZipCode, 'Expected billing zip code to be = ' + expectedZipCode);
                });
        });

        it('should display email', () => {
            return browser.getText(orderConfPage.ORDER_SUMMARY_EMAIL)
                .then((emailAddr) => {
                    const expectedPaymentEmail = paymentData[checkoutPage.PAYMENT_EMAIL];
                    return assert.equal(emailAddr, expectedPaymentEmail, 'Expected payment email to be = ' + expectedPaymentEmail);
                });
        });

        it('should display phone', () => {
            return browser.getText(orderConfPage.ORDER_SUMMARY_PHONE)
                .then((phone) => {
                    const expectedPaymentPhone = paymentData[checkoutPage.PAYMENT_PHONE_NUMBER];
                    return assert.equal(phone, expectedPaymentPhone, 'Expected payment phone to be = ' + expectedPaymentPhone);
                });
        });
    });

    describe('Product summary information:', () => {
        it('should display grand total', () => {
            const itemTotalQuantity = 1;
            const expectTotalLabel = Resource.msgf('label.number.items.in.cart', 'cart', null, itemTotalQuantity);

            const expectTotalPrice = prodIdUnitPricesMap[productVariantId1].sale;

            return browser.getText(orderConfPage.GRAND_TOTAL_LABEL)
                .then((grandTotalLabel) => assert.equal(grandTotalLabel, expectTotalLabel, 'Expected grand total label to be = ' + expectTotalLabel))
                .then(() => browser.getText(orderConfPage.GRAND_TOTAL_PRICE))
                .then((grandTotalPrice) => assert.equal(grandTotalPrice, expectTotalPrice, 'Expected grand total price to be = ' + expectTotalPrice));
        });

        it('should display image source', () => {
            return browser.getAttribute(orderConfPage.PRODUCT_IMAGE, 'src')
                .then(imageSrc => {
                    const expectImgSrc = '/images/small/PG.10229762.JJ169XX.PZ.jpg';
                    return assert.isTrue(imageSrc.endsWith(expectImgSrc), 'product image: url not end with ' + expectImgSrc);
                });
        });

        it('should display unit price', () => {
            return browser.getText(orderConfPage.UNIT_PRICE_LABEL)
                .then((unitPriceLabel) => {
                    const expectedUnitPriceLabel = Resource.msgf('label.each.item.price', 'cart', null);
                    return assert.equal(unitPriceLabel, expectedUnitPriceLabel, 'Expected unit price label to be = ' + expectedUnitPriceLabel);
                })
                .then(() => browser.getText(orderConfPage.UNIT_PRICE_SALES))
                .then((unitPrice) => {
                    const expectedUnitPrice = prodIdUnitPricesMap[productVariantId1].sale;
                    return assert.equal(unitPrice, expectedUnitPrice, 'Expected unit price to be = ' + expectedUnitPrice);
                });
        });

        it('should display quantity', () => {
            return browser.getText(orderConfPage.CARD_QUANTITY_LABEL)
                .then((quantityLabel) => {
                    const expectedQuantityLabel = Resource.msgf('field.selectquantity', 'cart', null);
                    return assert.equal(quantityLabel, expectedQuantityLabel, 'Expected quantity label to be = ' + expectedQuantityLabel);
                })
                .then(() => browser.getText(orderConfPage.CARD_QUANTITY_COUNT))
                .then((quantity) => {
                    const expectQuantity = 1;
                    return assert.equal(quantity, expectQuantity, 'Expected quantity to be = ' + expectQuantity);
                });
        });

        it('should display total price', () => {
            const expectTotalPrice = prodIdUnitPricesMap[productVariantId1].sale;

            return browser.getText(orderConfPage.CARD_TOTAL_PRICE_LABEL)
                .then((totalPriceLabel) => {
                    const expectedTotalPriceLabel = Resource.msgf('label.total.price', 'cart', null);
                    return assert.equal(totalPriceLabel, expectedTotalPriceLabel, 'Expected total price label to be = ' + expectedTotalPriceLabel);
                })
                .then(() => browser.getText(orderConfPage.CARD_TOTAL_PRICE_AMOUNT))
                .then((totalPrice) => {
                    return assert.equal(totalPrice, expectTotalPrice, 'Expected total price to be = ' + expectTotalPrice);
                });
        });
    });

    describe('Total summary information:', () => {
        it('should display sub-total', () => {
            return browser.getText(orderConfPage.ORDER_SUBTOTAL_LABEL)
                .then((subTotalLabel) => {
                    const expectSubTotalLabel = Resource.msgf('label.order.subtotal', 'confirmation', null);
                    return assert.equal(subTotalLabel, expectSubTotalLabel, 'Expected sub total label to be = ' + expectSubTotalLabel);
                })
                .then(() => browser.getText(orderConfPage.ORDER_SUBTOTAL))
                .then((subTotal) => {
                    const expectSubTotal = prodIdUnitPricesMap[productVariantId1].sale;
                    return assert.equal(subTotal, expectSubTotal, 'Expected sub total to be = ' + expectSubTotal);
                });
        });

        it('should display shipping cost', () => {
            return browser.getText(orderConfPage.ORDER_SHIPPING_LABEL)
                .then((shippingCostLabel) => {
                    const expectShippingCostLabel = Resource.msgf('label.order.shipping.cost', 'confirmation', null);
                    return assert.equal(shippingCostLabel, expectShippingCostLabel, 'Expected shipping cost label to be = ' + expectShippingCostLabel);
                })
                .then(() => browser.getText(orderConfPage.ORDER_SHIPPING_COST))
                .then((shippingCost) => {
                    const expectShippingCost = shipCostMap[locale];
                    return assert.equal(shippingCost, expectShippingCost, 'Expected shipping cost to be = ' + expectShippingCost);
                });
        });

        it('should display sales tax', () => {
            return browser.getText(orderConfPage.ORDER_SALES_TAX_LABEL)
                .then((salesTaxLabel) => {
                    const expectSalesTaxLabel = Resource.msgf('label.order.sales.tax', 'confirmation', null);
                    return assert.equal(salesTaxLabel, expectSalesTaxLabel, 'Expected sales tax label to be = ' + expectSalesTaxLabel);
                })
                .then(() => browser.getText(orderConfPage.ORDER_SALES_TAX))
                .then((salesTax) => {
                    const expectSalesTax = totalTaxMap[locale];
                    return assert.equal(salesTax, expectSalesTax, 'Expected sales tax to be = ' + expectSalesTax);
                });
        });

        it('should display grand total', () => {
            return browser.getText(orderConfPage.ORDER_GRAND_TOTAL_LABEL)
                .then((grandTotalLabel) => {
                    const expectGrandTotalLabel = Resource.msgf('label.order.grand.total', 'confirmation', null);
                    return assert.equal(grandTotalLabel, expectGrandTotalLabel, 'Expected grand total label to be = ' + expectGrandTotalLabel);
                })
                .then(() => browser.getText(orderConfPage.ORDER_GRAND_TOTAL))
                .then((grandTotal) => {
                    const expectedUnitPrice1 = prodIdUnitPricesMap[productVariantId1].sale;
                    const listPriceValue1 = pricingHelpers.getCurrencyValue(expectedUnitPrice1, locale);
                    const shipCostValue = pricingHelpers.getCurrencyValue(shipCostMap[locale], locale);
                    const totalTaxValue = pricingHelpers.getCurrencyValue(totalTaxMap[locale], locale);

                    const totalPrice = listPriceValue1 + shipCostValue + totalTaxValue;
                    const expectGrandTotal = pricingHelpers.getFormattedPrice(totalPrice.toString(), locale);

                    return assert.equal(grandTotal, expectGrandTotal, 'Expected grand total to be = ' + expectGrandTotal);
                });
        });
    });

    describe('Continue Shopping button', () => {
        it('should display continue shopping button', () => {
            return browser
                .isEnabled(orderConfPage.CONTINUE_SHOPPING)
                .then(enabled => assert.ok(enabled, 'Expected Continue Shopping button to be enabled.'));
        });

        it('should display the correct button name', () => {
            return browser.getText(orderConfPage.CONTINUE_SHOPPING)
                .then((buttonName) => {
                    const expectButtonName = Resource.msgf('button.continue.shopping', 'confirmation', null);
                    return assert.equal(buttonName, expectButtonName, 'Expected continue shopping button to have name = ' + expectButtonName);
                });
        });

        it('should have the correct href for button', () => {
            return browser.getAttribute(orderConfPage.CONTINUE_SHOPPING, 'href')
                .then((hrefLink) => {
                    const myLocale = locale === 'x_default' ? 'en_US' : locale;

                    const expectHrefLink = '/home?lang=' + myLocale;
                    return assert.isTrue(hrefLink.endsWith(expectHrefLink), 'Expected continue shopping button href link end with = ' + expectHrefLink);
                });
        });
    });

    describe('Save my informaion:', () => {
        it('should display title', () => {
            return browser.getText(orderConfPage.SAVE_MY_INFO_TITLE)
                .then((saveMyInfoTitle) => {
                    const expectSaveMyInfoTitle = Resource.msgf('title.save.customer.information', 'confirmation', null);
                    return assert.equal(saveMyInfoTitle, expectSaveMyInfoTitle, 'Expected save my information to have the title = ' + expectSaveMyInfoTitle);
                });
        });

        it('should display password', () => {
            return browser.getText(orderConfPage.SAVE_MY_INFO_PASSWORD_LABEL)
                .then((passwordLabel) => {
                    const expectPasswordLabel = Resource.msgf('field.password', 'confirmation', null);
                    return assert.equal(passwordLabel, expectPasswordLabel, 'Expected save my information password label = ' + expectPasswordLabel);
                })
                .then(() => browser.isVisible(orderConfPage.SAVE_MY_INFO_PASSWORD))
                .then(passwordVisible => assert.ok(passwordVisible));
        });

        it('should display confirm password', () => {
            return browser.getText(orderConfPage.SAVE_MY_INFO_CONFIRM_PASSWORD_LABEL)
                .then((confirmPasswordLabel) => {
                    const expectConfirmPasswordLabel = Resource.msgf('field.confirm.password', 'confirmation', null);
                    return assert.equal(confirmPasswordLabel, expectConfirmPasswordLabel, 'Expected save my information confirm password label = ' + expectConfirmPasswordLabel);
                })
                .then(() => browser.isVisible(orderConfPage.SAVE_MY_INFO_CONFIRM_PASSWORD))
                .then(passwordVisible => assert.ok(passwordVisible));
        });

        it('should display save my account button', () => {
            return browser.isEnabled(orderConfPage.SAVE_MY_INFO_CREATE_ACCOUNT)
                .then(enabled => assert.ok(enabled, 'Expected Create Account button to be enabled.'));
        });
    });
});
