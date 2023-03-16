'use strict';

/**
 * Creates testing billing address  for the application.
 * @returns {Object} obj
 */
function CreateCyberSourceBillToObject() {
    var BillToObject = require('~/cartridge/scripts/cybersource/CybersourceBillToObject');
    var billToObject = new BillToObject();

    billToObject.setTitle('This is the Title');
    billToObject.setFirstName('Donald');
    billToObject.setLastName('Rivard');
    billToObject.setStreet1('131 Dartmouth Street');
    billToObject.setCity('Boston');
    billToObject.setState('MA');
    billToObject.setPostalCode('02116');
    billToObject.setCountry('US');
    billToObject.setPhoneNumber('777-777-7777');
    billToObject.setEmail('drivard@cybersource.com');
    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    billToObject.setIpAddress(CommonHelper.getIPAddress());
    billToObject.setDateOfBirth('19541217');
    billToObject.setSsn('000001234');
    return { success: true, billTo: billToObject };
}

/**
 * Creates testing shipping address  for the application.
 * @returns {Object} Object
 */
function CreateCyberSourceShipToObject() {
    var ShipToObject = require('~/cartridge/scripts/cybersource/CybersourceShipToObject');
    var shipToObject = new ShipToObject();
    shipToObject.setTitle('This is the Title');
    shipToObject.setFirstName('Donald');
    shipToObject.setLastName('Rivard');
    shipToObject.setStreet1('131 Dartmouth Streetd');
    shipToObject.setCity('Boston');
    shipToObject.setState('MA');
    shipToObject.setPostalCode('02116');
    shipToObject.setCountry('US');
    shipToObject.setPhoneNumber('777-777-7777');
    shipToObject.setEmail('drivard@cybersource.com');
    shipToObject.setShippingMethod('Bills Shipping');

    return { success: true, shipTo: shipToObject };
}

/**
 * Creates the testing purchase Object where currency is passed in arguments for the application.
 * @param {Object} args : having currency value.
 * @returns {Object} Object
 */
function CreateCyberSourcePurchaseTotalsObject(args) {
    var PurchaseTotalsObject = require('~/cartridge/scripts/cybersource/CybersourcePurchaseTotalsObject');
    var purchaseObject = new PurchaseTotalsObject();

    /**
    * It is mandatory for all Vme services.
    *
    * */
    if (undefined !== args && args.currency) {
        purchaseObject.setCurrency(args.currency);
    } else {
        purchaseObject.setCurrency('USD');
    }
    /** *
     * It is mandatory for Vme confirm purchase (The actual total amount of an order required here), Vme Transaction Details, optional for all services
     *
     * */
    var amount;
    if (undefined !== args && args.amount) {
        amount = parseFloat(args.amount);
    } else {
        amount = parseFloat('200.00');
    }

    var StringUtils = require('dw/util/StringUtils');

    purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amount.valueOf(), '000000.00', 'en_US'));
    return { success: true, purchaseTotals: purchaseObject };
}

/**
 * Creates the testing purchase Object for Tax where currency is passed in arguments for the application.
 * @param {Object} args : having currency value.
 * @returns {Object} Object
 */
function CreateCyberSourcePurchaseTotalsObjectTax(args) {
    var PurchaseTotalsObject = require('~/cartridge/scripts/cybersource/CybersourcePurchaseTotalsObject');
    var purchaseObject = new PurchaseTotalsObject();

    /**
    * It is mandatory for all Vme services.
    *
    * */
    if (undefined !== args && args.currency) {
        purchaseObject.setCurrency(args.currency);
    } else {
        purchaseObject.setCurrency('USD');
    }
    return { success: true, purchaseTotals: purchaseObject };
}

/**
 * Creates the testing Payment Card  Object for the application.
 * @returns {Object} Object
 */
function CreateCyberSourcePaymentCardObject() {
    var CardObject = require('~/cartridge/scripts/cybersource/CybersourceCardObject');
    var cardObject = new CardObject();
    cardObject.setAccountNumber('4000000000000002');
    cardObject.setCardType('001');
    cardObject.setFullName('Donald Rivard');
    cardObject.setExpirationMonth('12');
    cardObject.setExpirationYear('2021');
    cardObject.setCvNumber('321');

    return { success: true, card: cardObject };
}

/**
 * Creates testing billing object to check the missing field check.
 * @param {Object} InvalidFields : boolean.
 * @param {Object} MissingFields : boolean.
 * @returns {Object} Object
 */
function CreateMockCybersourceBillToObject(InvalidFields, MissingFields) {
    var BillToObject = require('~/cartridge/scripts/cybersource/CybersourceBillToObject');
    var billToObject = new BillToObject();

    billToObject.setFirstName('Peter');
    billToObject.setLastName('Pritchard');
    // eslint-disable-next-line
    if (!empty(InvalidFields) && InvalidFields.valueOf()) {
        billToObject.setStreet1('xxxxxxxxxxxxxx');
    } else {
        billToObject.setStreet1('25 Call Street');
    }
    billToObject.setStreet2('');
    billToObject.setCity('Billerica');
    billToObject.setState('MA');
    // eslint-disable-next-line
    if (!empty(MissingFields) && MissingFields.valueOf()) {
        billToObject.setPostalCode('');
    } else {
        billToObject.setPostalCode('01862');
    }
    billToObject.setCountry('US');
    billToObject.setPhoneNumber('978-362-1553');
    billToObject.setEmail('ppritchard@cybersource.com');

    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    billToObject.setIpAddress(CommonHelper.getIPAddress());

    return { success: true, billTo: billToObject };
}

/**
 * Creates testing shipping object to check the missing field check.
 * @param {Object} InvalidFields : boolean.
 * @param {Object} MissingFields : boolean.
 * @returns {Object} obj
 */
function CreateMockCybersourceShipToObject(InvalidFields, MissingFields) {
    var ShipToObject = require('~/cartridge/scripts/cybersource/CybersourceShipToObject');
    var shipToObject = new ShipToObject();

    shipToObject.setFirstName('Peter');
    shipToObject.setLastName('Pritchard');
    // eslint-disable-next-line
    if (!empty(InvalidFields) && InvalidFields.valueOf()) {
        shipToObject.setStreet1('xxxxxxxxxxxxxx');
    } else {
        shipToObject.setStreet1('25 Call Street');
    }
    shipToObject.setStreet2('');
    shipToObject.setCity('Billerica');
    shipToObject.setState('MA');
    // eslint-disable-next-line
    if (!empty(MissingFields) && MissingFields.valueOf()) {
        shipToObject.setPostalCode('');
    } else {
        shipToObject.setPostalCode('01862');
    }
    shipToObject.setCountry('US');
    shipToObject.setPhoneNumber('978-362-1553');
    shipToObject.setEmail('ppritchard@cybersource.com');

    shipToObject.setShippingMethod('Bills Shipping');

    return { success: true, shipTo: shipToObject };
}

/**
 * function creates items for testing purpose.
 * @returns {Object} obj
 */
function getLineItems() {
    var ArrayList = require('dw/util/ArrayList');
    var items = new ArrayList();
    var MockLineItemObject = require('~/cartridge/scripts/cybersource/LineItemObject');
    var item = new MockLineItemObject();
    item.basePrice = '109.00';
    item.quantity = '5';
    item.lineItemClass = 'dw.order.ProductLineItem';
    item.productName = 'foobar is my name';
    item.productID = '11111111';
    item.productCode = '';
    items.add(item);
    return items.iterator();
}

/**
 * Creates objet to check the taxation service.
* @returns {Object} obj
 */
function CreateCybersourceTaxationItems() {
    var ArrayList = require('dw/util/ArrayList');
    var itemMap = new ArrayList();
    var lineItems = getLineItems();
    var items = [];
    var idcount = 0;
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();
    while (lineItems.hasNext()) {
        var lineItem = lineItems.next();
        itemMap.addAt(idcount, lineItem);

        var item = new CybersourceHelper.csReference.Item();
        var StringUtils = require('dw/util/StringUtils');

        item.unitPrice = StringUtils.formatNumber(Math.abs(lineItem.basePrice), '#####0.00', 'en_US');

        if (lineItem.lineItemClass === 'dw.order.ProductLineItem') {
            item.quantity = lineItem.quantity;
        } else {
            item.quantity = 5;
        }
        if (lineItem.lineItemClass === 'dw.order.ProductLineItem') {
            item.productName = lineItem.productName;
            item.productSKU = lineItem.productID;
            item.productCode = '01';
        } else if (lineItem.lineItemClass === 'dw.order.ShippingLineItem') {
            item.productName = lineItem.lineItemText;
            item.productSKU = lineItem.ID;
            item.productCode = '78.100';
        } else {
            item.productName = lineItem.lineItemText;
            item.productSKU = 'PriceAdjustment';
            item.productCode = 'coupon';
        }
        // eslint-disable-next-line
        item.id = idcount++;
        items.push(item);
    }
    return { success: true, items: items, itemMap: itemMap };
}

/**
 * createTaxRequest
 * @returns {Object} obj
 */
function createTaxRequest() {
    var responseObject;
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var basket = BasketMgr.getCurrentOrNewBasket();
    var product = ProductMgr.getProduct('701643465309M');
    Transaction.wrap(function () {
        if (product) {
            var productInCart;
            var shipment = basket.defaultShipment;
            var productListItems = basket.productLineItems;
            for (var q = 0; q < basket.productLineItems.length; q += 1) {
                if (productListItems[q].productID === product.ID) {
                    productInCart = productListItems[q];
                    break;
                }
            }
            if (!productInCart) {
                basket.createProductLineItem(product, null, shipment);
            }
            // eslint-disable-next-line
            dw.system.HookMgr.callHook('dw.order.calculate', 'calculate', basket);
        }
    });
    Transaction.wrap(function () {
        var defaultShipment; var
            shippingAddress;
        defaultShipment = basket.getDefaultShipment();
        shippingAddress = defaultShipment.createShippingAddress();
        shippingAddress.setFirstName('Donald');
        shippingAddress.setLastName('Rivard');
        shippingAddress.setAddress1('131 Dartmouth Streetd');
        shippingAddress.setCity('Boston');
        shippingAddress.setPostalCode('02116');
        shippingAddress.setStateCode('MA');
        shippingAddress.setCountryCode('US');
        shippingAddress.setPhone('777-777-7777');
        // basket.updateShipmentShippingMethod(basket.getDefaultShipment().getID(), '001', null, null);
        var ShippingMgr = require('dw/order/ShippingMgr');
        var defaultShippingMethod = ShippingMgr.getDefaultShippingMethod();

        defaultShipment.setShippingMethod(defaultShippingMethod);
        // eslint-disable-next-line
        dw.system.HookMgr.callHook('dw.order.calculate', 'calculate', basket);
        var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
        var TaxFacade = require(CybersourceConstants.CS_CORE_SCRIPT + 'unittesting/facade/TestFacade');
        responseObject = TaxFacade.TestTax(basket);
    });

    return responseObject;
}

module.exports = {
    CreateCyberSourceBillToObject: CreateCyberSourceBillToObject,
    CreateCyberSourceShipToObject: CreateCyberSourceShipToObject,
    CreateCyberSourcePurchaseTotalsObject: CreateCyberSourcePurchaseTotalsObject,
    CreateCyberSourcePurchaseTotalsObjectTax: CreateCyberSourcePurchaseTotalsObjectTax,
    CreateCyberSourcePaymentCardObject: CreateCyberSourcePaymentCardObject,
    CreateCybersourceTaxationItems: CreateCybersourceTaxationItems,
    CreateMockCybersourceBillToObject: CreateMockCybersourceBillToObject,
    CreateMockCybersourceShipToObject: CreateMockCybersourceShipToObject,
    CreatTaxRequest: createTaxRequest
};
