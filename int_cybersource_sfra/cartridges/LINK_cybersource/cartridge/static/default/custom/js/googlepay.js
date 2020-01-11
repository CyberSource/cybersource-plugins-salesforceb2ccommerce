
'use strict';

/**
 * Payment methods accepted by your gateway
 *
 * confirm support for both payment methods with your gateway
 */
var allowedPaymentMethods = ['CARD', 'TOKENIZED_CARD'];

/**
 * Card networks supported by your site and your gateway
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/object#CardRequirements|CardRequirements}
 * confirm card networks supported by your site and gateway
 */
var allowedCardNetworks = ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'];

var gatewayMerchantId = $('#googlePaygatewayMerchantId').val();

var merchantID = $('#googlePayMerchantID').val();


/**
 * Identify your gateway and your site's gateway merchant identifier
 *
 * The Google Pay API response will return an encrypted payment method capable of
 * being charged by a supported gateway after shopper authorization
 *
 * check with your gateway on the parameters to pass
 * @see {@link https://developers.google.com/pay/api/web/reference/object#Gateway|PaymentMethodTokenizationParameters}
 */
var tokenizationParameters = {
  tokenizationType: 'PAYMENT_GATEWAY',
  parameters: {
    'gateway': 'cybersource',
    'gatewayMerchantId': gatewayMerchantId
  }
}



/**
 * Initialize a Google Pay API client
 *
 * @returns {google.payments.api.PaymentsClient} Google Pay API client
 */
function getGooglePaymentsClient() {
  return (new google.payments.api.PaymentsClient({environment: 'TEST'}));
}

/**
 * Initialize Google PaymentsClient after Google-hosted JavaScript has loaded
 */
function onGooglePayLoaded() {
  var paymentsClient = getGooglePaymentsClient();
  paymentsClient.isReadyToPay({allowedPaymentMethods: allowedPaymentMethods})
      .then(function(response) {
        if (response.result) {
        	//alert(response.result);
          addGooglePayButton();
          prefetchGooglePaymentData();
        }
      })
      .catch(function(err) {
        // show error in developer console for debugging
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
  var button = paymentsClient.createButton({onClick:onGooglePaymentButtonClicked});
  if($('#js-googlepay-container').length > 0){
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
  return {
    // a merchant ID is available for a production environment after approval by Google
    // @see {@link https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist|Integration checklist}
    merchantId: merchantID,
    paymentMethodTokenizationParameters: tokenizationParameters,
    allowedPaymentMethods: allowedPaymentMethods,
    emailRequired : true,
    phoneNumberRequired : true,
    cardRequirements: {
      allowedCardNetworks: allowedCardNetworks,
      billingAddressRequired: true,
      billingAddressFormat: 'FULL'
    },
    shippingAddressRequired : true
  };
}

/**
 * Provide Google Pay API with a payment amount, currency, and amount status
 *
 * @see {@link https://developers.google.com/pay/api/web/reference/object#TransactionInfo|TransactionInfo}
 * @returns {object} transaction info, suitable for use as transactionInfo property of PaymentDataRequest
 */
function getGoogleTransactionInfo() {
	return {
        currencyCode: 'USD',
        totalPriceStatus: 'FINAL',
        // set to cart total
       totalPrice: document.getElementById('carttotal').value.replace('$','')
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
      .then(function(paymentData) {
        // handle the response
        processPayment(paymentData);
      })
      .catch(function(err) {
        // show error in developer console for debugging
        console.error(err);
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
	  paymentData : JSON.stringify(paymentData)
		  
  };
 
  $.ajax({
	  url: postdataUrl,	 
	  type: 'post',
	  dataType: 'json',
	  data : urlParams,
	  success: function(data){
	   if(data.status === 'success'){
		   window.location.href = window.googlepayval.returnURL;
	   }else{
		   window.location.href = window.googlepayval.cartURL;
		   }	 	  
	   }	 
	});
  // pass payment data response to gateway to process payment
}

