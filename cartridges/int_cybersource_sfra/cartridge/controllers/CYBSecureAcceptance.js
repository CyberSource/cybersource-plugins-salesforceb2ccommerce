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
var secureResponseHelper = require('*/cartridge/scripts/helpers/secureResponseHelper');
var secureRender = secureResponseHelper.secureRender;
var secureJsonResponse = secureResponseHelper.secureJsonResponse;
/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
server.get('OpenIframe', function (req, res, next) {
    var secureAcceptanceAdapter = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter');
    var response = secureAcceptanceAdapter.OpenIframe(session.privacy.orderId);
    if (response.success) {
        res.CONTENT_SECURITY_POLICY = "default-src 'self'";
        secureRender(res, 'services/secureAcceptanceIframeRequestForm', {
            requestData: response.data,
            formAction: response.formAction
        });
    } else {
        secureRender(res, '/error', {
            message: Resource.msg('subheading.error.general', 'error', null)
        });
    }
    next();
});

/**
 * This method receive response from the third party in http Parameter map, verify the signature , update the payment instrument with card value received, go to place order.
 */
server.post('SilentPostResponse', server.middleware.https, function (req, res, next) {
    var result = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter').SilentPostResponse();

    if (result && result.checkPayerAuth === true) {
        var CardHelper = require('*/cartridge/scripts/helper/CardHelper');
        var creditCardType;
        creditCardType = result.order.paymentInstrument.creditCardType;
        
        // Check if Payer Auth is enabled for the credit card type
        var cardResult = CardHelper.PayerAuthEnable(creditCardType);
        if (cardResult.error) {
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'payerAuthError', Resource.msg('error.technical', 'checkout', null)));
            return next();
        }

        if (cardResult.paEnabled) {
            secureRender(res, 'payerauthentication/3dsRedirect', {
                action: URLUtils.url('CheckoutServices-PayerAuthSetup'),
                OrderNo: result.order.orderNo,
            });
            return next();
        } else {
            secureRender(res, 'payerauthentication/3dsRedirect', {
                action: URLUtils.url('CheckoutServices-SilentPostAuthorize'),
                OrderNo: result.order.orderNo,
            });
            return next();
        }
    } else {
        res.redirect(result);
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
            secureRender(res, 'common/http_404');
        }
    } else {
        secureRender(res, 'common/http_200');
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
        if (clientLibraryIntegrity && clientLibrary) {
            secureRender(res, 'checkout/billing/paymentOptions/secureAcceptanceFlexMicroformContent', {
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
    secureJsonResponse(res, {
        success: true
    });
    next();
});
/*
 * Module exports
 */
module.exports = server.exports();
