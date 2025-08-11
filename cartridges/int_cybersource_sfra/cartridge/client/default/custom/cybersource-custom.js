/* eslint-disable */

function safeSanitize(dirty) {
    try {
        return DOMPurify.sanitize(dirty);
    } catch (e) {
        return dirty;
    }
}

var init = {
    
    verifyUrl: function (url) {
        try {
            if (url != null) {
                new URL(url);
                return true;
            } else {
                    return false;
                }
            } catch (err) {
                return false;
            }
    },
    sanitizeUrl: function(url) {
        // Basic URL sanitization to prevent XSS
        if (!url || typeof url !== 'string') {
            return null;
        }
        
        // Remove javascript: and data: protocols
        if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
            return null;
        }
        
        // Allow only relative URLs or same-origin URLs
        try {
            var parsedUrl = new URL(url, window.location.origin);
            if (parsedUrl.origin !== window.location.origin) {
                return null;
            }
            return parsedUrl.href;
        } catch (e) {
            // Handle relative URLs
            if (url.startsWith('/') && !url.startsWith('//')) {
                return url;
            }
            return null;
        }
    },
    initConfig: function () {
        var requestId; var billingAgreementFlag; // A Flag to show whether user has opted for Billing Agreement or not
        var billingAgreementButton; // The Billing Agreement Checkbox
        var billingAgreementID; // Billing Agreement ID
        var isPayPalCredit = false; var
            endPoint = $('#paypal_endpoint').length > 0 ? document.getElementById('paypal_endpoint').value : 'sandbox';
        var config = {
            env: endPoint,
            commit: true,

            validate: function (actions) {
                if ($('.paypal-address').length > 0) {
                    paypalvalidator.toggleForm(actions);
                    paypalvalidator.onChangeForm(function () {
                        paypalvalidator.toggleForm(actions);
                    });
                }
            },
            payment: function () {
                var CREATE_URL = document.getElementById('paypal_express').value;
                if (config.paymentOption.credit) {
                    isPayPalCredit = true;
                } else {
                    isPayPalCredit = false;
                }
                billingAgreementButton = document.getElementById('billingAgreementCheckbox');
                // billingAgreementFlag - This variable is used to indicate if billing agreement creation is requested or not
                billingAgreementFlag = (billingAgreementButton == null) ? false : billingAgreementButton.checked;
                // Append a parameter to URL when Billing Agreement is checked
                if (billingAgreementFlag) {
                    CREATE_URL += '?billingAgreement=true';
                } else if (isPayPalCredit) {
                    // Append a parameter to URL when PayPal Credit is used
                    CREATE_URL += '?isPayPalCredit=true';
                }
                return paypal.request.post(CREATE_URL)
                    .then(function (res) {
                        requestId = res.requestID;
                        return res.processorTransactionID;
                    });
            },
            onAuthorize: function (data, actions) {
                var data = {
                    requestId: requestId,
                    billingAgreementFlag: billingAgreementFlag,
                    paymentID: data.paymentID,
                    payerID: data.payerID,
                    isPayPalCredit: isPayPalCredit
                };

                var paypalcallback = document.getElementById('paypal_callback').value;
                if(init.verifyUrl(paypalcallback)){
                    var paypalcallback_encode = encodeURIComponent(paypalcallback);
                    var form = $('<form action="' +  decodeURIComponent(paypalcallback_encode) + '" method="post">'
                        + '<input type="hidden" name="requestId" value="' + requestId + '" />'
                        + '<input type="hidden" name="billingAgreementFlag" value="' + billingAgreementFlag + '" />'
                        + '<input type="hidden" name="paymentID" value="' + data.paymentID + '" />'
                        + '<input type="hidden" name="payerID" value="' + data.payerID + '" />'
                        + '<input type="hidden" name="isPayPalCredit" value="' + isPayPalCredit + '" />'
                        + '</form>');
                    $('body').append(form);
                    form.submit();
                }
        }
        };
        return config;
    },

    initPayPalButtons: function () {
        var isPaypalEnabled;
        isPaypalEnabled = !!($('#paypal_enabled').length > 0 && document.getElementById('paypal_enabled').value == 'true');
        var locale = $('#currentLocale').length > 0 ? document.getElementById('currentLocale').value : '';
        var config = init.initConfig();
        config.paymentOption = {
            express: true,
            credit: false
        };
        config.locale = locale;
        if (isPaypalEnabled && $('.paypal-button-container-cart1').length > 0) {
            paypal.Button.render(config, '.paypal-button-container-cart1');
        }
        if (isPaypalEnabled && $('.paypal-button-container-cart2').length > 0) {
            paypal.Button.render(config, '.paypal-button-container-cart2');
        }
        if (isPaypalEnabled && $('#paypal-button-container').length > 0) {
            paypal.Button.render(config, '#paypal-button-container');
        }
        // Settings for PayPal Credit Card Button
        if (isPaypalEnabled && $('#paypal-credit-container').length > 0) {
            var creditConfig = init.initConfig();
            creditConfig.style = {
                label: 'credit',
                size: 'small', // small | medium
                shape: 'rect' // pill | rect
            };
            creditConfig.paymentOption = {
                express: false,
                credit: true
            };
            creditConfig.locale = locale;
            paypal.Button.render(creditConfig, '#paypal-credit-container');
        }
    },

    /**
     * Function to handle step-up popup (OTP popup)
     * @param {string} accessToken - The JWT access token
     * @param {string} stepUpUrl - The step-up URL for authentication
     * @param {string} sessionID - The session ID
     */
    handleStepUpPopup: function (accessToken, stepUpUrl, sessionID) {
        // Create modal overlay
        var modalOverlay = $('<div>')
            .attr('id', 'stepup-modal-overlay')
            .css({
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: '9999',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            })
            .appendTo('body');

        // Create modal content
        var modalContent = $('<div>')
            .css({
                backgroundColor: '#fff',
                width: '450px',
                height: '500px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                padding: '20px'
            })
            .appendTo(modalOverlay);

        // Add title
        $('<h3>')
            .text('Payment Authentication')
            .css({
                marginTop: '0',
                marginBottom: '20px',
                textAlign: 'center',
                color: '#333'
            })
            .appendTo(modalContent);

        // Create iframe for step-up authentication
        var iframe = $('<iframe>')
            .attr({
                id: 'step-up-iframe',
                name: 'step-up-iframe',
                width: '100%',
                height: '400px',
                frameborder: '0',
                style: 'border: none;',
                sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
            })
            .appendTo(modalContent);

        // Create and submit form to step-up URL
        var stepUpForm = $('<form>')
            .attr({
                id: 'step-up-form',
                method: 'POST',
                action: stepUpUrl,
                target: 'step-up-iframe'
            })
            .css('display', 'none')
            .appendTo(modalContent);

        $('<input>')
            .attr({
                type: 'hidden',
                name: 'JWT',
                value: accessToken
            })
            .appendTo(stepUpForm);

        $('<input>')
            .attr({
                type: 'hidden',
                name: 'MD',
                value: sessionID
            })
            .appendTo(stepUpForm);

        // Submit the form
        stepUpForm.submit();
        console.log("Step-up form submitted to:", stepUpUrl);

        // Monitor iframe for redirect/completion
        var checkInterval = setInterval(function () {
            try {
                // Try to access iframe content to detect if it's still on the same domain
                var iframeDoc = iframe[0].contentDocument || iframe[0].contentWindow.document;
                var iframeUrl = iframeDoc.location.href;

                // Check if iframe has redirected to our domain
                if (iframeUrl && iframeUrl.indexOf(window.location.hostname) > -1) {
                    console.log("Authentication completed, iframe URL:", iframeUrl);
                    clearInterval(checkInterval);
                    modalOverlay.remove();

                    // Validate and sanitize the redirect URL
                    var sanitizedUrl = init.sanitizeUrl(iframeUrl);
                    if (!sanitizedUrl) {
                        console.error('Invalid redirect URL detected:', iframeUrl);
                        sanitizedUrl = '/'; // Fallback to safe default
                    }

                    // Check if this is an SCA retrigger scenario
                    if (iframeUrl.indexOf('COPlaceOrder-PayerAuth') > -1) {
                        var redirect = $('<form>')
                            .appendTo(document.body)
                            .attr({
                                method: 'POST',
                                action: sanitizedUrl,
                                target: "_parent"
                            });
                        redirect.submit();
                    } else {
                        // Use sanitized redirect
                        window.location.href = sanitizedUrl;
                    }
                }
            } catch (e) {
                // Cross-origin access blocked - this is expected during authentication
                // Continue checking
            }
        }, 1000);

        // Cleanup interval after 5 minutes (timeout)
        setTimeout(function () {
            clearInterval(checkInterval);
            console.log("Authentication timeout, stopping monitoring");
        }, 300000); // 5 minutes
    },

    /**
     * Function to handle the final PlaceOrder AJAX call
     * @param {Object} browserProperties - Browser properties collected from device
     * @param {string} formaction - The form action URL for place order
     */
    callPlaceOrder: function (browserProperties, formaction) {
        var self = this;
        var postData = {};

        // Add browser properties if collected
        if (browserProperties) {
            postData.browserfields = JSON.stringify(browserProperties);
        }
        $.spinner().stop();
        $.spinner().start();
        $.ajax({
            url: formaction,
            method: 'POST',
            data: postData,
            success: function (data) {
                $.spinner().stop();
                if (data.error) {
                    // enable the placeOrder button here
                    $('body').trigger('checkout:enableButton', '.next-step-button button');
                    if (data.cartError) {
                        var sanitizedUrl = init.sanitizeUrl(data.redirectUrl);
                        if (sanitizedUrl) {
                            window.location.href = sanitizedUrl;
                        }
                    } else {
                        if (data.redirectUrl) {
                            var sanitizedUrl = init.sanitizeUrl(data.redirectUrl);
                            if (sanitizedUrl) {
                                window.location.href = sanitizedUrl;
                            }
                        }
                        else if (data.errorMessage) {
                            $('.error-message').show();
                            $('.error-message-text').text(data.errorMessage);
                        }
                    }
                } else if (data.stepUp) {
                    // Handle step-up authentication popup
                    self.handleStepUpPopup(data.accessToken, data.stepUpUrl, data.sessionID);
                } else if (data.enrollSCA) {
                    var redirect = $('<form>')
                        .appendTo(document.body)
                        .attr({
                            method: 'POST',
                            action: data.redirectUrl,
                            target: "_parent"
                        });
                    redirect.submit();
                } else if (data.renderTemplate) {

                    self.postSubmitToTemplateRenderingUrl(data);

                } else {
                    // enable the placeOrder button here
                    $('body').trigger('checkout:enableButton', '.next-step-button button');
                    var redirect = $('<form>')
                        .appendTo(document.body)
                        .attr({
                            method: 'POST',
                            action: data.continueUrl
                        });

                    $('<input>')
                        .appendTo(redirect)
                        .attr({
                            name: 'orderID',
                            value: data.orderID
                        });

                    $('<input>')
                        .appendTo(redirect)
                        .attr({
                            name: 'orderToken',
                            value: data.orderToken
                        });

                    redirect.submit();
                }
            },
            error: function () {
                $.spinner().stop();
                // enable the placeOrder button here
                $('body').trigger('checkout:enableButton', $('.next-step-button button'));
            }
        });
    },

    //function to post form submit to the template rendering route
    postSubmitToTemplateRenderingUrl: function (data) {

        var redirect = $('<form>')
            .appendTo(document.body)
            .attr({
                method: 'POST',
                action: data.continueUrl
            });

        $('<input>')
            .appendTo(redirect)
            .attr({
                type: 'hidden',
                name: 'renderTemplate',
                value: data.renderTemplate
            });

        $('<input>')
            .appendTo(redirect)
            .attr({
                type: 'hidden',
                name: 'templateData',
                value: JSON.stringify(data.templateData || {})
            });

        redirect.submit();
    },

    initFunctions: function () {
        var self = this;

        $(document).on('click', '.credit_card, .sa_flex', function (e) {
            e.stopImmediatePropagation();
            var payerAuth = $(this).data('payerauth');
            var formaction = $(this).attr('data-action');

            // disable the placeOrder button here
            $('body').trigger('checkout:disableButton', '.next-step-button button');

            // Collect browser properties
            browserProperties = {
                screenWidth: window.screen.width,
                screenHeight: window.screen.height
            };
            var environment = null;

            // First, call InitPayerAuth to get device data collection details
            $.spinner().start();
            $.ajax({
                url: payerAuth,
                method: 'POST',
                success: function (payerAuthData) {
                    // $.spinner().stop();
                    if (payerAuthData.error) {
                        $.spinner().stop();
                        // enable the placeOrder button here
                        $('body').trigger('checkout:enableButton', '.next-step-button button');
                        if (payerAuthData.errorMessage) {
                            $('.error-message').show();
                            $('.error-message-text').text(payerAuthData.errorMessage);
                        }
                    } else if (payerAuthData.isPayerAuthDisabled) {
                        // Payer authentication is disabled, proceed directly to PlaceOrder
                        self.callPlaceOrder(null, formaction);
                    } else if (payerAuthData.jwtToken && payerAuthData.ddcUrl) {
                        // Store environment from InitPayerAuth response
                        environment = payerAuthData.env || 'Test';

                        // Create and submit the device data collection form
                        var cardinalForm = $('<form>')
                            .attr({
                                id: 'cardinal_collection_form',
                                method: 'POST',
                                action: payerAuthData.ddcUrl,
                                target: 'collectionIframe'
                            })
                            .appendTo(document.body);

                        $('<input>')
                            .attr({
                                type: 'hidden',
                                name: 'JWT',
                                value: payerAuthData.jwtToken
                            })
                            .appendTo(cardinalForm);

                        // Create hidden iframe for device data collection
                        var iframe = $('<iframe>')
                            .attr({
                                id: 'cardinal_collection_iframe',
                                name: 'collectionIframe',
                                height: '10',
                                width: '10',
                                style: 'display:none;',
                                sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups'
                            })
                            .appendTo(document.body);

                        // Submit the device data collection form
                        cardinalForm.submit();

                        // Set up message listener for device data collection completion
                        var allowedOrigin = (environment === 'Production') ?
                            'https://centinelapi.cardinalcommerce.com' :
                            'https://centinelapistag.cardinalcommerce.com';

                        function handleDeviceDataCollection(event) {
                            if (event.origin === allowedOrigin) {
                                console.log("Device data collection completed: " + event.data);
                                // Remove the event listener
                                window.removeEventListener('message', handleDeviceDataCollection);
                                // Clean up the form and iframe
                                cardinalForm.remove();
                                iframe.remove();
                                // Now proceed with PlaceOrder
                                self.callPlaceOrder(browserProperties, formaction);
                            }
                        }

                        window.addEventListener('message', handleDeviceDataCollection, false);
                    } else {
                        self.callPlaceOrder(browserProperties, formaction);
                    }
                },
                error: function () {
                    $.spinner().stop();
                    // enable the placeOrder button here
                    $('body').trigger('checkout:enableButton', '.next-step-button button');
                    console.error("PayerAuth Setup failed");
                    // Still collect browser properties and proceed with PlaceOrder
                    // self.callPlaceOrder(browserProperties, formaction);
                }
            });
        });

        $(document).on('click', '.dw_google_pay, .paypal, .paypal_credit, .wechat', function (e) {
            e.stopImmediatePropagation();
            var formaction = $(this).attr('data-action');

            // disable the placeOrder button here
            $('body').trigger('checkout:disableButton', '.next-step-button button');
            $.spinner().start();
            $.ajax({
                url: formaction,
                method: 'POST',
                success: function (data) {
                    $.spinner().stop();
                    // enable the placeOrder button here
                    $('body').trigger('checkout:enableButton', '.next-step-button button');
                    if (data.error) {
                        if (data.cartError) {
                            var sanitizedUrl = init.sanitizeUrl(data.redirectUrl);
                            if (sanitizedUrl) {
                                window.location.href = sanitizedUrl;
                            }
                        } else {
                            if (data.redirectUrl) {
                                var sanitizedUrl = init.sanitizeUrl(data.redirectUrl);
                                if (sanitizedUrl) {
                                    window.location.href = sanitizedUrl;
                                }
                            }
                            else if (data.errorMessage) {
                                $('.error-message').show();
                                $('.error-message-text').text(data.errorMessage);
                            }
                        }
                    } else if (data.renderTemplate) {

                        self.postSubmitToTemplateRenderingUrl(data);

                    } else {
                        var redirect = $('<form>')
                            .appendTo(document.body)
                            .attr({
                                method: 'POST',
                                action: data.continueUrl
                            });

                        $('<input>')
                            .appendTo(redirect)
                            .attr({
                                name: 'orderID',
                                value: data.orderID
                            });

                        $('<input>')
                            .appendTo(redirect)
                            .attr({
                                name: 'orderToken',
                                value: data.orderToken
                            });

                        redirect.submit();
                    }
                },
                error: function () {
                    $.spinner().stop();
                    // enable the placeOrder button here
                    $('body').trigger('checkout:enableButton', $('.next-step-button button'));
                }
            });
        });

        // for Alipay Intermediate
        if ($('body').hasClass('cyb_alipayintermediate')) {
            var loaded = false;
            setTimeout(function () {
                document.RedirectForm.submit();
                loaded = true;
            }, 1000);
        }
        // For FingerPrint Unit testing
        if ($('body').hasClass('cyb_testfingerprintRedirect')) {
            var url_loc = document.getElementById('URl_redirect').value;
            url_loc = encodeURIComponent(url_loc);
            if(init.verifyUrl(decodeURIComponent(url_loc))){
                url_loc = decodeURIComponent(url_loc);
                setTimeout(function () { 
                    var sanitizedUrl = init.sanitizeUrl(url_loc);
                    if (sanitizedUrl) {
                        location.href = sanitizedUrl;
                    }
                }, 1000);
            }
        }
        // For Payerauth during checkout
        if ($('div').hasClass('payerauth')) {
            document.PAInfoForm.submit();
        }
        // For payerauth during  Credit card
        if ($('body').hasClass('cyb_payerauthenticationredirect')) {
            document.RedirectForm.submit();
        }
        // For payerauth during  Unit testing
        if ($('body').hasClass('cyb_unitTest_payerauth')) {
            document.RedirectForm.submit();
        }
        // For payer auth during  Unit testing
        if ($('div').hasClass('cyb_unitTest_payerauthsubmit')) {
            document.PAInfoForm.submit();
        }
        // For Secure Acceptance Redirect
        if ($('body').hasClass('cyb_sa_redirect')) {
            var url_loc = document.getElementById('redirect_url_sa');
            var Encoded_url_loc = encodeURIComponent(url_loc.value);
            var sanitizedUrl = init.sanitizeUrl(decodeURIComponent(Encoded_url_loc));
            if (sanitizedUrl) {
                window.top.location.replace(sanitizedUrl);
            }
        }
        // For Secure Acceptance Iframe
        if ($('div').hasClass('SecureAcceptance_IFRAME')) {
            var url_loc = document.getElementById('sa_iframeURL').value;
            if(init.verifyUrl(url_loc)){
                $('.SecureAcceptance_IFRAME').append('<iframe src=' + url_loc + '  name="hss_iframe"  width="85%" height="730px" scrolling="no" />');
           }
        }
        // For Secure Acceptance Iframe
        if ($('body').hasClass('sa_iframe_request_form')) {
            document.form_iframe.submit();
        }
        // For Secure Acceptance
        if ($('body').hasClass('cyb_sa_request_form')) {
            $('#loading').css('display', 'block');
            document.ePayment.submit();
        }

        // FOR POS
        $('#entry-mode-pos_unittest select.input-select').change(function () {
            if (this.value == 'swiped') {
                $('#card-section, #sample-card-section').css('display', 'none');
            } else if (this.value == 'keyed') {
                $('#card-section, #sample-card-section').css('display', 'block');
            }
        });

        /*
        * If billing agreement ID already exists in the user profile then a different button
        * is displayed on the the page. This function handles the action of that button.
        * This functions directly calls checkstatusservice
    */
        $(document).on('click', '.billingAgreementExpressCheckout', function (e) {
            e.preventDefault();
            var paypalcallback = document.getElementById('paypal_callback').value;
            var encodedePaypalcallback = encodeURIComponent(paypalcallback);
            if(init.verifyUrl(decodeURIComponent(encodedePaypalcallback))){
                var sanitizedUrl = init.sanitizeUrl(decodeURIComponent(encodedePaypalcallback));
                if (sanitizedUrl) {
                    var form = $('<form action="' + paypalcallback + '" method="post">'
                            + '</form>');
                    $('body').append(form);
                    form.submit();
                }
            }
        });

        $(document).on('click', '.sa_silentpost, .sa_redirect, .alipay, .sof, .mch, .idl , .klarna, .wechat', function (e) {
            e.stopImmediatePropagation();
            var CsSaType = $('li[data-method-id="CREDIT_CARD"]').attr('data-sa-type');
            var paymentMethodID = $('input[name=dwfrm_billing_paymentMethod]').val();
            var paymentMethodIds = ['KLARNA', 'ALIPAY', 'SOF', 'IDL', 'MCH', 'WECHAT'];
            var paymentMethod = $.inArray(paymentMethodID, paymentMethodIds) > -1;
            if ((CsSaType != 'CREDIT_CARD' && paymentMethodID == 'CREDIT_CARD') || paymentMethod) {
                var formaction = $(this).attr('data-action');

                $('body').trigger('checkout:disableButton', '.next-step-button button');
                $.spinner().start();
                $.ajax({
                    url: formaction,
                    method: 'POST',
                    success: function (data) {
                        $.spinner().stop();
                        // enable the placeOrder button here
                        $('body').trigger('checkout:enableButton', '.next-step-button button');
                        if (data.error) {
                            if (data.cartError) {
                                var sanitizedUrl = init.sanitizeUrl(data.redirectUrl);
                                if (sanitizedUrl) {
                                    window.location.href = sanitizedUrl;
                                }
                            } else {
                                if (data.redirectUrl) {
                                    var sanitizedUrl = init.sanitizeUrl(data.redirectUrl);
                                    if (sanitizedUrl) {
                                        window.location.href = sanitizedUrl;
                                    }
                                }
                                else if (data.errorMessage) {
                                    $('.error-message').show();
                                    $('.error-message-text').text(data.errorMessage);
                                }
                            }
                        } else if (data.renderTemplate) {

                            self.postSubmitToTemplateRenderingUrl(data);
                            
                        } else {
                            var redirect = $('<form>')
                                .appendTo(document.body)
                                .attr({
                                    method: 'POST',
                                    action: data.continueUrl
                                });

                            $('<input>')
                                .appendTo(redirect)
                                .attr({
                                    name: 'orderID',
                                    value: data.orderID
                                });

                            $('<input>')
                                .appendTo(redirect)
                                .attr({
                                    name: 'orderToken',
                                    value: data.orderToken
                                });

                            redirect.submit();
                        }
                    },
                    error: function () {
                        $.spinner().stop();
                        // enable the placeOrder button here
                        $('body').trigger('checkout:enableButton', $('.next-step-button button'));
                    }
                });
            }
        });

        /**
    * @function
    * @description function to Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
    */
        $(document).on('click', '.sa_iframe', function (e) {
            e.stopImmediatePropagation();
            var creditCardItem = $('li[data-method-id="CREDIT_CARD"]');
            var CsSaType = $(creditCardItem).attr('data-sa-type');
            if (CsSaType == 'SA_IFRAME') {
                var formaction = $(this).attr('data-action');
                $.spinner().start();
                $.ajax({
                    url: formaction,
                    type: 'POST',
                    contentType: 'text/html',
                    success: function (data) {
                        $.spinner().stop();
                        if (data) {
                            if (data.error == true) {
                                $('#saspCardError').html(safeSanitize(data.errorMsg));
                                $('#saspCardError').addClass('error');
                            } else if (data.renderTemplate) {

                                $.ajax({
                                    url: data.continueUrl,
                                    type: 'POST',
                                    data: {
                                        renderTemplate: data.renderTemplate,
                                        iframe: true
                                    },
                                    success: function (responseData) {
                                        if (responseData) {
                                            // This is trusted HTML from our own SFCC template - no sanitization needed
                                            $('#secureAcceptanceIframe').html(responseData);
                                            document.getElementById('submit-order').classList.add('d-none');
                                        }
                                    },
                                    error: function(data) {
                                            $('#saspCardError').html(safeSanitize(data.errorMsg));
                                            $('#saspCardError').addClass('error');
                                        }
                                });
                            }
                        }
                        else {
                            $('#saspCardError').html(safeSanitize(data.errorMsg));
                            $('#saspCardError').addClass('error');
                        }
                        return true;
                    },
                    error: function () {
                        $.spinner().stop();
                        $('#saspCardError').html(safeSanitize(data.errorMsg)).addClass('error');
                    }
                });
            } else {
                return true;
            }
        });

        $('#capturepaymenttype, #authreversalpaymenttype').change(function () {
            if ($(this).val() == 'visacheckout') {
                $('#orderRequestID').attr('required', 'required');
                $('.orderRequestID').removeClass('hidden').addClass('show');
            } else {
                $('#orderRequestID').removeAttr('required');
                $('.orderRequestID').removeClass('show').addClass('hidden');
            }
        });

        if ($('#checkout-main').attr('data-checkout-stage') === 'placeOrder') {
            var placeOrderBtn = $('#checkout-main').find('#submit-order');
            $(placeOrderBtn).closest('.row').find('.next-step-button').removeClass('next-step-button');
        }
    }
};

var paypalhelper = {
    paypalMini: function () {
        var config = init.initConfig();
        var locale = $('#currentLocale').length > 0 ? document.getElementById('currentLocale').value : '';
        config.paymentOption = {
            express: true,
            credit: false
        };
        config.locale = locale;
        var isPaypalEnabled = false;
        if (document.getElementById('paypal_enabled') != null) {
            isPaypalEnabled = document.getElementById('paypal_enabled').value;
        }
        if (isPaypalEnabled && $('.paypal-button-container-mini').length > 0) {
            paypal.Button.render(config, '.paypal-button-container-mini');
        }
    },
    validateForms: function () {
        var currentForm = $('data-checkout-stage').attr('data-checkout-stage');
        if (currentForm == 'payment') {
            false;
        } return true;
    }
};

var paypalvalidator = {
    toggleForm: function (actions) {
        if (this.isValid()) { return actions.enable(); }
        return actions.disable();
    },
    isValid: function () {
        var paymentForm = $('#dwfrm_billing').serialize();
        var isValidForm = false;

        $('body').trigger('checkout:serializeBilling', {
            form: $('#dwfrm_billing'),
            data: paymentForm,
            callback: function (data) { paymentForm = data; }
        });
        paypalvalidator.validateAddress(function (data) {
            isValidForm = !data.error;
            if (data.fieldErrors.length) {
                data.fieldErrors.forEach(function (error) {
                    if (Object.keys(error).length) {
                        paypalvalidator.loadFormErrors('.payment-form', error);
                    }
                });
            }
        });
        return isValidForm;
    },

    loadFormErrors: function (parentSelector, fieldErrors) {
        $.each(fieldErrors, function (attr) {
            $('*[name=' + attr + ']', parentSelector).addClass('is-invalid').siblings('.invalid-feedback').html(safeSanitize(fieldErrors[attr]));
        });
    },

    paypalMini: function () {
        var config = init.initConfig();
        var isPaypalEnabled = document.getElementById('paypal_enabled').value;
        if (isPaypalEnabled && $('.paypal-button-container-mini').length > 0) {
            paypal.Button.render(config, '.paypal-button-container-mini');
        }
    },
    validateAddress: function (callback) {
        var paymentForm = $('#dwfrm_billing').serialize();
        $.spinner().start();
        $.ajax({
            method: 'POST',
            async: false,
            data: paymentForm,
            url: $('.paypal-address').attr('action'),
            success: function (data) {
                $.spinner().stop();
                callback(data);
            },
            error: function (err) {
                $.spinner().stop();
            }
        });
    },
    onChangeForm: function (handler) {
        $('.billing-information').on('change', handler);
    }
};

$(document).ready(function () {
    init.initConfig();
    init.initPayPalButtons();
    init.initFunctions();
    if ($('#isGooglePayEnabled').val() == 'true') {
        onGooglePayLoaded();
    }
});