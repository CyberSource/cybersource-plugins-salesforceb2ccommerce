/**
* SFCC Script File - SAMerchantPostJob
* Update SA redirect/Iframe orders in SFCC which are 
* in created state due to network failure or any other issue. 
*/

var Order = require('dw/order/Order');
var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
var Logger = require('dw/system/Logger');
var CustomObjectMgr =require("dw/object/CustomObjectMgr");
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

/**
 * @param responseObject : Object containing the stored postParams
 * @returns Boolean : true if signature is valid, false otherwise
 */
function validateStoredSignature(responseObject) {
	try {
		if (responseObject === null || typeof responseObject !== 'object') {
			Logger.error('[SAmerchantPost.js] stored postParams not an object');
			return false;
		}

		var storedSignature = responseObject.signature;
		var signedFieldNames = responseObject.signed_field_names;
		var reqAccessKey = responseObject.req_access_key;
		var reqProfileId = responseObject.req_profile_id;
		var reqReferenceNumber = responseObject.req_reference_number;

		if (empty(storedSignature) || empty(signedFieldNames)
				|| empty(reqAccessKey) || empty(reqProfileId)
				|| empty(reqReferenceNumber)) {
			Logger.warn('[SAmerchantPost.js] rejecting legacy CO ' +
				'without stored signature metadata (orderRef={0}); drain pre-fix ' +
				'queue before relying on this verdict.',
				reqReferenceNumber || responseObject.req_reference_number || '<unknown>');
			return false;
		}

		var Site = require('dw/system/Site').getCurrent();
		var secretKey = null;

		var redirectAccessKey = Site.getCustomPreferenceValue('SA_Redirect_AccessKey');
		var redirectProfileId = Site.getCustomPreferenceValue('SA_Redirect_ProfileID');
		var redirectSecretKey = Site.getCustomPreferenceValue('SA_Redirect_SecretKey');
		if (!empty(redirectAccessKey) && !empty(redirectProfileId)
				&& reqAccessKey === redirectAccessKey
				&& reqProfileId === redirectProfileId) {
			secretKey = redirectSecretKey;
		}

		if (secretKey === null) {
			var iframeAccessKey = Site.getCustomPreferenceValue('SA_Iframe_AccessKey');
			var iframeProfileId = Site.getCustomPreferenceValue('SA_Iframe_ProfileID');
			var iframeSecretKey = Site.getCustomPreferenceValue('SA_Iframe_SecretKey');
			if (!empty(iframeAccessKey) && !empty(iframeProfileId)
					&& reqAccessKey === iframeAccessKey
					&& reqProfileId === iframeProfileId) {
				secretKey = iframeSecretKey;
			}
		}

		if (empty(secretKey)) {
			Logger.error('[SAmerchantPost.js] stored profile/access key ' +
				'does not match any configured SA profile (orderRef={0})',
				reqReferenceNumber);
			return false;
		}

		var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
		var mandatory = CybersourceConstants.SA_MANDATORY_RESPONSE_SIGNED_FIELDS;
		var signedFieldsArr = signedFieldNames.split(',');
		if (mandatory) {
			for (var m = 0; m < mandatory.length; m++) {
				if (signedFieldsArr.indexOf(mandatory[m]) === -1) {
					Logger.error('[SAmerchantPost.js] stored signed_field_names ' +
						'missing mandatory field {0} (orderRef={1})',
						mandatory[m], reqReferenceNumber);
					return false;
				}
			}
		}

		var parts = [];
		for (var i = 0; i < signedFieldsArr.length; i++) {
			var fieldName = signedFieldsArr[i];
			if (!responseObject.hasOwnProperty(fieldName)) {
				Logger.error('[SAmerchantPost.js] stored postParams ' +
					'missing signed field {0} (orderRef={1})',
					fieldName, reqReferenceNumber);
				return false;
			}
			parts.push(fieldName + '=' + responseObject[fieldName]);
		}
		var dataToSign = parts.join(',');

		var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
		var computedSignature = CommonHelper.signedDataUsingHMAC256(dataToSign, secretKey);
		if (computedSignature === null || typeof computedSignature === 'undefined') {
			Logger.error('[SAmerchantPost.js] HMAC computation returned empty');
			return false;
		}

		if (!constantTimeEquals(computedSignature.toString(), storedSignature)) {
			Logger.error('[SAmerchantPost.js] HMAC mismatch on stored ' +
				'postParams (orderRef={0}) - rejecting potentially tampered CO',
				reqReferenceNumber);
			return false;
		}

		if (responseObject.hasOwnProperty('Decision')
				&& responseObject.Decision !== responseObject.decision) {
			Logger.error('[SAmerchantPost.js] Decision alias mismatch ' +
				'(Decision={0}, decision={1}, orderRef={2}) - rejecting tampered CO',
				responseObject.Decision, responseObject.decision, reqReferenceNumber);
			return false;
		}
		if (responseObject.hasOwnProperty('ReasonCode')
				&& responseObject.ReasonCode !== responseObject.reason_code) {
			Logger.error('[SAmerchantPost.js] ReasonCode alias mismatch ' +
				'(ReasonCode={0}, reason_code={1}, orderRef={2}) - rejecting tampered CO',
				responseObject.ReasonCode, responseObject.reason_code, reqReferenceNumber);
			return false;
		}

		return true;
	} catch (e) {
		Logger.error('[SAmerchantPost.js] error during signature validation: {0}', e.message);
		return false;
	}
}

function constantTimeEquals(a, b) {
	if (typeof a !== 'string' || typeof b !== 'string') {
		return false;
	}
	if (a.length !== b.length) {
		return false;
	}
	var diff = 0;
	for (var i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

function SAMerchantPostJob()
{
	// get all SA order with below query status
	var query = 'custom.processed = false';
	var coIterator = CustomObjectMgr.queryCustomObjects('SA_MerchantPost', query, null, null);
		if (!empty(coIterator))
			{
				Transaction.wrap(function () {
				while (coIterator.hasNext())
				{	var CO = coIterator.next();
					var orderID = CO.custom.OrderID;
					// Search all order which are in created state
					 var orders = OrderMgr.searchOrders('orderNo={0} AND status={1}', 'creationDate desc', orderID, dw.order.Order.ORDER_STATUS_CREATED);  
					 try{
                     if(orders.count > 0){
                     	var order = orders.next();
						var paymentInstrument = CardHelper.getNonGCPaymemtInstument(order);
						var responseObject : Object = JSON.parse(CO.custom.postParams);
						 if(paymentInstrument == null || responseObject == null){
						 	Logger.error('[SAmerchantPost.js] Error occured for order:', orderID);
						 	throw new Error('Error occured for order');
						 }
						 else{
							// Re-validate HMAC signature before trusting the Decision field
							var signatureValid = validateStoredSignature(responseObject);
							if(!signatureValid){
								Logger.error('[SAmerchantPost.js] HMAC signature validation failed for order:', orderID);
								throw new Error('HMAC signature validation failed for order');
							}
							var Decision = responseObject.Decision;
							// update payment instrument, payment transaction, billing/shipping details,
							updatePIDetails(order,responseObject,paymentInstrument);
							}
                     }
   					}catch(e){
   						Logger.error("[SAmerchantPost.js] Error in Merchant post job request ( {0} )",e.message);
   						throw new Error('Error in Merchant post job request');
   					}
   					CO.custom.processed = true;              
				}
				});
			}
			removeProcessedOrders();
   return;
}

function updatePIDetails(order,responseObject,paymentInstrument){
	var Decision = responseObject.Decision;							
	if((Decision === 'ACCEPT' && responseObject.ReasonCode === '100') || Decision === 'REVIEW'){
		if(!empty(order) && !empty(responseObject)){
			// Update Billing/Shipping details
			PaymentInstrumentUtils.UpdateOrderBillingShippingDetails(order,responseObject,false,false);
			//Update Transaction details
			PaymentInstrumentUtils.UpdatePaymentTransactionSecureAcceptanceAuthorize(order,responseObject);
			var cardToken = !empty(responseObject.SubscriptionID)?responseObject.SubscriptionID:responseObject.req_payment_token;
			//update card details
			PaymentInstrumentUtils.updatePaymentInstumenSACard(paymentInstrument, responseObject.req_card_expiry_date, responseObject.req_card_number, responseObject.req_card_type, cardToken, responseObject.req_bill_to_forename, responseObject.req_bill_to_surname);
			var customerObj	= order.getCustomer();
			secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customerObj);
			// update Order status based on response recieved from service
			updateOrderStatus(order);							
		}
	}else{
			// if Decision is not ACCEPT, fail order in SFCC
			FailSAOrder(order,responseObject);
	}
}
function updateOrderStatus(order){
	var orderStatus = OrderMgr.placeOrder(order);
	if(orderStatus.code === 'OK'){
			order.setExportStatus(Order.EXPORT_STATUS_READY);									
			order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
			var MailFrom =  dw.system.Site.getCurrent().getCustomPreferenceValue('customerServiceEmail');
			var MailSubject =  dw.web.Resource.msg('order.orderconfirmation-email.001','order',null)+ '' + order.orderNo;
			var MailTemplate =  'mail/orderconfirmation';
			var MailTo =  order.customerEmail;
				if(!empty(MailFrom) && !empty(MailSubject) && !empty(MailTemplate) && !empty(MailTo)){
					 var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
					 	 CommonHelper.sendMail({
					        template: 'mail/orderconfirmation',
					        recipient: order.getCustomerEmail(),
					        subject: Resource.msg('order.orderconfirmation-email.001', 'order', null),
					        context: {
					            Order: order
					        	}
							});
				}
	   }else{
	   		Logger.error('[SAmerchantPost.js] DECISION ACCEPT/REVIEW -  Placeorder Error for order:', order.orderNo);
	   		throw new Error('DECISION ACCEPT/REVIEW -  Placeorder Error for order');
	   	}
}

/**
* This method will fail Order in SFCC 
* for fa script call service to initiate payment for Alipay and set the response in response object
* and also handles the logging of different error scenarios while making service call.
**/
function FailSAOrder(order,responseObject){
	// if Decision is not ACCEPT 
	var orderStatus = OrderMgr.failOrder(order);									
	if(orderStatus.code === 'ERROR'){										
		Logger.error('[SAmerchantPost.js] DECISION REJECT -  FailOrder Called for order:', order.orderNo);
		throw new Error('DECISION ERROR -  FailOrder Called for order');
	}
	if(responseObject.Decision === 'ERROR'  || responseObject.Decision === 'CANCEL'){
		PaymentInstrumentUtils.UpdatePaymentTransactionSecureAcceptanceAuthorize(order,responseObject);
		Logger.error('[SAmerchantPost.js] DECISION ERROR -  FailOrder Called for order:', order.orderNo);
		throw new Error('DECISION ERROR -  FailOrder Called for order');
	}
}
/*Remove all custom objects for already processed Order*/
function removeProcessedOrders(){
	var query = 'custom.processed = true';
	var coIterator = CustomObjectMgr.queryCustomObjects("SA_MerchantPost", query, null, null);
	if (!empty(coIterator)){
		Transaction.wrap(function () {
			while (coIterator.hasNext()){
			var CO = coIterator.next();
			CustomObjectMgr.remove(CO);
			}
		});
	}
}

/** Exported functions **/
module.exports = {
	SAMerchantPostJob : SAMerchantPostJob
};
		