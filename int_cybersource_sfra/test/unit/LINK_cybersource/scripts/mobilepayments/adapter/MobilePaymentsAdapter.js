'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var resourceMock = require('../../../../../mocks/dw/web/Resource');
var loggerMock = require('../../../../../mocks/dw/system/Logger');
var orderMock = require('../../../../../mocks/models/order');
var bytesMock = require('../../../../../mocks/dw/util/Bytes');
var encodingMock = require('../../../../../mocks/dw/crypto/Encoding');

var jsonObj = JSON.parse('{"isTrusted":true,"payment":{"billingContact":{"addressLines":["35 Broad St"],"administrativeArea":"NJ","country":"United States","countryCode":"us","familyName":"Liotta","givenName":"Chris","locality":"Red Bank","postalCode":"07701","subAdministrativeArea":"","subLocality":""},"shippingContact":{"addressLines":["35 Broad St"],"administrativeArea":"NJ","country":"United States","countryCode":"us","emailAddress":"tester@cybersource.com","familyName":"Liotta","givenName":"Chris","locality":"Red Bank","phoneNumber":"7329825689","postalCode":"07701","subAdministrativeArea":"","subLocality":""},"token":{"paymentData":{"version":"EC_v1","data":"txu+0tBbmByHj3D7/m/fjAjdzGq9q+9Wp2KWfWK5gLglWuesv2ezm8otYKNqWBkxrTVXk2duQ+61YuHlEUMVE7pcVtUpqBJNrphy+y3LjnjbRKQ28QVe1E71qIgsGturC7Bc/V9ifaJf/r7iePL+cUJAPGMiAlx96m2aCqItsw0bxLM15DtXyXzfXQ8vvikFd1My6x9O6NqtnxeoWpBxn/Zy2c2xYc4DFX0kJfbN3lNXzAh7aYTU643Xmbv6+zIU04a3Ros3Z+PXBGPc/OnJtSU/8K9+EvWZVEdP89cs51vn7HqppxKnOLBcCCuzyP/XLHQYlW82RLzN91k96dTGxDOwzOdgsYRRkQXiMceaUSnRrba7J/sKbPJ8p/aPHwkAq0OCxxopieWwONxtLpHx0ZzLdOXtmAu6wXDokiaQKHk=","signature":"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","header":{"ephemeralPublicKey":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE+PQpRgljisTlXbLVaS2x159WDSVqzkI8aXVOLNdFO2TcUlNWYm9QpTqnP1JvKtUzBh2v3JSQTUwwZBnjCBIADg==","publicKeyHash":"72aHd+5+77rSpwOmJtoF+6ne4/Yq8N5i1c/4qchR3P0=","transactionId":"86eb6e3fd273b7bfb918e9546ab042c7aba1ee7d9e0908448b39d04d773f0777"}},"paymentMethod":{"displayName":"Discover 2780","network":"Discover","type":"credit"},"transactionIdentifier":"86EB6E3FD273B7BFB918E9546AB042C7ABA1EE7D9E0908448B39D04D773F0777"}}}');
jsonObj.orderID = orderMock.ID;

var MobilePaymentFacade = {
    mobilePaymentAuthRequest: function () {
        return {
            x: 2
        };
    }
};

var MobilePaymentsHelper = {
    validateMobilePaymentRequest: function () {
        return {
            success: true,
            RequestType: 'API',
            OrderNo: jsonObj.orderID,
            PaymentData: jsonObj.payment.token.paymentData,
            order: orderMock,
            MobilePaymentType: 'DW_APPLE_PAY'
        };
    }
};

var CommonHelper = {
    getIPAddress: function () {
        return '111.111.1.1';
    }
};

var PaymentInstrumentUtils = {
    mobilePaymentOrderUpdate: function () {
        return true;
    }
};

var MobilePaymentsAdapter = proxyquire('../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter', {
    'dw/web/Resource': resourceMock,
    'dw/system/Logger': loggerMock,
    '../helper/MobilePaymentsHelper': MobilePaymentsHelper,
    '../facade/MobilePaymentFacade': MobilePaymentFacade,
    '~/cartridge/scripts/helper/CommonHelper': CommonHelper,
    'dw/crypto/Encoding': encodingMock,
    'dw/util/Bytes': bytesMock,
    '~/cartridge/scripts/utils/PaymentInstrumentUtils': PaymentInstrumentUtils
});

describe('Mobile payment adapter', function () {
    it('process payment method should return a success object', function () {
        var result = MobilePaymentsAdapter.processPayment(orderMock);
        assert.equal(result.success, MobilePaymentsHelper.validateMobilePaymentRequest().success);
    });
});
