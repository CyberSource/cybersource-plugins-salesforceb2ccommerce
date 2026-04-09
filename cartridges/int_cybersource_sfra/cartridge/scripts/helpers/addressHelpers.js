'use strict';

// Get the base addressHelpers module
var base = module.superModule;

/**
 * Verify if the address already exists as a stored user address
 * @param {dw.order.OrderAddress} address - Object that contains shipping address
 * @param {Object[]} storedAddresses - List of stored user addresses
 * @returns {boolean} - Boolean indicating if the address already exists
 */
function checkIfAddressStored(address, storedAddresses) {
    for (var i = 0, l = storedAddresses.length; i < l; i++) {
        if (storedAddresses[i].address1 === address.address1
            && storedAddresses[i].postalCode === address.postalCode
            && storedAddresses[i].city === address.city) {
            return true;
        }
    }
    return false;
}


// Export all base methods and override generateAddressName
module.exports = {
    generateAddressName: base.generateAddressName,
    checkIfAddressStored: checkIfAddressStored,
    saveAddress: base.saveAddress,
    copyShippingAddress: base.copyShippingAddress,
    updateAddressFields: base.updateAddressFields,
    gatherShippingAddresses: base.gatherShippingAddresses
};
 