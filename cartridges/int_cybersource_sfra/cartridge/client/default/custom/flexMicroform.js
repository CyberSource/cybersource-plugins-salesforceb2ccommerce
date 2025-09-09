/* eslint-disable no-undef */

'use strict';

$(document).ready(function () {
  var captureContext = $('#flextokenRespose').val();
  var flex = new Flex(captureContext); // eslint-disable-line no-undef
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
    var microform = flex.microform("card",{
    styles: customStyles,
  });
  var number = microform.createField("number");
  var securityCode = microform.createField("securityCode");
  securityCode.load("#securityCode-container");
  number.load("#cardNumber-container");
  number.on("change", function (data) {
    var cardType = data.card[0].name;
    $(".card-number-wrapper").attr("data-type", cardType);
    $("#cardType").val(cardType);
  });

  $('#expirationMonth').on('change', function (event) {
    $('#expirationMonthMissingMessage').css('display', 'none');
    $('#expiredCardMessage').css('display', 'none');
  })
  $('#expirationYear').on('change', function (event) {
    $('#expirationYearMissingMessage').css('display', 'none');
    $('#expiredCardMessage').css('display', 'none');
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

  function flexTokenCreation() {
    // eslint-disable-line no-inner-declarations
    var expMonth = $("#expirationMonth").val();
    var expYear = $("#expirationYear").val();
    // Send in optional parameters from other parts of your payment form
    var options = {
      expirationMonth: expMonth.length == 1 ? "0" + expMonth : expMonth,
      expirationYear: expYear,
      // cardType: /* ... */
    };
    // validation
    // look for field validation errors

    microform.createToken(options, function (err, response) {
      // At this point the token may be added to the form
      // as hidden fields and the submission continued
      let flag = false;

      if (err) {
        $('.card-number-wrapper .invalid-feedback').text(err.message).css('display', 'block');
        flag = true;
      }

      if (!cardExpiryValidate()) {
        flag = true;
      }

      if (flag == true) {
        return true;
      }

      var decodedJwt = parseJwt(response);
      document.getElementById("cardNumber").valid = true;

      $("#flex-response").val(decodedJwt.jti);

      $('#cardNumber').val(decodedJwt.content.paymentInformation.card.number.maskedValue);

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

  $(".payment-summary .edit-button").on("click", function () {
    $("#flex-response").val("");
  });

  // intercept the form submission and make a tokenize request instead
  $(".submit-payment").on("click", function (event) {
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
        flexTokenCreation();
        assignCorrectCardType();
        event.stopImmediatePropagation();
      }
    }
  });
  $(".save-payment").on("click", function (event) {
    if (
      $("#flex-response").val() === "" ||
      $("#flex-response").val() === undefined
    ) {
      flexTokenCreation();
      assignCorrectCardType();
      event.preventDefault();
    }
  });
});
