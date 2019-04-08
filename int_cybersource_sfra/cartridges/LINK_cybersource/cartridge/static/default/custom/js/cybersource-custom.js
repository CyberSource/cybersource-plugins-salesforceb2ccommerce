var init = {
    initConfig: function() {
        var requestId,billingAgreementFlag,		//A Flag to show whether user has opted for Billing Agreement or not
        billingAgreementButton,					//The Billing Agreement Checkbox
        billingAgreementID,						//Billing Agreement ID
        isPayPalCredit=false;
        var config = {
        env: 'sandbox',
        commit: true,
        
		validate: function(actions) {
			if($('.paypal-address').length>0) {
				paypalvalidator.toggleForm(actions);
				paypalvalidator.onChangeForm(function(){
					paypalvalidator.toggleForm(actions);
				});
			}
		},
        payment: function() {
            var CREATE_URL = document.getElementById("paypal_express").value;
            if(config.paymentOption.credit){
                isPayPalCredit = true;
            }else{
                isPayPalCredit =false;
            }
            billingAgreementButton = document.getElementById("billingAgreementCheckbox");
            //billingAgreementFlag - This variable is used to indicate if billing agreement creation is requested or not
            billingAgreementFlag = (billingAgreementButton==null)?false:billingAgreementButton.checked;
            //Append a parameter to URL when Billing Agreement is checked
            if(billingAgreementFlag){
                CREATE_URL = CREATE_URL + "?billingAgreement=true";
            } else if(isPayPalCredit){
                //Append a parameter to URL when PayPal Credit is used
                CREATE_URL = CREATE_URL + "?isPayPalCredit=true";
            }
            return paypal.request.post(CREATE_URL)
                .then(function(res) {
                    requestId=res.requestID;
                    return res.processorTransactionID;
                });
        }, 
        onAuthorize: function(data, actions) {
            var data = {
                requestId : requestId,	
                billingAgreementFlag : billingAgreementFlag,
                paymentID: data.paymentID,
                payerID: data.payerID,
                isPayPalCredit: isPayPalCredit
            };
            
            var paypalcallback = document.getElementById("paypal_callback").value;
            var form = $('<form action="' + paypalcallback + '" method="post">' +
                '<input type="hidden" name="requestId" value="' + requestId + '" />' +
                '<input type="hidden" name="billingAgreementFlag" value="' + billingAgreementFlag + '" />' +
                '<input type="hidden" name="paymentID" value="' + data.paymentID + '" />' +
                '<input type="hidden" name="payerID" value="' + data.payerID + '" />' +
                '<input type="hidden" name="isPayPalCredit" value="' +isPayPalCredit + '" />' +
                '</form>');
            $('body').append(form);
            form.submit();
        }
    };
    return config;
},

initPayPalButtons : function() {
	var isPaypalEnabled;
    isPaypalEnabled = $('#paypal_enabled').length>0 && document.getElementById("paypal_enabled").value == 'true' ? true : false;
    var locale = $('#currentLocale').length>0 ? document.getElementById("currentLocale").value : '';
    var config = init.initConfig();
    config.paymentOption = {
        	express: true,
        	credit : false
	};
	config.locale=locale;
    if(isPaypalEnabled && $('.paypal-button-container-cart1').length>0){
        paypal.Button.render(config,'.paypal-button-container-cart1');	
    }
    if(isPaypalEnabled && $('.paypal-button-container-cart2').length>0){
        paypal.Button.render(config,'.paypal-button-container-cart2');
    }
    if(isPaypalEnabled && $('#paypal-button-container').length>0){
        paypal.Button.render(config,'#paypal-button-container');
    }
    //Settings for PayPal Credit Card Button
    if(isPaypalEnabled && $('#paypal-credit-container').length>0){
    	var creditConfig = init.initConfig();
        creditConfig.style ={
            label: 'credit',
            size:  'small', // small | medium
            shape: 'rect'   // pill | rect
        };
        creditConfig.paymentOption = {
        	express: false,
        	credit : true
        };
        creditConfig.locale=locale;
        paypal.Button.render(creditConfig,'#paypal-credit-container');
    }
},

initFunctions : function(){
    // for Alipay Intermediate
    if($("body").hasClass("cyb_alipayintermediate")) {
        var loaded = false;
        setTimeout(function(){
            document.RedirectForm.submit();
            loaded = true;
        },1000);	
    }
        // For FingerPrint Unit testing 
    if($("body").hasClass("cyb_testfingerprintRedirect")) {
        var url_loc = document.getElementById("URl_redirect").value;
        setTimeout(function(){location.href=url_loc} , 1000); 
    }
        // For Payerauth during checkout 
    if($("div").hasClass("payerauth")) {	
        document.PAInfoForm.submit();
    }	
        // For payerauth during  Credit card  
    if($("body").hasClass("cyb_payerauthenticationredirect")) {	
        document.RedirectForm.submit();
    }	
        // For payerauth during  Unit testing 
    if($("body").hasClass("cyb_unitTest_payerauth")) {	
        document.RedirectForm.submit();
    }	
        // For payer auth during  Unit testing 
    if($("div").hasClass("cyb_unitTest_payerauthsubmit")) {	
        document.PAInfoForm.submit();
    
    }		
        // For Secure Acceptance Redirect 
    if($("body").hasClass("cyb_sa_redirect")) {	
        var url_loc = document.getElementById("redirect_url_sa").value;
        window.top.location.replace(url_loc);
    }
        // For Secure Acceptance Iframe  
    if($("div").hasClass("SecureAcceptance_IFRAME")) {	
        var url_loc = document.getElementById("sa_iframeURL").value;
        $(".SecureAcceptance_IFRAME").append('<iframe src='+url_loc+'  name="hss_iframe"  width="85%" height="730px" scrolling="no" />');

    }	
        // For Secure Acceptance Iframe 
    if($("body").hasClass("sa_iframe_request_form")) {	
        document.form_iframe.submit();
    }
        // For Secure Acceptance  
    if($("body").hasClass("cyb_sa_request_form")) {	
        $('#loading').css('display', 'block');
        document.ePayment.submit();
    }
        //FOR POS
    $("#entry-mode-pos_unittest select.input-select").change( function(){
        if(this.value == "swiped") {
            $("#card-section, #sample-card-section").css("display","none");
        }
        else if(this.value == "keyed") {
            $("#card-section, #sample-card-section").css("display","block");
        }
    });	
    
    /*
        * If billing agreement ID already exists in the user profile then a different button
        * is displayed on the the page. This function handles the action of that button.
        * This functions directly calls checkstatusservice
    */
   	$(document).on('click', '.billingAgreementExpressCheckout', function(e){
        e.preventDefault();
        var paypalcallback = document.getElementById("paypal_callback").value;
        var form = $('<form action="' + paypalcallback + '" method="post">' +
            		'</form>');
        $('body').append(form);
        form.submit();
    });

    $('#capturepaymenttype, #authreversalpaymenttype').change(function() {
            if($(this).val() == 'visacheckout')	{
                $('#orderRequestID').attr('required','required');
                $('.orderRequestID').removeClass('hidden').addClass('show');
            } else {
                $('#orderRequestID').removeAttr('required');
                $('.orderRequestID').removeClass('show').addClass('hidden');
            }
    });

    /*
        *This code has been used to initialize, load and authorize klarna widget
        *and to process preapproval token returned by klarna auth service 
    */
    if($('#processorToken').length > 0){
        var klarnaToken = $('#processorToken').val();
        var token ={};
        token.client_token=klarnaToken;
        Klarna.Credit.init(token);
        Klarna.Credit.load({
            container: "#klarna_container"
            }, function(res) {
                if (res["show_form"] == true){
                    document.getElementById("auth_button").innerHTML = "<br><button id=\"klarnaPayButton\" type=\"button\" name=\"buy\">Pay</button>";
                    $("#klarnaPayButton").click(function(){
                        authorizeKlarnaOrder();												
                    });	
                
                
                }
            
        });
        window.authorizeKlarnaOrder =  function (){
                Klarna.Credit.authorize(function(res) {
                    if(res["approved"] == true){
                    document.getElementById("klarnaAuthToken").value=res["authorization_token"];
                    $('.submit-order button[type="submit"]').trigger("click");
                    }
                });
            }
    }
 }
};

var paypalhelper = {
    paypalMini : function() {
    	var config = init.initConfig();
    	var locale = $('#currentLocale').length>0 ? document.getElementById("currentLocale").value : '';
    	config.paymentOption = {
        	express: true,
        	credit : false
        };
        config.locale=locale;
        var isPaypalEnabled = false;
        if (document.getElementById("paypal_enabled") != null) {
            isPaypalEnabled = document.getElementById("paypal_enabled").value;
        }
        if (isPaypalEnabled && $('.paypal-button-container-mini').length>0){
            paypal.Button.render(config,'.paypal-button-container-mini');
        }
    },
    validateForms : function(){
    	var currentForm = $('data-checkout-stage').attr('data-checkout-stage');
    	if(currentForm == 'payment') {
    		false;
    	} return true;
    },
};
var paypalvalidator = {
	toggleForm : function (actions){
		if(this.isValid())
			return actions.enable();
		else
			return actions.disable();
	},
	isValid : function() {
		var paymentForm = $('#dwfrm_billing').serialize();
		var isValidForm = false;
		
		$('body').trigger('checkout:serializeBilling', {
			form: $('#dwfrm_billing'),
			data: paymentForm,
			callback: function (data) { paymentForm = data; }
		});
		paypalvalidator.validateAddress(function(data) {
			isValidForm = data.error ? false : true;
			if (data.fieldErrors.length) {
				data.fieldErrors.forEach(function (error) {
					if (Object.keys(error).length) {
						paypalvalidator.loadFormErrors('.payment-form', error);
					}
				});
			}
		});
		return isValidForm;     
    },

    loadFormErrors : function(parentSelector, fieldErrors) {
		$.each(fieldErrors, function (attr) {
			$('*[name=' + attr + ']', parentSelector).addClass('is-invalid').siblings('.invalid-feedback').html(fieldErrors[attr]);
    	});
	},
	
    paypalMini : function() {
    	var config = init.initConfig();
    	var isPaypalEnabled = document.getElementById("paypal_enabled").value;
    	if(isPaypalEnabled && $('.paypal-button-container-mini').length>0){
			paypal.Button.render(config,'.paypal-button-container-mini');
		}
    },
    validateAddress : function(callback) {
    	 var paymentForm = $('#dwfrm_billing').serialize();
    	 $.ajax({
			method: 'POST',
			async: false,
			data: paymentForm,
			url: $('.paypal-address').attr('action'),
				success: function (data) {
					callback(data);
				},
				error: function (err) {
				},
			});
	},
	onChangeForm : function(handler) {
        $('.billing-information').on('change', handler);
    }
};

$(document).ready(function() {
    init.initConfig();
    init.initPayPalButtons();
    init.initFunctions();
    if($('#isGooglePayEnabled').val() == "true"){
    	onGooglePayLoaded();
    }
});
