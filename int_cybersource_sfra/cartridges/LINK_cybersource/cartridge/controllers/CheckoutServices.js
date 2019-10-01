'use strict';
var page = module.superModule;
var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

server.extend(page);
/**
 * Checks if a credit card is valid or not
 * @param {Object} card - plain object with card details
 * @param {Object} form - form object
 * @returns {boolean} a boolean representing card validation
 */

/**
 * PayPal custom address validation handling. Function validates all the billing address fields with email and phone number.
 */
server.post('ValidatePayPalBillingAddress', server.middleware.https, function (req, res, next) {
	var billingFormErrors = {};
	var pplFormErrors = {};
	var paymentForm = server.forms.getForm('billing');
	billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);
	
	var pplPhoneandEmailForm = new Object();
	pplPhoneandEmailForm.email = server.forms.getForm('billing').paypalBillingFields.paypalEmail;
	pplPhoneandEmailForm.phone = server.forms.getForm('billing').paypalBillingFields.paypalPhone;
	pplFormErrors = COHelpers.validatePPLForm(pplPhoneandEmailForm);
	
	//Update address fields as and when the fields are edited
	var Transaction = require('dw/system/Transaction');
	var BasketMgr = require('dw/order/BasketMgr');
	var currentBasket = BasketMgr.getCurrentBasket();
	var billingAddress = currentBasket.billingAddress;
	var defaultShipment, shippingAddress;
    defaultShipment = currentBasket.getDefaultShipment();
    shippingAddress = defaultShipment.getShippingAddress();
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
		if(!empty(paymentForm.paypalBillingFields.paypalEmail.value)) {
			currentBasket.setCustomerEmail(paymentForm.paypalBillingFields.paypalEmail.value);
		}
		if(!empty(paymentForm.paypalBillingFields.paypalPhone.value)) {
			billingAddress.setPhone(paymentForm.paypalBillingFields.paypalPhone.value);
			if(!empty(shippingAddress))
				shippingAddress.setPhone(paymentForm.paypalBillingFields.paypalPhone.value);
		}
		
	});
	
	if (Object.keys(billingFormErrors).length || Object.keys(pplFormErrors).length) {
	        // respond with form data and errors
	        res.json({
	            form: paymentForm,
	            fieldErrors: [billingFormErrors, pplFormErrors],
	            serverErrors: [],
	            error: true
	        });
	} else {
		session.privacy.paypalBillingIncomplete = false;
		// Copy over billing address to shipping for Paypal billing agreement
		
		 res.json({
	            form: paymentForm,
	            fieldErrors: [],
	            serverErrors: [],
	            error: false
	        });
	}
	return next();
});
 

server.replace('SubmitPayment', server.middleware.https, function (req, res, next) {
	var Site = require('dw/system/Site');
	var Resource = require('dw/web/Resource');
	var paymentForm = server.forms.getForm('billing');
	var paymentMethodID = server.forms.getForm('billing').paymentMethod.value; 
	var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var billingFormErrors = {};
    var creditCardErrors = {};
    var viewData = {};
    if(empty(session.forms.billing.creditCardFields.securityCode.value)){
    	session.forms.billing.creditCardFields.securityCode.value = request.httpParameterMap.securityCode.value;
    }
    
    if(paymentForm.paymentMethod.value == Resource.msg('paymentmethodname.paypal','cybersource',null)) {
    	handlePayPal(req, res, next);
    	return next();
    }
    
    //Secure Acceptance Flex Microform
	if(CsSAType == Resource.msg('cssatype.SA_FLEX','cybersource',null) && !req.form.storedPaymentUUID) {
		if(paymentForm.creditCardFields.flexresponse.value) {
			var flexResponse = paymentForm.creditCardFields.flexresponse.value;
			var flexString = JSON.parse(flexResponse);
			var keyId = flexString.keyId;
			paymentForm.creditCardFields.cardNumber.value = flexString.maskedPan;
			paymentForm.creditCardFields.cardType.value = flexString.cardType;
		}
	}
	if(((paymentMethodID == Resource.msg('paymentmethodname.creditcard','cybersource',null) && (CsSAType == Resource.msg('cssatype.SA_REDIRECT','cybersource',null) || CsSAType == Resource.msg('cssatype.SA_IFRAME','cybersource',null)))) || paymentMethodID == Resource.msg('paymentmethodname.alipay','cybersource',null)) {	    
	    var SAForm = new Object();
		    SAForm.paymentMethod = paymentForm.paymentMethod;
		    SAForm.email = paymentForm.creditCardFields.email;
		    SAForm.phone = paymentForm.creditCardFields.phone;
	}
	//BankTransfer
	if(paymentMethodID == Resource.msg('paymentmethodname.idl','cybersource',null) ||
			paymentMethodID == Resource.msg('paymentmethodname.sof','cybersource',null) ||
			paymentMethodID == Resource.msg('paymentmethodname.eps','cybersource',null) ||
			paymentMethodID == Resource.msg('paymentmethodname.gpy','cybersource',null) ||
			paymentMethodID == Resource.msg('paymentmethodname.mch','cybersource',null)
	) {
		    	var BankTransferForm = new Object();
		    	if(paymentMethodID == Resource.msg('paymentmethodname.eps','cybersource',null) ) {
					BankTransferForm.epsBic = server.forms.getForm('billing').epsBic;	
				} else if (paymentMethodID == Resource.msg('paymentmethodname.gpy','cybersource',null)) {
					BankTransferForm.giropayBic = server.forms.getForm('billing').giropayBic;	
				} else if (paymentMethodID == Resource.msg('paymentmethodname.idl','cybersource',null)) {
					BankTransferForm.bankListSelection = server.forms.getForm('billing').bankListSelection;	
				}
		    	BankTransferForm.paymentMethod = server.forms.getForm('billing').paymentMethod;
		    	BankTransferForm.email = server.forms.getForm('billing').creditCardFields.email;
				BankTransferForm.phone = server.forms.getForm('billing').creditCardFields.phone;
	} else{
		delete paymentForm.epsBic;
		delete paymentForm.giropayBic;
		delete paymentForm.bankListSelection;
	}
    // verify billing form data
    billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);
    if('paypalBillingFields' in paymentForm)
    	delete paymentForm.paypalBillingFields;
	    if(!req.form.storedPaymentUUID) {
	    	if(paymentMethodID == Resource.msg('paymentmethodname.creditcard','cybersource',null) 
	    			&& (CsSAType == null 
	    			|| CsSAType == Resource.msg('cssatype.SA_SILENTPOST','cybersource',null)
	    			|| CsSAType == Resource.msg('cssatype.SA_FLEX','cybersource',null))) {
				// verify credit card form data
	    			creditCardErrors = COHelpers.validateCreditCard(paymentForm);
	    		
	    		}  else if ((paymentMethodID == Resource.msg('paymentmethodname.creditcard','cybersource',null) 
	    				&& (CsSAType == Resource.msg('cssatype.SA_REDIRECT','cybersource',null) 
	    				|| CsSAType == Resource.msg('cssatype.SA_IFRAME','cybersource',null))) 
	    				|| paymentMethodID == Resource.msg('paymentmethodname.alipay','cybersource',null)) {
	    		// verify payment method, email and phone
	    			creditCardErrors = COHelpers.validateCreditCard(SAForm);
	    		} else if (paymentMethodID == Resource.msg('paymentmethodname.idl','cybersource',null) ||
	    				paymentMethodID == Resource.msg('paymentmethodname.sof','cybersource',null) ||
	    				paymentMethodID == Resource.msg('paymentmethodname.eps','cybersource',null) ||
	    				paymentMethodID == Resource.msg('paymentmethodname.gpy','cybersource',null) ||
	    				paymentMethodID == Resource.msg('paymentmethodname.mch','cybersource',null)) {
		    				creditCardErrors = COHelpers.validateCreditCard(BankTransferForm);
		    	}
	    	}
    
	    if (Object.keys(creditCardErrors).length || Object.keys(billingFormErrors).length) {
	        // respond with form data and errors
	        res.json({
	            form: paymentForm,
	            fieldErrors: [billingFormErrors, creditCardErrors],
	            serverErrors: [],
	            error: true
	        });
	    } else {
	        viewData.address = {
	            firstName: { value: paymentForm.addressFields.firstName.value },
	            lastName: { value: paymentForm.addressFields.lastName.value },
	            address1: { value: paymentForm.addressFields.address1.value },
	            address2: { value: paymentForm.addressFields.address2.value },
	            city: { value: paymentForm.addressFields.city.value },
	            postalCode: { value: paymentForm.addressFields.postalCode.value },
	            countryCode: { value: paymentForm.addressFields.country.value }
	        };
	
	        if (Object.prototype.hasOwnProperty
	            .call(paymentForm.addressFields, 'states')) {
	            viewData.address.stateCode =
	                { value: paymentForm.addressFields.states.stateCode.value };
	        }
	
	        viewData.paymentMethod = {
	            value: paymentForm.paymentMethod.value,
	            htmlName: paymentForm.paymentMethod.value
	        };
	
	        viewData.paymentInformation = {
	            cardType: {
	                value: paymentForm.creditCardFields.cardType.value,
	                htmlName: paymentForm.creditCardFields.cardType.htmlName
	            },
	            cardNumber: {
	                value: paymentForm.creditCardFields.cardNumber.value,
	                htmlName: paymentForm.creditCardFields.cardNumber.htmlName
	            },
	            securityCode: {
	                value: paymentForm.creditCardFields.securityCode.value,
	                htmlName: paymentForm.creditCardFields.securityCode.htmlName
	            },
	            expirationMonth: {
	                value: parseInt(
	                    paymentForm.creditCardFields.expirationMonth.selectedOption,
	                    10
	                ),
	                htmlName: paymentForm.creditCardFields.expirationMonth.htmlName
	            },
	            expirationYear: {
	                value: parseInt(paymentForm.creditCardFields.expirationYear.value, 10),
	                htmlName: paymentForm.creditCardFields.expirationYear.htmlName
	            }
	        };
	
	        if (req.form.storedPaymentUUID) {
	            viewData.storedPaymentUUID = req.form.storedPaymentUUID;
	        }
	
	        viewData.email = {
	            value: paymentForm.creditCardFields.email.value
	        };
	
	        viewData.phone = { value: paymentForm.creditCardFields.phone.value };
	
	        viewData.saveCard = paymentForm.creditCardFields.saveCard.checked;
	
	        res.setViewData(viewData);
	
	        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
	            var BasketMgr = require('dw/order/BasketMgr');
	            var CustomerMgr = require('dw/customer/CustomerMgr');
	            var HookMgr = require('dw/system/HookMgr');
	            var Resource = require('dw/web/Resource');
	            var PaymentMgr = require('dw/order/PaymentMgr');
	            var Transaction = require('dw/system/Transaction');
	            var AccountModel = require('*/cartridge/models/account');
	            var OrderModel = require('*/cartridge/models/order');
	            var URLUtils = require('dw/web/URLUtils');
	            var array = require('*/cartridge/scripts/util/array');
	            var Locale = require('dw/util/Locale');
	            var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
	            var currentBasket = BasketMgr.getCurrentBasket();
	            var billingData = res.getViewData();
	
	            if (!currentBasket) {
	                delete billingData.paymentInformation;
	
	                res.json({
	                    error: true,
	                    cartError: true,
	                    fieldErrors: [],
	                    serverErrors: [],
	                    redirectUrl: URLUtils.url('Cart-Show').toString()
	                });
	                return;
	            }
	
	            var billingAddress = currentBasket.billingAddress;
	            var billingForm = server.forms.getForm('billing');
	            var paymentMethodID = billingData.paymentMethod.value;
	            var result;
	
	            billingForm.creditCardFields.cardNumber.htmlValue = '';
	            billingForm.creditCardFields.securityCode.htmlValue = '';
	
	            Transaction.wrap(function () {
	                if (!billingAddress) {
	                    billingAddress = currentBasket.createBillingAddress();
	                }
	
	                billingAddress.setFirstName(billingData.address.firstName.value);
	                billingAddress.setLastName(billingData.address.lastName.value);
	                billingAddress.setAddress1(billingData.address.address1.value);
	                billingAddress.setAddress2(billingData.address.address2.value);
	                billingAddress.setCity(billingData.address.city.value);
	                billingAddress.setPostalCode(billingData.address.postalCode.value);
	                if (Object.prototype.hasOwnProperty.call(billingData.address, 'stateCode')) {
	                    billingAddress.setStateCode(billingData.address.stateCode.value);
	                }
	                billingAddress.setCountryCode(billingData.address.countryCode.value);
	
	                if (billingData.storedPaymentUUID) {
	                    billingAddress.setPhone(req.currentCustomer.profile.phone);
	                    currentBasket.setCustomerEmail(req.currentCustomer.profile.email);
	                } 
	                else if(currentBasket.customerEmail)
	                {
	                	billingAddress.setPhone(billingData.phone.value);
	                }
	                else {
	                    billingAddress.setPhone(billingData.phone.value);
	                    currentBasket.setCustomerEmail(billingData.email.value);
	                }
	            });
	
	            // if there is no selected payment option and balance is greater than zero
	            if (!paymentMethodID && currentBasket.totalGrossPrice.value > 0) {
	                var noPaymentMethod = {};
	
	                noPaymentMethod[billingData.paymentMethod.htmlName] =
	                    Resource.msg('error.no.selected.payment.method', 'creditCard', null);
	
	                delete billingData.paymentInformation;
	
	                res.json({
	                    form: billingForm,
	                    fieldErrors: [noPaymentMethod],
	                    serverErrors: [],
	                    error: true
	                });
	                return;
	            }
	
	            // check to make sure there is a payment processor
	            if (!PaymentMgr.getPaymentMethod(paymentMethodID).paymentProcessor) {
	                throw new Error(Resource.msg(
	                    'error.payment.processor.missing',
	                    'checkout',
	                    null
	                ));
	            }
	
	            var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();
	
	            if (billingData.storedPaymentUUID
	                && req.currentCustomer.raw.authenticated
	                && req.currentCustomer.raw.registered
	            ) {
	                var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
	                var paymentInstrument = array.find(paymentInstruments, function (item) {
	                    return billingData.storedPaymentUUID === item.UUID;
	                });
	
	                billingData.paymentInformation.cardNumber.value = paymentInstrument
	                    .creditCardNumber;
	                billingData.paymentInformation.cardType.value = paymentInstrument
	                    .creditCardType;
	                billingData.paymentInformation.securityCode.value = req.form.securityCode;
	                billingData.paymentInformation.expirationMonth.value = paymentInstrument
	                    .creditCardExpirationMonth;
	                billingData.paymentInformation.expirationYear.value = paymentInstrument
	                    .creditCardExpirationYear;
	                billingData.paymentInformation.creditCardToken = paymentInstrument
	                    .raw.creditCardToken;
	            }
	
	            if (HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
	                result = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(),
	                    'Handle',
	                    currentBasket,
	                    billingData.paymentInformation
	                );
	            } else {
	                result = HookMgr.callHook('app.payment.processor.default', 'Handle');
	            }
	
	            // need to invalidate credit card fields
	            if (result.error) {
	                delete billingData.paymentInformation;
	
	                res.json({
	                    form: billingForm,
	                    fieldErrors: result.fieldErrors,
	                    serverErrors: result.serverErrors,
	                    error: true
	                });
	                return;
	            }
	
	            if (!billingData.storedPaymentUUID
	                && req.currentCustomer.raw.authenticated
	                && req.currentCustomer.raw.registered
	                && billingData.saveCard
	                && (paymentMethodID === 'CREDIT_CARD')
	                && (CsSAType == null 
		                    || CsSAType.equals(Resource.msg('cssatype.SA_FLEX','cybersource',null))
	                   )
	            ) {
	                var customer = CustomerMgr.getCustomerByCustomerNumber(
	                    req.currentCustomer.profile.customerNo
	                );
	
	                var saveCardResult = COHelpers.savePaymentInstrumentToWallet(
	                    billingData,
	                    currentBasket,
	                    customer
	                );
	
	                req.currentCustomer.wallet.paymentInstruments.push({
	                    creditCardHolder: saveCardResult.creditCardHolder,
	                    maskedCreditCardNumber: saveCardResult.maskedCreditCardNumber,
	                    creditCardType: saveCardResult.creditCardType,
	                    creditCardExpirationMonth: saveCardResult.creditCardExpirationMonth,
	                    creditCardExpirationYear: saveCardResult.creditCardExpirationYear,
	                    UUID: saveCardResult.UUID,
	                    creditCardNumber: Object.hasOwnProperty.call(
	                        saveCardResult,
	                        'creditCardNumber'
	                    )
	                        ? saveCardResult.creditCardNumber
	                        : null,
	                    raw: saveCardResult
	                });
	            }
	
	            // Calculate the basket
	            Transaction.wrap(function () {
	                basketCalculationHelpers.calculateTotals(currentBasket);
	            });
	
	            // Re-calculate the payments.
	            var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
	                currentBasket
	            );
	
	            if (calculatedPaymentTransaction.error) {
	                res.json({
	                    form: paymentForm,
	                    fieldErrors: [],
	                    serverErrors: [Resource.msg('error.technical', 'checkout', null)],
	                    error: true
	                });
	                return;
	            }
	
	            var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
	            if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
	                req.session.privacyCache.set('usingMultiShipping', false);
	                usingMultiShipping = false;
	            }
	
	            var currentLocale = Locale.getLocale(req.locale.id);
	
	            var basketModel = new OrderModel(
	                currentBasket,
	                { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
	            );
	
	            var accountModel = new AccountModel(req.currentCustomer);
	            var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
	                req,
	                accountModel
	            );
	
	            delete billingData.paymentInformation;
				var options = {'paidWithPayPal' : false, 'selectedPayment' : 'others'};
	            res.json({
	                renderedPaymentInstruments: renderedStoredPaymentInstrument,
	                customer: accountModel,
	                order: basketModel,
	                form: billingForm,
	                error: false,
	                options : options
	            });
	        });
	    }
	    return next();
	});

server.post('SilentPostAuthorize',server.middleware.https, function (req, res, next) {
	var DFReferenceId = request.httpParameterMap.DFReferenceId;
	session.privacy.DFReferenceId = DFReferenceId;
	var URLUtils = require('dw/web/URLUtils');
	var OrderMgr = require('dw/order/OrderMgr');
	var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
	//Add null check here
	var order = OrderMgr.getOrder(session.privacy.orderId);
	session.privacy.orderId = '';
	var silentPostResponse = COHelpers.handleSilentPostAuthorize(order);
	
	if(silentPostResponse.error || silentPostResponse.declined || silentPostResponse.rejected) {
		Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
		session.privacy.orderId = '';
	}
	if (silentPostResponse.error) {
		res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)).toString());
	}  
	else if (silentPostResponse.declined) {
		session.custom.SkipTaxCalculation = false;
		res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
		return next();
    }else if (silentPostResponse.rejected) {
	    res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)).toString());
	    return next();
    }
	else if (silentPostResponse.authorized || silentPostResponse.review || silentPostResponse.process3DRedirection) {
		var customerObj = (!empty(customer) && customer.authenticated) ? customer : null;
		if(silentPostResponse.process3DRedirection){
			res.redirect(URLUtils.https('CheckoutServices-PayerAuthentication'));
			return next();
		}
		COHelpers.addOrUpdateToken(order, customerObj, res);
		session.privacy.orderId = order.orderNo;
		res.redirect(URLUtils.https('COPlaceOrder-SilentPostSubmitOrder'));
		return next();
                    
	} else {
		res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment' , 'SecureAcceptanceError', 'true' ));
		return next();
	}
	return next();
});

server.replace('PlaceOrder', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var HookMgr = require('dw/system/HookMgr');
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var Site = require('dw/system/Site');
	var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
	var paramMap = request.httpParameterMap;
	var DFReferenceId;
	if(request.httpParameterMap.DFReferenceId.submitted) {
		DFReferenceId = request.httpParameterMap.DFReferenceId.stringValue;
		session.privacy.DFReferenceId = DFReferenceId;
	}
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
    	if('isPaymentRedirectInvoked' in session.privacy && session.privacy.isPaymentRedirectInvoked
    		&& 'orderID' in session.privacy && null !== session.privacy.orderID) {
			var order = OrderMgr.getOrder(session.privacy.orderID);
			var currentBasket = COHelpers.reCreateBasket(order);
			res.redirect(URLUtils.url('Cart-Show'));
            return next();
			
    	} else {
        	res.json({
            	error: true,
            	cartError: true,
            	fieldErrors: [],
            	serverErrors: [],
            	redirectUrl: URLUtils.url('Cart-Show').toString()
        	});
        	 return next();
		}
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationOrderStatus = HookMgr.callHook(
        'app.validate.order',
        'validateOrder',
        currentBasket
    );
    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message
        });
        return next();
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });
        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });
        return next();
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });
    
    // Re-validates existing payment instruments
    var validPayment = COHelpers.validatePayment(req, currentBasket);
    if (validPayment.error) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
        });
        return next();
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);
        //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if ( !empty(order.getPaymentInstruments()) ) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }
    if (handlePaymentResult.error) {
    	if(paymentInstrument.paymentMethod != null 
    			&& (paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.creditcard','cybersource',null)
    	    			|| (CsSAType == Resource.msg('cssatype.SA_REDIRECT','cybersource',null) 
    	    			|| CsSAType == Resource.msg('cssatype.SA_SILENTPOST','cybersource',null)))
    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.alipay','cybersource',null)
    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.eps','cybersource',null)
    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.sof','cybersource',null)
    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.idl','cybersource',null)
    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.mch','cybersource',null)
    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.gpy','cybersource',null)
    	 ) {
    		 res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'PlaceOrderError', Resource.msg('error.technical', 'checkout', null)));
    	 } else {
	        res.json({
	            error: true,
	            errorMessage: Resource.msg('error.technical', 'checkout', null)
	        });
    	 }
        return next();
    }  else if (handlePaymentResult.returnToPage){
    	res.render('secureacceptance/secureAcceptanceIframeSummmary', {
   		 Order : handlePaymentResult.order
		});
       return next();
   } else if (handlePaymentResult.intermediate){
	   res.render(handlePaymentResult.renderViewPath, {
		   alipayReturnUrl : handlePaymentResult.alipayReturnUrl	
	   });
       return next();
    } else if (handlePaymentResult.intermediateSA) {
    	res.render(handlePaymentResult.renderViewPath, {
			 Data:handlePaymentResult.data, FormAction:handlePaymentResult.formAction
		});
    	return next();
    } else if (handlePaymentResult.intermediateSilentPost) {
    	res.render(handlePaymentResult.renderViewPath, {
    		requestData:handlePaymentResult.data, formAction:handlePaymentResult.formAction, cardObject:handlePaymentResult.cardObject
		});
    	return next();
   }
    else if (handlePaymentResult.redirection) {
    	res.redirect(handlePaymentResult.redirectionURL);
    	return next();
   }
    else if (handlePaymentResult.declined) {
    	 session.custom.SkipTaxCalculation = false;
    	 Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

    	 if(paymentInstrument.paymentMethod != null 
    			&& (paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.creditcard','cybersource',null)
    			&& (CsSAType == Resource.msg('cssatype.SA_REDIRECT','cybersource',null) 
    			|| CsSAType == Resource.msg('cssatype.SA_SILENTPOST','cybersource',null)))
    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.alipay','cybersource',null)
    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.eps','cybersource',null)
    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.sof','cybersource',null)
    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.idl','cybersource',null)
    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.mch','cybersource',null)
    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.gpy','cybersource',null)
    	 ){
    		 res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
    	 } else {
    	 res.json({
             error: true,
             errorMessage: Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)
         });
    	 }
         return next();
    } 
	else if (handlePaymentResult.missingPaymentInfo) {
   	    session.custom.SkipTaxCalculation = false;
	   	 Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

	   	 if(paymentInstrument.paymentMethod != null 
	    			&& (paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.creditcard','cybersource',null)
	    	    			&& (CsSAType == Resource.msg('cssatype.SA_REDIRECT','cybersource',null) 
	    	    			|| CsSAType == Resource.msg('cssatype.SA_SILENTPOST','cybersource',null)))
	    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.alipay','cybersource',null)
	    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.eps','cybersource',null)
	    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.sof','cybersource',null)
	    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.idl','cybersource',null)
	    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.mch','cybersource',null)
	    	    			|| paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.gpy','cybersource',null)
    	 ) {
    		 res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'PlaceOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
    	 } else {
		 	 res.json({
		          error: true,
		            errorMessage: Resource.msg('error.technical', 'checkout', null)
		      });
    	 }
	 	 return next();
    } else if (handlePaymentResult.rejected) {
    	Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
    	currentBasket = BasketMgr.getCurrentBasket();
    	Transaction.wrap(function () {
    		COHelpers.handlePayPal(currentBasket);
    	});
    	res.json({
	          error: true,
	          cartError : true,
	          redirectUrl: URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)).toString()
	      });
	    return next();
    } else if (handlePaymentResult.process3DRedirection){
		
		res.redirect(URLUtils.url('CheckoutServices-PayerAuthentication'));
		
        return next();
    }
    
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // Places the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }
	session.privacy.paypalShippingIncomplete = '';
	session.privacy.paypalBillingIncomplete = '';
    COHelpers.sendConfirmationEmail(order, req.locale.id);

        //  Set order confirmation status to not confirmed for REVIEW orders.
    if (session.custom.CybersourceFraudDecision == "REVIEW") {
        var Order = require('dw/order/Order');
        Transaction.wrap(function () {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        });
    }
	//  Reset decision session variable
    session.custom.CybersourceFraudDecision = "";
    session.custom.SkipTaxCalculation = false;
	session.custom.cartStateString = null;

	// Handle Authorized status for Payer Authentication flow
	if(DFReferenceId !== undefined && handlePaymentResult.authorized) {
		res.redirect(URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken));
        return next();
	}
	
    if(handlePaymentResult.authorized && 
            ( paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.googlepay','cybersource',null)
                || ( paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.paypal','cybersource',null) && !session.privacy.paypalminiCart))) {
		res.redirect(URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken));
        return next();
	}

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);
	var options = {'paidWithPayPal' : false, 'selectedPayment' : 'others'};
	
    res.json({
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('Order-Confirm').toString(),
        options: options
    });

    return next();
    
});

server.get('PayerAuthentication', server.middleware.https, function (req, res, next) {
	var OrderMgr = require('dw/order/OrderMgr');
	var order = OrderMgr.getOrder(session.privacy.order_id);
	var AcsURL =  session.privacy.AcsURL;
	var PAReq = session.privacy.PAReq;
	var PAXID = session.privacy.PAXID;
	session.privacy.AcsURL = '';
	session.privacy.PAReq = '';
	session.privacy.PAXID = '';
	
	var jwtUtil = require('*/cartridge/scripts/cardinal/JWTBuilder');
	var cardinalUtil = require('*/cartridge/scripts/cardinal/CardinalUtils');
	var OrderObject = cardinalUtil.getOrderObject(order);
	var orderdetailsObject = cardinalUtil.getOrderDetailsObject(order,session.privacy.authenticationTransactionID);
	OrderObject.setOrderDetails(orderdetailsObject);
	var jwtToken = jwtUtil.generateTokenWithKey(OrderObject);

	var orderstring = JSON.stringify(OrderObject);
	var auth = session.privacy.authenticationTransactionID;
	res.render('cart/cardinalpayerauthentication', {
		AcsURL:AcsURL,
		PAReq:PAReq,
		PAXID: PAXID,
		authenticationTransactionID : session.privacy.authenticationTransactionID,
		jwtToken:jwtToken,
		orderstring :orderstring,
		Order: order
	});
	return next();
});

server.get('InitPayerAuth', server.middleware.https, function (req, res, next) {
	var formaction=req.querystring.formaction;
	var BasketMgr = require('dw/order/BasketMgr');
	var URLUtils = require('dw/web/URLUtils');
	var OrderMgr = require('dw/order/OrderMgr');
	var order = OrderMgr.getOrder(session.privacy.order_id);
	var action = '';
	var currentBasket = !empty(BasketMgr.getCurrentBasket()) ? BasketMgr.getCurrentBasket() : order;
	if(!empty(BasketMgr.getCurrentBasket())){
		currentBasket = BasketMgr.getCurrentBasket();
		action = URLUtils.url('CheckoutServices-PlaceOrder');
	} else {
		action = URLUtils.url('CheckoutServices-SilentPostAuthorize');
	}
	
	var orderObject= "";
        var jwtToken ="";
        
        	var jwtUtil = require('*/cartridge/scripts/cardinal/JWTBuilder');       
            var cardinalUtil = require('*/cartridge/scripts/cardinal/CardinalUtils');        
            jwtToken = jwtUtil.generateTokenWithKey();       
            var OrderObject = cardinalUtil.getOrderObject(currentBasket);       
            orderObject = JSON.stringify(OrderObject);
	
	res.render('payerauthentication/songbird', {
		order: orderObject,
		jwtToken : jwtToken,
		action: action
	});
	return next();
});

/*Route to handle paypal submission. This route is called only when either 
	PayPal Express or PayPal billing agreement is called from either mini cart or cart page. */
function handlePayPal(req, res, next) {
	var billingFormErrors = {};
	var viewData = {};
	var Transaction = require('dw/system/Transaction');
	var URLUtils = require('dw/web/URLUtils');
	var BasketMgr = require('dw/order/BasketMgr');
	var paymentForm = server.forms.getForm('billing');
	
	var pplFormErrors = {};
	var pplPhoneandEmailForm = new Object();
	pplPhoneandEmailForm.email = server.forms.getForm('billing').paypalBillingFields.paypalEmail;
	pplPhoneandEmailForm.phone = server.forms.getForm('billing').paypalBillingFields.paypalPhone;
	pplFormErrors = COHelpers.validatePPLForm(pplPhoneandEmailForm);
	billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);
	
	if (Object.keys(billingFormErrors).length || Object.keys(pplFormErrors).length) {
		// respond with form data and errors
		res.json({
			form: paymentForm,
			fieldErrors: [billingFormErrors, pplFormErrors],
			serverErrors: [],
			error: true
		});
	} else {
		var currentBasket = BasketMgr.getCurrentBasket();
		var billingAddress = currentBasket.billingAddress;
		var billingForm = server.forms.getForm('billing');
		viewData.address = {
			firstName: { value: paymentForm.addressFields.firstName.value },
			lastName: { value: paymentForm.addressFields.lastName.value },
			address1: { value: paymentForm.addressFields.address1.value },
			address2: { value: paymentForm.addressFields.address2.value },
			city: { value: paymentForm.addressFields.city.value },
			postalCode: { value: paymentForm.addressFields.postalCode.value },
			countryCode: { value: paymentForm.addressFields.country.value }
		};
		if (Object.prototype.hasOwnProperty.call(paymentForm.addressFields, 'states')) {
			viewData.address.stateCode =
				{ value: paymentForm.addressFields.states.stateCode.value };
		}
		viewData.email = {
			value: paymentForm.paypalBillingFields.paypalEmail.value
		};
		viewData.phone = {
			value: paymentForm.paypalBillingFields.paypalPhone.value
		}; 
		res.setViewData(viewData);
		Transaction.wrap(function () {
			if (!billingAddress) {
				billingAddress = currentBasket.createBillingAddress();
			}
			var billingData = res.getViewData();
			billingAddress.setFirstName(billingData.address.firstName.value);
			billingAddress.setLastName(billingData.address.lastName.value);
			billingAddress.setAddress1(billingData.address.address1.value);
			billingAddress.setAddress2(billingData.address.address2.value);
			billingAddress.setCity(billingData.address.city.value);
			billingAddress.setPostalCode(billingData.address.postalCode.value);
			if (Object.prototype.hasOwnProperty.call(billingData.address, 'stateCode')) {
				billingAddress.setStateCode(billingData.address.stateCode.value);
			}
			billingAddress.setCountryCode(billingData.address.countryCode.value);
			billingAddress.setPhone(billingData.phone.value);
			currentBasket.setCustomerEmail(billingData.email.value);
		});
	 	var Locale = require('dw/util/Locale');
	 	var OrderModel = require('*/cartridge/models/order');
	 	var AccountModel = require('*/cartridge/models/account');
		var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
		if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
			req.session.privacyCache.set('usingMultiShipping', false);
			usingMultiShipping = false;
		}
		var currentLocale = Locale.getLocale(req.locale.id);
		var basketModel = new OrderModel(currentBasket, { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' });
		var accountModel = new AccountModel(req.currentCustomer);
		var paypalInstrument = COHelpers.getPayPalInstrument(currentBasket);
		var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
	                req,
	                accountModel
	            );
		res.json({
			renderedPaymentInstruments: renderedStoredPaymentInstrument,
			customer: accountModel,
			order: basketModel,
			form: billingForm,
			error: false
		});
	}
	return;
}


/**
 * Update shipping details in cart object
 */
function shippingUpdate(cart,shippingdetails) {
	var shipment = cart.defaultShipment;
	if (!empty(shipment.getShippingAddress())) {
		return {success:true};
	}
	try {
		var mobileAdaptor = require('*/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter');
		var result = mobileAdaptor.UpdateShipping(shippingdetails);
		return {success:true};
	} catch(err) {
		logger.error('Error creating shipment from Google pay address: {0}', err.message);
		return {error:true, errorMsg:err.message};
	}
};

server.post('GetGooglePayToken', function (req, res, next) {
	    var Encoding = require('dw/crypto/Encoding');
	    var repsonse = JSON.parse(request.httpParameterMap.paymentData); 
	
	    var paymentForm = server.forms.getForm('billing');

	    var BasketMgr = require('dw/order/BasketMgr');
	    var cart = BasketMgr.getCurrentBasket();
	    var shippingdetails = repsonse.shippingAddress;//add condition for only cart
	    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
	    var URLUtils = require('dw/web/URLUtils');
		var BasketMgr = require('dw/order/BasketMgr');
		var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
		var mobileAdaptor = require('*/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter');
		var cart = BasketMgr.getCurrentBasket();
		var Transaction = require('dw/system/Transaction');
		var logger = require('dw/system/Logger');
		logger.error("Error in google Checkout payment: problem in billing details"+repsonse);
		var result = mobileAdaptor.UpdateBilling(cart,repsonse.cardInfo,repsonse.email);
		// call the call back method for initSession Service/check Status service
		// only if shipping from cart
		if(result.success){
			
			var result = shippingUpdate(cart,shippingdetails);
			if (result.success) {
				var cart = BasketMgr.getCurrentBasket();
				//calculate cart and redirect to summary page
			    COHelpers.recalculateBasket(cart);
			    var StringUtils = require('dw/util/StringUtils');
			    var GPtoken = repsonse.paymentMethodToken.token;
			   session.privacy.encryptedDataGP = Encoding.toBase64(new dw.util.Bytes(GPtoken));
			}else {
			   logger.error("Error in google Checkout payment: problem in billing details");
			   googlePayCheckoutError(req, res, next);
			}
			
		     if(request.httpParameterMap.paymentData != null){				
		    	res.json({
			    	status:'success'
			    });
			    return next();
			}
		
		}else {
			logger.error("Error in google Checkout payment: problem in billing details");
			googlePayCheckoutError(req, res, next);
		}
	
});

/**
 * GooglePay Checkout returned error back to merchant site, further return user back to user journey starting page, either cart or billing page
 */
function googlePayCheckoutError(req, res, next) {
	var BasketMgr = require('dw/order/BasketMgr');
	var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CommonHelper');
	var cart = BasketMgr.getCurrentBasket();
	
	var paymentForm = server.forms.getForm('billing');
	
	//basket uuid check for security handling
	if (empty(cart.getPaymentInstruments(CybersourceConstants.METHOD_GooglePay))) {
        COHelpers.recalculateBasket(cart);

		var Status = require('dw/system/Status');
		res.render('cart/cart', {
			cart: cart,
			RegistrationStatus: false,
			BasketStatus: new Status(Status.ERROR, "GoogleCheckoutError")
		});
	} else {
		Transaction.wrap(function () {
	    	 CommonHelper.removeExistingPaymentInstruments(cart);
		});
        COHelpers.recalculateBasket(cart);
		res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'VisaCheckoutError', true));
	}
	return next();
}

server.post('SubmitPaymentGP' ,function (req, res, next) {
	var Site = require('dw/system/Site');
	var Encoding = require('dw/crypto/Encoding');
	var Resource = require('dw/web/Resource');
	var paymentForm = server.forms.getForm('billing');
	var paymentMethodID = server.forms.getForm('billing').paymentMethod.value; 
	var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
    var billingFormErrors = {};
    var creditCardErrors = {};
    var viewData = {};
    var BasketMgr = require('dw/order/BasketMgr');
	var paymentData = JSON.parse(request.httpParameterMap.googletoken);
	var GPtoken = paymentData.paymentMethodToken.token;
	session.privacy.encryptedDataGP = Encoding.toBase64(new dw.util.Bytes(GPtoken));

    var cart = BasketMgr.getCurrentBasket();
   	
    billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);
	
	if (Object.keys(billingFormErrors).length) {
	        // respond with form data and errors
	        res.json({
	            form: paymentForm,
	            fieldErrors: [billingFormErrors],
	            serverErrors: [],
	            error: true
	        });
	    }else {
	        viewData.address = {
	            firstName: { value: paymentForm.addressFields.firstName.value },
	            lastName: { value: paymentForm.addressFields.lastName.value },
	            address1: { value: paymentForm.addressFields.address1.value },
	            address2: { value: paymentForm.addressFields.address2.value },
	            city: { value: paymentForm.addressFields.city.value },
	            postalCode: { value: paymentForm.addressFields.postalCode.value },
	            countryCode: { value: paymentForm.addressFields.country.value }
	        };
	
	        if (Object.prototype.hasOwnProperty
	            .call(paymentForm.addressFields, 'states')) {
	            viewData.address.stateCode =
	                { value: paymentForm.addressFields.states.stateCode.value };
	        }
	
	        viewData.paymentMethod = {
	            value: paymentForm.paymentMethod.value,
	            htmlName: paymentForm.paymentMethod.value
	        };
			
	        viewData.email = {
	            value: paymentForm.creditCardFields.email.value
	        };
	
	        viewData.phone = { value: paymentForm.creditCardFields.phone.value };
	
	        viewData.saveCard = paymentForm.creditCardFields.saveCard.checked;
	
	        res.setViewData(viewData);
	
	        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
	            var BasketMgr = require('dw/order/BasketMgr');
	            var CustomerMgr = require('dw/customer/CustomerMgr');
	            var HookMgr = require('dw/system/HookMgr');
	            var Resource = require('dw/web/Resource');
	            var PaymentMgr = require('dw/order/PaymentMgr');
	            var Transaction = require('dw/system/Transaction');
	            var AccountModel = require('*/cartridge/models/account');
	            var OrderModel = require('*/cartridge/models/order');
	            var URLUtils = require('dw/web/URLUtils');
	            var Locale = require('dw/util/Locale');
	            var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
	            var currentBasket = BasketMgr.getCurrentBasket();
	            var billingData = res.getViewData();
	
	            if (!currentBasket) {
	                delete billingData.paymentInformation;
	
	                res.json({
	                    error: true,
	                    cartError: true,
	                    fieldErrors: [],
	                    serverErrors: [],
	                    redirectUrl: URLUtils.url('Cart-Show').toString()
	                });
	                return;
	            }
	
	            var billingAddress = currentBasket.billingAddress;
	            var billingForm = server.forms.getForm('billing');
	            var paymentMethodID = billingData.paymentMethod.value;
	            var result;
	
	            billingForm.creditCardFields.cardNumber.htmlValue = '';
	            billingForm.creditCardFields.securityCode.htmlValue = '';
	
	            Transaction.wrap(function () {
	                if (!billingAddress) {
	                    billingAddress = currentBasket.createBillingAddress();
	                }
	
	                billingAddress.setFirstName(billingData.address.firstName.value);
	                billingAddress.setLastName(billingData.address.lastName.value);
	                billingAddress.setAddress1(billingData.address.address1.value);
	                billingAddress.setAddress2(billingData.address.address2.value);
	                billingAddress.setCity(billingData.address.city.value);
	                billingAddress.setPostalCode(billingData.address.postalCode.value);
	                if (Object.prototype.hasOwnProperty.call(billingData.address, 'stateCode')) {
	                    billingAddress.setStateCode(billingData.address.stateCode.value);
	                }
	                billingAddress.setCountryCode(billingData.address.countryCode.value);
	
	                if (billingData.storedPaymentUUID) {
	                    billingAddress.setPhone(req.currentCustomer.profile.phone);
	                    currentBasket.setCustomerEmail(req.currentCustomer.profile.email);
	                } else {
	                    billingAddress.setPhone(billingData.phone.value);
	                    currentBasket.setCustomerEmail(billingData.email.value);
	                }
	            });
	
	
	            var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();
	
			//	Add hook to call google payment
				var mobileAdaptor = require('*/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter');
				var result = mobileAdaptor.UpdateBilling(currentBasket,paymentData.cardInfo,paymentData.email);
	
	            // Calculate the basket
	            Transaction.wrap(function () {
	                basketCalculationHelpers.calculateTotals(currentBasket);
	            });
	
	            // Re-calculate the payments.
	            var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(currentBasket);
	
	            if (calculatedPaymentTransaction.error) {
	                res.json({
	                    form: paymentForm,
	                    fieldErrors: [],
	                    serverErrors: [Resource.msg('error.technical', 'checkout', null)],
	                    error: true
	                });
	                return;
	            }
	            
	            // return back google 
	            if(result.success){
		            if(request.httpParameterMap.paymentData != null){				
			    	res.json({
	                error: false
	            });
			    	
					}
		            
	            }
	           
	        });
		}
		return next();
});

module.exports = server.exports();