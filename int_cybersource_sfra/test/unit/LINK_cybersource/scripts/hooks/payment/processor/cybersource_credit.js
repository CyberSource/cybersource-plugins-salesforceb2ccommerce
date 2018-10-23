'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var ArrayList = require('../../../../../../mocks/dw.util.Collection');
var loggerMock = require('../../../../../../mocks/dw/system/Logger');
var CybersourceConstants = require('../../../../../../../cartridges/LINK_cybersource/cartridge/scripts/utils/CybersourceConstants');
var BasketMgr = require('../../../../../../mocks/dw/order/BasketMgr');
var Money = require('../../../../../../mocks/dw.value.Money');
var PaymentMgr = require('../../../../../../mocks/dw/order/PaymentMgr');

var siteMock = {
	    getCurrent: function () {
	        return {
	            getCustomPreferenceValue: function () {
	            	return {
						value:  'SA_FLEX'
	            	};
	            }
	        };
	    }
};

var createSubscriptionMyAccountResult = '';
var PaymentStatusCodes = {
    PaymentStatusCodes: function () { }
};
var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () { },
    commit: function () { }
};
var Resource = {
    msg: function (param) {
        return param;
    }
};


var CommonHelper = proxyquire('../../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/helper/CommonHelper.js', {
    'dw/system/Logger': loggerMock,
    'dw/system/Site': siteMock,
    'dw/util/ArrayList': ArrayList,
    'dw/util/StringUtils': ArrayList,
    '~/cartridge/scripts/utils/CybersourceConstants': CybersourceConstants

});

CommonHelper.CalculateNonGiftCertificateAmount = function () {
    return "amount";
};

CommonHelper.removeExistingPaymentInstruments = function () {
    return true;
};
var currentBasketMock = {
		createPaymentInstrument:function(){
			return 'SA_REDIRECT';	
		}
};
var cart = BasketMgr;
var PaymentMethod = "CREDIT_CARD";
cart.createPaymentInstrument = function () {
	return "paymentInstrument";
}

var Cybersource = proxyquire('../../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/Cybersource.js', {
    'dw/system/Logger': loggerMock,
    'dw/system/Site': siteMock,
    'dw/order/PaymentMgr': PaymentMgr,
    '~/cartridge/scripts/utils/CybersourceConstants': CybersourceConstants,
    '~/cartridge/scripts/helper/CommonHelper': CommonHelper,
    'dw/system/Transaction': transaction
});

Cybersource.HandleCard = function() {
	  return {error: false};
};

var CybersourceCredit = proxyquire('../../../../../../../../int_cybersource_sfra/cartridges/LINK_cybersource/cartridge/scripts/hooks/payment/processor/cybersource_credit.js', {
    'dw/web/Resource': Resource,
    'LINK_cybersource/cartridge/scripts/Cybersource': Cybersource,
    'dw/system/Transaction': transaction,
    'dw/order/PaymentMgr': PaymentMgr,
    'dw/order/PaymentInstrument': {},
    '*/cartridge/scripts/util/collections': ArrayList,
    'dw/order/PaymentStatusCodes': PaymentStatusCodes,
    'createSubscriptionMyAccountResult': createSubscriptionMyAccountResult,
    '~/cartridge/scripts/utils/CybersourceConstants': CybersourceConstants,
    'dw/system/Site': siteMock,
    'dw/order/BasketMgr': {
        getCurrentBasket: function () {
            return currentBasketMock;
        }
    },
    '~/cartridge/scripts/helper/CommonHelper': CommonHelper,
    'dw/value/Money': Money
});

var createsubsciptiontoken = function (sucess) {
    if (sucess) {
        createSubscriptionMyAccountResult = {
            'Decision': 'ACCEPT',
            'reasonCode': 100,
            'oK': 'true',
            'subscriptionID': '736216CA1035115AE05341588E0A16A5'
        };
    } else {
        createSubscriptionMyAccountResult = {
            'error': 'true',
            'Decision': 'DECLINE',
            'reasonCode': 102,
            'oK': 'false',
            'subscriptionID': ''
        };
    }
};

describe('Create Payment Token', function () {
    Cybersource.CreateSubscriptionMyAccount = function () {
        return createSubscriptionMyAccountResult;
    };
    var module = {
        equalsIgnoreCase: function () {
            return 'account';
        }
    };
    it('Return false if payment token created susccessfully from account page', function () {
        createsubsciptiontoken(true);
        var CreatePaymentTokenResult = CybersourceCredit.CreatePaymentToken(module);
        assert.equal(CreatePaymentTokenResult.error, false);
    });
    it('Return true if payment token not created susccessfully from account page', function () {
        createsubsciptiontoken(false);
        var CreatePaymentTokenResult = CybersourceCredit.CreatePaymentToken(module);
        assert.equal(CreatePaymentTokenResult.error, true);
    });

    module = {
        equalsIgnoreCase: function () {
            return 'checkout';
        }
    };
    it('Return false if payment token created susccessfully from checkout', function () {
        createsubsciptiontoken(true);
        var CreatePaymentTokenResult = CybersourceCredit.CreatePaymentToken(module);
        assert.equal(CreatePaymentTokenResult.error, false);
    });
    it('Return true if payment token not created susccessfully from checkout', function () {
        createsubsciptiontoken(false);
        var CreatePaymentTokenResult = CybersourceCredit.CreatePaymentToken(module);
        assert.equal(CreatePaymentTokenResult.error, true);
    });
});


describe('Handle', function () {
    it('Return false if credit card is valid ', function () {
        global.session = {
            forms: {
                billing: {
                    paymentMethod: {
                        value: {
                            toString: function () {
                                return 'CREDIT_CARD';
                            },
                            equals: function (a) {
                                return (a === 'CREDIT_CARD');
                            }
                        }
                    }
                }
            }
        };

        var paymentInformation = {
            cardNumber: { value: '4111111111111' },
            securityCode: { value: '123' },
            expirationMonth: { value: '5' },
            expirationYear: { value: '2022' },
            cardType: { value: 'Visa' },
            creditCardToken: { value: '' }
        };

        var basket = {};

        var handleCCResult = CybersourceCredit.Handle(basket, paymentInformation);
        assert.equal(handleCCResult.error, false);
    });
    
    it('Return false if credit card is valid: SA is REDIRECT/IFRAME ', function () {
        global.session = {
            forms: {
                billing: {
                    paymentMethod: {
                        value: {
                            toString: function () {
                                return 'CREDIT_CARD';
                            },
                            equals: function (a) {
                                return (a === 'CREDIT_CARD');
                            }
                        }
                    }
                }
            }
        };

        var paymentInformation = {
            cardNumber: { value: '4111111111111' },
            securityCode: { value: '123' },
            expirationMonth: { value: '5' },
            expirationYear: { value: '2022' },
            cardType: { value: 'Visa' },
            creditCardToken: { value: '' }
        };

        var basket = {};

        var handleCCResult = CybersourceCredit.Handle(basket, paymentInformation);
        assert.equal(handleCCResult.sucess, true);
    });
});
