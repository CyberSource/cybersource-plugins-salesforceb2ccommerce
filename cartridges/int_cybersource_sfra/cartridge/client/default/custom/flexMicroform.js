/* eslint-disable no-undef */

'use strict';

$(document).ready(function () {
  var EARLY_TRIGGER_DEBOUNCE_MS = 600;

  var flex;
  var microform;
  var numberField;
  var securityCodeField;

  var state = {
    numberValid: false,
    securityCodeValid: false,
    tokenizing: false,
    tokenReady: false,
    rebuilding: false,
    //  True once the early setup + DDC chain has run for the card currently in the microform. Reset
    //  only when a microform field changes - i.e. when the card itself may have changed - never on an
    //  expiry change, because re-running the chain would need a second tokenization.
    setupAttempted: false
  };
  var earlyTriggerTimeoutId = null;

  var cardNumberplaceholder = $("#credit-card-content.cardNumber").attr(
    "data-cardNumber"
  );
  var customStyles = {
    input: {
      "font-family":
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
      "font-size": "1rem",
      "line-height": "1.5",
      color: "#495057",
    },
    ":focus": {
      color: "blue",
    },
    ":disabled": {
      cursor: "not-allowed",
    },
    valid: {
      color: "#3c763d",
    },
    invalid: {
      color: "#a94442",
    },
  };

  /**
   * @returns {Object|null} the payer auth DDC module, when it is wired up on this page
   */
  function ddc() {
    var module = window.CybersourcePayerAuthDDC;
    return module && module.isEnabled() ? module : null;
  }

  /**
   * Builds (or rebuilds) the microform against a capture context and wires up the change handlers.
   * @param {string} captureContext - Flex capture context JWT
   * @param {boolean} [isRebuild] - true when replacing an already loaded microform
   */
  function buildMicroform(captureContext, isRebuild) {
    if (!captureContext) {
      console.error('Cybersource Flex: no capture context, microform not built');
      return;
    }
    if (!$("#cardNumber-container").length || !$("#securityCode-container").length) {
      //  Without this the failure is silent: createField/load do nothing and the shopper only finds
      //  out on submit, as "No fields have been loaded".
      console.error('Cybersource Flex: microform containers not found, microform not built');
      return;
    }

    flex = new Flex(captureContext); // eslint-disable-line no-undef
    microform = flex.microform("card", {
      styles: customStyles,
    });

    if (isRebuild) {
      //  load() appends an iframe, so the previous one has to go first. Only on a rebuild - on the
      //  first build the containers are already empty, and clearing them regardless risks removing
      //  markup that belongs to the microform itself.
      $("#cardNumber-container").empty();
      $("#securityCode-container").empty();
    }

    numberField = microform.createField("number");
    securityCodeField = microform.createField("securityCode");
    securityCodeField.load("#securityCode-container");
    numberField.load("#cardNumber-container");

    state.numberValid = false;
    state.securityCodeValid = false;
    //  Fresh capture context and empty fields, so the chain is owed again once the shopper re-enters
    //  the card.
    state.setupAttempted = false;

    numberField.on("change", function (data) {
      if (data.card && data.card.length) {
        var cardType = data.card[0].name;
        $(".card-number-wrapper").attr("data-type", cardType);
        $("#cardType").val(cardType);
      }
      state.numberValid = data.valid === true;
      onCardFieldChange();
    });

    securityCodeField.on("change", function (data) {
      state.securityCodeValid = data.valid === true;
      onCardFieldChange();
    });
  }

  buildMicroform($('#flextokenRespose').val());

  $('#expirationMonth').on('change', function (event) {
    $('#expirationMonthMissingMessage').css('display', 'none');
    $('#expiredCardMessage').css('display', 'none');
    onExpiryChange();
  })
  $('#expirationYear').on('change', function (event) {
    $('#expirationYearMissingMessage').css('display', 'none');
    $('#expiredCardMessage').css('display', 'none');
    onExpiryChange();
  })

  function parseJwt(token) {
    // eslint-disable-line no-inner-declarations
    var base64Url = token.split(".")[1];
    var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    var jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          // eslint-disable-line no-undef
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  }

  /**
   * Creates a Flex transient token from the current card fields.
   * @param {Object} options - { showErrors: boolean } whether to surface validation messages
   * @param {Function} callback - called with (err) once the attempt settles
   */
  function createFlexToken(options, callback) {
    var showErrors = options && options.showErrors;
    var expMonth = $("#expirationMonth").val();
    var expYear = $("#expirationYear").val();
    // Send in optional parameters from other parts of your payment form
    var tokenOptions = {
      expirationMonth: expMonth.length == 1 ? "0" + expMonth : expMonth,
      expirationYear: expYear,
      // cardType: /* ... */
    };

    state.tokenizing = true;

    microform.createToken(tokenOptions, function (err, response) {
      // At this point the token may be added to the form
      // as hidden fields and the submission continued
      state.tokenizing = false;

      var invalid = false;

      if (err) {
        if (showErrors) {
          $('.card-number-wrapper .invalid-feedback').text(err.message).css('display', 'block');
        }
        invalid = true;
      }

      if (showErrors && !cardExpiryValidate()) {
        invalid = true;
      } else if (!showErrors && !isExpiryComplete()) {
        invalid = true;
      }

      if (invalid) {
        callback(err || new Error('card fields incomplete'));
        return;
      }

      var decodedJwt = parseJwt(response);
      document.getElementById("cardNumber").valid = true;

      $("#flex-response").val(decodedJwt.jti);

      $('#cardNumber').val(decodedJwt.content.paymentInformation.card.number.maskedValue);

      state.tokenReady = true;
      callback(null);
    });
  }

  /**
   * Legacy entry point kept for the submit handlers: tokenize, then continue the click that was
   * intercepted.
   * @returns {boolean} always true, matching the previous signature
   */
  function flexTokenCreation() {
    createFlexToken({ showErrors: true }, function (err) {
      if (err) {
        recoverCaptureContextIfExpired(err);
        return;
      }

      if ($(".submit-payment").length === 1) {
        $(".submit-payment").trigger("click");
      } else {
        $(".save-payment").trigger("click");
      }
    });
    return true;
  }

  // check for card type function
  function assignCorrectCardType() {
    // eslint-disable-line no-inner-declarations
    var cardType = $("#cardType").val();
    if (cardType.charCodeAt(0) !== cardType.toUpperCase().charCodeAt(0)) {
      var correctCardType = "";
      switch (
      cardType // eslint-disable-line default-case
      ) {
        case "visa":
          correctCardType = "Visa";
          break;
        case "mastercard":
          correctCardType = "Master Card";
          break;
        case "amex":
          correctCardType = "Amex";
          break;
        case "discover":
          correctCardType = "Discover";
          break;
        case "dinersclub":
          correctCardType = "DinersClub";
          break;
        case "maestro":
          correctCardType = "Maestro";
          break;
        case "jcb":
          correctCardType = "JCB";
          break;
        case "cartesbancaires":
          correctCardType = "CartesBancaires";
          break;
        case "elo":
          correctCardType = "Elo";
          break;
        case "cup":
          correctCardType = "China UnionPay";
          break;
        case "jcrew":
          correctCardType = "JCrew";
          break;
      }
      $("#cardType").val(correctCardType);
    }
  }

  function cardExpiryValidate() {
        var expMonth = $('#expirationMonth').val();
        var expYear = $('#expirationYear').val();

        if (expMonth == '' || expYear == '') {
            if (expMonth == '') {
               $('#expirationMonthMissingMessage').css('display', 'block');
            }
            if (expYear == '') {
                $('#expirationYearMissingMessage').css('display', 'block');
            }
            return false;
        }
        else {
            let currentDate = new Date();
            let currentMonth = currentDate.getMonth() + 1;
            let currentYear = currentDate.getFullYear();

            // Check if the card is expired
            if (expYear < currentYear || (expYear == currentYear && expMonth < currentMonth)) {
               $('#expiredCardMessage').css('display', 'block');
                return false;
            }
        }
        return true;
    }

  /**
   * Same expiry check as cardExpiryValidate, but without surfacing messages on a form the shopper
   * is still filling in.
   * @returns {boolean} true when a non-expired month and year are both selected
   */
  function isExpiryComplete() {
    var expMonth = $('#expirationMonth').val();
    var expYear = $('#expirationYear').val();

    if (!expMonth || !expYear) {
      return false;
    }

    var currentDate = new Date();
    var currentMonth = currentDate.getMonth() + 1;
    var currentYear = currentDate.getFullYear();

    return !(expYear < currentYear || (expYear == currentYear && expMonth < currentMonth));
  }

  /**
   * @returns {boolean} true when the card number, security code and expiry are all valid
   */
  function allCardFieldsValid() {
    return state.numberValid && state.securityCodeValid && isExpiryComplete();
  }

  /**
   * Any change to a card field invalidates a token that was already minted, since it describes the
   * previous card. Drops the token and the stored setup reference, then re-arms the early trigger.
   */
  function onCardFieldChange() {
    if (state.rebuilding) {
      return;
    }

    //  A microform field changed, so this may be a different card: the device data reference has to
    //  go with it and the chain has to run again.
    state.setupAttempted = false;

    if (state.tokenReady) {
      state.tokenReady = false;
      $("#flex-response").val("");
      $('#cardNumber').val("");
      if (ddc()) {
        ddc().clear();
      }
    } else if (ddc()) {
      //  Correcting the card is the retry path after a failed setup, so lift the block even when
      //  there is no token left to invalidate.
      ddc().clearFailure();
    }

    scheduleEarlyPayerAuth();
  }

  /**
   * The expiry selects are ordinary form fields rather than microform fields, so a change here means
   * the same card with a different expiry date.
   *
   * The transient token embeds the expiry that was passed to createToken, so the token has to be
   * discarded - but nothing else does. Device data collection describes the browser, not the card, so
   * its reference stays valid, and re-running the chain would need a second tokenization. A capture
   * context only yields one token, and getting another one means rebuilding the microform fields,
   * which wipes the card number and security code the shopper already entered.
   *
   * So: drop the token and let the submit handler mint the final one, with the final expiry.
   */
  function onExpiryChange() {
    if (state.rebuilding) {
      return;
    }

    if (!state.setupAttempted) {
      //  Nothing has run yet. The expiry completing the field set is what arms the first attempt,
      //  since createToken cannot be called without it.
      scheduleEarlyPayerAuth();
      return;
    }

    if (state.tokenReady) {
      state.tokenReady = false;
      $("#flex-response").val("");
      $('#cardNumber').val("");
    }

    if (ddc()) {
      //  Let the shopper continue: a previous setup failure should not keep blocking them just
      //  because they adjusted the expiry.
      ddc().clearFailure();
    }
  }

  /**
   * Arms the debounced early Payer Auth Setup + DDC run.
   */
  function scheduleEarlyPayerAuth() {
    window.clearTimeout(earlyTriggerTimeoutId);

    if (!ddc() || !allCardFieldsValid()) {
      return;
    }

    earlyTriggerTimeoutId = window.setTimeout(runEarlyPayerAuth, EARLY_TRIGGER_DEBOUNCE_MS);
  }

  /**
   * Tokenizes the card and runs Payer Auth Setup + device data collection, so that both are already
   * done by the time the shopper submits the billing form.
   */
  function runEarlyPayerAuth() {
    if (!ddc() || state.tokenizing || state.tokenReady || state.setupAttempted || !allCardFieldsValid()) {
      return;
    }

    //  Checked before tokenizing, not after: a capture context yields only one token, so there is no
    //  point spending it on a card type that does not need payer authentication. The microform reports
    //  the type in its own casing ('mastercard'), which the lookup normalises.
    if (!ddc().isPayerAuthEnabledForCardType($("#cardType").val())) {
      state.setupAttempted = true;
      return;
    }

    state.setupAttempted = true;

    createFlexToken({ showErrors: false }, function (err) {
      if (err) {
        //  Stay silent and, crucially, leave the microform alone. This runs while the shopper is
        //  still on the form, so rebuilding the fields to recover a capture context here would wipe
        //  the card number and security code they had already typed. The submit handler will surface
        //  any real validation problem, and the order-time setup route remains as the fallback.
        return;
      }

      assignCorrectCardType();

      ddc().runSetupAndDdc({
        flexToken: $("#flex-response").val(),
        cardType: $("#cardType").val(),
        expirationMonth: $("#expirationMonth").val(),
        expirationYear: $("#expirationYear").val()
      });
    });
  }

  /**
   * A capture context yields one token and is only valid for a limited time. When tokenization fails
   * because of the context rather than the card, fetch a fresh one and rebuild the fields.
   *
   * Rebuilding empties the microform iframes, so the shopper loses the card number and security code
   * and has to type them again. That is only acceptable as a last resort on the submit path, where
   * they have asked to move on and an error message is already on screen - never from the silent
   * background attempt. Any error that is not about the capture context is left alone.
   * @param {Object} err - the error createToken reported
   */
  function recoverCaptureContextIfExpired(err) {
    var reason = err && (err.reason || err.name || '');
    if (String(reason).indexOf('CAPTURE_CONTEXT') === -1) {
      return;
    }

    var $host = $('#cyb-payerauth-ddc');
    var captureContextUrl = $host.data('capture-context-url');
    if (!captureContextUrl) {
      return;
    }

    state.rebuilding = true;
    $.ajax({
      url: captureContextUrl,
      method: 'GET',
      success: function (data) {
        if (data && !data.error && data.captureContext) {
          $('#flextokenRespose').val(data.captureContext);
          buildMicroform(data.captureContext, true);
        }
      },
      complete: function () {
        state.rebuilding = false;
      }
    });
  }

  $(".payment-summary .edit-button").on("click", function () {
    $("#flex-response").val("");
    state.tokenReady = false;
    if (ddc()) {
      ddc().clear();
    }
  });

  // intercept the form submission and make a tokenize request instead
  $(".submit-payment").on("click", function (event) {
    if ($('.payment-information').data('payment-method-id') === 'CREDIT_CARD') {
    if (
      ($("#flex-response").val() === "" ||
        $("#flex-response").val() === undefined) &&
      ($(".data-checkout-stage").data("customer-type") === "guest" ||
        ($(".data-checkout-stage").data("customer-type") === "registered" &&
          $(".payment-information").data("is-new-payment")))
    ) {
      if (
        $("#flex-response").val() === "" ||
        $("#flex-response").val() === undefined
      ) {
        window.clearTimeout(earlyTriggerTimeoutId);
        flexTokenCreation();
        assignCorrectCardType();
        event.stopImmediatePropagation();
        }
      }
    }
  });
  $(".save-payment").on("click", function (event) {
    if (
      $("#flex-response").val() === "" ||
      $("#flex-response").val() === undefined
    ) {
      window.clearTimeout(earlyTriggerTimeoutId);
      flexTokenCreation();
      assignCorrectCardType();
      event.preventDefault();
    }
  });
});
