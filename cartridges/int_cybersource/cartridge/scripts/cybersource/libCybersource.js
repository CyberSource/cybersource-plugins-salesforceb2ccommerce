/**
 *
 * A library file for Cybersource communication.
 * This file is included by several script nodes using:
 *
 *
 * It cannot be used in a script node by itself.
 *
 */
var Site = require('dw/system/Site');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var app = require(CybersourceConstants.APP);

var numbersOnlyRegExp : RegExp = /\D/g;
var CybersourceHelper = {
	csReference : webreferences2.CyberSourceTransaction,

	getMerchantID : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsMerchantId");
	},
	getMerhcantCredentials :function(paymentMethod){
		var PaymentMgr = require('dw/order/PaymentMgr');
		var merchantCredentials ={};
		if(!empty(paymentMethod)){
			 paymentMethod = PaymentMgr.getPaymentMethod(paymentMethod);
			 if(!empty(paymentMethod.custom.merchantID) && !empty(paymentMethod.custom.merchantKey)){
			 	merchantCredentials.merchantID = paymentMethod.custom.merchantID;
			 	merchantCredentials.merchantKey = paymentMethod.custom.merchantKey;
			 }else{
				merchantCredentials.merchantID =Site.getCurrent().getCustomPreferenceValue("CsMerchantId");
				merchantCredentials.merchantKey = Site.getCurrent().getCustomPreferenceValue("CsSecurityKey");
			 }
		}else{
			merchantCredentials.merchantID =Site.getCurrent().getCustomPreferenceValue("CsMerchantId");
			merchantCredentials.merchantKey = Site.getCurrent().getCustomPreferenceValue("CsSecurityKey");
		}
		return merchantCredentials;
	},
	getSoapSecurityKey : function() {
		return Site.getCurrent().getCustomPreferenceValue("CsSecurityKey");
	},

	getEndpoint : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsEndpoint") === null ? "" : Site.getCurrent().getCustomPreferenceValue("CsEndpoint").toString();
	},

	getDefaultShippingMethodTaxCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsDefaultShippingMethodTaxCode");
	},

	getPartnerSolutionID : function () {
		return "Q5FY4BNS";
	},

	getDeveloperID : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsDeveloperID");
	},

	getDefaultCouponTaxCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsDefaultCouponTaxCode");
	},

	getDefaultProductTaxCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsDefaultProductTaxCode");
	},

	getAvsIgnoreResult : function() {
		return Site.getCurrent().getCustomPreferenceValue("CsAvsIgnoreResult");
	},

	getAvsDeclineFlags : function() {
		return Site.getCurrent().getCustomPreferenceValue("CsAvsDeclineFlags");
	},

	getDavEnable : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsDavEnable");
	},

	getCardDecisionManagerEnable : function () {
		return Site.getCurrent().getCustomPreferenceValue("csCardDecisionManagerEnable");
	},

	getBankTransferDecisionManagerFlag: function () {
        return Site.getCurrent().getCustomPreferenceValue('IsBankTransferDMEnabled');
    },

	getDavOnAddressVerificationFailure : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsDavOnAddressVerificationFailure");
	},

	getShipFromCity : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsShipFromCity");
	},

	getShipFromStateCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsShipFromStateCode");
	},

	getShipFromZipCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsShipFromZipCode");
	},

	getShipFromCountryCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsShipFromCountryCode");
	},

	getPOACity : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsPoaCity");
	},

	getPOAStateCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsPoaStateCode");
	},

	getPOAZipCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsPoaZipCode");
	},

	getPOACountryCode : function () {
		return Site.getCurrent().getCustomPreferenceValue("CsPoaCountryCode");
	},

	getPOOCity : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPooCity");
	},

	getPOOStateCode : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPooStateCode");
	},

	getPOOZipCode : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPooZipCode");
	},

	getPOOCountryCode : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPooCountryCode");
	},

	getPAMerchantID : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPaMerchantId");
	},
	getPASaveParesStatus : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPaSaveParesStatus");
	},
	getPAMerchantName : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPaMerchantName");
	},

	getDigitalFingerprintOrgId : function (){
		return Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId');
	},

	getDigitalFingerprintJetmetrixLocation : function (){
		return Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation');
	},

	getDigitalFingerprintEnabled : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsDeviceFingerprintEnabled");
	},
	getTokenizationEnabled : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsTokenizationEnable").value;
	},
	getProofXMLEnabled : function (){
		return Site.getCurrent().getCustomPreferenceValue("CsPaEnableProofXML");
	},
	getAlipayPaymentType : function (){
		return Site.getCurrent().getCustomPreferenceValue("apPaymentType");
	},
	getTestAlipayReconciliationID : function (){
		return Site.getCurrent().getCustomPreferenceValue("apTestReconciliationID");
	},
	getTestWeChatReconciliationID: function () {
        return Site.getCurrent().getCustomPreferenceValue('apTestWeChatReconciliationID');
    },
	getPaypalSandboxUrl : function(){
		return Site.getCurrent().getCustomPreferenceValue("CsPaypalSandboxURL");
	},
	getPaypalLocale : function(){
		return Site.getCurrent().getCustomPreferenceValue("CsPaypalLc");
	},
	getPaypalPayFlowColor :function(){
		return Site.getCurrent().getCustomPreferenceValue("CsPaypalPayflowcolor");
	},
	IsPaypalConfirmShipping :function(){
		return Site.getCurrent().getCustomPreferenceValue("CsPaypalReqconfirmshipping");
	},
	getPaypalHeaderBrdrColor :function(){
		return Site.getCurrent().getCustomPreferenceValue("CsPaypalHdrbordercolor");
	},
	getPaypalPageStyle :function(){
		return Site.getCurrent().getCustomPreferenceValue("CsPaypalPagestyle");
	},
	getPaypalHeaderBckGroundColor :function(){
	 return Site.getCurrent().getCustomPreferenceValue("CsPaypalHdrbackcolor");
	},
	IsPaypalAddressOverride :function(){
	 return Site.getCurrent().getCustomPreferenceValue("CsPaypalAddressOverride");
	},
	IsPaypalNoShipping :function(){
	 return Site.getCurrent().getCustomPreferenceValue("CsPaypalNoshipping");
	},
	getPaypalLogoImage :function(){
	 return Site.getCurrent().getCustomPreferenceValue("CsPaypalLogoimg");
	},
	getPaypalHeaderImage :function(){
	 return Site.getCurrent().getCustomPreferenceValue("CsPaypalHdrimg");
	},
	IsPaypalRequestBillingAddress :function(){
	 return Site.getCurrent().getCustomPreferenceValue("CsRequestBillingAddress");
	},
	getPaypalPaymentOption :function (){
	 return Site.getCurrent().getCustomPreferenceValue("CsPaypalPaymentOption");
	},
	getCsServiceRequestTimeout : function (){
		return Site.getCurrent().getCustomPreferenceValue("csServiceRequestTimeout");
	},
	getMasterCardAuthIndicator : function (){
		return Site.getCurrent().getCustomPreferenceValue("csMasterCardAuthIndicator");
	},
	getCruiseCredentialsApiKey : function (){
		return Site.getCurrent().getCustomPreferenceValue("CruiseApiKey");
	},
	getCruiseCredentialsApiIdentifier : function (){
	   	return Site.getCurrent().getCustomPreferenceValue("CruiseApiIdentifier");
	},
	getCruiseCredentialsOrgUnitId : function (){
		return Site.getCurrent().getCustomPreferenceValue("CruiseOrgUnitId");
	},
    getCruiseCredentialsName : function (){
        return Site.getCurrent().getCustomPreferenceValue("CruiseMerchantName");
    },
    getLimitSavedCardRate : function () {
        return Site.getCurrent().getCustomPreferenceValue("LimitSavedCardRate");
    },
    getSavedCardLimitTimeFrame : function () {
        return Site.getCurrent().getCustomPreferenceValue("SavedCardLimitTimeFrame");
    },
    getSavedCardLimitFrame : function () {
        return Site.getCurrent().getCustomPreferenceValue("SavedCardLimitFrame");
    },
    getTransactionTimeOut : function () {
    	return Site.getCurrent().getCustomPreferenceValue("WeChatTransactionTimeout");
    },
     getNumofCheckStatusCalls : function () {
    	return Site.getCurrent().getCustomPreferenceValue("NumofCheckStatusCalls");
    },
     getServiceCallInterval : function () {
    	return Site.getCurrent().getCustomPreferenceValue("CheckStatusServiceInterval");
    },
	/*****************************************************************************
	 * Name: getNexus
	 * Description: Returns the Nexus site preference.
	 ****************************************************************************/
	getNexus : function() {

		var nexusList : dw.util.Collection	= Site.getCurrent().getCustomPreferenceValue('CsNexus');
		var nexus : String			= '';
		var nexusCount : Number		= 0;

		for each(var nexusEntry : String in nexusList) {

			if(!empty(nexusEntry)) {

				nexus += nexusCount > 0 ? ', ' : '';
				nexus += nexusEntry;
				nexusCount++;
			}
		}
		return nexus;
	},

	/*****************************************************************************
	 * Name: getNoNexus
	 * Description: Returns the NoNexus site preference.
	 *****************************************************************************/
	getNoNexus : function() {

		var noNexusList : dw.util.Collection	= Site.getCurrent().getCustomPreferenceValue('CsNoNexus');
		var noNexus : String			= '';
		var noNexusCount : Number		= 0;

		for each(var noNexusEntry : String in noNexusList) {

			if(!empty(noNexusEntry)) {

				noNexus += noNexusCount > 0 ? ', ' : '';
				noNexus += noNexusEntry;
				noNexusCount++;
			}

		}

		return noNexus;
	},


	 setEndpoint : function (service : dw.ws.Port)
	 {
		var endpoint = CybersourceHelper.getEndpoint();
		var Logger = dw.system.Logger.getLogger('Cybersource');
		Logger.debug('Connection to system "{0}"',endpoint);
		var Port = require('dw/ws/Port');
        var WSUtil = require('dw/ws/WSUtil');

		switch ( endpoint ) {
			case "Production":
				WSUtil.setProperty(Port.ENDPOINT_ADDRESS_PROPERTY,'https://ics2wsa.ic3.com/commerce/1.x/transactionProcessor', service);
				break;
			case "Test" :
				WSUtil.setProperty(Port.ENDPOINT_ADDRESS_PROPERTY,'https://ics2wstesta.ic3.com/commerce/1.x/transactionProcessor', service);
				break;
			default:
				throw "Undefined Cybersource Endpoint \"" + endpoint + "\"";
		}
	},

	/*****************************************************************************
	 * request  : Object,
	 * vc_orderID  : String   - visa checkout  callID
	 *****************************************************************************/
	addVCOrderID : function(request : Object, vc_orderID : String)
	{
		var request_vc : Object = new CybersourceHelper.csReference.VC();
		request_vc.orderID = vc_orderID;
		request.vc = request_vc;
	},
	/*****************************************************************************
	 * request  : Object,
	 * refCode  : String   - Basket.UUID
	 * wrappedKey  : String   - wrappedKey
	 * refCode  : Blob   - large blob object
	 *****************************************************************************/
	addVCDecryptRequestInfo : function(request : Object, refCode : String, wrappedKey, data)
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		request.paymentSolution='visacheckout';
		__setClientData( request, refCode , null );
		var request_encryptedPayment : Object = new CybersourceHelper.csReference.EncryptedPayment();
		request_encryptedPayment.wrappedKey = wrappedKey;
		request_encryptedPayment.data = data;
		request.encryptedPayment = request_encryptedPayment;
		request.decryptVisaCheckoutDataService = new CybersourceHelper.csReference.DecryptVisaCheckoutDataService();
		request.decryptVisaCheckoutDataService.run = true;
	},
	/*****************************************************************************
	 * request  : Object,
	 * refCode  : String   - Basket.UUID or orderNo
	 * wrappedKey  : String   - wrappedKey
	 * refCode  : Blob   - large blob object
	 *****************************************************************************/
	addVCAuthRequestInfo : function(request : Object, refCode : String, wrappedKey, data)
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		request.paymentSolution='visacheckout';
		__setClientData( request, refCode , null );
		var request_encryptedPayment : Object = new CybersourceHelper.csReference.EncryptedPayment();
		request_encryptedPayment.wrappedKey = wrappedKey;
		request_encryptedPayment.data = data;
		request.encryptedPayment = request_encryptedPayment;
	},
	/*****************************************************************************
	 * request  : Object,
	 * refCode  : String   - Basket.UUID or orderNo
	 * refCode  : Blob   - large blob object
	 *****************************************************************************/
	addMobilePaymentAPIAuthRequestInfo : function(request : Object, refCode : String, data)
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		request.paymentSolution='001';
		__setClientData( request, refCode , null );
		var request_encryptedPayment : Object = new CybersourceHelper.csReference.EncryptedPayment();
		request_encryptedPayment.descriptor = 'RklEPUNPTU1PTi5BUFBMRS5JTkFQUC5QQVlNRU5U';
		request_encryptedPayment.data = data;
		request.encryptedPayment = request_encryptedPayment;
	},
	/*****************************************************************************
	 * request  : Object,
	 * refCode  : String   - Basket.UUID or orderNo
	 * refCode  : Blob   - large blob object
	 *****************************************************************************/
	addMobilePaymentInAppAuthRequestInfo : function(request, authRequestParams)
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		var CybersourceConstants = require('../utils/CybersourceConstants');
		request.paymentSolution = (authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay ? '001' : '006');
		__setClientData( request, authRequestParams.orderNo , null );
		var request_paymentNetworkToken : Object = new CybersourceHelper.csReference.PaymentNetworkToken();
		request_paymentNetworkToken.transactionType = "1";
		request.paymentNetworkToken = request_paymentNetworkToken;
	},
	/*****************************************************************************
	 * request  : Object,
	 * billTo   : BillTo_Object,
	 * shipTo   : ShipTo_Object,
	 * purchase : PurchaseTotals_Object,
	 * card     : Card_Object,
	 * refCode  : String   - Basket.UUID
	 *****************************************************************************/
	addCCAuthRequestInfo : function(request , billTo , shipTo , purchase , card , refCode  , enableDeviceFingerprint , itemsCybersource)
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		var fingerprint : String  = null;
		if (enableDeviceFingerprint) {
		  fingerprint =  session.sessionID;
		}

		__setClientData( request, refCode , fingerprint );
		if (null !== billTo) {
			request.billTo = __copyBillTo( billTo );
		}
		request.shipTo = __copyShipTo( shipTo );
		request.purchaseTotals = __copyPurchaseTotals( purchase );
		if (!empty(card)) {
			if (empty(card.getCreditCardToken())){
				if(!empty(session.forms.billing.paymentMethods.creditCard.flexresponse.value) && app.getForm('billing').object.paymentMethods.creditCard.saveCard.value == false && session.forms.billing.paymentMethods.selectedPaymentMethodID.value.equals(CybersourceConstants.METHOD_SA_FLEX)){
				    request.tokenSource = new CybersourceHelper.csReference.TokenSource();
					request.tokenSource.transientToken = session.forms.billing.paymentMethods.creditCard.flexresponse.value;
				} else {
					request.card = __copyCreditCard( card );
				}
			} else {
				var request_card : Object = new CybersourceHelper.csReference.Card();
				var value : String;
				for ( var name : String in card)
				{
					if(name.indexOf("set") === -1 && name.indexOf("get") === -1 && name.indexOf("CardToken") === -1 && name.indexOf("accountNumber") === -1)
					{
						value = card[name];
						if(value !== "")
						{
							request_card[name] = value;
						}
					}
				}
				request.card = request_card;
			}

			if (!empty(request.card) && request.card.cardType.equals("002")) {
				var mastercardAuthIndicator : String = CybersourceHelper.getMasterCardAuthIndicator();
				if(!empty(mastercardAuthIndicator) && mastercardAuthIndicator==='0')
				{
					request.authIndicator=0;
				} else if (!empty(mastercardAuthIndicator) && mastercardAuthIndicator==='1') {
					request.authIndicator=1;
				}
			}
		} else {
			request.tokenSource = new CybersourceHelper.csReference.TokenSource();
			request.tokenSource.transientToken = session.forms.billing.paymentMethods.creditCard.flexresponse.value;
		}

		var items = [];
		if(null!==itemsCybersource)
		{
			var iter : dw.util.Iterator = itemsCybersource.iterator();
			while(iter.hasNext())
			{
				items.push(__copyItemFrom(iter.next()));
			}
		}

		request.item = items;

		request.decisionManager = new CybersourceHelper.csReference.DecisionManager();
		if (CybersourceHelper.getCardDecisionManagerEnable()) {
			request.decisionManager.enabled=true;
		} else {
			request.decisionManager.enabled=false;
		}
		//CMCIC
        request.cardTypeSelectionIndicator = '1';
		request.ccAuthService = new CybersourceHelper.csReference.CCAuthService();
		// eslint-disable-next-line
		if (session.custom.SCA === true) {
			request.ccAuthService.paChallengeCode = '04';
		}
		request.ccAuthService.run = true;
	},


	/*****************************************************************************
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * card     : Card_Object,
	 * pos		: Pos_Object
	 * refCode  : String
	 *****************************************************************************/
	addPOSAuthRequestInfo : function(request : Object, location : String, purchase : Object, card : Object , refCode : String , enableDeviceFingerprint : Boolean, pos : Object)
	{

		request.merchantID = CybersourceHelper.getPosMerchantID(location);

		var fingerprint : String  = null;
		if (enableDeviceFingerprint) {
		  fingerprint =  session.sessionID;
		}

		__setClientData( request, refCode , fingerprint );

		if(!empty(pos) && !empty(pos.getEntryMode()) && pos.getEntryMode().equals("keyed")){
			request.card	= __copyCreditCard( card );
		}

		request.purchaseTotals = __copyPurchaseTotals( purchase );

		request.ccAuthService = new CybersourceHelper.csReference.CCAuthService();

		if( !empty(pos) && !empty(pos.getEntryMode()) && !empty(pos.getCardPresent()) && !empty(pos.getTerminalCapability()) ){
			request.pos = __copyPos( pos );
			request.ccAuthService.commerceIndicator = "retail";
		}
		request.decisionManager = new CybersourceHelper.csReference.DecisionManager();
		request.decisionManager.enabled=false;
		request.ccAuthService.run = true;
	},


	/*****************************************************************************
	 * Name: addPaySubscriptionCreateService
	 * Description: Add Subscription Creation service to request.
	 ****************************************************************************/
	addPaySubscriptionCreateService : function(
										request : Object,
										billTo : Object,
										purchase : Object,
										card : Object,
										refCode : String)
	{

	request.merchantID = CybersourceHelper.getMerchantID();
	__setClientData( request, refCode );
	if (null !== billTo) {
		request.billTo = __copyBillTo( billTo );
	}
	request.purchaseTotals = __copyPurchaseTotals( purchase );
	
	if (null !== card && (!empty(session.forms.paymentinstruments.creditcards.newcreditcard.flexresponse.value) || !empty(session.forms.billing.paymentMethods.creditCard.flexresponse.value))) {
		request.tokenSource = new CybersourceHelper.csReference.TokenSource();
		if(!empty(session.forms.paymentinstruments.creditcards.newcreditcard.flexresponse.value)){
			request.tokenSource.transientToken = session.forms.paymentinstruments.creditcards.newcreditcard.flexresponse.value;
		} else {
			request.tokenSource.transientToken = session.forms.billing.paymentMethods.creditCard.flexresponse.value;
		}
		
	} else {
		request.card = __copyCreditCard( card );
	}
	request.cardTypeSelectionIndicator = '1';
	request.recurringSubscriptionInfo = new CybersourceHelper.csReference.RecurringSubscriptionInfo();
	request.recurringSubscriptionInfo.frequency = 'on-demand';
	request.paySubscriptionCreateService = new CybersourceHelper.csReference.PaySubscriptionCreateService();
	request.paySubscriptionCreateService.disableAutoAuth = 'false';
	request.paySubscriptionCreateService.run = true;
	request.decisionManager = new CybersourceHelper.csReference.DecisionManager();
  	request.decisionManager.enabled = true;
	},

	/*****************************************************************************
	 * Name: addPaySubscriptionRetrieveService
	 * Description: Add Subscription Retreival service to request.
	 ****************************************************************************/
	addPaySubscriptionRetrieveService : function(
										request : Object,
										refCode : String,
										subscriptionID : String)
	{
	request.merchantID = CybersourceHelper.getMerchantID();
	__setClientData( request, refCode );
	request.recurringSubscriptionInfo = new CybersourceHelper.csReference.RecurringSubscriptionInfo();
	request.recurringSubscriptionInfo.subscriptionID = subscriptionID;
	request.paySubscriptionRetrieveService = new CybersourceHelper.csReference.PaySubscriptionRetrieveService();
	request.paySubscriptionRetrieveService.run = true;
	},

	/*****************************************************************************
	 * Name: addPaySubscriptionDeleteService
	 * Description: Add Subscription Deletion service to request.
	 ****************************************************************************/
	addPaySubscriptionDeleteService : function(
										request : Object,
										refCode : String,
										subscriptionID : String)
	{
	request.merchantID = CybersourceHelper.getMerchantID();
	__setClientData( request, refCode );
	request.recurringSubscriptionInfo = new CybersourceHelper.csReference.RecurringSubscriptionInfo();
	request.recurringSubscriptionInfo.subscriptionID = subscriptionID;
	request.paySubscriptionDeleteService = new CybersourceHelper.csReference.PaySubscriptionDeleteService();
	request.paySubscriptionDeleteService.run = true;
	},

	/*****************************************************************************
	 * Name: addSubscriptionUpdateInfo
	 * Description: Add Subscription Updation service to request.
	 ****************************************************************************/
	addSubscriptionUpdateInfo : function(
									request : Object,
									billTo : Object,
									purchase : Object,
									card : Object,
									subscriptionID : String)
	{
		request.merchantID = CybersourceHelper.getMerchantID();
		var merchantRefCode : String = "0000000" ;  //dummy value as it is not required for this call
		__setClientData( request, merchantRefCode );
		request.billTo = __copyBillTo( billTo );

		request.purchaseTotals = __copyPurchaseTotals( purchase );
		request.card = __copyCreditCard( card );

		var request_recurringSubscriptionInfo : Object = new CybersourceHelper.csReference.RecurringSubscriptionInfo();
		request_recurringSubscriptionInfo["subscriptionID"] = subscriptionID;
		request.recurringSubscriptionInfo = request_recurringSubscriptionInfo;


		request.paySubscriptionUpdateService = new CybersourceHelper.csReference.PaySubscriptionUpdateService();
		request.paySubscriptionUpdateService.run = true;
	},

	/*****************************************************************************
	 * Name: addOnDemandSubscriptionInfo
	 * Description: Add On Demand payment service to request.
	 ****************************************************************************/
	addOnDemandSubscriptionInfo : function(
										subscriptionID : String,
										request : Object,
										purchase : Object,
										refCode : String)
	{
		request.merchantID = CybersourceHelper.getMerchantID();
		var fingerprint : String  = null;
		if (CybersourceHelper.getDigitalFingerprintEnabled()) {
		  fingerprint =  session.sessionID;
		}

		__setClientData( request, refCode , fingerprint );
		request.purchaseTotals = __copyPurchaseTotals( purchase );

		var request_recurringSubscriptionInfo : Object = new CybersourceHelper.csReference.RecurringSubscriptionInfo();
		request_recurringSubscriptionInfo["subscriptionID"] = subscriptionID;
		request.recurringSubscriptionInfo = request_recurringSubscriptionInfo;
	},

	addDAVRequestInfo : function(request : Object, billTo : Object, shipTo : Object, ignoreDAVResult : boolean, refCode : String )
	{
		request.merchantID = CybersourceHelper.getMerchantID();
		if( !empty(refCode) ) {
			__setClientData( request, refCode );
		}
		if (null!==billTo) {
			request.billTo = __copyBillTo( billTo );
		}
		request.shipTo = __copyShipTo( shipTo );

		request.davService=new CybersourceHelper.csReference.DAVService();
		request.davService.run=true;

		if( !("businessRules" in request && !empty(request.businessRules)) ) {
			request.businessRules = new CybersourceHelper.csReference.BusinessRules();
		}

		if( ignoreDAVResult ) {
			request.businessRules.ignoreDAVResult = true;
		} else {
			request.businessRules.ignoreDAVResult = false;
		}
	},


	addAVSRequestInfo : function(request : Object, ignoreAVSResult : Boolean, declineAVSFlags : String )
	{
		if( !("businessRules" in request && !empty(request.businessRules)) ) {
			request.businessRules = new CybersourceHelper.csReference.BusinessRules();
		}

		if( !empty(ignoreAVSResult) && ignoreAVSResult.valueOf() ) {
			request.businessRules.ignoreAVSResult = true;
		} else {
			request.businessRules.ignoreAVSResult = false;
		}

		if( !empty(declineAVSFlags) ) {
			request.businessRules.declineAVSFlags = declineAVSFlags;
		}
	},


	addPayerAuthEnrollInfo : function(serviceRequest : Object, orderNo : String, creditCardForm : dw.web.FormElement, countryCode : String, amount : dw.value.Money, subscriptionToken : String, phoneNumber : String, paymentMethodID : String){
		serviceRequest.merchantID = CybersourceHelper.getMerchantID();

		__setClientData( serviceRequest, orderNo );

		if (!empty(subscriptionToken)){
			var request_recurringSubscriptionInfo : Object = new CybersourceHelper.csReference.RecurringSubscriptionInfo();
			request_recurringSubscriptionInfo["subscriptionID"] = subscriptionToken;
			serviceRequest.recurringSubscriptionInfo = request_recurringSubscriptionInfo;
		} else if (null !== creditCardForm && empty(creditCardForm.flexresponse.value)) {
			CybersourceHelper.addCardInfo(serviceRequest, creditCardForm);
		} else if (null !== creditCardForm && !empty(creditCardForm.flexresponse.value)) {
			serviceRequest.tokenSource = new CybersourceHelper.csReference.TokenSource();
			serviceRequest.tokenSource.transientToken = creditCardForm.flexresponse.value;
		}
		serviceRequest.payerAuthEnrollService = new CybersourceHelper.csReference.PayerAuthEnrollService();
		serviceRequest.purchaseTotals = new CybersourceHelper.csReference.PurchaseTotals();
		serviceRequest.purchaseTotals.currency=amount.currencyCode;
		var items =[];
		var item = new CybersourceHelper.csReference.Item();
		var StringUtils = require('dw/util/StringUtils');
		item.id = 0;
		item.unitPrice = StringUtils.formatNumber(amount.value,"000000.00","en_US");
		items.push(item);
		serviceRequest.item = items;
		serviceRequest.payerAuthEnrollService.run=true;
		serviceRequest.payerAuthEnrollService.referenceID = session.privacy.DFReferenceID;
		serviceRequest.payerAuthEnrollService.mobilePhone=phoneNumber;
		serviceRequest.payerAuthEnrollService.transactionMode= getTransactionMode(session.privacy.device);
		/* serviceRequest.afsService = new CybersourceHelper.csReference.AFSService();
        serviceRequest.afsService.run = true; */
		if (!empty(paymentMethodID)) {
            CybersourceHelper.apDecisionManagerService(paymentMethodID, serviceRequest);
        }
        serviceRequest.ccAuthService = new CybersourceHelper.csReference.CCAuthService();
        serviceRequest.ccAuthService.run = true;
	},

	addTestPayerAuthEnrollInfo : function(request : Object, card : Object)
	{
		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, "TestOrder" );
		request.card = __copyCreditCard( card );
		request.payerAuthEnrollService = new CybersourceHelper.csReference.PayerAuthEnrollService();
		request.purchaseTotals = new CybersourceHelper.csReference.PurchaseTotals();
		request.purchaseTotals.currency="USD";
		var items =[];
		var item = new CybersourceHelper.csReference.Item();
		var StringUtils = require('dw/util/StringUtils');
		item.id = 0;
		item.unitPrice = StringUtils.formatNumber("100","000000.00","en_US");
		items.push(item);
		request.item = items;
		request.payerAuthEnrollService.run=true;
	},

	addTestPayerAuthValidateInfo : function(request : Object, signedPARes : String, card : Object)
	{
		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, "TestOrder" );
		request.card = __copyCreditCard( card );
		request.payerAuthValidateService = new CybersourceHelper.csReference.PayerAuthValidateService();
		request.payerAuthValidateService.signedPARes = signedPARes;
		request.purchaseTotals = new CybersourceHelper.csReference.PurchaseTotals();
		request.purchaseTotals.currency="USD";
		var items =[];
		var item = new CybersourceHelper.csReference.Item();
		var StringUtils = require('dw/util/StringUtils');
		item.id = 0;
		item.unitPrice = StringUtils.formatNumber("100","000000.00","en_US");
		items.push(item);
		request.item = items;
		request.payerAuthValidateService.run=true;
	},

	addCardInfo : function(request : Object, creditCardForm : dw.web.FormElement) {
     var StringUtils = require('dw/util/StringUtils');
     request.card = new CybersourceHelper.csReference.Card();
     request.card.expirationMonth = StringUtils.formatNumber(creditCardForm.expiration.month.htmlValue, "00");
     request.card.expirationYear = creditCardForm.expiration.year.value;
     request.card.accountNumber = creditCardForm.number.value;

     switch(creditCardForm.type.htmlValue){
		case "Visa":
			request.card.cardType="001";
			break;
		case "MasterCard":
			request.card.cardType="002";
			break;
		case "Amex":
			request.card.cardType="003";
			break;
		case "Discover":
			request.card.cardType="004";
			break;
		case "Maestro":
			request.card.cardType="042";
			break;
		case 'JCB':
            request.card.cardType = '007';
            break;
        case 'DinersClub':
            request.card.cardType = '005';
            break;
		default :
			request.card.cardType="001";
			break;
	}
    return request;
	},

	    addPayerAuthValidateInfo : function(request : Object, orderNo : String, signedPARes : String, creditCardForm : dw.web.FormElement, amount : dw.value.Money, subscriptionToken : String , transactionId : String){
		request.merchantID = CybersourceHelper.getMerchantID();

		__setClientData( request, orderNo );

		if (!empty(subscriptionToken)){
			var request_recurringSubscriptionInfo : Object = new CybersourceHelper.csReference.RecurringSubscriptionInfo();
			request_recurringSubscriptionInfo["subscriptionID"] = subscriptionToken;
			request.recurringSubscriptionInfo = request_recurringSubscriptionInfo;
		} else if (null !== creditCardForm && empty(creditCardForm.flexresponse.value)) {
			CybersourceHelper.addCardInfo(request, creditCardForm);
		} else if (null !== creditCardForm && !empty(creditCardForm.flexresponse.value)) {
			request.tokenSource = new CybersourceHelper.csReference.TokenSource();
			request.tokenSource.transientToken = creditCardForm.flexresponse.value;
		}

		// validate specific stuff
		request.payerAuthValidateService = new CybersourceHelper.csReference.PayerAuthValidateService();
		request.payerAuthValidateService.signedPARes = signedPARes;
		request.payerAuthValidateService.authenticationTransactionID = transactionId;

		request.purchaseTotals = new CybersourceHelper.csReference.PurchaseTotals();
		request.purchaseTotals.currency=amount.currencyCode;
		var items = [];
		var item = new CybersourceHelper.csReference.Item();
		var StringUtils = require('dw/util/StringUtils');
		item.id = 0;
		item.unitPrice = StringUtils.formatNumber(amount.value,"000000.00","en_US");
		items.push(item);
		request.item = items;

		request.payerAuthValidateService.run=true;
		if (CybersourceHelper.getCardDecisionManagerEnable()){
			request.afsService = new CybersourceHelper.csReference.AFSService();
        	request.afsService.run = true;
		}
	},

	addPayerAuthReplyInfo : function(request, cavv, ucafAuthenticationData, ucafCollectionIndicator, eciRaw,
											commerceIndicator, xid, paresStatus,specificationVersion,directoryTrnsctnId, cavvAlgorithm, effectiveAuthenticationType, 
        									challengeCancelCode, authenticationStatusReason, acsTransactionID, authorizationPayload){
		if(request.ccAuthService === null){
			request.ccAuthService=new CybersourceHelper.csReference.CCAuthService();
		}
		if(commerceIndicator !== null){
			request.ccAuthService.commerceIndicator = commerceIndicator;
		}
		if(xid !== null){
			request.ccAuthService.xid = xid;
		}
		if(cavv !== null){
			request.ccAuthService.cavv = cavv;
		}
		if(eciRaw !== null){
			request.ccAuthService.eciRaw = eciRaw;
		}
		if(specificationVersion !== null){
			request.ccAuthService.paSpecificationVersion = specificationVersion;
		}
		if(directoryTrnsctnId !== null){
			request.ccAuthService.directoryServerTransactionID = directoryTrnsctnId;
		}
		if (!empty(session.privacy.veresEnrolled)) {
        	request.ccAuthService.veresEnrolled = session.privacy.veresEnrolled;
        	session.privacy.veresEnrolled = '';
        }
		if (!empty(session.privacy.networkScore)) {
        	request.ccAuthService.paNetworkScore = session.privacy.networkScore;
        	session.privacy.networkScore = '';
        }
        if (!empty(cavvAlgorithm)) {
        	request.ccAuthService.cavvAlgorithm = cavvAlgorithm;
        }
		if (!empty(effectiveAuthenticationType)) {
        	request.ccAuthService.effectiveAuthenticationType = effectiveAuthenticationType;
        }
        if (!empty(challengeCancelCode)) {
        	request.ccAuthService.challengeCancelCode = challengeCancelCode;
        }
        if (authenticationStatusReason !== null && !empty(authenticationStatusReason)) {
        	request.ccAuthService.paresStatusReason = authenticationStatusReason;
        }
        /*if (!empty(acsTransactionID)) {
        	request.ccAuthService.acsTransactionID = acsTransactionID;
        }*/
        /*if (!empty(authorizationPayload)) {
        	request.ccAuthService.authorizationPayload = authorizationPayload;
        }*/
        request.ccAuthService.paAuthenticationDate = dw.util.StringUtils.formatCalendar(new dw.util.Calendar(), 'yyyyMMddHHmmss');

		if(!empty(ucafAuthenticationData)){
			request.ucaf = new CybersourceHelper.csReference.UCAF();
			request.ucaf.authenticationData = ucafAuthenticationData;
			request.ucaf.collectionIndicator = ucafCollectionIndicator;
		} else if (!empty(ucafCollectionIndicator)) {
			request.ucaf = new CybersourceHelper.csReference.UCAF();
			request.ucaf.collectionIndicator = ucafCollectionIndicator;
	    }
		if(CybersourceHelper.getPASaveParesStatus() && paresStatus !== null) {
			request.ccAuthService.paresStatus = paresStatus;
		}
	},


	/*****************************************************************************
	 * AP Services Starts here
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * ap   : AP_Object,
	 * refCode  : String   - Basket.UUID
	 *****************************************************************************/
	addAPAuthRequestInfo : function( request : Object, purchase : Object, ap : Object, refCode : String )
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, refCode );
		request.apPaymentType = getPaymentType();
		request.purchaseTotals =  __copyPurchaseTotals( purchase );
		request.ap = __copyAp( ap );
		request.apAuthService = new CybersourceHelper.csReference.APAuthService();
		request.apAuthService.run = true;
	},

	/*****************************************************************************
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * ap   : AP_Object,
	 * refCode  : String   - Basket.UUID
	 *****************************************************************************/
	addAPCheckoutDetailsRequestInfo : function( request : Object, purchase : Object, ap : Object, refCode : String )
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, refCode );
		request.apPaymentType = getPaymentType();
		request.purchaseTotals =  __copyPurchaseTotals( purchase );
		request.ap = __copyAp( ap );
		request.apCheckoutDetailsService = new CybersourceHelper.csReference.APCheckOutDetailsService();
		request.apCheckoutDetailsService.run = true;
	},


	/*****************************************************************************
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * ap     : AP_Object,
	 * refCode  : String   - Basket.UUID
	 * Name : addAPConfirmPurchaseRequestInfo
	 *****************************************************************************/
	addAPConfirmPurchaseRequestInfo : function( request : Object, purchase : Object, ap : Object, refCode : String )
	{

		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, refCode );
		request.purchaseTotals =  __copyPurchaseTotals( purchase );
		request.ap = __copyAp( ap );
		request.apPaymentType = getPaymentType();
		request.apConfirmPurchaseService = new CybersourceHelper.csReference.APConfirmPurchaseService();
		request.apConfirmPurchaseService.run = true;
	},

	/*****************************************************************************
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * refCode  : String   - Basket.UUID
	 * Name: addAPAuthReversalServiceInfo
	 *****************************************************************************/

	addAPAuthReversalServiceInfo : function(
										request : Object,
										purchase : Object,
										refCode : String,
										authRequestID : String )
	{
	request.merchantID = CybersourceHelper.getMerchantID();
	__setClientData( request, refCode );
	request.purchaseTotals = __copyPurchaseTotals( purchase );
	request.apPaymentType = getPaymentType();
	request.apAuthReversalService= new CybersourceHelper.csReference.APAuthReversalService();
	request.apAuthReversalService.authRequestID = authRequestID;
	request.apAuthReversalService.run = true;
	},

	/*****************************************************************************
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * refCode  : String   - Basket.UUID
	 * Name: addAPCaptureServiceInfo
	 ****************************************************************************/
	addAPCaptureServiceInfo	 : function(
										request : Object,
										purchase : Object,
										refCode : String,
										authRequestID : String)
	{
	request.merchantID = CybersourceHelper.getMerchantID();
	__setClientData( request, refCode );
	request.purchaseTotals = __copyPurchaseTotals( purchase );
	request.apPaymentType = getPaymentType();
	request.apCaptureService= new CybersourceHelper.csReference.APCaptureService();
	request.apCaptureService.authRequestID = authRequestID;
	request.apCaptureService.run = true;
	},

	/*****************************************************************************
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * refCode  : String   - Basket.UUID
	 * reason : String
	 * note : String
	 * Name: addAPRefundServiceInfo
	 ****************************************************************************/
	addAPRefundServiceInfo	 : function(
										request : Object,
										purchase : Object,
										refCode : String,
										authCaptureID : String,
										reason : String,
										note : String )
	{
	request.merchantID = CybersourceHelper.getMerchantID();
	__setClientData( request, refCode );
	request.purchaseTotals = __copyPurchaseTotals( purchase );
	request.apPaymentType = getPaymentType();
	request.apRefundService= new CybersourceHelper.csReference.APRefundService();
	request.apRefundService.captureRequestID = authCaptureID;
	request.apRefundService.reason = reason;
	request.apRefundService.note = note;
	request.apRefundService.run = true;
	},

	/*****************************************************************************
	 * request  : Object,
	 * purchase : PurchaseTotals_Object,
	 * ap : AP_Object,
	 * refCode  : String   - Basket.UUID
	 * Name: addAPInitiateServiceInfo
	 ****************************************************************************/
	addAPInitiateServiceInfo : function(
										request : Object,
										purchase : Object,
										ap : AP_Object,
										refCode : String )
	{
	request.merchantID = CybersourceHelper.getMerchantID();
	__setClientData( request, refCode );
	request.purchaseTotals =  __copyPurchaseTotals( purchase );
	request.ap = __copyAp( ap );
	request.apPaymentType = getPaymentType();
	request.apInitiateService= new CybersourceHelper.csReference.APInitiateService();
	request.apInitiateService.run = true;
	},

	/*****************************************************************************
	 * Name: getPosMerchantID
	 * Description: Returns Merchant ID.
	 ****************************************************************************/
	getPosMerchantID: function(location: String) : String
	{
		var customObject = null;
		var merchantID : String = null;

		var CustomObjectMgr =require("dw/object/CustomObjectMgr");
		customObject = CustomObjectMgr.getCustomObject("POS_MerchantIDs", location);
		if(customObject !== null)
			merchantID = customObject.custom.MerchantID;

		return merchantID;
	},

	/*****************************************************************************
	 * Name: apInitiateService
	 * Description: Returns Alipay token, Set Request id and Request Token.
	 * param : request, returnUrl , PurchaseTotals_Object, productName, productDescription, orderNo, alipayPaymentType
	 ****************************************************************************/
	apInitiateService : function (request:Object,returnUrl:String,purchase:Object,productName:Object,productDescription:Object,orderNo:String,alipayPaymentType:String)
	{
		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, orderNo  );
		request.purchaseTotals = __copyPurchaseTotals( purchase );
		request.apPaymentType = alipayPaymentType;
		var endpoint = CybersourceHelper.getEndpoint();
		var testReconciliationID : String = CybersourceHelper.getTestAlipayReconciliationID();
		var apInitiateService = new CybersourceHelper.csReference.APInitiateService();

		 apInitiateService.returnURL=returnUrl;
		 apInitiateService.productName = productName;
		 apInitiateService.productDescription = productDescription;
		 if(endpoint.equals("Test")){
		 	apInitiateService.reconciliationID = testReconciliationID;
		 }
		 request.apInitiateService=apInitiateService;
		 request.apInitiateService.run=true;
	},

	/*****************************************************************************
	 * Name: apBillingAgreementService
	 * Description: Returns request ID, billing agreement ID
	 * param : request, orderNo , requestID, paymentType
	 ****************************************************************************/
	apBillingAgreementService : function (request:Object, orderNo : String, requestID : String)
	{
		var Logger =require('dw/system/Logger').getLogger('Cybersource');
		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, orderNo  );
		request.apPaymentType = 'PPL';

		var apBillingAgreementService = new CybersourceHelper.csReference.APBillingAgreementService();

		apBillingAgreementService.sessionsRequestID = requestID;
		request.apBillingAgreementService = apBillingAgreementService;
		request.apBillingAgreementService.run = true;
	},

	/*****************************************************************************
	 * Name: apCheckStatusService
	 * Description: Returns Alipay token, Payment Status, Set Request id and Request Token.
	 * param : request, orderNo , requestID, alipayPaymentType
	 ****************************************************************************/
	/*****************************************************************************
	 * Name: apCheckStatusService
	 * Description: Returns Alipay token, Payment Status, Set Request id and Request Token.
	 * param : request, orderNo , requestID, alipayPaymentType
	 ****************************************************************************/
	apCheckStatusService : function (request:Object,orderNo : String,requestID:String,paymentType:String,reconciliationID:String)
	{
		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, orderNo  );
		request.apPaymentType = paymentType;
		var endpoint = CybersourceHelper.getEndpoint();
		var apCheckStatusService = new CybersourceHelper.csReference.APCheckStatusService();

		 switch(paymentType) {
			case 'APY':
			case 'APD':
				apCheckStatusService.apInitiateRequestID = requestID;
				break;
			case 'PPL':
				apCheckStatusService.sessionsRequestID = requestID;
				break;
			case 'WQR':
                apCheckStatusService.apInitiateRequestID = requestID;
                if (endpoint.equals('Test') && reconciliationID!='SETTLED'){
                    apCheckStatusService.reconciliationID = reconciliationID;
                }
                break;
			default:
				apCheckStatusService.checkStatusRequestID = requestID;
		}
		 request.apCheckStatusService=apCheckStatusService;
		 request.apCheckStatusService.run=true;
	},


	/*****************************************************************************
	 * Name: payPalCaptureService
	 * Description: Initiate the Capture for transactionId .
	 *
	 ****************************************************************************/
	payPalCaptureService : function(request :Object,paypalAuthorizationRequestToken:String,paypalAuthorizationRequestId:String, transactionType : String, transactionId:String, refCode:String){
		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, refCode);

		var paypalCaptureService = new CybersourceHelper.csReference.PayPalDoCaptureService();
		paypalCaptureService.paypalAuthorizationId=transactionId;
		paypalCaptureService.completeType=transactionType;
		paypalCaptureService.paypalAuthorizationRequestID=paypalAuthorizationRequestId;
		paypalCaptureService.paypalAuthorizationRequestToken=paypalAuthorizationRequestToken;
		request.payPalDoCaptureService=paypalCaptureService;
		request.payPalDoCaptureService.run=true;
	},
	/*****************************************************************************
	 * Name: payPalReversalService
	 * Description: Initiate the Reversal for transactionId .
	 *
	 ****************************************************************************/
	payPalReversalService : function(request: Object, transactionId:String,requestId:String,requestToken:String,refCode:String){
		request.merchantID = CybersourceHelper.getMerchantID();
		__setClientData( request, refCode);
		var  payPalAuthReversalService = new CybersourceHelper.csReference.PayPalAuthReversalService();
		payPalAuthReversalService.paypalAuthorizationId=transactionId;
		payPalAuthReversalService.paypalAuthorizationRequestID=requestId;
		payPalAuthReversalService.paypalAuthorizationRequestToken=requestToken;
		request.payPalAuthReversalService=payPalAuthReversalService;
		request.payPalAuthReversalService.run=true;

	},
    
	 /** ***************************************************************************
     * Name: DecisionManager
     * Description: DecisionManagerService.
     *
     *************************************************************************** */
	apDecisionManagerService: function (paymentMethodID, request, billTo, shipTo, purchase, refCode, enableDeviceFingerprint, itemsCybersource) {
		var PaymentMgr = require('dw/order/PaymentMgr');
        var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
        var paymentProcessorID = PaymentMgr.getPaymentMethod(paymentMethodID).paymentProcessor.ID;

        request.decisionManager = new CybersourceHelper.csReference.DecisionManager();

		if (CybersourceConstants.BANK_TRANSFER_PAYMENT_METHOD.equals(paymentProcessorID)) {
            request.decisionManager.enabled = CybersourceHelper.getBankTransferDecisionManagerFlag();
		} else if (CybersourceConstants.METHOD_VISA_CHECKOUT.equals(paymentMethodID)) {
            request.decisionManager.enabled = CybersourceHelper.getCardDecisionManagerEnable();
        } else if (CybersourceConstants.METHOD_PAYPAL.equals(paymentMethodID) || CybersourceConstants.METHOD_PAYPAL_CREDIT.equals(paymentMethodID)) {
            request.decisionManager.enabled = require('dw/system/Site').getCurrent().getCustomPreferenceValue('isDecisionManagerEnable');
		} else {
			request.merchantID = CybersourceHelper.getMerchantID();
			var fingerprint = null;
			if (enableDeviceFingerprint) {
				fingerprint = session.sessionID;
			}

			__setClientData(request, refCode, fingerprint);
			if (billTo !== null) {
				request.billTo = __copyBillTo(billTo);
			}
			request.shipTo = __copyShipTo(shipTo);
			request.purchaseTotals = __copyPurchaseTotals(purchase);
			var items = [];
			if (itemsCybersource !== null) {
				var iter = itemsCybersource.iterator();
				while (iter.hasNext()) {
					items.push(__copyItemFrom(iter.next()));
				}
			}

			request.item = items;

			// request.decisionManager = new CybersourceHelper.csReference.DecisionManager();
			request.decisionManager.enabled = CybersourceHelper.getCardDecisionManagerEnable();
		}

		// DM service
        request.afsService = new CybersourceHelper.csReference.AFSService();
        request.afsService.run = true;
    },

	/**
     * Sets APSaleService parameters
     * @param {*} saleObject saleObject
     * @param {*} request request
     */
	postPreAuth: function (saleObject, request) {
        var apSaleService = new CybersourceHelper.csReference.APSaleService();
        apSaleService.cancelURL = saleObject.cancelURL;
        apSaleService.successURL = saleObject.successURL;
        apSaleService.failureURL = saleObject.failureURL;

        if (saleObject.paymentOptionID) {
            apSaleService.paymentOptionID = saleObject.paymentOptionID;
        }

        request.apSaleService = apSaleService;

        // set run instance to true
        request.apSaleService.run = true;
    }
}

// Helper method to export the helper
function getCybersourceHelper()
{
	return CybersourceHelper;
}

function __setClientData( request, refCode, fingerprint)
{
	request.merchantReferenceCode = refCode;
	request.partnerSolutionID=getCybersourceHelper().getPartnerSolutionID();
	var developerID=getCybersourceHelper().getDeveloperID();
	if (!empty(developerID)) {
		request.developerID=developerID;
	}
	request.clientLibrary='Salesforce Commerce Cloud';
	request.clientLibraryVersion='21.3.0';
	request.clientEnvironment='Linux';
	request.clientApplicationVersion = 'SG';
	if (fingerprint) {
	  request.deviceFingerprintID = fingerprint;
	}
}

function __copyBillTo( billTo : Object ) : Object
{
	var request_billTo = new CybersourceHelper.csReference.BillTo();
	var value;
	for ( var name in billTo )
	{
		if( name.indexOf("set") === -1 && name.indexOf("get") === -1)
		{
			value = billTo[name];
			if(value !== "")
			{
				request_billTo[name] = value;
			}
		}
	}
	return request_billTo;
}

function __copyShipTo( shipTo : Object ) : Object
{
	var request_shipTo : Object = new CybersourceHelper.csReference.ShipTo();
	var value : String;
	for ( var name : String in shipTo )
	{
		if(name.indexOf("set") === -1 && name.indexOf("get") === -1)
		{
			value = shipTo[name];
			if(value !== "")
			{
				request_shipTo[name] = value;
			}
		}
	}
	return request_shipTo;
}

function __copyPurchaseTotals( purchase : Object ) : Object
{
	var request_purchaseTotals : Object = new CybersourceHelper.csReference.PurchaseTotals();
	var value : String;
	for ( var name : String in purchase )
	{
		if(name.indexOf("set") === -1 && name.indexOf("get") === -1)
		{
			value = purchase[name];
			if(value !== "")
			{
				request_purchaseTotals[name] = value;
			}
		}
	}
	return request_purchaseTotals;
}

function __copyCreditCard( card : Object ) : Object
{
	var request_card : Object = new CybersourceHelper.csReference.Card();
	var value : String;
	for ( var name : String in card)
	{
		if(name.indexOf("set") === -1 && name.indexOf("get") === -1 && name.indexOf("CardToken") === -1)
		{
			value = card[name];
			if(value !== "")
			{
				request_card[name] = value;
			}
		}
	}
	return request_card;
}


function __copyItemFrom( item : Object ) : Object
{
	var request_item : Object = new CybersourceHelper.csReference.Item();
	var value : String;
	for ( var name : String in item)
	{
		if ( name.indexOf("set") === -1 && name.indexOf("get") === -1)
		{
			value = item[name];
			if(value !== "")
			{
				request_item[name] = value;
			}
		}
	}
	return request_item;
}

function __copyTaxAmounts( _taxReply : Object ) : Object
{
	var taxReply = {};
	var value : String;
	for ( var name : String in _taxReply ) {
		if(name.indexOf("Amount")>-1 ) {
			value = _taxReply[name];
			taxReply[name] = value;
		}
	}
	return taxReply;
}

function __copyAp(ap)
{
	var request_ap : Object = new CybersourceHelper.csReference.apPayer();
	var value : String;
	for ( var name : String in ap )
	{
		if(name.indexOf("set") === -1 && name.indexOf("get") === -1)
		{
			value = ap[name];
			if(value !== "")
			{
				request_ap[name] = value;
			}
		}
	}
	return request_ap;
}

function getPaymentType() : String
{
	return "vme";
}

function __copyPos( pos  )
{
	var request_pos : Object = new CybersourceHelper.csReference.Pos();
	var value : String;
	for ( var name : String in pos)
	{
		if(name.indexOf("set") === -1 && name.indexOf("get") === -1)
		{
			value = pos[name];
			if(value !== "")
			{
				request_pos[name] = value;
			}
		}
	}
	return request_pos;
}

function getTransactionMode(deviceType)
{
	var transactionMode;
		switch(deviceType){
		case 'desktop':
			transactionMode='S';
			break;
		case 'mobile':
			transactionMode='P';
			break;
		case 'tablet':
			transactionMode='T';
			break;
		default:
			transactionMode='S';
			break;
		}
	return transactionMode;
}

module.exports = {
		getCybersourceHelper: getCybersourceHelper,
		copyTaxAmounts : __copyTaxAmounts,
		setClientData : __setClientData,
		copyPurchaseTotals : __copyPurchaseTotals,
		copyBillTo : __copyBillTo,
		copyShipTo : __copyShipTo,
		copyItemFrom :__copyItemFrom,
		copyCard : __copyCreditCard
	};
