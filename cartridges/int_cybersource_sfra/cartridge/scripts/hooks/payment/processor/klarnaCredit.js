'use strict';

var klarnaAdaptor = require('~/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');

/**
* Current implementation simply creates a payment method and returns 'success'.
*/
// eslint-disable-next-line
exports.Handle = function (basket, paymentInformation) {
    // eslint-disable-next-line
    session.privacy.klarnaAuthToken = request.httpParameterMap.klarnaAuthToken.value;
    var response = klarnaAdaptor.HandleRequest(basket, true);
    return response;
};

/**
 * Authorizes a payment using a Klarna.
 */
// eslint-disable-next-line
exports.Authorize = function (orderNumber, paymentInstrument, paymentProcessor) {
    //  Get the token from parameter map.
    // eslint-disable-next-line
    var token = session.privacy.klarnaAuthToken;

    //  Call method to handle the request
    var response = klarnaAdaptor.AuthorizeRequest(orderNumber, paymentInstrument, token);
    return response;
};
