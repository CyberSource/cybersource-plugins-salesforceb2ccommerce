'use strict';

/**
 * Example of how to customize and modify the CC auth reauest.
 *
 * @param {Object} requestIn - The request object about to be sent to Cybersource.
 * @returns {Object} - A modified version of requestIn.
 */
function CCAuth(requestIn) {
    var request = requestIn;
        
    //  Customize the request object here.
    // request.merchantDefinedData = "Data";
    
    return request;
}


/**
 * Example of how to customize and modify the Payer Authentication Enroll request.
 *
 * @param {Object} requestIn - The request object about to be sent to Cybersource.
 * @returns {Object} - A modified version of requestIn.
 */
function PayerAuthEnroll(requestIn) {
    var request = requestIn;
        
    //  Customize the request object here.
    
    return request;
}


/**
 * Example of how to customize and modify the Payer Authentication Validation Request.
 *
 * @param {Object} requestIn - The request object about to be sent to Cybersource.
 * @returns {Object} - A modified version of requestIn.
 */
function PayerAuthValidation(requestIn) {
    var request = requestIn;
        
    //  Customize the request object here.
    
    return request;
}

/**
 * Example of how to customize and modify the Auth Reversal request.
 *
 * @param {Object} requestIn - The request object about to be sent to Cybersource.
 * @returns {Object} - A modified version of requestIn.
 */
function AuthReversal(requestIn) {
    var request = requestIn;
        
    //  Customize the request object here.
    
    return request;
}

/**
 * Example of how to customize and modify the Credit Card Capture request.
 *
 * @param {Object} requestIn - The request object about to be sent to Cybersource.
 * @returns {Object} - A modified version of requestIn.
 */
function Capture(requestIn) {
    var request = requestIn;
        
    //  Customize the request object here.
    
    return request;
}

/**
 * Example of how to customize and modify the Credit Card Creit/Refund request.
 *
 * @param {Object} requestIn - The request object about to be sent to Cybersource.
 * @returns {Object} - A modified version of requestIn.
 */
function Credit(requestIn) {
    var request = requestIn;
        
    //  Customize the request object here.
    
    return request;
}

/**
 * Example of how to customize and modify the Tax Calculation request.
 *
 * @param {Object} requestIn - The request object about to be sent to Cybersource.
 * @returns {Object} - A modified version of requestIn.
 */
function Tax(requestIn) {
    var request = requestIn;
        
    //  Customize the request object here.
    
    return request;
}

exports.CCAuth = CCAuth;
exports.PayerAuthEnroll = PayerAuthEnroll;
exports.PayerAuthValidation = PayerAuthValidation;
exports.AuthReversal = AuthReversal;
exports.Capture = Capture;
exports.Credit = Credit;
exports.Tax = Tax;
