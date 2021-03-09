
/*********************************************************************************
*
* Description: 	Class for Cybersource SOAP Service Initialization, 
*
/*********************************************************************************/
var dwsvc = require ("dw/svc");
var HashMap = require ("dw/util/HashMap");
var WSUtil = require('dw/ws/WSUtil');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
/**
 *
 *	SOAP Services
 *
 */	 


/*********************************************************************************
* Service Name : cybersource.soap.transactionprocessor.generic
* Input 	   : request object holds the input parameter for the respective service request(custom) Object 
*
/*********************************************************************************/

var CyberSourceTransactionService = LocalServiceRegistry.createService('cybersource.soap.transactionprocessor.generic', {
/*
* Description  : Method to Initialize cybersource.soap.transactionprocessor service
* Input 	   : None
* output	   : Service Client
*
/***/
	

/**
* Description  : Method to Create request for cybersource.soap.transactionprocessor.generic service
* Input 	   : requestObj Object
* output	   : service Request
*
/**/	
	createRequest : function(svc : dwsvc.SOAPService, requestObj : Object) : Object {
		var csReference  = webreferences2.CyberSourceTransaction;
		var service = csReference.getDefaultService();
		svc.webReference = csReference;
	    svc.serviceClient = service;
	    	
		if(requestObj) {
			return requestObj;
		} else {
			return null;
		}
	 },
/**
* Description  : Method to Execute service request for cybersource.soap.transactionprocessor.generic 
* Input 	   : Customer Object
* output	   : None
*
/**/		
	
	execute : function(svc : dwsvc.SOAPService, parameter : Object) {
		       
		       var userName = parameter.merchantCredentials.merchantID;
		       var password = parameter.merchantCredentials.merchantKey;
		       var secretsMap = new HashMap();
		       secretsMap.put(userName, password); 
		       var requestCfg = new HashMap();
		       requestCfg.put(WSUtil.WS_ACTION,WSUtil.WS_USERNAME_TOKEN );
		       requestCfg.put(WSUtil.WS_USER, userName);
		       requestCfg.put(WSUtil.WS_PASSWORD_TYPE, WSUtil.WS_PW_TEXT);
		       requestCfg.put(WSUtil.WS_SECRETS_MAP, secretsMap);
		       
		       var responseCfg : Map = new HashMap();
		       responseCfg.put(WSUtil.WS_ACTION, WSUtil.WS_TIMESTAMP);
		     
		       WSUtil.setWSSecurityConfig(svc.serviceClient, requestCfg, responseCfg);  // Setting WS security
		
		return svc.serviceClient.runTransaction(parameter.request);
	},
/**
* Description  : Method to get the response from cybersource.soap.transactionprocessor.generic service
* Input 	   : response object
* output	   : service response
*
/**/		
	parseResponse : function(service : dwsvc.SOAPService, response : Object) : Object {
		return response;
	},
/**
* Description  : Method to Create Mock request for cybersource.soap.transactionprocessor.generic service
* Input 	   : Customer Object
* output	   : service Request
*
/**/		
	mockCall : function(service : dwsvc.SOAPService, request : Object) : Object {
		return {status:"Mocked"};
	}
});


/*********************************************************************************
* Service Name : cybersource.soap.transactionprocessor.pos
* Input 	   : request object holds the input parameter for the respective service request(custom) Object 
*
/*********************************************************************************/

var CyberSourceTransactionPOSService = LocalServiceRegistry.createService("cybersource.soap.transactionprocessor.pos", {
/*
* Description  : Method to Initialize cybersource.soap.transactionprocessor service
* Input 	   : None
* output	   : Service Client
*
/***/
	

/**
* Description  : Method to Create request for cybersource.soap.transactionprocessor.pos service
* Input 	   : requestObj Object
* output	   : service Request
*
/**/	
	createRequest : function(svc : dwsvc.SOAPService, requestObj : Object) : Object {
		var csReference  = webreferences2.CyberSourceTransaction;
		var service = csReference.getDefaultService();
		svc.webReference = csReference;
	    svc.serviceClient = service;
	    	
		if(requestObj) {
			return requestObj;
		} else {
			return null;
		}
	 },
/**
* Description  : Method to Execute service request for cybersource.soap.transactionprocessor.pos 
* Input 	   : Customer Object
* output	   : None
*
/**/		
	
	execute : function(svc : dwsvc.SOAPService, parameter : Object) {
		
				if (parameter==null){return null;}
				var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
				var CybersourceHelper = libCybersource.getCybersourceHelper();
				var merchantID : String = CybersourceHelper.getPosMerchantID(parameter.location);
				var merchantPassword : String = null;
				
				var customObject = null;
				var merchantKey : String = null;
				var CustomObjectMgr =require("dw/object/CustomObjectMgr");
				customObject = CustomObjectMgr.getCustomObject("POS_MerchantIDs", parameter.location);
				if(customObject != null)
					merchantPassword = customObject.custom.MerchantKey;
				
				if(empty(merchantID) || empty(merchantPassword)){
					var Logger = require('dw/system/Logger');
					Logger.error("POS MerchantID and/or POS Merchant Key are missing.");	
					return null;
				}		
		       var userName = merchantID;
		       var password = merchantPassword;
		       var secretsMap = new HashMap();
		       secretsMap.put(userName, password); 
		       var requestCfg = new HashMap();
		       requestCfg.put(WSUtil.WS_ACTION,WSUtil.WS_USERNAME_TOKEN );
		       requestCfg.put(WSUtil.WS_USER, userName);
		       requestCfg.put(WSUtil.WS_PASSWORD_TYPE, WSUtil.WS_PW_TEXT);
		       requestCfg.put(WSUtil.WS_SECRETS_MAP, secretsMap);
		       
		       var responseCfg : Map = new HashMap();
		       responseCfg.put(WSUtil.WS_ACTION, WSUtil.WS_TIMESTAMP);
		     
		       WSUtil.setWSSecurityConfig(svc.serviceClient, requestCfg, responseCfg);  // Setting WS security
  
		
		return svc.serviceClient.runTransaction(parameter.requestObj);
	},
/**
* Description  : Method to get the response from cybersource.soap.transactionprocessor.pos service
* Input 	   : response object
* output	   : service response
*
/**/		
	parseResponse : function(service : dwsvc.SOAPService, response : Object) : Object {
		return response;
	},
/**
* Description  : Method to Create Mock request for cybersource.soap.transactionprocessor.pos service
* Input 	   : Customer Object
* output	   : service Request
*
/**/		
	mockCall : function(service : dwsvc.SOAPService, request : Object) : Object {
		return {status:"Mocked"};
	}
});

/*********************************************************************************
* Service Name : ybersource.conversiondetailreport
* Input 	   : request object holds the input parameter for the respective service request(custom) Object 
*
/*********************************************************************************/

var CyberSourceConversionDetailReportService = LocalServiceRegistry.createService('cybersource.conversiondetailreport', {
        
        
        createRequest: function(svc:HTTPService, args){
            // Default request method is post
            svc.setRequestMethod("POST");
            svc.addHeader("Content-Type", "text/xml");
             
              
        	var url = svc.getURL();    
        	var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    		var CybersourceHelper = libCybersource.getCybersourceHelper();
    		var paramArray = [];
        	var urlParms = url.match(/{[^{}]+}/g) || paramArray;      
                
        	//remove url parms with blank values
        	urlParms = (url + '&').match(/[\x3F&][^=&]*=(?=&)/g) || paramArray;
       
        	urlParms.forEach(function(value, index) {
              url = url.replace(value.replace(/[\x3F&]/g, ''), ''); //1) strip away ? and & from parm 2) strip result from url
        	});
        	url = url.replace(/&{2,}/g, '&'); //replace && with &
        	url = url.replace(/\x3F&/g, '?'); //replace ?& with ?
        	url = url.replace(/&$/, ''); //replace & at the end with blank        
        
        	//set timestamp parm
       
        	url = url.replace(/{merchantID}/, args.merchantId);
        	url = url.replace(/{username}/, args.username);
        	url = url.replace(/{password}/, args.password);
        	url = url.replace(/{startDate}/, args.startDate);
        	url = url.replace(/{startTime}/, args.startTime);
        	url = url.replace(/{endDate}/, args.endDate);
        	url = url.replace(/{endTime}/, args.endTime);
            svc.setURL(url);                         
       },
       parseResponse: function(svc:HTTPService, client:dw.net.HTTPClient) {   
	        return client.text;
       }
});

exports.CyberSourceTransactionService = CyberSourceTransactionService;
exports.CyberSourceConversionDetailReportService = CyberSourceConversionDetailReportService;
exports.CyberSourceTransactionPOSService = CyberSourceTransactionPOSService;
