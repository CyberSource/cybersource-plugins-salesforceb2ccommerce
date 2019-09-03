'use strict';
/* API includes */
var Logger = require('dw/system/Logger').getLogger('Cybersource');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var CybersourceConstants = require('~/cartridge/scripts/utils/CybersourceConstants');
/**
 * Sets the purchasable item amount, does not includes the gift card amount.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */

function CreateCybersourcePurchaseTotalsObject(Basket) {
    var basket = Basket;
    var locale = GetRequestLocale();
    //* *************************************************************************//
    // Check if Basket exists
    //* *************************************************************************//
    if (basket == null) {
        Logger.error('Please provide a Basket!');
        return { error: true };
    }
    var PurchaseTotals_Object = require('~/cartridge/scripts/cybersource/Cybersource_PurchaseTotals_Object');
    var purchaseObject = new PurchaseTotals_Object();
    var Money = require('dw/value/Money');
    var amount = new Money(0, basket.currencyCode);

    //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    var ccPaymentInstruments = basket.getPaymentInstruments();
    if ( !empty(ccPaymentInstruments) ) {
        paymentInstrument = ccPaymentInstruments[0];
    }
    var selectedPaymentMethod = paymentInstrument.paymentMethod;
    var processor = GetPaymentType(selectedPaymentMethod).paymentProcessor;
    for (var i = 0; i < ccPaymentInstruments.length; i++) {
        var pi = ccPaymentInstruments[i];
        if (!pi.paymentMethod.equals('GIFT_CERTIFICATE')) {
            amount = amount.add(pi.paymentTransaction.amount);
        }
    }
    purchaseObject.setCurrency(amount.currencyCode);
    // set the discount amount for Klarna
    setKlarnaDiscountAmount(processor, purchaseObject, basket, locale);
    purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amount.value, '000000.00', locale));

    return { success: true, purchaseTotals: purchaseObject };
}

/**
 * This function set the discount amount for Klarna when product, shipping
 * order level promotion has been applied along with gift card certificate
 */
function setKlarnaDiscountAmount(processor, purchaseObject, basket, locale) {
    // set the local variable
    var discountAmount = 0;
    // check if payment processor is Klarna, get the adjustment amount
    if (CybersourceConstants.KLARNA_PROCESSOR.equals(processor)) {
        for (var i = 0; i < basket.allLineItems.length; i++) {
            var lineItem = basket.allLineItems[i];
            if (lineItem instanceof dw.order.PriceAdjustment) {
                // set the adjustment amount
                discountAmount += Math.abs(lineItem.grossPrice.value);
            }
        }
        // iterate each gift certificate applied and set into discount amount
        for (var i = 0; i < basket.giftCertificatePaymentInstruments.length; i++) {
            var giftCertificate = basket.giftCertificatePaymentInstruments[i];
            discountAmount += Math.abs(giftCertificate.paymentTransaction.amount.value);
        }
        // set discount amount into purchase object when amount is not zero
        if (discountAmount !== 0) {
            purchaseObject.setDiscountAmount(StringUtils.formatNumber(discountAmount, '000000.00', locale));
        }
    }
    return;
}
/**
 * On basis of boolean variable , bill to address object is populated either from basket or shipping address
 * @param formType : String variable can hold value like subscription,billing,paymentinstruments.
 * @param ReadFromBasket : true if value needs to be read from basket or order else false.
 */

function CreateCyberSourceBillToObject(Basket, ReadFromBasket) {
    var BillTo_Object = require('~/cartridge/scripts/cybersource/Cybersource_BillTo_Object');
    var billToObject = new BillTo_Object();
    var paymentInstruments = Basket.getPaymentInstruments();
    var language = GetRequestLocale();
    if (ReadFromBasket) {
        var basket = Basket;
        var billingAddress = basket.billingAddress;
        var shippingAddress = basket.defaultShipment.shippingAddress;

        if (!empty(billingAddress) && !empty(basket)) {
			/* This if condition checks if billingAddress.address1 is present only for V.Me
			* create the billToObject using billingAddress else it will create billToObject using shippingAddress
			*/
            if (!empty(billingAddress.address1)) {
                billToObject.setFirstName(billingAddress.firstName);
                billToObject.setLastName(billingAddress.lastName);
                billToObject.setStreet1(billingAddress.address1);
                billToObject.setStreet2(billingAddress.address2);
                billToObject.setCity(billingAddress.city);
                billToObject.setState(billingAddress.stateCode);
                billToObject.setDistrict(billingAddress.stateCode);
                billToObject.setPostalCode(billingAddress.postalCode);
                billToObject.setCountry(billingAddress.countryCode);
                billToObject.setPhoneNumber(billingAddress.phone);
                billToObject.setEmail(basket.customerEmail);
            } else {
                billToObject.setFirstName(shippingAddress.firstName);
                billToObject.setLastName(shippingAddress.lastName);
                billToObject.setStreet1(shippingAddress.address1);
                billToObject.setStreet2(shippingAddress.address2);
                billToObject.setCity(shippingAddress.city);
                billToObject.setState(shippingAddress.stateCode);
                billToObject.setDistrict(shippingAddress.stateCode);
                billToObject.setPostalCode(shippingAddress.postalCode);
                billToObject.setCountry(shippingAddress.countryCode);
                billToObject.setPhoneNumber(shippingAddress.phone);
                if (customer.registered) {
                    billToObject.setEmail(customer.profile.email);
                } else {
                    billToObject.setEmail('test@test.com');
                }
            }
            if (!empty(basket.getCustomerNo())) {
                billToObject.setCustomerID(basket.getCustomerNo());
            }
        } else {
            billToObject.setFirstName(shippingAddress.firstName);
            billToObject.setLastName(shippingAddress.lastName);
            billToObject.setStreet1(shippingAddress.address1);
            billToObject.setStreet2(shippingAddress.address2);
            billToObject.setCity(shippingAddress.city);
            billToObject.setState(shippingAddress.stateCode);
            billToObject.setDistrict(shippingAddress.stateCode);
            billToObject.setPostalCode(shippingAddress.postalCode);
            billToObject.setCountry(shippingAddress.countryCode);
            billToObject.setPhoneNumber(shippingAddress.phone);
            if (customer.registered) {
                billToObject.setEmail(customer.profile.email);
            } else {
                billToObject.setEmail('test@test.com');
            }
        }
    } else {
        var billAddrForm = session.forms.billing;

        billToObject.setFirstName(billAddrForm.addressFields.firstName.value);
        billToObject.setLastName(billAddrForm.addressFields.lastName.value);
        billToObject.setStreet1(billAddrForm.addressFields.address1.value);
        billToObject.setStreet2(billAddrForm.addressFields.address2.value);
        billToObject.setCity(billAddrForm.addressFields.city.value);
        billToObject.setState(billAddrForm.addressFields.states.stateCode.value);
        billToObject.setPostalCode(billAddrForm.addressFields.postalCode.value);
        billToObject.setCountry(billAddrForm.addressFields.country.value);
        billToObject.setPhoneNumber(billAddrForm.addressFields.phone.value);
        if (customer.registered) {
            billToObject.setCustomerID(customer.ID);
            billToObject.setEmail(customer.profile.email);
        } else {
            billToObject.setEmail('test@test.com');
        }
    }
    billToObject.setIpAddress(GetIPAddress());
    for (var i = 0; i < paymentInstruments.length; i++) {
        var paymentInstrument = paymentInstruments[i];
        if (CybersourceConstants.SOFORT_PAYMENT_METHOD.equals(paymentInstrument.paymentMethod)) {
            billToObject.setLanguage(language);
        }
    }

    return { success: true, billTo: billToObject };
}

/**
 * On basis of form type, bill to address object is populated.
 * @param formType : String variable can hold value like subscription,billing,paymentinstruments.
 */


function CreateCyberSourceBillToObject_UserData(formType) {
    var title,
        firstName,
        lastName,
        street1,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        email,
        dob,
        ipAddress;

    switch (formType) {
        case 'subscription':
            title = session.forms.subscription.title.htmlValue;
            firstName = session.forms.subscription.firstName.htmlValue;
            lastName = session.forms.subscription.lastName.htmlValue;
            street1 = session.forms.subscription.street1.htmlValue;
            city = session.forms.subscription.city.htmlValue;
            state = session.forms.subscription.state.htmlValue;
            postalCode = session.forms.subscription.postalCode.htmlValue;
            country = session.forms.subscription.country.htmlValue;
            phoneNumber = session.forms.subscription.phoneNumber.htmlValue;
            email = session.forms.subscription.email.htmlValue;
            dob = session.forms.subscription.dateOfBirth.htmlValue;
            ipAddress = session.forms.subscription.ipAddress.htmlValue;
            break;
        case 'billing':
            firstName = session.forms.billing.addressFields.firstName.value;
            lastName = session.forms.billing.addressFields.lastName.value;
            city = session.forms.billing.addressFields.city.value;
            country = session.forms.billing.addressFields.country.value;
            email = session.forms.billing.creditCardFields.email.value;
            phoneNumber = session.forms.billing.addressFields.phone.value;
            postalCode = session.forms.billing.addressFields.postalCode.value;
            state = session.forms.billing.addressFields.states.stateCode.value;
            street1 = session.forms.billing.addressFields.address1.value;
            title = '';
            dob = '';
            ipAddress = GetIPAddress();
            break;
        case 'paymentinstruments':
            firstName = session.forms.creditCard.addressFields.firstName.value;
            lastName = session.forms.creditCard.addressFields.lastName.value;
            city = session.forms.creditCard.addressFields.city.value;
            country = '' + session.forms.creditCard.addressFields.country.value;
            email = session.forms.creditCard.email.value;
            postalCode = session.forms.creditCard.addressFields.postalCode.value;
            state = session.forms.creditCard.addressFields.states.stateCode.value;
            street1 = session.forms.creditCard.addressFields.address1.value;
            title = '';
            dob = '';
            ipAddress = GetIPAddress();
            break;
    }
    var BillTo_Object = require('~/cartridge/scripts/cybersource/Cybersource_BillTo_Object');
    var billToObject = new BillTo_Object();
    billToObject.setTitle(title);
    billToObject.setFirstName(firstName);
    billToObject.setLastName(lastName);
    billToObject.setStreet1(street1);
    billToObject.setCity(city);
    billToObject.setState(state);
    billToObject.setPostalCode(postalCode);
    billToObject.setCountry(country);
    if(phoneNumber == null) {
    	 delete billToObject.phoneNumber;
    }
    billToObject.setEmail(email);
    billToObject.setIpAddress(ipAddress);
    billToObject.setDateOfBirth(dob);

    return { success: true, billTo: billToObject };
}


/**
 * Determines if the basket already contains a payment instrument and removes it from the basket except gift certificate.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */
function removeExistingPaymentInstruments(basket) {
    var ccPaymentInstrs = basket.getPaymentInstruments();

    // get all credit card payment instruments

    var iter = ccPaymentInstrs.iterator();
    var existingPI = null;
    var PaymentInstrument = require('dw/order/PaymentInstrument');

    // remove them
    while (iter.hasNext()) {
        existingPI = iter.next();
        if (existingPI.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)) {
            continue;
        } else {
            basket.removePaymentInstrument(existingPI);
        }
    }
}

/**
 * Determines if the basket already contains a payment instrument and removes it from the basket except gift certificate and paymentType.
 * instrument and removes it from the basket.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */
function removeExistingPaymentInstrumentsExceptPaymentType(basket, paymentType) {
    var ccPaymentInstrs = basket.getPaymentInstruments();
    var iter = ccPaymentInstrs.iterator();
    var existingPI = null;
    var PaymentInstrument = require('dw/order/PaymentInstrument');

    // remove them
    while (iter.hasNext()) {
        existingPI = iter.next();
        if (existingPI.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE) || existingPI.paymentMethod.equals(paymentType)) {
            continue;
        } else {
            basket.removePaymentInstrument(existingPI);
        }
    }
}

/* Common function to get payment type from payment method
  custom attribute and value of payment processor */

function GetPaymentType(selectedPaymentMethod) {
    // declare variable
    var paymentObject = {};
    var PaymentMgr = require('dw/order/PaymentMgr');
    // get the payment method object from payment manager
    var paymentMethod = PaymentMgr.getPaymentMethod(selectedPaymentMethod);
    // set and return the value of payment type if exist at payment method level
    if (paymentMethod.custom !== null && 'paymentType' in paymentMethod.custom) {
        paymentObject.paymentType = paymentMethod.custom.paymentType.value;
    }
    paymentObject.paymentProcessor = paymentMethod.paymentProcessor.ID;
    return paymentObject;
}
/**
 * Sets cybersource item object using lineitem, having data related to product, product price,quantity.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */

function CreateCybersourceItemObject(Basket) {
    var basket = Basket;
    var locale = GetRequestLocale();
    var PaymentMgr = require('dw/order/PaymentMgr');
        //  lineItemCtnr.paymentInstrument field is deprecated.  Get default payment method.
    var paymentInstrument = null;
    if ( !empty(basket.getPaymentInstruments()) ) {
        paymentInstrument = basket.getPaymentInstruments()[0];
    }
    var selectedPaymentMethod = paymentInstrument.paymentMethod;
    var processor = GetPaymentType(selectedPaymentMethod).paymentProcessor;
    var lineItems = basket.allLineItems.iterator();
    var ArrayList = require('dw/util/ArrayList');
    var itemObjects = new ArrayList();
    var count = 1;
    while (lineItems.hasNext()) {
        var lineItem = lineItems.next();
        var Item_Object = require('~/cartridge/scripts/cybersource/Cybersource_Item_Object');
        var itemObject = new Item_Object();
        if (lineItem instanceof dw.order.ProductLineItem) {
            itemObject.setUnitPrice(StringUtils.formatNumber(lineItem.proratedPrice.value, '000000.00', locale));
            itemObject.setQuantity(lineItem.quantityValue);
            itemObject.setProductCode('default');
            itemObject.setProductName(lineItem.productName);
            itemObject.setProductSKU(lineItem.productID);
            itemObject.setTaxAmount(StringUtils.formatNumber(lineItem.adjustedTax.value, '000000.00', locale));
            setTotalAmount(processor, itemObject, lineItem.adjustedGrossPrice.value, locale);
            itemObject.setId(count);
        } else if (lineItem instanceof dw.order.GiftCertificateLineItem) {
            itemObject.setUnitPrice(StringUtils.formatNumber(lineItem.grossPrice.value, '000000.00', locale));
            itemObject.setQuantity(1);
            itemObject.setProductCode('GIFT_CERTIFICATE');
            itemObject.setProductName('GIFT_CERTIFICATE');
            itemObject.setProductSKU('GIFT_CERTIFICATE');
            itemObject.setTaxAmount(StringUtils.formatNumber(0, '000000.00', locale));
            setTotalAmount(processor, itemObject, lineItem.grossPrice.value, locale);
            itemObject.setId(count);
        } else if (lineItem instanceof dw.order.ShippingLineItem) {
            itemObject.setUnitPrice(StringUtils.formatNumber(lineItem.adjustedPrice.value, '000000.00', locale));
            itemObject.setQuantity(1);
            itemObject.setProductCode(lineItem.ID);
            itemObject.setProductName(lineItem.ID);
            itemObject.setProductSKU(lineItem.ID);
            if (lineItem.adjustedTax.available && lineItem.adjustedTax.value > 0) {
                itemObject.setTaxAmount(StringUtils.formatNumber(lineItem.adjustedTax.value, '000000.00', locale));
            }
            setTotalAmount(processor, itemObject, lineItem.adjustedGrossPrice.value, locale);
            itemObject.setId(count);
        } else if (lineItem instanceof dw.order.ProductShippingLineItem) {
            itemObject.setUnitPrice(StringUtils.formatNumber(lineItem.adjustedPrice.value, '000000.00', locale));
            itemObject.setQuantity(1);
            itemObject.setProductCode('SHIPPING_SURCHARGE');
            itemObject.setProductName('SHIPPING_SURCHARGE');
            itemObject.setProductSKU('SHIPPING_SURCHARGE');
            itemObject.setTaxAmount(StringUtils.formatNumber(lineItem.adjustedTax.value, '000000.00', locale));
            setTotalAmount(processor, itemObject, lineItem.adjustedGrossPrice.value, locale);
            itemObject.setId(count);
        }
        if (!(lineItem instanceof dw.order.PriceAdjustment)) {
            count += 1;
            itemObjects.add(itemObject);
        }
    }

    return { success: true, items: itemObjects };
}
/**
 * Set tax amount for Klarna
 */
function setKlarnaTaxAmount(itemObject, taxvalue, locale) {
	/* check if taxation policy is net, set the tax amount else set the tax
	 amount to zero for gross policy*/
    if (dw.order.TaxMgr.taxationPolicy === dw.order.TaxMgr.TAX_POLICY_NET) {
        // set the tax value for net taxation policy
        itemObject.setTaxAmount(StringUtils.formatNumber(taxvalue, '000000.00', locale));
    } else {
        // set the tax for gross taxation policy
        itemObject.setTaxAmount(StringUtils.formatNumber(0, '000000.00', locale));
    }
}
/**
 * Set total amount for Bank Transfer and Klarna
 */
function setTotalAmount(processor, itemObject, lineItemValue, locale) {
    if (CybersourceConstants.BANK_TRANSFER_PROCESSOR.equals(processor) || CybersourceConstants.KLARNA_PROCESSOR.equals(processor)) {
        itemObject.setTotalAmount(StringUtils.formatNumber(lineItemValue, '000000.00', locale));
    }
    return;
}

/**
 * Set Klarna item object by passing basket as input
 */
function CreateKlarnaItemObject(Basket) {
    // declare the local variables
    var basket = Basket;
    var locale = GetRequestLocale();
    var selectedPaymentMethod = "KLARNA";
    var processor = GetPaymentType(selectedPaymentMethod).paymentProcessor;
    var lineItems = basket.allLineItems.iterator();
    var ArrayList = require('dw/util/ArrayList');
    var itemObjects = new ArrayList();
    var count = 1;
    while (lineItems.hasNext()) {
        // set the different items into item level object
        var lineItem = lineItems.next();
        var Item_Object = require('~/cartridge/scripts/cybersource/Cybersource_Item_Object');
        var itemObject = new Item_Object();
        if (lineItem instanceof dw.order.ProductLineItem) {
            // set product line item
            itemObject.setUnitPrice(StringUtils.formatNumber(lineItem.basePrice.value, '000000.00', locale));
            itemObject.setQuantity(lineItem.quantityValue);
            itemObject.setProductCode('default');
            itemObject.setProductName(lineItem.productName);
            itemObject.setProductSKU(lineItem.productID);
            setKlarnaTaxAmount(itemObject, lineItem.tax.value, locale);
            setTotalAmount(processor, itemObject, lineItem.grossPrice.value, locale);
            itemObject.setId(count);
        } else if (lineItem instanceof dw.order.ShippingLineItem) {
            // set shipping line item
            itemObject.setUnitPrice(StringUtils.formatNumber(lineItem.basePrice.value, '000000.00', locale));
            itemObject.setQuantity(1);
            itemObject.setProductCode(lineItem.ID);
            itemObject.setProductName(lineItem.ID);
            itemObject.setProductSKU(lineItem.ID);
            setKlarnaTaxAmount(itemObject, lineItem.tax.value, locale);
            setTotalAmount(processor, itemObject, lineItem.grossPrice.value, locale);
            itemObject.setId(count);
        } else if (lineItem instanceof dw.order.ProductShippingLineItem) {
            // set surcharge added on shipping item
            itemObject.setUnitPrice(StringUtils.formatNumber(lineItem.basePrice.value, '000000.00', locale));
            itemObject.setQuantity(lineItem.quantity.value);
            itemObject.setProductCode('SHIPPING_SURCHARGE');
            itemObject.setProductName('SHIPPING_SURCHARGE');
            itemObject.setProductSKU('SHIPPING_SURCHARGE');
            setKlarnaTaxAmount(itemObject, lineItem.tax.value, locale);
            setTotalAmount(processor, itemObject, lineItem.grossPrice.value, locale);
            itemObject.setId(count);
        }
        if (!(lineItem instanceof dw.order.PriceAdjustment)) {
            count += 1;
            itemObjects.add(itemObject);
        }
    }

    return { success: true, items: itemObjects };
}
/**
 * Sets currency and amount in purchase object.
 * @param currency : Currency of the site
 * @param amount : purchasable amount
 */


function CreateCyberSourcePurchaseTotalsObject_UserData(currency, amount) {
    var locale = GetRequestLocale();
    var PurchaseTotals_Object = require('~/cartridge/scripts/cybersource/Cybersource_PurchaseTotals_Object');
    var purchaseObject = new PurchaseTotals_Object();
    if (empty(currency)) { currency = Site.getCurrent().getDefaultCurrency(); }

    purchaseObject.setCurrency(currency);

    var amount = parseFloat(amount);
    if (!empty(amount)) {
        if (isNaN(amount)) {
            return { error: true, errorCode: '102', errorMsg: 'Amount value is invalid' };
        }
        purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amount.valueOf(), '000000.00', locale));
    } else {
        return { error: true, errorCode: '101', errorMsg: 'Amount value is missing' };
    }

    return { success: true, purchaseTotals: purchaseObject };
}

/**
 * Sets Shipping city,state,zipcode and country from site preference.
 */


function CreateCybersourceShipFromObject() {
    var ShipFrom_Object = require('~/cartridge/scripts/cybersource/Cybersource_ShipFrom_Object');
    var shipFrom = new ShipFrom_Object();

    shipFrom.setCity(Site.getCurrent().getCustomPreferenceValue('CsShipFromCity'));
    shipFrom.setState(Site.getCurrent().getCustomPreferenceValue('CsShipFromStateCode'));
    shipFrom.setPostalCode(Site.getCurrent().getCustomPreferenceValue('CsShipFromZipCode'));
    shipFrom.setCountry(Site.getCurrent().getCustomPreferenceValue('CsShipFromCountryCode'));

    return { success: true, shipFrom: shipFrom };
}


/**
 * Creates shipping address and sets the shipping method.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */

function CreateCybersourceShipToObject(Basket) {
    var basket = Basket;

    var ShipTo_Object = require('~/cartridge/scripts/cybersource/Cybersource_ShipTo_Object');
    var shipToObject = new ShipTo_Object();
    var shippingAddress = basket.defaultShipment.shippingAddress;
    var shippingMethod = basket.defaultShipment.shippingMethod;
    var it = basket.getShipments().iterator();
    
    if (shippingAddress == null) {
        while (it.hasNext()) {
            var shipment = it.next();
            shippingAddress = shipment.getShippingAddress();
            shippingMethod = shipment.getShippingMethod();
            if (shippingAddress != null) {
                break;
            }
        }
    }
    if (!empty(shippingAddress) && !empty(basket)) {
        shipToObject.setFirstName(shippingAddress.firstName);
        shipToObject.setLastName(shippingAddress.lastName);
        shipToObject.setStreet1(shippingAddress.address1);
        shipToObject.setStreet2(shippingAddress.address2);
        shipToObject.setCity(shippingAddress.city);
        shipToObject.setState(shippingAddress.stateCode);
        shipToObject.setDistrict(shippingAddress.stateCode);
        shipToObject.setPostalCode(shippingAddress.postalCode);
        shipToObject.setCountry(shippingAddress.countryCode);
        shipToObject.setPhoneNumber(shippingAddress.phone);
        shipToObject.setEmail(basket.customerEmail);
        //* ****************************************************//
        // ShippingMethod custom attribute CybersourceShippingID is used to fetch Cybersource Shipping method i.e. oneday, sameday, twoday etc.
        // if merchant does not specify Cybersource Shipping Id whilie creating shipping methods within Business Manager, the switch statement
        // fetch default shipping method available in Demandware's Site Genesis.
        //* ****************************************************//
        if (!empty(shippingMethod)) {
            if (!empty(shippingMethod.custom.CybersouceShippingID.value)) {
                shipToObject.setShippingMethod(shippingMethod.custom.CybersouceShippingID.value);
            } else {
                switch (shippingMethod.displayName) {
                    case 'Overnight':
                        shipToObject.setShippingMethod('oneday');
                        break;
                    case 'Next Day':
                        shipToObject.setShippingMethod('oneday');
                        break;
                    case '2-Day Express':
                        shipToObject.setShippingMethod('twoday');
                        break;
                    case 'Super Saver':
                        shipToObject.setShippingMethod('threeday');
                        break;
                    case 'Ground':
                        shipToObject.setShippingMethod('other');
                        break;
                    case 'None':
                        shipToObject.setShippingMethod('none');
                        break;
                    default:
                        shipToObject.setShippingMethod('none');
                        break;
                }
            }
        } else {
            shipToObject.setShippingMethod('none');
        }
    }

    return { success: true, shipTo: shipToObject };
}

/**
 * This function appends shipping totals and basket totals to string (adjustedMerchandizeTotalPrice includes order level price adjustments).
 * Basket Net total checked as to catch all for both taxation policies not including taxe.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */

function CreateCartStateString(Basket) {
    var basket = Basket;
    var cartStateString = '';
    var surcharge = false;

    var productLineItems = basket.getAllProductLineItems().iterator();
    while (productLineItems.hasNext()) {
        var productLineItem = productLineItems.next();
        if (productLineItem.shippingLineItem !== null && productLineItem.shippingLineItem.surcharge && basket.adjustedShippingTotalTax.value === 0) {
            surcharge = true;
        }
        cartStateString += productLineItem.productID + ';' + productLineItem.quantityValue + ';' + productLineItem.adjustedPrice + '|';
    }

    // Append shipping totals and basket totals to string (adjustedMerchandizeTotalPrice includes order level price adjustments). Basket Net total checked as catch all for both taxation policies not including taxe.

    cartStateString += basket.adjustedShippingTotalPrice.valueOrNull + '|' + basket.adjustedMerchandizeTotalPrice.valueOrNull + '|' + basket.totalNetPrice.valueOrNull + '|' + basket.defaultShipment.shippingAddress.stateCode + '|' + basket.defaultShipment.shippingAddress.city.toLowerCase() + '|' + basket.defaultShipment.shippingAddress.countryCode + '|' + basket.defaultShipment.shippingAddress.postalCode + '|' + basket.defaultShipment.shippingMethodID;

    // Check if the cartStateString in session is the same as the newly calculated cartStateString.
    // If the strings are the same, then the cart has not changed and tax calculation will be skipped
    Logger.debug('CartStateStrings: ( {0}----{1} )', session.custom.cartStateString, cartStateString);
    if (!empty(session.custom.cartStateString) && session.custom.cartStateString === cartStateString && !surcharge) {
        session.custom.SkipTaxCalculation = true;
        return { error: true, CartStateString: cartStateString };
    }

    return { success: true, CartStateString: cartStateString };
}

/**
 * If debug is true then requested data is printed in logs.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param OrderNo : No of the order
 * @param request : http request
 * @param response : http response
 * @param bill To : billing address of the order
 * @param ship to : Shipping address of the order
 * @param card : card details
 * @param shipFrom : site preference shipping details
 * @param itemArray : Array of Items purchased
 * @param purchaseTotals : total of the amt with out gift card
 * @param taxService : tax details
 */
function Debug(OrderNo, request, response, Basket, billTo, shipTo, card, shipFrom, itemArray, itemMap, purchaseTotals, taxService) {
    var billToObject = billTo;
    var shipToObject = shipTo;
    var cardObject = card;
    var purchaseObject = purchaseTotals;
    var itemArray = itemArray;
    var itemMap = itemMap;
    var shipFrom = shipFrom;
    var taxService = taxService;
    var basket = Basket;
    var orderno = OrderNo;
    var debug = Site.getCurrent().getCustomPreferenceValue('CsDebugCybersource');

    if (debug === true && orderno !== null) {
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var co = CustomObjectMgr.getCustomObject('cybersourceDebug', orderno);
        if (co == null) {
            co = CustomObjectMgr.createCustomObject('cybersourceDebug', orderno);
            var txrq = getRequestString(billToObject, shipToObject, purchaseObject, cardObject, shipFrom, taxService, itemArray, basket.UUID);
            var txrsp = getResponseString(response);
            co.custom.TaxRequest = txrq;
            co.custom.TaxResponse = txrsp;
        }
    }
    return { success: true };
}

/**
 * Creates String for the input object.
 * @param obj : Object.
 */

function getResponseString(obj) {
    var ret = '';
    ret += 'reasonCode: ' + obj.reasonCode; totalDistrictTaxAmount;
    ret += '\n';
    ret += 'grandTotalAmount: ' + obj.taxReply.grandTotalAmount;
    ret += '\n';
    ret += 'totalCityTaxAmount: ' + obj.taxReply.totalCityTaxAmount;
    ret += '\n';
    ret += 'totalCountyTaxAmount: ' + obj.taxReply.totalCountyTaxAmount;
    ret += '\n';
    ret += 'totalStateTaxAmount: ' + obj.taxReply.totalStateTaxAmount;
    ret += '\n';
    ret += 'totalTaxAmount: ' + obj.taxReply.totalTaxAmount;
    ret += '\n';
    ret += 'totalTaxableAmount: ' + obj.taxReply.totalTaxableAmount;
    ret += '\n';
    ret += 'totalExemptAmount: ' + obj.taxReply.totalExemptAmount;
    ret += '\n';
    ret += 'totalSpecialTaxAmount: ' + obj.taxReply.totalSpecialTaxAmount;
    ret += '\n';
    ret += 'totalCountryTaxAmount: ' + obj.taxReply.totalCountryTaxAmount;
    ret += '\n';

    if (obj.decision === 'ACCEPT') {
        var resItem;
        ret += 'decision: ACCEPT';
        ret += '\n';
        ret += '------------Item Tax ------------';
        ret += '\n';
        for (var i = 0; i < obj.taxReply.item.length; i++) {
            var resItem = obj.taxReply.item[i];
            ret += '	item id: ' + resItem.id;
            ret += '\n';
            ret += '	item cityTaxAmount: ' + resItem.cityTaxAmount;
            ret += '\n';
            ret += '	item countyTaxAmount: ' + resItem.countyTaxAmount;
            ret += '\n';
            ret += '	item stateTaxAmount: ' + resItem.stateTaxAmount;
            ret += '\n';
            ret += '	item totalTaxAmount: ' + resItem.totalTaxAmount;
            ret += '\n';
            ret += '	item countryTaxAmount: ' + resItem.countryTaxAmount;
            ret += '\n';
            ret += '	item specialTaxAmount: ' + resItem.specialTaxAmount;
            ret += '\n';
            ret += '	item exemptAmount: ' + resItem.exemptAmount;
            ret += '\n';
        }
        for (var i = 0; i < obj.taxReply.item.jurisdiction.length; i++) {
            var resItem = obj.taxReply.item.jurisdiction[i];
            ret += '	item id: ' + resItem.jurisId;
            ret += '\n';
            ret += '	taxAmount: ' + resItem.taxAmount;
            ret += '\n';
            ret += '	taxName: ' + resItem.taxName;
            ret += '\n';
        }
    }
    return ret;
}

/**
 * Requested string is gievn in particular format
 * @param bill To : billing address of the order
 * @param ship to : Shipping address of the order
 * @param card : card details
 * @param shipFrom : site preference shipping details
 * @param items : Array of Items purchased
 * @param purchase : total of the amt with out gift card
 * @param taxService : tax details
 * @param refCode : Refference code for the request
 */

function getRequestString(billTo, shipTo, purchase, card, shipFrom, taxService, items, refCode) {
    var ret = '',
        value;
    ret = 'Merchant Reference Code : ' + refCode;
    ret += '\n';
    for (var name in billTo) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = billTo[name];
            if (value !== '') {
                ret += 'billto.' + name + ' :' + value;
                ret += '\n';
            }
        }
    }
    for (var name in shipTo) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = shipTo[name];
            if (value !== '') {
                ret += 'shipto.' + name + ' :' + value;
                ret += '\n';
            }
        }
    }

    for (var name in purchase) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = purchase[name];
            if (value !== '') {
                ret += 'purchase.' + name + ' :' + value;
                ret += '\n';
            }
        }
    }
    for (var name in card) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = card[name];
            if (value !== '') {
                ret += 'card.' + name + ' :' + value;
                ret += '\n';
            }
        }
    }
    for (var name in shipFrom) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            var value = shipFrom[name];
            if (value !== '') {
                ret += 'shipfrom.' + name + ' :' + value;
                ret += '\n';
            }
        }
    }
    for (var name in taxService) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            var value = taxService[name];
            if (value !== '') {
                ret += 'taxService.' + name + ' :' + value;
                ret += '\n';
            }
        }
    }
    return ret;
}

/**
 * Updates the shipping address with the standard shipping address or the billing address.
 * @param StandardizedAddress : Standard address.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 * @param useAsBillingAddress : Boolean variable if true then shipping address is over ridden by billing address.
 */
function UpdateOrderShippingAddress(StandardizedAddress, Basket, useAsBillingAddress) {
    var Transaction = require('dw/system/Transaction');
    var shippingAddress = Basket.defaultShipment.shippingAddress;
    var stdAddress = StandardizedAddress;
    Transaction.wrap(function () {
        shippingAddress.setAddress1(stdAddress.address1);
        shippingAddress.setAddress2(stdAddress.address2);
        shippingAddress.setCity(stdAddress.city);
        shippingAddress.setStateCode(stdAddress.state);
        shippingAddress.setCountryCode(stdAddress.country);
        shippingAddress.setPostalCode(stdAddress.postalCode);
        shippingAddress.setFirstName(stdAddress.firstName);
        shippingAddress.setLastName(stdAddress.lastName);

        if (useAsBillingAddress === true) {
            var billingAddress = Basket.billingAddress;
            billingAddress.setAddress1(stdAddress.address1);
            billingAddress.setAddress2(stdAddress.address2);
            billingAddress.setCity(stdAddress.city);
            billingAddress.setStateCode(stdAddress.state);
            billingAddress.setCountryCode(stdAddress.country);
            billingAddress.setPostalCode(stdAddress.postalCode);
            billingAddress.setFirstName(stdAddress.firstName);
            billingAddress.setLastName(stdAddress.lastName);
        }
    });
    return { success: true };
}

/**
 * Updates tax if Gift certificate/card amount is present inorder total.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */

function UpdateTaxForGiftCertificate(Basket) {
    var basket = Basket;
    if (basket === null) {
        return { error: true };
    }
    try {
        if (basket.getGiftCertificateLineItems().size() > 0) {
            var shipments = basket.getShipments().iterator();
            while (shipments.hasNext()) {
                var shipment = shipments.next();
                var shipmentLineItems = shipment.getAllLineItems().iterator();
                while (shipmentLineItems.hasNext()) {
                    var lineItem = shipmentLineItems.next();
                    if (lineItem.tax.value > 0) {
                        continue;
                    } else {
                        lineItem.updateTax(0);
                    }
                }
            }
        }
        basket.updateTotals();
    } catch (e) {
        Logger.error('[CommonHelper.ds] Error in giftcertificate tax updation ( {0} )', e.message);
        return { error: true, errorMsg: e.message };
    }

    return { success: true };
}

/**
 * Calculates amount which customer needs to pay this amount does not include Gift certificate/card amount.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */

function calculatePurchaseTotal(lineItemCtnr, paypal) {
    var locale = GetRequestLocale();
    var PurchaseTotals_Object = require('~/cartridge/scripts/cybersource/Cybersource_PurchaseTotals_Object');
    var purchaseObject = new PurchaseTotals_Object(),
        shippingAmount;
    purchaseObject.setCurrency(lineItemCtnr.currencyCode);
    var subTotal = lineItemCtnr.getAdjustedMerchandizeTotalPrice();
    var shipment = lineItemCtnr.defaultShipment;

    var isGiftCertificate = false;
    if (lineItemCtnr.getGiftCertificatePaymentInstruments().size() > 0) {
        isGiftCertificate = true;
    }
    if (!isGiftCertificate) {
        if (lineItemCtnr.shippingTotalPrice.available && lineItemCtnr.shippingTotalPrice.value > 0) {
            purchaseObject.setShippingAmount(StringUtils.formatNumber(lineItemCtnr.shippingTotalPrice.value, '#.00', locale));
        } else {
            purchaseObject.setShippingAmount(StringUtils.formatNumber(0, '0.00', locale));
        }
        var shippingAdjustmentItr = shipment.getShippingPriceAdjustments().iterator();
        while (shippingAdjustmentItr.hasNext()) {
            var priceAdj = shippingAdjustmentItr.next();
            if (priceAdj != null) {
                purchaseObject.setShippingDiscountAmount(StringUtils.formatNumber(priceAdj.price.value, '0.00', locale));
            }
        }

        if (dw.order.TaxMgr.taxationPolicy === dw.order.TaxMgr.TAX_POLICY_NET) {
            if (lineItemCtnr.totalTax.available && lineItemCtnr.totalTax.value > 0) {
                purchaseObject.setTaxAmount(StringUtils.formatNumber(lineItemCtnr.totalTax.value, '#.00', locale));
            } else {
                purchaseObject.setTaxAmount(StringUtils.formatNumber(0, '0.00', locale));
            }
        }
        purchaseObject.setSubtotalAmount(StringUtils.formatNumber(subTotal.value, '#.00', locale));
    }
    var amountOpen = (paypal !== null && paypal !== undefined && paypal ? calculateNonGiftCertificateAmountPayPal(lineItemCtnr) : calculateNonGiftCertificateAmount(lineItemCtnr));
    purchaseObject.setGrandTotalAmount(StringUtils.formatNumber(amountOpen.value, '#.00', locale));
    return purchaseObject;
}

/**
 * Calculates amount which customer needs to pay this amount does not include Gift certificate/card amount.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */
function calculateNonGiftCertificateAmount(lineItemCtnr) {
    // declare variable
    var totalAmount;
    var Money = require('dw/value/Money');
    // set the total amount
    if (lineItemCtnr.totalGrossPrice.available) {
        totalAmount = lineItemCtnr.totalGrossPrice;
    } else {
        totalAmount = lineItemCtnr.adjustedMerchandizeTotalPrice;
    }
    var giftCertTotal = new Money(0.0, lineItemCtnr.currencyCode);
    // get the list of all gift certificate payment instruments
    var gcPaymentInstrs = lineItemCtnr.getGiftCertificatePaymentInstruments();
    var iter = gcPaymentInstrs.iterator();
    var orderPI = null;
    // sum the total redemption amount
    while (iter.hasNext()) {
        orderPI = iter.next();
        giftCertTotal = giftCertTotal.add(orderPI.getPaymentTransaction().getAmount());
    }
    // get the order total
    var orderTotal = totalAmount;
    // calculate the amount to charge for the payment instrument
    // this is the remaining open order total which has to be paid
    var amountOpen = orderTotal.subtract(giftCertTotal);

    return amountOpen;
}

/**
 * Calculates amount which customer needs to pay through paypal express. This amount does not include Gift certificate/card amount.
 * @param LineItemCtnrObj : dw.order.LineItemCtnr contains object of basket or order
 */
function calculateNonGiftCertificateAmountPayPal(lineItemCtnr) {
    // declare variable
    var Money = require('dw/value/Money');
    var totalAmount= new Money(0.0, lineItemCtnr.currencyCode);
    // set the total amount
    if (lineItemCtnr.totalGrossPrice.available) {
        totalAmount = lineItemCtnr.totalGrossPrice;
    } else {
        totalAmount = lineItemCtnr.adjustedMerchandizeTotalPrice.add(lineItemCtnr.adjustedShippingTotalPrice);
    }
    var giftCertTotal = new Money(0.0, lineItemCtnr.currencyCode);
    // get the list of all gift certificate payment instruments
    var gcPaymentInstrs = lineItemCtnr.getGiftCertificatePaymentInstruments();
    var iter = gcPaymentInstrs.iterator();
    var orderPI = null;
    // sum the total redemption amount
    while (iter.hasNext()) {
        orderPI = iter.next();
        giftCertTotal = giftCertTotal.add(orderPI.getPaymentTransaction().getAmount());
    }
    // get the order total
    var orderTotal = totalAmount;
    // calculate the amount to charge for the payment instrument
    // this is the remaining open order total which has to be paid
	var amountOpen = totalAmount.subtract(giftCertTotal);

    return amountOpen;
}
/**
*Get Request IP Address
*/
function GetIPAddress() {
    return request.httpHeaders['x-is-remote_addr'];
}


/**
* Validates billing address of the user.
*/
function validateBillingAddress() {
    var result = { success: true };
    var firstName =(session.forms.billing.addressFields.firstName.value); 
	var lastName =(session.forms.billing.addressFields.lastName.value);
	var city = (session.forms.billing.addressFields.city.value);
	var country = (session.forms.billing.addressFields.country.value);
	var email = (session.forms.billing.creditCardFields.email.value);
	var phoneNumber = (session.forms.billing.creditCardFields.phone.value);
	var postalCode = (session.forms.billing.addressFields.postalCode.value);
	var state = (session.forms.billing.addressFields.states.stateCode.value);
	var street1 = (session.forms.billing.addressFields.address1.value);
    var errorMsg = [];
    var Resource = require('dw/web/Resource');
    if (!validFieldData(firstName, 0, 50)) {
        errorMsg.push(Resource.msg('address.firstname.missing', 'forms', null));
    }
    if (!validFieldData(lastName, 0, 50)) {
        errorMsg.push(Resource.msg('address.lastname.missing', 'forms', null));
    }
    if (!validFieldData(street1, 0, 50)) {
        errorMsg.push(Resource.msg('resource.addresserror', 'forms', null));
    }
    if (!validFieldData(city, 2, 50)) {
        errorMsg.push(Resource.msg('address.city.missing', 'forms', null));
    }
    if (!validFieldData(postalCode, 5, 10)) {
        errorMsg.push(Resource.msg('resource.errorzip', 'forms', null));
    } else {
        var postalCodeVal = '';
        switch (country.toLowerCase()) {
            case 'us':
                postalCodeVal = postalCode.match(/(^\d{5}(-\d{4})?$)|(^[abceghjklmnprstvxyABCEGHJKLMNPRSTVXY]{1}\d{1}[A-Za-z]{1} *\d{1}[A-Za-z]{1}\d{1}$)/gi);
                break;
            case 'gb':
                postalCodeVal = postalCode.match(/(^([A-PR-UWYZ0-9][A-HK-Y0-9][AEHMNPRTVXY0-9]?[ABEHMNPRVWXY0-9]? {1,2}[0-9][ABD-HJLN-UW-Z]{2}|GIR 0AA)$)/gi);
                break;
            case 'fr':
                postalCodeVal = postalCode.match(/(^(F-)?((2[A|B])|[0-9]{2})[0-9]{3}$)/gi);
                break;
            case 'it':
                postalCodeVal = postalCode.match(/(^([0-9]){5}$)/gi);
                break;
            case 'jp':
                postalCodeVal = postalCode.match(/(^([0-9]){3}[-]([0-9]){4}$)/gi);
                break;
            case 'cn':
                postalCodeVal = postalCode;
                break;
            default:
                postalCodeVal = postalCode;
                break;
        }
        if (empty(postalCodeVal) || postalCodeVal === '') {
            errorMsg.push(Resource.msg('resource.errorzip', 'forms', null));
        }
    }
    if (!validFieldData(country, 0, 100)) {
        errorMsg.push(Resource.msg('address.country.missing', 'forms', null));
    }
    if (!validFieldData(phoneNumber, 0, 20)) {
        errorMsg.push(Resource.msg('address.phone.missing', 'forms', null));
    }
    if (validFieldData(email, 0, 50)) {
        var emailVal = email.match(/^[\w.%+-]+@[\w.-]+\.[\w]{2,6}$/gi);
        if (empty(emailVal) || emailVal === '') {
            errorMsg.push(Resource.msg('address.email.invalid', 'forms', null));
        }
    } else {
        errorMsg.push(Resource.msg('address.email.invalid', 'forms', null));
    }
    if (errorMsg.length > 0) {
        var errormsg = errorMsg.join();
        result = { error: true, errorMsg: errormsg };
    }
    return result;
}

function validFieldData(fieldValue, fieldMinlength, fieldMaxlength) {
    if (!empty(fieldValue) && fieldValue.length >= fieldMinlength && fieldValue.length <= fieldMaxlength) {
        return true;
    }

    return false;
}

/**
* Get saved card token of customer save card based on matched cardUUID
*/
function GetSubscriptionToken(cardUUID, CustomerObj) {
    var token = null;
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    if (!empty(CustomerObj) && CustomerObj.authenticated && !empty(cardUUID)) {
        var wallet = CustomerObj.getProfile().getWallet();
        var paymentInstruments = wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
        var creditCardInstrument;
        var instrumentsIter = paymentInstruments.iterator();
        while (instrumentsIter.hasNext()) {
            creditCardInstrument = instrumentsIter.next();
            // find token ID exists for matching payment card
            if (creditCardInstrument.UUID.equals(cardUUID) && !empty(creditCardInstrument.getCreditCardToken())) {
                token = creditCardInstrument.getCreditCardToken();
                break;
            }
        }
    }
    return token;
}

/**
* Get request locale in format en-US basically replace _ with -
*/
function GetRequestLocale() {
    var locale = request.locale.equals('default') ? 'en-us' : request.locale.replace('_', '-').toLowerCase();
    return locale;
}

/**
 * Function to create signature using HMAC256 algo, this funation usedthe secret key for the same.
 * @param dataToSign : Comma separated data.
 * @param secretKey : secretKey of the payment method defined in cybersource.
 */

function signedDataUsingHMAC256(dataToSign, secretKey) {
    var signature;
    var mac = new dw.crypto.Mac(dw.crypto.Mac.HMAC_SHA_256);

    if (!empty(dataToSign) && !empty(secretKey)) {
        signature = dw.crypto.Encoding.toBase64(mac.digest(dataToSign, new dw.util.Bytes(secretKey, 'UTF-8')));
    }
    return signature;
}

/**
*  Function to create request object for Cybersource Session service
*  param
*/
function getInitSessionRequest(sessionRequest, lineItemCntr) {
    var CybersourceHelper = require('/cartridge/scripts/cybersource/libCybersource');
    sessionRequest.merchantID = CybersourceHelper.getMerchantID();
    request.purchaseTotals = __copyPurchaseTotals(purchase);
}

/**
*  Function to create purchase total object
*/
function getPurchaseTotal(lineItemCntr) {
    var purchaseObject = calculatePurchaseTotal(lineItemCntr);
    return purchaseObject;
}

/**
*  Function to create purchase total object
*/
function getPurchaseTotalPayPal(lineItemCntr) {
    var purchaseObject = calculatePurchaseTotal(lineItemCntr, true);
    return purchaseObject;
}

/**
* Function to create Item for Session request
*
*/
function getItemObject(basket) {
    var Money = require('dw/value/Money');
    var Item_Object = require('~/cartridge/scripts/cybersource/Cybersource_Item_Object');
    var lineItems = basket.allLineItems.iterator();
    var itemObjects = [];
    var count = 1;
    var locale = GetRequestLocale();
    // START adjust order level promos
    var basketSubTotalPrice = basket.getAdjustedMerchandizeTotalPrice();

    var orderDiscount = new Money(0, basket.currencyCode);
    var subTotal = basket.adjustedMerchandizeTotalPrice;
    for (var i = 0; i < basket.priceAdjustments.length; i++) {
        var promo = basket.priceAdjustments[i];
        orderDiscount = orderDiscount.add(promo.price);
        if (promo.price.value < 0) {
            basketSubTotalPrice = subTotal.add(promo.price.multiply(-1));
        }
    }
    if (basket.getGiftCertificatePaymentInstruments().size() > 0) {
        // itemObjects.push(getGiftCertificateLineItem(basket));
    }
    var orderLevelAdjustment = basket.getPriceAdjustments();
    var orderLevelIterator = orderLevelAdjustment.iterator();
    var orderLevelAdjustmentPrice = null;
    var orderLevelTaxAdjustment = null;
    while (orderLevelIterator.hasNext()) {
        var oLevelPriceAdjustment = orderLevelIterator.next();
        orderLevelAdjustmentPrice = oLevelPriceAdjustment.price;
        orderLevelTaxAdjustment = oLevelPriceAdjustment.tax;
    }
    // END adjust order level promos
    var adjustedLineItemFinalPrice;
    var adjustedLineItemTaxPrice;
    while (lineItems.hasNext()) {
        var lineItem = lineItems.next();
        var itemObject = new Item_Object();
        var actualQuantity = 0;
        if (lineItem instanceof dw.order.ProductLineItem) {
            actualQuantity = lineItem.quantity.value;
            if (orderLevelAdjustmentPrice != null) {
                orderLevelAdjustmentPrice = orderLevelAdjustmentPrice.multiply(-1);
            }
            if (orderLevelTaxAdjustment != null) {
                orderLevelTaxAdjustment = orderLevelTaxAdjustment.multiply(-1);
            }
            if (orderLevelAdjustmentPrice != null && !empty(orderLevelAdjustmentPrice)) {
                adjustedLineItemFinalPrice = getOrderLevelAdjustedLineItemPrice(lineItem);
            } else {
                adjustedLineItemFinalPrice = lineItem.getAdjustedPrice().divide(actualQuantity);
            }
            itemObject.setUnitPrice(StringUtils.formatNumber(Math.abs(adjustedLineItemFinalPrice.getValue()), '#.00', locale));
            itemObject.setQuantity(lineItem.quantityValue);
            itemObject.setProductCode('default');
            if (orderLevelTaxAdjustment != null && !empty(orderLevelTaxAdjustment) && orderLevelAdjustmentPrice.value > 0) {
                adjustedLineItemTaxPrice = lineItem.adjustedTax.subtract(orderLevelTaxAdjustment);
            } else {
                adjustedLineItemTaxPrice = lineItem.adjustedTax;
            }
            if (dw.order.TaxMgr.taxationPolicy === dw.order.TaxMgr.TAX_POLICY_NET) {
            	if(adjustedLineItemTaxPrice.available && adjustedLineItemTaxPrice.getValue() > 0) {
            		itemObject.setTaxAmount(StringUtils.formatNumber(Math.abs(adjustedLineItemTaxPrice.getValue()), '#.00', locale));
            	}
                else {
                	itemObject.setTaxAmount(StringUtils.formatNumber(0, '0.00', locale));
                }
            }
            itemObject.setProductName(lineItem.productName);
            itemObject.setProductSKU(lineItem.productID);
            itemObject.setId(count);
        } else if (lineItem instanceof dw.order.ShippingLineItem) {
            continue;
        } else if (lineItem instanceof dw.order.ProductShippingLineItem) {
            continue;
        }
        if (!(lineItem instanceof dw.order.PriceAdjustment) && lineItem.adjustedPrice.value > 0) {
            count += 1;
            itemObjects.push(itemObject);
        }
    }
    return itemObjects;
}
/*
* Function to get order level adjustment
*/
function getOrderLevelAdjustedLineItemPrice(lineItem) {
    var price = 0,
        quantity,
        proratedPrice;
    quantity = lineItem.quantity.value;
    proratedPrice = lineItem.proratedPrice;
    price = proratedPrice.divide(quantity);
    return price;
}


/*
*  Function to add address in basket from 3rd party payment provider
*/

function addAddressToCart(lineItemCntr, responseObj, overrideShipping) {
    var billTo = responseObj.billTo;
    var shipTo = responseObj.shipTo;
    var billingAddress = lineItemCntr.getBillingAddress();
    if (empty(billingAddress)) {
        billingAddress = lineItemCntr.createBillingAddress();
    }

    /*Custom Address fields handling for Shipping and Billing for PayPal. Priortize basket billing address, if it exists,
    	over paypal billing address. Validate all mandatory SFRA-billing fields. */
	if(billAddressExistsInBasket(lineItemCntr)) {
		if(!empty(billTo.email)) {
			lineItemCntr.setCustomerEmail(billTo.email);
		}
	}
	else {
		//if (!empty(billTo.street1) && !empty(billTo.city) && !empty(billTo.state)
       	// && !empty(billTo.postalCode) && !empty(billTo.country)) {
			billingAddress.setFirstName(billTo.firstName);
        	billingAddress.setLastName(billTo.lastName);
        	billingAddress.setAddress1(billTo.street1);
        	billingAddress.setAddress2(billTo.street2);
        	billingAddress.setCity(billTo.city);
        	billingAddress.setPostalCode(billTo.postalCode);
        	billingAddress.setCountryCode(billTo.country);
        	billingAddress.setStateCode(billTo.state);
        	lineItemCntr.setCustomerEmail(billTo.email);
        	billingAddress.setPhone(billTo.phoneNumber);
   		/* } else {
        	billingAddress.setFirstName(billTo.firstName);
        	billingAddress.setLastName(billTo.lastName);
        	billingAddress.setAddress1('1295 Charleston Rd');
        	billingAddress.setAddress2('');
        	billingAddress.setCity('Mountain View');
        	billingAddress.setStateCode('CA');
        	billingAddress.setPostalCode('94043');
        	billingAddress.setCountryCode('US');
        	billingAddress.setPhone('3333333333');
        	lineItemCntr.setCustomerEmail(billTo.email);
    	}*/
	}
    
    var defaultShipment, shippingAddress;
    defaultShipment = lineItemCntr.getDefaultShipment();
    shippingAddress = defaultShipment.getShippingAddress();
    if (shippingAddress === null) {
        shippingAddress = defaultShipment.createShippingAddress();
        overrideShipping = true;
    }
    if (overrideShipping) {
        shippingAddress.setFirstName(shipTo.firstName);
        shippingAddress.setLastName(shipTo.lastName);
        shippingAddress.setAddress1(shipTo.street1);
        shippingAddress.setAddress2(shipTo.street2);
        shippingAddress.setCity(shipTo.city);
        shippingAddress.setPostalCode(shipTo.postalCode);
        shippingAddress.setCountryCode(shipTo.country);
        shippingAddress.setStateCode(shipTo.state);
    }
}
/**
* Log response based on reason code
*/
function LogResponse(merchantReferenceCode, requestID, requestToken, reasonCode, decision) {
    //* *************************************************************************//
    // Log response code specific data for further processing
    //* *************************************************************************//
    var logTransactionData = ' Order No = ' + merchantReferenceCode;
    logTransactionData += ', Cybersource Request ID = ' + requestID;
    logTransactionData += ', Cybersource Request Token = ' + requestToken;
    logTransactionData += ', Cybersource Reason Code = ' + reasonCode;
    logTransactionData += ', Cybersource Decision = ' + decision;

    switch (reasonCode) {
        case 100:
            Logger.info('[CommonHelper] [Cybersource Reason Code: 100] [INFO] ' + logTransactionData + ', Successful transaction.');
            break;
        case 101:
            Logger.error('[CommonHelper] [Cybersource Reason Code: 101] [error] ' + logTransactionData + ' Error Message = The request is missing one or more required fields in the request to CyberSource. The could be due to coding error since all required fields should be set by the COSubmit pipeline.');
            break;
        case 102:
            Logger.error('[CommonHelper] [Cybersource Reason Code: 102] [error] ' + logTransactionData + ' Error Message = One or more fields in the request to cybersource contains invalid data. The could be due to coding error since all required fields should be first validated by the COSubmit pipeline.');
            break;
        case 150:
            Logger.error('[CommonHelper] [Cybersource Reason Code: 150] [error] ' + logTransactionData + ' Error Message = Error: General system failure.');
            break;
        case 151:
            Logger.error('[CommonHelper] [Cybersource Reason Code: 151] [error] ' + logTransactionData + ' Error Message = Error: The request was received but there was a server time-out. This error does not include time-outs between the client and the server. ');
            break;
        case 152:
            Logger.error('[CommonHelper] [Cybersource Reason Code: 152] [error] ' + logTransactionData + ' Error Message = Error: The request was received but there was a service time-out. - ');
            break;
        case 234:
            Logger.error('[CommonHelper] [Cybersource Reason Code: 234] [error] ' + logTransactionData + ' Error Message = There is a problem with your CyberSource merchant configuration. - Please verify the Cybersource Custom preference in the Business Manager');
            break;
        case 400:
            Logger.warn('[CommonHelper] [Cybersource Reason Code: 400] [WARN] ' + logTransactionData + ' Error Message = The fraud score exceeds your threshold. - Customer support to handle the order. ');
            break;
        case 480:
            Logger.warn('[CommonHelper] [Cybersource Reason Code: 480] [WARN] ' + logTransactionData + ' Error Message = The order is marked for review by Decision Manager. - ');
            break;
        case 481:
            Logger.warn('[CommonHelper] [Cybersource Reason Code: 481] [WARN] ' + logTransactionData + ' Error Message = The order is rejected by Decision Manager. - Customer support to handle the order. ');
            break;
        default:
            Logger.warn('[CommonHelper] [Cybersource Reason Code:' + reasonCode + '] [WARN] ' + logTransactionData + ', Error Message = Authorization Denied - ');
            break;
    }
}

/*
 * 	This method check the payment status of initiated payment request through alipay and change the status in demandware for placed order to NEW, CREATED, FAILED
 *  after getting from service call response in relation to Alipay payment status such as COMPLETED, PENDING, ABANDONED and TRADE_NOT_EXIST.
 *  */
function CheckStatusServiceRequest(order) {
    var Order = order;
    var paymentType;
    var PaymentInstrument = require('dw/order/PaymentInstrument');
	 for each(var paymentInstrument in Order.paymentInstruments){
		if(!paymentInstrument.paymentMethod.equals(PaymentInstrument.METHOD_GIFT_CERTIFICATE)){
			paymentType = paymentInstrument.paymentTransaction.custom.apPaymentType;
		}
	}
    var commonFacade = require('~/cartridge/scripts/facade/CommonFacade');
    var PaymentInstrumentUtils = require('~/cartridge/scripts/utils/PaymentInstrumentUtils');

    var response = commonFacade.CheckPaymentStatusRequest(Order);
    if (!empty(response)) {
        PaymentInstrumentUtils.checkStatusOrderUpdate(Order, response, paymentType);
        if (response.decision === 'ACCEPT' && response.reasonCode.get() === 100) {
            switch (response.apCheckStatusReply.paymentStatus) {
                case 'COMPLETED':
                case 'authorized':
                case 'settled':
                    return { submit: true };

                case 'PENDING':
                case 'pending':
                    return { pending: true };

                case 'ABANDONED':
                case 'TRADE_NOT_EXIST':
                case 'failed':
                case 'abandoned':
                    return { error: true };
            }
        } else if (response.decision === 'REJECT' || response.decision === 'ERROR') {
            if (getReasonCodes(response.reasonCode.get())) {
                return { error: true };
            }
        } else if (response.decision === 'REVIEW') {
            return { review: true };
        } else {
            return { error: true };
        }
    }
    return { pending: true };
}
function getReasonCodes(reasonCode) {
    var reasonCodes = CybersourceConstants.REASONCODES;
    for (var i = 0; i < reasonCodes.length; i++) {
        var rs = reasonCodes[i];
        if (rs === reasonCode) {
            return true;
        }
    }
    return false;
}
/* Remove any existing Payment Instrument and create new
* payment Instrument with success/error status for selected payment method
*/
function HandleRequest(Basket) {
    // get payment method from billing form
    var PaymentMethod = session.forms.billing.paymentMethod.value;
    var isPaymentInstrumentCreated = false;
    // create payment instrument if selected payment method is not null
    if (!empty(PaymentMethod)) {
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            removeExistingPaymentInstruments(Basket);
            Basket.createPaymentInstrument(PaymentMethod, calculateNonGiftCertificateAmount(Basket));
            isPaymentInstrumentCreated = true;
        });
        if (isPaymentInstrumentCreated) {
            return { success: true };
        }
    }
    return { error: true };
}
/**
 * @param {Object} options
 * @param {String} options.recipient
 * @param {String} options.template
 * @param {String} options.subject
 * @param {String} options.from
 * @param {Object} options.context
 * @return {dw.system.Status} whether the mail was successfully queued (Status.OK) or not (Status.ERROR).
 */
function sendMail(options) {
    var Mail = require('dw/net/Mail');
    var Site = require('dw/system/Site');
    var Template = require('dw/util/Template');
    if (!options.template || !options.recipient || !options.subject) {
        return;
    }
    var mail = new Mail();
    mail.addTo(options.recipient);
    mail.setSubject(options.subject);
    mail.setFrom(options.from || Site.getCurrent().getCustomPreferenceValue('customerServiceEmail') || 'no-reply@salesforce.com');
    var context = ToHashMap(options.context);
    context.CurrentForms = session.forms;
    context.CurrentHttpParameterMap = request.httpParameterMap;
    context.CurrentCustomer = customer;
    var template = new Template(options.template);
    var content = template.render(context).text;
    mail.setContent(content, 'text/html', 'UTF-8');
    return mail.send();
}
function ToHashMap(object) {
    var HashMap = require('dw/util/HashMap');
    var hashmap = new HashMap();

    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            hashmap.put(key, object[key]);
        }
    }

    return hashmap;
}

//
function validatePayPalShippingAddress(checkStatusResponse, lineItemCntr) {
	var shipTo = checkStatusResponse.shipTo;
	var defaultShipment, shippingAddress;
    defaultShipment = lineItemCntr.getDefaultShipment();
    shippingAddress = defaultShipment.getShippingAddress();
    if(!empty(shippingAddress) && !empty(shippingAddress.firstName) && !empty(shippingAddress.lastName) && !empty(shippingAddress.address1)
    		&& !empty(shippingAddress.city) && !empty(shippingAddress.postalCode) && !empty(shippingAddress.countryCode)
    		&& !empty(shippingAddress.stateCode)) {
		return true;	
    }
	else if (!empty(shipTo.firstName) && !empty(shipTo.lastName) && !empty(shipTo.street1) && !empty(shipTo.city) 
			&& !empty(shipTo.state) && !empty(shipTo.postalCode) && !empty(shipTo.country)) {
		return true;
    }
    return false;
}

/* handle phone & email*/
function validatePayPalBillingAddress(checkStatusResponse, lineItemCntr) {
	var billTo = checkStatusResponse.billTo;
	var billingAddress = lineItemCntr.getBillingAddress();
    if(!empty(billingAddress)) {
    	if(!empty(billTo.email)) {
    		var Transaction = require('dw/system/Transaction');
    		Transaction.wrap(function () {
				lineItemCntr.setCustomerEmail(billTo.email);
    		});
		}
    	if(!empty(billingAddress.firstName) && !empty(billingAddress.lastName) && !empty(billingAddress.address1)
    		&& !empty(billingAddress.city) && !empty(billingAddress.postalCode) && !empty(billingAddress.countryCode)
    		&& !empty(billingAddress.stateCode) && !empty(billingAddress.phone) && !empty(lineItemCntr.customerEmail)) {
        	return true;	
    	}
    }
	else if (!empty(billTo.firstName) && !empty(billTo.lastName) && !empty(billTo.street1) && !empty(billTo.city) 
			&& !empty(billTo.state) && !empty(billTo.postalCode) && !empty(billTo.country) && !empty(billTo.email) && !empty(billTo.phoneNumber)) {
		return true;
    }
    return false;
}

/* handle phone & email*/
function billAddressExistsInBasket(lineItemCntr) {
	var billingAddress = lineItemCntr.getBillingAddress();
    if (empty(billingAddress)) {
        return false;
    } else if(!empty(billingAddress.firstName) && !empty(billingAddress.lastName) && !empty(billingAddress.address1)
    		&& !empty(billingAddress.city) && !empty(billingAddress.postalCode) && !empty(billingAddress.countryCode)
    		&& !empty(billingAddress.stateCode) && !empty(billingAddress.phone)) {
        return true;	
    }
    return false;
}

/* Part of custom Address validation for PayPal Express only. Handles redirection to billing page from 
	shipping/billing and prompts or skips the paypal authorization.
	If basket totals are same from the time of authorization, skips the payment from billing page. */
function validatePayPalInstrument(basket, orderModel) {
	 for (var i = 0; i < basket.paymentInstruments.length; i++) {
        var paymentInstrument = basket.paymentInstruments[i];
        var req = 'requestId' in paymentInstrument.paymentTransaction.custom && !empty(paymentInstrument.paymentTransaction.custom.requestId);
        if((paymentInstrument.paymentMethod == 'PAYPAL' || paymentInstrument.paymentMethod == 'PAYPAL_CREDIT') && 'paymentTransaction' in paymentInstrument && 
        	'requestId' in paymentInstrument.paymentTransaction.custom && !empty(paymentInstrument.paymentTransaction.custom.requestId)) {
			if(paymentInstrument.paymentMethod == 'PAYPAL_CREDIT' && paymentInstrument.paymentTransaction.amount.toFormattedString() == orderModel.totals.grandTotal) {
				return true;
			} else if(paymentInstrument.paymentMethod == 'PAYPAL' && paymentInstrument.paymentTransaction.amount.toFormattedString() == orderModel.totals.grandTotal
				&& !empty(paymentInstrument.paymentTransaction.custom.payerID) && !empty(paymentInstrument.paymentTransaction.custom.apSessionProcessorTID)) {
					return true;
			}
        }
	 }
	return false;
}

function getDeviceType(currentRequest){
	var deviceType : String = "desktop";
    var iPhoneDevice : String = "iPhone";
    var iPadDevice : String = "iPad";
    var request : dw.system.Request = currentRequest;
    var andriodDevice : String = "Android"; //Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; ADR6300 Build/GRJ22) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1
    
    var httpUserAgent : String = request.httpUserAgent;
    
    //check if the device is iPhone
    if (httpUserAgent.indexOf(iPhoneDevice) > 1) {
    	
    	deviceType = "mobile";

    //check if the device is Android mobile device
    } else if (httpUserAgent.indexOf(andriodDevice) > 1) {
    	
    	if (httpUserAgent.indexOf("mobile") > 1) 
	    	deviceType = "mobile";

    } else if (httpUserAgent.indexOf(iPadDevice) > 1) {

    	deviceType = "tablet";
    }
    
	return deviceType;
}

function getPaymentClass(paymentInstrument){
	var Resource = require('dw/web/Resource');
	var CsSAType = Site.getCurrent().getCustomPreferenceValue('CsSAType').value;
	var paymentClass = '';
	if(paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.creditcard','cybersource',null)) {
		if(CsSAType != null)
			paymentClass = CsSAType.toLowerCase();
		else
			paymentClass = Resource.msg('paymentmethodname.creditcard','cybersource',null).toLowerCase();
	} 
	else if(paymentInstrument.paymentMethod == Resource.msg('paymentmethodname.visacheckout','cybersource',null))
		paymentClass = Resource.msg('paymentmethodname.creditcard','cybersource',null).toLowerCase();
	else if(paymentInstrument.paymentMethod != Resource.msg('paymentmethodname.visacheckout','cybersource',null).toLowerCase()
		&& paymentInstrument.paymentMethod != Resource.msg('paymentmethodname.googlepay','cybersource',null).toLowerCase()
		&& paymentInstrument.paymentMethod != Resource.msg('paymentmethodname.paypal','cybersource',null).toLowerCase()
		&& paymentInstrument.paymentMethod != Resource.msg('paymentmethodname.paypalcredit','cybersource',null).toLowerCase()
		&& paymentInstrument.paymentMethod != Resource.msg('paymentmethodname.creditcard','cybersource',null).toLowerCase()) {
		paymentClass = paymentInstrument.paymentMethod.toLowerCase();
	}
	return paymentClass;
}

module.exports = {
    CreateCybersourceShipFromObject: CreateCybersourceShipFromObject,
    CreateCyberSourceBillToObject: CreateCyberSourceBillToObject,
    CreateCybersourceShipToObject: CreateCybersourceShipToObject,
    CreateCybersourcePurchaseTotalsObject: CreateCybersourcePurchaseTotalsObject,
    CreateCyberSourcePurchaseTotalsObject_UserData: CreateCyberSourcePurchaseTotalsObject_UserData,
    CreateCyberSourceBillToObject_UserData: CreateCyberSourceBillToObject_UserData,
    CreateCybersourceItemObject: CreateCybersourceItemObject,
    CreateKlarnaItemObject: CreateKlarnaItemObject,
    GetPaymentType: GetPaymentType,
    UpdateOrderShippingAddress: UpdateOrderShippingAddress,
    CreateCartStateString: CreateCartStateString,
    UpdateTaxForGiftCertificate: UpdateTaxForGiftCertificate,
    Debug: Debug,
    validateBillingAddress: validateBillingAddress,
    removeExistingPaymentInstruments: removeExistingPaymentInstruments,
    removeExistingPaymentInstrumentsExceptPaymentType: removeExistingPaymentInstrumentsExceptPaymentType,
    getIPAddress: GetIPAddress,
    GetSubscriptionToken: GetSubscriptionToken,
    GetRequestLocale: GetRequestLocale,
    signedDataUsingHMAC256: signedDataUsingHMAC256,
    GetPurchaseTotal: getPurchaseTotal,
    GetPurchaseTotalPayPal: getPurchaseTotalPayPal,
    GetItemObject: getItemObject,
    AddAddressToCart: addAddressToCart,
    ValidatePayPalShippingAddress: validatePayPalShippingAddress,
    ValidatePayPalBillingAddress: validatePayPalBillingAddress,
    LogResponse: LogResponse,
    CheckStatusServiceRequest: CheckStatusServiceRequest,
    HandleRequest: HandleRequest,
    sendMail: sendMail,
    CalculateNonGiftCertificateAmount: calculateNonGiftCertificateAmount,
    CalculateNonGiftCertificateAmountPaypal: calculateNonGiftCertificateAmountPayPal,
    ValidatePayPalInstrument : validatePayPalInstrument,
    getDeviceType : getDeviceType,
    GetPaymentClass : getPaymentClass
};
