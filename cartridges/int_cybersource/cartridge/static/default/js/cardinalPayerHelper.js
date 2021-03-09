$(document).ready(function() {
    Cardinal.configure({ 
        logging:{
            level: 'on'
        },
        timeout: 4000,
        maxRequestRetries: 2	    
    });

    var acsUrl = document.getElementById("AcsURL").value;
    var payload = document.getElementById("PaReq").value;
    
    var orderObject = JSON.parse(document.getElementById("order").value);

    var continueObject = {
        "AcsUrl":acsUrl,
        "Payload":payload
    };

    var jwt = document.getElementById("jwtToken").value;
    Cardinal.setup("init", {
        jwt: document.getElementById("jwtToken").value,
        order: orderObject
    });	 
    Cardinal.on("payments.validated", function (data, jwt) {     
        document.getElementById("processorTransactionId").value = data.Payment.ProcessorTransactionId;
        document.RedirectForm.submit();     
    });	 	  
    Cardinal.on('payments.setupComplete', function(setupCompleteData){
        Cardinal.continue('cca',continueObject,orderObject,jwt);	  
    }); 
});