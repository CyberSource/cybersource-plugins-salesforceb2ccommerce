'use strict';
/**
 * Validates the credit card details for the requested payment.
 * @param accountNumber : String
 * @param cardType : String
 * @param cvnNumber : String
 * @param expiryMonth : String
 * @param expiryYear : String   
 */
 
function CreateCyberSourcePaymentCardObject_UserData(accountNumber, cardType, cvnNumber, expiryMonth, expiryYear)
{
	var errorMsg, errorCode;
	var Card_Object = require('~/cartridge/scripts/cybersource/Cybersource_Card_Object');
    var cardObject = new Card_Object();

	if(!empty(accountNumber))
		cardObject.setAccountNumber(accountNumber);
	else{
		errorCode = "101";
		errorMsg = "Account Number is missing";
		return {error:true, errorCode:errorCode, errorMsg:errorMsg};
	}	

	if(!empty(expiryMonth))
		cardObject.setExpirationMonth(expiryMonth);
	else{
		errorCode = "101";
		errorMsg = "Expiry Month is missing";
		return {error:true, errorCode:errorCode, errorMsg:errorMsg};
	}
	
	if(!empty(expiryYear))
		cardObject.setExpirationYear(expiryYear);
	else{
		errorCode = "101";
		errorMsg = "Expiry Year is missing";
		return {error:true, errorCode:errorCode, errorMsg:errorMsg};
	}
	
	cardObject.setCardType(cardType);
	cardObject.setCvNumber(cvnNumber);
	
	return {success:true, card:cardObject};
}

/**
 * Validates the POS user details details for the requested payment.
 * @param cardPresent : String
 * @param entryMode : String
 * @param catLevel : String
 * @param terminalCapability : String
 * @param terminalID : String
 * @param trackData : String     
 */
 
function CreateCyberSourcePOSObject_UserData(cardPresent, entryMode, catLevel, terminalCapability, terminalID, trackData)
{  
	var errorMsg, errorCode;
	var Pos_Object = require('~/cartridge/scripts/cybersource/Cybersource_POS_Object');
	var posObject = new Pos_Object();
	
	if(!empty(cardPresent) && !empty(entryMode) && !empty(catLevel) && 
			!empty(terminalCapability) && !empty(terminalID)){
		// set card details in pos object
		posObject.setCardPresent( cardPresent );
		// set entry mode in pos object
		posObject.setEntryMode( entryMode );
		// set terminal details in pos object
		posObject.setTerminalCapability( parseInt(terminalCapability) );
		// passed terminal ID is the serial number of POS terminal.
		// fetch configured terminalID for passed serial number from custom object
		// and set the terminalID accordingly in request
		var	customObject = dw.object.CustomObjectMgr.getCustomObject("POS_TerminalMapping", terminalID);
		if(customObject != null){
			posObject.setTerminalID( customObject.custom.terminalID );
		}else{
			return {error:true};
		}
		if(entryMode.equals("swiped"))
			posObject.setTrackData( trackData );
		
		if( !empty(posObject.getTerminalID()) ){
			posObject.setCatLevel( parseInt(catLevel) );
		}
		 return {success:true, posObject:posObject};
	}else{
		return {error:true};
	}
	
}
/**
 * Validates and creates the purchase object with amount and currency for the requested payment.
 * @param amount : Money
 * @param currency : String
 */
function CreateCyberSourcePurchaseTotalsObject_UserData(price, currency)
{  
	var errorMsg, errorCode;
	var PurchaseTotals_Object = require('~/cartridge/scripts/cybersource/Cybersource_PurchaseTotals_Object');
	var purchaseObject = new PurchaseTotals_Object();
	
	if(empty(currency)) {
		currency = dw.system.Site.getCurrent().getDefaultCurrency();
	}
	purchaseObject.setCurrency(currency);

	var StringUtils = require('dw/util/StringUtils');
	var amount : Number = parseFloat(price);
	if(!empty(amount)){
		if(isNaN(amount)){
			errorCode = "102";
			errorMsg = "Amount value is invalid";
			return {error:true, errorCode:errorCode, errorMsg:errorMsg};
		}
		purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amount.valueOf(),"000000.00","en_US"));
	}
	else{
		errorCode = "101";
		errorMsg = "Amount value is missing";
		return {error:true, errorCode:errorCode, errorMsg:errorMsg};
	}
    return {success:true, purchaseObject:purchaseObject};
}

function createPOSTestRequest(){
	var posAuthResponse=null;
	var result,card, purchaseObject, posObject, trackData;
	var cardPresent = session.forms.pos.cardPresent.htmlValue;
	var terminalID = session.forms.pos.terminalID.htmlValue;
	var catLevel = session.forms.pos.catLevel.htmlValue;
	var entryMode = session.forms.pos.entryMode.htmlValue;
	var terminalCapability = session.forms.pos.terminalCapability.htmlValue;
	var currency = session.forms.pos.currency.htmlValue;
	var amount = session.forms.pos.amount.htmlValue;
	var storeLocation = session.forms.pos.storeLocation.htmlValue;
	var pos_ordernumber = 'POS';
	//Check if entry mode is keyed or swiped.
	if (session.forms.pos.entryMode.htmlValue.equals("keyed")) {
		var accountNumber = session.forms.pos.accountNumber.htmlValue;
		var cardType = session.forms.pos.cardType.htmlValue;
		var cvnNumber = session.forms.pos.cvnNumber.htmlValue;
		var expiryMonth = session.forms.pos.expiryMonth.htmlValue;
		var expiryYear = session.forms.pos.expiryYear.htmlValue;
		result = CreateCyberSourcePaymentCardObject_UserData(accountNumber, cardType, cvnNumber, expiryMonth, expiryYear);
		if (result.success) {
			card = result.card;
		}
	} else {
		trackData = session.forms.pos.trackData.htmlValue;
	}
		result = CreateCyberSourcePurchaseTotalsObject_UserData(amount, currency);
	if (result.success) {
		purchaseObject = result.purchaseObject;
		result = CreateCyberSourcePOSObject_UserData(cardPresent, entryMode, catLevel, terminalCapability, terminalID, trackData);
		if (result.success) {
			posObject = result.posObject;
			var TestFacade = require('~/cartridge/scripts/unittesting/facade/TestFacade');
			result = TestFacade.TestPOSAuth(card, purchaseObject, posObject);
			posAuthResponse = result;
			return posAuthResponse;
		}
	}
	return posAuthResponse;
}
/**
 * Authorizes a payment using a credit card. The payment is authorized by using the POS specific processor
 * only and setting the order no as the transaction ID. Customizations may use other processors and custom
 * logic to authorize credit card payment.
 */
function InitiatePOSAuthRequest(args) {
	var result, card, purchaseObject,posObject;
	var pos_ordernumber ='POS';
	if (!empty(args.storeLocation)) {
		if (!(!empty(args.entryMode) && args.entryMode.equals("swiped"))) {
			result = CreateCyberSourcePaymentCardObject_UserData(args.accountNumber, args.cardType, args.cvnNumber, args.expiryMonth, args.expiryYear);
			if (result.error) {return result;} 
			card = result.card;
		}
		result = CreateCyberSourcePurchaseTotalsObject_UserData(args.amount, args.currency);
		if (result.error) {return result;} 
		purchaseObject = result.purchaseObject;
		result = CreateCyberSourcePOSObject_UserData(args.cardPresent, args.entryMode, args.catLevel, args.terminalCapability, args.terminalID, args.trackData);
		if (result.error) {return result;} 
		posObject = result.posObject;
		var POSFacade = require('~/cartridge/scripts/pos/facade/POSFacade');
		return POSFacade.POSAuthRequest(args.storeLocation,pos_ordernumber,card,purchaseObject,posObject);
	}
	return {error:true};
}
/**
 * Process POS response and map to respective objects
 */
function ProcessPOSResponse(serviceResponse){
	
	var responseObject = {};
	responseObject["RequestID"] = serviceResponse.requestID;
	responseObject["RequestToken"] = serviceResponse.requestToken;
	responseObject["MerchantReferenceCode"] = serviceResponse.merchantReferenceCode;
	responseObject["ReasonCode"] = Number(serviceResponse.reasonCode);
	responseObject["Decision"] = serviceResponse.decision;
	responseObject["purchaseTotals"] = (null !== serviceResponse.purchaseTotals) ? "exists" : null;
	if(null !== serviceResponse.purchaseTotals){
		responseObject["PurchaseTotalsCurrency"] = serviceResponse.purchaseTotals.currency;
	}
	responseObject["ccAuthReply"] = (null !== serviceResponse.ccAuthReply) ? "exists" : null;
	if(null !== serviceResponse.ccAuthReply){
		responseObject["AuthorizationAmount"] = serviceResponse.ccAuthReply.amount;
		responseObject["AuthorizationCode"] = serviceResponse.ccAuthReply.authorizationCode;
		responseObject["AuthorizationReasonCode"] = Number(serviceResponse.ccAuthReply.reasonCode);
		responseObject["AVSCode"] = serviceResponse.ccAuthReply.avsCode;
		responseObject["AVSCodeRaw"] = serviceResponse.ccAuthReply.avsCodeRaw;
		responseObject["AuthReplyProcessorResponse"] = serviceResponse.ccAuthReply.processorResponse;
		responseObject["AuthReplyReconciliationID"] = serviceResponse.ccAuthReply.reconciliationID;
		responseObject["AuthReplyPaymentNetworkTransactionID"] = serviceResponse.ccAuthReply.paymentNetworkTransactionID;
		responseObject["AuthReplyCardCategory"] = serviceResponse.ccAuthReply.cardCategory;
		responseObject["AuthReplyCardGroup"] = serviceResponse.ccAuthReply.cardGroup;
	}
	responseObject["ccCaptureReply"] = (null !== serviceResponse.ccCaptureReply) ? "exists" : null;
	if(null !== serviceResponse.ccCaptureReply){
		responseObject["CaptureReplyAmount"] = serviceResponse.ccCaptureReply.amount;
		responseObject["CaptureReplyReasonCode"] = Number(serviceResponse.ccCaptureReply.reasonCode);
		responseObject["CaptureReplyReconciliationID"] = serviceResponse.ccCaptureReply.reconciliationID;
	}
	
	if(!empty(serviceResponse.receiptNumber)){
		responseObject["ReceiptNumber"] = serviceResponse.receiptNumber;
	}
	
	if(!empty(serviceResponse.invalidField)){
		responseObject["InvalidField"] = serviceResponse.invalidField;
	}

	if(!empty(serviceResponse.missingField)){
		responseObject["MissingField"] = serviceResponse.missingField;
	}
	var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
	CommonHelper.LogResponse(serviceResponse.merchantReferenceCode, serviceResponse.requestID, serviceResponse.requestToken, Number(serviceResponse.reasonCode), serviceResponse.decision);
	
	return {success:true, responseObject:responseObject};
}
module.exports = {
		createPOSTestRequest : createPOSTestRequest,
		InitiatePOSAuthRequest : InitiatePOSAuthRequest,
		ProcessPOSResponse : ProcessPOSResponse
};