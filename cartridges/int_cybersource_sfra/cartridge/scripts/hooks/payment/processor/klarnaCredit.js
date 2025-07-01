'use strict';

var klarnaAdaptor = require('*/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');

/**
* Current implementation simply creates a payment method and returns 'success'.
*/
// eslint-disable-next-line
exports.Handle = function (basket, paymentInformation, paymentMethod) {
    // eslint-disable-next-line
    var response = klarnaAdaptor.HandleRequest(basket, true, paymentMethod);
    return response;
};

/**
 * Authorizes a payment using a Klarna.
 */
// eslint-disable-next-line
exports.Authorize = function (orderNumber, paymentInstrument, paymentProcessor) {
    //  Get the token from parameter map.
    // eslint-disable-next-line
    var token = session.privacy.KlarnaPaymentsAuthorizationToken;

    //  Call method to handle the request
    var response = klarnaAdaptor.AuthorizeRequest(orderNumber, paymentInstrument, token);
    return response;
};
