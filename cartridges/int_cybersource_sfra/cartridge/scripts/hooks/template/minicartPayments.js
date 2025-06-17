'use strict';

function pageContent(pdict){
    // Required SFCC modules and utilities 
    var Site = require('dw/system/Site'); 
    var PaymentMgr = require('dw/order/PaymentMgr'); 
    var URLUtils = require('dw/web/URLUtils');  
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants'); 

    // Site Preferences 
    
    var isKlarnaExpressCheckoutEnabled = Site.getCurrent().getCustomPreferenceValue('enableKlarnaExpressCheckout'); 
    var isGooglePayEnabled = Site.getCurrent().getCustomPreferenceValue('enableGooglePay'); 
    var CsEnableExpressPaypal = Site.getCurrent().getCustomPreferenceValue('CsEnableExpressPaypal'); 
    var googlePayMerchantID = Site.getCurrent().getCustomPreferenceValue('googlePayMerchantID'); 
    var CsMerchantId = Site.getCurrent().getCustomPreferenceValue('CsMerchantId'); 


    // Hook Output 
    var output = ''; 
    // ------------------ Google Pay: Hidden Input ------------------ 
    if (isGooglePayEnabled) { 
        output += '<input type="hidden" name="isGooglePayEnabled" id="isGooglePayEnabled" value="' + isGooglePayEnabled + '"/>'; 
    } 
    // ------------------ jQuery Script (Required for PayPal or Google Pay) ------------------ 
    var paypalActive = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_PAYPAL) ? PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_PAYPAL).isActive() : false; 
    var googlePayActive = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_GooglePay) ? PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_GooglePay).isActive() : false;
    
    if ((paypalActive && CsEnableExpressPaypal) || (googlePayActive && isGooglePayEnabled)) { 
        output += '<script src="' + URLUtils.staticURL('/custom/lib/jquery/jquery-3.7.1.min.js') + '" type="text/javascript"></script>'; 
    } 
    // ------------------ PayPal Integration ------------------ 
      if (paypalActive && CsEnableExpressPaypal) { 
        output += '<script src="https://www.paypalobjects.com/api/checkout.js"></script>'; 
    } 
    // ------------------ Common CyberSource Script ------------------ 
    output += '<script src="' + URLUtils.staticURL('/custom/cybersource-custom.js') + '"></script>';
    // ------------------ Google Pay: Merchant Details & Script ------------------ 
    if (isGooglePayEnabled) { 
        output += '<input type="hidden" name="googlePayMerchantID" id="googlePayMerchantID" value="' + googlePayMerchantID + '"/>'; 
        output += '<input type="hidden" name="googlePaygatewayMerchantId" id="googlePaygatewayMerchantId" value="' + CsMerchantId + '"/>'; 
        // Google Pay scripts only if not on a specific stage 
        if (!pdict.currentStage) { 
            output += '<script src="https://pay.google.com/gp/p/js/pay.js"></script>'; 
            output += '<script src="' + URLUtils.staticURL('/custom/googlepay.js') + '"></script>'; 
            output += '<script>'; 
            output += 'var googlepayvariables = {'; 
            output += 'currencyCode: "' + session.getCurrency().getCurrencyCode() + '",'; 
            output += 'totalPriceStatus: "FINAL",'; 
            output += 'sessionCallBack: "' + URLUtils.url('CheckoutServices-GetGooglePayToken') + '",'; 
            output += 'returnURL: "' + URLUtils.https('Checkout-Begin', 'stage', 'placeOrder') + '",'; 
            output += 'cartURL: "' + URLUtils.https('Cart-Show') + '"'; 
            output += '};'; 
            output += 'window.googlepayval = googlepayvariables;'; 
            output += '</script>'; 
        } 
  
    } 

    //  Klarna
    if(isKlarnaExpressCheckoutEnabled){
        output += '<script src="' + URLUtils.staticURL('/custom/klarna.js') + '"></script>'; 
        output += '<script defer src="https://x.klarnacdn.net/kp/lib/v1/api.js"></script>'; 
        output += '<script src="' + URLUtils.staticURL('/custom/lib/jquery/jquery-3.7.1.min.js') + '" type="text/javascript"></script>'; 
    }

    // ------------------ Visa Checkout ------------------ 
    var visaCheckoutActive = PaymentMgr.getPaymentMethod(CybersourceConstants.METHOD_VISA_CHECKOUT).isActive(); 
    var showVisaCheckout = Site.getCurrent().getCustomPreferenceValue('cybVisaButtonOnCart'); 
    if (showVisaCheckout && visaCheckoutActive) { 
        // Injects ISML template logic via controller call 
        output += require('dw/web/URLUtils').url('CYBVisaCheckout-InitializeVisaToken').toString(); 
    } 
    return output; 
    


}

exports.pageContent = pageContent;