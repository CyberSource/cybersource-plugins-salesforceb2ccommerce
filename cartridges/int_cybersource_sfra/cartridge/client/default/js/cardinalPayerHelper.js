'use strict';

//  Posted by the PayerAuthReturn interstitial the moment the ACS hands control back, before any
//  validation or order placement runs. See templates/default/payerauthentication/payerAuthReturn.isml.
var COMPLETE_MESSAGE = 'cybersource:payerauth-complete';

/**
 * Initialize Cardinal Payer Authentication Modal
 */
function initCardinalPayerAuthModal() {
    var DOMPurify = require('dompurify');
    var modalOverlay = document.getElementById('stepup-modal-overlay');
    var stepUpForm = document.getElementById('step-up-form');
    var iframe = document.getElementById('step-up-iframe');
    var processing = document.getElementById('stepup-processing');
    var timeoutMessage = document.getElementById('stepup-timeout');

    if (!modalOverlay || !stepUpForm || !iframe) {
        console.error('Cardinal Payer Auth: Required elements not found');
        return;
    }

    //  Latched once the challenge is known to be over, so a later load cannot put the iframe back.
    var finished = false;

    /**
     * Read the iframe URL, or null while it is cross-origin (i.e. still on the ACS).
     * @returns {string|null} the iframe location, or null if it cannot be read
     */
    function readIframeUrl() {
        try {
            var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            return iframeDoc.location.href;
        } catch (e) {
            return null;
        }
    }

    /**
     * Show the challenge iframe and hide the spinner.
     */
    function showChallenge() {
        if (finished) {
            return;
        }
        if (processing) {
            processing.hidden = true;
        }
        iframe.hidden = false;
    }

    /**
     * Hide the iframe and spin while validation and order placement run server side.
     */
    function showProcessing() {
        finished = true;
        iframe.hidden = true;
        if (processing) {
            processing.hidden = false;
        }
    }

    //  Primary signal. The interstitial states outright that the challenge has ended, so there is
    //  nothing to infer from timings.
    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) {
            return;
        }
        if (event.data && event.data.type === COMPLETE_MESSAGE) {
            showProcessing();
        }
    });

    //  Backstop, and how the spinner is cleared when the challenge first appears. Only the ACS is
    //  cross-origin and only the ACS ever shows the shopper something to act on, so a cross-origin
    //  document is always safe to reveal. Anything same-origin is our own return plumbing, which
    //  means the challenge is over. Neither branch is a guess, so a slow or multi-step ACS can
    //  never end up hidden behind the spinner.
    iframe.addEventListener('load', function () {
        var url = readIframeUrl();

        //  A src-less iframe can fire a load for about:blank before we post to it.
        if (url === 'about:blank') {
            return;
        }

        if (url === null) {
            showChallenge();
        } else {
            showProcessing();
        }
    });

    // Show the modal immediately
    modalOverlay.style.display = 'flex';

    // Submit the form to start authentication
    stepUpForm.submit();
    console.log("Cardinal Payer Authentication form submitted");

    // Monitor iframe for redirect/completion
    var checkInterval = setInterval(function () {
        // Try to access iframe content to detect if it's still on the same domain
        var iframeUrl = readIframeUrl();

        // Cross-origin access blocked during authentication - keep checking
        if (!iframeUrl || iframeUrl === 'about:blank') {
            return;
        }

        //  The interstitial forwards itself on to COPlaceOrder-Submit. Navigating the parent to it
        //  would hijack that hand-off, so let it finish.
        if (iframeUrl.indexOf('PayerAuthReturn') > -1) {
            return;
        }

        // Check if iframe has redirected to our domain
        if (iframeUrl.indexOf(window.location.hostname) > -1) {
            clearInterval(checkInterval);

            //  The overlay deliberately stays up: the navigation below is another server round
            //  trip, and hiding it here would drop the shopper back onto the stale checkout page.
            showProcessing();

            // Check if this is an SCA retrigger scenario
            if (iframeUrl.indexOf('CheckoutServices-PayerAuthSetup') > -1) {
                var redirect = $('<form>')
                    .appendTo(document.body)
                    .attr({
                        method: 'POST',
                        action: iframeUrl,
                        target: "_parent"
                    });
                redirect.submit();
            } else {
                // Normal redirect for other scenarios
                window.location.href = DOMPurify.sanitize(iframeUrl);
            }
        }
    }, 1000);

    // Cleanup interval after 5 minutes (timeout)
    setTimeout(function () {
        clearInterval(checkInterval);
        console.log("Cardinal Authentication timeout, stopping monitoring");

        //  Leave the overlay up with an explanation instead of silently dropping the shopper
        //  back onto the checkout page with no feedback.
        if (finished) {
            return;
        }
        finished = true;
        iframe.hidden = true;
        if (processing) {
            processing.hidden = true;
        }
        if (timeoutMessage) {
            timeoutMessage.hidden = false;
        } else {
            modalOverlay.style.display = 'none';
        }
        console.warn("Authentication timed out after 5 minutes");
    }, 300000); // 5 minutes
}

/**
 * Initialize when DOM is ready
 */
window.onload = function () {
    // Check if we're on the Cardinal Payer Authentication page
    var payerAuthDiv = document.getElementById('cyb_payerauth');
    if (payerAuthDiv) {
        initCardinalPayerAuthModal();
    } else {
        var stepUpForm = document.querySelector('#step-up-form');
        if (stepUpForm) {
            stepUpForm.submit();
        }
    }
};
