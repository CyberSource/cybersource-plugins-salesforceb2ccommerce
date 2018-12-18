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
server.replace('SubmitPayment', server.middleware.https, function (req, res, next) {
	var Site = require('dw/system/Site');
	var paymentForm = server.forms.getForm('billing');
	var paymentMethodID = server.forms.getForm('billing').paymentMethod.value; 
	var CsSAType = Site.getCurrent().getCustomPreferenceValue("CsSAType").value;
    var billingFormErrors = {};
    var creditCardErrors = {};
    var viewData = {};
    
    //Secure Acceptance Flex Microform
	if(CsSAType == 'SA_FLEX' && !req.form.storedPaymentUUID) {
		var flexForm = new Object();
		   flexForm.paymentMethod = server.forms.getForm('billing').paymentMethod;
		   flexForm.expirationMonth = server.forms.getForm('billing').creditCardFields.expirationMonth;
		   flexForm.expirationYear = server.forms.getForm('billing').creditCardFields.expirationYear;
		   flexForm.securityCode = server.forms.getForm('billing').creditCardFields.securityCode;
		   flexForm.email = server.forms.getForm('billing').creditCardFields.email;
		   flexForm.phone = server.forms.getForm('billing').creditCardFields.phone;
		if(server.forms.getForm('billing').creditCardFields.flexresponse.value) {
			var flexResponse = server.forms.getForm('billing').creditCardFields.flexresponse.value;
			var flexString = JSON.parse(flexResponse);
			var keyId = flexString.keyId;
			paymentForm.creditCardFields.cardNumber.value = flexString.maskedPan;
			paymentForm.creditCardFields.cardType.value = flexString.cardType;
		}
	}
	
	if(CsSAType == 'SA_REDIRECT' || CsSAType == 'SA_IFRAME') {	    
	    var SAForm = new Object();
		    SAForm.paymentMethod = server.forms.getForm('billing').paymentMethod;
		    SAForm.email = server.forms.getForm('billing').creditCardFields.email;
		    SAForm.phone = server.forms.getForm('billing').creditCardFields.phone;
	}
    // verify billing form data
    billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);
    
	    if(!req.form.storedPaymentUUID) {
	    	if(paymentMethodID == "CREDIT_CARD") {
	    		if(CsSAType == null || CsSAType == "SA_SILENTPOST") {
				// verify credit card form data
	    			creditCardErrors = COHelpers.validateCreditCard(paymentForm);
	    		} else if (CsSAType == 'SA_FLEX') {
	    			creditCardErrors = COHelpers.validateCreditCard(flexForm);
	    		} else {
	    		// verify payment method, email and phone
	    			creditCardErrors = COHelpers.validateCreditCard(SAForm);
	    		}
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
	                } else {
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
	
	            res.json({
	                renderedPaymentInstruments: renderedStoredPaymentInstrument,
	                customer: accountModel,
	                order: basketModel,
	                form: billingForm,
	                error: false
	            });
	        });
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

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
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
    if (handlePaymentResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    } else if (handlePaymentResult.returnToPage){
    	res.render('secureacceptance/secureAcceptanceIframeSummmary', {
    		 Order : handlePaymentResult.order
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
   } else if (handlePaymentResult.declined) {
    	 session.custom.SkipTaxCalculation = false;
    	 Transaction.wrap(function () { OrderMgr.failOrder(order); });
    	 res.json({
             error: true,
             errorMessage: Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)
         });
         return next();
    } else if (handlePaymentResult.missingPaymentInfo) {
   	     session.custom.SkipTaxCalculation = false;
	   	 Transaction.wrap(function () { OrderMgr.failOrder(order); });
	 	 res.json({
	          error: true,
	            errorMessage: Resource.msg('error.technical', 'checkout', null)
	      });
	 	 return next();
    }else if (handlePaymentResult.process3DRedirection){
        res.json({
        	error: false,
        	continueUrl: URLUtils.url('CheckoutServices-PayerAuthentication').toString()
    	});
        return next();
    }
    
    var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order); });

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

    COHelpers.sendConfirmationEmail(order, req.locale.id);

        //  Set order confirmation status to not confirmed for REVIEW orders.
    if (session.custom.CybersourceFraudDecision == "REVIEW") {
        var Order = require('dw/order/Order');
        Transaction.wrap(function () {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
        });
    }
        //  Reset decision session variable.
    session.custom.CybersourceFraudDecision = "";

    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    // TODO: Exposing a direct route to an Order, without at least encoding the orderID
    //  is a serious PII violation.  It enables looking up every customers orders, one at a
    //  time.
    res.json({
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('Order-Confirm').toString()
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
	res.render('cart/payerauthentication', {
		Order: order,
		AcsURL:AcsURL,
		PAReq:PAReq,
		PAXID: PAXID
	});
	return next();
});
module.exports = server.exports();