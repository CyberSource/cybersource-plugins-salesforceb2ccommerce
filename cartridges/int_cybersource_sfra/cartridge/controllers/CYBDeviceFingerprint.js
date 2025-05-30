'use strict';

/* eslint-disable no-undef */
var server = require('server');

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
    var sessionID = session.sessionID;
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
    sessionID = libCybersource.replaceCharsInSessionID(sessionID);

    var url = location + '/fp/tags.js?org_id=' + orgID + '&session_id=' + merchID + sessionID;

    res.cacheExpiration(0);
    res.render('common/deviceFingerprint', {
        url: url,
        getDeviceFingerprint: getDeviceFingerprint
    });
    next();
});

/*
 * Module exports
 */
module.exports = server.exports();
