'use strict';

/**
 * function
 */
function requestSession(isCheckoutPage) {
    var endpoint = window.klarnaVariables.createSessionEndpoint;
    if (isCheckoutPage)
        $.spinner().start();
    $.ajax({
        url: endpoint,
        method: 'POST',
        data: null,
        success: function (data) {
            if (isCheckoutPage)
                $.spinner().stop();
            if (data.reasonCode !== 100 || data.decision === 'REJECT') {
                console.log("Error creating klarna session: ", data);
                $('#klarna-error-message').show();
                $('#klarna-submit-paymentButton').hide();
            } else {
                if (data.sessionToken) {
                    window.klarnaVariables.klarnaClientToken = data.sessionToken;
                    if (isCheckoutPage === false) {
                        klarnaAsyncCallback(data.sessionToken);
                    }
                    else {
                        $('#klarna-submit-paymentButton').show();
                        Klarna.paymentStage($.Deferred());
                    }
                }
            }
        },
        // eslint-disable-next-line
        error: function (err) {
            if (isCheckoutPage){
                $('#klarna-error-message').show();
                $.spinner().stop();
            }
            console.log("Error creating klarna session: ", err);
        }
    });
}


$(function () {
    $('#klarna-error-message').hide();

    var $klarnaTab = $('#klarna-tab-checkout');
    if ($klarnaTab.length !== 0) {

        $klarnaTab.on('click', function (event) {
            $('#klarna-error-message').hide();
            handleKlarna(true); // isCheckoutPage = true
        });
    }

    var $divElement = $('#checkout-actions');
    if ($divElement.length !== 0) {
        handleKlarna(false); // isCheckoutPage = false
    }

});
function handleKlarna(isCheckoutPage) {
    window.miniCartButtonLoaded = false;

    if (isSessionExists()) {
        klarnaAsyncCallback(window.klarnaVariables.klarnaClientToken);
    }
    else {
        requestSession(isCheckoutPage); //isCheckoutPage = false
    }
}

function isSessionExists() {
    if (typeof window.klarnaVariables.klarnaClientToken !== 'undefined' && window.klarnaVariables.klarnaClientToken !== "null") {
        return true;
    }
    else {
        return false;
    }
}
function klarnaAsyncCallback(sessionToken) {
    var klarnaExpressCheckoutMC = document.querySelector('#klarnaExpressCheckoutMC');
    var klarnaExpressCheckoutCart = document.querySelector('#klarnaExpressCheckoutCart');

    sessionToken = window.klarnaVariables.klarnaClientToken;
    if (klarnaExpressCheckoutMC && window.miniCartButtonLoaded !== true && isSessionExists()) {
        initKlarnaExpressButton('#klarnaExpressCheckoutMC', sessionToken);
    }
    if (klarnaExpressCheckoutCart && window.cartButtonLoaded !== true && isSessionExists()) {
        initKlarnaExpressButton('#klarnaExpressCheckoutCart', sessionToken);
    }
};


function initKlarnaExpressButton(containerId, sessionToken) {

    window.Klarna.Payments.Buttons.init({
        client_token: sessionToken
    }).load({
        container: containerId,
        locale: window.klarnaVariables.currentLocale,
        on_click: (authorize) => {
            authorize(
                { collect_shipping_address: true, auto_finalize: false },
                null,
                (result) => {
                    if (result.approved) {
                        $.ajax({
                            url: window.klarnaVariables.handleExpressCheckoutAuth,
                            type: 'post',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify(result),
                            success: function (data) {
                                if (data.redirectUrl) {
                                    window.location.href = data.redirectUrl;
                                }
                            }
                        });
                    } else {
                        console.log("Klarna error: ", result);
                    }
                },
            );
        },
    },
        function load_callback(loadResult) {
            if (containerId === '#klarnaExpressCheckoutMC')
                window.miniCartButtonLoaded = true;
            else if (containerId === '#klarnaExpressCheckoutCart')
                window.cartButtonLoaded = true;

            console.log('Klarna widget loaded:', loadResult);
        });
}
