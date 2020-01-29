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
        var paymentMethodIds = [ 'ALIPAY', 'SOF', 'IDL', 'MCH', 'GPY', 'EPS', 'BANK_TRANSFER'];
        var paymentMethod = $.inArray(methodID, paymentMethodIds) > -1
        $('.payment-information').data('payment-method-id', methodID);
        $('input[name*="billing_paymentMethod"]').val(methodID);
    	formHelpers.clearPreviousErrors('.payment-form');
        
        if (paymentMethod) {
        	$('.dwfrm_billing_creditCardFields_cardNumber,.dwfrm_billing_creditCardFields_expirationMonth, .dwfrm_billing_creditCardFields_expirationYear, .dwfrm_billing_creditCardFields_securityCode, .form-group.cardNumber,.bankTransfer').hide();
        	$('#credit-card-content .user-payment-instruments.container').addClass('checkout-hidden');
        	$('.credit-card-form').removeClass('checkout-hidden');
        	$('.btn.btn-block.cancel-new-payment, .save-credit-card.custom-control.custom-checkbox ').hide();
        	if(methodID == 'EPS' || methodID == 'GPY' || methodID == 'IDL') {
	        	$('.bankTransfer').show();
	        	$('.bankTransfer #' + methodID.toLowerCase()).show();
	        	$('.bankTransfer #' + methodID.toLowerCase()).siblings().hide();
        	}
        	$('.next-step-button .submit-payment').attr('id','showSubmitPayment');
        } else if (methodID == 'CREDIT_CARD') {
        	if($(this).data('sa-type') === 'SA_IFRAME' || $(this).data('sa-type') == 'SA_REDIRECT') {
        		$('.dwfrm_billing_creditCardFields_cardNumber,.dwfrm_billing_creditCardFields_expirationMonth, .dwfrm_billing_creditCardFields_expirationYear, .dwfrm_billing_creditCardFields_securityCode, .form-group.cardNumber,.bankTransfer').hide();
        	} else {
            	$('.dwfrm_billing_creditCardFields_cardNumber,.dwfrm_billing_creditCardFields_expirationMonth, .dwfrm_billing_creditCardFields_expirationYear, .dwfrm_billing_creditCardFields_securityCode, .form-group.cardNumber').show();
        	}
        	if($('.data-checkout-stage').data('customer-type') === 'guest') {
        		$('#credit-card-content .user-payment-instruments.container').addClass('checkout-hidden');
        		$('.btn.btn-block.cancel-new-payment, .save-credit-card.custom-control.custom-checkbox ').hide();
            	$('.credit-card-form').removeClass('checkout-hidden');
        	} else if($('.data-checkout-stage').data('customer-type') === 'registered') {
	        	$('#credit-card-content .user-payment-instruments.container').removeClass('checkout-hidden');
	        	$('.btn.btn-block.cancel-new-payment, .save-credit-card.custom-control.custom-checkbox ').show();
	        	$('.credit-card-form').addClass('checkout-hidden');
        	}
        	$('.bankTransfer').hide();
        	$('.next-step-button .submit-payment').attr('id','showSubmitPayment');
        } else if(methodID === 'VISA_CHECKOUT'  || methodID == "KLARNA" || methodID == "DW_GOOGLE_PAY" || (methodID == 'PAYPAL' && $(this).attr('data-auth') == 're-auth')){
        	$('.next-step-button .submit-payment').attr('id','hideSubmitPayment');
        } else {
        	$('.next-step-button .submit-payment').attr('id','showSubmitPayment');
        }
        
        handlePayPalSelection(methodID);
    });
};

base.editBillingSummary = function(){
	$('.payment-summary .edit-button').on('click',function(){
		var liPaypal = $('#checkout-main[data-checkout-stage="payment"] li[data-method-id="PAYPAL"]');
		if($(liPaypal).hasClass('activepaypal') && $(liPaypal).find('a').hasClass('active')){
			 $('.payment-information').data('payment-method-id', 'PAYPAL');
		}       
	}); 
};

function handlePayPalSelection(methodID){
	if(methodID == 'PAYPAL') {
		if($('#billingAgreementCheckbox').length>0) {
			$("#billingAgreementCheckbox").attr('checked',false);
		}
		if($('.paypal-address').length>0) {
			$('.paypal-address div[class$="paypalBillingFields_paypalEmail"]').css("display", "block");
			$('.paypal-address div[class$="paypalBillingFields_paypalPhone"]').css("display", "block");
		}
	} else {
		$('.paypal-address div[class$="paypalBillingFields_paypalEmail"]').css("display", "none");
		$('.paypal-address div[class$="paypalBillingFields_paypalPhone"]').css("display", "none");
	}
}

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

base.flipPayment = function () {
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

base.removePaypalButton = function(){
	$('.payment-summary .edit-button').on('click',function(){  
		if($('.payment-details span:contains(Credit)')){
		    if($('#checkout-main[data-checkout-stage="payment"] a.paypal-tab').hasClass('active')){
		    	$('#checkout-main[data-checkout-stage="payment"]').find('button.submit-payment').attr('id','hideSubmitPayment');
		   } 
		}
		if($('.payment-details span:contains(PAYPAL)')){
		    if($('#checkout-main[data-checkout-stage="payment"] a.paypal-tab').hasClass('active')){
		    	$('#checkout-main[data-checkout-stage="payment"]').find('button.submit-payment').attr('id','showSubmitPayment');
		   } 
		}
		var liPaypal = $('#checkout-main[data-checkout-stage="payment"] li[data-method-id="PAYPAL"]');
		if(!$(liPaypal).hasClass('activepaypal') && $(liPaypal).find('a').hasClass('active')){
			   $('#checkout-main[data-checkout-stage="payment"]').find('button.submit-payment').attr('id','hideSubmitPayment');
			}	
    }); 	
};

base.onpaypalClick = function(){
	$('li[data-method-id="PAYPAL"] a').on('click',function(){
		if(!$('li[data-method-id="PAYPAL"]').hasClass('activepaypal')){
			 $('#checkout-main[data-checkout-stage="payment"]').find('button.submit-payment').attr('id','hideSubmitPayment');
	    }
	});
};

base.onAddressSelection = function() {
	$(".address-selector-block .addressSelector").change(function () {
		saveBillingAddress();
    });
};

function saveBillingAddress(){
	if(isPayPalEnabled()) {
		var paymentForm = $('#dwfrm_billing').serialize();
		var url = $('.billing-information .addressSelector').attr('data-create-shipment-url');
		$.ajax({
			method: 'POST',
			async: false,
			data: paymentForm,
			url: url,
			success: function (data) {
			},
			error: function (err) {
			},
		});
	}
}

function isPayPalEnabled() {
	return $('#paypal_enabled').length>0 && document.getElementById("paypal_enabled").value == 'true' ? true : false;
}

base.onBillingAddressUpdate = function() {
	 $('.billing-information').on('change', function () {
	 	if(isPayPalEnabled()) {
	 		var firstName = $('input[name$=_billing_addressFields_firstName]').val();
	 		var lastName = $('input[name$=_billing_addressFields_lastName]').val();
			var add1 = $('input[name$=_billing_addressFields_address1]').val();
   			var add2 = $('input[name$=_billing_addressFields_address2]').val();
    		var city = $('input[name$=_billing_addressFields_city]').val();
    		var postalCode = $('input[name$=_billing_addressFields_postalCode]').val();
    		var state = $('select[name$=_billing_addressFields_states_stateCode]').val();
    		var country = $('select[name$=_billing_addressFields_country]').val(); 
    	
    		firstName = $.trim(firstName);
    		lastName = $.trim(lastName);
    		add1 = $.trim(add1);
    		add2 = $.trim(add2);
    		city = $.trim(city);
    		postalCode = $.trim(postalCode);
    		state = $.trim(state);
    		country = $.trim(country);
    		if(firstName && lastName && add1 && city && postalCode && state && country) {
    			saveBillingAddress();
    		}
	 	}
	 });
};

/**
 * @function
 * @description function to update payment details summary based on payment method
 */
base.methods.updatePaymentInformation = function (order, options) {
	 // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';
    var isCSType = false;
    updatePaypal(options);
    var creditCardItem = $('li[data-method-id="CREDIT_CARD"]');
    var saType = $(creditCardItem).attr('data-sa-type');
   
	if(order.billing.payment 
		&& order.billing.payment.selectedPaymentInstruments
		&& order.billing.payment.selectedPaymentInstruments.length > 0 
		&& order.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'CREDIT_CARD' 
		&& saType != null) {
		document.getElementById('submit-order').className = 'btn btn-primary btn-block submit-order ' + saType.toLowerCase();
	} else if(order.billing.payment 
		&& order.billing.payment.selectedPaymentInstruments
		&& order.billing.payment.selectedPaymentInstruments.length > 0 
		&& order.billing.payment.selectedPaymentInstruments[0].paymentMethod != 'VISA_CHECKOUT' 
		&& order.billing.payment.selectedPaymentInstruments[0].paymentMethod != 'DW_GOOGLE_PAY' 
		&& order.billing.payment.selectedPaymentInstruments[0].paymentMethod != 'PAYPAL' 
		&& order.billing.payment.selectedPaymentInstruments[0].paymentMethod != 'CREDIT_CARD') {
		document.getElementById('submit-order').className = 'btn btn-primary btn-block submit-order ' + order.billing.payment.selectedPaymentInstruments[0].paymentMethod.toLowerCase();   	
	} else if(order.billing.payment 
		&& order.billing.payment.selectedPaymentInstruments
		&& order.billing.payment.selectedPaymentInstruments.length > 0 
		&& order.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'CREDIT_CARD'){
		document.getElementById('submit-order').className = 'btn btn-primary btn-block submit-order credit_card';
		}
	else if(!$('.next-step-button .submit-order').hasClass('.place-order')){
		document.getElementById('submit-order').className = 'btn btn-primary btn-block submit-order place-order';
	}
    
	if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
		&& order.billing.payment.selectedPaymentInstruments.length > 0 && order.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'CREDIT_CARD' && saType && saType != 'SA_SILENTPOST' && saType != 'SA_FLEX') {
		isCSType = true;
	}
    
    if (isCSType) {
	    	if(order.billing.payment && order.billing.payment.selectedPaymentInstruments
	        && order.billing.payment.selectedPaymentInstruments.length > 0){
	    		htmlToAppend += '<span>Secure Acceptance ' + order.billing.payment.selectedPaymentInstruments[0].paymentMethod.replace('_', ' ') + '</span>';
	    	}
    	} else if(order.billing.payment && order.billing.payment.selectedPaymentInstruments
        	&& order.billing.payment.selectedPaymentInstruments.length > 0 && (order.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'PAYPAL' || order.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'PAYPAL_CREDIT')) {
        	 htmlToAppend += '<span>' + order.billing.payment.selectedPaymentInstruments[0].paymentMethod + 
        	 '</span>' + '<div><span>' + order.billing.payment.selectedPaymentInstruments[0].amount + '</span></div>';
    	} else if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0 && order.billing.payment.selectedPaymentInstruments[0].paymentMethod == 'CREDIT_CARD') {
        htmlToAppend += '<span>' + order.resources.cardType + ' '
            + order.billing.payment.selectedPaymentInstruments[0].type
            + '</span><div>'
            + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
            + '</div><div><span>'
            + order.resources.cardEnding + ' '
            + order.billing.payment.selectedPaymentInstruments[0].expirationMonth
            + '/' + order.billing.payment.selectedPaymentInstruments[0].expirationYear
            + '</span></div>';
    } else if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
            && order.billing.payment.selectedPaymentInstruments.length > 0) {
    	$('.paypalDetails').addClass('show');
        removeactivepaypal();
		htmlToAppend +=  order.billing.payment.selectedPaymentInstruments[0].paymentMethod + '</span>';
    }

    $paymentSummary.empty().append(htmlToAppend);
    
    var checkoutStage = $('#checkout-main').attr('data-checkout-stage');
    var placeOrderflag = $('#submit-order').hasClass('place-order');
    if( checkoutStage === 'payment' && !placeOrderflag)
    {
    	var placeOrderBtn = $('#checkout-main').find('#submit-order');
    	$(placeOrderBtn).closest('.row').find('.next-step-button').removeClass('next-step-button');	
    }
   
};

function updatePaypal(options){
     if(undefined !== options && undefined !== options.selectedPayment && options.selectedPayment == 'PAYPAL' &&
    	undefined !== options.paidWithPayPal && !options.paidWithPayPal) {
		$('.paypalDetails').addClass('show');
		$('.next-step-button .submit-payment').attr('id','showSubmitPayment');
		$('.nav-item.activepaypal').attr('data-auth', 're-auth');
	} 
	var liPaypal = $('li[data-method-id="PAYPAL"]');
	if($(liPaypal).hasClass('activepaypal')){
		$('.payment-options a.paypal-tab')[0].click();
		$('.payment-information').data('payment-method-id', 'PAYPAL');
	}
}

function removeactivepaypal(){
	$('.nav-item.activepaypal').attr('data-auth', 're-auth');
	var liPaypal = $('li[data-method-id="PAYPAL"]');
	liPaypal.removeClass('activepaypal');
}

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
        if ($('li[data-method-id="CREDIT_CARD"]').attr('data-sa-type') != 'SA_FLEX') {
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
	if ($('li[data-method-id="CREDIT_CARD"]').attr('data-sa-type') != 'SA_FLEX') {
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