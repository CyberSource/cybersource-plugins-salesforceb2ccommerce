'use strict';

var Cleave = require('cleave.js');
var base = require('base/components/cleave');

base.handleCreditCardNumber = function (cardFieldSelector, cardTypeSelector) {
    var cleave = new Cleave(cardFieldSelector, {
        creditCard: true,
        onCreditCardTypeChanged: function (type) {
            window.ccType = type;
            var creditCardTypes = {
                visa: 'Visa',
                mastercard: 'MasterCard',
                amex: 'Amex',
                discover: 'Discover',
                maestro: 'Maestro',
                unknown: 'Unknown'
            };

            var cardType = creditCardTypes[Object.keys(creditCardTypes).indexOf(type) > -1
                ? type
                : 'unknown'];
            $(cardTypeSelector).val(cardType);
            $('.card-number-wrapper').attr('data-type', type);
            if (type === 'visa' || type === 'mastercard' || type === 'discover') {
                $('#securityCode').attr('maxlength', 3);
            } else {
                $('#securityCode').attr('maxlength', 4);
            }
        }
    });
    if ($('li[data-method-id="CREDIT_CARD"]').attr('data-sa-type') != 'SA_FLEX') {
    	$(cardFieldSelector).data('cleave', cleave);
    }
};

base.serializeData =  function (form) {
    var serializedArray = form.serializeArray();

    serializedArray.forEach(function (item) {
        if (item.name.indexOf('cardNumber') > -1) {
        	if ($('li[data-method-id="CREDIT_CARD"]').attr('data-sa-type') != 'SA_FLEX') {
        		item.value = $('#cardNumber').data('cleave').getRawValue(); // eslint-disable-line
        	}
        }
    });

    return $.param(serializedArray);
};

module.exports = base;
