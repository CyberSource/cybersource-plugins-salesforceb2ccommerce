'use strict';

/**
 * HS256 JWT bearer auth for Cybersource REST calls - the JWT-auth alternative to the
 * HTTP-Digest-Signature flow in Flex.js / DMOrderStatusUpdate.js, required for Response MLE.
 */

/**
 * @param {string|dw.util.Bytes} input
 * @returns {string} base64url-encoded value
 */
function base64UrlEncode(input) {
    var Encoding = require('dw/crypto/Encoding');
    var Bytes = require('dw/util/Bytes');
    var bytes = (typeof input === 'string') ? new Bytes(input, 'UTF-8') : input;
    return Encoding.toBase64URL(bytes);
}

/**
 * Unprefixed base64 SHA-256 digest - unlike the "SHA-256={digest}" format the HTTP-Digest flow uses.
 * @param {string} digestString
 * @returns {string} base64-encoded digest
 */
function getDigestBase64(digestString) {
    var MessageDigest = require('dw/crypto/MessageDigest');
    var Bytes = require('dw/util/Bytes');
    var Encoding = require('dw/crypto/Encoding');
    var digester = new MessageDigest(MessageDigest.DIGEST_SHA_256);
    var digest = digester.digestBytes(new Bytes(digestString, 'UTF-8'));
    return Encoding.toBase64(digest);
}

/**
 * Builds the HS256 JWT, ready to use as an Authorization: Bearer value.
 * @param {Object} params
 * @returns {string} compact JWT string
 */
function buildJWTAuthHeader(params) {
    var Mac = require('dw/crypto/Mac');
    var Encoding = require('dw/crypto/Encoding');
    var Bytes = require('dw/util/Bytes');
    var UUIDUtils = require('dw/util/UUIDUtils');

    var iat = Math.floor(new Date().getTime() / 1000);
    var exp = iat + 120; // Cybersource rejects exp beyond iat + 120 seconds

    var header = {
        alg: 'HS256',
        kid: params.keyID,
        typ: 'JWT'
    };
    var payload = {
        iat: iat,
        exp: exp,
        iss: params.merchantId,
        jti: UUIDUtils.createUUID(),
        'v-c-jwt-version': '2',
        'v-c-merchant-id': params.merchantId,
        'request-host': params.requestHost,
        'request-method': params.requestMethod,
        'request-resource-path': params.requestResourcePath
    };
    if (params.digestString) {
        payload.digest = getDigestBase64(params.digestString);
        payload.digestAlgorithm = 'SHA-256';
    }
    if (params.responseMLEKeyID) {
        payload['v-c-response-mle-kid'] = params.responseMLEKeyID;
    }

    var headerB64 = base64UrlEncode(JSON.stringify(header));
    var payloadB64 = base64UrlEncode(JSON.stringify(payload));
    var signingInput = headerB64 + '.' + payloadB64;

    var mac = new Mac(Mac.HMAC_SHA_256);
    var secretBytes = Encoding.fromBase64(params.sharedSecret);
    var signatureBytes = mac.digest(new Bytes(signingInput, 'UTF-8'), secretBytes);
    var signatureB64 = base64UrlEncode(signatureBytes);

    return signingInput + '.' + signatureB64;
}

/**
 * Builds a JWT and applies it to signedHeaders as the Authorization header.
 * @param {dw.util.HashMap} signedHeaders
 * @param {Object} params
 * @param {boolean} [params.supportsResponseMLE] set by callers whose endpoint actually returns
 *  Response MLE; only then is the v-c-response-mle-kid claim resolved and sent
 */
function applyJWTAuth(signedHeaders, params) {
    var Site = require('dw/system/Site');
    // Response MLE is opt-in purely by configuring the alias - an empty alias means there is no
    // key to decrypt with, so the kid claim is omitted and Cybersource replies in plaintext.
    var responseMLEAlias = Site.getCurrent().getCustomPreferenceValue('CsResponseMLE_Alias');
    // eslint-disable-next-line
    var responseMLEEnabled = params.supportsResponseMLE && !empty(responseMLEAlias);

    var responseMLEKeyID = null;
    if (responseMLEEnabled) {
        try {
            responseMLEKeyID = require('*/cartridge/scripts/mle/jweDecrypt').getResponseMLEKeyID(responseMLEAlias);
        } catch (keyIDError) {
            // Alias missing from the keystore, or the cert carries no Subject DN serialNumber.
            // Skip Response MLE rather than fail the call: sending an unresolvable kid gets the
            // whole JWT rejected with 401 UNAUTHORIZED_USER, whereas omitting it just means
            // Cybersource replies in plaintext.
            require('dw/system/Logger').getLogger('CyberSource', 'ResponseMLE').error(
                'Response MLE disabled for this request - could not resolve key ID from alias "{0}": {1}',
                responseMLEAlias, keyIDError.message
            );
        }
    }

    var jwt = buildJWTAuthHeader({
        keyID: params.keyID,
        merchantId: params.merchantId,
        sharedSecret: params.sharedSecret,
        requestHost: params.requestHost,
        requestMethod: params.requestMethod,
        requestResourcePath: params.requestResourcePath,
        digestString: params.digestString,
        responseMLEKeyID: responseMLEKeyID
    });
    signedHeaders.put('Authorization', 'Bearer ' + jwt);
}

module.exports = {
    buildJWTAuthHeader: buildJWTAuthHeader,
    applyJWTAuth: applyJWTAuth
};
 