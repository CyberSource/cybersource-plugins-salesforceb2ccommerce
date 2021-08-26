'use strict';

var crypto = require('crypto');

/**
 * function
 */
function moveToBilling() {
    var submitShippingBtn = $('#checkout-main').find('.submit-shipping');
    $(submitShippingBtn).addClass('moveToPayment');
    $(submitShippingBtn).closest('.row').children().addClass('next-step-button');
    $(submitShippingBtn).click();
    $('#deliveryAddressVerificationModal').remove();
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').css('padding', '0');
}

/**
 * function
 */
function modalClose() {
    $('#deliveryAddressVerificationModal .modal-header .close').on('click', function (e) {
        e.preventDefault();
        $('#deliveryAddressVerificationModal').remove();
    });
}

/**
 * function
 */
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

/**
 * function
 * @param {*} verifyAddressUrl verifyAddressUrl
 */
function fillModalElement(verifyAddressUrl) {
    $.spinner().start();
    var params = {
        firstName: $('[id^=shippingFirstName]').val(),
        lastName: $('[id^=shippingLastName]').val(),
        address1: $('[id^=shippingAddressOne]').val(),
        address2: $('[id^=shippingAddressTwo]').val(),
        city: $('[id^=shippingAddressCity]').val(),
        state: $('[id^=shippingState]').val(),
        zipCode: $('[id^=shippingZipCode]').val(),
        countryCode: $('[id^=shippingCountry]').val(),
        modalHeader: $('.DAVModalResourceStrings').attr('data-modalheader'),
        originalAddress: $('.DAVModalResourceStrings').attr('data-originaladdress'),
        useOriginalAddress: $('.DAVModalResourceStrings').attr('data-useoriginaladdress'),
        standardAddress: $('.DAVModalResourceStrings').attr('data-standardaddress'),
        useStandardAddress: $('.DAVModalResourceStrings').attr('data-usestandardaddress'),
        addressNotVerified: $('.DAVModalResourceStrings').attr('data-addressnotverified'),
        continueWithAddress: $('.DAVModalResourceStrings').attr('data-continuewithaddress')
    };

    // var algorithm = 'aes-256-cbc';
    var key = crypto.randomBytes(32);
    var iv = crypto.randomBytes(16);

    /**
     * Function
     * @param {*} text text
     * @returns {*} obj
     */
    function encrypt(text) {
        var cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        var encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return {
            iv: iv.toString('base64'),
            encryptedData: encrypted.toString('base64'),
            key: key.toString('base64')
        };
    }
    $.ajax({
        url: verifyAddressUrl,
        method: 'GET',
        dataType: 'json',
        data: encrypt(JSON.stringify(params)),
        success: function (data) {
            if (!$('.submit-shipping').hasClass('moveToPayment')) {
                $('#deliveryAddressVerificationModal').addClass('show');
                $('#deliveryAddressVerificationModal .modal-content .dav-modal-title').text(params.modalHeader);
                $('#deliveryAddressVerificationModal .modal-body .originalAddress span').text(params.originalAddress);
                $('#deliveryAddressVerificationModal .modal-body .useOrigAddress').text(params.useOriginalAddress);
                $('#deliveryAddressVerificationModal .modal-body .standardAddress span').text(params.standardAddress);
                $('#deliveryAddressVerificationModal .modal-body .useStdAddress').text(params.useStandardAddress);
            }
            $.spinner().stop();
            if (data.error === true) {
                $('#deliveryAddressVerificationModal .modal-body').empty().append('<p><p>').text(data.errorMsg);
            } else if (data.serviceResponse.decision === 'ACCEPT') {
                var davmodalOriginalAdd = $('#deliveryAddressVerificationModal .originalAddress');
                $(davmodalOriginalAdd).find('p.name').text(params.firstName + ' ' + params.lastName);
                $(davmodalOriginalAdd).find('p.address-one').text(params.address1);
                $(davmodalOriginalAdd).find('p.address-two').text(params.address2);
                $(davmodalOriginalAdd).find('p.city').text(params.city);
                $(davmodalOriginalAdd).find('p.state').text(params.state);
                $(davmodalOriginalAdd).find('p.countryCode').text(params.countryCode);
                $(davmodalOriginalAdd).find('p.zipCode').text(params.zipCode);
                var davmodalStandardAdd = $('#deliveryAddressVerificationModal .standardAddress');
                $(davmodalStandardAdd).find('p.name').text(params.firstName + ' ' + params.lastName);
                $(davmodalStandardAdd).find('p.address-one').text(data.serviceResponse.standardizedAddress1);
                $(davmodalStandardAdd).find('p.address-two').text(data.serviceResponse.standardizedAddress2);
                $(davmodalStandardAdd).find('p.city').text(data.serviceResponse.standardizedCity);
                $(davmodalStandardAdd).find('p.state').text(data.serviceResponse.standardizedState);
                $(davmodalStandardAdd).find('p.countryCode').text(data.serviceResponse.standardizedCountry);
                $(davmodalStandardAdd).find('p.zipCode').text(data.serviceResponse.standardizedPostalCode);
            } else {
                $('#deliveryAddressVerificationModal .modal-body').empty().append('<p><p>').text(params.addressNotVerified + ' ' + data.serviceResponse.reasonMessage);
                if (data.onFailure === 'APPROVE') {
                    $('#deliveryAddressVerificationModal .modal-body').append('<button class="btn btn-primary btn-block useOrigAddress continueWithThisAddress">' + params.continueWithAddress + '</button>');
                }
            }
            // var enteredStdAddress = false;
            if (data.serviceResponse && (params.address1 === data.serviceResponse.standardizedAddress1)
                    && (params.city === data.serviceResponse.standardizedCity)
                    && (params.state === data.serviceResponse.standardizedState)
                    && (params.zipCode === data.serviceResponse.standardizedPostalCode)
                    && (params.countryCode === data.serviceResponse.standardizedCountry)) {
                // enteredStdAddress = true;
                moveToBilling();
            }
            $('#deliveryAddressVerificationModal').find('.useOrigAddress').on('click', function () {
                moveToBilling();
            });
            $('#deliveryAddressVerificationModal').find('.useStdAddress').on('click', function () {
                $('[id^=shippingAddressOne]').val(data.serviceResponse.standardizedAddress1);
                $('[id^=shippingAddressTwo]').val(data.serviceResponse.standardizedAddress2);
                $('[id^=shippingAddressCity]').val(data.serviceResponse.standardizedCity);
                $('[id^=shippingState]').val(data.serviceResponse.standardizedState);
                $('[id^=shippingZipCode]').val(data.serviceResponse.standardizedPostalCode);
                $('[id^=shippingCountry]').val(data.serviceResponse.standardizedCountry);
                moveToBilling();
            });
        },
        error: function () {
            $.spinner().stop();
        }
    });
}

/**
 * function
 */
function reCreateBasket() {
    var reCreateBasketUrl = $('.js-recreatebasketurl').val();
    if (reCreateBasketUrl != null && reCreateBasketUrl.length > 0) {
        $.ajax({
            url: reCreateBasketUrl,
            method: 'GET',
            success: function () {},
            error: function () {}
        });
        $('#secureAcceptanceIframe').empty();
    }
}

$('#checkout-main').find('.submit-shipping').on('click', function (e) {
    var enableDAV = $(this).attr('data-dav');
    if ($('#is_Cartridge_Enabled').length > 0 && document.getElementById('is_Cartridge_Enabled').value === 'true') {
        if (enableDAV === 'YES' && !($(this).hasClass('moveToPayment'))) {
            $(this).closest('.row').find('.next-step-button').removeClass('next-step-button');
            var verifyAddressUrl = $(this).attr('data-url');
            $(e.target).trigger('submit-shipping:show');
            getModalHtmlElement();
            fillModalElement(verifyAddressUrl);
        }
    }
});

$('#checkout-main .shipping-summary').find('span.edit-button').on('click', function () {
    $('#checkout-main').find('.submit-shipping').removeClass('moveToPayment');
    reCreateBasket();
});

$('.payment-summary .edit-button').on('click', function () {
    var submitPaymentBtn = $('#checkout-main').find('.submit-payment');
    $(submitPaymentBtn).closest('.row').children().addClass('next-step-button');
    reCreateBasket();
});
