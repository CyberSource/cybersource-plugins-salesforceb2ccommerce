'use strict';

/*
 *Controller that handles the Cybersource Secure Acceptance Processing
*/

/* API Includes */
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var guard = require(CybersourceConstants.GUARD);
var app = require(CybersourceConstants.APP);

/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
function OpenIframe()
{
	var secureAcceptanceAdapter = require(CybersourceConstants.CS_CORE_SCRIPT+'secureacceptance/adapter/SecureAcceptanceAdapter');
	var response = secureAcceptanceAdapter.OpenIframe(session.privacy.order_id);
	if (response.success) {
		app.getView({requestData:response.data, formAction:response.formAction}).render('services/secureAcceptanceIframeRequestForm');
		return;
	} else{
		app.getView().render('util/pt_empty');
	}
}

/**
 * This method creates signature and payment instrument for silent post and request is send to create the token with all data in hidden fields
 */
function GetRequestDataForSilentPost() {
	var result = {},
		errorMsg,
		secureAcceptanceAdapter = require(CybersourceConstants.CS_CORE_SCRIPT+'secureacceptance/adapter/SecureAcceptanceAdapter');
	if (request.httpHeaders.get("x-requested-with").equals("XMLHttpRequest")) {
		var cart = app.getModel('Cart').get();
		if (cart) {
			var response = secureAcceptanceAdapter.GetRequestDataForSilentPost(cart.object);
			if(response.success){
				app.getView({requestData:response.data,formAction:response.formAction}).render(response.nextStep);
			} else{
				errorMsg = response.errorMsg;
				app.getView({ERRORCODE:errorMsg}).render('common/errorjson');
			}
		}
	}
	else{
		app.getView({ERRORCODE:errorMsg}).render('common/errorjson');
	}
	
 }

/**
 * This method receive response from the third party in http Parameter map, verify the signature , update the payment instrument with card value received, go to place order.
 */
function SilentPostResponse() {
	response.redirect(require(CybersourceConstants.CS_CORE_SCRIPT+'secureacceptance/adapter/SecureAcceptanceAdapter').SilentPostResponse(app.getModel('Cart').get().object));
}

/**
* Merchant POST URL Configure response save in custom object
*/
function MerchantPost(args)
{
	var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
    if (secureAcceptanceHelper.validateSAMerchantPostRequest(request.httpParameterMap)) {
		if (!secureAcceptanceHelper.saveSAMerchantPostRequest(request.httpParameterMap)) {
			app.getView().render('common/http_404');
			return;
		}
    }
   app.getView().render('common/http_200');
}

/*
 * Module exports
 */
exports.OpenIframe=guard.ensure(['https'], OpenIframe);
exports.GetRequestDataForSilentPost=guard.ensure(['https', 'post'], GetRequestDataForSilentPost);
exports.SilentPostResponse=guard.ensure(['https'], SilentPostResponse);
exports.MerchantPost=guard.ensure(['https', 'post'], MerchantPost);