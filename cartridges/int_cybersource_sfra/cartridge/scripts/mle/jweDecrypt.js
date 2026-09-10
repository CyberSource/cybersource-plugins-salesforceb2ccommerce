'use strict';

var Encoding = require('dw/crypto/Encoding');
var KeyRef = require('dw/crypto/KeyRef');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');

var logger = Logger.getLogger('CyberSource', 'ResponseMLE');

/**
 * @param {string} segment base64url-encoded string
 * @returns {dw.util.Bytes} decoded bytes
 */
function base64UrlDecode(segment) {
    var padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4 !== 0) {
        padded += '=';
    }
    return Encoding.fromBase64(padded);
}

/**
 * Decrypts a Response MLE JWE ("encryptedResponse" value) with the key at
 * SA_Flex_ResponseMLEKeyAlias. Cybersource sends alg=RSA-OAEP/enc=A256GCM here (not the
 * RSA-OAEP-256 dw.crypto.JWE requires), so this is decrypted by hand via dw.crypto.Cipher
 * instead: RSA-OAEP (SHA-1) unwraps the CEK, then AES-CTR reproduces GCM's ciphertext
 * keystream. The GCM auth tag (JWE part 5) is intentionally never verified - GCM's AAD can't
 * be supplied through the SFCC API class at all, and TLS + our own JWT/kid/cert
 * validation already cover integrity here.
 * @param {string} jwe compact-serialized JWE string (5 dot-separated parts)
 * @returns {string} decrypted UTF-8 payload
 */
function decryptJWE(jwe) {
    var Cipher = require('dw/crypto/Cipher');

    var parts = jwe.trim().split('.');
    if (parts.length !== 5) {
        throw new Error('decryptJWE: expected a 5-part JWE compact serialization, got ' + parts.length + ' part(s)');
    }
    var encryptedKeyBytes = base64UrlDecode(parts[1]);
    var ivBytes = base64UrlDecode(parts[2]);
    var ciphertextBytes = base64UrlDecode(parts[3]);

    // Separate from webhook egress MLE keys (/kms/egress/v2/keys-asym) - Cybersource doesn't
    // link the two, so this alias must point at the "REST - API Response MLE" key specifically.
    var keyAlias = Site.getCurrent().getCustomPreferenceValue('CsResponseMLE_Alias');

    var cipher = new Cipher();
    var cekBytes = cipher.decryptBytes(encryptedKeyBytes, new KeyRef(keyAlias), 'RSA/ECB/OAEPWithSHA-1AndMGF1Padding', null, 0);

    // NIST SP800-38D: J0 = IV || 0x00000001 masks the auth tag only - ciphertext keystream
    // starts one block later, at inc32(J0) = IV || 0x00000002.
    var ctrIvBytes = Encoding.fromHex(Encoding.toHex(ivBytes) + '00000002');

    var plaintextBytes = cipher.decryptBytes(ciphertextBytes, Encoding.toBase64(cekBytes), 'AES/CTR/NoPadding', Encoding.toBase64(ctrIvBytes), 0);
    return plaintextBytes.toString('UTF-8');
}

/**
 * Resolves the v-c-response-mle-kid to send: the certificate's Subject DN "serialNumber"
 * attribute (the Key ID shown in Cybersource Business Center > Key Management) - NOT the X.509
 * certificate's own serial number field, which is a different value from the same cert and gets
 * a 401 UNAUTHORIZED_USER (Cybersource rejects the whole JWT outright on an unrecognized kid).
 * @param {string} alias keystore alias of the Response MLE private key
 * @returns {string} kid to use as the v-c-response-mle-kid claim
 */
function getResponseMLEKeyID(alias) {
    var CertificateUtils = require('dw/crypto/CertificateUtils');
    var cert = CertificateUtils.getCertificate(new KeyRef(alias));
    return cert.getSubjectDN().match(/serialNumber=([^,]+)/i)[1];
}

/**
 * Decrypts rawBodyText if it's a Response MLE envelope ({"encryptedResponse": "<JWE>"}).
 * Anything else (raw JWT, plain JSON) is returned unchanged.
 * @param {string} rawBodyText raw HTTP response body
 * @returns {string} decrypted payload, or the original body if it wasn't encrypted
 */
function maybeDecryptResponse(rawBodyText) {
    // eslint-disable-next-line
    if (empty(rawBodyText)) {
        return rawBodyText;
    }

    var parsed;
    try {
        parsed = JSON.parse(rawBodyText);
    } catch (parseError) {
        return rawBodyText;
    }

    if (!(parsed && parsed.encryptedResponse)) {
        return rawBodyText;
    }

    try {
        return decryptJWE(parsed.encryptedResponse);
    } catch (decryptError) {
        logger.error('Response MLE decrypt failed: {0}', decryptError.message);
        throw decryptError;
    }
}

module.exports = {
    decryptJWE: decryptJWE,
    maybeDecryptResponse: maybeDecryptResponse,
    getResponseMLEKeyID: getResponseMLEKeyID
};
