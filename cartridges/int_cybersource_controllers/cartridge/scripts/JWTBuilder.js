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
var PUBLICKEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4UsyD7uZzqK38mgPxso4H+Jd8v/0IU0vCp3jzpWjdTLXcUCayjlOYaRp6xguTD7G2SNt6IL9tTFf/Or5PlJqenu565GgpbDIiakLfBEM/ipfxgafAaegVwG32DqrW0r013IY1XZPsYnw9t6bob1DYcJB83yvW3Oke/mW65wRj5qzlhckTdDgQEh4EXkukwpPBUb8PGbArgKDbLSADGa9o93OLfnuUs8n6z4AAPZJVqg1HJ1cMrCP95Dnu7HV/m9lSboqZ7GhBNfs9WxL/Oy014dTlATmgLZugQCACL+2lSelQQmaBDQ/+Je/mo9HCoHoYbskBwE5hyH/4QVqjJvw2wIDAQAB';
var PRIVATEKEY = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhSzIPu5nOorfyaA/Gyjgf4l3y//QhTS8KnePOlaN1MtdxQJrKOU5hpGnrGC5MPsbZI23ogv21MV/86vk+Ump6e7nrkaClsMiJqQt8EQz+Kl/GBp8Bp6BXAbfYOqtbSvTXchjVdk+xifD23puhvUNhwkHzfK9bc6R7+ZbrnBGPmrOWFyRN0OBASHgReS6TCk8FRvw8ZsCuAoNstIAMZr2j3c4t+e5SzyfrPgAA9klWqDUcnVwysI/3kOe7sdX+b2VJuipnsaEE1+z1bEv87LTXh1OUBOaAtm6BAIAIv7aVJ6VBCZoEND/4l7+aj0cKgehhuyQHATmHIf/hBWqMm/DbAgMBAAECggEBAI7+JxwNOiYI6S+WFM1bdBvolTCye8TXNFBMvlZUa5brWgqrspM/pBwdOozYoCoMfjE7Z3r4CQeD+ySQDvobXTG4bdyyZYBEoEOfY4avW8vGIVuSwEFQn1gZ4xH+ytv6y0QjStfRa+uHXcWSrL0PX0EhBrMAJFyrHW8Cj2OjfxHhMUdNGwpMvRH48oAqMAV4TSafmm3aYBwyrrra9rhnrQgtVb0OInqcO2+Dlt16d9/rpIlOKYQ6KqhtTucbdrsKUpRCg7tNizEgBOhYyk/Kl2mZFNG/fUyJzG6pGikQPtVjJ+nbkKQk/7QhhgDj4UZf6OTRwxlxNO6rKXj4fGt+mkECgYEA/zMeV3mOFB6nttNgxFFNsFp59tnALS9yd0Tt+Bl9AoKx+68KFnuDycYWo43MadTgLCkSmPVw+c1Tb+uYh9uLeKnPJFdX0GuuMXgShpaGorxG1f333Z67MWf01IkK1078XfXR/gXp0uay8xO9rX7qXzP80TcR1P5GL1EoFpME/fMCgYEA4gARVGDOFqhAARHNxdyOTDRPnJpt98Vx0s+ofNmj9Jabn9Fbn10AWEmkrOsxB0yV3HYSyHGJ1zBrXBDtbNG4GEGNLk1+VQzMJdYJuPCY4vymJaJVUXr2L6EMma/YE4C/P288d+GAoqGUe5GQq2EYKwkxwbIMG2ViRqcK3MBVs3kCgYBd3EdElQiUjdHRhF0K13xjaGODTwNHmzPWehusLHO2AKvFjdOAAV2vUJPzA6wzIIByvYiBiYRL3CDcASLQlQbvEkWFcDp0BabDuw3VQneyUt0ax5XqhP8EZN+/a8f4+KwJQuhBLZuaXg9jJ9eTgCJjcZOCv2ZnmD3oGUlNRDWJ0QKBgHz+2pbXf8SKQ/QTe8LebJl7KTkNNJsgSgb1sVN0MDk7/1DSQyGOF329JWY6IoDN++jWKSdRnJI3BnoCJr7T80T/JG2ikKfLjzGyAuiVsYmBgQc5lISfRIAtS8HIvvJyd9RG2qPXRgUs5um9Jc2TwwEycaGWrxmL5mH7S4eynPPJAoGALtnQJRdn3BHhwzURV2bMZuPb7/qEFGtIaef745j8ox38gazKXdhZ2X1ROcZ/eqenG4Li80pjAbNm4cdx78vBbXJ5mYImx2SJOImKSWNGFQa2jyl/jXZAfS8+MS6VNcvLom192YepOdTpfHHFzqrcUOdgPsNGhboE0NXbSgzzjus=';

function generateTokenWithKey() {  
	var PUBLICKEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4UsyD7uZzqK38mgPxso4H+Jd8v/0IU0vCp3jzpWjdTLXcUCayjlOYaRp6xguTD7G2SNt6IL9tTFf/Or5PlJqenu565GgpbDIiakLfBEM/ipfxgafAaegVwG32DqrW0r013IY1XZPsYnw9t6bob1DYcJB83yvW3Oke/mW65wRj5qzlhckTdDgQEh4EXkukwpPBUb8PGbArgKDbLSADGa9o93OLfnuUs8n6z4AAPZJVqg1HJ1cMrCP95Dnu7HV/m9lSboqZ7GhBNfs9WxL/Oy014dTlATmgLZugQCACL+2lSelQQmaBDQ/+Je/mo9HCoHoYbskBwE5hyH/4QVqjJvw2wIDAQAB';
	//var PRIVATEKEY = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhSzIPu5nOorfyaA/Gyjgf4l3y//QhTS8KnePOlaN1MtdxQJrKOU5hpGnrGC5MPsbZI23ogv21MV/86vk+Ump6e7nrkaClsMiJqQt8EQz+Kl/GBp8Bp6BXAbfYOqtbSvTXchjVdk+xifD23puhvUNhwkHzfK9bc6R7+ZbrnBGPmrOWFyRN0OBASHgReS6TCk8FRvw8ZsCuAoNstIAMZr2j3c4t+e5SzyfrPgAA9klWqDUcnVwysI/3kOe7sdX+b2VJuipnsaEE1+z1bEv87LTXh1OUBOaAtm6BAIAIv7aVJ6VBCZoEND/4l7+aj0cKgehhuyQHATmHIf/hBWqMm/DbAgMBAAECggEBAI7+JxwNOiYI6S+WFM1bdBvolTCye8TXNFBMvlZUa5brWgqrspM/pBwdOozYoCoMfjE7Z3r4CQeD+ySQDvobXTG4bdyyZYBEoEOfY4avW8vGIVuSwEFQn1gZ4xH+ytv6y0QjStfRa+uHXcWSrL0PX0EhBrMAJFyrHW8Cj2OjfxHhMUdNGwpMvRH48oAqMAV4TSafmm3aYBwyrrra9rhnrQgtVb0OInqcO2+Dlt16d9/rpIlOKYQ6KqhtTucbdrsKUpRCg7tNizEgBOhYyk/Kl2mZFNG/fUyJzG6pGikQPtVjJ+nbkKQk/7QhhgDj4UZf6OTRwxlxNO6rKXj4fGt+mkECgYEA/zMeV3mOFB6nttNgxFFNsFp59tnALS9yd0Tt+Bl9AoKx+68KFnuDycYWo43MadTgLCkSmPVw+c1Tb+uYh9uLeKnPJFdX0GuuMXgShpaGorxG1f333Z67MWf01IkK1078XfXR/gXp0uay8xO9rX7qXzP80TcR1P5GL1EoFpME/fMCgYEA4gARVGDOFqhAARHNxdyOTDRPnJpt98Vx0s+ofNmj9Jabn9Fbn10AWEmkrOsxB0yV3HYSyHGJ1zBrXBDtbNG4GEGNLk1+VQzMJdYJuPCY4vymJaJVUXr2L6EMma/YE4C/P288d+GAoqGUe5GQq2EYKwkxwbIMG2ViRqcK3MBVs3kCgYBd3EdElQiUjdHRhF0K13xjaGODTwNHmzPWehusLHO2AKvFjdOAAV2vUJPzA6wzIIByvYiBiYRL3CDcASLQlQbvEkWFcDp0BabDuw3VQneyUt0ax5XqhP8EZN+/a8f4+KwJQuhBLZuaXg9jJ9eTgCJjcZOCv2ZnmD3oGUlNRDWJ0QKBgHz+2pbXf8SKQ/QTe8LebJl7KTkNNJsgSgb1sVN0MDk7/1DSQyGOF329JWY6IoDN++jWKSdRnJI3BnoCJr7T80T/JG2ikKfLjzGyAuiVsYmBgQc5lISfRIAtS8HIvvJyd9RG2qPXRgUs5um9Jc2TwwEycaGWrxmL5mH7S4eynPPJAoGALtnQJRdn3BHhwzURV2bMZuPb7/qEFGtIaef745j8ox38gazKXdhZ2X1ROcZ/eqenG4Li80pjAbNm4cdx78vBbXJ5mYImx2SJOImKSWNGFQa2jyl/jXZAfS8+MS6VNcvLom192YepOdTpfHHFzqrcUOdgPsNGhboE0NXbSgzzjus=';
	/*Need Updates */
	var PRIVATEKEY = '2254a6e4-2f38-4d15-b913-324c852a674e';
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
	var PUBLICKEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4UsyD7uZzqK38mgPxso4H+Jd8v/0IU0vCp3jzpWjdTLXcUCayjlOYaRp6xguTD7G2SNt6IL9tTFf/Or5PlJqenu565GgpbDIiakLfBEM/ipfxgafAaegVwG32DqrW0r013IY1XZPsYnw9t6bob1DYcJB83yvW3Oke/mW65wRj5qzlhckTdDgQEh4EXkukwpPBUb8PGbArgKDbLSADGa9o93OLfnuUs8n6z4AAPZJVqg1HJ1cMrCP95Dnu7HV/m9lSboqZ7GhBNfs9WxL/Oy014dTlATmgLZugQCACL+2lSelQQmaBDQ/+Je/mo9HCoHoYbskBwE5hyH/4QVqjJvw2wIDAQAB';
	//var PRIVATEKEY = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhSzIPu5nOorfyaA/Gyjgf4l3y//QhTS8KnePOlaN1MtdxQJrKOU5hpGnrGC5MPsbZI23ogv21MV/86vk+Ump6e7nrkaClsMiJqQt8EQz+Kl/GBp8Bp6BXAbfYOqtbSvTXchjVdk+xifD23puhvUNhwkHzfK9bc6R7+ZbrnBGPmrOWFyRN0OBASHgReS6TCk8FRvw8ZsCuAoNstIAMZr2j3c4t+e5SzyfrPgAA9klWqDUcnVwysI/3kOe7sdX+b2VJuipnsaEE1+z1bEv87LTXh1OUBOaAtm6BAIAIv7aVJ6VBCZoEND/4l7+aj0cKgehhuyQHATmHIf/hBWqMm/DbAgMBAAECggEBAI7+JxwNOiYI6S+WFM1bdBvolTCye8TXNFBMvlZUa5brWgqrspM/pBwdOozYoCoMfjE7Z3r4CQeD+ySQDvobXTG4bdyyZYBEoEOfY4avW8vGIVuSwEFQn1gZ4xH+ytv6y0QjStfRa+uHXcWSrL0PX0EhBrMAJFyrHW8Cj2OjfxHhMUdNGwpMvRH48oAqMAV4TSafmm3aYBwyrrra9rhnrQgtVb0OInqcO2+Dlt16d9/rpIlOKYQ6KqhtTucbdrsKUpRCg7tNizEgBOhYyk/Kl2mZFNG/fUyJzG6pGikQPtVjJ+nbkKQk/7QhhgDj4UZf6OTRwxlxNO6rKXj4fGt+mkECgYEA/zMeV3mOFB6nttNgxFFNsFp59tnALS9yd0Tt+Bl9AoKx+68KFnuDycYWo43MadTgLCkSmPVw+c1Tb+uYh9uLeKnPJFdX0GuuMXgShpaGorxG1f333Z67MWf01IkK1078XfXR/gXp0uay8xO9rX7qXzP80TcR1P5GL1EoFpME/fMCgYEA4gARVGDOFqhAARHNxdyOTDRPnJpt98Vx0s+ofNmj9Jabn9Fbn10AWEmkrOsxB0yV3HYSyHGJ1zBrXBDtbNG4GEGNLk1+VQzMJdYJuPCY4vymJaJVUXr2L6EMma/YE4C/P288d+GAoqGUe5GQq2EYKwkxwbIMG2ViRqcK3MBVs3kCgYBd3EdElQiUjdHRhF0K13xjaGODTwNHmzPWehusLHO2AKvFjdOAAV2vUJPzA6wzIIByvYiBiYRL3CDcASLQlQbvEkWFcDp0BabDuw3VQneyUt0ax5XqhP8EZN+/a8f4+KwJQuhBLZuaXg9jJ9eTgCJjcZOCv2ZnmD3oGUlNRDWJ0QKBgHz+2pbXf8SKQ/QTe8LebJl7KTkNNJsgSgb1sVN0MDk7/1DSQyGOF329JWY6IoDN++jWKSdRnJI3BnoCJr7T80T/JG2ikKfLjzGyAuiVsYmBgQc5lISfRIAtS8HIvvJyd9RG2qPXRgUs5um9Jc2TwwEycaGWrxmL5mH7S4eynPPJAoGALtnQJRdn3BHhwzURV2bMZuPb7/qEFGtIaef745j8ox38gazKXdhZ2X1ROcZ/eqenG4Li80pjAbNm4cdx78vBbXJ5mYImx2SJOImKSWNGFQa2jyl/jXZAfS8+MS6VNcvLom192YepOdTpfHHFzqrcUOdgPsNGhboE0NXbSgzzjus=';
    /*Need Updates */
	var PRIVATEKEY = '2254a6e4-2f38-4d15-b913-324c852a674e';
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
