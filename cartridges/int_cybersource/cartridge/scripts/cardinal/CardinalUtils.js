'use strict';

var Logger = dw.system.Logger.getLogger('Cybersource');

function getOrderObject(Basket : dw.order.LineItemCtnr,creditCardForm){
	
	var basket = Basket;
	
	if(basket == null){
		Logger.error("Please provide a Basket!");
		return {error:true};
	}
	
	var OrderObject = require('*/cartridge/scripts/cardinal/OrderObject');
	var ConsumerObject = require('*/cartridge/scripts/cardinal/ConsumerObject');
	var AddressObject = require('*/cartridge/scripts/cardinal/Billing_Shipping_AddressObject');
	var AccountObject = require('*/cartridge/scripts/cardinal/AccountObject');
	var TokenObject = require('*/cartridge/scripts/cardinal/TokenObject');
	var OrderDetailsObject = require('*/cartridge/scripts/cardinal/OrderDetailsObject');
	var CartItemObject = require('*/cartridge/scripts/cardinal/CartItemObject');
	var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
	
	var orderObject = new OrderObject;
	var consumerObject = new ConsumerObject;
	var billingObject = new AddressObject;
	var shippingObject = new AddressObject;
	
	var accountObject = new AccountObject;
	var tokenObject = new TokenObject;
	var orderdetailsObject = new OrderDetailsObject;
	var cartObject = new CartItemObject;
	var cardSecurityCode;
	
	if(creditCardForm.cvn != null)
	{
		cardSecurityCode = creditCardForm.cvn.value;
	}
	else
	{
	    cardSecurityCode = creditCardForm.get('cvn').value();
	}
	
	var billingaddress = basket.getBillingAddress();
	var shippingAddress;
	var shippingMethod;
	var it  = basket.getShipments().iterator();
	
	if(shippingAddress == null){
		while(it.hasNext()){
			var shipment = it.next();
			shippingAddress = shipment.getShippingAddress();
			shippingMethod = shipment.getShippingMethod();
			if(shippingAddress != null){
				break;
			}
		}
	}
	
	if( !empty(billingaddress)&&!empty(basket) ) {			
			/*This if condition checks if billingAddress.address1 is present only for V.Me
			* create the billingObject using billingAddress else it will create billingObject using shippingAddress 
			*/			  
			if(!empty(billingaddress.address1)){
				billingObject.setFullName(billingaddress.fullName);
				billingObject.setFirstName(billingaddress.firstName);
				billingObject.setMiddleName(billingaddress.secondName);
				billingObject.setLastName(billingaddress.lastName);
				billingObject.setAddress1(billingaddress.address1 );
				billingObject.setAddress2(billingaddress.address2 );
				billingObject.setCity(billingaddress.city );
				billingObject.setState(billingaddress.stateCode)
				billingObject.setPostalCode(billingaddress.postalCode);
				billingObject.setCountryCode(billingaddress.countryCode.value);
				billingObject.setPhone1(billingaddress.phone);
			} else {
				billingObject.setFullName(shippingAddress.fullName);
				billingObject.setFirstName(shippingAddress.firstName);
				billingObject.setMiddleName(shippingAddress.secondName);
				billingObject.setLastName(shippingAddress.lastName);
				billingObject.setAddress1(shippingAddress.address1 );
				billingObject.setAddress2(shippingAddress.address2 );
				billingObject.setCity(shippingAddress.city );
				billingObject.setState(shippingAddress.stateCode)
				billingObject.setPostalCode(shippingAddress.postalCode);
				billingObject.setCountryCode(shippingAddress.countryCode.value);
				billingObject.setPhone1(shippingAddress.phone);
			}
	}
	
	deleteEmptyProperties(billingObject);
	
	if(!empty(shippingAddress)){
	 			shippingObject.setFullName(shippingAddress.fullName);
				shippingObject.setFirstName(shippingAddress.firstName);
				shippingObject.setMiddleName(shippingAddress.secondName);
				shippingObject.setLastName(shippingAddress.lastName);
				shippingObject.setAddress1(shippingAddress.address1 );
				shippingObject.setAddress2(shippingAddress.address2 );
				shippingObject.setCity(shippingAddress.city );
				shippingObject.setState(shippingAddress.stateCode)
				shippingObject.setPostalCode(shippingAddress.postalCode);
				shippingObject.setCountryCode(shippingAddress.countryCode.value);
				shippingObject.setPhone1(shippingAddress.phone);
	}
	
	deleteEmptyProperties(shippingObject);
	
	var productlineitems = basket.getProductLineItems();
	var lineItemIterator = productlineitems.iterator();
	
	var cartItems = [];
	
	while(lineItemIterator.hasNext()){
			var lineItem = lineItemIterator.next();
			cartObject.setName(lineItem.productName);
			cartObject.setSKU(lineItem.manufacturerSKU);
			cartObject.setQuantity(lineItem.quantityValue);
			cartObject.setDescription(lineItem.product.pageDescription);
			cartObject.setPrice(lineItem.adjustedPrice.value);
			deleteEmptyProperties(cartObject);
			cartItems.push(cartObject);
	}
	
	var paymentinstrument;
	var ccPaymentInstruments = basket.getPaymentInstruments();
	
	for each (var pi in ccPaymentInstruments) {
		if(pi.paymentMethod.equals(CybersourceConstants.METHOD_CREDIT_CARD) || pi.paymentMethod.indexOf('SA_')>-1 || pi.paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT))
    	{
    		paymentinstrument = pi;
    	}
    	break;
	}
	if(paymentinstrument.paymentMethod.equals(CybersourceConstants.METHOD_CREDIT_CARD) || paymentinstrument.paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT)) {
		accountObject.setAccountNumber(paymentinstrument.creditCardNumber);
		accountObject.setExpirationMonth(paymentinstrument.creditCardExpirationMonth);
		accountObject.setExpirationYear(paymentinstrument.creditCardExpirationYear);
		accountObject.setNameOnAccount(paymentinstrument.creditCardHolder);
		accountObject.setCardCode(cardSecurityCode);
		deleteEmptyProperties(accountObject);
	
		tokenObject.setToken(paymentinstrument.creditCardToken);
		tokenObject.setExpirationMonth(paymentinstrument.creditCardExpirationMonth);
		tokenObject.setExpirationYear(paymentinstrument.creditCardExpirationYear);
		tokenObject.setCardCode(cardSecurityCode);
		deleteEmptyProperties(tokenObject);
	} else if(paymentinstrument.paymentMethod.indexOf('SA_')>-1){
		var customerObj = (!empty(customer) && customer.authenticated)?customer:null;
		setCCAttributes(paymentinstrument, customerObj, accountObject, tokenObject,cardSecurityCode);
		deleteEmptyProperties(accountObject);
		deleteEmptyProperties(tokenObject);
	}
	consumerObject.setEmail1(basket.customerEmail);
	consumerObject.setShippingAddress(shippingObject);
	consumerObject.setBillingAddress(billingObject);
	consumerObject.setAccount(accountObject);
	
	deleteEmptyProperties(consumerObject);
	
	orderObject.setAuthorization(true);
	orderObject.setCart(cartItems);
	orderObject.setOptions(true);
	orderObject.setConsumer(consumerObject);
	orderObject.setToken(tokenObject);
	
	deleteEmptyProperties(orderObject);
	
	return orderObject;
	
}

function getOrderDetailsObject(order,transactionId){

	var OrderDetailsObject = require('~/cartridge/scripts/cardinal/OrderDetailsObject');
	var orderdetailsObject = new OrderDetailsObject;

	orderdetailsObject.setOrderNumber(order.orderNo);
	orderdetailsObject.setAmount(order.totalNetPrice.value);
	orderdetailsObject.setTransactionId(transactionId);
	orderdetailsObject.setCurrencyCode(order.currencyCode);
	orderdetailsObject.setOrderChannel('S');
	deleteEmptyProperties(orderdetailsObject);
	
	return orderdetailsObject;
	
}

function deleteEmptyProperties(object){

	var value;
	
	for ( var name : String in object)
	{
		if(name.indexOf("set") === -1 && name.indexOf("get") === -1)
		{
			value = object[name];
			if(value === "" || value === null)
			{
				delete object[name];
			}
		}
	}
}

function setCCAttributes(orderPaymentInstrument, CustomerObj, accountObject, tokenObject, cardSecurityCode) {
	var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');

	if (orderPaymentInstrument.getPaymentMethod().indexOf('SA_')>-1) {
		if(!empty(CustomerObj) && !empty(orderPaymentInstrument) && orderPaymentInstrument.getPaymentMethod().indexOf("SA")>-1
				&& !empty(orderPaymentInstrument.getCreditCardType()) && !empty(orderPaymentInstrument.getCreditCardNumber())  
				&& !empty(orderPaymentInstrument.custom.savecard) && orderPaymentInstrument.custom.savecard){
			var wallet = CustomerObj.getProfile().getWallet();
			var paymentInstruments = wallet.getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD);
			var matchedPaymentInstrument, creditCardInstrument;
			var cardTypeMatch = false, cardNumberMatch = false;
			var instrumentsIter = paymentInstruments.iterator();
			while( instrumentsIter.hasNext() )
			{
				creditCardInstrument = instrumentsIter.next();
				//card type match
				cardTypeMatch = creditCardInstrument.creditCardType.equals(orderPaymentInstrument.getCreditCardType()) ? true : false;
				cardNumberMatch = orderPaymentInstrument.getCreditCardNumber().equals(creditCardInstrument.getCreditCardNumber()) ? true : false;
				if (cardNumberMatch === false) {
					cardNumberMatch = orderPaymentInstrument.getCreditCardNumberLastDigits().equals(creditCardInstrument.getCreditCardNumberLastDigits()) ? true : false;
				}
		   	 	//find token ID exists for matching payment card
				if ( cardTypeMatch && cardNumberMatch) {
					matchedPaymentInstrument = creditCardInstrument;
					break;
				}
			}
			
			if (!empty(matchedPaymentInstrument)) {
					accountObject.setAccountNumber(matchedPaymentInstrument.getCreditCardNumber().charAt(0).equals("*") && !empty(orderPaymentInstrument.getCreditCardNumber()) ? orderPaymentInstrument.getCreditCardNumber() : matchedPaymentInstrument.getCreditCardNumber());
				accountObject.setExpirationMonth(!empty(orderPaymentInstrument.getCreditCardExpirationMonth()) ? orderPaymentInstrument.getCreditCardExpirationMonth() : matchedPaymentInstrument.getCreditCardExpirationMonth());
				accountObject.setExpirationYear(!empty(orderPaymentInstrument.getCreditCardExpirationYear()) ? orderPaymentInstrument.getCreditCardExpirationYear() : matchedPaymentInstrument.getCreditCardExpirationYear());
				accountObject.setNameOnAccount(matchedPaymentInstrument.getCreditCardHolder());
				accountObject.setCardCode(cardSecurityCode);
				
				tokenObject.setToken(!empty(orderPaymentInstrument.getCreditCardToken()) ? orderPaymentInstrument.getCreditCardToken() : matchedPaymentInstrument.getCreditCardToken());
				tokenObject.setExpirationMonth(!empty(orderPaymentInstrument.getCreditCardExpirationMonth()) ? orderPaymentInstrument.getCreditCardExpirationMonth() : matchedPaymentInstrument.getCreditCardExpirationMonth());
				tokenObject.setExpirationYear(!empty(orderPaymentInstrument.getCreditCardExpirationYear()) ? orderPaymentInstrument.getCreditCardExpirationYear() : matchedPaymentInstrument.getCreditCardExpirationYear());
				tokenObject.setCardCode(!empty(orderPaymentInstrument.getCreditCardToken()));
				
			} else {
				accountObject.setAccountNumber(orderPaymentInstrument.getCreditCardNumber());
				accountObject.setExpirationMonth(orderPaymentInstrument.getCreditCardExpirationMonth());
				accountObject.setExpirationYear(orderPaymentInstrument.getCreditCardExpirationYear());
				accountObject.setNameOnAccount(orderPaymentInstrument.getCreditCardHolder());
				accountObject.setCardCode(cardSecurityCode);
			
				tokenObject.setToken(empty(orderPaymentInstrument.getCreditCardToken()) ? orderPaymentInstrument.getCreditCardToken() : null);
				tokenObject.setExpirationMonth(orderPaymentInstrument.getCreditCardExpirationMonth());
				tokenObject.setExpirationYear(orderPaymentInstrument.getCreditCardExpirationYear());
				tokenObject.setCardCode(cardSecurityCode);
			}
		}
	}	
}

module.exports={
	getOrderObject : getOrderObject,
	getOrderDetailsObject : getOrderDetailsObject
}
