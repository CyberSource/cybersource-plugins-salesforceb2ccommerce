$(document).ready(function () {
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
	
});
