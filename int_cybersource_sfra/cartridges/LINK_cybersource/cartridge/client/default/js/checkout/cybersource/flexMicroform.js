var formHelpers = require('base/checkout/formErrors');

$(document).ready(function () {	
		function encodeRequestFieldValue(fieldValue) {
			return fieldValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		}
		var jwk = JSON.parse($('#flextokenObj').val());
	     // SETUP MICROFORM
	     FLEX.microform(
	             {
	                 keyId: jwk.kid,
	                 keystore: jwk,
	                 container: '#cardNumber-container',
	                 label: '#cardNumber',
	                 placeholder: 'Enter Card Number here',
	                 styles: {
	                     'input': {
	                         'font-family': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
	                         'font-size': '1rem',
	                         'line-height': '1.5',
	                         'color': '#495057',
	                     },
	                     ':focus': {'color': 'blue'},
	                     ':disabled': {'cursor': 'not-allowed'},
	                     'valid': {'color': '#3c763d'},
	                     'invalid': {'color': '#a94442'},
	                 },
	                 encryptionType: 'rsaoaep256'
	             },
	             function (setupError, microformInstance) {
	                 if (setupError) {
	                     // handle error
	                     return;
	                 }
	
	                 // intercept the form submission and make a tokenize request instead
	                 $('.sa_flex').on('click', function () {
	                     var expMonth = $('#expirationMonth').val();
	                     var expYear = $('#expirationYear').val();
	                     // Send in optional parameters from other parts of your payment form
	                     var options = {
	                         cardExpirationMonth: expMonth.length == 1 ? "0"+expMonth : expMonth,
	                         cardExpirationYear: expYear
	                         // cardType: /* ... */
	                     };
	                     //validation
	                     $.ajax({
                             url: $('#dwfrm_billing').attr('action'),
                             method: 'POST',
                             data: $('#dwfrm_billing').serialize(),
                             success: function (data) {
                                 // look for field validation errors
                                 if (data.error) {
                                     if (data.fieldErrors.length) {
                                         data.fieldErrors.forEach(function (error) {
                                             if (Object.keys(error).length) {
                                                 formHelpers.loadFormErrors('.payment-form', error);
                                             }
                                         });
                                     }
                                     
                                 } else {
                                	 microformInstance.createToken(options, function (err, response) {
             	                    	 if (err) {
             	                            err.details.responseStatus.details.forEach(function(detail) {
             						          $(".card-number-wrapper .invalid-feedback").text("A Card Number is required").css('display','block');
             						        });
             	                             return true;
             	                         }
             	
             	                         //console.log('Token generated: ');
             	                         // console.log(JSON.stringify(response));
             	                         var flexResponse = $('#flex-response').val(JSON.stringify(response));
             	                         // At this point the token may be added to the form
             	                         // as hidden fields and the submission continued
             	                         var getFlexVal = JSON.parse($('#flex-response').val());
             							 $('#cardNumber').val(getFlexVal['maskedPan']);
             							 $('#cardType').val(getFlexVal['cardType']);
             							 var CsSaType = $('.nav-item').data('sa-type');
             								if ('SA_FLEX' == CsSaType) {
             									var $checkoutForm = $('#dwfrm_billing');
             									var flextokenResponse = $('#flextokenRespose').val();
             									var flexToken = $('input[name="dwfrm_billing_creditCardFields_flexresponse"]').val();
             									var flexTokenString = JSON.parse($('input[name="dwfrm_billing_creditCardFields_flexresponse"]').val());
             									var cctype = flexTokenString['cardType'];
             									var ccnumber = flexTokenString['maskedPan'];
             									var cvn =  $($checkoutForm).find('input[name$="_creditCardFields_securityCode"]').val();
             									var month = $('#expirationMonth').val();
             									var expyear = $('#expirationYear').val();
             									var savecc = $($checkoutForm).find('input[name$="_creditCard_saveCard"]').is(':checked');
             									var customerEmail = $("#email").val();
             									if(month.length == 1) {
             										month = "0"+month;
             									}
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
             	                    				 var flexUrl = $('.nav-item').data('sa-url');
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
             									 		flexToken : flexToken,
             									 		flextokenResponse: flextokenResponse,
             											format : 'ajax'
             									 };
             										 $.ajax({
             												url: flexUrl,
             												type: "POST",
             												data: data,
             												success: function(xhr,data) {
             													if(xhr) {
             														if(xhr.error == true) {
             															 $("#saspCardError").css("display", "block");
             														}
             														else {
             												    		$("#secureAcceptancePost").html(xhr);
             															$("#card_expiry_date").val(month +'-'+expyear);
             															$("#card_type").val(cctype);
             															$("#card_cvn").val(cvn);
             															if(cctoken == null || cctoken == '' || typeof cctoken == "undefined") {
             																$('#silentPostFetchToken').append('<input type="hidden" id="card_number" name="card_number" />');
             																$("#card_number").val(ccnumber.replace(/\s/g, ""));
             															}
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
                             },
                            
                         });
                         return true;
	                  });
	                }
	           );	
});
