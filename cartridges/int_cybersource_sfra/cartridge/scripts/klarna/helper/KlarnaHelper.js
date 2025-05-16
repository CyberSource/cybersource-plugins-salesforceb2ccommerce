'use strict';

var Transaction = require('dw/system/Transaction');

/**
 * function
 * @param {*} basket basket
 */
function updateBillingAddress(basket) {
    var address1 = session.forms.billing.addressFields.address1.value;
    var address2 = session.forms.billing.addressFields.address2.value;
    var city = session.forms.billing.addressFields.city.value;
    var country = session.forms.billing.addressFields.country.value;
    var firstName = session.forms.billing.addressFields.firstName.value;
    var lastName = session.forms.billing.addressFields.lastName.value;
    var phone = session.forms.billing.addressFields.phone.value;
    var postalCode = session.forms.billing.addressFields.postalCode.value;
    var state = session.forms.billing.addressFields.states.stateCode.value;
    var email = session.forms.billing.klarnaEmail.value;

    Transaction.wrap(function () {
        var billingAddress = basket.billingAddress;
        if (!billingAddress) {
            billingAddress = basket.createBillingAddress();
        }
        billingAddress.setFirstName(firstName);
        billingAddress.setLastName(lastName);
        billingAddress.setAddress1(address1);
        billingAddress.setAddress2(address2);
        billingAddress.setCity(city);
        billingAddress.setPostalCode(postalCode);
        billingAddress.setStateCode(state);
        billingAddress.setCountryCode(country);
        billingAddress.setPhone(phone);
        basket.setCustomerEmail(email);
    });
}

module.exports = {
    updateBillingAddress: updateBillingAddress
}