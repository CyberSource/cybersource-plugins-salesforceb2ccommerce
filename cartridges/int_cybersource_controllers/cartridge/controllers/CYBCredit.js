var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants'),
	guard = require(CybersourceConstants.GUARD),
	app = require(CybersourceConstants.APP);
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
		SessionId : session.sessionID,
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
		SessionId : session.sessionID,
		LinkType : request.httpParameterMap.type.value
    }).render('cart/fingerprintredirect');
}

/*
 * Local methods
 */
exports.IncludeDigitalFingerprint=guard.ensure(['https'], IncludeDigitalFingerprint);
exports.RedirectFpLocation=guard.ensure(['https'], RedirectFpLocation);