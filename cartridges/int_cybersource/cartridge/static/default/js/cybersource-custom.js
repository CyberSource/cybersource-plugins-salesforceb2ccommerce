$(document).ready(function () {
	
	$("#generic-form-submit").on('submit',function(e){
		var validator = $(this).validate();
		if(validator.form())
			return true;
		else
			return false;
	}); 	
	
// for Alipay Intermediate
	if($("body").hasClass("cyb_alipayintermediate"))
	{
		var loaded = false;
		setTimeout(function(){
			document.RedirectForm.submit();
			loaded = true;
		},1000);	
	}

// For FingerPrint Unit testing 
	if($("body").hasClass("cyb_testfingerprintRedirect"))
	{
		var url_loc = document.getElementById("URl_redirect").value;
		setTimeout(function(){location.href=url_loc} , 1000); 
	}
	
	// For Payerauth during checkout 
	if($("div").hasClass("payerauth"))
	{	
		document.PAInfoForm.submit();
	}	
	// For payerauth during  Credit card  
	if($("body").hasClass("cyb_payerauthenticationredirect"))
	{	document.RedirectForm.submit();
		
	}	
	// For payerauth during  Unit testing 
	if($("body").hasClass("cyb_unitTest_payerauth"))
	{	
		document.RedirectForm.submit();
		
	}	
	// For payer auth during  Unit testing 
	if($("div").hasClass("cyb_unitTest_payerauthsubmit"))
	{	
		document.PAInfoForm.submit();
		
	}		
	// For Secure Acceptance Redirect 
	if($("body").hasClass("cyb_sa_redirect"))
	{	
		var url_loc = document.getElementById("redirect_url_sa").value;
		window.top.location.replace(url_loc);
		
	}
	// For Secure Acceptance Iframe  
	if($("div").hasClass("SecureAcceptance_IFRAME"))
	{	
		var url_loc = document.getElementById("sa_iframeURL").value;
		$(".SecureAcceptance_IFRAME").append('<iframe src='+url_loc+'  name="hss_iframe"  width="78%" height="630px" scrolling="no" />');
		
	}	
	// For Secure Acceptance Iframe 
	if($("body").hasClass("sa_iframe_request_form"))
	{	
		document.form_iframe.submit();
	}
	// For Secure Acceptance  
	if($("body").hasClass("cyb_sa_request_form"))
	{	
		document.ePayment.submit();
	}	
		
//FOR POS
	
	$("#entry-mode-pos_unittest select.input-select").change( function(){
		if(this.value == "swiped")
			$("#card-section, #sample-card-section").css("display","none");
		else if(this.value == "keyed")
			$("#card-section, #sample-card-section").css("display","block");
	});	
	var requestId,billingAgreementFlag,					//A Flag to show whether user has opted for Billing Agreement or not
	billingAgreementButton,					//The Billing Agreement Checkbox
	billingAgreementID,						//Billing Agreement ID
	isPayPalCredit=false;					//A Flag to show whether user has opted for PayPal Credit Card
	function toggleForm(actions) {
	        return isValid() ? actions.enable() : actions.disable();
	}
	function isValid() {
		var validator = $('.checkout-billing').validate();
		 if ( validator.form()) {
			 return true;
		 }else{
			 return false;
		 }
    }
	function onChangeForm(handler) {
        $('.checkout-billing').on('change', handler);
    }
	var config = {
			env: 'sandbox', // sandbox | production
		    commit: true,
		    payment: function() {
		        var CREATE_URL = Urls.paypalinitsession;
		        if($('#paypal-credit-container').length>0 && $('#paypal-credit-container').is(":visible")){
		    		isPayPalCredit = true;
		    	}else{
		    		isPayPalCredit =false;
		    	}
		        billingAgreementButton = document.getElementById("billingAgreementCheckbox");
		        //billingAgreementFlag - This variable is used to indicate if billing agreement creation is request or not
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
		        
				var form = $('<form action="' + Urls.paypalcallback + '" method="post">' +
			    		    '<input type="hidden" name="requestId" value="' + requestId + '" />' +
			    		    '<input type="hidden" name="billingAgreementFlag" value="' + billingAgreementFlag + '" />' +
			    		    '<input type="hidden" name="paymentID" value="' + data.paymentID + '" />' +
			    		    '<input type="hidden" name="payerID" value="' + data.payerID + '" />' +
			    		    '<input type="hidden" name="isPayPalCredit" value="' +isPayPalCredit + '" />' +
			    		    '</form>');
			        $('body').append(form);
			        form.submit(); 
		    },
		    validate: function(actions) {
		    	if($('.checkout-billing').length>0){
		    		toggleForm(actions);
		    		onChangeForm(function(){
			    		toggleForm(actions);
			    	});
		    	}
		    }
		};
	if(SitePreferences.ISPAYPALENABLED && $('.paypal-button-container-mini').length>0){
	paypal.Button.render(config,'.paypal-button-container-mini');
	}
	if(SitePreferences.ISPAYPALENABLED && $('.paypal-button-container-cart1').length>0){
		paypal.Button.render(config,'.paypal-button-container-cart1');	
	}
	if(SitePreferences.ISPAYPALENABLED && $('.paypal-button-container-cart2').length>0){
		paypal.Button.render(config,'.paypal-button-container-cart2');
	}
	if(SitePreferences.ISPAYPALENABLED && $('#paypal-button-container').length>0){
		paypal.Button.render(config,'#paypal-button-container');
	}
	//Settings for PayPal Credit Card Button
	if(SitePreferences.ISPAYPALENABLED && $('#paypal-credit-container').length>0){
		config.style ={
				label: 'credit',
	            size:  'small', // small | medium
	            shape: 'rect'   // pill | rect
			};
		
		paypal.Button.render(config,'#paypal-credit-container');
	}
	/*
	 * If billing agreement ID already exists in the user profile then a different button
	 * is displayed on the the page. This function handles the action of that button.
	 * This functions directly calls checkstatusservice
	 */
	$('.billingAgreementExpressCheckout').click(function(e){
		e.preventDefault();
		 var form = $('<form action="' + Urls.paypalcallback + '" method="post">' +
		  '</form>');
		 $('body').append(form);
	        form.submit();
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
    		 $.ajax({
                 method: 'POST',
                 url: Urls.klarnaupdate,
                 success: function (data) {
                     if(data.submit)
                     {
                    	 Klarna.Credit.authorize(function(res) {
            				 if(res["approved"] == true){
            					document.getElementById("klarnaAuthToken").value=res["authorization_token"];
            					$('.submit-order button[type="submit"]').trigger("click");
            				 }
            				 else
            				 {
            					 if (res["show_form"] == true) {
                            		 $("#klarnaPayButton").show();
                            	 }
                            	 else
                            	 {
                            		 $("#klarnaPayButton").hide();
                            	 }		 
            				 }
                    	 });
                     }
                     else
                     {
                    	 $("#klarnaPayButton").hide();
                    	 var error = document.getElementById("errormsg");
        	        	 var errorformdiv = document.getElementsByClassName("error-form");
        	        	 if(errorformdiv.length>0)
        	        	 {
        	        		 errorformdiv[0].innerText = Resources.DECLINED_ERROR;
        	        	 }
        	        	 else
        	        	 {
        	        		 var d = document.createElement("div");
        		        	 d.className = "error-form";
        		        	 d.innerText = Resources.DECLINED_ERROR;
        		        	 error.appendChild(d);
        	        	 }
                     }
                 },
                 error: function (err) {
                	 $("#klarnaPayButton").hide();
                	 var error = document.getElementById("errormsg");
    	        	 var errorformdiv = document.getElementsByClassName("error-form");
    	        	 if(errorformdiv.length>0)
    	        	 {
    	        		 errorformdiv[0].innerText = Resources.TECHINAL_ERROR;
    	        	 }
    	        	 else
    	        	 {
    	        		 var d = document.createElement("div");
    		        	 d.className = "error-form";
    		        	 d.innerText = Resources.TECHINAL_ERROR;
    		        	 error.appendChild(d);
    	        	 }
                 }
             });
			  
		 }
    }
	
	function weChatCheckStatus(serviceCalls) {	
		
		var callInterval = $('#serviceCallInterval').val();
		var noOfCalls = $('#noOfCalls').val();
		$.ajax({
			method : 'GET',
			url : Urls.WeChatCheckStatus,
			success : function (data) {
				if(data.submit) {
					window.location.href = Urls.orderreview;
				}
				else if(data.pending) {
					if(serviceCalls < noOfCalls){
						setTimeout(function() { weChatCheckStatus(serviceCalls+1) },callInterval*1000);
					}
					else{
						window.location.href = Urls.failWechatOrder;
					}	
				}
				else  {
					window.location.href = Urls.failWechatOrder;
				}
			},
			error : function (err) {				
				setTimeout(function() { weChatCheckStatus() },callInterval*1000);
			}
			
		});		
	}
	
	if($('#WeChatRedirectDiv').length > 0) {		
		$("a[name='checkStatus']").on("click", function (e) {
			weChatCheckStatus(1);	
		});		
	}
	
});
