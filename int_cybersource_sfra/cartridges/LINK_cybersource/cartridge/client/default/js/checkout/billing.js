'use strict';

var base = require('base/checkout/billing');
var formHelpers = require('base/checkout/formErrors');
var cleave = require('../components/cleave');
var addressHelpers = require('base/checkout/address');

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

base.addNewPaymentInstrument = function () {
    $('.btn.add-payment').on('click', function (e) {
        e.preventDefault();
        $('.payment-information').data('is-new-payment', true);
        clearCreditCardForm();
        $('.credit-card-form').removeClass('checkout-hidden');
        $('.user-payment-instruments').addClass('checkout-hidden');
    });
};

base.cancelNewPayment = function () {
    $('.cancel-new-payment').on('click', function (e) {
        e.preventDefault();
        $('.payment-information').data('is-new-payment', false);
        clearCreditCardForm();
        $('.user-payment-instruments').removeClass('checkout-hidden');
        $('.credit-card-form').addClass('checkout-hidden');
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
   
        if (saType && saType != 'SA_SILENTPOST' && saType != 'SA_FLEX') {
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

/**
 * updates the billing address form values within payment forms
 * @param {Object} order - the order model
 */
function updateBillingAddressFormValues(order) {
    var billing = order.billing;
    if (!billing.billingAddress || !billing.billingAddress.address) return;

    var form = $('form[name=dwfrm_billing]');
    if (!form) return;

    $('input[name$=_firstName]', form).val(billing.billingAddress.address.firstName);
    $('input[name$=_lastName]', form).val(billing.billingAddress.address.lastName);
    $('input[name$=_address1]', form).val(billing.billingAddress.address.address1);
    $('input[name$=_address2]', form).val(billing.billingAddress.address.address2);
    $('input[name$=_city]', form).val(billing.billingAddress.address.city);
    $('input[name$=_postalCode]', form).val(billing.billingAddress.address.postalCode);
    $('select[name$=_stateCode],input[name$=_stateCode]', form)
        .val(billing.billingAddress.address.stateCode);
    $('select[name$=_country]', form).val(billing.billingAddress.address.countryCode.value);
    $('input[name$=_phone]', form).val(billing.billingAddress.address.phone);
    $('input[name$=_email]', form).val(order.orderEmail);

    if (billing.payment && billing.payment.selectedPaymentInstruments
        && billing.payment.selectedPaymentInstruments.length > 0) {
        var instrument = billing.payment.selectedPaymentInstruments[0];
        $('select[name$=expirationMonth]', form).val(instrument.expirationMonth);
        $('select[name$=expirationYear]', form).val(instrument.expirationYear);
        // Force security code and card number clear
        $('input[name$=securityCode]', form).val('');
        if ($('.nav-item').data('sa-type') != 'SA_FLEX') {
        	$('input[name$=cardNumber]').data('cleave').setRawValue('');
        }
    }
};

base.methods.updateBillingInformation = function (order, customer) {
	base.methods.updateBillingAddressSelector(order, customer);

    // update billing address form
    updateBillingAddressFormValues(order);

    // update billing address summary
    addressHelpers.methods.populateAddressSummary('.billing .address-summary',
        order.billing.billingAddress.address);

    // update billing parts of order summary
    $('.order-summary-email').text(order.orderEmail);

    if (order.billing.billingAddress.address) {
        $('.order-summary-phone').text(order.billing.billingAddress.address.phone);
    }
};

/**
 * clears the credit card form
 */
function clearCreditCardForm() {
	if ($('.nav-item').data('sa-type') != 'SA_FLEX') {
		$('input[name$="_cardNumber"]').data('cleave').setRawValue('');
	}
    $('select[name$="_expirationMonth"]').val('');
    $('select[name$="_expirationYear"]').val('');
    $('input[name$="_securityCode"]').val('');
    $('input[name$="_email"]').val('');
    $('input[name$="_phone"]').val('');
}

// Enable Apple Pay
if (window.dw &&
    window.dw.applepay &&
    window.ApplePaySession &&
    window.ApplePaySession.canMakePayments()) {
    $('body').addClass('apple-pay-enabled');
}

module.exports = base;