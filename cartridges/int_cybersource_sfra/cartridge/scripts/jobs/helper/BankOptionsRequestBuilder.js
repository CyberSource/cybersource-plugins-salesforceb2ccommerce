var BankOptionsRequestBuilder = (function(){
	var that = {};
	var _buildOptionsRequest = function(params){
			var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
			var CybersourceHelper = libCybersource.getCybersourceHelper();					
			var csReference = webreferences.CyberSourceTransaction;
			var serviceRequest = new csReference.RequestMessage(); 
			serviceRequest.merchantID = params.merchantId;
			serviceRequest.merchantReferenceCode = 'BankOptionList-' + params.paymentType + '-' + new Date().toDateString(); 
			serviceRequest.apOptionsService = new CybersourceHelper.csReference.APOptionsService();	
			serviceRequest.apPaymentType = params.paymentType;
			serviceRequest.apOptionsService.run = true;
			return serviceRequest;
	};
	
	that.GetOptionsRequestObj = _buildOptionsRequest;
	return that;
})();

module.exports = BankOptionsRequestBuilder;