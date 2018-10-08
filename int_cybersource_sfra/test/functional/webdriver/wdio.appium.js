'use strict';

var _ = require('lodash');
var minimist = require('minimist');
var getConfig = require('@tridnguyen/config');
var argv = minimist(process.argv.slice(2));

var opts = _.assign({}, getConfig({
    client: 'chrome',
    suite: '*',
    coverage: 'smoke',
    reporter: 'spec',
    timeout: '90000',     // timeout set to 90000 because the checkout process can be completed in 60000 when run in Appium/simulator
    locale: 'x_default',
    user: 'testuser1'
}, './config.json'), argv);

var specs = 'test/functional/' + opts.suite;

var sauce = {};

if (opts.sauce) {
    if (!process.env.SAUCE_USER && !process.env.SAUCE_ACCESS_KEY) {
        throw new Error('Sauce Labs user and access key are required');
    }
    sauce.host = 'ondemand.saucelabs.com';
    sauce.port = 80;
    sauce.user = process.env.SAUCE_USER;
    sauce.key = process.env.SAUCE_ACCESS_KEY;
    sauce.capabilities = opts.capabilities;
}

if (opts.suite.indexOf('.js') === -1) {
    specs += '/**';
}

exports.config = _.assign({
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: opts.timeout,
        compilers: ['js:babel-core/register']
    },
    specs: [
        specs
    ],
    port: '4723',
    capabilities: [{
        browserName: 'safari',
        appiumVersion: '1.6.4',
        deviceName: 'iPad Air',
        orientation: 'PORTRAIT',
        platformVersion: '10.3',
        platformName: 'iOS',
        app: ''
    }],
    waitforTimeout: opts.timeout,
    baseUrl: opts.baseUrl,
    reporter: opts.reporter,
    reporterOptions: {
        outputDir: 'test/AppiumReports'
    },
    locale: opts.locale,
    coverage: opts.coverage,
    user: opts.user,
    userEmail: opts.userEmail || opts.user + '@demandware.com'
}, sauce);
