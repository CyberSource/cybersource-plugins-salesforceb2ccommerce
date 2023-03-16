var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants'),
	secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER),
	Logger = require('dw/system/Logger'),
	URLUtils = require('dw/web/URLUtils');
/**
 * Verifies billing and shipping details and 
 * possibly invalidates invalid form fields. 
 * If the verification was successful a Secure Acceptance redirect payment instrument is created.
 */
function HandleRequest(args,additionalArgs) {
	var cart = additionalArgs.cart;
	var PaymentMethod = additionalArgs.PaymentMethod;
	var Transaction = require('dw/system/Transaction');
    var transStatus = Transaction.wrap(function () {
    	 var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    	 CommonHelper.removeExistingPaymentInstruments(cart);
    	 var amount = CommonHelper.CalculateNonGiftCertificateAmount(cart);
    	 cart.createPaymentInstrument(PaymentMethod,amount );
        return true;
    });
    if (transStatus) {
    	return {sucess: true};
    }
    return {error:true};
}


function Authorize(args,additionalArgs) {
	var OrderMgr = require('dw/order/OrderMgr');
	var order = args.Order;
	var paymentInstrument = args.PaymentInstrument;
	var paymentMethod = paymentInstrument.paymentMethod;
	if (paymentMethod == CybersourceConstants.METHOD_SA_REDIRECT) {
		var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper'),
			subscriptionToken = CommonHelper.GetSubscriptionToken( additionalArgs.subscriptionToken, customer);	
			return secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,order,null,subscriptionToken);
	}
	else if (paymentMethod == CybersourceConstants.METHOD_SA_IFRAME) {
		return {
              	returnToPage :true,
              	order : order
        };
	}
	  else if (paymentMethod == CybersourceConstants.METHOD_SA_SILENTPOST) {
	  	var silentPostResponse = secureAcceptanceHelper.AuthorizeCreditCard({PaymentInstrument:paymentInstrument, Order:order, Basket:order});
	  	if(silentPostResponse.authorized || silentPostResponse.process3DRedirection) {
	  		var customerObj = (!empty(customer) && customer.authenticated)?customer:null;
	  		secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customerObj);
	  	}
	  	return silentPostResponse;
  }		    
}


/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
function OpenIframe(currentOrderNo)
{
	var saRequest = null;
	var orderNo = currentOrderNo;
	var returnObject = {};
	if (!empty(orderNo)) {
		var OrderMgr = require('dw/order/OrderMgr');
		var order = OrderMgr.getOrder(orderNo);
		var paymentInstrument = secureAcceptanceHelper.GetPaymemtInstument(order);
		var cardUUID = session.forms.billing.paymentMethods.creditCard.selectedCardID.value;
	
		if (null !== order && null !== paymentInstrument) {
			var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
			var subscriptionToken = CommonHelper.GetSubscriptionToken( cardUUID, customer);
			session.privacy.isIframe = true;
			saRequest = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,order,null,subscriptionToken);
			if (saRequest.success && saRequest.requestData !== null) {
				returnObject.data = saRequest.requestData;
				returnObject.formAction = saRequest.formAction;
				returnObject.success = true;
			}
		}
	}else{
		returnObject.success = false
	}
	return returnObject;
} 

/**
 * Secure Acceptance response handling is done here.
 * On basis of decision and signature verification, checkout flow continues, if signature does not match then user is taken to summary page.
 * @input  httpParameterMap : this map as value of signed fields we get from cybersource.
 */
function SAResponse(currentRequestParameterMap) {
    var Order = require('dw/order/Order');
    var Status = require('dw/system/Status');
    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
	var result = SAHandleResponse(currentRequestParameterMap);
	if (result.success && !empty(result.responseObject)) {
		var orderNo = currentRequestParameterMap.req_reference_number.stringValue;
		var order = OrderMgr.getOrder(orderNo);
	    var responseObject = result.responseObject;
		if('saredirect'.equals(currentRequestParameterMap.provider.stringValue)){
			var redirectResponse = SARedirectResponse(responseObject,order);
			if(!empty(redirectResponse)){
				return redirectResponse;
			}
		}else if('saiframe'.equals(currentRequestParameterMap.provider.stringValue)){
			var redirectResponse = SAIframeResponse(responseObject,order);
			if(!empty(redirectResponse)){
				return redirectResponse;
			}
		}
		Logger.error('[SECURE_ACCEPTANCE] SAResponse function Error in response process for order '+orderNo+ ' decision arrived '+ responseObject.Decision);
	}
	Logger.error('[SECURE_ACCEPTANCE] SAResponse function Error in response process does not expect to go to cart page in ideal case');
	if (currentRequestParameterMap.provider.stringValue === 'saiframe') {
		return {nextStep : CybersourceConstants.SA_GOTO,
				location : URLUtils.https('Cart-Show','saerror','true'),
				render : 'secureacceptance/saredirect'};
	}
	return {nextStep : CybersourceConstants.SA_GOTO,
			location : URLUtils.https('Cart-Show','saerror','true'),
			render : 'secureacceptance/saredirect'};
}

function SARedirectResponse(responseObject,order){
	var Order = require('dw/order/Order'),
		Transaction = require('dw/system/Transaction'),
		Status = require('dw/system/Status'),
		OrderMgr = require('dw/order/OrderMgr');
	switch(responseObject.Decision){
		case 'ACCEPT':
			if((order.status.value === Order.ORDER_STATUS_CREATED) && responseObject.ReasonCode === "100"){
				return {nextStep : CybersourceConstants.SA_SUBMITORDER, data : order};
			} else if(order.status.value !== Order.ORDER_STATUS_FAILED){
				return {nextStep : CybersourceConstants.SA_REVIEWORDER, data : order};
			} 
			break;
		case 'REVIEW':
			if (order.status.value === Order.ORDER_STATUS_CREATED) {
				return {nextStep : CybersourceConstants.SA_REVIEWORDER, data : order};	
			}
			break;
		case 'ERROR' :
		case 'DECLINE' : 
			var isOrderFailed = false;
			if(order.status.value !== Order.ORDER_STATUS_FAILED){
				isOrderFailed = Transaction.wrap(function () {
					OrderMgr.failOrder(order);
					return true;
				});
			}
			if(isOrderFailed){
				var PlaceOrderError=null;
				var result = secureAcceptanceHelper.HandleDecision(responseObject.ReasonCode);
				if(result.error){
					PlaceOrderError = new Status(Status.ERROR, "confirm.error.technical");
				}else{
					PlaceOrderError = new Status(Status.ERROR, "confirm.error.declined");
				}
				return {nextStep : CybersourceConstants.SA_SUMMARY, data : PlaceOrderError};
			}
			break;
		case 'CANCEL':
			Transaction.wrap(function () {
				OrderMgr.failOrder(order);
			});
    		return {nextStep : CybersourceConstants.SA_CANCEL, location: URLUtils.https('Cart-Show')};
    		break;
		default : break;
	}
	return;
}

function SAIframeResponse(responseObject,order){
	var Order = require('dw/order/Order'),
		Transaction = require('dw/system/Transaction'),
		OrderMgr = require('dw/order/OrderMgr'),
	    Status = require('dw/system/Status'),
		orderPlacementStatus=null;
	switch(responseObject.Decision){
		case 'ACCEPT':
			if ((order.status.value === Order.ORDER_STATUS_CREATED) && responseObject.ReasonCode === "100"){
				orderPlacementStatus = Transaction.wrap(function(){
					var statusOrder =OrderMgr.placeOrder(order) ;
					if (Status.ERROR === statusOrder) {
						session.privacy.SkipTaxCalculation=false;
			            OrderMgr.failOrder(order);
			            return false;
					}else{
						 order.setConfirmationStatus(order.CONFIRMATION_STATUS_CONFIRMED);
						 return true;
					}
				});
				if ( empty(orderPlacementStatus) || Status.ERROR !== orderPlacementStatus) {
					return {nextStep : CybersourceConstants.SA_GOTO,
							location : URLUtils.https('COPlaceOrder-Submit','provider','saconfirm'),
							render : 'secureacceptance/saredirect'}
				}else{
					Logger.error('[SECURE_ACCEPTANCE] SAIframeResponse function Error in order failure even if order got ACCEPT for order '+orderNo);
					return {nextStep : CybersourceConstants.SA_GOTO,
							location : URLUtils.https('COPlaceOrder-Submit','provider','safail','SecureAcceptanceError','true'),
							render : 'secureacceptance/saredirect'};
				}				
			} else if(Order.ORDER_STATUS_FAILED !== order.status.value){
				return {nextStep : CybersourceConstants.SA_GOTO,
						location : URLUtils.https('COPlaceOrder-Submit','provider','saconfirm'),
						render : 'secureacceptance/saredirect'};
			}
			break;
		case 'REVIEW':
			if (order.status.value === Order.ORDER_STATUS_CREATED) {
				return {nextStep : CybersourceConstants.SA_GOTO,
						location : URLUtils.https('COPlaceOrder-Submit','provider','saconfirm'),
						render : 'secureacceptance/saredirect'};
			}
			break;
		case 'CANCEL':
		case 'ERROR':
		case 'DECLINE':
			var isOrderFailed = false;
			if(order.status.value !== Order.ORDER_STATUS_FAILED){
				isOrderFailed = Transaction.wrap(function () {
					OrderMgr.failOrder(order);
					return true;
				});
			}
			if(isOrderFailed){
				var PlaceOrderError=null;
				var result = secureAcceptanceHelper.HandleDecision(responseObject.ReasonCode);
				if(result.error){
					PlaceOrderError = new Status(Status.ERROR, "confirm.error.technical");
				}
				if (empty(PlaceOrderError)) {
					return {nextStep : CybersourceConstants.SA_GOTO,
									location : URLUtils.https('COPlaceOrder-Submit','provider','safail'),
									render : 'secureacceptance/saredirect'};
				}else{
					return {nextStep : CybersourceConstants.SA_GOTO,
							location :  URLUtils.https('COPlaceOrder-Submit','provider','safail','SecureAcceptanceError','true'),
							render : 'secureacceptance/saredirect'};
				}
			}
			break;
		default: break;
	}
	return;
}


/**
 * Handle Secure Acceptance Redirect and IFrame response, authenticate signature,
 * update payment Instrument with card information and updates billing/shipping in order object, if override value is true.
 */

function SAHandleResponse(httpParameterMap) {

	var secretKey = null;
	var paymentInstrument = null;
	var paymentMethod = null;
	
	if (!empty(httpParameterMap)) {
		var OrderMgr = require('dw/order/OrderMgr');
		var orderNo = httpParameterMap.req_reference_number.stringValue;
		var order = OrderMgr.getOrder(orderNo);
	    var saResponse,responseObject;
			paymentInstrument = secureAcceptanceHelper.GetPaymemtInstument(order);
			if (null !== order && !empty(paymentInstrument)) {
			paymentMethod = paymentInstrument.paymentMethod;
			saResponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,null,httpParameterMap,null);
	    	if (saResponse.success && saResponse.signatureAuthorize) {
	    		var customerObj = (!empty(customer) && customer.authenticated)?customer:null;
	    		return updateSAResponse(request.httpParameterMap, order, paymentInstrument, customerObj);
	    	}
		}	    	
	}
	return {error:true};
}

/**
* Function to update the order and payment instrument and customer save card updates based on SA response
*/
function updateSAResponse(responseParameterMap, order, paymentInstrument, customerObj) {
	var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
	var isOverrideShipping  = dw.system.Site.getCurrent().getCustomPreferenceValue("CsSAOverrideShippingAddress");
	var isOverrideBilling  = dw.system.Site.getCurrent().getCustomPreferenceValue("CsSAOverrideBillingAddress");
	var responseObject = secureAcceptanceHelper.mapSecureAcceptanceResponse(responseParameterMap);
	if (order.status.value === dw.order.Order.ORDER_STATUS_CREATED) {
		PaymentInstrumentUtils.UpdatePaymentTransactionSecureAcceptanceAuthorize(order,responseObject);
	}
	if (((responseObject.Decision == "ACCEPT")||(responseObject.Decision == "REVIEW"))&&(order.status.value === dw.order.Order.ORDER_STATUS_CREATED)) {
		PaymentInstrumentUtils.UpdateOrderBillingShippingDetails(order,responseObject,isOverrideShipping,isOverrideBilling);
		var subsToken = !empty(responseParameterMap.payment_token.stringValue)?responseParameterMap.payment_token.stringValue:responseParameterMap.req_payment_token.stringValue;
		PaymentInstrumentUtils.updatePaymentInstumenSACard(paymentInstrument, responseParameterMap.req_card_expiry_date.stringValue, 
		responseParameterMap.req_card_number.stringValue, responseParameterMap.req_card_type.stringValue, subsToken, 
		responseParameterMap.req_bill_to_forename.stringValue, responseParameterMap.req_bill_to_surname.stringValue);
		secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customerObj);
	}
	return {success:true,responseObject:responseObject};
}

/**
* Function to creating request for Silent Post
*/
function GetRequestDataForSilentPost(cart){
	var httpParameterMap = request.httpParameterMap,
		errorMsg,
		Transaction = require('dw/system/Transaction'),
		Resource = require('dw/web/Resource');
		if (null !== httpParameterMap) {
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
			session.forms.billing.paymentMethods.creditCard.number.value = httpParameterMap.ccnumber.stringValue;
			session.forms.billing.paymentMethods.creditCard.type.value = httpParameterMap.cctype.stringValue;
			session.forms.billing.paymentMethods.creditCard.expiration.month.value = Number(httpParameterMap.month.stringValue);
			session.forms.billing.paymentMethods.creditCard.expiration.year.value = Number(httpParameterMap.expyear.value);
			session.forms.billing.paymentMethods.creditCard.cvn.value = httpParameterMap.cvn.stringValue;
			
			if (!empty(httpParameterMap.cctoken.stringValue)) {
			session.forms.billing.paymentMethods.creditCard.selectedCardID.value = httpParameterMap.cctoken.stringValue;
			} else {
				session.forms.billing.paymentMethods.creditCard.selectedCardID.value = "";
			}
		
		session.forms.billing.paymentMethods.selectedPaymentMethodID.value = CybersourceConstants.METHOD_SA_SILENTPOST;
		var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
		result = CommonHelper.validateBillingAddress();
		//COBilling-ValidateBilling
		var isValid = (function(){
			if(!session.forms.billing.billingAddress.valid){
				return false;
			}
			if(!empty(request.httpParameterMap.noPaymentNeeded.value)){
				return true;
			}
		    if (!empty(session.forms.billing.paymentMethods.selectedPaymentMethodID.value) 
    			&& session.forms.billing.paymentMethods.selectedPaymentMethodID.value.equals(require('dw/order/PaymentInstrument').METHOD_CREDIT_CARD)
    			&& empty(session.forms.billing.paymentMethods.creditCard.selectedCardID.value)) {
       			 if (!session.forms.billing.valid) {
           		 return false;
        		}
    		}
				return true;
			})();
		if (isValid && (result.success)) {
			//COBilling-handleBillingAddress
			isValid = false;
			isValid = (function(){
				var billingAddress = cart.getBillingAddress();
				Transaction.wrap(function(){
					if(!billingAddress){
						billingAddress = cart.createBillingAddress();
					}
					// copy the address details
					billingAddress.setFirstName(session.forms.billing.billingAddress.addressFields.firstName.value );
					billingAddress.setLastName( session.forms.billing.billingAddress.addressFields.lastName.value );
					billingAddress.setAddress1( session.forms.billing.billingAddress.addressFields.address1.value );
					billingAddress.setAddress2( session.forms.billing.billingAddress.addressFields.address2.value );
					billingAddress.setCity( session.forms.billing.billingAddress.addressFields.city.value );
					billingAddress.setPostalCode( session.forms.billing.billingAddress.addressFields.postal.value );
					billingAddress.setStateCode( session.forms.billing.billingAddress.addressFields.states.state.value );
					billingAddress.setCountryCode( session.forms.billing.billingAddress.addressFields.country.value );
					billingAddress.setPhone( session.forms.billing.billingAddress.addressFields.phone.value );
					
					cart.setCustomerEmail(session.forms.billing.billingAddress.email.emailAddress.value);
				});
				return true;
			})(); 
		}
		if (isValid && (result.success)) {
			Transaction.wrap(function () {
				CommonHelper.removeExistingPaymentInstruments(cart);
				var amount  = CommonHelper.CalculateNonGiftCertificateAmount(cart);
		    	cart.createPaymentInstrument( CybersourceConstants.METHOD_SA_SILENTPOST, amount );
			});
			var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
			var paymentInstrument = CardHelper.getNonGCPaymemtInstument(cart);
			var subscriptionToken = CommonHelper.GetSubscriptionToken( httpParameterMap.cctoken.stringValue, customer);
			if (!empty(httpParameterMap.cctoken.stringValue) && empty(subscriptionToken)) {
				errorMsg = Resource.msg('checkout.invalid.credit.card.info', 'cybersource', null);
				return{
					success : false,
					errorMsg : errorMsg,
					nextStep : 'common/errorjson'
				};
			}
			var saresponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,cart,null,subscriptionToken);
		  	if (saresponse.success) {
		  		 if (saresponse.requestData !== null) {
		  			 var data = saresponse.requestData;
		  			 var formAction  = saresponse.formAction;
				 	 return{
				 	 	success : true,
				 	 	data : data,
				 	 	formAction : formAction,
				 	 	nextStep : 'secureacceptance/secureAcceptanceSilentPost'
				 	 };
			  	}
			} else if (saresponse.error) {
				errorMsg = Resource.msg('checkout.getsignature.service.problem', 'cybersource', null);
			}
		}
		} else {
			errorMsg = Resource.msg('silentpost.invalidRequestData.error', 'cybersource', null);
		}
		return{
			success : false,
			errorMsg : errorMsg
		};
}

function SilentPostResponse(cart){
	var URLUtils = require('dw/web/URLUtils');
	var httpParameterMap = request.httpParameterMap;
	if ((httpParameterMap !== null)  &&  (!empty(httpParameterMap.decision.stringValue)) ) {
		var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
		var paymentInstrument = CardHelper.getNonGCPaymemtInstument(cart);
		var silentPostResponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,null,httpParameterMap,null);
		//var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
		if (silentPostResponse.success && silentPostResponse.signatureAuthorize) {
			session.forms.billing.paymentMethods.selectedPaymentMethodID.value = CybersourceConstants.METHOD_SA_SILENTPOST;
			if ((('ACCEPT'.equals(httpParameterMap.decision.stringValue) && (httpParameterMap.reason_code.intValue === 100)))) {
				session.forms.billing.fulfilled.value = true;
				var Transaction = require('dw/system/Transaction');
				if (session.forms.billing.paymentMethods.creditCard.saveCard.value) {
					Transaction.wrap(function () {
						paymentInstrument.custom.savecard = true;
					});
				}
				var paymentToken = !empty(httpParameterMap.payment_token.stringValue)?httpParameterMap.payment_token.stringValue:httpParameterMap.req_payment_token.stringValue;
				var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
				Transaction.wrap(function () {
					PaymentInstrumentUtils.updatePaymentInstumenSACard(paymentInstrument, httpParameterMap.req_card_expiry_date.stringValue, 
							httpParameterMap.req_card_number.stringValue, httpParameterMap.req_card_type.stringValue, paymentToken, 
							httpParameterMap.req_bill_to_forename.stringValue, httpParameterMap.req_bill_to_surname.stringValue);
				});
				
				return URLUtils.https('COSummary-Start');
			} else {
				//response.redirect(URLUtils.https('COBilling-Start','SecureAcceptanceError','true'));
				return URLUtils.https('COBilling-Start','SecureAcceptanceError','true');
			}
		} 
	}else{
		return URLUtils.https('Cart-Show','SecureAcceptanceError','true');
	}
}

/** Exported functions **/
module.exports = {
		HandleRequest : HandleRequest,	
		OpenIframe : OpenIframe,
		Authorize : Authorize,
		SAResponse  :SAResponse,
		GetRequestDataForSilentPost :GetRequestDataForSilentPost,
		SilentPostResponse : SilentPostResponse
};