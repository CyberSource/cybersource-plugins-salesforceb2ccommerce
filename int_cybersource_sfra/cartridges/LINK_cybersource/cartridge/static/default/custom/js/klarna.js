$(document).ready(function() {

    $("#klarna-pay-authorize").hide();
    
    $('#klarna-error-message').hide();

        //  If a session token has already been generated, display the widget and remove the request session form.
        //  Prevents creating a new session every time customer comes to the billing step.
        //  This will require a new implementation of Klarna.Payments.load to update the Klarna session with new 
        //  payment or basket information, as this could have changed since customer was last on the billing page.
    /*
        var sessionToken = $('#klarna-container').data('session-token');
    if (sessionToken) {
        removeSessionForm();
        loadWidget(sessionToken);
    }
    */

    $('#klarna-pay-get-session').click(function(e) {
        e.preventDefault();
        // removing error message
        $(".error-message").css('display', 'none');
            //  If Klarna widget isn't already open.
        if ($('#klarna-credit-main').length === 0) {
                //  Request session token.
        	 $('#klarna-error-message').hide();
            requestSession();
        }
    });


    function requestSession() {

        var form = $('#dwfrm_billing');
        var formData = $(form).serialize();
        var endpoint = $('#klarna-pay-get-session').data('action-url');
        $.spinner().start();
        $.ajax({
            url: endpoint,
            method: 'POST',
            data: formData,
            success: function (data) {
            	$.spinner().stop();
                if (data.reasonCode !== 100 || data.decision === "REJECT"){
                   $('#klarna-error-message').show();
                } 
                else {
                    removeSessionForm();
                    loadWidget(data.sessionToken);
                }
            },
            error: function (err) {
            	$.spinner().stop();
                $('#klarna-error-message').show();
            }
        });
    }

    function removeSessionForm() {
        $("#klarna-email-group").hide();
        $("#klarna-pay-get-session").hide();
    }

    function loadWidget(sessionToken) {
        var token ={};
        token.client_token = sessionToken;
        Klarna.Credit.init(token);
        Klarna.Credit.load({
            container: "#klarna-container"}, function(res) {
                if (res["show_form"] == true){
                    $("#klarna-pay-authorize").show();
                    $("#klarna-pay-authorize").click(function(){
						authorizeKlarnaOrder();												
					});
				}
            }
        );
    }

    function authorizeKlarnaOrder() {
    	$.spinner().start();
        var updateEndpoint =  document.getElementById("klarnaUpdateUrl").value;
        $.ajax({
            method: 'POST',
            url: updateEndpoint,
            success: function (data) {
            	$.spinner().stop();
                if(!data.error)
                {
                	 Klarna.Credit.authorize(function(res) {
                         if (res["approved"] == true) {
                         	document.getElementById("klarnaAuthToken").value=res["authorization_token"];
                             $("#klarna-pay-authorize").hide(); 
                             $('.submit-payment').trigger("click");
                         }
                         else
                         {
                         	$("#klarna-pay-authorize").hide();
                         }          
                     }); 
                }
                else
                {
                	$("#klarna-email-group").show();
                    $("#klarna-pay-get-session").show();
                	$("#klarna-pay-authorize").hide();
                	$('#klarna-credit-main').remove();
                	$(".error-message").css('display', 'block');
                	var errorPara = document.getElementsByClassName("error-message-text");
                	if(errorPara.length>0)
                	{
                		errorPara[0].innerText= "Your payment settings could not be submitted. Please review your payment settings and try again. Thank you for your patience!"
                	}     	
                }
            },
            error: function (err) {
            	$.spinner().stop();
            	$(".error-message").css('display', 'block');
            	var errorPara = document.getElementsByClassName("error-message-text");
            	if(errorPara.length>0)
            	{
            		errorPara[0].innerText= "Your payment settings could not be submitted. Please review your payment settings and try again. Thank you for your patience!"
            	}
            }
        });     
    }

});
