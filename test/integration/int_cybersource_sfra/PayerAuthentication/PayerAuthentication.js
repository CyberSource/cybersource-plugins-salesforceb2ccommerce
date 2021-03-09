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

function addProductAndSubmitPayerAuthentication(creditCard) {
	var cookieJar = request.jar();
	var variantPid1 = '883360520926M';
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
	before(function () {
		return request(myRequest)
			.then(function (addToCartResponse) {
				return addToCart(addToCartResponse, cookieJar, myRequest);
			})
			
			.then(function (csrfResponse,creditCard) {
                myRequest.method = 'GET';
                myRequest.url = config.baseUrl + '/CheckoutServices-InitPayerAuth';
                var cookie = request.cookie(cookieString);
                cookieJar.setCookie(cookie, myRequest.url);
                return request(myRequest);
            });
	});
	it('expect to add to cart and submit PayerAuthentication to succeed', function () {
		return request(myRequest)
			.then(function (response) {
			assert.equal(response.statusCode, 200, 'Expected CheckoutServices-PayerAuthentication statusCode to be 200.');
		});
	});
}


function addToCart(addToCartResponse, cookieJar, myRequest) {
	assert.equal(addToCartResponse.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
	cookieString = cookieJar.getCookieString(myRequest.url);
	myRequest.url = config.baseUrl + '/CSRF-Generate';
	var cookie = request.cookie(cookieString);
	cookieJar.setCookie(cookie, myRequest.url);
	// step2 : get cookies, Generate CSRF, then set cookies
	return request(myRequest);
}


describe('PayerAuthentication from checkout', function () {

	describe('positive visa', function () {
		this.timeout(60000);
		var creditCard = {
			type: 'Visa',
			cardNumber: '4111 1111 1111 1111',
			expirationMonth: '03',
			expirationYear: '2025',
			securityCode: '999'
		};
		return addProductAndSubmitPayerAuthentication(creditCard);
	});
});

