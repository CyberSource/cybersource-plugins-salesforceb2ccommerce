'use strict';

var Logger = require('dw/system/Logger');

/**
 * getTime
 * @returns {Object} obj
 */
function getTime() {
    var Calendar = require('dw/util/Calendar');
    var StringUtils = require('dw/util/StringUtils');
    var Site = require('dw/system/Site');

    var dateLocale = Site.getCurrent().getCustomPreferenceValue('SA_Flex_DateLocale');

    try {
        // eslint-disable-next-line
        var date = (request.locale.indexOf('en_') !== -1) ? StringUtils.formatCalendar(new dw.util.Calendar(), 'EEE, dd MMM yyyy HH:mm:ss z') : StringUtils.formatCalendar(new dw.util.Calendar(), (dateLocale || 'en_US'), Calendar.LONG_DATE_PATTERN);
        return date;
    } catch (exception) {
        Logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
}

/**
 * getDigest
 * @param {Object} digestString digestString
 * @returns {Object} obj
 */
function getDigest(digestString) {
    var MessageDigest = require('dw/crypto/MessageDigest');
    var Bytes = require('dw/util/Bytes');
    var StringUtils = require('dw/util/StringUtils');
    var Encoding = require('dw/crypto/Encoding');

    try {
        var digester = new MessageDigest(MessageDigest.DIGEST_SHA_256);
        var digest = digester.digestBytes(new Bytes(digestString, 'UTF-8'));
        var base64String = Encoding.toBase64(digest);
        return StringUtils.format('SHA-256={0}', base64String);
    } catch (exception) {
        Logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
}

/**
 * generateSignature
 * @param {Object} signedHeaders signedHeaders
 * @param {Object} keyID keyID
 * @param {Object} sharedSecret sharedSecret
 * @returns {Object} obj
 */
function generateSignature(signedHeaders, keyID, sharedSecret) {
    var Bytes = require('dw/util/Bytes');
    var Mac = require('dw/crypto/Mac');
    var Encoding = require('dw/crypto/Encoding');
    var collections = require('*/cartridge/scripts/util/collections');

    try {
        var encryptor = new Mac(Mac.HMAC_SHA_256);
        var secret = Encoding.fromBase64(sharedSecret);
        var signatureString = '';
        // var headerString = '';
        collections.forEach(signedHeaders.keySet(), function (key) {
            // for each(var key in signedHeaders.keySet()){
            signatureString = signatureString + '\n' + key + ': ' + signedHeaders.get(key);
        });
        signatureString = signatureString.slice(1, signatureString.length);
        var signatureDigest = encryptor.digest(new Bytes(signatureString.toString(), 'UTF-8'), secret);
        var signature = Encoding.toBase64(signatureDigest);
        return signature;
    } catch (exception) {
        Logger.error('Error in Secure acceptance create request data' + exception.message);
        return { error: true, errorMsg: exception.message };
    }
}

/**
 * ClearFlexKey
 * @returns {Object} obj
 */
function CreateFlexKey() {
    var HashMap = require('dw/util/HashMap');
    var collections = require('*/cartridge/scripts/util/collections');
    var CRServices = require('*/cartridge/scripts/init/RestServiceInit');
    var signedHeaders = new HashMap();
    var Site = require('dw/system/Site');

    var sharedSecret = Site.getCurrent().getCustomPreferenceValue('SA_Flex_SharedSecret');
    var keyID = Site.getCurrent().getCustomPreferenceValue('SA_Flex_KeyID');
    // eslint-disable-next-line
    var host = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_HostName');
    var signature;
    var targetOrigin;
    // eslint-disable-next-line
    var merchantId = dw.system.Site.getCurrent().getCustomPreferenceValue('CsMerchantId');

    // eslint-disable-next-line
    if (request.isHttpSecure()) {
        // eslint-disable-next-line
        targetOrigin = 'https://' + request.httpHost;
    } else {
        // eslint-disable-next-line
        targetOrigin = 'http://' + request.httpHost;
    }

    var allowedCNetworks = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_AllowedCardNetworks');
    var list = [];
    if (empty(allowedCNetworks)) {
        list.push('VISA');
    } else {
        for (let i = 0; allowedCNetworks[i] != null; i++) {
            list.push(allowedCNetworks[i].value);
        }
    }

    var digest = {
        'targetOrigins': [
            targetOrigin
        ],
        'allowedCardNetworks': list,
        'clientVersion': "v2"
    };
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

    digest.clientReferenceInformation = {};
    digest.clientReferenceInformation.applicationName = CybersourceConstants.APPLICATION_NAME;
    digest.clientReferenceInformation.applicationVersion = CybersourceConstants.APPLICATION_VERSION;

    var digestString = JSON.stringify(digest);

    signedHeaders.put('host', host);
    signedHeaders.put('date', getTime());
    signedHeaders.put('request-target', 'post /microform/v2/sessions?format=JWT');

    signedHeaders.put('digest', getDigest(digestString));
    signedHeaders.put('v-c-merchant-id', merchantId);
    signature = generateSignature(signedHeaders, keyID, sharedSecret);
    var headerString = '';
    collections.forEach(signedHeaders.keySet(), function (key) {
        // for each(var key in signedHeaders.keySet()){
        headerString = headerString + ' ' + key;
    });
    var signatureMap = new HashMap();
    signatureMap.put('keyid', keyID);
    signatureMap.put('algorithm', 'HmacSHA256');
    signatureMap.put('headers', headerString);
    signatureMap.put('signature', signature);
    var signaturefields = '';
    collections.forEach(signatureMap.keySet(), function (key) {
        // for each(var key in signatureMap.keySet()){
        signaturefields = signaturefields + key + '="' + signatureMap.get(key) + '", ';
    });
    signaturefields = signaturefields.slice(0, signaturefields.length - 2);
    signedHeaders.put('signature', signaturefields);
    signedHeaders.remove('request-target');
    var service = CRServices.CyberSourceFlexTokenService;
    var serviceResponse = service.call(signedHeaders, digestString);
    return serviceResponse.object;
}

function jwtDecode(jwt) {

    var response = jwt;
    var Logger = require('dw/system/Logger');
    var Encoding = require('dw/crypto/Encoding');

    var encodedHeader = response.split('.')[0];
    var kid = JSON.parse(Encoding.fromBase64(encodedHeader)).kid;
    var alg = JSON.parse(Encoding.fromBase64(encodedHeader)).alg;

    var encodedPayload = response.split('.')[1];
    var decodedPayload = Encoding.fromBase64(encodedPayload).toString();

    var parsedPayload = JSON.parse(decodedPayload);

    // return parsedPayload;
    var decodedJwt = null;

    var jwtSignature = response.split('.')[2];

    var pKid = getPublicKey(kid);
    var pkey = require('../../helper/publicKey');
    if (!empty(pKid.n) && !empty(pKid.e)) {
        var RSApublickey = pkey.getRSAPublicKey(pKid.n, pKid.e);

        var JWTAlgoToSFCCMapping = {
            RS256: "SHA256withRSA",
            RS512: "SHA512withRSA",
            RS384: "SHA384withRSA",
        };

        var Signature = require('dw/crypto/Signature');
        var apiSig = new Signature();
        var Bytes = require('dw/util/Bytes');

        var jwtSignatureInBytes = new Encoding.fromBase64(jwtSignature);

        var contentToVerify = encodedHeader + '.' + encodedPayload;
        contentToVerify = new Bytes(contentToVerify);

        var isValid = apiSig.verifyBytesSignature(jwtSignatureInBytes, contentToVerify, new Bytes(RSApublickey), JWTAlgoToSFCCMapping[alg]);
        if (isValid) {
            decodedJwt = parsedPayload;
        }
    }
    return decodedJwt;
}


function getPublicKey(kid) {

    var HashMap = require('dw/util/HashMap');
    var collections = require('*/cartridge/scripts/util/collections');
    var CRServices = require('*/cartridge/scripts/init/RestServiceInit');
    var signedHeaders = new HashMap();
    var Site = require('dw/system/Site');

    var sharedSecret = Site.getCurrent().getCustomPreferenceValue('SA_Flex_SharedSecret');
    var keyID = Site.getCurrent().getCustomPreferenceValue('SA_Flex_KeyID');
    // eslint-disable-next-line
    var host = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_HostName');
    var signature;
    var targetOrigin;
    // eslint-disable-next-line
    var merchantId = dw.system.Site.getCurrent().getCustomPreferenceValue('CsMerchantId');

    signedHeaders.put('host', host);
    signedHeaders.put('User-Agent', 'Mozilla/5.0');
    signedHeaders.put('date', getTime());
    signedHeaders.put('request-target', 'get /flex/v2/public-keys/' + kid);

    signedHeaders.put('v-c-merchant-id', merchantId);
    signature = generateSignature(signedHeaders, keyID, sharedSecret);
    var headerString = '';
    collections.forEach(signedHeaders.keySet(), function (key) {
        headerString = headerString + ' ' + key;
    });
    var signatureMap = new HashMap();
    signatureMap.put('keyid', keyID);
    signatureMap.put('algorithm', 'HmacSHA256');
    signatureMap.put('headers', headerString);
    signatureMap.put('signature', signature);
    var signaturefields = '';
    collections.forEach(signatureMap.keySet(), function (key) {
        signaturefields = signaturefields + key + '="' + signatureMap.get(key) + '", ';
    });
    signaturefields = signaturefields.slice(0, signaturefields.length - 2);
    signedHeaders.put('signature', signaturefields);
    signedHeaders.remove('request-target');
    var service = CRServices.CyberSourceAssymentricKeyManagement;
    var serviceResponse = service.call(signedHeaders, kid);
    return JSON.parse(serviceResponse.object);
}

/** Exported functions * */
module.exports = {
    CreateFlexKey: CreateFlexKey,
    getDigest: getDigest,
    getTime: getTime,
    generateSignature: generateSignature,
    jwtDecode: jwtDecode
};
