/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const watch = aCmd.includes('--watch');
const prod = aCmd.includes('--production');
const node_env = prod ?'production' :'development';

import {build} from 'esbuild';

import {build as vite} from 'vite';
import vue from '@vitejs/plugin-vue';
//console.log(`fn:build.ts __dirname:${__dirname}:`);	// src

// === メイン ===
build({
	entryPoints	: ['./src/extension'],
	outdir		: 'dist',
	bundle		: true,
	external	: ['vscode', 'node-gyp'],
	platform	: 'node',
//	treeShaking	: true,		// 省略可
	sourcemap	: true,
//	minify		: true,
//	minify		: production,
	format		: 'cjs',		// Node.js の仕様
	watch,
	logLevel	: 'info',	// default log level when using the CLI.
});

// === vue ===
vite({
	root	: './views/',
	define: {
		'process.env.NODE_ENV'	: JSON.stringify(node_env),
	},
	build: {
		target	: 'esnext',
		lib: {
			entry	: './setting.ts',
			fileName: _=> 'setting.js',
			formats	: ['es'],
		},
		minify	: prod ?'terser' :false,
		watch	: watch ?{} :null,
		outDir		: './',	// rootからの相対
		emptyOutDir	: false,
		reportCompressedSize	: false,
	},
	plugins: [vue()],
	optimizeDeps: {
		entries	: ['/setting.htm'],
		include	: ['./lib/bootstrap.min.js', './lib/fontawesome/all.min.js'],
	},
//	assetsInclude: ['./lib/**/*.woff2'],
});

// === snsys_pre ===
build({
	entryPoints	: ['./src/snsys_pre'],
	outdir		: 'dist',
	minify		: true,
	watch,
});

// === batch ===
build({
	entryPoints	: [
		'./src/batch/subset_font',
		'./src/batch/cut_round',
		'./src/batch/cnv_mat_pic',
		'./src/batch/cnv_mat_snd',
	],
	outdir		: 'dist',
	minify		: true,
	format		: 'cjs',	// Node.js の仕様
	watch,
});

// === lsp-skynovel-server ===
build({
	entryPoints	: ['./server/src/LangSrv'],
	outdir		: 'server/dist',
	minify		: true,
	format		: 'cjs',	// Node.js の仕様
	watch,
});
