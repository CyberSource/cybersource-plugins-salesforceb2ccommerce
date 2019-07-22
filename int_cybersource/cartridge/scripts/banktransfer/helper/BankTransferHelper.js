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
		if(!empty(paymentMethod.object.custom.paymentType.value)){			
			var existingBankList = CustomObjectMgr.queryCustomObjects('BTBankList', 'custom.paymentType = {0}', null, paymentMethod.object.custom.paymentType.value);
			retObj = [];
			while(!empty(existingBankList) && existingBankList.hasNext()){
				var bank = existingBankList.next();
				retObj.push({"name": bank.custom.BankName, "id": bank.custom.BankID});
			}	
		}				
		return retObj;
	};
	var _isBankListRequired = function(paymentMethod){
		if('isSupportedBankListRequired' in paymentMethod.object.custom && paymentMethod.object.custom.isSupportedBankListRequired){
			return paymentMethod.object.custom.isSupportedBankListRequired;
		} else {
			return false;
		}
	}; 
	var _isBicRequired = function(paymentMethod){
		if('isBicEnabled' in paymentMethod.object.custom && paymentMethod.object.custom.isBicEnabled){
			return paymentMethod.object.custom.isBicEnabled;
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

