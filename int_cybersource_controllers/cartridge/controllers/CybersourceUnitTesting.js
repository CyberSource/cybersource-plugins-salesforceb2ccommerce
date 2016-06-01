'use strict';
/**
 * Controller that performs subscription related services of cards.
 * @module controllers/Cybersource_Subscription
 */

/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Pipeline = require('dw/system/Pipeline');
var logger = dw.system.Logger.getLogger('Cybersource');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function StartPOS(args) {
	Pipeline.execute('CybersourceUnitTesting-StartPOS');
	return;
}

function TestBMLAuth(args) {
	Pipeline.execute('CybersourceUnitTesting-TestBMLAuth');
	return;
}

function TestCCAuth(args) {
	Pipeline.execute('CybersourceUnitTesting-TestCCAuth');
	return;
}

function TestTax(args) {
	Pipeline.execute('CybersourceUnitTesting-TestTax');
	return;
}

function TestDAVCheck(args) {
	Pipeline.execute('CybersourceUnitTesting-TestDAVCheck');
	return;
}

function TestPA(args) {
	Pipeline.execute('CybersourceUnitTesting-TestPA');
	return;
}

function TestFingerprint(args) {
	Pipeline.execute('CybersourceUnitTesting-TestFingerprint');
	return;
}

function TestAlipayInitiateService(args) {
	Pipeline.execute('CybersourceUnitTesting-TestAlipayInitiateService');
	return;
}

function TestAlipayCheckStatusService(args) {
	Pipeline.execute('CybersourceUnitTesting-TestAlipayCheckStatusService');
	return;
}

function TestPaypalCaptureService(args) {
	Pipeline.execute('CybersourceUnitTesting-TestPaypalCaptureService');
	return;
}

function TestCaptureCard(args) {
	Pipeline.execute('CybersourceUnitTesting-TestCaptureCard');
	return;
}

/*
 * Module exports
 */

/*
 * Local methods require guard change below usage
 */

exports.StartPOS=guard.ensure(['https'], StartPOS);
exports.TestBMLAuth=guard.ensure(['https'], TestBMLAuth);
exports.TestCCAuth=guard.ensure(['https'], TestCCAuth);
exports.TestTax=guard.ensure(['https'], TestTax);
exports.TestDAVCheck=guard.ensure(['https'], TestDAVCheck);
exports.TestPA=guard.ensure(['https'], TestPA);
exports.TestFingerprint=guard.ensure(['https'], TestFingerprint);
exports.TestAlipayInitiateService=guard.ensure(['https'], TestAlipayInitiateService);
exports.TestAlipayCheckStatusService=guard.ensure(['https'], TestAlipayCheckStatusService);
exports.TestPaypalCaptureService=guard.ensure(['https'], TestPaypalCaptureService);
exports.TestCaptureCard=guard.ensure(['https'], TestCaptureCard);

/*
 * Local methods
 */
