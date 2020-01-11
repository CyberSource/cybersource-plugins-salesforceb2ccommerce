'use strict';

var path = require('path');
var ExtractTextPlugin = require('sgmf-scripts')['extract-text-webpack-plugin'];
var sgmfScripts = require('sgmf-scripts');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: sgmfScripts.createJsPath(),
    output: {
        path: path.resolve('./cartridges/LINK_cybersource/cartridge/static'),
        filename: '[name].js'
    }
}, {
    mode: 'none',
    name: 'scss',
    entry: sgmfScripts.createScssPath(),
    output: {
        path: path.resolve('./cartridges/LINK_cybersource/cartridge/static'),
        filename: '[name].css'
    },
    module: {
        rules: [{
            test: /\.scss$/,
            use: ExtractTextPlugin.extract({
                use: [{
                    loader: 'css-loader',
                    options: {
                        url: false,
                        minimize: true
                    }
                }, {
                    loader: 'postcss-loader',
                    options: {
                        plugins: [
                            require('autoprefixer')()
                        ]
                    }
                }, {
                    loader: 'sass-loader',
                    options: {
                        includePaths: [
                            path.resolve(
                                process.cwd(),
                                '../storefront-reference-architecture/node_modules/'
                            ),
                            path.resolve(
                                process.cwd(), // eslint-disable-next-line max-len
                                '../storefront-reference-architecture/node_modules/flag-icon-css/sass'
                            )]
                    }
                }]
            })
        }]
    },
    plugins: [
        new ExtractTextPlugin({ filename: '[name].css' })
    ]
}];
