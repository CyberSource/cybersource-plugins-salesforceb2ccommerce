'use strict';

function getModalHtmlElement() {
	if ($('#deliveryAddressVerificationModal').length !== 0) {
        $('#deliveryAddressVerificationModal').remove();
    }
	
	var htmlString = '<!-- Modal -->'
        + '<div class="modal fade" id="deliveryAddressVerificationModal" role="dialog">'
        + '<div class="modal-dialog">'
        + '<!-- Modal content-->'
        + '<div class="modal-content">'
        + '<div class="modal-header">'
        + '<h4 class="modal-title dav-modal-title"></h4>'
        + '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
        + '</div>'
        + '<div class="modal-body">'
        + '<div class="originalAddress"><span></span>'
        + '<p class="name"></p>'
        + '<p class="address-one"></p>'
        + '<p class="address-two"></p>'
        + '<p class="city"></p>'
        + '<p class="state"></p>'
        + '<p class="zipCode"></p>'
        + '<p class="countryCode"></p>'
        + '</div>'
        + '<div class="standardAddress"><span></span>'
        + '<p class="name"></p>'
        + '<p class="address-one"></p>'
        + '<p class="address-two"></p>'
        + '<p class="city"></p>'
        + '<p class="state"></p>'
        + '<p class="zipCode"></p>'
        + '<p class="countryCode"></p>'
        + '</div>'
        + '<div class="dav-buttons-div">'
        + '<button class="btn btn-primary btn-block useOrigAddress"></button>'
        + '<button class="btn btn-primary btn-block useAddress useStdAddress"></button>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '<div class="modal-backdrop"></div>'
        + '</div>';
    $('body').append(htmlString);

	modalClose();
}

function fillModalElement(verifyAddressUrl) {
    $.spinner().start();
    var params = {
    	firstName : $('#shippingFirstName').val(),
    	lastName : $('#shippingLastName').val(),
    	address1 : $('#shippingAddressOne').val(),
    	address2 : $('#shippingAddressTwo').val(),
    	city : $('#shippingAddressCity').val(),
    	state : $('#shippingState').val(),
    	zipCode : $('#shippingZipCode').val(),
    	countryCode : $('#shippingCountry').val(),
    	modalHeader : $('.DAVModalResourceStrings').attr('data-modalheader'),
    	originalAddress : $('.DAVModalResourceStrings').attr('data-originaladdress'),
    	useOriginalAddress : $('.DAVModalResourceStrings').attr('data-useoriginaladdress'),
    	standardAddress : $('.DAVModalResourceStrings').attr('data-standardaddress'),
    	useStandardAddress : $('.DAVModalResourceStrings').attr('data-usestandardaddress'),
    	addressNotVerified : $('.DAVModalResourceStrings').attr('data-addressnotverified'),
    	continueWithAddress : $('.DAVModalResourceStrings').attr('data-continuewithaddress')
    }
    $.ajax({
        url: verifyAddressUrl,
        method: 'GET',
        dataType: 'json',
        data: params,
        success: function (data) {
        	if(!$('.submit-shipping').hasClass('moveToPayment')){
        		$('#deliveryAddressVerificationModal').addClass('show');       
        		$('#deliveryAddressVerificationModal .modal-content .dav-modal-title').text(params.modalHeader);
        		$('#deliveryAddressVerificationModal .modal-body .originalAddress span').text(params.originalAddress);
        		$('#deliveryAddressVerificationModal .modal-body .useOrigAddress').text(params.useOriginalAddress);
        		$('#deliveryAddressVerificationModal .modal-body .standardAddress span').text(params.standardAddress);
        		$('#deliveryAddressVerificationModal .modal-body .useStdAddress').text(params.useStandardAddress);
        	}
        	$.spinner().stop();
            if(data.error == true){
            	$('#deliveryAddressVerificationModal .modal-body').empty().append('<p><p>').text(data.errorMsg);            	
            }
            else{
            	if(data.serviceResponse.decision == "ACCEPT"){
            		var davmodalOriginalAdd = $('#deliveryAddressVerificationModal .originalAddress');
                    $(davmodalOriginalAdd).find('p.name').text(params.firstName+' '+params.lastName);
                    $(davmodalOriginalAdd).find('p.address-one').text(params.address1);
                    $(davmodalOriginalAdd).find('p.address-two').text(params.address2);
                    $(davmodalOriginalAdd).find('p.city').text(params.city);
                    $(davmodalOriginalAdd).find('p.state').text(params.state);
                    $(davmodalOriginalAdd).find('p.countryCode').text(params.countryCode);
                    $(davmodalOriginalAdd).find('p.zipCode').text(params.zipCode);
                    var davmodalStandardAdd = $('#deliveryAddressVerificationModal .standardAddress');
                    $(davmodalStandardAdd).find('p.name').text(params.firstName+' '+params.lastName);
                    $(davmodalStandardAdd).find('p.address-one').text(data.serviceResponse.standardizedAddress1);
                    $(davmodalStandardAdd).find('p.address-two').text(data.serviceResponse.standardizedAddress2);
                    $(davmodalStandardAdd).find('p.city').text(data.serviceResponse.standardizedCity);
                    $(davmodalStandardAdd).find('p.state').text(data.serviceResponse.standardizedState);
                    $(davmodalStandardAdd).find('p.countryCode').text(data.serviceResponse.standardizedCountry);
                    $(davmodalStandardAdd).find('p.zipCode').text(data.serviceResponse.standardizedPostalCode);
                }
            	else{
            		$('#deliveryAddressVerificationModal .modal-body').empty().append('<p><p>').text(params.addressNotVerified+' '+data.serviceResponse.reasonMessage);
            		if(data.onFailure == "APPROVE"){
            	    	$('#deliveryAddressVerificationModal .modal-body').append('<button class="btn btn-primary btn-block useOrigAddress continueWithThisAddress">'+params.continueWithAddress+'</button>');
            		}
                }            	
            }
            var enteredStdAddress = false;
        	if(data.serviceResponse && (params.address1 == data.serviceResponse.standardizedAddress1) && 
        			(params.city == data.serviceResponse.standardizedCity) && 
        			(params.state == data.serviceResponse.standardizedState) && 
        			(params.zipCode == data.serviceResponse.standardizedPostalCode) &&
        			(params.countryCode == data.serviceResponse.standardizedCountry)){
        		enteredStdAddress = true;  
        		moveToBilling();
        	}            
            $('#deliveryAddressVerificationModal').find('.useOrigAddress').on('click',function(){
        		moveToBilling();
        	});	
        	$('#deliveryAddressVerificationModal').find('.useStdAddress').on('click',function(){
        		$('#shippingAddressOne').val(data.serviceResponse.standardizedAddress1);
        		$('#shippingAddressTwo').val(data.serviceResponse.standardizedAddress2);
        		$('#shippingAddressCity').val(data.serviceResponse.standardizedCity);
        		$('#shippingState').val(data.serviceResponse.standardizedState); 
        		$('#shippingZipCode').val(data.serviceResponse.standardizedPostalCode);
        		$('#shippingCountry').val(data.serviceResponse.standardizedCountry);
        		moveToBilling();
        	});
        },
        error: function () {
            $.spinner().stop();
        }
    });
}

function moveToBilling(){
	var submitShippingBtn = $('#checkout-main').find('.submit-shipping');
	$(submitShippingBtn).addClass('moveToPayment');
	$(submitShippingBtn).closest('.row').children().addClass('next-step-button');	
	$(submitShippingBtn).click();
	$('#deliveryAddressVerificationModal').remove();
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').css('padding','0');
}

function modalClose(){
	$('#deliveryAddressVerificationModal .modal-header .close').on('click',function(e){
		e.preventDefault();
		$('#deliveryAddressVerificationModal').remove();
	});	
}

$('#checkout-main').find('.submit-shipping').on('click',function(e){	
		  var enableDAV = $(this).attr("data-dav");
		  if(enableDAV == "YES" && !($(this).hasClass('moveToPayment'))){
			    $(this).closest('.row').find('.next-step-button').removeClass('next-step-button'); 
				var verifyAddressUrl = $(this).attr('data-url');
				$(e.target).trigger('submit-shipping:show');
				getModalHtmlElement();
				fillModalElement(verifyAddressUrl);   
		    }  
	});	

$('#checkout-main .shipping-summary').find('span.edit-button').on('click',function(){
		$('#checkout-main').find('.submit-shipping').removeClass('moveToPayment');	 
});

$('.payment-summary .edit-button').on('click', function () {	
	var submitPaymentBtn = $('#checkout-main').find('.submit-payment');
	$(submitPaymentBtn).closest('.row').children().addClass('next-step-button');	
});

