'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var loggerMock = require('../../../../../mocks/dw/system/Logger');
var statusMock = require('../../../../../mocks/dw/system/Status');
var hashMapMock = require('../../../../../mocks/dw.util.HashMap');
var soapUtilMock = require('../../../../../mocks/dw/rpc/SOAPUtil');
var siteMock = require('../../../../../mocks/dw/system/Site');
var Money = require('../../../../../mocks/dw.value.Money');
var ArrayList = require('../../../../../mocks/dw.util.Collection');
var CybersourceConstants = require('../../../../../../cartridges/LINK_cybersource/cartridge/scripts/utils/CybersourceConstants');
var sinon = require('sinon');


var localServiceRegistryMock = {
    createService: function () {
        return null;
    }
};

var taxationResponse = '';
var mockOptions = [{
    optionId: 'option 1',
    selectedValueId: '123'
}];
var availabilityModelMock = {
    inventoryRecord: {
        ATS: {
            value: 3
        }
    }
};
var shippingAddress = {
    addressLines: ['35 Broad St'],
    administrativeArea: 'NJ',
    city: 'New York',
    country: 'United States',
    countryCode: 'us',
    emailAddress: 'tester@cybersource.com',
    familyName: 'Doe',
    givenName: 'John',
    locality: 'Red Bank',
    phoneNumber: '7329825689',
    stateCode: '07701',
    postalCode: '07701',
    subAdministrativeArea: '',
    subLocality: ''
};
var productLineItemMock = new ArrayList([
    {
        productID: '701643465309M',
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        adjustedPrice: 100,
        product: {
            availabilityModel: availabilityModelMock
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        shippingLineItem: {
            surcharge: true
        }
    }
]);
var shipments = [{
    shippingMethod: {
        ID: '005'
    }
}];

global.webreferences = function () {
    return {
        CyberSourceTransaction: {}
    };
};
global.request = {
    httpParameterMap: {
        requestBosyAsString: '{"Header": {"Security": {"mustUnderstand": "1","UsernameToken": { "Username": "accenture_cybersource","Password": "9QfDZ4SXCw6H7tB4gey3X2j1vO8O6gVieJFT6s2rm2Olb0H/3jm7hJDLvNtH88QsPmcBaVT4fFFDxh22E9R6R1XY9Wrx4KGBxFV6Q9cncC7PdDSinMoCBfC0FsZHkKLw6YQlzawbhY4rYJOaW2jYTiFH+qMvgDq9GUT8Dur/SjshbfVUNTARbKe2vmRLmLhuAoZ2H41XzR24+jC3XClDWzW7yNiR5IZt3GzGGv94aIUhruStOuQkSB68VUuILpLUXB5hQsdz78K/8cR69yyFyIgI7DUTqdprGZO3oP/OTAJJreZGb4i5WpfC7wwXXFxfVXFbORWAkQ8nWs0dfshaoQ==" }}},"Body": { "requestMessage": { "merchantID": "accenture_cybersource","merchantReferenceCode": "MRC-123","billTo": {"firstName": "John", "lastName": "Doe", "street1": "1295 Charleston Road","city": "Mountain View","state": "CA", "postalCode": "94043", "country": "US","email": "null@cybersource.com"}, "item": {"id": "0","unitPrice": "4002.00","quantity": "1"}, "purchaseTotals": { "currency": "USD" }, "card": { "accountNumber": "5555555555554444","expirationMonth": "11", "expirationYear": "2020"}, "taxService": { "run": "true"} } }}'
    }
};
global.empty = function (variable) {
    var isEmpty = true;
    if (variable) {
        isEmpty = false;
    }
    return isEmpty;
};

var createApiBasket = function (options) {
    var basket = {
        allProductLineItems: productLineItemMock,
        defaultShipment: {
            shipments: shipments,
            shippingAddress: shippingAddress
        }
    };
    basket.getAllProductLineItems = function () {
        return basket.allProductLineItems;
    };
    return basket;
};

var createtaxationResponse = function (success) {
    if (success) {
        taxationResponse = {
            'response': {
                'Decision': 'ACCEPT',
                'reasonCode': 100,
                'response': 'webreferences.CyberSourceTransaction.ReplyMessage@af816ddb',
                'totalTaxAmount': 7.89
            },
            'success': 'true'
        };
    } else {
        taxationResponse = {
            'response': {
                'Decision': 'DECLINE',
                'reasonCode': 102,
                'response': 'webreferences.CyberSourceTransaction.ReplyMessage@af816ddb',
                'totalTaxAmount': ''
            },
            'success': 'false'
        };
    }
};

describe('calculate tax hook', function () {
    var cart = createApiBasket();
    var session = {
        custom: {
            map: new Map(), // eslint-disable-line no-undef
            get: function (key) { // eslint-disable-line no-unused-vars
                return this.map.get(key);
            },
            set: function (key, value) { // eslint-disable-line no-unused-vars
                this.map.set(key, value);
            },
            key: ''
        }
    };
    global.session = session;
    var result = {
        'CartStateString': '701643465309M;1;82.99|5.99|82.99|98.98|NY|New York|US|10001|',
        'success': 'true'
    };
    var LibCybersource = proxyquire('../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/cybersource/libCybersource.js', {
        'dw/system/Site': siteMock
    });
    var TaxHelper = proxyquire('../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/helper/TaxHelper.ds', {
        'dw/system/Logger': loggerMock,
        'dw/util/HashMap': function () {
            return {
                result: {},
                put: function (key, context) {
                    this.result[key] = context;
                }
            };
        },
        'dw/value/Money': Money
    });
    var CommonHelper = proxyquire('../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/helper/CommonHelper.js', {
        'dw/system/Logger': loggerMock,
        'dw/system/Site': siteMock,
        'dw/util/ArrayList': ArrayList,
        'dw/util/StringUtils': ArrayList,
        '~/cartridge/scripts/utils/CybersourceConstants': CybersourceConstants

    });
    CommonHelper.CreateCartStateString = function () {
        return result;
    };
    var SoapServiceInit = proxyquire('../../../../../../cartridges/LINK_cybersource/cartridge/scripts/init/SoapServiceInit.ds', {
        'dw/util/HashMap': hashMapMock,
        'dw/rpc/SOAPUtil': soapUtilMock,
        'dw/svc/LocalServiceRegistry': localServiceRegistryMock
    });
    var TaxFacade = proxyquire('../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/facade/TaxFacade.js', {
        'dw/system/Logger': loggerMock,
        '~/cartridge/scripts/cybersource/libCybersource': LibCybersource,
        '~/cartridge/scripts/helper/TaxHelper': TaxHelper,
        '~/cartridge/scripts/init/SoapServiceInit': SoapServiceInit

    });
    TaxFacade.TaxationRequest = function () {
        return taxationResponse;
    };
    TaxFacade.TaxationRequest(cart);
    var success = result.success;
    var CartStateString = result.CartStateString;

    var taxesHook = proxyquire('../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/hooks/tax/taxes', {
        'dw/system/Logger': loggerMock,
        'dw/system/Status': statusMock,
        'dw/system/Site': siteMock,
        '~/cartridge/scripts/helper/TaxHelper': TaxHelper,
        '~/cartridge/scripts/helper/CommonHelper': CommonHelper,
        '~/cartridge/scripts/facade/TaxFacade': TaxFacade,
        'result': result,
        'success': success,
        'taxationResponse': taxationResponse

    });

    // for deleting session variable created
    var next = sinon.spy();
    beforeEach(function () {
        next = sinon.spy();
    });
    afterEach(function () {
        next.reset();
    });
    var status = {
        'OK': '200',
        'ERROR': '1'
    };

    it('should return status OK if both SkipTaxCalculation and cartStateString session variables are null', function () {
        createtaxationResponse(true);
        var SkipTaxCalculation = session.custom.set('SkipTaxCalculation', null);
        var cartStateString = session.custom.set('cartStateString', null);
        var taxResult = taxesHook.calculateTax(cart);
        assert.equal(taxResult.OK, status.OK);
    });
    it('should calculate taxes for simple basket with a single line item', function () {
        createtaxationResponse(true);
        var SkipTaxCalculation = session.custom.set('SkipTaxCalculation', false);
        var cartStateString = session.custom.set('cartStateString', result.CartStateString);
        var taxResult = taxesHook.calculateTax(cart);
        assert.equal(taxResult.OK, status.OK);
    });
    it('should return status ERROR for null Basket', function () {
        var cart = null;
        var taxResult = taxesHook.calculateTax(cart);
        assert.equal(taxResult.ERROR, status.ERROR);
    });
    it('should calculate taxes for simple basket with a single line item', function () {
        createtaxationResponse(false);
        var SkipTaxCalculation = session.custom.set('SkipTaxCalculation', true);
        var cartStateString = session.custom.set('cartStateString', result.CartStateString);
        var taxResult = taxesHook.calculateTax(cart);
        assert.equal(taxResult.ERROR, status.ERROR);
    });
})
    ;