'use strict';

/**
 * ClearFlexKey
 * @returns {Object} obj
 */
function CreateFlexKey() {
    var HashMap = require('dw/util/HashMap');
    var CRServices = require('*/cartridge/scripts/init/RestServiceInit');
    var signedHeaders = new HashMap();
    var Site = require('dw/system/Site');

    var sharedSecret = Site.getCurrent().getCustomPreferenceValue('SA_Flex_SharedSecret');
    var keyID = Site.getCurrent().getCustomPreferenceValue('SA_Flex_KeyID');
    // eslint-disable-next-line
    var host = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_HostName');
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

    var CardPrefixPreference = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_Card_Prefix (BIN)');
    var includeCardPrefix;
    if(CardPrefixPreference != 'Six'){
        if(CardPrefixPreference == 'Eight'){
            includeCardPrefix = true;
        }else{
            includeCardPrefix = false;
        }
    }
    var digest = {
        'targetOrigins': [
            targetOrigin
        ],
        'allowedCardNetworks': list,
        'clientVersion': "v2",
        'transientTokenResponseOptions':{
            'includeCardPrefix': includeCardPrefix
        }
    };
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

    digest.clientReferenceInformation = {};
    digest.clientReferenceInformation.applicationName = CybersourceConstants.APPLICATION_NAME;
    digest.clientReferenceInformation.applicationVersion = CybersourceConstants.APPLICATION_VERSION;

    var digestString = JSON.stringify(digest);

    var jwtAuthBuilder = require('*/cartridge/scripts/mle/jwtAuthBuilder');
    jwtAuthBuilder.applyJWTAuth(signedHeaders, {
        keyID: keyID,
        merchantId: merchantId,
        sharedSecret: sharedSecret,
        requestHost: host,
        requestMethod: 'post',
        requestResourcePath: '/microform/v2/sessions?format=JWT',
        digestString: digestString,
        supportsResponseMLE: true
    });

    var service = CRServices.CyberSourceFlexTokenService;
    var serviceResponse = service.call(signedHeaders, digestString);

    var mleResponseHelper = require('*/cartridge/scripts/mle/jweDecrypt');
    return mleResponseHelper.maybeDecryptResponse(serviceResponse.object);
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
    var CRServices = require('*/cartridge/scripts/init/RestServiceInit');
    var signedHeaders = new HashMap();
    var Site = require('dw/system/Site');

    var sharedSecret = Site.getCurrent().getCustomPreferenceValue('SA_Flex_SharedSecret');
    var keyID = Site.getCurrent().getCustomPreferenceValue('SA_Flex_KeyID');
    // eslint-disable-next-line
    var host = dw.system.Site.getCurrent().getCustomPreferenceValue('SA_Flex_HostName');
    // eslint-disable-next-line
    var merchantId = dw.system.Site.getCurrent().getCustomPreferenceValue('CsMerchantId');

    var jwtAuthBuilder = require('*/cartridge/scripts/mle/jwtAuthBuilder');
    jwtAuthBuilder.applyJWTAuth(signedHeaders, {
        keyID: keyID,
        merchantId: merchantId,
        sharedSecret: sharedSecret,
        requestHost: host,
        requestMethod: 'get',
        requestResourcePath: '/flex/v2/public-keys/' + kid
    });

    var service = CRServices.CyberSourceAssymentricKeyManagement;
    var serviceResponse = service.call(signedHeaders, kid);

    return JSON.parse(serviceResponse.object);
}

/** Exported functions * */
module.exports = {
    CreateFlexKey: CreateFlexKey,
    jwtDecode: jwtDecode
};
