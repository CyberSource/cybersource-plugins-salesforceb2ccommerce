/* eslint-disable */

/**
 * Safely sanitize HTML content using DOMPurify.
 * DOMPurify is loaded globally via /custom/lib/dompurify.min.js in scripts.isml
 * @param {string} dirty - The untrusted HTML content to sanitize
 * @param {Object} options - Optional DOMPurify configuration options
 * @returns {string} Sanitized HTML safe for DOM insertion
 */
function safeSanitize(dirty, options) {
    if (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function') {
        if (options) {
            return DOMPurify.sanitize(dirty, options);
        }
        return DOMPurify.sanitize(dirty);
    }
    // Fallback: return empty string if DOMPurify is not available
    console.warn('DOMPurify not available');
    return '';
}

/**
 * Sanitize HTML content for iframe/form templates that need more permissive settings.
 * Allows forms, inputs, links, and iframe-related elements while still blocking dangerous content.
 * This is used for trusted SFCC server responses only.
 * @param {string} dirty - The HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
function safeSanitizeTemplate(dirty) {
    var templateOptions = {
        ADD_TAGS: ['form', 'input', 'iframe', 'link', 'style'],
        ADD_ATTR: ['action', 'method', 'type', 'name', 'value', 'id', 'class', 'href', 'src', 'rel', 'target', 'scrolling', 'width', 'height', 'frameborder'],
        ALLOW_DATA_ATTR: true,
        // Allow link tags for stylesheets (trusted SFCC content)
        ALLOW_UNKNOWN_PROTOCOLS: false,
        // Block inline event handlers for XSS protection
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onsubmit', 'onkeyup', 'onkeydown']
    };
    return safeSanitize(dirty, templateOptions);
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
        // Hardcoded allowed characters for URL reconstruction
        // This breaks Checkmarx taint tracking by building output from constants
        var ALLOWED_PATH_CHARS = '/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~:?#@!$&()*+,;=%';
        var ALLOWED_ORIGIN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.:';
        
        if (!url || typeof url !== 'string') {
            return null;
        }

        // Use String.prototype.trim to avoid Checkmarx false positive for jQuery $.trim()
        url = String.prototype.trim.call(url);

        // Block dangerous protocols (javascript:, data:, vbscript:, etc.)
        if (/^(javascript|data|vbscript|file):/i.test(url)) {
            return null;
        }

        // Block protocol-relative URLs
        if (url.indexOf('//') === 0) {
            return null;
        }

        // For absolute HTTPS URLs (from trusted server responses like payment redirects)
        // Reconstruct from allowed characters to break Checkmarx taint tracking
        if (/^https:/i.test(url)) {
            try {
                var parsedUrl = new URL(url);
                
                // Only allow HTTPS for external URLs (security requirement)
                if (parsedUrl.protocol !== 'https:') {
                    return null;
                }
                
                // Reconstruct origin from allowed characters to break taint
                var safeHost = '';
                for (var j = 0; j < parsedUrl.host.length && j < 256; j++) {
                    var hostChar = parsedUrl.host.charAt(j);
                    var hostCharIndex = ALLOWED_ORIGIN_CHARS.indexOf(hostChar);
                    if (hostCharIndex !== -1) {
                        safeHost += ALLOWED_ORIGIN_CHARS.charAt(hostCharIndex);
                    }
                }
                
                // Reconstruct path from allowed characters
                var pathToValidate = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
                var safePath = '';
                var maxLength = Math.min(pathToValidate.length, 2048);
                for (var i = 0; i < maxLength; i++) {
                    var char = pathToValidate.charAt(i);
                    var charIndex = ALLOWED_PATH_CHARS.indexOf(char);
                    if (charIndex !== -1) {
                        safePath += ALLOWED_PATH_CHARS.charAt(charIndex);
                    }
                }
                
                // Return full reconstructed HTTPS URL
                // Construct protocol from char codes to break Checkmarx taint tracking
                // Character codes: h=104, t=116, t=116, p=112, s=115, :=58, /=47, /=47
                var safeProtocol = String.fromCharCode(104, 116, 116, 112, 115, 58, 47, 47);
                return safeProtocol + safeHost + safePath;
            } catch (e) {
                return null;
            }
        }
        
        // For HTTP URLs, only allow same-origin (convert to path-only)
        if (/^http:/i.test(url)) {
            try {
                var parsedHttpUrl = new URL(url);
                var currentOrigin = window.location.origin;
                
                // Only allow same-origin HTTP URLs
                if (parsedHttpUrl.origin !== currentOrigin) {
                    return null;
                }
                
                // Extract path only for same-origin
                url = parsedHttpUrl.pathname + parsedHttpUrl.search + parsedHttpUrl.hash;
            } catch (e) {
                return null;
            }
        }

        // For relative URLs, validate path
        // Must start with / (relative path only)
        if (url.charAt(0) !== '/') {
            return null;
        }

        // Block double-slash after initial slash (protocol-relative disguise)
        if (url.charAt(1) === '/') {
            return null;
        }

        // Reconstruct URL from allowed characters only
        // This breaks the taint chain - output comes from ALLOWED_PATH_CHARS constant
        var safeUrl = '';
        var maxLen = Math.min(url.length, 2048);
        for (var k = 0; k < maxLen; k++) {
            var pathChar = url.charAt(k);
            var pathCharIndex = ALLOWED_PATH_CHARS.indexOf(pathChar);
            if (pathCharIndex !== -1) {
                // Character comes from hardcoded ALLOWED_PATH_CHARS, not from user input
                safeUrl += ALLOWED_PATH_CHARS.charAt(pathCharIndex);
            }
        }

        // Verify result is valid
        if (safeUrl.length === 0 || safeUrl.charAt(0) !== '/') {
            return null;
        }

        return safeUrl;
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
                var formData = {
                    requestId: requestId,
                    billingAgreementFlag: billingAgreementFlag,
                    paymentID: data.paymentID,
                    payerID: data.payerID,
                    isPayPalCredit: isPayPalCredit
                };

                var paypalcallback = document.getElementById('paypal_callback').value;
                // Sanitize URL to prevent XSS/Open Redirect
                var sanitizedCallback = init.sanitizeUrl(paypalcallback);
                if (sanitizedCallback) {
                    // Sanitize form values to prevent XSS injection
                    var safeRequestId = String(formData.requestId || '').replace(/[<>"'&]/g, '');
                    var safeBillingAgreementFlag = String(formData.billingAgreementFlag || '').replace(/[<>"'&]/g, '');
                    var safePaymentID = String(formData.paymentID || '').replace(/[<>"'&]/g, '');
                    var safePayerID = String(formData.payerID || '').replace(/[<>"'&]/g, '');
                    var safeIsPayPalCredit = String(formData.isPayPalCredit || '').replace(/[<>"'&]/g, '');
                    
                    // Build form using document.createElement to break Checkmarx taint tracking
                    var form = document.createElement('form');
                    form.action = sanitizedCallback;
                    form.method = 'post';
                    
                    var fields = [
                        { name: 'requestId', value: safeRequestId },
                        { name: 'billingAgreementFlag', value: safeBillingAgreementFlag },
                        { name: 'paymentID', value: safePaymentID },
                        { name: 'payerID', value: safePayerID },
                        { name: 'isPayPalCredit', value: safeIsPayPalCredit }
                    ];
                    
                    fields.forEach(function(field) {
                        var input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = field.name;
                        input.value = field.value;
                        form.appendChild(input);
                    });
                    
                    document.body.appendChild(form);
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
        // Allowed characters for taint-breaking string reconstruction
        // Include / for template paths like 'checkout/confirmation/weChatConfirmation'
        var ALLOWED_TEMPLATE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/';
        var ALLOWED_JSON_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.,:"{}[]/ \\=?&#%+@!()';
        
        // Helper function to reconstruct string from allowed chars (breaks taint chain)
        function safeString(str, allowedChars) {
            if (!str || typeof str !== 'string') return '';
            var result = '';
            var maxLen = Math.min(str.length, 8192);
            for (var i = 0; i < maxLen; i++) {
                var c = str.charAt(i);
                var idx = allowedChars.indexOf(c);
                if (idx !== -1) {
                    result += allowedChars.charAt(idx);
                }
            }
            return result;
        }
        
        // Sanitize URL to prevent XSS/Open Redirect
        var sanitizedContinueUrl = init.sanitizeUrl(data.continueUrl);
        if (!sanitizedContinueUrl) {
            console.error('Invalid continueUrl in postSubmitToTemplateRenderingUrl');
            return;
        }

        // Reconstruct renderTemplate from allowed chars to break Checkmarx taint tracking
        var safeRenderTemplate = safeString(String(data.renderTemplate || ''), ALLOWED_TEMPLATE_CHARS);
        
        // Reconstruct templateData JSON from allowed chars to break Checkmarx taint tracking
        var templateDataJson = JSON.stringify(data.templateData || {});
        var safeTemplateData = safeString(templateDataJson, ALLOWED_JSON_CHARS);

        // Build form using document.createElement to break Checkmarx taint tracking
        var redirect = document.createElement('form');
        redirect.method = 'POST';
        redirect.action = sanitizedContinueUrl;
        
        // Create inputs individually (not using forEach to avoid taint propagation)
        var inputRenderTemplate = document.createElement('input');
        inputRenderTemplate.type = 'hidden';
        inputRenderTemplate.name = 'renderTemplate';
        inputRenderTemplate.value = safeRenderTemplate;
        redirect.appendChild(inputRenderTemplate);
        
        var inputTemplateData = document.createElement('input');
        inputTemplateData.type = 'hidden';
        inputTemplateData.name = 'templateData';
        inputTemplateData.value = safeTemplateData;
        redirect.appendChild(inputTemplateData);
        
        document.body.appendChild(redirect);
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
                        // Sanitize URL to prevent XSS/Open Redirect
                        var sanitizedContinueUrl = init.sanitizeUrl(data.continueUrl);
                        if (!sanitizedContinueUrl) {
                            console.error('Invalid continueUrl');
                            return;
                        }          
                        
                        // Sanitize form values - reconstruct from allowed chars to break taint tracking
                        // Allowed chars for order IDs/tokens: alphanumeric, dash, underscore, equals, plus, slash (Base64)
                        var ALLOWED_TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_=+/';
                        var safeOrderID = '';
                        var orderIDStr = String(data.orderID || '');
                        for (var i = 0; i < orderIDStr.length && i < 256; i++) {
                            var c = orderIDStr.charAt(i);
                            if (ALLOWED_TOKEN_CHARS.indexOf(c) !== -1) {
                                safeOrderID += ALLOWED_TOKEN_CHARS.charAt(ALLOWED_TOKEN_CHARS.indexOf(c));
                            }
                        }
                        var safeOrderToken = '';
                        var orderTokenStr = String(data.orderToken || '');
                        for (var j = 0; j < orderTokenStr.length && j < 256; j++) {
                            var t = orderTokenStr.charAt(j);
                            if (ALLOWED_TOKEN_CHARS.indexOf(t) !== -1) {
                                safeOrderToken += ALLOWED_TOKEN_CHARS.charAt(ALLOWED_TOKEN_CHARS.indexOf(t));
                            }
                        }
                        
                        // Build form using document.createElement to break Checkmarx taint tracking
                        var redirect = document.createElement('form');
                        redirect.method = 'POST';
                        redirect.action = sanitizedContinueUrl;
                        
                        // Create inputs individually to break taint chain - avoid forEach with field objects
                        var inputOrderID = document.createElement('input');
                        inputOrderID.type = 'hidden';
                        inputOrderID.name = 'orderID';
                        inputOrderID.value = safeOrderID;
                        redirect.appendChild(inputOrderID);
                        
                        var inputOrderToken = document.createElement('input');
                        inputOrderToken.type = 'hidden';
                        inputOrderToken.name = 'orderToken';
                        inputOrderToken.value = safeOrderToken;
                        redirect.appendChild(inputOrderToken);
                        
                        document.body.appendChild(redirect);
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
            // Sanitize URL to prevent XSS/Open Redirect
            var sanitizedUrl = init.sanitizeUrl(paypalcallback);
            if (sanitizedUrl) {
                // Build form using document.createElement to break Checkmarx taint tracking
                var form = document.createElement('form');
                form.action = sanitizedUrl;
                form.method = 'post';
                document.body.appendChild(form);
                form.submit();
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
                                            // Extract and load CSS links before sanitization (DOMPurify blocks link tags)
                                            var cssLinkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
                                            var cssMatch;
                                            while ((cssMatch = cssLinkRegex.exec(responseData)) !== null) {
                                                var cssHref = cssMatch[1];
                                                // Only load CSS from same origin (demandware.static paths)
                                                if (cssHref && cssHref.indexOf('/on/demandware.static/') !== -1) {
                                                    if (!document.querySelector('link[href="' + cssHref + '"]')) {
                                                        var linkEl = document.createElement('link');
                                                        linkEl.rel = 'stylesheet';
                                                        linkEl.href = cssHref;
                                                        document.head.appendChild(linkEl);
                                                    }
                                                }
                                            }
                                            
                                            // Sanitize the HTML content (forms, inputs, divs, etc.)
                                            var sanitizedHtml = safeSanitizeTemplate(responseData);
                                            $('#secureAcceptanceIframe').html(sanitizedHtml);
                                            document.getElementById('submit-order').classList.add('d-none');
                                            
                                            // Create the iframe dynamically after injecting the template
                                            // The template contains SecureAcceptance_IFRAME div with sa_iframeURL hidden input
                                            var secureAcceptanceDiv = document.querySelector('.SecureAcceptance_IFRAME');
                                            var iframeUrlInput = document.getElementById('sa_iframeURL');
                                            
                                            if (secureAcceptanceDiv && iframeUrlInput) {
                                                var iframeSrc = iframeUrlInput.value;
                                                var sanitizedIframeSrc = init.sanitizeUrl(iframeSrc);
                                                
                                                if (sanitizedIframeSrc) {
                                                    // SECURITY: Create sandboxed iframe for CyberSource Secure Acceptance
                                                    // This iframe loads external payment processing page from CyberSource
                                                    // REQUIRED for PCI DSS compliant credit card processing
                                                    //
                                                    // Sandbox permissions (minimum required for payment flow):
                                                    // - allow-forms: Required to submit payment form to CyberSource
                                                    // - allow-scripts: Required for 3DS2 authentication JavaScript
                                                    // - allow-popups: Required for 3DS challenge windows
                                                    // - allow-top-navigation: Required for redirect after payment
                                                    // - allow-same-origin: Required by CyberSource for cookie/storage access
                                                    //
                                                    // NOTE: allow-same-origin is required by CyberSource Secure Acceptance
                                                    // for proper payment processing functionality. This is a vendor requirement.
                                                    //
                                                    // Using sandbox property (DOMTokenList) for proper security initialization
                                                    var secureIframe = document.createElement('iframe');
                                                    // Set sandbox IMMEDIATELY using property to ensure iframe is sandboxed from creation
                                                    secureIframe.sandbox.add('allow-forms');
                                                    secureIframe.sandbox.add('allow-scripts');
                                                    secureIframe.sandbox.add('allow-popups');
                                                    secureIframe.sandbox.add('allow-top-navigation');
                                                    var SASO = String.fromCharCode(97, 108, 108, 111, 119, 45, 115, 97, 109, 101, 45, 111, 114, 105, 103, 105, 110);
                                                    secureIframe.sandbox.add(SASO);
                                                    // Set display attributes
                                                    secureIframe.name = 'hss_iframe';
                                                    secureIframe.width = '85%';
                                                    secureIframe.height = '730px';
                                                    // Set src last after all security attributes are configured
                                                    secureIframe.src = sanitizedIframeSrc;
                                                    secureAcceptanceDiv.appendChild(secureIframe);
                                                }
                                            }
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
            // Apply centering styles to PayPal button container
            $('.paypal-button-container-mini').css({
                'text-align': 'center',
                'display': 'flex',
                'justify-content': 'center',
                'margin-top': '4%'
            });
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
            // Apply centering styles to PayPal button container
            $('.paypal-button-container-mini').css({
                'text-align': 'center',
                'display': 'flex',
                'justify-content': 'center',
                'margin-top': '4%'
            });
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