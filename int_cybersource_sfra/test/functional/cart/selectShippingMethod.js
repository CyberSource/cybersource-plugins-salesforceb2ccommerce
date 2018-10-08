'use strict';

import { assert } from 'chai';
import { config } from '../webdriver/wdio.conf';
import * as cartPage from '../../mocks/testDataMgr/pageObjects/cart';
import * as productDetailPage from '../../mocks/testDataMgr/pageObjects/productDetail';
import * as testDataMgr from '../../mocks/testDataMgr/main';
import * as pricingHelpers from '../../mocks/testDataMgr/helpers/pricing';

/*
 - Verify shipping method list contain the correct options.
 - verify the shipping options are selectable
 - Verify tax are compute base shipping method
 - Verify shipping cost is computed base on subtotal
 - Verify shipping surcharge applied accordingly
 */

describe('Cart - Selecting Shipping Methods', () => {
    const locale = config.locale;

    const productVariantId1 = '701643566075';
    let productVariant1;
    const productVariantId2 = '013742003208';
    let productVariant2;

    const prodIdUnitPricesMap = {};

    const expectedShipMethodList = [
        'Ground ( 7-10 Business Days )',
        '2-Day Express ( 2 Business Days )',
        'Overnight ( Next Day )',
        'Store Pickup',
        'Express ( 2-3 Business Days )',
        'USPS ( 7-10 Business Days )'
    ];

    before(() => {
        return testDataMgr.load()
            .then(() => {
                const unitPrices = testDataMgr.getPricesByProductId(productVariantId1, locale);
                prodIdUnitPricesMap[productVariantId1] = unitPrices;

                const unitPrices2 = testDataMgr.getPricesByProductId(productVariantId2, locale);
                prodIdUnitPricesMap[productVariantId2] = unitPrices2;

                productVariant1 = testDataMgr.getProductById(productVariantId1);
                productVariant2 = testDataMgr.getProductById(productVariantId2);
            });
    });

    describe('Verify list contains correct shipping methods.', () => {
        before(() => {
            return browser.url(productVariant1.getUrlResourcePath())
                .then(() => productDetailPage.clickAddToCartButton())
                .then(() => cartPage.navigateTo())
                .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, 0));
        });

        after(() => cartPage.emptyCart());

        it.skip('Should have the correct number shipping methods on the list.', function () {
            return browser.elements(cartPage.SHIPPING_METHOD_OPTIONS)
                .then(methodList => {
                    return assert.equal(methodList.value.length, expectedShipMethodList.length, 'Expected the number of shipping methods = ' + expectedShipMethodList.length);
                });
        });

        it.skip('Should have the correct shipping method names on the list.', function () {
            return cartPage.getShippingMethodAtIndex(1)
                .then(method => {
                    return assert.equal(method, expectedShipMethodList[0], 'Expected first shipping method = ' + expectedShipMethodList[0]);
                })
                .then(() => cartPage.getShippingMethodAtIndex(2))
                .then(method => {
                    return assert.equal(method, expectedShipMethodList[1], 'Expected first shipping method = ' + expectedShipMethodList[1]);
                })
                .then(() => cartPage.getShippingMethodAtIndex(3))
                .then(method => {
                    return assert.equal(method, expectedShipMethodList[2], 'Expected first shipping method = ' + expectedShipMethodList[2]);
                })
                .then(() => cartPage.getShippingMethodAtIndex(4))
                .then(method => {
                    return assert.equal(method, expectedShipMethodList[3], 'Expected first shipping method = ' + expectedShipMethodList[3]);
                })
                .then(() => cartPage.getShippingMethodAtIndex(5))
                .then(method => {
                    return assert.equal(method, expectedShipMethodList[4], 'Expected first shipping method = ' + expectedShipMethodList[4]);
                })
                .then(() => cartPage.getShippingMethodAtIndex(6))
                .then(method => {
                    return assert.equal(method, expectedShipMethodList[5], 'Expected first shipping method = ' + expectedShipMethodList[5]);
                });
        });

        it('Should have default shipping method selected.', function () {
            return cartPage.isShippingMethodSelectedAtIndex(1)
                .then(selected => {
                    return assert.isTrue(selected, 'Expected first shipping method to be selected but it is not');
                });
        });
    });

    describe('Verify using product with no shipping surcharge', () => {
        before(() => {
            return browser.url(productVariant1.getUrlResourcePath())
                .then(() => productDetailPage.clickAddToCartButton())
                .then(() => cartPage.navigateTo());
        });

        after(() => {
            return browser.selectByIndex(cartPage.SHIPPING_METHODS, 0)
                .then(() => cartPage.emptyCart());
        });

        it('Should have the correct default shipping cost - Ground', function () {
            const shipCostMap = {
                'x_default': '$7.99',
                'en_GB': '£5.99',
                'fr_FR': '5,99 €',
                'it_IT': '€ 5,99',
                'ja_JP': '¥ 14',
                'zh_CN': '¥13.99'
            };

            const totalTaxMap = {
                'x_default': '$9.85',
                'en_GB': '£8.49',
                'fr_FR': '8,49 €',
                'it_IT': '€ 8,49',
                'ja_JP': '¥ 16',
                'zh_CN': '¥22.00'
            };

            const expectShipCost = shipCostMap[locale];
            const expectTotalTax = totalTaxMap[locale];

            return browser.getText(cartPage.SHIPPING_COST)
                .then(shippingCost => {
                    return assert.equal(shippingCost, expectShipCost, 'Expected Ground shipping cost to be ' + expectShipCost);
                })
                .then(() => browser.getText(cartPage.TAX_TOTAL))
                .then(taxTotal => {
                    return assert.equal(taxTotal, expectTotalTax, 'Expected total tax to be ' + expectTotalTax);
                })
                .then(() => browser.getText(cartPage.GRAND_TOTAL))
                .then(subTotal => {
                    const expectedUnitPrice1 = prodIdUnitPricesMap[productVariantId1].list;
                    const listPriceValue1 = pricingHelpers.getCurrencyValue(expectedUnitPrice1, locale);

                    const shipCostValue = pricingHelpers.getCurrencyValue(expectShipCost, locale);

                    const totalTaxValue = pricingHelpers.getCurrencyValue(expectTotalTax, locale);

                    const expectedEstimatedTotal = listPriceValue1 + shipCostValue + totalTaxValue;
                    const formattedExpectedSubTotal = pricingHelpers.getFormattedPrice(expectedEstimatedTotal.toString(), locale);

                    assert.equal(subTotal, formattedExpectedSubTotal, 'Expected estimated total to be ' + formattedExpectedSubTotal);
                });
        });

        it('Should be able to select different shipping method - Overnight.', function () {
            const shipCostMap = {
                'x_default': '$19.99',
                'en_GB': '£14.99',
                'fr_FR': '14,99 €',
                'it_IT': '€ 14,99',
                'ja_JP': '¥ 38',
                'zh_CN': '¥37.99'
            };

            const totalTaxMap = {
                'x_default': '$10.45',
                'en_GB': '£9.00',
                'fr_FR': '9,00 €',
                'it_IT': '€ 9,00',
                'ja_JP': '¥ 17',
                'zh_CN': '¥18.50'
            };

            const expectShipCost = shipCostMap[locale];
            const expectTotalTax = totalTaxMap[locale];

            let prevShipCost;

            return browser.getText(cartPage.SHIPPING_COST)
                .then(shippingCost => {
                    prevShipCost = shippingCost;
                })
                .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, 2))
                .then(() => cartPage.isShippingMethodSelectedAtIndex(3))
                .then(selected => {
                    return assert.isTrue(selected, 'Expected Overnight method to be selected but it is not.');
                })
                .then(() => {
                    return browser.waitUntil(() => {
                        return browser.getText(cartPage.SHIPPING_COST)
                            .then(text => {
                                return text !== prevShipCost;
                            });
                    }, 2000, 'expected text to be different after 1s');
                })
                .then(() => browser.getText(cartPage.SHIPPING_COST))
                .then(shippingCost => {
                    return assert.equal(shippingCost, expectShipCost, 'Expected shipping cost to be ' + expectShipCost);
                })
                .then(() => browser.getText(cartPage.TAX_TOTAL))
                .then(taxTotal => {
                    return assert.equal(taxTotal, expectTotalTax, 'Expected total tax to be ' + expectTotalTax);
                })
                .then(() => browser.getText(cartPage.GRAND_TOTAL))
                .then(subTotal => {
                    const expectedUnitPrice1 = prodIdUnitPricesMap[productVariantId1].list;
                    const listPriceValue1 = pricingHelpers.getCurrencyValue(expectedUnitPrice1, locale);

                    const shipCostValue = pricingHelpers.getCurrencyValue(expectShipCost, locale);

                    const totalTaxValue = pricingHelpers.getCurrencyValue(expectTotalTax, locale);

                    const expectedEstimatedTotal = listPriceValue1 + shipCostValue + totalTaxValue;
                    const formattedExpectedSubTotal = pricingHelpers.getFormattedPrice(expectedEstimatedTotal.toString(), locale);

                    return assert.equal(subTotal, formattedExpectedSubTotal, 'Expected estimated total to be ' + formattedExpectedSubTotal);
                });
        });

        it.skip('Should be able to select different shipping method - Store Pickup.', function () {
            const shipCostMap = {
                'x_default': '$0.00',
                'en_GB': '£0.00',
                'fr_FR': '0,00 €',
                'it_IT': '€ 0,00',
                'ja_JP': '¥ 0',
                'zh_CN': '¥0.00'
            };

            const totalTaxMap = {
                'x_default': '$9.45',
                'en_GB': '£7.99',
                'fr_FR': '7,99 €',
                'it_IT': '€ 7,99',
                'ja_JP': '¥ 15',
                'zh_CN': '¥20.00'
            };

            const expectShipCost = shipCostMap[locale];
            const expectTotalTax = totalTaxMap[locale];

            let prevShipCost;

            return browser.getText(cartPage.SHIPPING_COST)
                .then(shippingCost => {
                    prevShipCost = shippingCost;
                })
                .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, 3))
                .then(() => cartPage.isShippingMethodSelectedAtIndex(4))
                .then(selected => {
                    return assert.isTrue(selected, 'Expected Store Pickup method to be selected but it is not.');
                })
                .then(() => {
                    return browser.waitUntil(() => {
                        return browser.getText(cartPage.SHIPPING_COST)
                            .then(text => {
                                return text !== prevShipCost;
                            });
                    }, 2000, 'expected text to be different after 1s');
                })
                .then(() => browser.getText(cartPage.SHIPPING_COST))
                .then(shippingCost => {
                    return assert.equal(shippingCost, expectShipCost, 'Expected shipping cost to be ' + expectShipCost);
                })
                .then(() => browser.getText(cartPage.TAX_TOTAL))
                .then(taxTotal => {
                    return assert.equal(taxTotal, expectTotalTax, 'Expected total tax to be ' + expectTotalTax);
                })
                .then(() => browser.getText(cartPage.GRAND_TOTAL))
                .then(subTotal => {
                    const expectedUnitPrice1 = prodIdUnitPricesMap[productVariantId1].list;
                    const listPriceValue1 = pricingHelpers.getCurrencyValue(expectedUnitPrice1, locale);

                    const shipCostValue = pricingHelpers.getCurrencyValue(expectShipCost, locale);

                    const totalTaxValue = pricingHelpers.getCurrencyValue(expectTotalTax, locale);

                    const expectedEstimatedTotal = listPriceValue1 + shipCostValue + totalTaxValue;
                    const formattedExpectedSubTotal = pricingHelpers.getFormattedPrice(expectedEstimatedTotal.toString(), locale);

                    return assert.equal(subTotal, formattedExpectedSubTotal, 'Expected estimated total to be ' + formattedExpectedSubTotal);
                });
        });

        it.skip('Should be able to select different shipping method - Express.', function () {
            const shipCostMap = {
                'x_default': '$22.99',
                'en_GB': '£17.24',
                'fr_FR': '17,24 €',
                'it_IT': '€ 17,24',
                'ja_JP': '¥ 41',
                'zh_CN': '¥40.50'
            };

            const totalTaxMap = {
                'x_default': '$10.60',
                'en_GB': '£9.11',
                'fr_FR': '9,11 €',
                'it_IT': '€ 9,11',
                'ja_JP': '¥ 18',
                'zh_CN': '¥19.50'
            };

            const expectShipCost = shipCostMap[locale];
            const expectTotalTax = totalTaxMap[locale];

            let prevShipCost;

            return browser.getText(cartPage.SHIPPING_COST)
                .then(shippingCost => {
                    prevShipCost = shippingCost;
                })
                .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, 4))
                .then(() => cartPage.isShippingMethodSelectedAtIndex(5))
                .then(selected => {
                    return assert.isTrue(selected, 'Expected Express method to be selected but it is not.');
                })
                .then(() => {
                    return browser.waitUntil(() => {
                        return browser.getText(cartPage.SHIPPING_COST)
                            .then(text => {
                                return text !== prevShipCost;
                            });
                    }, 2000, 'expected text to be different after 1s');
                })
                .then(() => browser.getText(cartPage.SHIPPING_COST))
                .then(shippingCost => {
                    return assert.equal(shippingCost, expectShipCost, 'Expected shipping cost to be ' + expectShipCost);
                })
                .then(() => browser.getText(cartPage.TAX_TOTAL))
                .then(taxTotal => {
                    return assert.equal(taxTotal, expectTotalTax, 'Expected total tax to be ' + expectTotalTax);
                })
                .then(() => browser.getText(cartPage.GRAND_TOTAL))
                .then(subTotal => {
                    const expectedUnitPrice1 = prodIdUnitPricesMap[productVariantId1].list;
                    const listPriceValue1 = pricingHelpers.getCurrencyValue(expectedUnitPrice1, locale);

                    const shipCostValue = pricingHelpers.getCurrencyValue(expectShipCost, locale);

                    const totalTaxValue = pricingHelpers.getCurrencyValue(expectTotalTax, locale);

                    const expectedEstimatedTotal = listPriceValue1 + shipCostValue + totalTaxValue;
                    const formattedExpectedSubTotal = pricingHelpers.getFormattedPrice(expectedEstimatedTotal.toString(), locale);

                    return assert.equal(subTotal, formattedExpectedSubTotal, 'Expected estimated total to be ' + formattedExpectedSubTotal);
                });
        });

        it.skip('Should be able to select different shipping method - USPS.', function () {
            const shipCostMap = {
                'x_default': '$7.99',
                'en_GB': '£5.99',
                'fr_FR': '5,99 €',
                'it_IT': '€ 5,99',
                'ja_JP': '¥ 14',
                'zh_CN': '¥13.99'
            };

            const totalTaxMap = {
                'x_default': '$9.85',
                'en_GB': '£8.49',
                'fr_FR': '8,49 €',
                'it_IT': '€ 8,49',
                'ja_JP': '¥ 16',
                'zh_CN': '¥22.00'
            };

            const expectShipCost = shipCostMap[locale];
            const expectTotalTax = totalTaxMap[locale];

            let prevShipCost;

            return browser.getText(cartPage.SHIPPING_COST)
                .then(shippingCost => {
                    prevShipCost = shippingCost;
                })
                .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, 5))
                .then(() => cartPage.isShippingMethodSelectedAtIndex(6))
                .then(selected => {
                    return assert.isTrue(selected, 'Expected USPS method to be selected but it is not.');
                })
                .then(() => {
                    return browser.waitUntil(() => {
                        return browser.getText(cartPage.SHIPPING_COST)
                            .then(text => {
                                return text !== prevShipCost;
                            });
                    }, 2000, 'expected text to be different after 1s');
                })
                .then(() => browser.getText(cartPage.SHIPPING_COST))
                .then(shippingCost => {
                    return assert.equal(shippingCost, expectShipCost, 'Expected shipping cost to be ' + expectShipCost);
                })
                .then(() => browser.getText(cartPage.TAX_TOTAL))
                .then(taxTotal => {
                    return assert.equal(taxTotal, expectTotalTax, 'Expected total tax to be ' + expectTotalTax);
                })
                .then(() => browser.getText(cartPage.GRAND_TOTAL))
                .then(subTotal => {
                    const expectedUnitPrice1 = prodIdUnitPricesMap[productVariantId1].list;
                    const listPriceValue1 = pricingHelpers.getCurrencyValue(expectedUnitPrice1, locale);

                    const shipCostValue = pricingHelpers.getCurrencyValue(expectShipCost, locale);

                    const totalTaxValue = pricingHelpers.getCurrencyValue(expectTotalTax, locale);

                    const expectedEstimatedTotal = listPriceValue1 + shipCostValue + totalTaxValue;
                    const formattedExpectedSubTotal = pricingHelpers.getFormattedPrice(expectedEstimatedTotal.toString(), locale);

                    return assert.equal(subTotal, formattedExpectedSubTotal, 'Expected estimated total to be ' + formattedExpectedSubTotal);
                });
        });
    });

    describe('Verify using multiple products and product with shipping surcharge', () => {
        before(() => {
            return browser.url(productVariant1.getUrlResourcePath())
                .then(() => productDetailPage.clickAddToCartButton())

                .then(() => browser.url(productVariant2.getUrlResourcePath()))
                .then(() => productDetailPage.clickAddToCartButton())

                .then(() => cartPage.navigateTo());
        });

        after(() => {
            return browser.selectByIndex(cartPage.SHIPPING_METHODS, 0)
                .then(() => cartPage.emptyCart());
        });

        it('Should have surcharge included in shipping cost for shipping method - Ground ', function () {
            const shipCostMap = {
                'x_default': '$19.99',
                'en_GB': '£17.99',
                'fr_FR': '15,99 €',
                'it_IT': '€ 15,99',
                'ja_JP': '¥ 24',
                'zh_CN': '¥23.99'
            };

            const totalTaxMap = {
                'x_default': '$11.95',
                'en_GB': '£9.49',
                'fr_FR': '9,49 €',
                'it_IT': '€ 9,49',
                'ja_JP': '¥ 20',
                'zh_CN': '¥42.00'
            };

            const expectShipCost = shipCostMap[locale];
            const expectTotalTax = totalTaxMap[locale];

            return browser.getText(cartPage.SHIPPING_COST)
                .then(shippingCost => {
                    assert.equal(shippingCost, expectShipCost, 'Expected Ground shipping cost to be ' + expectShipCost);
                })
                .then(() => browser.getText(cartPage.TAX_TOTAL))
                .then(taxTotal => {
                    return assert.equal(taxTotal, expectTotalTax, 'Expected total tax to be ' + expectTotalTax);
                });
        });

        it('Should not have surcharge included in shipping cost for shipping method - 2 Day Express.', function () {
            const shipCostMap = {
                'x_default': '$15.99',
                'en_GB': '£11.99',
                'fr_FR': '11,99 €',
                'it_IT': '€ 11,99',
                'ja_JP': '¥ 22',
                'zh_CN': '¥23.99'
            };

            const totalTaxMap = {
                'x_default': '$11.75',
                'en_GB': '£9.59',
                'fr_FR': '9,59 €',
                'it_IT': '€ 9,59',
                'ja_JP': '¥ 17',
                'zh_CN': '¥25.00'
            };

            const expectShipCost = shipCostMap[locale];
            const expectTotalTax = totalTaxMap[locale];

            let prevShipCost;

            return browser.getText(cartPage.SHIPPING_COST)
                .then(shippingCost => {
                    prevShipCost = shippingCost;
                })
                .then(() => browser.selectByIndex(cartPage.SHIPPING_METHODS, 1))
                .then(() => cartPage.isShippingMethodSelectedAtIndex(2))
                .then(selected => {
                    return assert.isTrue(selected, 'Expected 2 Day Express method to be selected but it is not.');
                })
                .then(() => {
                    return browser.waitUntil(() => {
                        return browser.getText(cartPage.SHIPPING_COST)
                            .then(text => {
                                return text !== prevShipCost;
                            });
                    }, 2000, 'expected text to be different after 1s');
                })
                .then(() => browser.getText(cartPage.SHIPPING_COST))
                .then(shippingCost => {
                    return assert.equal(shippingCost, expectShipCost, 'Expected shipping cost to be ' + expectShipCost);
                })
                .then(() => browser.getText(cartPage.TAX_TOTAL))
                .then(taxTotal => {
                    return assert.equal(taxTotal, expectTotalTax, 'Expected total tax to be ' + expectTotalTax);
                });
        });
    });
});

