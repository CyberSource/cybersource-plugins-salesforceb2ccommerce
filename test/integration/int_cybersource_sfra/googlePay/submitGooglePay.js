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
	it('expect to add to cart and submit google payment to succeed', function () {
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

function submitPayment(csrfResponse, myRequest, token) {
	
	return request(myRequest)
		.then(function (response) {
			var bodyAsJson = JSON.parse(response.body);
			var strippedBody = jsonHelpers.deleteProperties(bodyAsJson, ['redirectUrl', 'action', 'queryString']);
			assert.equal(response.statusCode, 200, 'Expected CheckoutServices-SubmitPayment statusCode to be 200.');
		});
}


describe('google pay from checkout', function () {

	describe('positive visa', function () {
		this.timeout(5000);
		//How to get this payload.
		var creditCard = "GOOGLEPAY ENCRYPTED PAYLOAD"
		return addProductAndSubmitPayment(creditCard);
	});
});