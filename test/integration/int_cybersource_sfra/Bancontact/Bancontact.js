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

function addProductAndSubmitBancontact() {
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
			.then(function (csrfResponse) {
				return Bancontact(csrfResponse, myRequest);
			})
			.then(function (csrfResponse) {
				var order = {orderNo:'1234567'}; 
                myRequest.method = 'GET';
				var order_id = '00012901';
                myRequest.url = config.baseUrl + '/COPlaceOrder-Submit?' + 'order_id'  + '=' + '00012901' + '&' + 'provider'  + '=' + 'banktransfer';
				var cookie = request.cookie(cookieString);
                cookieJar.setCookie(cookie, myRequest.order_id);
				cookieJar.setCookie(cookie, myRequest.order_id);
				return request(myRequest);
            });
	});
	it('expect to add to cart and submit Bancontact to succeed', function () {
		return request(myRequest)
			.then(function (response) {
			//var bodyAsJson = JSON.parse(response.body);
			//var strippedBody = jsonHelpers.deleteProperties(bodyAsJson, ['redirectUrl', 'action', 'queryString']);
			assert.equal(response.statusCode, 200, 'Expected COPlaceOrder-Submit statusCode to be 200.');
			//assert.containSubset(strippedBody.address, myRequest.ExpectedResBody.address, 'Expecting actual response address to be equal match expected response address');
			//assert.isFalse(strippedBody.error);
			//assert.equal(strippedBody.paymentMethod.value, myRequest.ExpectedResBody.paymentMethod.value);
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

function Bancontact(csrfResponse, myRequest) {
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
		dwfrm_billing_paymentMethod: 'MCH',
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
			value: 'MCH',
			htmlName: 'MCH'
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
	myRequest.ExpectedResBody;
	return request(myRequest);
		
}

describe('Bancontact from checkout', function () {

	describe('positive Bancontact', function () {
		this.timeout(60000);
		return addProductAndSubmitBancontact();
	});
});

