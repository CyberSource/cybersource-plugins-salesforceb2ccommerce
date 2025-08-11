'use strict';

/* eslint-disable no-undef */
var server = require('server');

/*
 *Controller that handles the Cybersource Secure Acceptance Processing
*/

/* API Includes */
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
server.get('OpenIframe', function (req, res, next) {
    var secureAcceptanceAdapter = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter');
    var response = secureAcceptanceAdapter.OpenIframe(session.privacy.orderId);

    if (response.success) {
        res.CONTENT_SECURITY_POLICY = "default-src 'self'";
        res.render('services/secureAcceptanceIframeRequestForm', {
            requestData: response.data,
            formAction: response.formAction
        });
    } else {
        res.render('/error', {
            message: Resource.msg('subheading.error.general', 'error', null)
        });
    }
    next();
});

/**
 * This method receive response from the third party in http Parameter map, verify the signature , update the payment instrument with card value received, go to place order.
 */
server.post('SilentPostResponse', server.middleware.https, function (req, res, next) {
    var redirectUrl = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter').SilentPostResponse();
    
    // Check if this is the 3DS redirect URL
    if (redirectUrl && redirectUrl.toString().indexOf('COPlaceOrder-PayerAuth') !== -1) {
        res.render('payerauthentication/3dsRedirect', {
            action: URLUtils.url('COPlaceOrder-PayerAuth')
        });
    } else {
        res.redirect(redirectUrl);
    }
    next();
});

/**
* Merchant POST URL Configure response save in custom object
*/
server.get('MerchantPost', server.middleware.https, function (req, res, next) {
    var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
    if (secureAcceptanceHelper.validateSAMerchantPostRequest(request.httpParameterMap)) {
        if (!secureAcceptanceHelper.saveSAMerchantPostRequest(request.httpParameterMap)) {
            res.render('common/http_404');
        }
    } else {
        res.render('common/http_200');
    }
    next();
});

/**
* This method is used to create flex token
*/
server.get('CreateFlexToken', server.middleware.https, function (req, res, next) {
    var Flex = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/Flex');
    var flexResult = Flex.CreateFlexKey();
    var parsedPayload = Flex.jwtDecode(flexResult);
    if (parsedPayload != null) {
        var clientLibrary = parsedPayload.ctx[0].data.clientLibrary;
        var clientLibraryIntegrity = parsedPayload.ctx[0].data.clientLibraryIntegrity;
        if(clientLibraryIntegrity && clientLibrary){
            res.render('checkout/billing/paymentOptions/secureAcceptanceFlexMicroformContent', {
                flexTokenResult: flexResult,
                clientLibrary: clientLibrary,
                clientLibraryIntegrity: clientLibraryIntegrity
            });
        }
        next();
    }
});

server.get('ReCreateBasket', server.middleware.https, function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var order = OrderMgr.getOrder(session.privacy.orderId);
    COHelpers.reCreateBasket(order);
    res.json({
        success: true
    });
    next();
});
/*
 * Module exports
 */
module.exports = server.exports();
