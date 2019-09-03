'use strict';
/* API includes */
/* Script Modules */
/**
* Create or update basket ShippingAddress Visa Checkout decrypted payment data from cybersource
* @param lineItemCtnrAddress : dw.order.OrderAddress
* @param decryptedData : Object
*/

var server = require('server');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

function createLineItemCtnrShippingAddress(lineItemCtnrAddress : dw.order.OrderAddress, decryptedData : Object) {
	// validate the lineItemCtnrAddress exists
	if (decryptedData.shipTo === null) {
		throw new Error('Shipping Address not available in visa checkout decrypted payment data from cybersource');
	}
	
	//address line 1 and line 2
	lineItemCtnrAddress.setAddress1(decryptedData.shipTo_Address1);
	if (!empty(decryptedData.shipTo_Address2)) {
		lineItemCtnrAddress.setAddress2(decryptedData.shipTo_Address2);
	}
	
	//country, city, state, post code
	lineItemCtnrAddress.setCity(decryptedData.shipTo_City);
	lineItemCtnrAddress.setStateCode(decryptedData.shipTo_StateCode);
	lineItemCtnrAddress.setPostalCode(decryptedData.shipTo_PostalCode);
	lineItemCtnrAddress.setCountryCode(decryptedData.shipTo_CountryCode);
	
	//phone number 
	if (!empty(decryptedData.shipTo_Phone)) {
		lineItemCtnrAddress.setPhone(decryptedData.shipTo_Phone);
	}
	
	//first name
	lineItemCtnrAddress.setFirstName(decryptedData.shipTo_FirstName);
	//last name
	lineItemCtnrAddress.setLastName(decryptedData.shipTo_LastName);
	return {success:true, lineItemCtnrAddress:lineItemCtnrAddress};
};

/**
 * Initialization string formation for the v.init event handler function defined in onVisaCheckoutReady function.
 */
function getInitializeSettings(requireDeliveryAddress) {
	var PaymentMgr = require('dw/order/PaymentMgr');
	var BasketMgr = require('dw/order/BasketMgr');
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
    var isVisaCheckout = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT).isActive();
    if (isVisaCheckout) {    	
    	var cart = BasketMgr.getCurrentBasket();
    	cart = cart ? cart : null;
    	server.forms.getForm('visacheckout');
    	return getButtonInitializeSettings(cart, requireDeliveryAddress);
    }
    return {error:true};
}

/**
* Create or update basket BillingAddress Visa Checkout decrypted payment data from cybersource
* @param lineItemCtnrAddress : dw.order.OrderAddress
* @param decryptedData : Object
*/
function createLineItemCtnrBillingAddress(lineItemCtnrAddress : dw.order.OrderAddress, decryptedData : Object) {
	// validate the lineItemCtnrAddress exists
	var vcCurrentPage = session.privacy.cyb_CurrentPage;
	if(vcCurrentPage != 'CybBilling') {
		if (decryptedData.billTo == null) {
			throw new Error('Billing Address not available in visa checkout decrypted payment data from cybersource');
		}
		
		//address line 1 and line 2
		lineItemCtnrAddress.setAddress1(decryptedData.billTo_Address1);
		if (!empty(decryptedData.billTo_Address2)) {
			lineItemCtnrAddress.setAddress2(decryptedData.billTo_Address2);
		}
		
		//country, city, state, post code
		lineItemCtnrAddress.setCity(decryptedData.billTo_City);
		if (!empty(decryptedData.billTo_StateCode)) {
			lineItemCtnrAddress.setStateCode(decryptedData.billTo_StateCode);
		}
		lineItemCtnrAddress.setPostalCode(decryptedData.billTo_PostalCode);
		lineItemCtnrAddress.setCountryCode(decryptedData.billTo_CountryCode);
		
		//phone number 
		if (!empty(decryptedData.billTo_Phone)) {
			lineItemCtnrAddress.setPhone(decryptedData.billTo_Phone);
		}
		
		//company name 
		if (!empty(decryptedData.billTo_Company)) {
			lineItemCtnrAddress.setCompanyName(decryptedData.billTo_Company);
		}
		
		//first name
		lineItemCtnrAddress.setFirstName(decryptedData.billTo_FirstName);
		//last name
		lineItemCtnrAddress.setLastName(decryptedData.billTo_LastName);
	} else {
		//address line 1 and line 2
		lineItemCtnrAddress.setAddress1(lineItemCtnrAddress.address1);
		if (!empty(lineItemCtnrAddress.address2)) {
			lineItemCtnrAddress.setAddress2(lineItemCtnrAddress.address2);
		}
		
		//country, city, state, post code
		lineItemCtnrAddress.setCity(lineItemCtnrAddress.city);
		if (!empty(lineItemCtnrAddress.stateCode)) {
			lineItemCtnrAddress.setStateCode(lineItemCtnrAddress.stateCode);
		}
		lineItemCtnrAddress.setPostalCode(lineItemCtnrAddress.postalCode);
		lineItemCtnrAddress.setCountryCode(lineItemCtnrAddress.countryCode);
		
		//phone number 
		if (!empty(decryptedData.billTo_Phone)) {
			lineItemCtnrAddress.setPhone(lineItemCtnrAddress.phone);
		}
		
		//company name 
		if (!empty(decryptedData.billTo_Company)) {
			lineItemCtnrAddress.setCompanyName(lineItemCtnrAddress.companyName);
		}
		
		//first name
		lineItemCtnrAddress.setFirstName(lineItemCtnrAddress.firstName);
		//last name
		lineItemCtnrAddress.setLastName(lineItemCtnrAddress.lastName);
	}
	return {success:true, lineItemCtnrAddress:lineItemCtnrAddress};
};

/**
* Prepare Visa Checkout Button settings query string from site preferences
*/
function getButtonDisplaySettings()
{
	var BasketMgr = require('dw/order/BasketMgr');
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
	var CommonHelper = require(CybersourceConstants.CS_CORE_SCRIPT+'helper/CommonHelper');
    var cart = BasketMgr.getCurrentBasket();
    var paymentAmount = CommonHelper.CalculateNonGiftCertificateAmount(cart);
    var Countries = require('~/cartridge/scripts/utils/Countries');
	var countryCode = Countries.getCurrent({
        CurrentRequest: {
            locale: request.locale
        }
    }).countryCode;
	var PaymentMgr = require('dw/order/PaymentMgr');
	var applicablePaymentMethods = PaymentMgr.getApplicablePaymentMethods(customer, countryCode, paymentAmount.value);
	var method = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT);
	var isVisaCheckout = (!empty(applicablePaymentMethods) && method && applicablePaymentMethods.contains(method)) ? true : false;
	if (!isVisaCheckout) {
		return {error:true};
	}
	// get the current site
	var currentSite = dw.system.Site.getCurrent();
    
    // image source url
    var imageSource = currentSite.getCustomPreferenceValue('cybVisaButtonImgUrl');
    
    // size
    var imageSize = (null !== currentSite.getCustomPreferenceValue('cybVisaButtonSize')) ? currentSite.getCustomPreferenceValue('cybVisaButtonSize') : null;

    // color
    var imageColor = (null !== currentSite.getCustomPreferenceValue('cybVisaButtonColor')) ? currentSite.getCustomPreferenceValue('cybVisaButtonColor') : null;
    
    // height
    var imageHeight = (null !== currentSite.getCustomPreferenceValue('cybVisaButtonHeight')) ? currentSite.getCustomPreferenceValue('cybVisaButtonHeight') : null;
    
    // width
    var imageWidth = (null !== currentSite.getCustomPreferenceValue('cybVisaButtonWidth')) ? currentSite.getCustomPreferenceValue('cybVisaButtonWidth') : null;

    // brand cards applicable
    var brandCards = (null !== currentSite.getCustomPreferenceValue('cybVisaCardBrands')) ? currentSite.getCustomPreferenceValue('cybVisaCardBrands') : null;
    
    // locale of current request
    var locale = (request.locale === 'default' || request.locale === 'en') ? 'en_US' : request.locale;
    
    // tell Me More Link
    var tellMeMoreLinkActive = currentSite.getCustomPreferenceValue('cybVisaTellMeMoreLinkActive');

    var buttonDisplaySettings = [];
    buttonDisplaySettings.push(imageSource+"?color="+imageColor);
    buttonDisplaySettings.push("size="+imageSize);
    buttonDisplaySettings.push("height="+imageHeight);
    buttonDisplaySettings.push("width="+imageWidth);
    buttonDisplaySettings.push("cardBrands="+brandCards.join(','));
    buttonDisplaySettings.push("locale="+locale);
    return {success:true, ButtonDisplayURL:buttonDisplaySettings.join("&"), TellMeMoreActive:tellMeMoreLinkActive};
}

/**
* Prepare Visa Checkout lightbox launch settings object from site preferences and basket. Mainly used on cart and billing page
* @param cart : dw.order.Basket
* @param requireDeliveryAddress : address required for delivery
*/
function getButtonInitializeSettings(cart,requireDeliveryAddress)
{
	var logger = dw.system.Logger.getLogger('Cybersource');
	
	try {
		
	    if (cart) {
			// return Visa Checkout v.init API object
		    var vinitObject = {};
		    
		    // get the current site
		    var currentSite = dw.system.Site.getCurrent();
		    
		    // load initialization settings from site preferences
		    vinitObject.apikey = currentSite.getCustomPreferenceValue('cybVisaAPIKey');
		    vinitObject.externalProfileId = currentSite.getCustomPreferenceValue('cybVisaExternalProfileId');
		    
		    vinitObject.settings = {};
		    var visaLocale = (request.locale === 'default' || request.locale === 'en') ? 'en_US' : request.locale;
		    vinitObject.settings.locale = visaLocale;
		    vinitObject.settings.countryCode = visaLocale.substr(visaLocale.length-2);
		    
		    vinitObject.settings.shipping = {};
		    
		    //Indicate Delivery Address to be collected from visa checkout, default to true.
		    if (requireDeliveryAddress == null) {
		    	requireDeliveryAddress = true;
		    }
		    vinitObject.settings.shipping.collectShipping = requireDeliveryAddress;
		    	    
		    vinitObject.settings.threeDSSetup = {};
		    vinitObject.settings.threeDSSetup.threeDSActive = currentSite.getCustomPreferenceValue('cybVisaThreeDSActive');
		    vinitObject.settings.threeDSSetup.threeDSSuppressChallenge = currentSite.getCustomPreferenceValue('cybVisaThreeDSSuppressChallenge');
		    
		    vinitObject.settings.payment = {};
		    vinitObject.settings.payment.cardBrands = getSitePreferenceValues(currentSite.getCustomPreferenceValue('cybVisaCardBrands'));
		    
		    vinitObject.settings.dataLevel = 'FULL';
	    
	    	// create the container for payment information
	    	vinitObject.paymentRequest = {};
		    vinitObject.paymentRequest.merchantRequestId = cart.getUUID();
		    vinitObject.paymentRequest.currencyCode = cart.getCurrencyCode();
		    vinitObject.paymentRequest.subtotal = cart.merchandizeTotalNetPrice.value.toFixed(2);
		    vinitObject.paymentRequest.shippingHandling = cart.adjustedShippingTotalPrice.value.toFixed(2);
	
		    // handle tax
		    if (cart.totalTax.value !== 0) {
		    	vinitObject.paymentRequest.tax = cart.totalTax.value.toFixed(2);
		    } else {
		    	vinitObject.paymentRequest.tax = cart.merchandizeTotalTax.value.toFixed(2);
		    }
	
			// handle total
			if (cart.totalGrossPrice.value !== 0) {
		    	vinitObject.paymentRequest.total = cart.totalGrossPrice.value.toFixed(2);
			} else if (cart.totalNetPrice. value !== 0) {
				vinitObject.paymentRequest.total = cart.totalNetPrice.value.toFixed(2);
			} else {
		    	vinitObject.paymentRequest.total = cart.merchandizeTotalNetPrice.value.toFixed(2);
			}
			var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
			var signature = CommonHelper.signedDataUsingHMAC256(cart.getUUID(), dw.system.Site.getCurrent().getCustomPreferenceValue("cybVisaSecretKey"));
		    return {success:true, signature:signature, VInitFormattedString:convertObjectToString(vinitObject, '', 0)};
		} else {
		    return {error:true, errorMsg:'vinit string formation error : empty basket found'};
		}
	} catch(err) {
		logger.error('vinit string formation error: {0}', err.message);
		return {error:true, errorMsg:err.message};
	}
}


/**
 * Validates the PayerAuth information the customer provided with CCAuth request for visacheckout card payment
 * @param lineItemCtnrObj : dw.order.LineItemCtnr
 * @param paymentInstrument : dw.order.PaymentInstrument
 */
function payerAuthValidation(lineItemCtnrObj, paymentInstrument) {
	var orderNo = null !== lineItemCtnrObj.orderNo ? lineItemCtnrObj.orderNo : lineItemCtnrObj.getUUID();
	var PAResponsePARes = request.httpParameterMap.PaRes.value;
	var PAXID = request.httpParameterMap.PAXID.value;
	var transactionId = request.httpParameterMap.processorTransactionId.value != null? request.httpParameterMap.processorTransactionId.value : "";
	
	var VisaCheckoutFacade = require(CybersourceConstants.CS_CORE_SCRIPT+'visacheckout/facade/VisaCheckoutFacade');
	var result = VisaCheckoutFacade.PayerAuthValidationCCAuthRequest(lineItemCtnrObj, PAResponsePARes, paymentInstrument.paymentTransaction.amount, orderNo,transactionId);
	if (result.success) {
		var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
		result = CardHelper.CardResponse(lineItemCtnrObj, paymentInstrument, result.serviceResponse);
		if (result.authorized)
		{
			return {submit: true};
		}
		if (result.review)
		{
			return {review: true};
		}
	}
	var PlaceOrderError = result.PlaceOrderError !== null ? PlaceOrderError : new Status(Status.ERROR, "confirm.error.declined");
	return {fail: true, PlaceOrderError : PlaceOrderError};
}

/**
 * Checks the PayerAuthEnrollment information with CCAuth request for visacheckout card payment
 * @param LineItemCtnrObj : dw.order.LineItemCtnr
 * @param paymentInstrument : dw.order.PaymentInstrument
 * @param orderNo : String
 */
function payerAuthEnroll(lineItemCtnrObj, paymentInstrument, orderNo) {
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var VisaCheckoutFacade = require(CybersourceConstants.CS_CORE_SCRIPT+'visacheckout/facade/VisaCheckoutFacade');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	var result, serviceResponse;
	
	result = VisaCheckoutFacade.PayerAuthEnrollCCAuthRequest(lineItemCtnrObj, paymentInstrument.paymentTransaction.amount, orderNo);
	if (result.error) {
		return result;
	}
	serviceResponse = result.serviceResponse;
	if (CybersourceHelper.getProofXMLEnabled()) {
		var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
		PaymentInstrumentUtils.UpdatePaymentTransactionWithProofXML(paymentInstrument, serviceResponse.ProofXML);
	}
	if (!empty(serviceResponse.AcsURL) && serviceResponse.PAReasonCode === 475) {
		session.privacy.AcsURL = serviceResponse.AcsURL;
        session.privacy.PAReq = serviceResponse.PAReq;
        session.privacy.PAXID = serviceResponse.PAXID;
        session.privacy.order_id = orderNo;
        session.privacy.authenticationTransactionID = serviceResponse.authenticationTransactionID;
		return {payerauthentication:true, serviceResponse:serviceResponse};
	} else {
		var CardHelper = require('~/cartridge/scripts/helper/CardHelper');
	    return CardHelper.CardResponse(lineItemCtnrObj, paymentInstrument, serviceResponse);
	}
}


/**
* Recursively transforms an object into the needed format for Visa to consume it.
* The last two arguments are optional and aid in the recursion.
*/
function convertObjectToString(obj, inStr, numSpaces) {
	// handle defaults
	if (inStr === undefined)
		inStr = '';
	if (numSpaces === undefined)
		numSpaces = 0;
	
	var str = inStr;
	var spaceStr = '';
	for (var i = 0; i < numSpaces; i++) {
		spaceStr += ' ';	
	}
	str += (spaceStr + '{ \r\n');
	for (var key in obj) {
		if (isObjectEmpty(obj[key])) {
			var newObj = obj[key];
				if(key === 'name' || key === 'value' || key === 'nvPair'){
					str += (spaceStr + '  ' + '"' + key + '"' + ": ");
				}else{
					str += (spaceStr + '  ' + key + ": ");	
				}							
				// recursive call for object types
				if (typeof newObj === 'object') {
					if (Array.isArray(newObj)) {
						var arrStr = convertArrayToString(newObj);
						str += arrStr;	
					}
					else {
						var newStr = str;
						str = (convertObjectToString(newObj, newStr, (numSpaces+2)));
					}	
				}
				// handle value types (terminating condition)
				else {
					str += ('"' + newObj + '"');
				}
				str += ',\r\n';
		}
	}
	// remove last comma and white space
	str = str.replace(/,\s*$/, "");
	str += '\r\n' + spaceStr + '}';
	return str;
};

/**
* Checks whether object is empty or not.
*/

function isObjectEmpty(obj) {
	if (obj == null) {
		return false;
	}
	else if (obj.length > 0) {
		return true;	
	}
	else if (typeof obj === 'boolean') {
		return true;	
	}
	// otherwise we have an object, so loop through the properties to check for at least one non-null
	var retval = false;
	for (var key in obj) {
		if (typeof obj[key] === 'object') {
			retval |= isObjectEmpty(obj[key]);
		}
		else if (obj[key] != null) {
			return true;
		}
	}
	return retval;
};

/**
* Converts array to a string.
*/

function convertArrayToString(arr) {
    var arrStr = '[', arrValue;
    for (var i = 0; i< arr.length; i++) {
           if (typeof arr[i] === 'object') {
                  arrValue = convertObjectToString(arr[i]);
           }
           else {
                  arrValue = arr[i];
           }
           
           if(typeof arr[i] === 'object'){
				arrStr += arrValue;
           }else{
				arrStr += '"' + arrValue + '"';
           }
           if (i < (arr.length-1)) {
                  arrStr += ", ";     
           }
    }
    arrStr += ']';
    return arrStr;
};

/**
* Fetches data of the site preferences.
*/
function getSitePreferenceValues(prefs) {
	var arr = [];
	for (var i=0; i<prefs.length; i++) {
		arr.push(prefs[i].valueOf());	
	}	
	return arr;
};
module.exports = {
	CreateLineItemCtnrBillingAddress:createLineItemCtnrBillingAddress,
	CreateLineItemCtnrShippingAddress:createLineItemCtnrShippingAddress,
	GetButtonDisplaySettings:getButtonDisplaySettings,
	GetButtonInitializeSettings:getButtonInitializeSettings,
	Initialize : getInitializeSettings,
	PayerAuthEnroll:payerAuthEnroll,
	PayerAuthValidation:payerAuthValidation
	
}