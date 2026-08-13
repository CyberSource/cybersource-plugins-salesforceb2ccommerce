'use strict';

var path = require('path');
var fs = require('fs');
const CopyPlugin = require('copy-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

//  These replace sgmfScripts.createJsPath() / createScssPath(). Those helpers build their glob
//  with path.join(cwd, ...), which on Windows yields backslashes; glob reads a backslash as an
//  escape character, so the pattern matches nothing and webpack reports success having emitted
//  no js or css at all. Walking the tree with fs sidesteps path separators entirely, and avoids
//  depending on glob, which this package only gets transitively.
var CLIENT_DIR = path.resolve('./cartridges/int_cybersource_sfra/cartridge/client');

/**
 * Collect every file under dir, recursively.
 * @param {string} dir - directory to walk
 * @returns {string[]} absolute file paths
 */
function walk(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs.readdirSync(dir, { withFileTypes: true }).reduce(function (files, entry) {
        var full = path.join(dir, entry.name);
        return files.concat(entry.isDirectory() ? walk(full) : [full]);
    }, []);
}

/**
 * Entry name relative to the client directory, always forward-slashed so the emitted asset path
 * is identical on every platform.
 * @param {string} filePath - absolute path to the source file
 * @returns {string} posix-style path relative to the client directory
 */
function relativeName(filePath) {
    return path.relative(CLIENT_DIR, filePath).split(path.sep).join('/');
}

/**
 * Mirrors the glob client/**\/js/*.js - every .js sitting directly inside a `js` directory.
 * @returns {Object} webpack entry map
 */
function createJsPath() {
    return walk(CLIENT_DIR).reduce(function (result, filePath) {
        var name = relativeName(filePath);
        if (/(^|\/)js\/[^/]+\.js$/.test(name)) {
            result[name.slice(0, -3)] = filePath;
        }
        return result;
    }, {});
}

/**
 * Mirrors the glob client/**\/scss/**\/*.scss - every .scss at any depth below a `scss`
 * directory, skipping partials. `scss` in the entry name becomes `css` so the compiled file
 * lands in static/default/css, matching sgmf-scripts' own naming.
 * @returns {Object} webpack entry map
 */
function createScssPath() {
    return walk(CLIENT_DIR).reduce(function (result, filePath) {
        var name = relativeName(filePath);
        if (/(^|\/)scss\/.*\.scss$/.test(name) && path.basename(filePath).indexOf('_') !== 0) {
            result[name.slice(0, -5).replace('scss', 'css')] = filePath;
        }
        return result;
    }, {});
}

var RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: createJsPath(),
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
    entry: createScssPath(),
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
