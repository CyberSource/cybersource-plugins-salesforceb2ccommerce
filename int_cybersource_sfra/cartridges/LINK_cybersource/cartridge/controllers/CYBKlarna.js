'use strict';

var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');

var klarnaFacade = require('~/cartridge/scripts/klarna/facade/KlarnaFacade');
var CybersourceHelper = require('~/cartridge/scripts/cybersource/libCybersource').getCybersourceHelper();
var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');


server.post('GetSession', function (req, res, next) {

    var basket = BasketMgr.getCurrentBasket();

    var returnObject = {};
    
    var email = session.forms.billing.klarnaEmail.value;
    
    if(email == null)
    {
    	returnObject.error = true; 
        returnObject.decision = 'REJECT';
        res.cacheExpiration(0);
        res.json(returnObject);
        next();
    }
        //  Update billing address with posted form values and email param.
    updateBillingAddress(basket);

        //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if ( !empty(basket.getPaymentInstruments()) ) {
        paymentInstrument = basket.getPaymentInstruments()[0];
    }

        //  Make sure payment information has been set.
    if ( empty(paymentInstrument) || empty(paymentInstrument.paymentMethod) || (paymentInstrument.paymentMethod != "KLARNA") ) {
        setKlarnaPaymentMethod(basket);
    }

        //  Initialize data.
	var signature = CreateKlarnaSecureKey(basket);
	var shipTo, billTo, purchaseObject;
	var URLUtils = require('dw/web/URLUtils');
	var cancelURL = URLUtils.https('COPlaceOrder-Submit','provider','cancelfail','signature',encodeURIComponent(signature),'cfk',true).toString();
	var successURL = URLUtils.https('COPlaceOrder-Submit','provider','klarna','signature',encodeURIComponent(signature)).toString();
	var failureURL = URLUtils.https('COPlaceOrder-Submit','provider','cancelfail','signature',encodeURIComponent(signature),'cfk',true).toString();
	var klarnaPaymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    var UUID = basket.UUID;
    
	    // Create billto, shipto, item and purchase total object
    var BillTo_Object = require('~/cartridge/scripts/cybersource/Cybersource_BillTo_Object');
    var billTo = new BillTo_Object();
    // create billto, item and purchase total object
    billTo.setCountry(basket.billingAddress.countryCode);
    billTo.setState(basket.billingAddress.stateCode);
    billTo.setPostalCode(basket.billingAddress.postalCode);
	var result = CommonHelper.CreateCybersourcePurchaseTotalsObject(basket);
	purchaseObject = result.purchaseTotals;
	result = CommonHelper.CreateKlarnaItemObject(basket);
    var items = result.items;
    
	    // Create a session object
	var sessionObject = {};
	sessionObject.billTo = billTo;
	sessionObject.purchaseObject = purchaseObject;
	sessionObject.items = items;
	sessionObject.klarnaPaymentType = klarnaPaymentType;
	sessionObject.cancelURL = cancelURL;
	sessionObject.successURL = successURL;
	sessionObject.failureURL = failureURL;
	sessionObject.UUID = UUID;
	
	    // call session method of facade to create session request
    var response = klarnaFacade.klarnaInitSessionService(sessionObject);
    
	
	    //return the response as per decision and reason code
	if (response.decision === 'ACCEPT' && response.reasonCode.get() === 100 && !empty(response.apSessionsReply.processorToken) ) {
		    //set the processor token into session variable
		session.privacy.processorToken = response.apSessionsReply.processorToken;
		session.privacy.requestID = response.requestID;
        returnObject.error = false;
        returnObject.decision = response.decision;
        returnObject.reasonCode = response.reasonCode.get();
        returnObject.sessionToken = response.apSessionsReply.processorToken;
            //  Save token to session in case customer leaves billing page and goes back.
        session.privacy.klarnaSessionToken = response.apSessionsReply.processorToken;
        //returnObject.reconciliationID = response.apSessionsReply.reconciliationID;
	} else {
        returnObject.error = true;
        returnObject.decision = response.decision;
        returnObject.reasonCode = response.reasonCode.get();
	}

    res.cacheExpiration(0);
    res.json(returnObject);
    next();

});

server.post('UpdateSession', function (req, res, next) {

    var basket = BasketMgr.getCurrentBasket();

        //  Make sure payment information has been set.
    if ( empty(basket.paymentInstrument) || empty(basket.paymentInstrument.paymentMethod) || (basket.paymentInstrument.paymentMethod != "KLARNA") ) {
        setKlarnaPaymentMethod(basket);
    }

        //  Initialize data.
	var signature = CreateKlarnaSecureKey(basket);
	var shipTo, billTo, purchaseObject;
	var URLUtils = require('dw/web/URLUtils');
	var cancelURL = URLUtils.https('COPlaceOrder-Submit','provider','cancelfail','signature',encodeURIComponent(signature),'cfk',true).toString();
	var successURL = URLUtils.https('COPlaceOrder-Submit','provider','klarna','signature',encodeURIComponent(signature)).toString();
	var failureURL = URLUtils.https('COPlaceOrder-Submit','provider','cancelfail','signature',encodeURIComponent(signature),'cfk',true).toString();
	var klarnaPaymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
    var UUID = basket.UUID;
    
	    // Create billto, shipto, item and purchase total object
    var result = CommonHelper.CreateCyberSourceBillToObject(basket,true);
	billTo = result.billTo;
	billTo.setLanguage(CommonHelper.GetRequestLocale());
	result = CommonHelper.CreateCybersourceShipToObject(basket);
	shipTo = result.shipTo;
	result = CommonHelper.CreateCybersourcePurchaseTotalsObject(basket);
	purchaseObject = result.purchaseTotals;
	result = CommonHelper.CreateKlarnaItemObject(basket);
    var items = result.items;
    
	    // Create a session object
	var sessionObject = {};
	sessionObject.billTo = billTo;
	sessionObject.shipTo = shipTo;
	sessionObject.purchaseObject = purchaseObject;
	sessionObject.items = items;
	sessionObject.klarnaPaymentType = klarnaPaymentType;
	sessionObject.cancelURL = cancelURL;
	sessionObject.successURL = successURL;
	sessionObject.failureURL = failureURL;
	sessionObject.UUID = UUID;
	
	    // call session method of facade to create session request
    var response = klarnaFacade.klarnaUpdateSessionService(sessionObject);
    var returnObject = {};
	
	    //return the response as per decision and reason code
	if (response.decision === 'ACCEPT' && response.reasonCode.get() === 100) {
		    //set the processor token into session variable
        returnObject.error = false;
        returnObject.decision = response.decision;
        returnObject.reasonCode = response.reasonCode.get();
        returnObject.sessionToken = response.apSessionsReply.processorToken;
            //  Save token to session in case customer leaves billing page and goes back.
        session.privacy.klarnaSessionToken = response.apSessionsReply.processorToken;
        //returnObject.reconciliationID = response.apSessionsReply.reconciliationID;
	} else {
        returnObject.error = true;
        returnObject.decision = response.decision;
        returnObject.reasonCode = response.reasonCode.get();
	}

    res.cacheExpiration(0);
    res.json(returnObject);
    next();

});


function updateBillingAddress(basket) {
    var sesh = session; // For debugging.

    var address1 = session.forms.billing.addressFields.address1.value;
    var address2 = session.forms.billing.addressFields.address2.value;
    var addressID = session.forms.billing.addressFields.addressId.value;
    var city = session.forms.billing.addressFields.city.value;
    var country = session.forms.billing.addressFields.country.value;
    var firstName = session.forms.billing.addressFields.firstName.value;
    var lastName = session.forms.billing.addressFields.lastName.value;
    var phone = session.forms.billing.addressFields.phone.value;
    var postalCode = session.forms.billing.addressFields.postalCode.value;
    var state = session.forms.billing.addressFields.states.stateCode.value;
    var email = session.forms.billing.klarnaEmail.value;

    Transaction.wrap(function () {
        var billingAddress = basket.billingAddress;
        if (!billingAddress) {
            billingAddress = basket.createBillingAddress();
        }
        billingAddress.setFirstName(firstName);
        billingAddress.setLastName(lastName);
        billingAddress.setAddress1(address1);
        billingAddress.setAddress2(address2);
        billingAddress.setCity(city);
        billingAddress.setPostalCode(postalCode);
        billingAddress.setStateCode(state);
        billingAddress.setCountryCode(country);
        billingAddress.setPhone(phone);
        basket.setCustomerEmail(email);
    });
}

function setKlarnaPaymentMethod(basket) {
    var Cart = require('~/cartridge/models/cart');
    var currentCart = new Cart(basket);
    Transaction.wrap(function () {
        CommonHelper.removeExistingPaymentInstruments(basket);
        var paymentInstrument = basket.createPaymentInstrument('KLARNA', currentCart.getNonGiftCertificateAmount);
    });
}

function CreateKlarnaSecureKey(basket){
	//declare variables to create signature
	var sessionId = session.sessionID;
	var paymentType = CybersourceConstants.KLARNA_PAYMENT_TYPE;
	var merchantId = CybersourceHelper.getMerchantID();
	var merchantKey = CybersourceHelper.getSoapSecurityKey();
	var amount = basket.totalGrossPrice.value;
	var token = sessionId+paymentType+merchantId+amount;
	//call method of common helper to create a signature
	var signature = CommonHelper.signedDataUsingHMAC256(token,merchantKey);
	//return the signature
	return signature;
}

/*
 * Module exports
 */
module.exports = server.exports();
