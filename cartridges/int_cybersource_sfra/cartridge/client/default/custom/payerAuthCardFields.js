/* eslint-disable no-undef */

'use strict';

/**
 * Fires Payer Auth Setup + Device Data Collection as soon as the shopper has settled on a card.
 *
 * Files under client/default/custom are copied verbatim by webpack and loaded with a plain
 * <script src>, so this module cannot use require().
 *
 * Two branches:
 *   new card    - card number, expiry and security code typed into the billing form. Skipped on
 *                 SA_FLEX, where flexMicroform.js owns tokenization and drives the chain itself.
 *   stored card - a saved payment instrument is selected. Runs for every secure acceptance type,
 *                 including SA_FLEX, because a stored card never touches the microform.
 *
 * A stored card is already selected when the page renders - the first of several, or the only one -
 * so there is no interaction to wait for. The stored branch therefore also fires once at load, and
 * silently, since a full-page spinner with no click behind it reads as a glitch.
 *
 * The whole module is inert unless payerAuthDDC.js found its host container, which is only rendered
 * inside checkout for the non-hosted secure acceptance types.
 */

$(document).ready(function () {
    var TRIGGER_DEBOUNCE_MS = 600;

    var state = {
        completed: false,
        //  Identity of the card the current reference describes, so a change event that did not
        //  actually change anything (blurring #cardNumber, for instance) does not throw the
        //  reference away and fire a second, identical setup call.
        lastPayloadKey: null
    };
    var triggerTimeoutId = null;
    //  True while this file is holding the submit button for a run it has armed but not started.
    //  Tracked so releaseHold only ever gives back a hold this file took: on a Flex site
    //  flexMicroform.js holds for new card entry and both files see the expiry change events, and
    //  releasing unconditionally there would hand the button back mid-tokenization.
    var holdingSubmit = false;

    /**
     * @returns {Object|null} the payer auth DDC module, when it is wired up on this page
     */
    function ddc() {
        var module = window.CybersourcePayerAuthDDC;
        return module && module.isEnabled() ? module : null;
    }

    if (!ddc()) {
        return;
    }

    /**
     * @returns {boolean} true on a Flex Microform site, where flexMicroform.js owns new card entry
     */
    function isFlexSite() {
        return $('li[data-method-id="CREDIT_CARD"]').attr('data-sa-type') === 'SA_FLEX';
    }

    /**
     * Reads the unformatted card number. Cleave formats the visible value with spaces, so the raw
     * value has to come from the Cleave instance - the same way the cartridge's cleave.js
     * serializeData override reads it. Falls back to stripping non-digits.
     * @returns {string} the card number digits
     */
    function rawCardNumber() {
        var $cardNumber = $('#cardNumber');
        var cleave = $cardNumber.data('cleave');

        if (cleave && typeof cleave.getRawValue === 'function') {
            return String(cleave.getRawValue() || '');
        }
        return String($cardNumber.val() || '').replace(/\D/g, '');
    }

    /**
     * Luhn check, so a half-typed number never triggers a doomed setup call.
     * @param {string} digits - card number digits
     * @returns {boolean} true when the check digit is valid
     */
    function passesLuhn(digits) {
        var sum = 0;
        var shouldDouble = false;

        for (var i = digits.length - 1; i >= 0; i--) {
            var digit = parseInt(digits.charAt(i), 10);
            if (isNaN(digit)) {
                return false;
            }
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }

        return sum > 0 && sum % 10 === 0;
    }

    /**
     * @returns {boolean} true when a non-expired month and year are both selected
     */
    function isExpiryComplete() {
        var expMonth = $('#expirationMonth').val();
        var expYear = $('#expirationYear').val();

        if (!expMonth || !expYear) {
            return false;
        }

        var now = new Date();
        var currentMonth = now.getMonth() + 1;
        var currentYear = now.getFullYear();

        return !(expYear < currentYear || (expYear == currentYear && expMonth < currentMonth)); // eslint-disable-line eqeqeq
    }

    /**
     * @param {string} value - security code as typed
     * @returns {boolean} true for a plausible 3 or 4 digit code
     */
    function isSecurityCodeComplete(value) {
        //  Surrounding whitespace is tolerated in the pattern itself rather than trimmed off first,
        //  so a shopper who pastes the code with a stray space is not held back by it.
        return /^\s*\d{3,4}\s*$/.test(String(value || ''));
    }

    /**
     * @returns {jQuery} the selected stored payment instrument, empty when none is selected
     */
    function selectedStoredCard() {
        return $('.saved-payment-instrument.selected-payment');
    }

    /**
     * True when the shopper is entering a new card rather than using a stored one. The stored-payment
     * block is hidden once "Add new card" is clicked, and absent entirely for guests.
     * @returns {boolean} true when the new card form is the active choice
     */
    function isNewCardEntry() {
        var $storedCards = $('.user-payment-instruments');
        return !$storedCards.length || $storedCards.hasClass('checkout-hidden');
    }

    /**
     * Builds the setup payload for whichever branch is active, or null when the shopper has not
     * finished yet or the card does not need payer authentication.
     * @returns {Object|null} payload for CheckoutServices-PayerAuthSetupData
     */
    function buildPayload() {
        if (isNewCardEntry()) {
            if (isFlexSite()) {
                return null; // flexMicroform.js handles this
            }

            var digits = rawCardNumber();
            var cardType = String($('#cardType').val() || '');

            if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) {
                return null;
            }
            if (!cardType || cardType === 'Unknown') {
                return null;
            }
            if (!ddc().isPayerAuthEnabledForCardType(cardType)) {
                return null;
            }
            if (!isExpiryComplete() || !isSecurityCodeComplete($('#securityCode').val())) {
                return null;
            }

            return {
                cardNumber: digits,
                cardType: cardType,
                expirationMonth: $('#expirationMonth').val(),
                expirationYear: $('#expirationYear').val()
            };
        }

        var $storedCard = selectedStoredCard();
        var storedUUID = $storedCard.length ? $storedCard.data('uuid') : null;
        if (!storedUUID) {
            return null;
        }
        if (!ddc().isPayerAuthEnabledForCardType(String($storedCard.data('card-type') || ''))) {
            return null;
        }

        //  No security code check: the setup request for a stored card is built from the wallet token
        //  that the server resolves from this UUID, and addCardInfo never reads a security code
        //  anyway. This cartridge's storedPaymentInstruments.isml does not even render a code field.
        return { storedPaymentUUID: storedUUID };
    }

    /**
     * @param {Object|null} payload - a setup payload, or null
     * @returns {string|null} a stable key identifying the card the payload describes
     */
    function payloadKey(payload) {
        return payload ? JSON.stringify(payload) : null;
    }

    /**
     * SFRA renders every checkout step into the DOM up front, so a stored card is already selected
     * while the shopper is still on the shipping step. Firing then is too early: the basket has no
     * address yet for a shopper without a default one, and the setup request needs one to build its
     * billTo. Nothing is marked as done when this returns false, so the run still happens once the
     * payment step is reached.
     * @returns {boolean} true when checkout has reached the payment step or beyond
     */
    function isAtPaymentStage() {
        var stage = $('#checkout-main').attr('data-checkout-stage');
        return stage === 'payment' || stage === 'placeOrder';
    }

    /**
     * Holds the submit button for the run armed below, so the debounce is not a window in which the
     * shopper can click "Next: Place Order" and submit the billing form before setup has run.
     */
    function takeHold() {
        holdingSubmit = true;
        ddc().holdSubmit();
    }

    /**
     * Gives the button back, for a card this file held for and is no longer going to run for.
     */
    function releaseHold() {
        if (!holdingSubmit) {
            return;
        }
        holdingSubmit = false;
        ddc().releaseSubmit();
    }

    /**
     * Arms the debounced setup + collection run.
     * @param {boolean} [silent] - true to skip the spinner, for a run the shopper did not initiate
     */
    function scheduleSetup(silent) {
        window.clearTimeout(triggerTimeoutId);

        if (state.completed || !isAtPaymentStage()) {
            return;
        }

        //  Only held for a card that is already complete. Holding on every keystroke would leave the
        //  button disabled for the whole time the shopper is typing a new card, and re-checking here
        //  is what gives the button straight back when they break a card that had been complete.
        if (buildPayload()) {
            takeHold();
        } else {
            releaseHold();
        }

        triggerTimeoutId = window.setTimeout(function () {
            var payload = buildPayload();
            if (!payload || state.completed) {
                releaseHold();
                return;
            }
            state.completed = true;
            state.lastPayloadKey = payloadKey(payload);
            //  runSetupAndDdc owns the hold from here, and re-arms it for the length of the run.
            holdingSubmit = false;
            ddc().runSetupAndDdc(payload, { silent: silent === true });
        }, TRIGGER_DEBOUNCE_MS);
    }

    /**
     * Any real change to the card selection or the card fields invalidates a reference that was
     * already obtained, since it describes the previous card. Drops it server side, then re-arms.
     */
    function invalidateAndReschedule() {
        if (state.completed) {
            if (payloadKey(buildPayload()) === state.lastPayloadKey) {
                return; // same card - nothing to invalidate, and nothing to re-run
            }
            state.completed = false;
            state.lastPayloadKey = null;
            ddc().clear();
        } else {
            //  Not yet run, but a previous attempt may have failed and blocked the submit button.
            ddc().clearFailure();
        }

        scheduleSetup();
    }

    $(document).on('input change', '#cardNumber', invalidateAndReschedule);
    $(document).on('change', '#expirationMonth, #expirationYear', invalidateAndReschedule);

    //  The security code is never part of the setup request - addCardInfo does not read it - so it
    //  can complete the payload but must not invalidate a reference already obtained. Otherwise
    //  typing the fourth digit of an Amex code would fire a second, pointless setup call.
    $(document).on('input change', '#securityCode', function () {
        ddc().clearFailure();
        scheduleSetup();
    });

    //  Picking a different stored card does change which card the reference describes.
    //
    //  Deferred by a tick, because the handler that moves .selected-payment to the clicked card is
    //  itself delegated on document (billing.js selectSavedPaymentInstrument) and is registered after
    //  this one - this file is a plain mid-body script, that one arrives with the deferred bundle.
    //  Reading the selection synchronously here would see the previously selected card, decide nothing
    //  had changed, and return without scheduling anything: the shopper would have to click twice.
    $(document).on('click', '.saved-payment-instrument', function () {
        window.setTimeout(invalidateAndReschedule, 0);
    });

    //  Switching between the stored cards and the new card form changes which branch applies.
    $(document).on('click', '.btn.add-payment, .cancel-new-payment', invalidateAndReschedule);
    $('.payment-summary .edit-button').on('click', invalidateAndReschedule);

    //  Coming back to the credit card tab from another payment method: the stored selection is
    //  unchanged, so this only matters when nothing has run yet.
    $(document).on('click', '.payment-options .nav-item[data-method-id="CREDIT_CARD"] a', function () {
        scheduleSetup(true);
    });

    //  Advancing from shipping to payment happens client side with no page load, so watch the stage
    //  attribute SFRA maintains rather than relying on the initial value alone. This is what fires for
    //  a preselected stored card when the shopper arrives at the payment step.
    var checkoutMain = document.getElementById('checkout-main');
    if (checkoutMain && typeof window.MutationObserver === 'function') {
        new window.MutationObserver(function () {
            scheduleSetup(true);
        }).observe(checkoutMain, {
            attributes: true,
            attributeFilter: ['data-checkout-stage']
        });
    }

    //  A stored card is selected before the shopper touches anything, so fire for it now if checkout
    //  already opened on the payment step - a shopper returning to it, for instance. Silent, because
    //  nothing the shopper did triggered it. buildPayload returns null for the new card branch until
    //  the fields are filled, so this is a no-op for guests and for shoppers with no saved cards.
    scheduleSetup(true);
});
