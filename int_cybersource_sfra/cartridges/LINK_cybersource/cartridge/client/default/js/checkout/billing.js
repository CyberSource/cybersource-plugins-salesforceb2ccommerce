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
        if ($(this).data('sa-type') === 'SA_IFRAME' || $(this).data('sa-type') == 'SA_REDIRECT') { 
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
        $('input[name="dwfrm_billing_creditCardFields_cardNumber"]').val($.trim($('.saved-payment-instrument.selected-payment .saved-credit-card-number').text()));
        var cardType = $.trim($('.saved-payment-instrument.selected-payment .saved-credit-card-type').text()).replace(/\s{2,}/g,' ').split(' ');
        $('input[name="dwfrm_billing_creditCardFields_cardType"]').val(cardType[1]);
        var expiryDate = $.trim($('.saved-payment-instrument.selected-payment .saved-credit-card-expiration-date').text()).replace(/[a-zA-Z\s]+/, '').split('/'); 
        $('input[name="dwfrm_billing_creditCardFields_securityCode"]').val($.trim($('.saved-payment-instrument.selected-payment #saved-payment-security-code').val()));
        $('#expirationMonth').val(expiryDate[0]);
        $('#expirationYear').val(expiryDate[1]);
    });
};

/**
 * @function
 * @description function to update payment details summary based on payment method
 */
base.methods.updatePaymentInformation = function (order) {
	 // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';
    var isCSType = false;
    var saType = $('.nav-item').data('sa-type');
   
        if (saType && saType != 'SA_SILENTPOST') {
        	isCSType = true;
        }
    
    if (isCSType) {
	    	if(order.billing.payment && order.billing.payment.selectedPaymentInstruments
	        && order.billing.payment.selectedPaymentInstruments.length > 0){
	    		htmlToAppend += '<span>Secure Acceptance ' + order.billing.payment.selectedPaymentInstruments[0].paymentMethod.replace('_', ' ') + '</span>';
	    	} 
    	} else if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
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