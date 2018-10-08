'use strict';

var base = require('base/checkout/billing');
var formHelpers = require('base/checkout/formErrors');

/**
 * @function
 * @description function to update payment content and hide fields based on payment method
 */
base.paymentTabs = function () {
    $('.payment-options .nav-item').on('click', function (e) {
        e.preventDefault();
        var methodID = $(this).data('method-id');
        $('input[name*="billing_paymentMethod"]').val(methodID);
    	formHelpers.clearPreviousErrors('.payment-form');
        if ($(this).data('method-id') === 'SA_IFRAME' || $(this).data('method-id') == 'SA_REDIRECT') { 
        	$('.dwfrm_billing_creditCardFields_cardNumber,.dwfrm_billing_creditCardFields_expirationMonth, .dwfrm_billing_creditCardFields_expirationYear, .dwfrm_billing_creditCardFields_securityCode').css("display", "none");
        } else {
        	$('.dwfrm_billing_creditCardFields_cardNumber,.dwfrm_billing_creditCardFields_expirationMonth, .dwfrm_billing_creditCardFields_expirationYear, .dwfrm_billing_creditCardFields_securityCode').css("display", "block");
        }
    });
};

/**
 * @function
 * @description function to update saved selected card details for sesure acceptance silent post
 */
base.selectSavedPaymentInstrument = function () {
    $(document).on('click', '.saved-payment-instrument', function (e) {
        e.preventDefault();
        $('.saved-payment-security-code').val('');
        $('.saved-payment-instrument').removeClass('selected-payment');
        $(this).addClass('selected-payment');
        $('.saved-payment-instrument .card-image').removeClass('checkout-hidden');
        $('.saved-payment-instrument .security-code-input').addClass('checkout-hidden');
        $('.saved-payment-instrument.selected-payment' +
            ' .card-image').addClass('checkout-hidden');
        $('.saved-payment-instrument.selected-payment ' +
            '.security-code-input').removeClass('checkout-hidden');
        $('#selectedCardID').val($('.saved-payment-instrument.selected-payment').data('uuid'));
        $('input[name="dwfrm_billing_creditCardFields_cardNumber"]').val($.trim($('.saved-credit-card-number').text()));
        $('input[name="dwfrm_billing_creditCardFields_cardType"]').val("Visa");
        var expiryDate = $.trim($('.saved-credit-card-expiration-date').text()).replace(/[a-zA-Z\s]+/, '').split('/'); 
        $('input[name="dwfrm_billing_creditCardFields_securityCode"]').val("111");
        $('#expirationMonth').val(expiryDate[0]);
        $('#expirationYear').val(expiryDate[1]);
    });
};

/**
 * @function
 * @description function to update payment details summary based on payment method
 */
base.methods.updatePaymentInformation = function (order) {
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    order.billing.payment.selectedPaymentInstruments.forEach(function (paymentInstrument) {
        if (paymentInstrument.paymentMethod != "CREDIT_CARD") {
                $('.place-order').removeClass('place-order').addClass(paymentInstrument.paymentMethod.toLowerCase());
                htmlToAppend += '<span>' + paymentInstrument.paymentName + '</span>';
        }  else if (order.billing.payment && order.billing.payment.selectedPaymentInstruments.length > 0) {
            htmlToAppend += '<span>' + order.resources.cardType + ' '
                + order.billing.payment.selectedPaymentInstruments[0].type
                + '</span><div>'
                + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
                + '</div><div><span>'
                + order.resources.cardEnding + ' '
                + order.billing.payment.selectedPaymentInstruments[0].expirationMonth
                + '/' + order.billing.payment.selectedPaymentInstruments[0].expirationYear
                + '</span></div>';
        }
    });
    	$paymentSummary.empty().append(htmlToAppend);
};

// Enable Apple Pay
if (window.dw &&
    window.dw.applepay &&
    window.ApplePaySession &&
    window.ApplePaySession.canMakePayments()) {
    $('body').addClass('apple-pay-enabled');
}

module.exports = base;