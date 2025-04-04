'use strict';

// eslint-disable-next-line
var Logger = dw.system.Logger.getLogger('Cybersource');
var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var collections = require('*/cartridge/scripts/util/collections');

/**
 * function
 * @param {*} Obj Obj
 */
function deleteEmptyProperties(Obj) {
    var object = Obj;
    var value;

    Object.keys(object).forEach(function (name) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = object[name];
            if (value === '' || value === null) {
                delete object[name];
            }
        }
    });
}

/**
 * Function
 * @param {*} Basket Basket
 * @returns {*} obj
 */
function getOrderObject(Basket) {
    var basket = Basket;

    if (basket == null) {
        Logger.error('Please provide a Basket!');
        return { error: true };
    }

    var OrderObject = require('*/cartridge/scripts/cardinal/OrderObject');
    var ConsumerObject = require('*/cartridge/scripts/cardinal/ConsumerObject');
    var AddressObject = require('*/cartridge/scripts/cardinal/BillingShippingAddressObject');
    var AccountObject = require('*/cartridge/scripts/cardinal/AccountObject');
    var TokenObject = require('*/cartridge/scripts/cardinal/TokenObject');
    var CartItemObject = require('*/cartridge/scripts/cardinal/CartItemObject');

    var orderObject = new OrderObject();
    var consumerObject = new ConsumerObject();
    var billingObject = new AddressObject();
    var shippingObject = new AddressObject();

    var accountObject = new AccountObject();
    var tokenObject = new TokenObject();
    // var orderdetailsObject = new OrderDetailsObject();
    var cartObject = new CartItemObject();
    // eslint-disable-next-line
    var creditCardForm = session.forms.billing.creditCardFields;
    var cardSecurityCode = creditCardForm.securityCode.value;

    var billingaddress = basket.getBillingAddress();
    var shippingAddress;
    var it = basket.getShipments().iterator();

    if (shippingAddress == null) {
        while (it.hasNext()) {
            var shipment = it.next();
            shippingAddress = shipment.getShippingAddress();
            if (shippingAddress != null) {
                break;
            }
        }
    }

    // eslint-disable-next-line
    if (!empty(billingaddress) && !empty(basket)) {
        /* This if condition checks if billingAddress.address1 is present only for V.Me
            * create the billingObject using billingAddress else it will create billingObject using shippingAddress
            */
        // eslint-disable-next-line
        if (!empty(billingaddress.address1)) {
            billingObject.setFullName(billingaddress.fullName);
            billingObject.setFirstName(billingaddress.firstName);
            billingObject.setMiddleName(billingaddress.secondName);
            billingObject.setLastName(billingaddress.lastName);
            billingObject.setAddress1(billingaddress.address1);
            billingObject.setAddress2(billingaddress.address2);
            billingObject.setCity(billingaddress.city);
            billingObject.setState(billingaddress.stateCode == null ? ' ' : billingaddress.stateCode);
            billingObject.setPostalCode(billingaddress.postalCode);
            billingObject.setCountryCode(billingaddress.countryCode.value);
            billingObject.setPhone1(billingaddress.phone);
        } else {
            billingObject.setFullName(shippingAddress.fullName);
            billingObject.setFirstName(shippingAddress.firstName);
            billingObject.setMiddleName(shippingAddress.secondName);
            billingObject.setLastName(shippingAddress.lastName);
            billingObject.setAddress1(shippingAddress.address1);
            billingObject.setAddress2(shippingAddress.address2);
            billingObject.setCity(shippingAddress.city);
            billingObject.setState(shippingAddress.stateCode == null ? ' ' : shippingAddress.stateCode);
            billingObject.setPostalCode(shippingAddress.postalCode);
            billingObject.setCountryCode(shippingAddress.countryCode.value);
            billingObject.setPhone1(shippingAddress.phone);
        }
    }

    deleteEmptyProperties(billingObject);

    // eslint-disable-next-line
    if (!empty(shippingAddress)) {
        shippingObject.setFullName(shippingAddress.fullName);
        shippingObject.setFirstName(shippingAddress.firstName);
        shippingObject.setMiddleName(shippingAddress.secondName);
        shippingObject.setLastName(shippingAddress.lastName);
        shippingObject.setAddress1(shippingAddress.address1);
        shippingObject.setAddress2(shippingAddress.address2);
        shippingObject.setCity(shippingAddress.city);
        shippingObject.setState(shippingAddress.stateCode);
        shippingObject.setPostalCode(shippingAddress.postalCode);
        shippingObject.setCountryCode(shippingAddress.countryCode.value);
        shippingObject.setPhone1(shippingAddress.phone);
    }

    deleteEmptyProperties(shippingObject);

    var productlineitems = basket.getProductLineItems();
    var lineItemIterator = productlineitems.iterator();

    var cartItems = [];

    while (lineItemIterator.hasNext()) {
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

    collections.forEach(ccPaymentInstruments, function (pi) {
        //  for each (var pi in ccPaymentInstruments) {
        if (pi.paymentMethod.equals(CybersourceConstants.METHOD_CREDIT_CARD) || pi.paymentMethod.equals(CybersourceConstants.METHOD_SA_SILENTPOST)
            || pi.paymentMethod.equals(CybersourceConstants.METHOD_VISA_CHECKOUT)) {
            paymentinstrument = pi;
        }
    });

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

/**
 * function
 * @param {*} order order
 * @param {*} transactionId transactionId
 * @returns {*} obj
 */
function getOrderDetailsObject(order, transactionId) {
    var OrderDetailsObject = require('*/cartridge/scripts/cardinal/OrderDetailsObject');
    var orderdetailsObject = new OrderDetailsObject();

    orderdetailsObject.setOrderNumber(order.orderNo);
    orderdetailsObject.setAmount(order.totalNetPrice.value);
    orderdetailsObject.setTransactionId(transactionId);
    orderdetailsObject.setCurrencyCode(order.currencyCode);
    orderdetailsObject.setOrderChannel('S');
    deleteEmptyProperties(orderdetailsObject);

    return orderdetailsObject;
}

module.exports = {
    getOrderObject: getOrderObject,
    getOrderDetailsObject: getOrderDetailsObject
};
