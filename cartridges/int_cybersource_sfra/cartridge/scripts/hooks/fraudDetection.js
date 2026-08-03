'use strict';

/**
 * Fraud Detection Hook
 *
 * @param {dw.order.Basket} basaket - The baasket object to be placed
 * @returns {Object} an error object. Status can have three values 'success', 'fail' or 'flag'
 *         error code that could be mapped to localized resources error Message a string with the
 *         error message, that could be used as a fall-back if error code doesn't have a mapping
 */
// eslint-disable-next-line
function fraudDetection(basket) {
    var Logger = require('dw/system/Logger');
    var Site = require('dw/system/Site');
    var errorCode = '';
    var errorMessage = '';
    var decision = 'ACCEPT';
    var status = 'success';
    var dmEnabled = Site.current.getCustomPreferenceValue('csCardDecisionManagerEnable');
    var dmEnabledForPP = Site.current.getCustomPreferenceValue('isDecisionManagerEnable');

    //  If DM is disabled, default status returned is 'success'.
    //  If DM is enabled, get the status saved in the session, form the last Auth call.
    if (dmEnabled || dmEnabledForPP) {
        // eslint-disable-next-line
        if ('CybersourceFraudDecision' in session.privacy) {
            // eslint-disable-next-line
            decision = session.privacy.CybersourceFraudDecision;
        } else {
            Logger.error("Error setting fraud decision.  CybersourceFraudDecision missing from session.  Failing closed - defaulting to REJECT.");
            decision = 'REJECT';
        }
    }

    if (decision === 'REVIEW') {
        status = 'flag';
    } else if (decision === 'REJECT') {
        status = 'fail';
    }

    return {
        status: status,
        errorCode: errorCode,
        errorMessage: errorMessage
    };
}

exports.fraudDetection = fraudDetection;
