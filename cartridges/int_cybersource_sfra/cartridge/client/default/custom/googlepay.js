/* eslint-disable */

'use strict';

/**
 * Card networks supported by your site and your gateway
 */
var allowedCardNetworks = ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'];

var allowedCardAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS'];

var gatewayMerchantId = $('#googlePaygatewayMerchantId').val();

var merchantID = $('#googlePayMerchantID').val();

/**
 * Identify your gateway and your site's gateway merchant identifier
 */
var tokenizationParameters = {
    type: 'PAYMENT_GATEWAY',  // Changed from tokenizationType
    parameters: {
        gateway: 'cybersource',
        gatewayMerchantId: gatewayMerchantId
    }
};

var baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0
};

var baseCardPaymentMethod = {
    type: 'CARD',
    parameters: {
        allowedAuthMethods: allowedCardAuthMethods,
        allowedCardNetworks: allowedCardNetworks,
        assuranceDetailsRequired: true,
        billingAddressRequired: true,
        billingAddressParameters: {
            format: 'FULL',
            phoneNumberRequired: true
        }
    }
};

var cardPaymentMethod = {
    tokenizationSpecification: tokenizationParameters,  // This is correct
    ...baseCardPaymentMethod
};

/**
 * Payment methods accepted by your gateway
 */
var allowedPaymentMethods = ['CARD', 'TOKENIZED_CARD'];

function formatInputMoney(input) {
    var standardNumber = input;
    if (input.indexOf(",") > input.indexOf(".") || (input.indexOf(",") !== -1 && input.indexOf(".") === -1)) {
        standardNumber = parseFloat(input.replace(".", "").replace(",", ".").replace(/[^0-9.]/g, ''));
    } else {
        standardNumber = parseFloat(input.replace(/[^0-9.]/g, ''));
    }
    return standardNumber;
}

// Rest of your functions remain the same...
/**
 * Initialize a Google Pay API client
 *
 * @returns {google.payments.api.PaymentsClient} Google Pay API client
 */
function getGooglePaymentsClient() {
    return (new google.payments.api.PaymentsClient({ environment: window.googlepayval.environment }));
}

/**
 * Initialize Google PaymentsClient after Google-hosted JavaScript has loaded
 */
function onGooglePayLoaded() {
        var paymentsClient = getGooglePaymentsClient();
    var isReadyToPayRequest = {
        ...baseRequest,
        allowedPaymentMethods: [baseCardPaymentMethod]
    };
    
    paymentsClient.isReadyToPay(isReadyToPayRequest)
        .then(function (response) {
            if (response.result) {
                addGooglePayButton();
                prefetchGooglePaymentData();
            }
        })
        .catch(function (err) {
            console.error(err);
        });

}

/**
 * Add a Google Pay purchase button alongside an existing checkout button
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/object#ButtonOptions|Button options}
 * @see {@link https://developers.google.com/pay/api/web/guides/brand-guidelines|Google Pay brand guidelines}
 */
function addGooglePayButton() {
    var paymentsClient = getGooglePaymentsClient();
    var button = paymentsClient.createButton({ onClick: onGooglePaymentButtonClicked });
    if ($('#js-googlepay-container').length > 0) {
        document.getElementById('js-googlepay-container').appendChild(button);
    }
}

/**
 * Configure support for the Google Pay API
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/object#PaymentDataRequest|PaymentDataRequest}
 * @returns {object} PaymentDataRequest fields
 */
function getGooglePaymentDataConfiguration() {

     var paymentDataRequest = {
        ...baseRequest
    };
    paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod];
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
    paymentDataRequest.emailRequired = true;
    paymentDataRequest.shippingAddressRequired = true;
    paymentDataRequest.merchantInfo = {
        merchantId: merchantID
    };
    return paymentDataRequest;
}

/**
 * Provide Google Pay API with a payment amount, currency, and amount status
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/object#TransactionInfo|TransactionInfo}
 * @returns {object} transaction info, suitable for use as transactionInfo property of PaymentDataRequest
 */
function getGoogleTransactionInfo() {

    var cartTotalValue = document.getElementById('carttotal').value.replace('$', '');
    var formattedAmount = formatInputMoney(cartTotalValue);

    return {
        currencyCode: 'USD',
        totalPriceStatus: 'FINAL',
        // Format the amount properly - convert to string with 2 decimal places
        totalPrice: formattedAmount.toFixed(2)
    };
}

/**
 * Prefetch payment data to improve performance
 */
function prefetchGooglePaymentData() {
    var paymentDataRequest = getGooglePaymentDataConfiguration();
    // transactionInfo must be set but does not affect cache
    paymentDataRequest.transactionInfo = {
        totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
        currencyCode: 'USD'
    };
    var paymentsClient = getGooglePaymentsClient();
    paymentsClient.prefetchPaymentData(paymentDataRequest);
}

/**
 * Show Google Pay chooser when Google Pay purchase button is clicked
 */
function onGooglePaymentButtonClicked() {
    var paymentDataRequest = getGooglePaymentDataConfiguration();
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();

    var paymentsClient = getGooglePaymentsClient();
    paymentsClient.loadPaymentData(paymentDataRequest)
        .then(function (paymentData) {
        // handle the response
            processPayment(paymentData);
        })
        .catch(function (err) {
        // show error in developer console for debugging
            console.error(err); // eslint-disable-line
        });
}

function appendToUrl(url, params) {
    var newUrl = url;
    newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + Object.keys(params).map(function (key) {
        return key + '=' + encodeURIComponent(params[key]);
    }).join('&');

    return newUrl;
}

/**
 * Process payment data returned by the Google Pay API
 *
 * @param {object} paymentData response from Google Pay API after shopper approves payment
 * @see {@link https://developers.google.com/pay/api/web/reference/object#PaymentData|PaymentData object reference}
 */
function processPayment(paymentData) {
    var postdataUrl = window.googlepayval.sessionCallBack;
    var i = JSON.stringify(paymentData);
    var urlParams = {
        paymentData: JSON.stringify(paymentData)

    };

    $.ajax({
        url: postdataUrl,
        type: 'post',
        dataType: 'json',
        data: urlParams,
        success: function (data) {
            if (data.status === 'success') {
                window.location.href = window.googlepayval.returnURL;
            } else {
                window.location.href = window.googlepayval.cartURL;
            }
        }
    });
    // pass payment data response to gateway to process payment
}
