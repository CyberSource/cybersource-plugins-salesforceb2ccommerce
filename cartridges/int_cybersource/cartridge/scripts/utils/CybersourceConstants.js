/*********************************************************************************
*@file 		  : File Name - CybersourceConstants
*@description : This script file is used to define the payment method names used 	
* 				in this cartridge .
*
*@author	  :	Vibhore Jain
*@created On  : 27 Dec 2016
**********************************************************************************
*@copyright  (C) 2015-2016 Cybersource.  All Rights Reserved.
**********************************************************************************/


function CybersourceConstants() {
}


CybersourceConstants.METHOD_ALIPAY = 'ALIPAY';
CybersourceConstants.METHOD_ALIPAY_returnURLValue = 'alipay';
CybersourceConstants.METHOD_PAYPAL = 'PAYPAL';
CybersourceConstants.METHOD_PAYPAL_CREDIT = 'PAYPAL_CREDIT';
CybersourceConstants.METHOD_SA_REDIRECT = 'SA_REDIRECT';
CybersourceConstants.METHOD_SA_IFRAME = 'SA_IFRAME';
CybersourceConstants.METHOD_SA_FLEX = 'SA_FLEX';
CybersourceConstants.METHOD_SA_SILENTPOST = 'SA_SILENTPOST';
CybersourceConstants.METHOD_VISA_CHECKOUT = 'VISA_CHECKOUT';
CybersourceConstants.METHOD_ApplePay = 'DW_APPLE_PAY';
CybersourceConstants.METHOD_AndroidPay = 'DW_ANDROID_PAY';
CybersourceConstants.METHOD_Ideal_BankTransfer = 'IDEAL';
CybersourceConstants.BANK_TRANSFER_PAYMENT_METHOD = 'BANK_TRANSFER';
CybersourceConstants.WECHAT_TRANSFER_PAYMENT_METHOD = 'WECHAT';
CybersourceConstants.MERCHANT_DESCRIPTOR = 'Online Store';
CybersourceConstants.SG_CONTROLLER = 'app_storefront_controllers';

//Cartridge Names
CybersourceConstants.SFRA_CORE = 'app_storefront_base';
CybersourceConstants.SG_CORE = 'app_storefront_core';
CybersourceConstants.SG_PIPELINE = 'app_storefront_pipelines';
//SM Cartridge Names
CybersourceConstants.CS_CONTROLLER = 'int_cybersource_controllers';
CybersourceConstants.CS_CORE = 'int_cybersource';
CybersourceConstants.CS_CORE_SCRIPT = CybersourceConstants.CS_CORE+'/cartridge/scripts/';
CybersourceConstants.PAYPAL_ADAPTOR = CybersourceConstants.CS_CORE+'/cartridge/scripts/paypal/adapter/PaypalAdapter';
CybersourceConstants.CS_PIPELINE = 'int_cybersource_pipelines';

//Folder Paths
CybersourceConstants.PATH_FACADE = CybersourceConstants.CS_CORE+'/cartridge/scripts/paypal/facade/';

/*include cartridge and require file paths*/
CybersourceConstants.UNIT_TEST_GUARD = CybersourceConstants.CS_CONTROLLER +'/cartridge/scripts/guard';
CybersourceConstants.GUARD = CybersourceConstants.SG_CONTROLLER+'/cartridge/scripts/guard';
CybersourceConstants.APP = CybersourceConstants.SG_CONTROLLER +'/cartridge/scripts/app';
CybersourceConstants.SALE = 'sale';
CybersourceConstants.ERROR = 'Error';
CybersourceConstants.AUTHORIZED = 'Authorized';
CybersourceConstants.DECLINED = 'Declined';
CybersourceConstants.CHECK_STATUS = 'checkstatus';
CybersourceConstants.AUTHORIZED = 'authorized';
CybersourceConstants.SESSION = 'session';
CybersourceConstants.PENDING = 'pending';
CybersourceConstants.SIGNATURE = 'signature';
CybersourceConstants.KLARNA_PAYMENT_TYPE = 'KLI';
CybersourceConstants.PAYPAL_PAYMENT_TYPE = 'PPL';
CybersourceConstants.KLARNA_PAYMENT_METHOD = 'KLARNA';
var paymentProcessorArr = ['CYBERSOURCE_ALIPAY','BANK_TRANSFER','KLARNA_CREDIT', 'KLARNA'];
CybersourceConstants.PAYMENTPROCESSORARR = paymentProcessorArr;
CybersourceConstants.METHOD_CREDIT_CARD = 'CREDIT_CARD';
CybersourceConstants.BANCONTACT_PAYMENT_METHOD = 'BANCONTACT';
CybersourceConstants.SOFORT_PAYMENT_METHOD = 'SOFORT';
CybersourceConstants.IDEAL_PAYMENT_METHOD = 'IDEAL';
CybersourceConstants.WECHAT_PAYMENT_METHOD = 'WECHAT';
CybersourceConstants.BANK_TRANSFER_PROCESSOR = 'BANK_TRANSFER';
CybersourceConstants.KLARNA_PROCESSOR = 'KLARNA_CREDIT';
CybersourceConstants.BANCONTACT_PAYMENT_TYPE = 'MCH';
CybersourceConstants.SOFORT_PAYMENT_TYPE = 'SOF';
CybersourceConstants.IDEAL_PAYMENT_TYPE = 'IDL';
CybersourceConstants.WECHAT_PAYMENT_TYPE = 'WQR';
CybersourceConstants.WECHAT_PAYMENT_METHOD = 'WECHAT';
var reasonCodeList = [101,,102,150,203,204,233];
CybersourceConstants.REASONCODES = reasonCodeList;

//Secure Acceptance Related Constants
CybersourceConstants.HANDLE = 'Handle';
CybersourceConstants.AUTHORIZE = 'Authorize';
CybersourceConstants.SARESPONSE = 'SAResponse';
CybersourceConstants.OPENIFRAME = 'OpenIframe';
CybersourceConstants.GETSILENTPOST = 'GetRequestDataForSilentPost';
CybersourceConstants.SILENTPOSTRESPONSE = 'SilentPostResponse';
CybersourceConstants.PROCESS3DREDIRECTION = 'Process3DRedirection';
CybersourceConstants.SA_SUBMITORDER = 'SUBMITORDER';
CybersourceConstants.SA_REVIEWORDER = 'REVIEWORDER';
CybersourceConstants.SA_SUMMARY = 'SUMMARY';
CybersourceConstants.SA_GOTO = 'GOTO';
CybersourceConstants.SA_CANCEL = 'SA_CANCEL';
CybersourceConstants.SECUREACCEPTANCEHELPER = CybersourceConstants.CS_CORE_SCRIPT+'secureacceptance/helper/SecureAcceptanceHelper';
module.exports = CybersourceConstants;