'use strict';

/**
 * Highly custom logic to create public key.
 * Return public key as DER
 */

function getRSAPublicKey(modulus_b64, exponent_b64) {

    var Encoding = require('dw/crypto/Encoding');

    function prepadSigned(hexStr) {
        var msb = hexStr[0]
        if (
            (msb >= '8' && msb <= '9') ||
            (msb >= 'a' && msb <= 'f') ||
            (msb >= 'A' && msb <= 'F')) {
            return '00' + hexStr;
        } else {
            return hexStr;
        }
    }

    function toHex(number) {
        var nstr = number.toString(16);
        if (nstr.length % 2 == 0) return nstr;
        return '0' + nstr;
    }

    function encodeLengthHex(n) {
        if (n <= 127) return toHex(n)
        else {
            var n_hex = toHex(n);
            var length_of_length_byte = 128 + n_hex.length / 2;
            return toHex(length_of_length_byte) + n_hex;
        }
    }

    var modulus = Encoding.fromBase64(modulus_b64);
    var exponent = Encoding.fromBase64(exponent_b64);


    var modulus_hex = Encoding.toHex(modulus);
    var exponent_hex = Encoding.toHex(exponent);

    modulus_hex = prepadSigned(modulus_hex);
    exponent_hex = prepadSigned(exponent_hex);

    var modlen = modulus_hex.length / 2;
    var explen = exponent_hex.length / 2;

    var encoded_modlen = encodeLengthHex(modlen);
    var encoded_explen = encodeLengthHex(explen);
    var encoded_pubkey = '30' +
        encodeLengthHex(
            modlen +
            explen +
            encoded_modlen.length / 2 +
            encoded_explen.length / 2 + 2
        ) +
        '02' + encoded_modlen + modulus_hex +
        '02' + encoded_explen + exponent_hex;

    var seq2 =
        '30 0d ' +
        '06 09 2a 86 48 86 f7 0d 01 01 01' +
        '05 00 ' +
        '03' + encodeLengthHex(encoded_pubkey.length / 2 + 1) +
        '00' + encoded_pubkey;

    seq2 = seq2.replace(/ /g, '');

    var der_hex = '30' + encodeLengthHex(seq2.length / 2) + seq2;

    der_hex = der_hex.replace(/ /g, '');

    var der_b64 = Encoding.toBase64(Encoding.fromHex(der_hex));

    return der_b64;
}

module.exports.getRSAPublicKey = getRSAPublicKey;