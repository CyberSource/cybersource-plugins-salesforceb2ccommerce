var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');
var chai = require('chai');
var chaiSubset = require('chai-subset');
var jsonHelpers = require('../helpers/jsonUtils');
chai.use(chaiSubset);

/**
 * Test case:
 * should be able to submit an order with billingForm
 */

function addProductAndSubmitPayment(creditCard) {
    var cookieJar = request.jar();
    var variantPid1 = '701643421084M';
    var qty1 = 2;
    var addProd = '/Cart-AddProduct';
    var myRequest = {
        url: config.baseUrl + addProd,
        method: 'POST',
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        jar: cookieJar,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        form: {
            pid: variantPid1,
            quantity: qty1
        }
    };
    it('expect to add to cart and submit payment to succeed', function () {
        return request(myRequest)
            .then(function (addToCartResponse) {
                return addToCart(addToCartResponse, cookieJar, myRequest);
            })
            .then(function (csrfResponse) {
                return submitPayment(csrfResponse, myRequest, creditCard);
            })
    });
}



function addToCart(addToCartResponse, cookieJar, myRequest) {
    assert.equal(addToCartResponse.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
    cookieString = cookieJar.getCookieString(myRequest.url);
    myRequest.url = config.baseUrl + '/CYBServicesTesting-Generate';
    var cookie = request.cookie(cookieString);
    cookieJar.setCookie(cookie, myRequest.url);
    // step2 : get cookies, Generate CSRF, then set cookies
    return request(myRequest);
}

function submitPayment(csrfResponse, myRequest, creditCard) {
    var csrfJsonResponse = JSON.parse(csrfResponse.body);
    // step3 : submit billing request with token aquired in step 2
    myRequest.url = config.baseUrl + '/CheckoutServices-SubmitPayment?' +
        csrfJsonResponse.csrf.tokenName + '=' +
        csrfJsonResponse.csrf.token;
    myRequest.form = {
        dwfrm_billing_shippingAddressUseAsBillingAddress: 'true',
        dwfrm_billing_addressFields_firstName: 'John',
        dwfrm_billing_addressFields_lastName: 'Smith',
        dwfrm_billing_addressFields_address1: '10 main St',
        dwfrm_billing_addressFields_address2: '',
        dwfrm_billing_addressFields_country: 'us',
        dwfrm_billing_addressFields_states_stateCode: 'MA',
        dwfrm_billing_addressFields_city: 'burlington',
        dwfrm_billing_addressFields_postalCode: '09876',
        dwfrm_billing_paymentMethod: 'CREDIT_CARD',
        dwfrm_billing_creditCardFields_cardType: creditCard.type,
        dwfrm_billing_creditCardFields_cardNumber: creditCard.cardNumber,
        dwfrm_billing_creditCardFields_expirationMonth: creditCard.expirationMonth,
        dwfrm_billing_creditCardFields_expirationYear: creditCard.expirationYear,
        dwfrm_billing_creditCardFields_securityCode: creditCard.securityCode,
        dwfrm_billing_contactInfoFields_email: 'blahblah@gmail.com',
        dwfrm_billing_contactInfoFields_phone: '9786543213'
    };
    var ExpectedResBody = {
        locale: 'en_US',
        address: {
            firstName: {
                value: 'John'
            },
            lastName: {
                value: 'Smith'
            },
            address1: {
                value: '10 main St'
            },
            address2: {
                value: null
            },
            city: {
                value: 'burlington'
            },
            stateCode: {
                value: 'MA'
            },
            postalCode: {
                value: '09876'
            },
            countryCode: {
                value: 'us'
            }
        },
        paymentMethod: {
            value: 'CREDIT_CARD',
            htmlName: 'CREDIT_CARD'
        },
        email: {
            value: 'blahblah@gmail.com'
        },
        phone: {
            value: '9786543213'
        },
        error: true,
        cartError: true,
        fieldErrors: [],
        serverErrors: [],
        saveCard: false
    };
    return request(myRequest)
        .then(function (response) {
            var bodyAsJson = JSON.parse(response.body);
            var strippedBody = jsonHelpers.deleteProperties(bodyAsJson, ['redirectUrl', 'action', 'queryString']);
            assert.equal(response.statusCode, 200, 'Expected CheckoutServices-SubmitPayment statusCode to be 200.');
            assert.containSubset(strippedBody.address, ExpectedResBody.address, 'Expecting actual response address to be equal match expected response address');
            assert.isFalse(strippedBody.error);
            assert.equal(strippedBody.paymentMethod.value, ExpectedResBody.paymentMethod.value);
        });
}

function createFlexKey() {
    var cookieJar = request.jar();
    var extendedURL = '/CYBSecureAcceptance-CreateFlexToken';
    var myRequest = {
        url: config.baseUrl + extendedURL,
        method: 'GET',
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        jar: cookieJar,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    it('expect to create flex key and to succeed', function () {
        return request(myRequest);
    });
}


describe('billingForm', function () {


    describe('positive visa', function () {
        this.timeout(5000);
        var creditCard = {
            type: 'Visa',
            cardNumber: '4111 1111 1111 1111',
            expirationMonth: '03',
            expirationYear: '2025',
            securityCode: '999'
        };
        return addProductAndSubmitPayment(creditCard);
    });
    describe('positive mastercard', function () {
        this.timeout(5000);
        var creditCard = {
            type: 'MasterCard',
            cardNumber: '5200 0000 0000 1005',
            expirationMonth: '03',
            expirationYear: '2025',
            securityCode: '999'
        };
        return addProductAndSubmitPayment(creditCard);
    });
    describe('positive amex', function () {
        this.timeout(5000);
        var creditCard = {
            type: 'Amex',
            cardNumber: '340000000001007',
            expirationMonth: '03',
            expirationYear: '2025',
            securityCode: '9999'
        };
        return addProductAndSubmitPayment(creditCard);
    });
    describe('positive discover', function () {
        this.timeout(5000);
        var creditCard = {
            type: 'Discover',
            cardNumber: '6011000000001002',
            expirationMonth: '03',
            expirationYear: '2025',
            securityCode: '999'
        };
        return addProductAndSubmitPayment(creditCard);
    });
    describe('positive flex', function () {
         this.timeout(5000);
        return createFlexKey();
     });

});
