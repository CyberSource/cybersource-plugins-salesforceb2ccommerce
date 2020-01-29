'use strict';

var getConfig = require('@tridnguyen/config');

var opts = Object.assign({}, getConfig({
    baseUrl: 'https://cybersource08-tech-prtnr-na07-dw.demandware.net/on/demandware.store/Sites-RefArch-Site/en_US',
    suite: '*',
    reporter: 'spec',
    timeout: 60000,
    locale: 'x_default'
}, './config.json'));

module.exports = opts;
