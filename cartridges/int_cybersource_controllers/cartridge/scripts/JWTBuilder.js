'use strict';  

var Signature = require("dw/crypto/Signature");  
var Encoding = require('dw/crypto/Encoding');  
var Mac = require('dw/crypto/Mac'); 
var Bytes = require('dw/util/Bytes');  
var CertificateRef = require('dw/crypto/CertificateRef');
var KeyRef = require('dw/crypto/KeyRef');

/** 
 * The Keys. If you want to verify this in jwt.io, use the content of the files! 
 */  
var PUBLICKEY = '';
var PRIVATEKEY = '';

function generateTokenWithKey() {  
	var PUBLICKEY = '';
	/*Need Updates */
	var PRIVATEKEY = '';
	var encoder = new Signature();  
	var mac = new Mac('HmacSHA256');
	
	var time = Math.floor(new Date().getTime()/1000);
	
	var exptime = Math.floor(new Date().getTime()/1000 + 120*60);

	/*Need Updates */
	let header = {  
			"alg": "HS256",
			"typ": "JWT"
	};  
	let payload = {  
			"jti": "b079e598-35bb-4bec-bcf8-eabf56fd84c6",
			"iat": time,
			"exp": exptime,
			"iss": "5cf7391aafa80d2250fbbc8d",
			"OrgUnitId": "5b973e01ff626b13447d3fc3",
	};  
	//Encode the Header as Base64  
	let headerBase64 = Encoding.toBase64(new Bytes(JSON.stringify(header)));  

	//Encode the Payload as Base64  
	let payloadBase64 = Encoding.toBase64(new Bytes(JSON.stringify(payload)));  

	//Create the content of the JWT Signature  
	var signature = headerBase64 + "." + payloadBase64;  

	//Encrypt the Signature (in RS256) - returns a Base64 String  
	//var token = encoder.sign(signature, PRIVATEKEY, 'HmacSHA256');  
	var token = mac.digest(signature,PRIVATEKEY);

	 
	//var signatureUrlEncoded = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/m, ''); 
	var signatureUrlEncoded = Encoding.toBase64(token).replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/m, '');

	//Quick check: Can we decode the string again here?  
	//let verified = encoder.verifySignature(token, signature, new Bytes(PUBLICKEY), 'SHA256withRSA');  

	//Now, create the signed JWT: Header + Payload + Signature concatenated with a dot  
	let jwt = headerBase64 + "." + payloadBase64 + "." + signatureUrlEncoded;  

	return jwt;  

} 
function generateTokenWithKeyandPayload(orderObject) {  
	var PUBLICKEY = '';
    /*Need Updates */
	var PRIVATEKEY = '';
	var encoder = new Signature();  
	var mac = new Mac('HmacSHA256');
	
	var time = Math.floor(new Date().getTime()/1000);
	
	var exptime = Math.floor(new Date().getTime()/1000 + 120*60);

	 /*Need Updates */
	let header = {  
			"alg": "HS256",
			"typ": "JWT"
	};  
	
	 /*Need Updates */
	let payload = {  
			"jti": "b079e598-35bb-4bec-bcf8-eabf56fd84c6",
			"iat": time,
			"exp": exptime,
			"iss": "5cf7391aafa80d2250fbbc8d",
			"OrgUnitId": "5b973e01ff626b13447d3fc3",
			"Payload" : orderObject
	};  
	//Encode the Header as Base64  
	let headerBase64 = Encoding.toBase64(new Bytes(JSON.stringify(header)));  

	//Encode the Payload as Base64  
	let payloadBase64 = Encoding.toBase64(new Bytes(JSON.stringify(payload)));  

	//Create the content of the JWT Signature  
	var signature = headerBase64 + "." + payloadBase64;  

	//Encrypt the Signature (in RS256) - returns a Base64 String  
	//var token = encoder.sign(signature, PRIVATEKEY, 'HmacSHA256');  
	var token = mac.digest(signature,PRIVATEKEY);

	 
	//var signatureUrlEncoded = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/m, ''); 
	var signatureUrlEncoded = Encoding.toBase64(token).replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/m, '');

	//Quick check: Can we decode the string again here?  
	//let verified = encoder.verifySignature(token, signature, new Bytes(PUBLICKEY), 'SHA256withRSA');  

	//Now, create the signed JWT: Header + Payload + Signature concatenated with a dot  
	let jwt = headerBase64 + "." + payloadBase64 + "." + signatureUrlEncoded;  

	return jwt;  

} 
function generateTokenWithCertificate() {  
	var encoder = new Signature();  
	var PUBLICKEY = new CertificateRef('cs-public');
    var PRIVATEKEY = new KeyRef('cs-songbird');
	let header = {  
			"alg": "RS256",
			"typ": "JWT"
	};  

	let payload = {  
			"jti": "b079e598-35bb-4bec-bcf8-eabf56fd84c6",
			"iat": 1529595472,
			"exp": 1529602672,
			"iss": "5cf7391aafa80d2250fbbc8d",
			"OrgUnitId": "5b973e01ff626b13447d3fc3"  
	};  

	//Encode the Header as Base64  
	let headerBase64 = Encoding.toBase64(new Bytes(JSON.stringify(header)));  

	//Encode the Payload as Base64  
	let payloadBase64 = Encoding.toBase64(new Bytes(JSON.stringify(payload)));  

	//Create the content of the JWT Signature  
	var signature = Encoding.toBase64(new Bytes(headerBase64 + "." + payloadBase64));  

	//Encrypt the Signature (in RS256) - returns a Base64 String  
	var token = encoder.sign(signature, PRIVATEKEY, 'SHA256withRSA');  

	/** 
	 * URL Encode the Base64 string (pseudo-standard) 
	 * 
	 * Replace "+" with "-" 
	 * Replace "/" with "_" 
	 * Cut off the trailing "==" 
	 */  
	var signatureUrlEncoded = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/m, '');  

	//Quick check: Can we decode the string again here?  
	let verified = encoder.verifySignature(token, signature, PUBLICKEY, 'SHA256withRSA');  

	//Now, create the signed JWT: Header + Payload + Signature concatenated with a dot  
	let jwt = headerBase64 + "." + payloadBase64 + "." + signatureUrlEncoded;  

	return jwt;  

}  
module.exports = {
		generateTokenWithKey : generateTokenWithKey,
		generateTokenWithCertificate : generateTokenWithCertificate,
		generateTokenWithKeyandPayload : generateTokenWithKeyandPayload
};
