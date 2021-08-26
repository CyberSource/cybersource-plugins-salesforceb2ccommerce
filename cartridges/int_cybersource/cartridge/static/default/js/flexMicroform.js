$(document).ready(function () {
  $('.checkout-billing').find('input[name*="creditCard_flexresponse"]').val(''); 
  var captureContext = JSON.parse($('#flexTokenResponse').val()).keyId;
  var flex = new Flex(captureContext); // eslint-disable-line no-undef
  var customStyles = {
    input: {
      'font-family': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
      'font-size': '1rem',
      'line-height': '1.5',
      'color': '#495057',
    },
    ':focus': { color: 'blue' },
    ':disabled': { cursor: 'not-allowed' },
    valid: { color: '#3c763d' },
    invalid: { color: '#a94442' },
  };
  var microform = flex.microform({ styles: customStyles });
  var number = microform.createField('number');
  var securityCode = microform.createField('securityCode');
  securityCode.load('#securityCode-container');
  number.load('#cardNumber-container');
  number.on('change', function (data) {
    var cardType = data.card[0].name;
    $('.card-number-wrapper').attr('data-type', cardType);
    $('#cardType').val(cardType);
  });

  function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) { // eslint-disable-line no-undef
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  }

  function flexTokenCreation() {
	if($('.continue-place-order').length > 0) {
	    var expMonth = $('.checkout-billing').find('select[name*="expiration_month"]').val();
	    var expYear = $('.checkout-billing').find('select[name*="expiration_year"]').val();
	    if (expMonth === '' || expYear === '') {
	      return false;
	    }
	}
    var expMonth = $('.field-wrapper').find('select[name*="expiration_month"]').val();
    var expYear = $('.field-wrapper').find('select[name*="expiration_year"]').val();
    if (expMonth === '' || expYear === '') {
      return false;
    }
    // Send in optional parameters from other parts of your payment form
    var options = {
      expirationMonth: expMonth.length === 1 ? '0' + expMonth : expMonth,
      expirationYear: expYear
      // cardType: /* ... */
    };
    // validation
    // look for field validation errors

    microform.createToken(options, function (err, response) {
      // At this point the token may be added to the form
      // as hidden fields and the submission continued
      if (err) {	  
    	  for (j = 0; j < err.details.length; j++) {
    		  if(err.details[j].location=='number'){
    			  $('.number-invalid-feedback').text(err.message).css('display', 'block');
    		  }
    		  if(err.details[j].location=='securityCode'){
    			  $('.securityCode-invalid-feedback').text(err.message).css('display', 'block');
    		  }
    	  }
        
        return true;
      }
      var decodedJwt = parseJwt(response);
      if($('.continue-place-order').length > 0) {
	      $('.checkout-billing').find('input[name*="creditCard_flexresponse"]').val(decodedJwt.jti);
	      $('.checkout-billing').find('input[name*="_number"]').val(decodedJwt.data.number);
	      $('.continue-place-order').trigger('click');
      }
      
      $('.field-wrapper').find('input[name*="_newcreditcard_flexresponse"]').val(decodedJwt.jti);
      $('.field-wrapper').find('input[name*="_number"]').val(decodedJwt.data.number);
      $('#applyBtn').trigger('click');
      
    });
    return true;
  }

  // intercept the form submission and make a tokenize request instead
  $('.continue-place-order').on('click', function (event) {
	  if($('input[name$="_selectedPaymentMethodID"]:checked').val() == 'SA_FLEX' && !$('#creditCardList').val()){
	  $('.number-invalid-feedback').css('display', 'none');
	  $('.securityCode-invalid-feedback').css('display', 'none');
      if (($('.checkout-billing').find('input[name*="creditCard_flexresponse"]').val() === '' || $('.checkout-billing').find('input[name*="creditCard_flexresponse"]').val() === undefined)) {
      flexTokenCreation();
      event.preventDefault();
      }
	  }
  });
  
  $('#applyBtn').on('click', function (event) {
	  $('.number-invalid-feedback').css('display', 'none');
	  $('.securityCode-invalid-feedback').css('display', 'none');
	  if ($('.field-wrapper').find('input[name*="_newcreditcard_flexresponse"]').val() === '' || $('.field-wrapper').find('input[name*="_newcreditcard_flexresponse"]').val() === undefined) {  
	  flexTokenCreation();
      event.preventDefault();
	  }
  });
});