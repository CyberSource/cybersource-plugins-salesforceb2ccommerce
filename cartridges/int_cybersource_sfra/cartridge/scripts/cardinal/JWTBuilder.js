/*
* Description of the module and the logic it provides
*
* @module cartridge/scripts/cardinal/JWTBuilder
*/

'use strict';

var Signature = require('dw/crypto/Signature');
var Encoding = require('dw/crypto/Encoding');
var Mac = require('dw/crypto/Mac');
var Bytes = require('dw/util/Bytes');

/**
 * Function: randomString
 * @param {*} length length
 * @returns {*} obj
 */
function randomString(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * generatejti
 * @returns {*} obj
 */
function generatejti() {
    var jti;
    jti = randomString(8) + '-' + randomString(4) + '-' + randomString(4) + '-' + randomString(4) + '-' + randomString(12);
    return jti;
}

/**
 * The Keys. If you want to verify this in jwt.io, use the content of the files!
 * @param {*} orderObject orderObject
 * @returns {*} obj
 */
function generateTokenWithKey(orderObject) {
    var libCybersource = require('~/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();

    var PRIVATEKEY = CybersourceHelper.getCruiseCredentialsApiKey();
    var issuer = CybersourceHelper.getCruiseCredentialsApiIdentifier();
    var orgUnitID = CybersourceHelper.getCruiseCredentialsOrgUnitId();
    // var encoder = new Signature();
    var mac = new Mac('HmacSHA256');
    var jti = generatejti();

    var time = Math.floor(new Date().getTime() / 1000);
    var exptime = Math.floor(new Date().getTime() / 1000 + 120 * 60);

    var header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    var payload = '';
    if (!orderObject) {
        payload = {
            jti: jti,
            iat: time,
            exp: exptime,
            iss: issuer,
            OrgUnitId: orgUnitID
        };
    } else {
        payload = {
            jti: jti,
            iat: time,
            exp: exptime,
            iss: issuer,
            OrgUnitId: orgUnitID,
            Payload: orderObject
        };
    }

    // Encode the Header as Base64
    var headerBase64 = Encoding.toBase64(new Bytes(JSON.stringify(header)));

    // Encode the Payload as Base64
    var payloadBase64 = Encoding.toBase64(new Bytes(JSON.stringify(payload)));

    // Create the content of the JWT Signature
    var signature = headerBase64 + '.' + payloadBase64;
    var token = mac.digest(signature, PRIVATEKEY);

    var signatureUrlEncoded = Encoding.toBase64(token).replace(/\+/g, '-');
    signatureUrlEncoded = signatureUrlEncoded.replace(/\//g, '_').replace(/\=+$/m, ''); // eslint-disable-line no-useless-escape

    // Now, create the signed JWT: Header + Payload + Signature concatenated with a dot
    var jwt = headerBase64 + '.' + payloadBase64 + '.' + signatureUrlEncoded;

    return jwt;
}

/**
 * generateTokenWithCertificate
 * @returns {*} obj
 */
function generateTokenWithCertificate() {
    var encoder = new Signature();
    // var PUBLICKEY = new CertificateRef('cs-public');
    // eslint-disable-next-line
    var PRIVATEKEY = new dw.crypto.KeyRef('cs-songbird');
    var jti = generatejti();
    var header = {
        alg: 'RS256',
        typ: 'JWT'
    };

    var payload = {
        jti: jti,
        iat: 1529595472,
        exp: 1529602672,
        iss: '5cf7391aafa80d2250fbbc8d',
        OrgUnitId: '5b973e01ff626b13447d3fc3'
    };

    // Encode the Header as Base64
    var headerBase64 = Encoding.toBase64(new Bytes(JSON.stringify(header)));

    // Encode the Payload as Base64
    var payloadBase64 = Encoding.toBase64(new Bytes(JSON.stringify(payload)));

    // Create the content of the JWT Signature
    var signature = Encoding.toBase64(new Bytes(headerBase64 + '.' + payloadBase64));

    // Encrypt the Signature (in RS256) - returns a Base64 String
    var token = encoder.sign(signature, PRIVATEKEY, 'SHA256withRSA');

    /**
     * URL Encode the Base64 string (pseudo-standard)
     *
     * Replace "+" with "-"
     * Replace "/" with "_"
     * Cut off the trailing "=="
     */
    var signatureUrlEncoded = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/m, ''); // eslint-disable-line no-useless-escape

    // Quick check: Can we decode the string again here?
    // var verified = encoder.verifySignature(token, signature, PUBLICKEY, 'SHA256withRSA');

    // Now, create the signed JWT: Header + Payload + Signature concatenated with a dot
    var jwt = headerBase64 + '.' + payloadBase64 + '.' + signatureUrlEncoded;

    return jwt;
}

module.exports = {
    generateTokenWithKey: generateTokenWithKey,
    generateTokenWithCertificate: generateTokenWithCertificate,
    generatejti: generatejti,
    randomString: randomString
};
