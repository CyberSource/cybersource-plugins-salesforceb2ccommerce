'use strict';
var Logger = require('dw/system/Logger'),
	CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
/**
 * Handle the DAVReasonCode when unavailable the use ReasonCode. 
 * @param ResponseObject
 * @returns response as authorized, error, declined
 */
function HandleDAVResponse(ResponseObject)
{
	Logger.debug("[CardHelper.js] HandleDAVResponse DAVReasonCode : " + ResponseObject.DAVReasonCode + " ReasonCode : " + ResponseObject.ReasonCode);
	var DAVReasonCode = ResponseObject.ReasonCode;
	if (ResponseObject.DAVReasonCode) {
		DAVReasonCode = ResponseObject.DAVReasonCode;
	}
	switch (DAVReasonCode) {
		case 100:
			return {authorized:true};
		case 101:
		case 102:
		case 450:
		case 451:
		case 452:
		case 453:
		case 454:
		case 455:
		case 456:
		case 457:
		case 458:
		case 459:
		case 460:	
			return {declined:true};
		default:
			return {error:true};
	}
}

/**
 * Process the Card Service Response to create responseObject. 
 * @param serviceResponse
 * @returns response as authorized, error, declined
 */
function ProcessCardAuthResponse(serviceResponse, shipTo, billTo)
{
	var responseObject = {};
	responseObject["RequestID"] = serviceResponse.requestID;
	responseObject["RequestToken"] = serviceResponse.requestToken;
	responseObject["ReasonCode"] = Number(serviceResponse.reasonCode);
	responseObject["Decision"] = serviceResponse.decision;
	responseObject["ccAuthReply"] = (null !== serviceResponse.ccAuthReply) ? "exists" : null;
	if(!empty(serviceResponse.paySubscriptionCreateReply) && !empty(serviceResponse.paySubscriptionCreateReply.subscriptionID)){
		responseObject["SubscriptionID"] = serviceResponse.paySubscriptionCreateReply.subscriptionID;
	}	
	
	if(null !== serviceResponse.ccAuthReply){
		responseObject["AuthorizationAmount"] = serviceResponse.ccAuthReply.amount;
		responseObject["AuthorizationCode"] = serviceResponse.ccAuthReply.authorizationCode;
		responseObject["AuthorizationReasonCode"] = Number(serviceResponse.ccAuthReply.reasonCode);
	}	
	
	/**********************************************/
	/* DAV-related WebService response processing */
	/**********************************************/
	if( !empty(serviceResponse.missingField) ) {
		responseObject["MissingFieldsArray"] = serviceResponse.missingField;
	}
	if( !empty(serviceResponse.invalidField) ) {
		responseObject["InvalidFieldsArray"] = serviceResponse.invalidField;
	}	
	if(null !== serviceResponse.davReply){
		responseObject["DAVReasonCode"] = Number(serviceResponse.davReply.reasonCode);
		
		if( !empty(serviceResponse.davReply.standardizedAddress1) ) {
			var stdAddress  = {};
			stdAddress.firstName = shipTo.firstName;
			stdAddress.lastName = shipTo.lastName;
			stdAddress.address1 = serviceResponse.davReply.standardizedAddress1;
			stdAddress.address2 = serviceResponse.davReply.standardizedAddress2;
			stdAddress.city = serviceResponse.davReply.standardizedCity;
		if("CsCorrectShipState" in dw.system.Site.getCurrent().getPreferences().getCustom() && dw.system.Site.getCurrent().getCustomPreferenceValue("CsCorrectShipState") === false) {
			stdAddress.state = shipTo.state;
		} else {
			stdAddress.state = serviceResponse.davReply.standardizedState;
		}
		//The second fix addressed the issue for Gift Certs when there is no shipto info:
			if("CsCorrectShipState" in dw.system.Site.getCurrent().getPreferences().getCustom() && dw.system.Site.getCurrent().getCustomPreferenceValue("CsCorrectShipState") === true) {
			stdAddress.state = serviceResponse.davReply.standardizedState;
			} else if(!empty(shipTo.state)) {
			stdAddress.state = shipTo.state;
		} else {
			stdAddress.state = billTo.state;
		}
			stdAddress.postalCode = serviceResponse.davReply.standardizedPostalCode;
			//Fix for CYB-91: DAV Country code 
			stdAddress.country = serviceResponse.davReply.standardizedISOCountry;
			responseObject["StandardizedAddress"] = stdAddress;
		}
	}
	/* End of DAV response processing */
	
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	CommonHelper.LogResponse(serviceResponse.merchantReferenceCode, serviceResponse.requestID, serviceResponse.requestToken, Number(serviceResponse.reasonCode), serviceResponse.decision);
	
	return {success:true, responseObject:responseObject};
}


/**
 * Handle the Card ReasonCode. 
 * @param ResponseObject
 * @returns response as authorized, error, declined
 */
function HandleCardResponse(ResponseObject)
{
	Logger.debug("[CardHelper.js] HandleDAVResponse ReasonCode : " + ResponseObject.ReasonCode);
	switch(Number(ResponseObject.ReasonCode))
	{
		case 100:
			return {authorized: true};
		
		case 101:
		case 102:
		case 231:
		case 202:
				return {declined: true};
			
		case 150:
		case 151:
		case 152:
		case 234:
		case 481:
		case 400:
		case 999:
			return {error: true};
		
		case 480:
			return {review: true};
		
		default:
			return {declined: true};
	}
}

/**
 * Write in debug log request object for card auth service for sandboxes only when sitepref CsDebugCybersource is true. 
 * @param serviceRequest
 * @param orderNo
 * @returns response as authorized, error, declined
 */
function writeOutDebugLog(serviceRequest, orderNo : String)
{
	// Do not allow debug logging on production.
	if (!dw.system.Logger.isDebugEnabled() || dw.system.System.getInstanceType() !== dw.system.System.DEVELOPMENT_SYSTEM) return;

	var debug : Boolean = dw.system.Site.getCurrent().getCustomPreferenceValue("CsDebugCybersource");
	if( debug )
	{
		var log : dw.system.Log = dw.system.Logger.getLogger("CsDebugCybersource");
		log.debug("REQUEST DATA SENT TO CYBERSOURCE");
		log.debug("billTo.firstName {0}", serviceRequest.billTo.firstName);
		log.debug("billTo.lastName {0}", serviceRequest.billTo.lastName);
		log.debug("billTo.street1 {0}", serviceRequest.billTo.street1);
		log.debug("billTo.city {0}", serviceRequest.billTo.city);
		log.debug("billTo.state {0}", serviceRequest.billTo.state);
		log.debug("billTo.postalCode {0}", serviceRequest.billTo.postalCode);
		log.debug("billTo.country {0}", serviceRequest.billTo.country);
		log.debug("shipTo.firstName {0}", serviceRequest.shipTo.firstName);
		log.debug("shipTo.lastName {0}", serviceRequest.shipTo.lastName);
		log.debug("shipTo.street1 {0}", serviceRequest.shipTo.street1);
		log.debug("shipTo.city {0}", serviceRequest.shipTo.city);
		log.debug("shipTo.state {0}", serviceRequest.shipTo.state);
		log.debug("shipTo.postalCode {0}", serviceRequest.shipTo.postalCode);
		log.debug("shipTo.country {0}", serviceRequest.shipTo.country);
		log.debug("Currency {0}", serviceRequest.purchaseTotals.currency);
		log.debug("grandTotalAmount {0}", serviceRequest.purchaseTotals.grandTotalAmount);
		
	}
}

/**
 * On basis of formType card object data is updated like firstname,lastname,cad details etc.
 * @param formType : can hold value like subscription,billing or paymentinstruments.
 */

function CreateCybersourcePaymentCardObject(formType : String, SubscriptionID : String)
{
	var fullName, accounNumber, cardType, expiryMonth, expiryYear, cvnNumber, subscriptionToken, firstName, lastName;
	var cc = session.forms.billing.paymentMethods.creditCard;
    var cardObject;
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	
	switch( formType )
	{
		case "subscription": 
				 fullName = session.forms.subscription.firstName.htmlValue +" " + session.forms.subscription.lastName.htmlValue;
				 accounNumber = session.forms.subscription.accountNumber.htmlValue;
				 cardType = session.forms.subscription.cardType.htmlValue;
				 expiryMonth = session.forms.subscription.expiryMonth.htmlValue;
				 expiryYear = session.forms.subscription.expiryYear.htmlValue;
				 cvnNumber = session.forms.subscription.cvnNumber.htmlValue;
			break;
		case "billing": 
				 firstName = session.forms.billing.billingAddress.addressFields.firstName.value;
				 lastName = session.forms.billing.billingAddress.addressFields.lastName.value;
				 fullName = !empty(firstName) ? firstName +" " + lastName : null;
				 accounNumber = session.forms.billing.paymentMethods.creditCard.number.value;
				 cardType = session.forms.billing.paymentMethods.creditCard.type.value;
				 expiryMonth =""+session.forms.billing.paymentMethods.creditCard.expiration.month.value;
				 expiryYear = ""+session.forms.billing.paymentMethods.creditCard.expiration.year.value;
				 cvnNumber = session.forms.billing.paymentMethods.creditCard.cvn.value;
				 if (SubscriptionID && !empty(SubscriptionID)) {
				 	 subscriptionToken = SubscriptionID;
				 } else {
				 subscriptionToken = CommonHelper.GetSubscriptionToken( session.forms.billing.paymentMethods.creditCard.selectedCardID.value, customer);
				 }
			break;
		case "paymentinstruments": 
				 firstName = session.forms.paymentinstruments.creditcards.address.firstname.value;
				 lastName = session.forms.paymentinstruments.creditcards.address.lastname.value;
				 accounNumber = session.forms.paymentinstruments.creditcards.newcreditcard.number.value;
				 cardType = ""+session.forms.paymentinstruments.creditcards.newcreditcard.type.value;
				 expiryMonth =""+session.forms.paymentinstruments.creditcards.newcreditcard.expiration.month.value;
				 expiryYear = ""+session.forms.paymentinstruments.creditcards.newcreditcard.expiration.year.value;
				 cvnNumber = session.forms.paymentinstruments.creditcards.newcreditcard.cvn.value;
				 subscriptionToken = CommonHelper.GetSubscriptionToken( session.forms.paymentinstruments.creditcards.newcreditcard.selectedCardID.value, customer);
			break;
	}
	if (!empty(cardType)) {
		var Card_Object = require('~/cartridge/scripts/cybersource/Cybersource_Card_Object');
		cardObject = new Card_Object();
		if (empty(subscriptionToken)) {
			cardObject.setAccountNumber(accounNumber);
		}
		cardObject.setFullName(fullName);
		cardObject.setExpirationMonth(expiryMonth);
		cardObject.setExpirationYear(expiryYear);
		cardObject.setCvNumber(cvnNumber);
		cardObject.setCardType(returnCardType(cardType));
	}
	    return {success:true, card: cardObject};
}
/**
 * Returns the value of the on basis of card type
 * @param cardType : String value like Visa,mastercard,amex etc
 */
function returnCardType (cardType : String) : String {
	var cardTypeNew = "";
	if (cardType) {
		switch(cardType.toLowerCase()){
			case "visa": 
				cardTypeNew="001";
				break;
			case "mastercard": 
				cardTypeNew="002";
				break;
			case "amex": 
				cardTypeNew="003";
				break;
			case "discover": 
				cardTypeNew="004";
				break;
			case "maestro": 
				cardTypeNew="042";
				break;
			case 'jcb':
                cardTypeNew ="007";
                break;
            case 'dinersclub':
                cardTypeNew ="005";
                break;
		}
	}
	return cardTypeNew;
}

/**
 * Sets currency and amount in purchase object.
 * @param currency : Currency of the site
 * @param amount : purchasable amount 
 */
 
 function CreateCyberSourcePurchaseTotalsObject_UserData(currency : String,amount : String)
{  
	var currency = currency;
	var PurchaseTotals_Object = require('~/cartridge/scripts/cybersource/Cybersource_PurchaseTotals_Object');
    var purchaseObject = new PurchaseTotals_Object();
    purchaseObject.setCurrency(currency);
	amount = parseFloat(amount);
	var StringUtils = require('dw/util/StringUtils');
	purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amount.valueOf(),"000000.00","en_US"));
    return {success:true, purchaseTotals: purchaseObject};
}

/**
 * Returns the boolean variable if payer auth is available for the requested card type
 * @param cardType : String value like Visa,mastercard,amex etc
 */

function PayerAuthEnable(cardType:String)
{
	var paymentMethod = dw.order.PaymentMgr.getPaymentMethod(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
	if(null===paymentMethod) {return {error:true, errorMsg:'Payment method CREDIT_CARD not found'};}
	var paymentCard;
	var paymentCardList = paymentMethod.getActivePaymentCards();
	var iter = paymentCardList.iterator();
	while(iter.hasNext())
	{
		paymentCard = iter.next();
		if(paymentCard.cardType===cardType) {
			break;
		}
		paymentCard=null;
	}
	if(null===paymentCard) {return {error:true, errorMsg:'Card type match not found'};}
	
    return {success:true, paEnabled : paymentCard.custom.csEnablePayerAuthentication};
}

/**
 * Returns the payment instrument which is not a gift certificate/ gift card type
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */
function getNonGCPaymemtInstument(lineItemCtnr : dw.order.LineItemCtnr) {
	var paymentInstruments : dw.util.Collection = lineItemCtnr.getPaymentInstruments();
	if( paymentInstruments.size() > 0 ) {
	    for each (var paymentInstrument : dw.order.PaymentInstrument in paymentInstruments) 
	    {
	 	   		// For GC we need to create an array of objects to be passed to PayeezyFacade-PaymentAuthorize.
	           if(!"GIFT_CERTIFICATE".equalsIgnoreCase(paymentInstrument.paymentMethod) )
	           {
	        	   
	           	     return paymentInstrument;
	           }
	           
	
	 	  }
	}
}

/**
 * Returns the value of card type on basis of card value.
 * @param cardTypeValue : String value like 001,002,003etc
 */

function getCardType( cardTypeValue : String ) {
	var cardType :String  = "Visa";
	switch(cardTypeValue) {
				case "001": 
					cardType="Visa";
					break;
				case "002": 
					cardType="MasterCard";
					break;
				case "003": 
					cardType="Amex";
					break;
				case "004": 
					cardType="Discover";
					break;
				case "042": 
					cardType="Maestro";
					break;
				case '005':
					cardType = 'DinersClub';
					break;
				case '007':
					cardType = 'JCB';
					break;
				default:
					cardType = '';
			} 
	return cardType;
	}

/**
 * If debug value id true then the response is printed in logs.
 * @param serviceResponse : Response from the service
 */
 
function protocolResponse( serviceResponse )
{
	var debug : Boolean = dw.system.Site.getCurrent().getCustomPreferenceValue("CsDebugCybersource");
	if( true || debug )
	{
		var HashMap = require('dw/util/HashMap');
		var arr = new HashMap();
		var xx;
		for ( xx in serviceResponse )
		{
			arr.put( xx, serviceResponse[xx] );
		}
		for ( xx in serviceResponse.payPalPaymentReply )
		{
			trace( "checking " + xx );
			try
			{
				arr.put( "PayPalPaymentReply." + xx, serviceResponse.payPalPaymentReply[xx] );
			}
			catch ( exception )
			{
				arr.put( "PayPalPaymentReply." + xx, " caused ex " + exception );
			}
		}
		
		var nullList =[];
		var qq;
		var iter;
		var retMap = new HashMap();
		for ( iter = arr.keySet().iterator(); iter.hasNext(); )
		{
			qq = iter.next();
			if ( arr.get( qq ) == null )
			{
				nullList.push( qq );
			} 
			else
			{
				retMap.put( qq, arr.get( qq ) );
			}
		} 
		if ( qq.length > 0 )
		{
			retMap.put( "<<NullList>>", nullList ); 
		}
		return retMap;
	}
}

/**
 * Card Response for processing service response
 * @param order
 * @param paymentInstrument
 * @param serviceResponse
 * @returns
 */
function CardResponse(order, paymentInstrument, serviceResponse) {
	//response validate
	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
	var CybersourceHelper = libCybersource.getCybersourceHelper();
	if (!(CybersourceHelper.getDavEnable() && CybersourceHelper.getDavOnAddressVerificationFailure()==='REJECT'
		&& serviceResponse.ReasonCode!==100 && !empty(serviceResponse.DAVReasonCode) && serviceResponse.DAVReasonCode!==100)) {
		//simply logging detail response not utilized
		HandleDAVResponse(serviceResponse);
		if (serviceResponse.AVSCode === 'N') {
			//returns response based on AVS result to be ignored or not
			if (true === CybersourceHelper.getAvsIgnoreResult()) {
				return {review:true};
			}
			return {declined:true};
		}
		
		//order payment transaction updates
		var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
		var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');
		PaymentInstrumentUtils.UpdatePaymentTransactionCardAuthorize(paymentInstrument, serviceResponse);
		if (serviceResponse.StandardizedAddress && (serviceResponse.ReasonCode === "100" || serviceResponse.ReasonCode === "480")) {
			CommonHelper.UpdateOrderShippingAddress(serviceResponse.StandardizedAddress, order, session.forms.singleshipping.shippingAddress.useAsBillingAddress.value);
		}
		if (serviceResponse.ReasonCode === "100" || serviceResponse.ReasonCode === "480") {
			var secureAcceptanceHelper = require(CybersourceConstants.SECUREACCEPTANCEHELPER);
			secureAcceptanceHelper.AddOrUpdateToken(paymentInstrument, customer.authenticated?customer:null);
		}
		//returns response as authorized, error, declined based on ReasonCode
		return HandleCardResponse(serviceResponse);
	}
	//returns response as authorized, error, declined based on DAVReasonCode or ReasonCode
	return HandleDAVResponse(serviceResponse);
}

module.exports = {
		CreateCyberSourcePurchaseTotalsObject_UserData: CreateCyberSourcePurchaseTotalsObject_UserData,
		CreateCybersourcePaymentCardObject : CreateCybersourcePaymentCardObject,		
		CardResponse : CardResponse,
		PayerAuthEnable: PayerAuthEnable,
		HandleDAVResponse : HandleDAVResponse,
		HandleCardResponse : HandleCardResponse,
		ProcessCardAuthResponse:ProcessCardAuthResponse,
		writeOutDebugLog:writeOutDebugLog,
		protocolResponse: protocolResponse,
		getNonGCPaymemtInstument : getNonGCPaymemtInstument,
		getCardType:getCardType, 
		ReturnCardType:returnCardType
};