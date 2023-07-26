'use strict';

var processInclude = require('base/util');
var formValidation = require('base/components/formValidation');
var cleave = require('base/components/cleave');

$(document).ready(function () {
    processInclude(require('./paymentInstruments/paymentInstruments'));
    if ($('#CsTokenizationEnable').val() === 'YES' && $('#isCartridgeEnabled').val() === 'true') {
        $('.save-payment').on('click', function (e) {
            var $form = $('form.payment-form');
            e.preventDefault();
            var url = $('form.payment-form').attr('action');
            $('.invalid-feedback').hide();
            $('form.payment-form').trigger('payment:submit', e);
            var formData = cleave.serializeData($form);
            if (($('#flex-response').val() !== '' && $('#flex-response').val() !== undefined)) {
                $form.spinner().start();
                $.ajax({
                    url: url,
                    type: 'post',
                    dataType: 'json',
                    data: formData,
                    success: function (data) {
                        if (!data.success) {
                            $form.spinner().stop();
                            formValidation($form, data);
                        } else {
                            location.href = data.redirectUrl; // eslint-disable-line no-undef,no-restricted-globals
                        }
                    },
                    error: function (err) {
                        if (err.responseJSON.redirectUrl) {
                            window.location.href = err.responseJSON.redirectUrl;
                        }
                        $form.spinner().stop();
                    }
                });
            }
            return false;
        });
    }
});