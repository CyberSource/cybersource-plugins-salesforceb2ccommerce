'use strict';

/* eslint-disable */
var page = module.superModule;
var server = require('server');

var Site = require('dw/system/Site');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

var IsCartridgeEnabled = Site.getCurrent().getCustomPreferenceValue('IsCartridgeEnabled');

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
server.post('ValidatePayPalBillingAddress', csrfProtection.validateRequest, server.middleware.https, function (req, res, next) {
    var billingFormErrors = {};
    var pplFormErrors = {};
    var paymentForm = server.forms.getForm('billing');
    billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);

    var pplPhoneandEmailForm = new Object();
    pplPhoneandEmailForm.email = server.forms.getForm('billing').paypalBillingFields.paypalEmail;
    pplPhoneandEmailForm.phone = server.forms.getForm('billing').paypalBillingFields.paypalPhone;
    pplFormErrors = COHelpers.validatePPLForm(pplPhoneandEmailForm);

    // Update address fields as and when the fields are edited
    var Transaction = require('dw/system/Transaction');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var billingAddress = currentBasket.billingAddress;
    var defaultShipment; var
        shippingAddress;
    defaultShipment = currentBasket.getDefaultShipment();
    shippingAddress = defaultShipment.getShippingAddress();
    Transaction.wrap(function () {
        if (!billingAddress) {
            billingAddress = currentBasket.createBillingAddress();
        }
        if (!empty(paymentForm.addressFields.firstName.value)) {
            billingAddress.setFirstName(paymentForm.addressFields.firstName.value);
        }
        if (!empty(paymentForm.addressFields.lastName.value)) {
            billingAddress.setLastName(paymentForm.addressFields.lastName.value);
        }
        if (!empty(paymentForm.addressFields.address1.value)) {
            billingAddress.setAddress1(paymentForm.addressFields.address1.value);
        }
        if (!empty(paymentForm.addressFields.address2.value)) {
            billingAddress.setAddress2(paymentForm.addressFields.address2.value);
        }
        if (!empty(paymentForm.addressFields.city.value)) {
            billingAddress.setCity(paymentForm.addressFields.city.value);
        }
        if (!empty(paymentForm.addressFields.postalCode.value)) {
            billingAddress.setPostalCode(paymentForm.addressFields.postalCode.value);
        }

        if (Object.prototype.hasOwnProperty.call(paymentForm.addressFields, 'states')) {
            billingAddress.setStateCode(paymentForm.addressFields.states.stateCode.value);
        }
        if (!empty(paymentForm.addressFields.country.value)) {
            billingAddress.setCountryCode(paymentForm.addressFields.country.value);
        }
        if (!empty(paymentForm.paypalBillingFields.paypalEmail.value)) {
            currentBasket.setCustomerEmail(paymentForm.paypalBillingFields.paypalEmail.value);
        }
        if (!empty(paymentForm.paypalBillingFields.paypalPhone.value)) {
            billingAddress.setPhone(paymentForm.paypalBillingFields.paypalPhone.value);
            if (!empty(shippingAddress)) { shippingAddress.setPhone(paymentForm.paypalBillingFields.paypalPhone.value); }
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

if (IsCartridgeEnabled) {
    server.prepend('SubmitPayment', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
        var Resource = require('dw/web/Resource');
        var paymentForm = server.forms.getForm('billing');
        var paymentMethodID = paymentForm.paymentMethod.value;

        if (empty(session.forms.billing.creditCardFields.securityCode.value)) {
            session.forms.billing.creditCardFields.securityCode.value = request.httpParameterMap.securityCode.value;
        }

        if (paymentMethodID == Resource.msg('paymentmethodname.paypal', 'cybersource', null)) {
            handlePayPal(req, res, next);
            this.emit('route:Complete', req, res);
            return;
        }
        return next();
    });

}

server.post('SilentPostAuthorize', server.middleware.https, function (req, res, next) {

    var payerauthArgs = {};
    if (request.httpParameterMap.browserfields.submitted) {
        var browserfields = request.httpParameterMap.browserfields.value;
        if (browserfields) {
            var parsedBrowserfields = JSON.parse(browserfields);
            payerauthArgs.parsedBrowserfields = parsedBrowserfields;
        }
    }
    var URLUtils = require('dw/web/URLUtils');
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var order;
    if (req.form.orderID) {
        order = OrderMgr.getOrder(req.form.orderID);
    } else if (req.form.OrderNo) {
        order = OrderMgr.getOrder(req.form.OrderNo);
    }

    if (!order) {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }

    var isPayerAuthSetupCompleted = false;
    if (req.querystring.PayerAuthSetupCompleted) {
        isPayerAuthSetupCompleted = req.querystring.PayerAuthSetupCompleted === 'true';
    }
    payerauthArgs.isPayerAuthSetupCompleted = isPayerAuthSetupCompleted;
    var silentPostResponse = COHelpers.handleSilentPostAuthorize(order, payerauthArgs);

    if (silentPostResponse.sca) {
        res.render('payerauthentication/3dsRedirect', {
            action: URLUtils.url('CheckoutServices-PayerAuthSetup'),
            OrderNo: order.orderNo,
        });
        return next();
    }
    if (silentPostResponse.error || silentPostResponse.declined || silentPostResponse.rejected) {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
        delete session.privacy.orderId;
    }
    if (silentPostResponse.error) {
        delete session.privacy.orderId;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)).toString());
    } else if (silentPostResponse.declined) {
        session.privacy.SkipTaxCalculation = false;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
        return next();
    } else if (silentPostResponse.rejected) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)).toString());
        return next();
    } else if (silentPostResponse.authorized || silentPostResponse.review || silentPostResponse.process3DRedirection) {
        var customerObj = (!empty(customer) && customer.authenticated) ? customer : null;
        COHelpers.addOrUpdateToken(order, customerObj, res);
        if (silentPostResponse.process3DRedirection) {
            res.redirect(URLUtils.https('CheckoutServices-PayerAuthentication', 'accessToken', silentPostResponse.jwt));
            return next();
        }
        session.privacy.orderId = order.orderNo;

        if (silentPostResponse.review) {
            res.redirect(URLUtils.https('COPlaceOrder-SilentPostReviewOrder'));
            return next();
        }

        res.redirect(URLUtils.https('COPlaceOrder-SilentPostSubmitOrder'));
        return next();
    } else {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'SecureAcceptanceError', 'true'));
        return next();
    }
    return next();
});

if (IsCartridgeEnabled) {
    server.prepend('PlaceOrder', server.middleware.https, function (req, res, next) {
        // POST-only middleware check
        if (req.httpMethod !== 'POST') {
            res.setStatusCode(405);
            res.json({
                error: true,
                errorMessage: 'POST method required'
            });
            return next();
        }
        var BasketMgr = require('dw/order/BasketMgr');
        var OrderMgr = require('dw/order/OrderMgr');
        var URLUtils = require('dw/web/URLUtils');

        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            if ('isPaymentRedirectInvoked' in session.privacy && session.privacy.isPaymentRedirectInvoked !== null
                && 'orderId' in session.privacy && session.privacy.orderId !== null) {
                var order = OrderMgr.getOrder(session.privacy.orderId);
                var currentBasket = COHelpers.reCreateBasket(order);
                res.json({
                    error: true,
                    cartError: true,
                    fieldErrors: [],
                    serverErrors: [],
                    redirectUrl: URLUtils.url('Cart-Show').toString()
                });
            }
        }
        return next();
    });

    server.append('PlaceOrder', server.middleware.https, function (req, res, next) {

        var klarnaHelper = require('*/cartridge/scripts/klarna/helper/KlarnaHelper');
        session.privacy.paypalShippingIncomplete = '';
        session.privacy.paypalBillingIncomplete = '';

        //  Reset decision session variable
        session.privacy.CybersourceFraudDecision = '';
        session.privacy.SkipTaxCalculation = false;
        session.privacy.cartStateString = null;
        klarnaHelper.clearKlarnaSessionVariables();

        return next();
    });
}

server.get('PayerAuthentication', server.middleware.https, function (req, res, next) {
    var AcsURL = session.privacy.AcsURL;
    var PAReq = session.privacy.PAReq;
    var PAXID = session.privacy.PAXID;
    var stepUpUrl = session.privacy.stepUpUrl;
    var jwtToken = req.querystring.accessToken;
    session.privacy.AcsURL = '';
    session.privacy.PAReq = '';
    res.setContentType('application/json;charset=utf-8');
    res.render('cart/cardinalPayerAuthentication', {
        AcsURL: AcsURL,
        PAReq: PAReq,
        PAXID: PAXID,
        authenticationTransactionID: session.privacy.authenticationTransactionID,
        jwtToken: jwtToken,
        stepUpUrl: stepUpUrl,
    });
    return next();
});

/* Route to handle paypal submission. This route is called only when either
    PayPal Express or PayPal billing agreement is called from either mini cart or cart page. */
// eslint-disable-next-line
function handlePayPal(req, res, next) {
    var billingFormErrors = {};
    var viewData = {};
    var Transaction = require('dw/system/Transaction');
    // var URLUtils = require('dw/web/URLUtils');
    var BasketMgr = require('dw/order/BasketMgr');
    var paymentForm = server.forms.getForm('billing');

    var pplFormErrors = {};
    var pplPhoneandEmailForm = {};
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
            viewData.address.stateCode = { value: paymentForm.addressFields.states.stateCode.value };
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
        // var paypalInstrument = COHelpers.getPayPalInstrument(currentBasket);
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
}

/**
 * Update shipping details in cart object
 */
// eslint-disable-next-line
function shippingUpdate(cart, shippingdetails) {
    var shipment = cart.defaultShipment;
    if (!empty(shipment.getShippingAddress())) {
        return { success: true };
    }
    try {
        var mobileAdaptor = require('*/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter');
        mobileAdaptor.UpdateShipping(shippingdetails);
        return { success: true };
    } catch (err) {
        var logger = require('dw/system/Logger');
        logger.error('Error creating shipment from Google pay address: {0}', err.message);
        return { error: true, errorMsg: err.message };
    }
}

/**
 * GooglePay Checkout returned error back to merchant site, further return user back to user journey starting page, either cart or billing page
 */
function googlePayCheckoutError(req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
    var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT + 'helper/CommonHelper');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var cart = BasketMgr.getCurrentBasket();

    // var paymentForm = server.forms.getForm('billing');

    // basket uuid check for security handling
    if (empty(cart.getPaymentInstruments(CybersourceConstants.METHOD_GooglePay))) {
        COHelpers.recalculateBasket(cart);

        var Status = require('dw/system/Status');
        res.render('cart/cart', {
            cart: cart,
            RegistrationStatus: false,
            BasketStatus: new Status(Status.ERROR, 'GoogleCheckoutError')
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

// eslint-disable-next-line
server.post('GetGooglePayToken', function (req, res, next) {
    var Encoding = require('dw/crypto/Encoding');
    var repsonse = JSON.parse(request.httpParameterMap.paymentData);
    // Extract authentication details from Google Pay response

    var BasketMgr = require('dw/order/BasketMgr');
    var cart = BasketMgr.getCurrentBasket();
    var shippingdetails = repsonse.shippingAddress;// add condition for only cart
    var mobileAdaptor = require('*/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter');
    var logger = require('dw/system/Logger');
    var cardInfo = repsonse.paymentMethodData.info;
    var Transaction = require('dw/system/Transaction');
    var isAuthenticated = false;
    var result = mobileAdaptor.UpdateBilling(cart, cardInfo, repsonse.email);
    // Check if assuranceDetails exists and get authentication status
    if (cardInfo && cardInfo.assuranceDetails) {
        isAuthenticated = cardInfo.assuranceDetails.cardHolderAuthenticated;
    }
    // call the call back method for initSession Service/check Status service
    // only if shipping from cart
    if (result.success) {
        result = shippingUpdate(cart, shippingdetails);
        if (result.success) {
            cart = BasketMgr.getCurrentBasket();
            // calculate cart and redirect to summary page
            COHelpers.recalculateBasket(cart);
            var GPtoken = repsonse.paymentMethodData.tokenizationData.token;
            Transaction.wrap(function () {
                var paymentInstruments = cart.getPaymentInstruments();
                if (paymentInstruments.length > 0) {
                    paymentInstruments[0].custom.GooglePayEncryptedData = Encoding.toBase64(new dw.util.Bytes(GPtoken));
                    paymentInstruments[0].custom.isGooglePaycardHolderAuthenticated = isAuthenticated;
                }
            });
        } else {
            logger.error('Error in google Checkout payment: problem in billing details');
            googlePayCheckoutError(req, res, next);
        }

        if (request.httpParameterMap.paymentData != null) {
            res.json({
                status: 'success'
            });
            return next();
        }
    } else {
        logger.error('Error in google Checkout payment: problem in billing details');
        googlePayCheckoutError(req, res, next);
    }
});

//checkout Gpay
server.post('SubmitPaymentGP', function (req, res, next) {
    var Encoding = require('dw/crypto/Encoding');
    var paymentForm = server.forms.getForm('billing');
    var paymentMethodID = server.forms.getForm('billing').paymentMethod.value;
    var Transaction = require('dw/system/Transaction');
    var billingFormErrors = {};
    var viewData = {};
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var paymentData = JSON.parse(request.httpParameterMap.googletoken);
    var cardInfo = paymentData.paymentMethodData.info;
    var Resource = require('dw/web/Resource');

    var isAuthenticated = false;
    if (cardInfo && cardInfo.assuranceDetails) {
        isAuthenticated = cardInfo.assuranceDetails.cardHolderAuthenticated;
    }
    var GPtoken = paymentData.paymentMethodData.tokenizationData.token;



    billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);

    if (Object.keys(billingFormErrors).length) {
        // respond with form data and errors
        res.json({
            form: paymentForm,
            fieldErrors: [billingFormErrors],
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
            viewData.address.stateCode = { value: paymentForm.addressFields.states.stateCode.value };
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

            var URLUtils = require('dw/web/URLUtils');
            var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
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
            paymentMethodID = billingData.paymentMethod.value;
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

            // var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();

            //    Add hook to call google payment
            var mobileAdaptor = require('*/cartridge/scripts/mobilepayments/adapter/MobilePaymentsAdapter');
            result = mobileAdaptor.UpdateBilling(currentBasket, cardInfo, paymentData.email);

            Transaction.wrap(function () {
                var paymentInstruments = currentBasket.getPaymentInstruments();
                if (paymentInstruments.length > 0) {
                    paymentInstruments[0].custom.GooglePayEncryptedData = Encoding.toBase64(new dw.util.Bytes(GPtoken));
                    paymentInstruments[0].custom.isGooglePaycardHolderAuthenticated = isAuthenticated;
                }
            });
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
            if (result.success) {
                if (request.httpParameterMap.paymentData != null) {
                    res.json({
                        error: false
                    });
                }
            }
        });
    }
    return next();
});

if (IsCartridgeEnabled) {
    // New route to handle template rendering for some payment methods.
    server.post('ProcessingPayment', server.middleware.https, function (req, res, next) {
        var Logger = require('dw/system/Logger');
        var CommonHelper = require('*/cartridge/scripts/helper/CommonHelper');

        // Get template data from POST parameters
        var renderTemplate = req.form.renderTemplate;
        var templateDataString = req.form.templateData;
        var isIframe = req.form.iframe === 'true';

        if (renderTemplate) {
            var templateData = {};
            if (templateDataString) {
                try {
                    templateData = JSON.parse(templateDataString);
                    if (templateData.requestData) {
                        templateData.requestData = CommonHelper.JSONObjectToHashMap(templateData.requestData);
                    }
                    // Logger.debug('Successfully parsed templateData with keys: ' + Object.keys(templateData).join(', '));
                } catch (parseError) {
                    Logger.error('Error parsing templateData JSON: ' + String(parseError));
                    Logger.error('Raw templateDataString: ' + templateDataString);
                }
            }

            // Handle SA-iframe case - render template and return HTML content
            if (isIframe) {
                var OrderMgr = require('dw/order/OrderMgr');
                var order = OrderMgr.getOrder(req.form.orderID || req.form.OrderNo);
                templateData.Order = order;
                res.render(renderTemplate, templateData);
                return next();
            }

            // Regular case - render the template
            res.render(renderTemplate, templateData);
            return next();
        } else {
            Logger.error('No renderTemplate parameter found in POST data');
        }
    });
}

// Route to perform the payer auth setup and device data collection.
server.post('PayerAuthSetup', csrfProtection.generateToken, function (req, res, next) {

    var Resource = require('dw/web/Resource');
    var Site = require('dw/system/Site');
    // var currentBasket = BasketMgr.getCurrentBasket();
    var URLUtils = require('dw/web/URLUtils');
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
    var CardFacade = require('*/cartridge/scripts/facade/CardFacade');
    var VisaCheckoutFacade = require('*/cartridge/scripts/visacheckout/facade/VisaCheckoutFacade');
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');

    var order;
    if (req.form.orderID) {
        order = OrderMgr.getOrder(req.form.orderID);
    }
    else if (req.form.OrderNo) {
        order = OrderMgr.getOrder(req.form.OrderNo);
    }
    else if (req.querystring.orderID) {
        order = OrderMgr.getOrder(req.querystring.orderID);
    }

    if (!order) {
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }

    var paymentInstrument = null;
    if (!empty(order.getPaymentInstruments())) {
        paymentInstrument = order.getPaymentInstruments()[0];
    }
    var action;
    var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;

    if (paymentInstrument.paymentMethod === Resource.msg('paymentmethodname.creditcard', 'cybersource', null) && CsSAType == Resource.msg('cssatype.SA_SILENTPOST', 'cybersource', null)) {
        action = URLUtils.url('CheckoutServices-SilentPostAuthorize', "PayerAuthSetupCompleted", 'true');
    }
    else {
        action = URLUtils.url('CheckoutServices-PayerAuthSubmit', "PayerAuthSetupCompleted", 'true');
    }

    var paymentMethodID = paymentInstrument.paymentMethod;
    var paymentForm = server.forms.getForm('billing');
    var result;
    if (paymentMethodID.equals(CybersourceConstants.METHOD_VISA_CHECKOUT)) {
        result = VisaCheckoutFacade.PayerAuthSetup(order.orderNo);
    } else {
        result = CardFacade.PayerAuthSetup(paymentInstrument, order.orderNo, paymentForm.creditCardFields);
    }
    Transaction.wrap(function () {
        paymentInstrument.custom.PayerAuthSetupReferenceID = result.referenceID;
    });
    if (result.deviceDataCollectionURL == null) {
        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }
    res.setContentType('application/json');
    res.render('payerauthentication/deviceDataCollection', {
        jwtToken: result.accessToken,
        referenceID: result.referenceID,
        orderNo: order.orderNo,
        ddcUrl: result.deviceDataCollectionURL,
        action: action
    });
    return next();
});

server.post('PayerAuthSubmit', csrfProtection.generateToken, function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    // var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');
    var OrderMgr = require('dw/order/OrderMgr');
    var payerauthArgs = {};

    // Handle browser fields if submitted
    if (request.httpParameterMap.browserfields.submitted) {
        var browserfields = request.httpParameterMap.browserfields.value;
        if (browserfields) {
            var parsedBrowserfields = JSON.parse(browserfields);
            payerauthArgs.parsedBrowserfields = parsedBrowserfields;
        }
    }

    var order;
    if (req.form.orderID) {
        order = OrderMgr.getOrder(req.form.orderID);
    }
    else if (req.form.OrderNo) {
        order = OrderMgr.getOrder(req.form.OrderNo);
    }
    if (!order) {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }

    var isPayerAuthSetupCompleted = false;
    if (req.querystring.PayerAuthSetupCompleted) {
        isPayerAuthSetupCompleted = req.querystring.PayerAuthSetupCompleted === 'true';
    }
    payerauthArgs.isPayerAuthSetupCompleted = isPayerAuthSetupCompleted;
    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo, payerauthArgs);


    // Handle different payment result scenarios
    if (handlePaymentResult.error) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        delete session.privacy.orderId;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
        return next();
    }

    if (handlePaymentResult.declined) {
        session.privacy.SkipTaxCalculation = false;
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        delete session.privacy.orderId;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('sa.billing.payment.error.declined', 'cybersource', null)));
        return next();
    }

    if (handlePaymentResult.rejected) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        delete session.privacy.orderId;
        res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('payerauthentication.carderror', 'cybersource', null)));
        return next();
    }
    if (handlePaymentResult.sca) {
        res.render('payerauthentication/3dsRedirect', {
            action: URLUtils.url('CheckoutServices-PayerAuthSetup'),
            OrderNo: order.orderNo,
        });
        return next();
    }

    // Handle 3D Redirection
    if (handlePaymentResult.process3DRedirection) {
        res.redirect(URLUtils.url('CheckoutServices-PayerAuthentication', 'accessToken', handlePaymentResult.jwt));
        return next();
    }

    // Handle authorized or review status
    if (handlePaymentResult.authorized || handlePaymentResult.review) {
        var HookMgr = require('dw/system/HookMgr');
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();

        // Run fraud detection
        var fraudDetectionStatus = HookMgr.callHook('app.fraud.detection', 'fraudDetection', currentBasket);
        if (fraudDetectionStatus.status === 'fail') {
            Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

            // fraud detection failed
            req.session.privacyCache.set('fraudDetectionStatus', true);

            delete session.privacy.orderId;
            res.redirect(URLUtils.https('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode));
            return next();
        }

        if (handlePaymentResult.authorized) {
            // Place the order
            var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
            if (placeOrderResult.error) {
                Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
                delete session.privacy.orderId;
                res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'placeOrder', 'placeOrderError', Resource.msg('error.technical', 'checkout', null)));
                return next();
            }
        }

        // Save addresses to customer address book if logged in
        if (req.currentCustomer && req.currentCustomer.addressBook) {
            var allAddresses = addressHelpers.gatherShippingAddresses(order);
            allAddresses.forEach(function (address) {
                if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                    addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address));
                }
            });
        }
        //  Set order confirmation status to not confirmed for REVIEW orders.
        if (session.privacy.CybersourceFraudDecision === 'REVIEW') {
            var Order = require('dw/order/Order');
            Transaction.wrap(function () {
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
            });
        }
        // Send confirmation email
        if (order.getCustomerEmail()) {
            COHelpers.sendConfirmationEmail(order, req.locale.id);
        }

        // Clean up session
        delete session.privacy.orderId;
        req.session.privacyCache.set('usingMultiShipping', false);

        // Redirect to order confirmation
        res.redirect(URLUtils.url('COPlaceOrder-SubmitOrderConformation', 'ID', order.orderNo, 'token', order.orderToken).toString());
        return next();
    }

    // Default case - unexpected result
    Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
    delete session.privacy.orderId;
    res.redirect(URLUtils.https('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
    return next();
});

module.exports = server.exports();
