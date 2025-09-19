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
    sanitizeUrl: function (url) {
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
                if (init.verifyUrl(paypalcallback)) {
                    var paypalcallback_encode = encodeURIComponent(paypalcallback);
                    var form = $('<form action="' + decodeURIComponent(paypalcallback_encode) + '" method="post">'
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

        $(document).on('click', '.credit_card, .sa_flex, .dw_google_pay, .paypal, .paypal_credit, .wechat, .sa_silentpost, .sa_redirect, .alipay, .sof, .mch, .idl , .klarna', function (e) {
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
            if (init.verifyUrl(decodeURIComponent(url_loc))) {
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
            if (init.verifyUrl(url_loc)) {
                var iframe = $('<iframe>')
                    .attr({
                        'src': url_loc,
                        'name': 'hss_iframe',
                        'width': '85%',
                        'height': '730px',
                        'scrolling': 'no'
                    });
                $('.SecureAcceptance_IFRAME').append(iframe);
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
            if (init.verifyUrl(decodeURIComponent(encodedePaypalcallback))) {
                var sanitizedUrl = init.sanitizeUrl(decodeURIComponent(encodedePaypalcallback));
                if (sanitizedUrl) {
                    var form = $('<form>')
                        .attr({
                            'action': paypalcallback,
                            'method': 'post'
                        });
                    $('body').append(form);
                    form.submit();
                }
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
                                $.ajax({
                                    url: data.continueUrl,
                                    type: 'POST',
                                    data: {
                                        renderTemplate: data.renderTemplate,
                                        iframe: true,
                                        orderID: data.orderID
                                    },
                                    success: function (responseData) {
                                        if (responseData) {
                                            // This is trusted HTML from our own SFCC template - no sanitization needed
                                            $('#secureAcceptanceIframe').html(responseData);
                                            document.getElementById('submit-order').classList.add('d-none');
                                        }
                                    },
                                    error: function (data) {
                                        console.error(data);
                                    }
                                });
                            }
                        }
                    },
                    error: function (data) {
                        $.spinner().stop();
                        console.error(data);
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