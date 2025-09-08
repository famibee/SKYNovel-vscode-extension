/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const watch = aCmd.includes('--watch') ?{} :null;
const prod = aCmd.includes('--production');
// const node_env = prod ?'production' :'development';

// import {build, type BuildEnvironmentOptions} from 'vite';
// import vue from '@vitejs/plugin-vue';
//console.log(`fn:build.ts __dirname:${__dirname}:`);	// src
import {type BuildOptions, context} from 'esbuild';
// import {resolve} from 'node:path';

const oBuild: BuildOptions = {
	target		: 'esnext',
	outdir		: 'dist',
	bundle		: true,
	minify		: true,
};

{	// === メイン ===
	const ctx = await context({
		...oBuild,
		entryPoints	: ['./src/extension'],
		external	: ['vscode', 'node-gyp'],
		platform	: 'node',
		sourcemap	: true,
		format		: 'cjs',	// Node.js の仕様
		logLevel	: 'info',	// default log level when using the CLI.
	});
	if (watch) await ctx.watch(); else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

// === vue ===
//	上手くいかないので views/vite.config.mts で
// build({
// 	define: {'process.env.NODE_ENV': JSON.stringify(node_env)},
// 	// root: '',
// 	root: 'views',
// 	// base: '/views/',		// 必要
// 	// base: './views',		// 必要
// 	// base: '../',		// 必要
// 	base: './',		// 必要
// 	build: {
// 		...<BuildEnvironmentOptions>oBuild,
// 		// outDir: '../dist',
// 		// assetsDir: '../assets',
// 		// assetsDir: 'views/assets',
// 		// assetsDir: './dist/views/assets',
// 		rollupOptions: {
// 			input: {
// 				setting: resolve(__dirname, 'views/setting.html'),
// 			},
// 		},
// 		// emptyOutDir: false,
// 		emptyOutDir: true,	// dist 下をクリア
// 		minify	: prod ?'terser' :false,
// 		watch,
// 	},
// 	plugins: [vue()],
// 	optimizeDeps: {
// 		// entries	: ['views/setting.html'],
// 		entries	: ['setting.html'],
// 		include	: [
// 			'lib/bootstrap.bundle.min.js',
// 			'lib/fontawesome/all.min.js',
// 			// 'views/lib/bootstrap.bundle.min.js',
// 			// 'views/lib/fontawesome/all.min.js',
// 		],
// 	},
// //	assetsInclude: ['lib/ * * / *.woff2'],
// });

{	// === snsys_pre ===
	const ctx = await context({
		...oBuild,
		entryPoints	: ['./src/snsys_pre'],
		format		: 'esm',
	});
	if (watch) await ctx.watch(); else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

{	// === batch ===
	const ctx = await context({
		...oBuild,
		entryPoints	: [
			'./src/batch/cnv_mat_pic',
			'./src/batch/cnv_mat_snd',
			'./src/batch/cnv_psd_face',
			'./src/batch/cut_round',
			'./src/batch/subset_font',
		],
		bundle		: false,
			// bundle: true、platform: 'node'でぜんぶバンドルできないか試したが、
			// 実行時に Error: Dynamic require of "os" is not supported
			// 【import _os from 'node:os';】をするもたぶん TreeShaking で脱落
		format		: 'esm',
	});
	if (watch) await ctx.watch(); else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

{	// === lsp-skynovel-server ===
	const ctx = await context({
		...oBuild,
		entryPoints	: ['./server/src/LangSrv'],
		platform	: 'node',
		format		: 'cjs',	// Node.js の仕様
	});
	if (watch) await ctx.watch(); else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}
