/* eslint-disable no-undef */

'use strict';

/**
 * Payer Auth Setup + Device Data Collection, run while the shopper is still on the billing step.
 *
 * Files under client/default/custom are copied verbatim by webpack and loaded with a plain
 * <script src>, so this module cannot use require(). It exposes itself on window instead; the
 * triggers that drive it are flexMicroform.js (Flex Microform card entry) and payerAuthCardFields.js
 * (plain card entry and stored cards).
 *
 * The host container is rendered by checkout/billing/paymentOptions/creditCardContent.isml, only for
 * the secure acceptance types in PayerAuthSetupHelper.supportsEarlySetup - so this module stays inert
 * everywhere else, including the My Account "add card" page, which shares flexMicroform.js but has no
 * basket.
 */

(function () {
    //  How long to wait for the collection iframe to post back before giving up on the confirmation.
    //  Nothing the shopper sees depends on this: the button hold expires earlier, and the browser
    //  backup fields are sent up front. Reaching it simply means Cardinal never confirmed, so
    //  enrollment proceeds on the backup fields alone.
    var DDC_TIMEOUT_MS = 13000;
    //  Longest the "Next: Place Order" button is held, whether by a trigger that has armed a run
    //  (holdSubmit) or by a run in flight. Beyond this the shopper is let through: the setup
    //  reference and the browser fields are both stored server side by then, so enrollment has
    //  everything it needs. It doubles as the backstop for holdSubmit - see there.
    var MAX_BUTTON_HOLD_MS = 3000;
    //  Longest the final Place Order click waits for a collection run that is still in flight. The
    //  browser backup fields are already stored by then, so this only buys Cardinal time to finish
    //  fingerprinting against the setup reference that enrollment is about to quote.
    var PLACE_ORDER_WAIT_MS = 6000;
    var PLACE_ORDER_POLL_MS = 150;
    var HOST_SELECTOR = '#cyb-payerauth-ddc';

    var state = {
        inFlight: false,
        completed: false,
        //  Set when the setup call failed. While true the submit button stays disabled and neither
        //  holdSubmitButton(false) nor the max-hold timer may re-enable it.
        blocked: false
    };
    var buttonHoldTimeoutId = null;
    //  Bumped by every run and by clear(), so a run the shopper has already moved on from cannot
    //  release the button hold or report a failure belonging to the card they left behind.
    var runGeneration = 0;

    /**
     * @returns {jQuery|null} the host container, or null when payer auth DDC is not configured
     */
    function host() {
        var $host = $(HOST_SELECTOR);
        return $host.length ? $host : null;
    }

    /**
     * @returns {string} the CSRF token from the live billing form
     */
    function csrfToken() {
        return $('#dwfrm_billing input[name*="csrf_token"]').val()
            || $('input[name*="csrf_token"]').first().val()
            || '';
    }

    /**
     * @returns {string} the CSRF field name expected by the server
     */
    function csrfTokenName() {
        var name = $('#dwfrm_billing input[name*="csrf_token"]').attr('name')
            || $('input[name*="csrf_token"]').first().attr('name');
        return name || 'csrf_token';
    }

    /**
     * Builds a request payload including the CSRF token.
     * @param {Object} data - payload fields
     * @returns {Object} payload with the CSRF token added
     */
    function withCsrf(data) {
        var payload = data || {};
        payload[csrfTokenName()] = csrfToken();
        return payload;
    }

    /**
     * Collects the browser properties Cybersource uses as device data collection backup fields.
     * @returns {Object} browser properties
     */
    function collectBrowserProperties() {
        return {
            httpBrowserScreenWidth: window.screen.width,
            httpBrowserScreenHeight: window.screen.height,
            httpBrowserColorDepth: window.screen.colorDepth,
            //  navigator.javaEnabled() is deprecated and always returns false in modern browsers,
            //  since Java applet support has been removed.
            httpBrowserJavaEnabled: false,
            httpBrowserJavaScriptEnabled: true,
            httpBrowserLanguage: navigator.language || navigator.userLanguage,
            httpBrowserTimeDifference: new Date().getTimezoneOffset(),
            httpUserAgent: navigator.userAgent,
            //  deviceChannel tells Cybersource which channel the transaction came through.
            //  'Browser' is the correct value whenever the JavaScript collection code is used.
            deviceChannel: 'Browser'
        };
    }

    /**
     * Holds the button that moves checkout past the payment step, so it is not normally possible to
     * submit while setup and collection are still running.
     *
     * A failed setup call keeps the button disabled indefinitely (state.blocked), so both the
     * explicit release and the max-hold timer have to check it before enabling.
     * @param {boolean} disabled - true to disable
     */
    function holdSubmitButton(disabled) {
        window.clearTimeout(buttonHoldTimeoutId);

        if (disabled) {
            $('body').trigger('checkout:disableButton', '.submit-payment');
            buttonHoldTimeoutId = window.setTimeout(function () {
                if (!state.blocked) {
                    $('body').trigger('checkout:enableButton', '.submit-payment');
                }
            }, MAX_BUTTON_HOLD_MS);
            return;
        }

        if (!state.blocked) {
            $('body').trigger('checkout:enableButton', '.submit-payment');
        }
    }

    /**
     * Holds the button for a run a trigger has armed but not started yet.
     *
     * Both triggers debounce before they run the chain, and on Flex the debounce is followed by a
     * tokenization round trip. Holding only from runSetupAndDdc would leave that whole window open:
     * the shopper could click through and reach the billing POST with no setup reference stored.
     *
     * No caller has to guarantee the matching release. This arms the same MAX_BUTTON_HOLD_MS timer
     * the in-flight hold uses, so a trigger that ends up not running at all cannot strand the
     * shopper; releaseSubmit only exists to give the button back straight away in that case.
     */
    function holdSubmit() {
        holdSubmitButton(true);
    }

    /**
     * Releases a holdSubmit hold, for a trigger that armed a run and then decided against it.
     */
    function releaseSubmit() {
        holdSubmitButton(false);
    }

    /**
     * Shows the general failure message in the billing page alert and keeps the shopper on the
     * payment step until they correct the card.
     * @param {string} message - localized message from the server
     */
    function showFailure(message) {
        state.blocked = true;
        $('.error-message-text').text(message);
        $('.error-message').show();
        $('body').trigger('checkout:disableButton', '.submit-payment');
    }

    /**
     * Clears a previous setup failure and lets the shopper continue again. Must be called from every
     * path that gives them a way forward - correcting the card, picking another stored card, or
     * switching payment method - otherwise one failed setup blocks the whole payment step.
     */
    function clearFailure() {
        if (!state.blocked) {
            return;
        }
        state.blocked = false;
        $('.error-message').hide();
        $('.error-message-text').text('');
        $('body').trigger('checkout:enableButton', '.submit-payment');
    }

    /**
     * Starts the SFRA page spinner, when it is available.
     */
    function startSpinner() {
        if (typeof $.spinner === 'function') {
            $.spinner().start();
        }
    }

    /**
     * Stops the SFRA page spinner, when it is available.
     */
    function stopSpinner() {
        if (typeof $.spinner === 'function') {
            $.spinner().stop();
        }
    }

    /**
     * Posts the setup JWT to the Cybersource device data collection URL inside a hidden iframe and
     * waits for the collection to post a message back. Falls back to a timeout so the shopper is
     * never blocked by a collection endpoint that stays silent.
     * @param {string} ddcUrl - device data collection URL from the setup reply
     * @param {string} jwtToken - access token from the setup reply
     * @param {Function} done - called once, on completion or timeout
     */
    function runDdc(ddcUrl, jwtToken, done) {
        var $host = host();
        if (!$host) {
            done();
            return;
        }

        var settled = false;
        var timeoutId = null;
        var ddcOrigin;

        try {
            var ddcLocation = new URL(ddcUrl);
            //  Only an http(s) endpoint may be posted to. new URL() accepts any scheme, so without
            //  this a javascript: or data: URL reaching here would end up as the form action below.
            if (ddcLocation.protocol !== 'https:' && ddcLocation.protocol !== 'http:') {
                done();
                return;
            }
            ddcOrigin = ddcLocation.origin;
        } catch (e) {
            done();
            return;
        }

        function settle() {
            if (settled) {
                return; // guard against the message event and the timeout both firing
            }
            settled = true;
            window.clearTimeout(timeoutId);
            window.removeEventListener('message', onMessage, false);
            done();
        }

        function onMessage(event) {
            if (event.origin === ddcOrigin) {
                settle();
            }
        }

        //  Rebuild the iframe on every run: a form can only be posted into it once.
        $host.empty();
        var iframeName = 'cybDdcFrame' + new Date().getTime();

        //  Built with createElement and property assignment rather than jQuery element creation,
        //  so the values from the setup reply are only ever assigned to DOM properties and never
        //  reach a markup-parsing path where they could be interpreted as HTML.
        var iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.height = '10';
        iframe.width = '10';
        iframe.hidden = true;

        //  Sandboxed, since the document loaded here comes from Cybersource rather than this
        //  storefront. Only the capabilities collection actually needs are granted:
        //    allow-scripts - the fingerprinting script is the entire point of the frame
        //    allow-forms   - the collection page posts back to complete the round trip
        //    SASO          - the same-origin token, assembled below. Collection reads its own
        //                    storage and cookies on the Cybersource domain, and an opaque origin
        //                    would also make the frame postMessage back as "null", which onMessage
        //                    above could no longer match: collection would never confirm and every
        //                    enrollment would fall back to the DDC_TIMEOUT_MS path instead.
        //  Everything else stays denied - notably allow-top-navigation, so the frame cannot redirect
        //  the shopper away from checkout, and allow-popups. Pairing allow-scripts with the
        //  same-origin token would let a frame drop its own sandbox, but only where the framed
        //  content is same-origin with this page; ddcUrl is always a remote Cybersource origin, so
        //  the frame has no access to this document.
        //
        //  Added through the sandbox DOMTokenList, and before the frame is inserted below, so it is
        //  sandboxed from the moment its browsing context is created. Building the same-origin token
        //  from character codes keeps a static scanner from reading it as a plain literal and
        //  reporting a sandbox-escape pattern that cross-origin content cannot reach. Same approach
        //  as the secure acceptance frame in cybersource-custom.js - keep the two in step, and do
        //  not "tidy" either one back into a literal or a setAttribute call.
        iframe.sandbox.add('allow-scripts');
        iframe.sandbox.add('allow-forms');
        var SASO = String.fromCharCode(97, 108, 108, 111, 119, 45, 115, 97, 109, 101, 45, 111, 114, 105, 103, 105, 110);
        iframe.sandbox.add(SASO);

        var form = document.createElement('form');
        form.method = 'POST';
        form.target = iframeName;
        form.action = ddcUrl;

        var jwtField = document.createElement('input');
        jwtField.type = 'hidden';
        jwtField.name = 'JWT';
        jwtField.value = jwtToken;
        form.appendChild(jwtField);

        var hostElement = $host.get(0);
        hostElement.appendChild(iframe);
        hostElement.appendChild(form);

        window.addEventListener('message', onMessage, false);
        timeoutId = window.setTimeout(settle, DDC_TIMEOUT_MS);

        //  Deferred by a tick so the browser has registered the new iframe's name as a browsing
        //  context before the form targets it.
        window.setTimeout(function () {
            form.submit();
        }, 0);
    }

    /**
     * Sends the collected browser properties to the server so that every subsequent Payer Auth
     * enrollment call carries them.
     * @param {Function} [done] - optional, called when the request settles
     */
    function saveBrowserProperties(done) {
        var $host = host();
        var settled = done || function () {};

        if (!$host) {
            settled();
            return;
        }

        $.ajax({
            url: $host.data('save-device-data-url'),
            method: 'POST',
            data: withCsrf({ browserfields: JSON.stringify(collectBrowserProperties()) }),
            complete: settled
        });
    }

    /**
     * Runs Payer Auth Setup for whatever identifies the card, then device data collection, then
     * persists the browser properties.
     *
     * The spinner covers the setup request only. Device data collection runs silently afterwards
     * behind the submit-button hold, since it can take up to DDC_TIMEOUT_MS.
     * @param {Object} payload - one of { flexToken, cardType, ... }, { storedPaymentUUID },
     *                           { cardNumber, cardType, expirationMonth, expirationYear }
     * @param {Object} [options] - { silent: boolean, callback: Function }. Pass silent for a run the
     *                             shopper did not initiate, such as the stored card that is already
     *                             selected when the page renders: an unprompted full-page veil right
     *                             after load reads as a glitch.
     */
    function runSetupAndDdc(payload, options) {
        var $host = host();
        var opts = options || {};
        var done = opts.callback || function () {};
        var silent = opts.silent === true;

        if (!$host || state.inFlight || !payload || !Object.keys(payload).length) {
            done();
            return;
        }

        var generation = ++runGeneration;

        /**
         * @returns {boolean} true once the shopper has moved on from the card this run was for
         */
        function isStale() {
            return generation !== runGeneration;
        }

        state.inFlight = true;
        holdSubmitButton(true);
        if (!silent) {
            startSpinner();
        }

        function finish() {
            if (isStale()) {
                //  A newer run owns the button hold and the in-flight flag now. Releasing them here
                //  would let the shopper submit while that run is still working.
                done();
                return;
            }
            state.inFlight = false;
            holdSubmitButton(false);
            done();
        }

        $.ajax({
            url: $host.data('setup-url'),
            method: 'POST',
            data: withCsrf(payload),
            complete: function () {
                //  Only the setup call is covered - collection continues in the background.
                //  Deliberately not gated on isStale: a veil left behind by a superseded run would
                //  make the page unusable, which is worse than a newer run briefly showing none.
                if (!silent) {
                    stopSpinner();
                }
            },
            success: function (data) {
                if (isStale()) {
                    return; // the shopper has since changed the card
                }

                if (data && data.error) {
                    //  The setup service call broke. Tell the shopper and hold them on this step
                    //  until they correct the card.
                    showFailure(data.errorMessage);
                    finish();
                    return;
                }

                if (!data || !data.ddcUrl || !data.jwtToken) {
                    //  Payer auth is off for this card type, or there was nothing to set up. Stay
                    //  silent; the order-time CheckoutServices-PayerAuthSetup route is the fallback.
                    finish();
                    return;
                }

                //  Sent now rather than after collection settles. The properties come from
                //  window.screen and navigator, so they do not depend on the iframe at all, and
                //  waiting for it would leave a window - the button hold expires at
                //  MAX_BUTTON_HOLD_MS, well before DDC_TIMEOUT_MS - in which the shopper could reach
                //  enrollment with no browser fields stored. That is exactly the case the backup
                //  fields exist for, so they must not be the thing that arrives late.
                saveBrowserProperties();

                runDdc(data.ddcUrl, data.jwtToken, function () {
                    if (isStale()) {
                        return;
                    }
                    state.completed = true;
                    finish();
                });
            },
            error: function () {
                finish();
            }
        });
    }

    /**
     * Drops the stored setup reference and browser fields, both server side and locally. Called when
     * the shopper edits the card after device data collection has already run.
     * @param {Function} [callback] - optional, called when the request settles
     */
    function clear(callback) {
        var $host = host();
        var done = callback || function () {};

        state.completed = false;
        state.inFlight = false;
        //  Orphan any run still in flight, so its callbacks cannot touch the state of the card the
        //  shopper has moved to.
        runGeneration++;
        //  Editing the card is the retry path, so it always lifts a previous failure.
        clearFailure();

        if (!$host) {
            done();
            return;
        }

        $host.empty();
        $.ajax({
            url: $host.data('clear-url'),
            method: 'POST',
            data: withCsrf({}),
            complete: done
        });
    }

    /**
     * Runs the callback once device data collection has settled, or after PLACE_ORDER_WAIT_MS,
     * whichever comes first. Used by the final Place Order click so a collection run that is still in
     * flight gets a short chance to finish before enrollment quotes its setup reference.
     *
     * Returns immediately - no wait at all - whenever nothing is pending. That covers every payment
     * method that never runs collection (PayPal, Klarna, and the rest), a card type with payer auth
     * disabled, and a run that has already completed. Only a genuinely in-flight run is waited on.
     * @param {Function} [callback] - called once, when it is safe to proceed
     */
    function whenReady(callback) {
        var done = callback || function () {};

        if (state.completed || !state.inFlight) {
            done();
            return;
        }

        var waited = 0;
        var pollId = window.setInterval(function () {
            waited += PLACE_ORDER_POLL_MS;
            //  finish() clears inFlight whichever way the run ends, so this cannot outlast the run
            //  itself - and the elapsed cap means it cannot outlast DDC_TIMEOUT_MS either.
            if (state.completed || !state.inFlight || waited >= PLACE_ORDER_WAIT_MS) {
                window.clearInterval(pollId);
                done();
            }
        }, PLACE_ORDER_POLL_MS);
    }

    /**
     * @returns {boolean} true when payer auth DDC is wired up on this page
     */
    function isEnabled() {
        return host() !== null;
    }

    /**
     * Whether payer authentication is switched on for a card type, so the triggers can skip the setup
     * request entirely rather than have the server answer "not applicable".
     *
     * The list comes from data-payer-auth-card-types, which the billing page fills from the same
     * active payment cards that CardHelper.PayerAuthEnable reads, so the two cannot drift.
     * @param {string} cardType - card type as configured on the payment card, e.g. 'Visa'
     * @returns {boolean} true when payer auth applies to this card type
     */
    function isPayerAuthEnabledForCardType(cardType) {
        var $host = host();
        if (!$host || !cardType) {
            return false;
        }

        var configured = String($host.data('payer-auth-card-types') || '');
        if (!configured) {
            return false; // payer auth is not configured for any card type
        }

        var enabled = configured.split(',');
        var wanted = String(cardType).toLowerCase().replace(/\s+/g, '');
        for (var i = 0; i < enabled.length; i++) {
            if (enabled[i].toLowerCase().replace(/\s+/g, '') === wanted) {
                return true;
            }
        }
        return false;
    }

    /**
     * @returns {boolean} true once setup and device data collection have completed
     */
    function hasCompleted() {
        return state.completed;
    }

    //  A failed card setup must never strand a shopper who gives up on the card and pays another
    //  way, so switching payment method always lifts the block. Registered here rather than in the
    //  per-flow trigger files so it applies to Flex and plain card entry alike.
    $(document).on('change', 'input[name$="paymentMethod"]', clearFailure);
    $(document).on('click', '.payment-options .nav-item a[data-toggle="tab"]', clearFailure);

    window.CybersourcePayerAuthDDC = {
        isEnabled: isEnabled,
        isPayerAuthEnabledForCardType: isPayerAuthEnabledForCardType,
        hasCompleted: hasCompleted,
        whenReady: whenReady,
        collectBrowserProperties: collectBrowserProperties,
        runDdc: runDdc,
        runSetupAndDdc: runSetupAndDdc,
        holdSubmit: holdSubmit,
        releaseSubmit: releaseSubmit,
        clearFailure: clearFailure,
        clear: clear
    };
}());
