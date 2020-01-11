/**
* Utility methods for Bank Transfer payment methods.
*
* @module cartridge/scripts/banktransfer/helper/BankTransferHelper
*/

'use strict';


/**
* Description of the function
*
* @return {String} Supported bank list for provided bank transfer payment method 'getBankListJson'
*/

var BankTransferHelper = (function(){
	var that = {};
	var _getBankListJson = function(paymentMethod){
		var CustomObjectMgr = require('dw/object/CustomObjectMgr');
		var retObj = null;
		if(!empty(paymentMethod)){			
			var existingBankList = CustomObjectMgr.queryCustomObjects('BTBankList', 'custom.paymentType = {0}', null, paymentMethod.ID);
			retObj = [];
			while(!empty(existingBankList) && existingBankList.hasNext()){
				var bank = existingBankList.next();
				retObj.push({"name": bank.custom.BankName, "id": bank.custom.BankID});
			}	
		}				
		return retObj;
	};
	var _isBankListRequired = function(paymentMethod){
		var paymentMethod = dw.order.PaymentMgr.getPaymentMethod(paymentMethod);
		if('isSupportedBankListRequired' in paymentMethod.custom && paymentMethod.custom.isSupportedBankListRequired){
			return paymentMethod.custom.isSupportedBankListRequired;
		} else {
			return false;
		}
	}; 
	var _isBicRequired = function(paymentMethod){
		var paymentMethod = dw.order.PaymentMgr.getPaymentMethod(paymentMethod);
		if('isBicEnabled' in paymentMethod.custom && paymentMethod.custom.isBicEnabled){
			return paymentMethod.custom.isBicEnabled;
		} else {
			return false;
		}
	}; 
	that.getBankListJson = _getBankListJson;
	that.isBankListRequired = _isBankListRequired;
	that.isBicRequired = _isBicRequired;
	return that;
})();


exports.getBankListJson = BankTransferHelper.getBankListJson;
exports.isBankListRequired = BankTransferHelper.isBankListRequired;
exports.isBicRequired = BankTransferHelper.isBicRequired;

