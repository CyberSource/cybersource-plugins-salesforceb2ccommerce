'use strict';

var formValidation = require('base/components/formValidation');
var base = require('base/paymentInstruments/paymentInstruments');
var cleave = require('../components/cleave');

var url;

base.removePayment = function () {
    $('.remove-payment').on('click', function (e) {
        e.preventDefault();
        url = $(this).data('url') + '?UUID=' + $(this).data('id');
        $('.payment-to-remove').empty().append($(this).data('card'));

        $('.delete-confirmation-btn').unbind('click').click(function (f) {
            f.preventDefault();
            $('.remove-payment').trigger('payment:remove', f);
            $.ajax({
                url: url,
                type: 'get',
                dataType: 'json',
                success: function (data) {
                    $('#uuid-' + data.UUID).remove();
                    if (data.message) {
                        var toInsert = '<div><h3>' +
                            data.message +
                            '</h3><div>';
                        $('.paymentInstruments').html(toInsert);
                    }
                },
                error: function (err) {
                    if (err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                    $.spinner().stop();
                }
            });
        });
    });
};

base.submitPayment = function () {
    $('form.payment-form').submit(function (e) {
        var $form = $(this);
        e.preventDefault();
        url = $form.attr('action');
        $form.spinner().start();
        $('form.payment-form').trigger('payment:submit', e);

        var formData = cleave.serializeData($form);

        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: formData,
            success: function (data) {
                $form.spinner().stop();
                if (!data.success) {
                    formValidation($form, data);
                    if (data.message) {
                        var toInsert = '<div><h3>' +
                            data.message +
                            '</h3><div>';
                        $('.paymentInstruments').html(toInsert);
                    }
                } else {
                    location.href = data.redirectUrl;
                }
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                }
                $form.spinner().stop();
            }
        });
        return false;
    });
};

module.exports = base;
