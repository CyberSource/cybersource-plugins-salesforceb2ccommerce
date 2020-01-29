'use strict';

var base = module.superModule;

/**
 * @constructor
 * @classdesc CartModel class that represents the current basket
 *
 * @param {dw.order.Basket} basket - Current users's basket
 */
function CartModel(basket) {
    base.call(this, basket);
    this.getNonGiftCertificateAmount = getNonGiftCertificateAmount(basket);
}

/**
 * Calculates the amount to be paid by a non-gift certificate payment instrument based on the given basket.
 * The function subtracts the amount of all redeemed gift certificates from the order total and returns this
 * value.
 * @param {dw.order.basket} basket the current basket
 * @returns {dw.value.Money} The amount to be paid by a non-gift certificate payment instrument.
 */
function getNonGiftCertificateAmount(basket) {
	
	var Money = require('dw/value/Money');
	
	if (empty(basket)) {
		var Site = require('dw/system/Site');
		return new Money(0.0, Site.getCurrent().getDefaultCurrency());
	}
	
	var giftCertTotal = new Money(0.0, basket.getCurrencyCode());

		//  Gets the list of all gift certificate payment instruments
	var gcPaymentInstrs = basket.getGiftCertificatePaymentInstruments();
	var iter = gcPaymentInstrs.iterator();
	var orderPI = null;
	
		//  Sums the total redemption amount.
	while (iter.hasNext()) {
		orderPI = iter.next();
		giftCertTotal = giftCertTotal.add(orderPI.getPaymentTransaction().getAmount());
	}

    		//  Gets the order total.
	var orderTotal = basket.getTotalGrossPrice();

		//  Calculates the amount to charge for the payment instrument.
		//  This is the remaining open order total that must be paid.
    var amountOpen = orderTotal.subtract(giftCertTotal);

    		//  Returns the open amount to be paid.
    return amountOpen;
}

CartModel.prototype = Object.create(base.prototype);

module.exports = CartModel;