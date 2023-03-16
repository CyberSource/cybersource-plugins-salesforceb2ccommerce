'use strict';

/**
 * To find out the device type.
* To define input and output parameters, create entries of the form:
 * @param {*} args args
 * @returns {*} obj
 */
function execute(args) {
    var deviceType = 'desktop';
    var iPhoneDevice = 'iPhone';
    var iPadDevice = 'iPad';
    var request = args.CurrentRequest;
    var andriodDevice = 'Android'; // Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; ADR6300 Build/GRJ22) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1

    var httpUserAgent = request.httpUserAgent;

    // check if the device is iPhone
    if (httpUserAgent.indexOf(iPhoneDevice) > 1) {
        deviceType = 'mobile';

    // check if the device is Android mobile device
    } else if (httpUserAgent.indexOf(andriodDevice) > 1) {
        if (httpUserAgent.indexOf('mobile') > 1) { deviceType = 'mobile'; }
    } else if (httpUserAgent.indexOf(iPadDevice) > 1) {
        deviceType = 'tablet';
    }

    // eslint-disable-next-line
    args.device = deviceType;
    // eslint-disable-next-line
    return PIPELET_NEXT;
}
module.exports = execute;
