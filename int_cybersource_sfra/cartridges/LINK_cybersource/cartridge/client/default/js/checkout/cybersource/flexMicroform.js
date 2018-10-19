var formHelpers = require('base/checkout/formErrors');

$(document).ready(function () {	
	if($('.nav-item').data('sa-type') == 'SA_FLEX') {
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
	         		
	         		function flexTokenCreation() {
	         			var expMonth = $('#expirationMonth').val();
	                    var expYear = $('#expirationYear').val();
	                     if(expMonth == '' || expYear == ''){
	                    	 return false;
	                     }
	                     // Send in optional parameters from other parts of your payment form
	                     var options = {
	                         cardExpirationMonth: expMonth.length == 1 ? "0"+expMonth : expMonth,
	                         cardExpirationYear: expYear
	                         // cardType: /* ... */
	                     };
	                     //validation
	                     // look for field validation errors
	                           
	                    	 microformInstance.createToken(options, function (err, response) {
	                               // At this point the token may be added to the form
	                               // as hidden fields and the submission continued
	                         	 if (err) {
	                                 err.details.responseStatus.details.forEach(function(detail) {
	         				          $(".card-number-wrapper .invalid-feedback").text("A Card Number is required").css('display','block');
	         				        });
	                                  return true;
	                              } else {
	                        		 var flexResponse = $('#flex-response').val(JSON.stringify(response));
	                             	 var getFlexVal = JSON.parse($('#flex-response').val());
	         						 $('#cardNumber').val(getFlexVal['maskedPan']);
	         						 $('#cardType').val(getFlexVal['cardType']);
	                              }
	                           });
	                     return true;
	         		}
	         		
	                 // intercept the form submission and make a tokenize request instead
	                 $('#expirationYear, #expirationMonth').on('change', function () {
	                	 flexTokenCreation();
	                  });
	                }
	           );	
	}	
});
