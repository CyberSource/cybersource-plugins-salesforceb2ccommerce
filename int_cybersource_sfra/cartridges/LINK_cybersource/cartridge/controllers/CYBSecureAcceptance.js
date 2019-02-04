'use strict';

var server = require('server');

/*
 *Controller that handles the Cybersource Secure Acceptance Processing
*/

/* API Includes */
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var Resource = require('dw/web/Resource');

/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
server.get('OpenIframe', function (req, res, next) {
    var secureAcceptanceAdapter = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter');
    var response = secureAcceptanceAdapter.OpenIframe(session.privacy.order_id);

    if (response.success) {
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
	 res.redirect(require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter').SilentPostResponse());
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
	var result = Flex.CreateFlexKey();
	res.render('checkout/billing/paymentOptions/secureAcceptanceFlexMicroformContent',{
		result:result
    });	
	next();
});

/**
 * This method creates signature and payment instrument for flex and request is send to create the token with all data in hidden fields
 */
server.post('GetRequestDataForFlexMicroForm', function (req, res, next) {
	 var result = {},
	 errorMsg,
	 flex = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/Flex');
	 if(!request.httpParameterMap.cctoken.value){
		 var flexToken = request.httpParameterMap.flexToken;
		 var flexTokenKey = JSON.parse(request.httpParameterMap.flextokenResponse);
		 var publicKey = flexTokenKey.der.publicKey;
	 }
	 secureAcceptanceAdapter = require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter');
	 if (request.httpHeaders.get("x-requested-with").equals("XMLHttpRequest")) {
		 var BasketMgr = require('dw/order/BasketMgr');
		 var cart = BasketMgr.getCurrentBasket();
			if (cart) {
				var response = secureAcceptanceAdapter.GetRequestDataForFlexMicroForm(cart, req);
				if(response.success){
					res.render(response.nextStep, {
			            requestData: response.data,
			            cardObject:response.cardObject,
			            formAction: response.formAction
			        });
				} else{
					res.render('common/errorjson', {
						ERRORCODE:response.errorMsg
			        });
				}
			}
		}
		else{
			res.render('common/errorjson', {
				ERRORCODE:response.errorMsg
	        });	
		}
	 next();
});

/**
 * This method receive response from the third party in http Parameter map, verify the signature , update the payment instrument with card value received, go to place order.
 */
server.post('FlexMicroformResponse', server.middleware.https, function (req, res, next) {
	 var BasketMgr = require('dw/order/BasketMgr');
	 var cart = BasketMgr.getCurrentBasket();
	 res.redirect(require(CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/adapter/SecureAcceptanceAdapter').FlexMicroformResponse(cart));
	 next();
});

/*
 * Module exports
 */
module.exports = server.exports();