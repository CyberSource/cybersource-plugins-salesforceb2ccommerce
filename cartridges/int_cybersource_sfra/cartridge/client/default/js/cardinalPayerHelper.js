'use strict';

/**
 * Initialize Cardinal Payer Authentication Modal
 */
function initCardinalPayerAuthModal() {
    var DOMPurify = require('dompurify');
    var modalOverlay = document.getElementById('stepup-modal-overlay');
    var stepUpForm = document.getElementById('step-up-form');
    var iframe = document.getElementById('step-up-iframe');

    if (!modalOverlay || !stepUpForm || !iframe) {
        console.error('Cardinal Payer Auth: Required elements not found');
        return;
    }

    // Show the modal immediately
    modalOverlay.style.display = 'flex';

    // Submit the form to start authentication
    stepUpForm.submit();
    console.log("Cardinal Payer Authentication form submitted");

    // Monitor iframe for redirect/completion
    var checkInterval = setInterval(function () {
        try {
            // Try to access iframe content to detect if it's still on the same domain
            var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            var iframeUrl = iframeDoc.location.href;

            // Check if iframe has redirected to our domain
            if (iframeUrl && iframeUrl.indexOf(window.location.hostname) > -1) {
                console.log("Cardinal Authentication completed, iframe URL:", iframeUrl);
                clearInterval(checkInterval);

                // Hide modal and redirect
                modalOverlay.style.display = 'none';
                // Check if this is an SCA retrigger scenario
                if (iframeUrl.indexOf('COPlaceOrder-PayerAuth') > -1) {
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
        } catch (e) {
            // Cross-origin access blocked - this is expected during authentication
            // Continue checking
        }
    }, 1000);

    // Cleanup interval after 5 minutes (timeout)
    setTimeout(function () {
        clearInterval(checkInterval);
        console.log("Cardinal Authentication timeout, stopping monitoring");

        // Optionally show timeout message or redirect
        modalOverlay.style.display = 'none';
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
        // Fallback for legacy behavior
        var stepUpForm = document.querySelector('#step-up-form');
        if (stepUpForm) {
            stepUpForm.submit();
        }
    }
};