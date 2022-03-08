/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const watch = aCmd.includes('--watch');

const {build} = require('esbuild');
const {dtsPlugin} = require("esbuild-plugin-d.ts");

Promise.allSettled([
	// === メイン ===
	build({
		entryPoints	: ['./src/extension'],
		outdir		: 'dist',
		bundle		: true,
		external	: ['vscode', 'node-gyp'],
		platform	: 'node',
		plugins		: [dtsPlugin()],
	//	treeShaking	: true,		// 省略可
		sourcemap	: true,
	//	minify		: true,
		watch,
		logLevel	: 'info',	// default log level when using the CLI.
	}),

	// === snsys_pre ===
	build({
		entryPoints	: ['./src/snsys_pre', './src/subset_font'],
		outdir		: 'dist',
		minify		: true,
		watch,
	}),
]);
