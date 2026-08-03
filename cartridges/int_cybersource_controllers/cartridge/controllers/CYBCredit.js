var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants'),
 guard = require(CybersourceConstants.GUARD),
 app = require(CybersourceConstants.APP);

function getDeviceFingerprintToken() {
 if (empty(session.privacy.cybsDeviceFingerprintToken)) {
  var Mac = require('dw/crypto/Mac');
  var Encoding = require('dw/crypto/Encoding');
  var Site = require('dw/system/Site');

  var currentSite = Site.getCurrent();
  var secret = currentSite.getCustomPreferenceValue('CsSecurityKey');

  var key = !empty(secret) ? secret : currentSite.getID();
  var message = session.sessionID + ':' + currentSite.getID();

  var mac = new Mac(Mac.HMAC_SHA_256);
  var digestBytes = mac.digest(message, key);
  session.privacy.cybsDeviceFingerprintToken = Encoding.toHex(digestBytes);
 }
 return session.privacy.cybsDeviceFingerprintToken;
}

/**
 * This Controller is used to include digital fingerpirnt into billing isml template
 */
function IncludeDigitalFingerprint(args) {
 var Site = require('dw/system/Site');
 app.getView({
  DeviceFingerprintEnabled : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled'),
  DeviceFingerprintJetmetrixLocation : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation'),
  DeviceFingerprintOrgId : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId'),
  MerchantId : Site.getCurrent().getCustomPreferenceValue('CsMerchantId'),
  SessionId : getDeviceFingerprintToken(),

  RedirectionType : Site.getCurrent().getCustomPreferenceValue("CsDeviceFingerprintRedirectionType")
    }).render('cart/fingerprint');
}


/**
 * This Controller redirects the finger print location based on static mapping configured in BM
 */
function RedirectFpLocation(args) {
 var Site = require('dw/system/Site');
 app.getView({
  DeviceFingerprintEnabled : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled'),
  DeviceFingerprintJetmetrixLocation : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation'),
  DeviceFingerprintOrgId : Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId'),
  MerchantId : Site.getCurrent().getCustomPreferenceValue('CsMerchantId'),
  SessionId : getDeviceFingerprintToken(),
  LinkType : request.httpParameterMap.type.value
    }).render('cart/fingerprintredirect');
}

/*
 * Local methods
 */
exports.IncludeDigitalFingerprint=guard.ensure(['https'], IncludeDigitalFingerprint);
exports.RedirectFpLocation=guard.ensure(['https'], RedirectFpLocation);