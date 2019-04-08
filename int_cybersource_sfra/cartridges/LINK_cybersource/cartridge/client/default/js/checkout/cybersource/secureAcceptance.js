'use strict';

/**
 * @function
 * @description function to redirect secure acceptance redirect form
 */
function initSecureAcceptance() {
	$('.sa_silentpost, .sa_redirect, .alipay, .gpy, .eps, .sof, .mch, .idl').on('click', function (e) {
		e.stopImmediatePropagation();
    	var CsSaType = $('li[data-method-id="CREDIT_CARD"]').attr('data-sa-type');
    	var paymentMethodID = $("input[name=dwfrm_billing_paymentMethod]").val();
    	var paymentMethodIds = ['KLARNA', 'ALIPAY', 'GPY', 'EPS', 'SOF', 'IDL', 'MCH'];
        var paymentMethod = $.inArray(paymentMethodID, paymentMethodIds) > -1
    	if (('CREDIT_CARD' != CsSaType && paymentMethodID == 'CREDIT_CARD') || paymentMethod) {
    		var formaction = $(this).data('action');
			setTimeout(function () {
			  window.location.href = formaction;
			}, 500);
      	}
    });
}

/**
 * @function
 * @description function to Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
function initSecureAcceptanceIframe() {
	$('.sa_iframe').on('click', function (e) {
		var creditCardItem = $('li[data-method-id="CREDIT_CARD"]');
    	var CsSaType = $(creditCardItem).attr('data-sa-type');
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