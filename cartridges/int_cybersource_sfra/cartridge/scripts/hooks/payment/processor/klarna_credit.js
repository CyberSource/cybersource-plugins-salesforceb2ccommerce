'use strict';

var klarnaAdaptor = require('~/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');

/**
* Current implementation simply creates a payment method and returns 'success'.
*/
exports.Handle = function (basket, paymentInformation) {

	session.privacy.klarnaAuthToken = request.httpParameterMap.klarnaAuthToken.value;
    var response = klarnaAdaptor.HandleRequest(basket, true);
    return response;
};

/**
 * Authorizes a payment using a Klarna.
 */
exports.Authorize = function (orderNumber, paymentInstrument, paymentProcessor) {

        //  Get the token from parameter map.
    var token = session.privacy.klarnaAuthToken;

        //  Call method to handle the request
    var response = klarnaAdaptor.AuthorizeRequest(orderNumber, paymentInstrument, token);
    return response;
};