'use strict';

/**
*@file 		  : File Name - CybersourceConstants
*@description : This script file is used to define the payment method names used
* 				in this cartridge .
*
*@author	  :	Michael doss
*@created On  : 21 Jun 2018
**********************************************************************************
*@copyright  (C) 2018-2020 Cybersource.  All Rights Reserved.
**********************************************************************************/

var CybersourceConstants = {};

CybersourceConstants.METHOD_ALIPAY = 'ALIPAY';
CybersourceConstants.METHOD_ALIPAY_returnURLValue = 'alipay';
CybersourceConstants.METHOD_PAYPAL = 'PAYPAL';
CybersourceConstants.METHOD_PAYPAL_CREDIT = 'PAYPAL_CREDIT';
CybersourceConstants.METHOD_SA_REDIRECT = 'SA_REDIRECT';
CybersourceConstants.METHOD_SA_IFRAME = 'SA_IFRAME';
CybersourceConstants.METHOD_SA_SILENTPOST = 'SA_SILENTPOST';
CybersourceConstants.METHOD_SA_FLEX = 'SA_FLEX';
CybersourceConstants.METHOD_VISA_CHECKOUT = 'VISA_CHECKOUT';
CybersourceConstants.METHOD_ApplePay = 'DW_APPLE_PAY';
CybersourceConstants.METHOD_AndroidPay = 'DW_ANDROID_PAY';
CybersourceConstants.METHOD_GooglePay = 'DW_GOOGLE_PAY';
CybersourceConstants.METHOD_Ideal_BankTransfer = 'IDEAL';
CybersourceConstants.BANK_TRANSFER_PAYMENT_METHOD = 'BANK_TRANSFER';
CybersourceConstants.MERCHANT_DESCRIPTOR = 'Online Store';

//  Cartridge Name
CybersourceConstants.SFRA_CORE = 'app_storefront_base';

//  Folder Paths
CybersourceConstants.CS_CORE_SCRIPT = '~/cartridge/scripts/';
CybersourceConstants.PAYPAL_ADAPTOR = '~/cartridge/scripts/paypal/adapter/PaypalAdapter';
CybersourceConstants.PATH_FACADE = '~/cartridge/scripts/paypal/facade/';


//  Other Constants
// CybersourceConstants.GUARD = CybersourceConstants.SG_CONTROLLER+'/cartridge/scripts/guard';
// CybersourceConstants.APP = CybersourceConstants.SG_CONTROLLER +'/cartridge/scripts/app';
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
var paymentProcessorArr = ['CYBERSOURCE_ALIPAY', 'BANK_TRANSFER', 'MCH', 'EPS', 'GPY', 'SOF', 'IDL', 'KLARNA'];
CybersourceConstants.PAYMENTPROCESSORARR = paymentProcessorArr;
CybersourceConstants.METHOD_CREDIT_CARD = 'CREDIT_CARD';
CybersourceConstants.BANCONTACT_PAYMENT_METHOD = 'BANCONTACT';
CybersourceConstants.EPS_PAYMENT_METHOD = 'EPS';
CybersourceConstants.GIROPAY_PAYMENT_METHOD = 'GIROPAY';
CybersourceConstants.SOFORT_PAYMENT_METHOD = 'SOFORT';
CybersourceConstants.IDEAL_PAYMENT_METHOD = 'IDEAL';
CybersourceConstants.BANK_TRANSFER_PROCESSOR = 'BANK_TRANSFER';
CybersourceConstants.KLARNA_PROCESSOR = 'KLARNA_CREDIT';
CybersourceConstants.BANCONTACT_PAYMENT_TYPE = 'MCH';
CybersourceConstants.EPS_PAYMENT_TYPE = 'EPS';
CybersourceConstants.GIROPAY_PAYMENT_TYPE = 'GPY';
CybersourceConstants.SOFORT_PAYMENT_TYPE = 'SOF';
CybersourceConstants.IDEAL_PAYMENT_TYPE = 'IDL';
var reasonCodeList = [101, 102, 150, 203, 204, 233];
CybersourceConstants.REASONCODES = reasonCodeList;

//  Secure Acceptance Related Constants
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
CybersourceConstants.SECUREACCEPTANCEHELPER = CybersourceConstants.CS_CORE_SCRIPT + 'secureacceptance/helper/SecureAcceptanceHelper';
module.exports = CybersourceConstants;
