'use strict';

/**
 * @function
 * @description function to convert html tag to lt or gt;
 * @param {fieldValue} value of the field
 */
function encodeRequestFieldValue(fieldValue) {
	return fieldValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * @function
 * @description function to redirect secure acceptance redirect form
 */
function initSecureAcceptanceSilentPost() {
	$('.sa_silentpost').on('click', function (e) {
    	var CsSaType = $('.nav-item').data('sa-type');
    	if ('SA_SILENTPOST' == CsSaType) {
    		//var formaction = $('.nav-item').data('sa-url');
    		var formaction = $(this).data('action');
    		 window.location.href = formaction;
      		}
    });
}

/**
 * @function
 * @description function to redirect secure acceptance redirect form
 */
function initSecureAcceptanceRedirect() {
	$('.sa_redirect').on('click', function (e) {
    	var CsSaType = $('.nav-item').data('sa-type');
    	if ('SA_REDIRECT' == CsSaType) {
    		var formaction = $(this).data('action');
    		 window.location.href = formaction;
      		}
    });
}

/**
 * @function
 * @description function to Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
function initSecureAcceptanceIframe() {
	$('.sa_silentpost').on('click', function (e) {
		var CsSaType = $('.nav-item').data('sa-type');
    	if ('SA_IFRAME' == CsSaType) {
    		var formaction = $(this).data('action');
    			 $.ajax({
    					url: formaction,
    					type: "POST",
    					success: function(xhr,data) {
    						if(xhr) {
    							if(xhr.error == true) {
    								 $("#saspCardError").html(xhr.errorMsg);
    								 $("#saspCardError").addClass('error');
    							} else {
    								  $("#secureAcceptanceIframe").html(xhr);
    						   }
    						} else {                         
    				        	 $("#saspCardError").html(xhr.errorMsg);
    							 $("#saspCardError").addClass('error');
    				        }
    						return true;
    					},
    				    error: function () {
    				    	 $("#saspCardError").html(xhr.errorMsg).addClass('error');
    					}
    			  });
    	} else {
    		return true;
    	}
	});
}

/**
 * @function
 * @description function to creates signature and payment instrument for silent post and request is send to create the token with all data in hidden fields;
 * @param {viewData}
 */
function initSecureAcceptanceFlex() {
	$('.sa_flex').on('click', function (e) {
    	var CsSaType = $('.nav-item').data('sa-type');
		if ('SA_SILENTPOST' == CsSaType || 'SA_FLEX' == CsSaType) {
			var $checkoutForm = $('#dwfrm_billing');
			var ccnumber = $($checkoutForm).find('input[name$="_creditCardFields_cardNumber"]').val();
			var cvn = $('.saved-payment-instrument.selected-payment #saved-payment-security-code').val();
			var month = $('#expirationMonth').val();
			var expyear = $('#expirationYear').val();
			var dwcctype = $('input[name$="_cardType"]').val();
			var savecc = $($checkoutForm).find('input[name$="_creditCard_saveCard"]').is(':checked');
			var customerEmail = $("#email").val();
			var cardmap= {'Visa': '001','Amex': '003','MasterCard': '002','Discover': '004','Maestro':'042'};
			if(month.length == 1) {
				month = "0"+month;
			}
			var cctype  = cardmap[dwcctype];
			 var firstname = encodeRequestFieldValue($($checkoutForm).find('input[name$="_addressFields_firstName"]').val());
			 var lastname = encodeRequestFieldValue($($checkoutForm).find('input[name$="_addressFields_lastName"]').val());
			 var address1 = encodeRequestFieldValue($($checkoutForm).find('input[name$="_addressFields_address1"]').val());
			 var address2 = encodeRequestFieldValue($($checkoutForm).find('input[name$="_addressFields_address2"]').val());
			 var city = 	encodeRequestFieldValue($($checkoutForm).find('input[name$="_addressFields_city"]').val());
			 var zipcode = encodeRequestFieldValue($($checkoutForm).find('input[name$="_addressFields_postalCode"]').val());
			 var country = encodeRequestFieldValue($($checkoutForm).find('select[name$="_addressFields_country"]').val());
			 var state = $($checkoutForm).find('select[name$="_addressFields_states_stateCode"]').val();
			 if (state===undefined) {
				 state = $($checkoutForm).find('input[name$="_addressFields_states_stateCode"]').val(); 
			 }
			 state = encodeRequestFieldValue(state);
			 var phoneno = encodeRequestFieldValue($($checkoutForm).find('input[name$="_creditCardFields_phone"]').val());
			 var cctoken = $('#selectedCardID').val();
			 var validCardType = dwcctype.toLowerCase(); 
			 var saurl = $('.nav-item').data('sa-url');
			 var data = {
					custemail : customerEmail,
					savecc : savecc,
					firstname : firstname,
					lastname : lastname,
			 		address1 : address1,
			 		address2 : address2,
			 		city : city,
			 		zipcode : zipcode,
			 		country : country,
			 		state : state,
			 		phone : phoneno,
			 		cctoken : cctoken,
			 		month: month,
			 		cvn: cvn,
			 		expyear: expyear,
			 		ccnumber: ccnumber,
			 		cctype: cctype,
					format : 'ajax'
			 };
				 $.ajax({
						url: saurl,
						type: "POST",
						data: data,
						success: function(xhr,data) {
							if(xhr) {
								if(xhr.error == true) {
									 $("#saspCardError").css("display", "block");
								}
								else {
						    		$("#secureAcceptancePost").html(xhr);
									$("#silentPostFetchToken").submit();
							      	}
							}
							else {                         
					        	 $("#saspCardError").css("display", "block");
					        }
							return true;
						},
					    error: function () {
					    	 $("#saspCardError").css("display", "block");
						}
				  });
		} else {
			return true;
		}
	});
}

module.exports = {
   initSecureAcceptance: function () {
    	 $('body').on('checkout:updateCheckoutView', function (e, data) {
            initSecureAcceptanceIframe();
            initSecureAcceptanceSilentPost();
            initSecureAcceptanceRedirect();
            initSecureAcceptanceFlex();
         });  	
    }
};