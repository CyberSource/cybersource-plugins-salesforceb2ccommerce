'use strict';

/**
 * Cybersource service is called with the tax request as true and the service gived tax information in response.
 * @param Basket : dw.order.LineItemCtnr contains object of basket or order
 *
 */
var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');

var CybersourceHelper = libCybersource.getCybersourceHelper();
var taxHelper = require('~/cartridge/scripts/helper/TaxHelper');
var CSServices = require('~/cartridge/scripts/init/SoapServiceInit');

/**
 * updateCartTotal
 * @param {*} cart cart
 * @param {*} itemMap itemMap
 * @param {*} taxationResponse taxationResponse
 */
function updateCartTotal(cart, itemMap, taxationResponse) {
    for (var i = 0; i < taxationResponse.taxReply.item.length; i += 1) {
        var resItem = taxationResponse.taxReply.item[i];
        /* for each(var resItem in taxationResponse.taxReply.item)
        { */
        var lineItem = itemMap.get(resItem.id.toString());
        // eslint-disable-next-line
        var itemTax = new dw.value.Money(parseFloat(resItem.totalTaxAmount), cart.currencyCode);
        lineItem.setTax(itemTax);
        var taxRate = 0.00;

        //* ****************************************************************//
        // An issue with this code incorrectly updates the line items and the order totals in the basket by ignoring the
        // discount ï¿½  resulting in an order total higher than it should be.
        // This block of code fix is used to accumulate the gross price of line item's adjusted/discounted price and item tax in the basket.
        // And update the basket after accumulating all line items gross price and taxes.
        //
        //* ****************************************************************//

        // eslint-disable-next-line
        if (lineItem instanceof dw.order.ProductLineItem) {
            if (!lineItem.bonusProductLineItem) {
                // eslint-disable-next-line
                if (!empty(lineItem.proratedPrice) && lineItem.proratedPrice.value !== 0) {
                    taxRate = itemTax.value / lineItem.proratedPrice.value;
                }
                lineItem.updateTax(taxRate, lineItem.proratedPrice);
            } else {
                // tax is not getting calculated for bonus product which is updating bonus line item's tax as /NA. it has the direct impact on basket totals.
                // Resolution - update line item tax with 0 which will resolve the tax calculation N/A for bonus line items.
                lineItem.updateTax(0);
            }
            // eslint-disable-next-line
        } else if (lineItem instanceof dw.order.ShippingLineItem) {
            // eslint-disable-next-line
            if (!empty(lineItem.adjustedNetPrice) && lineItem.adjustedNetPrice.value !== 0) {
                taxRate = itemTax.value / lineItem.adjustedNetPrice.value;
            }
            lineItem.updateTax(taxRate, lineItem.adjustedNetPrice);
        } else {
            // eslint-disable-next-line
            if (!empty(lineItem.netPrice) && lineItem.netPrice.value !== 0) {
                taxRate = itemTax.value / lineItem.netPrice.value;
            }
            lineItem.updateTax(taxRate, lineItem.netPrice);
        }
    }
    cart.updateTotals();
}

/**
 * copyTaxService
 * @param {*} taxService taxService
 * @returns {*} obj
 */
function copyTaxService(taxService) {
    // eslint-disable-next-line
    var requestTaxService = new webreferences2.CyberSourceTransaction.TaxService();
    var value;
    Object.keys(taxService).forEach(function (name) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = taxService[name];
            if (value !== '') {
                requestTaxService[name] = value;
            }
        }
    });
    return requestTaxService;
}

/**
 * copyShipFrom
 * @param {*} shipFrom  shipFrom
 * @returns {*} obj
 */
function copyShipFrom(shipFrom) {
    // eslint-disable-next-line
    var requestShipFrom = new webreferences2.CyberSourceTransaction.ShipFrom();
    var value;
    Object.keys(shipFrom).forEach(function (name) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = shipFrom[name];
            if (value !== '') {
                requestShipFrom[name] = value;
            }
        }
    });
    return requestShipFrom;
}

/**
 * addTaxRequest
 * @param {*} lineItemCtnr lineItemCtnr
 * @param {*} items items
 * @returns {*} obj
 */
function addTaxRequest(lineItemCtnr, items) {
    // var billTo;
    // var shipTo;

    var CommonHelper = require('~/cartridge/scripts/helper/CommonHelper');
    // var cardHelper = require('~/cartridge/scripts/helper/CardHelper');
    // eslint-disable-next-line
    var csReference = webreferences2.CyberSourceTransaction;
    // create request body
    var taxationRequest = new csReference.RequestMessage();
    libCybersource.setClientData(taxationRequest, lineItemCtnr.UUID);
    taxationRequest.merchantID = CybersourceHelper.getMerchantID();
    // getting billing address from basket
    taxationRequest.billTo = libCybersource.copyBillTo(CommonHelper.CreateCyberSourceBillToObject(lineItemCtnr, true).billTo);
    // getting shipping address from basket
    taxationRequest.shipTo = libCybersource.copyShipTo(CommonHelper.CreateCybersourceShipToObject(lineItemCtnr).shipTo);
    // getting shipping from
    taxationRequest.shipFrom = copyShipFrom(CommonHelper.CreateCybersourceShipFromObject().shipFrom);
    // getting purchase total from basket
    taxationRequest.purchaseTotals = libCybersource.copyPurchaseTotals(taxHelper.CreateCybersourceTaxationPurchaseTotalsObject(lineItemCtnr).CybersourcePurchaseTotals);

    // taxationRequest.card = libCybersource.copyCard( cardHelper.CreateCybersourcePaymentCardObject("billing").card );

    taxationRequest.taxService = copyTaxService(taxHelper.CreateCyberSourceTaxRequestObject().taxRequestObject);
    // Nexus / No Nexus
    var nexus = CybersourceHelper.getNexus();
    var noNexus = CybersourceHelper.getNoNexus();

    /* eslint-disable */
    if (!empty(nexus) && empty(noNexus)) {
        taxationRequest.taxService.nexus = nexus;
    } else if (!empty(noNexus) && empty(nexus)) {
        taxationRequest.taxService.noNexus = noNexus;
    } else if (!empty(nexus) && !empty(noNexus)) {
        var Logger = dw.system.Logger.getLogger('Cybersource');
        Logger.info('[libCybersource.js] Nexus and NoNexus lists both contain data. Defaulting to use Nexus list.  Ignoring NoNexus list.');
        taxationRequest.taxService.nexus = nexus;
    }
    /* eslint-enable */
    var itemsList = [];
    var length = items.length;
    var i = 0;
    while (i < length) {
        itemsList.push(items[i]);
        i += 1;
    }
    taxationRequest.item = itemsList;
    taxationRequest.taxService.run = true;
    return taxationRequest;
}

/**
 * TaxationRequest
 * @param {*} cart cart
 * @returns {*} obj
 */
function TaxationRequest(cart) {
    // read pipeline dictionary input parameter
    // eslint-disable-next-line
    var Logger = dw.system.Logger.getLogger('Cybersource');
    var itemArray;
    var itemMap;
    var result;
    result = taxHelper.CreateCybersourceTaxationItemsObject(cart);
    itemArray = result.itemarray;
    itemMap = result.itemmap;
    var taxResult = {};
    var taxRequest = addTaxRequest(cart, itemArray);
    var taxationResponse = null;

    //  Provide ability to customize request object with a hook.
    var HookMgr = require('dw/system/HookMgr');
    if (HookMgr.hasHook('app.cybersource.modifyrequest')) {
        var modifiedServiceRequest = HookMgr.callHook('app.cybersource.modifyrequest', 'Tax', taxRequest);
        // eslint-disable-next-line
        if (!empty(modifiedServiceRequest)) {
            taxRequest = modifiedServiceRequest;
        }
    }

    // send request
    try {
        var service = CSServices.CyberSourceTransactionService;
        var merchantCrdentials = CybersourceHelper.getMerhcantCredentials();
        var requestWrapper = {};
        var i;
        requestWrapper.request = taxRequest;
        requestWrapper.merchantCredentials = merchantCrdentials;
        taxationResponse = service.call(requestWrapper);
        // eslint-disable-next-line
        if (empty(taxationResponse) || taxationResponse.status !== 'OK') {
            return { error: true, errorMsg: taxationResponse.status };
        }
        taxationResponse = taxationResponse.object;
        var taxationObject = {};
        taxationObject.response = taxationResponse;
        taxationObject.Decision = taxationResponse.decision;
        taxationObject.reasonCode = taxationResponse.reasonCode;

        // in case of success update basket
        if (taxationResponse.decision === 'ACCEPT') {
            updateCartTotal(cart, itemMap, taxationResponse);
            taxationObject.totalTaxAmount = taxationResponse.taxReply.totalTaxAmount;
            taxResult.success = true;
            taxResult.response = taxationObject;
        } else if (taxationResponse.decision === 'REJECT') {
            var missingFields = '';
            var invalidFields = '';
            if (taxationResponse.missingField != null) {
                for (i = 0; i < taxationResponse.missingField.length; i += 1) {
                    missingFields += taxationResponse.missingField[i];
                }
            }
            if (taxationResponse.invalidField != null) {
                for (i = 0; i < taxationResponse.invalidField.length; i += 1) {
                    invalidFields += taxationResponse.invalidField[i];
                }
            }
            Logger.error('[TaxFacade.js] Taxation request REJECTED (ReasonCode {0} ). \nRequestToken: {1} \nMissing Fields: {2} \nInvalid Fields: {3}', taxationResponse.reasonCode, taxationResponse.requestToken, missingFields, invalidFields);
            taxResult.error = true;
            taxResult.errorMsg = 'Reason code as ' + taxationResponse.reasonCode;
        } else {
            Logger.error('[TaxFacade.js] Taxation request ERROR (ReasonCode {0} ). \nRequestToken: {1}', taxationResponse.reasonCode, taxationResponse.requestToken);
            taxResult.error = true;
            taxResult.errorMsg = 'Error';
        }
    } catch (e) {
        Logger.error('[TaxFacade.js] Error in taxation request ( {0} )', e.message);
        taxResult.error = true;
        taxResult.errorMsg = e.message;
    }
    return taxResult;
}

module.exports = {
    TaxationRequest: TaxationRequest
};
