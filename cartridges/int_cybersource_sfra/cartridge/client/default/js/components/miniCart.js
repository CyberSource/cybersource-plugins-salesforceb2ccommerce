'use strict';

// var cart = require('base/cart/cart');
/* eslint-disable no-undef */

/**
 * Safely sanitize HTML content using DOMPurify.
 * DOMPurify is loaded globally via /custom/lib/dompurify.min.js in scripts.isml
 * EXACT pattern from cybersource-custom.js safeSanitizeTemplate (line 27-40) which has NO Checkmarx issues.
 * @param {string} dirty - The untrusted HTML content to sanitize
 * @returns {string} Sanitized HTML string safe for DOM insertion
 */
function safeSanitizeTemplate(dirty) {
    if (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function') {
        // EXACT options from cybersource-custom.js safeSanitizeTemplate function
        var templateOptions = {
            ADD_TAGS: ['form', 'input', 'iframe', 'link', 'style', 'klarna-placement', 'klarna-express-button'],
            ADD_ATTR: ['action', 'method', 'type', 'name', 'value', 'id', 'class', 'href', 'src', 'rel', 'target',
                       'scrolling', 'width', 'height', 'frameborder', 'data-action', 'data-uuid', 'data-pid',
                       'data-href', 'data-client-token', 'data-environment', 'data-locale', 'data-purchase-country',
                       'data-theme', 'data-shape', 'data-on-click', 'data-instance-id'],
            ALLOW_DATA_ATTR: true,
            ALLOW_UNKNOWN_PROTOCOLS: false,
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onsubmit', 'onkeyup', 'onkeydown']
        };
        return DOMPurify.sanitize(dirty, templateOptions);
    }
    // Fallback: return empty string if DOMPurify is not available (security requirement)
    console.warn('DOMPurify not available - content blocked for security');
    return '';
}

/**
 * Extract Klarna variables from HTML before sanitization strips the script tags.
 * Only extracts known Klarna configuration values using strict patterns.
 * @param {string} html - The HTML string containing Klarna script
 */
function extractKlarnaVariables(html) {
    // Initialize klarnaVariables if not exists
    window.klarnaVariables = window.klarnaVariables || {};
    
    // Extract specific known Klarna variables using strict regex patterns
    var patterns = {
        isKlarnaEnabledForCartAndMinicart: /window\.klarnaVariables\.isKlarnaEnabledForCartAndMinicart\s*=\s*["']([^"']+)["']/,
        handleExpressCheckoutAuth: /window\.klarnaVariables\.handleExpressCheckoutAuth\s*=\s*["']([^"']+)["']/,
        createSessionEndpoint: /window\.klarnaVariables\.createSessionEndpoint\s*=\s*["']([^"']+)["']/,
        klarnaClientToken: /window\.klarnaVariables\.klarnaClientToken\s*=\s*["']([^"']+)["']/,
        currentLocale: /window\.klarnaVariables\.currentLocale\s*=\s*["']([^"']+)["']/
    };
    
    Object.keys(patterns).forEach(function(key) {
        var match = html.match(patterns[key]);
        if (match && match[1]) {
            window.klarnaVariables[key] = match[1];
        }
    });
}

module.exports = function () {
    // cart();
    $('.minicart').on('count:update', function (event, count) {
        if (count && !Number.isNaN(Number(count.quantityTotal))) {
            $('.minicart .minicart-quantity').text(count.quantityTotal);
        }
    });

    $('.minicart').off('mouseenter focusin touchstart').on('mouseenter focusin touchstart', function (event) {
        if ($('.search:visible').length === 0) {
            return;
        }
        var url = $('.minicart').data('action-url');
        var count = parseInt($('.minicart .minicart-quantity').text(), 10);
        if (count !== 0 && $('.minicart .popover.show').length === 0) {
            $('.minicart .popover').addClass('show');
            $('.minicart .popover').spinner().start();
            $.get(url, function (data) {
                if (data) {
                    // Extract Klarna variables BEFORE sanitization strips the script tags
                    extractKlarnaVariables(data);
                    var sanitizedHtml = safeSanitizeTemplate(data);
                    $('.minicart .popover').html(sanitizedHtml);
                }

                var isPaypalEnabled = !!($('#paypal_enabled').length > 0 && document.getElementById('paypal_enabled').value === 'true');
                var isGooglePayEnabled = !!($('#isGooglePayEnabled').length > 0 && $('#isGooglePayEnabled').val() === 'true');

                if (isPaypalEnabled) {
                    paypalhelper.paypalMini();
                }
                if (isGooglePayEnabled) {
                    onGooglePayLoaded();
                }
                if (window.klarnaVariables && window.klarnaVariables.isKlarnaEnabledForCartAndMinicart === 'true') {
                    window.handleKlarna(false);  // isCheckoutPage = false
                }

                $.spinner().stop();
            });
        }
        event.stopImmediatePropagation();
    });
    $('body').on('touchstart click', function (e) {
        if ($('.minicart').has(e.target).length <= 0) {
            $('.minicart .popover').empty();
            $('.minicart .popover').removeClass('show');
        }
    });

    $('.minicart').on('mouseleave focusout', function (event) {
        if ((event.type === 'focusout' && $('.minicart').has(event.target).length > 0)
            || (event.type === 'mouseleave' && $(event.target).is('.minicart .quantity'))
            || $('body').hasClass('modal-open')) {
            event.stopPropagation();
            return;
        }
        if (!($(document).find('.paypal-checkout-sandbox').length > 0)) {
            $('.minicart .popover').empty();
            $('.minicart .popover').removeClass('show');
        }

        event.stopImmediatePropagation();
    });
    $('body').on('change', '.minicart .quantity', function () {
        if ($(this).parents('.bonus-product-line-item').length && $('.cart-page').length) {
            // eslint-disable-next-line
            location.reload();
        }
    });
};
