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
function initSecureAcceptance() {
	$('.sa_silentpost, .sa_redirect').on('click', function (e) {
    	var CsSaType = $('.nav-item').data('sa-type');
    	if ('CREDIT_CARD' != CsSaType) {
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
	$('.sa_iframe').on('click', function (e) {
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

module.exports = {
   initSecureAcceptance: function () {
    	 $('body').on('checkout:updateCheckoutView', function (e, data) {
            initSecureAcceptance();
            initSecureAcceptanceIframe();
         });  	
    }
};