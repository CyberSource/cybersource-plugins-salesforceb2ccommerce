'use strict';

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

    if (Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled')) {
        if (empty(session.custom.deviceFingerprintTime)) {
            session.custom.deviceFingerprintTime = now;
            getDeviceFingerprint = true;
        }
        else {
            var timeSinceLastFingerprint = now - session.custom.deviceFingerprintTime;
            if (timeSinceLastFingerprint > devicefingerprintTTL) {
                session.custom.deviceFingerprintTime = now;
                getDeviceFingerprint = true;
            }
        }
    }

    var url = location + "/fp/tags.js?org_id=" + orgID + "&session_id=" + merchID + sessionID;

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
