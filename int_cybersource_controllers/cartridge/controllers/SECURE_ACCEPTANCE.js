'use strict';
/**
 * Secure Acceptance controller contains all method related to this type of payment instrument (SilentPost,Redirect and Iframe)
 * @module controllers/SECURE_ACCEPTANCE
 */

/* API Includes */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');	
var app = require('app_storefront_controllers/cartridge/scripts/app');

/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
function OpenIframe()
{
	var saRequest = null;
	var orderNo = session.privacy.order_id;
	if (!empty(orderNo)) {
		var OrderMgr = require('dw/order/OrderMgr');
		var order = OrderMgr.getOrder(orderNo);
		var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
		var paymentInstrument = secureAcceptanceHelper.GetPaymemtInstument(order);
		var cardUUID = session.forms.billing.paymentMethods.creditCard.selectedCardID.value;
	
		if (null != order && null != paymentInstrument) {
			var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
			var subscriptionToken = CommonHelper.GetSubscriptionToken( cardUUID, customer);
			saRequest = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,order,null,subscriptionToken);
			if (saRequest.success && saRequest.requestData != null) {
				var data = saRequest.requestData;
			 	var formAction = saRequest.formAction;
		 		app.getView({requestData:data, formAction:formAction}).render('services/secureAcceptanceIframeRequestForm');
		 		return;
			}
		}
	}
	app.getView().render('util/pt_empty');
}





/**
 * This method creates signature and payment instrument for silent post and request is send to create the token with all data in hidden fields
 */
function GetRequestDataForSilentPost() {
	var result = {};
	if (request.httpHeaders.get("x-requested-with").equals("XMLHttpRequest")) {
	var cart = app.getModel('Cart').get();
	if (cart) {
		var httpParameterMap = request.httpParameterMap;
		var Resource = require('dw/web/Resource');
		if (null != httpParameterMap) {
			session.forms.billing.billingAddress.email.emailAddress.value =  httpParameterMap.custemail.stringValue;
			if (!empty(httpParameterMap.savecc.stringValue) && httpParameterMap.savecc.stringValue=="true") {
				session.forms.billing.paymentMethods.creditCard.saveCard.value = true;
			} else {
				session.forms.billing.paymentMethods.creditCard.saveCard.value = false;
			}
			session.forms.billing.billingAddress.addressFields.firstName.value = httpParameterMap.firstname.stringValue;
			session.forms.billing.billingAddress.addressFields.lastName.value = httpParameterMap.lastname.stringValue;
			session.forms.billing.billingAddress.addressFields.address1.value =  httpParameterMap.address1.stringValue;
			session.forms.billing.billingAddress.addressFields.address2.value = httpParameterMap.address2.stringValue;
			session.forms.billing.billingAddress.addressFields.city.value = httpParameterMap.city.stringValue;
			session.forms.billing.billingAddress.addressFields.postal.value = httpParameterMap.zipcode.stringValue;
			session.forms.billing.billingAddress.addressFields.country.value = httpParameterMap.country.stringValue;
			session.forms.billing.billingAddress.addressFields.states.state.value = httpParameterMap.state.stringValue;
			session.forms.billing.billingAddress.addressFields.phone.value = httpParameterMap.phone.stringValue;
			if (!empty(httpParameterMap.cctoken.stringValue)) {
			session.forms.billing.paymentMethods.creditCard.selectedCardID.value = httpParameterMap.cctoken.stringValue;
			} else {
				session.forms.billing.paymentMethods.creditCard.selectedCardID.value = "";
			}
		
		var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');
		session.forms.billing.paymentMethods.selectedPaymentMethodID.value = CybersourceConstants.METHOD_SA_SILENTPOST;
		var CommonHelper = require('int_cybersource/cartridge/scripts/helper/CommonHelper');
		result = CommonHelper.validateBillingAddress();
		var isValid = app.getController('COBilling').validateBilling();
		if (isValid && (result.success)) {
			isValid = app.getController('COBilling').handleBillingAddress(cart);
		}
		if (isValid && (result.success)) {
			var Transaction = require('dw/system/Transaction');
			Transaction.wrap(function () {
				CommonHelper.removeExistingPaymentInstruments(cart);
				var amount  = cart.getNonGiftCertificateAmount();
		    	cart.createPaymentInstrument( CybersourceConstants.METHOD_SA_SILENTPOST, amount );
			});
			var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
			var paymentInstrument = CardHelper.getNonGCPaymemtInstument(cart);
			var subscriptionToken = CommonHelper.GetSubscriptionToken( httpParameterMap.cctoken.stringValue, customer);
			if (!empty(httpParameterMap.cctoken.stringValue) && empty(subscriptionToken)) {
				var errorMsg = new Array();
				errorMsg.push(Resource.msg('checkout.invalid.credit.card.info', 'cybersource', null));
				app.getView({ERRORCODE:errorMsg}).render('common/errorjson');
				return;	
			}
			var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
			var saresponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,cart.object,null,subscriptionToken);
		  	if (saresponse.success) {
		  		 if (saresponse.requestData != null) {
		  			 var data = saresponse.requestData;
		  			 var formAction  = saresponse.formAction;
				 	 app.getView({requestData:data,formAction:formAction}).render('secureacceptance/secureAcceptanceSilentPost');
				 	 return;
			  	}
			} else if (saresponse.error) {
				var errorMsg : Array = new Array();
				errorMsg.push(Resource.msg('checkout.getsignature.service.problem', 'cybersource', null));
				result.errorMsg = errorMsg;
			}
		}
		} else {
			result.errorMsg = Resource.msg('silentpost.invalidRequestData.error', 'cybersource', null);
		}
	}
	}
	app.getView({ERRORCODE:result.errorMsg}).render('common/errorjson');
 }

/**
 * This method receive response from the third party in http Parameter map, verify the signature , update the payment instrument with card value received, go to place order.
 */

function SilentPostResponse() {
	
	var URLUtils = require('dw/web/URLUtils');
	var httpParameterMap = request.httpParameterMap;
	if ((httpParameterMap != null)  &&  (!empty(httpParameterMap.decision.stringValue)) ) {
		var cart = app.getModel('Cart').get();
		var CardHelper = require('int_cybersource/cartridge/scripts/helper/CardHelper');
		var paymentInstrument = CardHelper.getNonGCPaymemtInstument(cart.object);
		var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
		var silentPostResponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,null,httpParameterMap,null);
		var CybersourceConstants = require('int_cybersource/cartridge/scripts/utils/CybersourceConstants.ds');
		if (silentPostResponse.success && silentPostResponse.signatureAuthorize) {
			session.forms.billing.paymentMethods.selectedPaymentMethodID.value = CybersourceConstants.METHOD_SA_SILENTPOST;
			if ("ACCEPT" == httpParameterMap.decision.stringValue || "REVIEW" == httpParameterMap.decision.stringValue) {
				session.forms.billing.fulfilled.value = true;
				var Transaction = require('dw/system/Transaction');
				if (session.forms.billing.paymentMethods.creditCard.saveCard.value) {
					Transaction.wrap(function () {
						paymentInstrument.custom.savecard = true;
					});
				}
				var paymentToken = !empty(httpParameterMap.payment_token.stringValue)?httpParameterMap.payment_token.stringValue:httpParameterMap.req_payment_token.stringValue;
				var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
				Transaction.wrap(function () {
					PaymentInstrumentUtils.updatePaymentInstumenSACard(paymentInstrument, httpParameterMap.req_card_expiry_date.stringValue, 
							httpParameterMap.req_card_number.stringValue, httpParameterMap.req_card_type.stringValue, paymentToken, 
							httpParameterMap.req_bill_to_forename.stringValue, httpParameterMap.req_bill_to_surname.stringValue);
				});
				
				response.redirect(URLUtils.https('COSummary-Start'));
			} else {
				response.redirect(URLUtils.https('COBilling-Start','SecureAcceptanceError','true'));
			}
		} 
	}else{
		response.redirect(URLUtils.https('Cart-Show','SecureAcceptanceError','true'));
	}
	
}

/**
* Merchant POST URL Configure response save in custom object
*/
function MerchantPost(args)
{
	var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/helper/SecureAcceptanceHelper');
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

