'use strict';

var page = module.superModule;
var server = require('server');

server.extend(page);

server.append('Begin', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Locale = require('dw/util/Locale');
    var Resource = require('dw/web/Resource');
    var OrderModel = require('*/cartridge/models/order');
	var currentBasket = BasketMgr.getCurrentBasket();
	var VisaCheckout = require('~/cartridge/scripts/visacheckout/helper/VisaCheckoutHelper');
	var VInitFormattedString = '', signature = '';
	var result = VisaCheckout.Initialize(false);//no delivery address in lightbox
	if (result.success) {
		VInitFormattedString = result.VInitFormattedString;
		signature = result.signature;
	}
	// TO handle the visa checkout click even on cart and billing page from mini cart
    session.privacy.cyb_CurrentPage = 'CybBilling'; 
	var usingMultiShipping = false; // Current integration support only single shpping
		req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);
	var currentLocale = Locale.getLocale(req.locale.id);
    var basketModel = new OrderModel(currentBasket, { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' });
        
        //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if ( !empty(currentBasket.getPaymentInstruments()) ) {
        paymentInstrument = currentBasket.getPaymentInstruments()[0];
    }
	if(paymentInstrument != null && paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.googlepay','cybersource',null)){
		var cardType = paymentInstrument.creditCardType; 
	    basketModel.billing.payment.selectedPaymentInstruments[0].type = cardType;
	    basketModel.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = paymentInstrument.creditCardNumber;
	}
	
	if(paymentInstrument != null && paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.visacheckout','cybersource',null)) {
		var cardType = paymentInstrument.creditCardType; 
			session.forms.billing.creditCardFields.cardType.value = cardType;
		    basketModel.resources.cardType = '';
		    basketModel.resources.cardEnding = '';
		    basketModel.billing.payment.selectedPaymentInstruments[0].type = cardType;
		    basketModel.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber = paymentInstrument.creditCardNumber;
		    basketModel.billing.payment.selectedPaymentInstruments[0].expirationMonth = paymentInstrument.creditCardExpirationMonth;
		    basketModel.billing.payment.selectedPaymentInstruments[0].expirationYear = paymentInstrument.creditCardExpirationYear;
	}
	var Countries = require('~/cartridge/scripts/utils/Countries');
	var countryCode = Countries.getCurrent({
        CurrentRequest: {
            locale: request.locale
        }
    }).countryCode;
	var PaymentMgr = require('dw/order/PaymentMgr');
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	 var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
	var paymentAmount = CommonHelper.CalculateNonGiftCertificateAmount(currentBasket);
	var applicablePaymentMethods = PaymentMgr.getApplicablePaymentMethods(customer, countryCode, paymentAmount.value);
	var paypalBillingFields = 'paypalBillingIncomplete' in session.privacy && session.privacy.paypalBillingIncomplete ? true : false;
	var paidWithPayPal = false, selectedPayment = 'others';
	var paymentClass = 'place-order';
	paidWithPayPal = CommonHelper.ValidatePayPalInstrument(currentBasket, basketModel);
	var nonGCPaymentInstrument = COHelpers.getNonGCPaymemtInstument(currentBasket);
	if(nonGCPaymentInstrument != null) {
		selectedPayment = nonGCPaymentInstrument.paymentMethod == Resource.msg('paymentmethodname.paypal','cybersource',null) || 
							nonGCPaymentInstrument.paymentMethod == Resource.msg('paymentmethodname.paypalcredit','cybersource',null)? Resource.msg('paymentmethodname.paypal','cybersource',null) : 'others';
		if(!paypalBillingFields)
		{
			paymentClass = CommonHelper.GetPaymentClass(nonGCPaymentInstrument);
		}
	}
	var viewData = res.getViewData();
    viewData = {
            VInitFormattedString: VInitFormattedString,
            Signature: signature,
            Basket: currentBasket,
            order: basketModel,
            selectedPayment : selectedPayment,
            paypalBillingFields : paypalBillingFields,
            paidWithPayPal : paidWithPayPal,
            applicablePaymentMethods : applicablePaymentMethods,
            currentLocale : currentLocale,
            paymentClass : paymentClass
    };
    res.setViewData(viewData);
    next();
});

server.post('SetBillingAddress', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var paymentForm = server.forms.getForm('billing');
	var currentBasket = BasketMgr.getCurrentBasket();
	var billingAddress = currentBasket.billingAddress;
	Transaction.wrap(function () {
		if (!billingAddress) {
			billingAddress = currentBasket.createBillingAddress();
		}
		if(!empty(paymentForm.addressFields.firstName.value)) {
			billingAddress.setFirstName(paymentForm.addressFields.firstName.value);
		}
		if(!empty(paymentForm.addressFields.lastName.value)) {
			billingAddress.setLastName(paymentForm.addressFields.lastName.value);
		}
		if(!empty(paymentForm.addressFields.address1.value)) {
			billingAddress.setAddress1(paymentForm.addressFields.address1.value);
		}
		if(!empty(paymentForm.addressFields.address2.value)) {
			billingAddress.setAddress2(paymentForm.addressFields.address2.value);
		}
		if(!empty(paymentForm.addressFields.city.value)) {
			billingAddress.setCity(paymentForm.addressFields.city.value);
		}
		if(!empty(paymentForm.addressFields.postalCode.value)) {
			billingAddress.setPostalCode(paymentForm.addressFields.postalCode.value);
		}
		
		if (Object.prototype.hasOwnProperty.call(paymentForm.addressFields, 'states')) {
			billingAddress.setStateCode(paymentForm.addressFields.states.stateCode.value);
		}
		if(!empty(paymentForm.addressFields.country.value)) {
			billingAddress.setCountryCode(paymentForm.addressFields.country.value);
		}
	});
	res.json({
        error: false,
    });
	next();
});

server.prepend('Begin', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Locale = require('dw/util/Locale');
    var Resource = require('dw/web/Resource');
    var OrderMgr = require('dw/order/OrderMgr');
    var URLUtils = require('dw/web/URLUtils');
    var OrderModel = require('*/cartridge/models/order');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var currentStage = req.querystring.stage;
	var currentBasket = BasketMgr.getCurrentBasket();
	if (!currentBasket) {
    	if('isPaymentRedirectInvoked' in session.privacy && session.privacy.isPaymentRedirectInvoked
    		&& 'orderID' in session.privacy && null !== session.privacy.orderID) {
			var order = OrderMgr.getOrder(session.privacy.orderID);
			var currentBasket = COHelpers.reCreateBasket(order);
			res.redirect(URLUtils.url('Cart-Show'));
    	} else {
        	res.json({
            	error: true,
            	cartError: true,
            	fieldErrors: [],
            	serverErrors: [],
            	redirectUrl: URLUtils.url('Cart-Show').toString()
        	});
		}
	}
    next();
});
module.exports = server.exports();