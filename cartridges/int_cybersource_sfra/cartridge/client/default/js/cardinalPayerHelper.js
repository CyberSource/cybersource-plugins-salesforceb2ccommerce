'use strict';

/* eslint-disable no-undef */
// eslint-disable-next-line
window.jQuery = window.$ = require('jquery');

$(document).ready(function () {
    Cardinal.configure({
        logging: {
            level: 'on'
        },
        timeout: 4000,
        maxRequestRetries: 2
    });

    var acsUrl = document.getElementById('AcsURL').value;
    var payload = document.getElementById('PaReq').value;

    var orderObject = JSON.parse(document.getElementById('order').value);

    var continueObject = {
        AcsUrl: acsUrl,
        Payload: payload
    };

    var jwt = document.getElementById('JWT').value;
    Cardinal.setup('init', {
        jwt: document.getElementById('JWT').value,
        order: orderObject
    });

    // eslint-disable-next-line
    Cardinal.on('payments.validated', function (data, jwt) {
        document.getElementById('processorTransactionId').value = data.Payment.ProcessorTransactionId;
        document.RedirectForm.submit();
    });

    // eslint-disable-next-line
    Cardinal.on('payments.setupComplete', function (setupCompleteData) {
        Cardinal.continue('cca', continueObject, orderObject, jwt);
    });
});
