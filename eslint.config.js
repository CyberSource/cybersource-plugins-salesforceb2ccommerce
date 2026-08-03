'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'cartridges/int_cybersource_sfra/cartridge/static/**',
            'cartridges/int_cybersource_sfra/cartridge/client/default/custom/lib/jquery/**',
            'cartridges/int_cybersource_sfra/cartridge/client/default/lib/jquery/**',
            'cartridges/int_cybersource_sfra/cartridge/client/default/js/paypal.js',
            'cartridges/int_cybersource_sfra/cartridge/client/default/custom/lib/dompurify.min.js'
        ]
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.jquery,
                ...globals.mocha,
                dw: 'readonly',
                request: 'readonly',
                response: 'readonly',
                session: 'readonly',
                customer: 'readonly',
                empty: 'readonly',
                XML: 'readonly',
                XMLList: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', {
                args: 'none',
                caughtErrors: 'none',
                vars: 'all'
            }]
        }
    }
];