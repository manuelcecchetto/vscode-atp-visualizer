//@ts-check
'use strict';

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const path = require('path');
const webpack = require('webpack');

/** @type WebpackConfig */
const extensionConfig = {
	mode: 'none',
	target: 'node',
	entry: {
		extension: './src/extension.ts',
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: '../[resource-path]'
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader',
				options: {
					configFile: 'tsconfig.json'
				}
			}]
		}]
	},
	externals: {
		vscode: 'commonjs vscode',
	},
	plugins: [
		new webpack.ProgressPlugin(),
	],
	devtool: 'nosources-source-map',
	infrastructureLogging: {
		level: 'log',
	},
};

/** @type WebpackConfig */
const webviewConfig = {
	mode: 'production',
	target: 'web',
	entry: {
		webview: './webview-ui/src/main.tsx',
	},
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'dist/webview'),
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	module: {
		rules: [{
			test: /\.tsx?$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader',
				options: {
					configFile: 'tsconfig.webview.json'
				}
			}]
		},
		{
			test: /\.css$/,
			use: ['style-loader', 'css-loader'],
		}]
	},
	plugins: [
		new webpack.optimize.LimitChunkCountPlugin({
			maxChunks: 1
		}),
	],
	devtool: 'nosources-source-map',
	performance: {
		hints: false,
	},
	infrastructureLogging: {
		level: 'log',
	},
};

module.exports = [extensionConfig, webviewConfig];
