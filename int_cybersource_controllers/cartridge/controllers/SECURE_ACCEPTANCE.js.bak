'use strict';
/**
 * Secure Acceptance controller contains all method related to this type of payment instrument (SilentPost,Redirect and Iframe)
 * @module controllers/Cybersource_Subscription
 */

/* API Includes */
var PaymentMgr = require('dw/order/PaymentMgr');
var Resource = require('dw/web/Resource');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var logger = dw.system.Logger.getLogger('Cybersource');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');	
var app = require('app_storefront_controllers/cartridge/scripts/app');
var PaymentInstrumentUtils = require('int_cybersource/cartridge/scripts/utils/PaymentInstrumentUtils');
var Cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel');
var HashMap = require('dw/util/HashMap');
var OrderMgr = require('dw/order/OrderMgr');
var secureAcceptanceHelper = require('int_cybersource/cartridge/scripts/Helper/SecureAcceptanceHelper');
var CardHelper = require('int_cybersource/cartridge/scripts/Helper/CardHelper');
var CommonHelper = require('int_cybersource/cartridge/scripts/Helper/CommonHelper');
var TestHelper = require('int_cybersource/cartridge/scripts/Helper/TestHelper');

/**
 * Verifies billing and shipping details and 
 * possibly invalidates invalid form fields. 
 * If the verification was successful a Secure Acceptance redirect payment instrument is created.
 */
function Handle(args) {

	var PaymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
    var cart = Cart.get(args.Basket);
    var transStatus = Transaction.wrap(function () {
    	 CommonHelper.removeExistingPaymentInstruments(cart);
    	 cart.createPaymentInstrument(PaymentMethod, cart.getNonGiftCertificateAmount());
        return true;
    });
    if (transStatus) {
    	return {sucess: true};
    }
    return {error:true};
}

/**
 * Authorizes a payment using a secure acceptance redirect payment instrument. 
 * Create signature with requested input 
 * This function takes order No and payment instrument as Input
 */
function Authorize(args) {
	
	var orderNo = args.OrderNo;
	var order = OrderMgr.getOrder(orderNo);
	var paymentInstrument = args.PaymentInstrument;
	var paymentMethod = paymentInstrument.paymentMethod;
	var paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).getPaymentProcessor();
    Transaction.wrap(function () {
    	paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });
	var saveCard = session.forms.billing.paymentMethods.creditCard.saveCard.value;
	if (saveCard) {
		Transaction.wrap(function () {
			paymentInstrument.custom.savecard = true;
		});
	}
	if(paymentMethod == "SA_REDIRECT"){
			var subscriptionToken = session.forms.billing.paymentMethods.creditCard.selectedCardID.value;
			return CreateSignature(paymentInstrument,order,subscriptionToken);
		}
		else if(paymentMethod == "SA_IFRAME"){
			session.privacy.order_id = orderNo;
			return {
               	returnToPage :true
            };
		}
	  else if (paymentMethod == "SA_SILENTPOST") {
	  	var Cybersource = require('int_cybersource_controllers/cartridge/controllers/Cybersource');
	  	return Cybersource.AuthorizeCreditCard({PaymentInstrument:paymentInstrument, Order:order, Basket:order});
  }
}

/**
 * Creates signature for the input fields that we need to send in signed and unsigned fields.
 * @param lineItemCtnr : dw.order.LineItemCtnr (can we basket or order)
 * @param paymentInstrument : dw.order.PaymentInstrument (Non certificate payment instrument)
 * @param subscriptionToken : String (If credit card has already saved token.)
 */

function CreateSignature(paymentInstrument,lineItemCtnr,cardUUID) {
	
	var saRequest = null;
	var signatureAuthorize : Boolean = false;
	var subscriptionToken = CommonHelper.GetSubscriptionToken( cardUUID, customer);
	
		saRequest = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,lineItemCtnr,null,subscriptionToken);
	  	if(saRequest.success){
	  		 if(saRequest.requestData != null){
	  			 var data = saRequest.requestData;
	  		 	 var formAction = saRequest.formAction;
	  		         app.getView({requestData:data, formAction:formAction}).render('services/secureAcceptanceRequestForm');
			 		 return {end:true};
	  		 }
	  		 else if(response.signatureAuthorize){
	  			 signatureAuthorize = true;
	  		 }
		 }
	  	return {error:true};
}

/**
 * Open the secure acceptance page inside Iframe if secure acceptance Iframe is selected
 */
function OpenIframe()
{
	var saRequest = null;
	var orderNo = session.privacy.order_id;
	if (!empty(orderNo)) {
		var order = OrderMgr.getOrder(orderNo);
		var paymentInstrument = GetPaymemtInstument(order);
		var cardUUID = session.forms.billing.paymentMethods.creditCard.selectedCardID.value;
	
		if (null != order && null != paymentInstrument){
			var subscriptionToken = CommonHelper.GetSubscriptionToken( cardUUID, customer);
			saRequest = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,order,null,subscriptionToken);
			if(saRequest.success && saRequest.requestData != null){
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
 * Secure Acceptance response handling is done here.
 * On basis of decision and signature verification, checkout flow continues, if signature does not match then user is taken to summary page.
 * @input  httpParameterMap : this map as value of signed fields we get from cybersource.
 */
function SAResponse() {
	var result = SAHandleResponse(request.httpParameterMap);
	var orderPlacementStatus=null;
	if (result.success && null!=result.responseObject) {
		var orderNo = request.httpParameterMap.req_reference_number.stringValue;
		var order = OrderMgr.getOrder(orderNo);
	    var responseObject = result.responseObject;
		switch(responseObject.Decision) {
			case "ACCEPT" :
				if (order.status==dw.order.Order.ORDER_STATUS_CREATED && request.httpParameterMap.provider.stringValue=='saredirect') {
					app.getController('COPlaceOrder').SubmitOrder({Order:order});
					return;
				} else if (order.status!=dw.order.Order.ORDER_STATUS_FAILED && request.httpParameterMap.provider.stringValue=='saredirect') {
					app.getController('COPlaceOrder').ReviewOrder({Order:order});
					return;
				} else if (order.status==dw.order.Order.ORDER_STATUS_CREATED && request.httpParameterMap.provider.stringValue=='saiframe') {
					session.privacy.order_id = orderNo;
				    orderPlacementStatus = Transaction.wrap(function () {
				        if (OrderMgr.placeOrder(order) === Status.ERROR) {
				        	session.custom.SkipTaxCalculation=false;
				            OrderMgr.failOrder(order);
				            return false;
				        }
	
				        order.setConfirmationStatus(order.CONFIRMATION_STATUS_CONFIRMED);
				        return true;
				    });
					if (null == orderPlacementStatus || orderPlacementStatus !== Status.ERROR) {
						app.getView({Location : dw.web.URLUtils.https('COPlaceOrder-Submit','provider','saconfirm','order_token',order.getOrderToken())}).render('common/saredirect');
						return;
					}
					app.getView({Location : dw.web.URLUtils.https('COPlaceOrder-Submit','provider','safail','SecureAcceptanceError','true','order_token',order.getOrderToken())}).render('common/saredirect');
					return;
				} else if(order.status!=dw.order.Order.ORDER_STATUS_FAILED && request.httpParameterMap.provider.stringValue=='saiframe') {
					session.privacy.order_id = orderNo;
					app.getView({Location : dw.web.URLUtils.https('COPlaceOrder-Submit','provider','saconfirm','order_token',order.getOrderToken())}).render('common/saredirect');
					return;
				}
				break;
			case "REVIEW" :
				if(order.status==dw.order.Order.ORDER_STATUS_CREATED) {
					if (request.httpParameterMap.provider.stringValue=='saiframe') {
						session.privacy.order_id = orderNo;
						app.getView({Location : dw.web.URLUtils.https('COPlaceOrder-Submit','provider','saconfirm','order_token',order.getOrderToken())}).render('common/saredirect');
						return;
					}
					app.getController('COPlaceOrder').ReviewOrder({Order:order});
					return;
				}
			break;
			case "CANCEL" :
			case "ERROR" :
			case "DECLINE" :
				var failResult = false;
				if (order.status!=dw.order.Order.ORDER_STATUS_FAILED) {
					failResult = Transaction.wrap(function () {
				        OrderMgr.failOrder(order);
				        return true;				        
				    });
				}
				if (failResult) {
					var PlaceOrderError=null;
					var result = secureAcceptanceHelper.HandleDecision(responseObject.ReasonCode);
					if (result.error) {
						PlaceOrderError = new dw.system.Status(dw.system.Status.ERROR, "confirm.error.technical");
					}
					if (request.httpParameterMap.provider.stringValue=='saiframe') {
						session.privacy.order_id = orderNo;
						if (empty(PlaceOrderError)) {
							app.getView({Location : dw.web.URLUtils.https('COPlaceOrder-Submit','provider','safail','order_token',order.getOrderToken())}).render('common/saredirect');
							return;
						}
						app.getView({Location : dw.web.URLUtils.https('COPlaceOrder-Submit','provider','safail','SecureAcceptanceError','true','order_token',order.getOrderToken())}).render('common/saredirect');
						return;
					} else {
						app.getController('COSummary').Start({PlaceOrderError:!empty(PlaceOrderError)?PlaceOrderError:new dw.system.Status(dw.system.Status.ERROR, "confirm.error.declined")});
						return;
					}
				}
			break;
			default :
				break;
		}		
	}
	if (request.httpParameterMap.provider.stringValue=='saiframe') {
		session.privacy.order_id = orderNo;
		app.getView({Location : dw.web.URLUtils.https('Cart-Show','saerror','true')}).render('common/saredirect');
		return;
	}
	app.getView({Location : dw.web.URLUtils.https('Cart-Show','saerror','true')}).render('common/saredirect');
	return;
}

/**
 * Returns the payment instruments of an order which is not a gift certificate.
 * @param order : Object
 */
function GetPaymemtInstument(order){
	if(null != order){
		return CardHelper.getNonGCPaymemtInstument(order);
	}
}
/**
 * Handle Secure Acceptance Redirect and IFrame response, authenticate signature,
 * update payment Instrument with card information and updates billing/shipping in order object, if override value is true.
 */

function SAHandleResponse(httpParameterMap) {

	var cart = app.getModel('Cart').get();
	var secretKey = null;
	var paymentInstrument = null;
	var paymentMethod = null;
	
	if(null != httpParameterMap){
		
		var orderNo = httpParameterMap.req_reference_number.stringValue;
		var order = OrderMgr.getOrder(orderNo);
	    var saResponse,responseObject;    
			paymentInstrument = GetPaymemtInstument(order);
			if(null != order && null != paymentInstrument){
				
			paymentMethod = paymentInstrument.paymentMethod;
			saResponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,null,httpParameterMap,null);
	    	if(saResponse.success && saResponse.signatureAuthorize){
	    		var customerObj = (!empty(customer) && customer.authenticated)?customer:null;
	    		return secureAcceptanceHelper.updateSAResponse(request.httpParameterMap, order, paymentInstrument, customerObj);
	    	}
		}	    	
	}
	return {error:true};
}

/**
 * This method creates signature and payment instrument for silent post and request is send to create the token with all data in hidden fields
 */
function GetRequestDataForSilentPost() {
	var result = {};
	if(request.httpHeaders.get("x-requested-with").equals("XMLHttpRequest")) {
	var cart = app.getModel('Cart').get();
	if (cart) {
		var httpParameterMap = request.httpParameterMap;
		if(null != httpParameterMap) {
			session.forms.billing.billingAddress.email.emailAddress.value =  httpParameterMap.custemail.stringValue;
			session.forms.billing.paymentMethods.creditCard.saveCard.value = httpParameterMap.savecc.stringValue;
			session.forms.billing.billingAddress.addressFields.firstName.value = httpParameterMap.firstname.stringValue;
			session.forms.billing.billingAddress.addressFields.lastName.value = httpParameterMap.lastname.stringValue;
			session.forms.billing.billingAddress.addressFields.address1.value =  httpParameterMap.address1.stringValue;
			session.forms.billing.billingAddress.addressFields.address2.value = httpParameterMap.address2.stringValue;
			session.forms.billing.billingAddress.addressFields.city.value = httpParameterMap.city.stringValue;
			session.forms.billing.billingAddress.addressFields.postal.value = httpParameterMap.zipcode.stringValue;
			session.forms.billing.billingAddress.addressFields.country.value = httpParameterMap.country.stringValue;
			session.forms.billing.billingAddress.addressFields.states.state.value = httpParameterMap.state.stringValue;
			session.forms.billing.billingAddress.addressFields.phone.value = httpParameterMap.phone.stringValue;
			if(!empty(httpParameterMap.cctoken.stringValue)) {
			session.forms.billing.paymentMethods.creditCard.selectedCardID.value = httpParameterMap.cctoken.stringValue;
			} else {
				session.forms.billing.paymentMethods.creditCard.selectedCardID.value = "";
			}
		
		session.forms.billing.paymentMethods.selectedPaymentMethodID.value = "SA_SILENTPOST";
		
		result = CommonHelper.validateBillingAddress();
		var isValid = app.getController('COBilling').validateBilling();
		if (isValid && (result.success)) {
			isValid = app.getController('COBilling').handleBillingAddress(cart);
		}
		if (isValid && (result.success)) {
			Transaction.wrap(function () {
				CommonHelper.removeExistingPaymentInstruments(cart);
				var amount  = cart.getNonGiftCertificateAmount();
		    	cart.createPaymentInstrument( "SA_SILENTPOST", amount );
			});
			var paymentInstrument = CardHelper.getNonGCPaymemtInstument(cart);
			var subscriptionToken = CommonHelper.GetSubscriptionToken( httpParameterMap.cctoken.stringValue, customer);
			if (!empty(httpParameterMap.cctoken.stringValue) && empty(subscriptionToken)) {
				var errorMsg = new Array();
				errorMsg.push(Resource.msg('checkout.invalid.credit.card.info', 'checkout', null));
				app.getView({ERRORCODE:errorMsg}).render('common/errorjson');
				return;	
			}
			
			var saresponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,cart.object,null,subscriptionToken);
		  	if(saresponse.success){
		  		 if(saresponse.requestData != null){
		  			 var data = saresponse.requestData;
		  			 var formAction  = saresponse.formAction;
				 	 app.getView({requestData:data,formAction:formAction}).render('secureacceptance/secureAcceptanceSilentPost');
				 	 return;
			  	}
			} else if (saresponse.error){
				var errorMsg : Array = new Array();
				errorMsg.push(Resource.msg('checkout.getsignature.service.problem', 'checkout', null));
				result.errorMsg = errorMsg;
			}
		}
		} else {
			result.errorMsg = 'missing request parameters';
		}
	}
	}
	app.getView({ERRORCODE:result.errorMsg}).render('common/errorjson');
 }

/**
 * This method receive response from the third party in http Parameter map, verify the signature , update the payment instrument with card value received, go to plce order.
 */

function SilentPostResponse() {
	
	var httpParameterMap = request.httpParameterMap;
	if((httpParameterMap != null)  &&  (!empty(httpParameterMap.decision.stringValue)) ) {
		var cart = app.getModel('Cart').get();
		var paymentInstrument = CardHelper.getNonGCPaymemtInstument(cart.object);
		var silentPostResponse = secureAcceptanceHelper.CreateHMACSignature(paymentInstrument,null,httpParameterMap,null);
		if(silentPostResponse.success && silentPostResponse.signatureAuthorize) {
			session.forms.billing.paymentMethods.selectedPaymentMethodID.value = "SA_SILENTPOST";
			if("ACCEPT" == httpParameterMap.decision.stringValue || "REVIEW" == httpParameterMap.decision.stringValue) {
				session.forms.billing.fulfilled.value = true;
				if (session.forms.billing.paymentMethods.creditCard.saveCard.value) {
					Transaction.wrap(function () {
						paymentInstrument.custom.savecard = true;
					});
				}
				var paymentToken = !empty(httpParameterMap.payment_token.stringValue)?httpParameterMap.payment_token.stringValue:httpParameterMap.req_payment_token.stringValue;
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
    if (secureAcceptanceHelper.validateSAMerchantPostRequest(request.httpParameterMap)) {
		if (!secureAcceptanceHelper.saveSAMerchantPostRequest(request.httpParameterMap)) {
			app.getView().render('common/http_404');
			return;
		}
    }
   app.getView().render('common/http_200');
}

/**
 * This method is used to test the standalone create token service.
 */

function TestSATokenCreate(args) {
	var billTo, shipTo, purchaseTotals;
	var result = TestHelper.CreateCyberSourceBillToObject();
	if (result.success) {
		billTo = result.billTo;
		result = TestHelper.CreateCyberSourceShipToObject();
		if (result.success) {
			shipTo = result.shipTo;
			result = TestHelper.CreateCyberSourcePurchaseTotalsObject();
			if (result.success) {
				purchaseTotals = result.purchaseTotals;
				result = secureAcceptanceHelper.TestSACreateToken( billTo, shipTo, purchaseTotals );
				if (result.success) {
					app.getView({
						formAction:result.formAction,
						requestData:result.requestMap
				    }).render('services/secureAcceptanceRequestForm');
					return;
				} 
			}
		}
	}
	app.getView({
        log : !empty(result.errorMsg) ? result.errorMsg : 'System Exception occured contact administrator' 
    }).render('custom/scripterror');
}

/**
 * This method is used to test the response from the standalone create token service.
 */

function TestSATokenCreateResponse(args) {
	app.getView().render('services/secureAcceptanceCreateTokenResponse');
}


/*
 * Module exports
 */
exports.Handle=Handle;
exports.Authorize=Authorize;
exports.OpenIframe=guard.ensure(['https'], OpenIframe);
exports.GetRequestDataForSilentPost=guard.ensure(['https', 'post'], GetRequestDataForSilentPost);
exports.SilentPostResponse=guard.ensure(['https'], SilentPostResponse);
exports.SAResponse=SAResponse;
//exports.TestSATokenCreate=guard.ensure(['https'], TestSATokenCreate);
//exports.TestSATokenCreateResponse=guard.ensure(['https'], TestSATokenCreateResponse);
exports.MerchantPost=guard.ensure(['https', 'post'], MerchantPost);

exports.TestSATokenCreate=TestSATokenCreate;
exports.TestSATokenCreateResponse=TestSATokenCreateResponse;
