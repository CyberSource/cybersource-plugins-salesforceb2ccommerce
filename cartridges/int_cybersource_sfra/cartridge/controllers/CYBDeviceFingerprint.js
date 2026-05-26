'use strict';

/* eslint-disable no-undef */
var server = require('server');
var secureResponseHelper = require('*/cartridge/scripts/helpers/secureResponseHelper');
var secureRender = secureResponseHelper.secureRender;

function getDeviceFingerprintToken() {
    if (empty(session.privacy.cybsDeviceFingerprintToken)) {
        var Mac = require('dw/crypto/Mac');
        var KeyRef = require('dw/crypto/KeyRef');
        var Encoding = require('dw/crypto/Encoding');
        var Bytes = require('dw/util/Bytes');
        var Site = require('dw/system/Site');
        var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
        var CybersourceHelper = libCybersource.getCybersourceHelper();

        var currentSite = Site.getCurrent();
        var alias = CybersourceHelper.getAliasForSignature(); // CsAuth_Alias site preference
        var key = !empty(alias) ? new KeyRef(alias) : new Bytes(currentSite.getID(), 'UTF-8');
        var message = session.sessionID + ':' + currentSite.getID();

        var mac = new Mac(Mac.HMAC_SHA_256);
        var digestBytes = mac.digest(message, key);
        session.privacy.cybsDeviceFingerprintToken = Encoding.toHex(digestBytes);
    }
    return session.privacy.cybsDeviceFingerprintToken;
}


/*
 * Controller that handles the Cybersource Device Fingerprint
*/

/**
 * Get fingertpringing url and outputs it to template
 */
server.get('GetFingerprint', function (req, res, next) {
    var Site = require('dw/system/Site');
    var orgID = Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId');
    var merchID = Site.getCurrent().getCustomPreferenceValue('CsMerchantId');
    var sessionID = getDeviceFingerprintToken();
    var location = Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation');
    var now = new Date().valueOf();
    var devicefingerprintTTL = Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintTTL');
    var getDeviceFingerprint = false;
    var libCybersource = require('*/cartridge/scripts/cybersource/libCybersource');
    var CybersourceHelper = libCybersource.getCybersourceHelper();

    if (Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled')) {
        if (empty(session.privacy.deviceFingerprintTime)) {
            session.privacy.deviceFingerprintTime = now;
            getDeviceFingerprint = true;
        } else {
            var timeSinceLastFingerprint = now - session.privacy.deviceFingerprintTime;
            if (timeSinceLastFingerprint > devicefingerprintTTL) {
                session.privacy.deviceFingerprintTime = now;
                getDeviceFingerprint = true;
            }
        }
    }


    var url = location + '/fp/tags.js?org_id=' + orgID + '&session_id=' + merchID + sessionID;

    res.cacheExpiration(0);
    secureRender(res, 'common/deviceFingerprint', {
        url: url,
        getDeviceFingerprint: getDeviceFingerprint
    });
    next();
});

/*
 * Module exports
 */
module.exports = server.exports();
 