'use strict';

var path = require('path');
var sgmfScripts = require('sgmf-scripts');
const CopyPlugin = require('copy-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

var RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: sgmfScripts.createJsPath(),
    output: {
        path: path.resolve('./cartridges/int_cybersource_sfra/cartridge/static'),
        filename: '[name].js'
    },
    plugins: [
        new NodePolyfillPlugin(),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve('./cartridges/int_cybersource_sfra/cartridge/client/default/custom'),
                    to: path.resolve('./cartridges/int_cybersource_sfra/cartridge/static/default/custom')
                },
            ],
        })
    ]
}, {
    mode: 'none',
    name: 'scss',
    entry: sgmfScripts.createScssPath(),
    output: {
        path: path.resolve('./cartridges/int_cybersource_sfra/cartridge/static')
    },
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            esModule: false
                        }
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            url: false
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [require('autoprefixer')()]
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require('sass'),
                            sassOptions: {
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
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new RemoveEmptyScriptsPlugin(),
        new NodePolyfillPlugin(),
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[name].css'
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve('./cartridges/int_cybersource_sfra/cartridge/client/default/images'),
                    to: path.resolve('./cartridges/int_cybersource_sfra/cartridge/static/default/images')
                },
            ],
        })
    ],
    optimization: {
        minimizer: ['...', new CssMinimizerPlugin()]
    }
},

];
