'use strict';

var base = require('base/checkout/shipping');
var formHelpers = require('base/checkout/formErrors');

base.methods.shippingFormResponse = function(defer, data) {
    var isMultiShip = $('#checkout-main').hasClass('multi-ship');
    var formSelector = isMultiShip
        ? '.multi-shipping .active form'
        : '.single-shipping form';

    // highlight fields with errors
    if (data.error) {
        if (data.fieldErrors.length) {
            data.fieldErrors.forEach(function (error) {
                if (Object.keys(error).length) {
                    formHelpers.loadFormErrors(formSelector, error);
                }
            });
            defer.reject(data);
        }

        if (data.cartError) {
            window.location.href = data.redirectUrl;
            defer.reject();
        }
    } else {
        // Populate the Address Summary
        $('body').trigger('checkout:updateCheckoutView',
            { order: data.order, customer: data.customer, options:data.options });

        defer.resolve(data);
    }
}

base.editShippingSummary = function(){
	$('.shipping-summary .edit-button').on('click',function(){            
        $('#checkout-main[data-checkout-stage = "shipping"]').find('button.submit-payment').attr('id','showSubmitPayment');
	}); 
};



module.exports = base;