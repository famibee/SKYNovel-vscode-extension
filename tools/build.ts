/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const watch = aCmd.includes('--watch') ?{} :null;

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

{	// === webview の素のスクリプト ===
	// views/*.ts を同名の views/*.js に出力する。html は
	// 【<script defer src="./folder.js">】と相対参照していて、views/ 自体が
	// webview の localResourceRoots なので、出力先を変えると html も直す必要がある。
	// bundle+iife にしているのは、グローバルスコープを汚さないため（ファイル間で
	// const vscode が衝突する）と、型定義を src/types.ts と共有するため
	const ctx = await context({
		...oBuild,
		entryPoints	: [
			'./views/folder.ts',
			'./views/tmpwiz.ts',
			'./views/toolbox.ts',
			'./views/score.ts',
		],
		outdir		: 'views',
		platform	: 'browser',
		format		: 'iife',
		sourcemap	: false,	// webview で配信するので付けない
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
			'./src/batch/cnv_psd_face',
			'./src/batch/cut_round',
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

{	// === @vscode/test-cli の設定（.vscode-test.mjs）から呼ぶ準備処理 ===
	// 設定ファイルは素の JS なので、TS 側の処理をここから .mjs で提供する
	const ctx = await context({
		...oBuild,
		entryPoints	: ['./test/prep'],
		outdir		: 'test',
		outExtension: {'.js': '.mjs'},
		platform	: 'node',
		format		: 'esm',
		minify		: false,
	});
	if (watch) await ctx.watch(); else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

{	// === 統合テスト本体（VSCode の拡張機能ホスト内で走る） ===
	// @vscode/test-cli が Mocha で読み込むので cjs で出す。
	// vscode は実行時に注入されるので external
	const ctx = await context({
		...oBuild,
		entryPoints	: ['./test/int/suite', './test/int/multi'],
		outdir		: 'test/int',
		external	: ['vscode'],
		platform	: 'node',
		format		: 'cjs',
		minify		: false,	// 失敗時に読むので
	});
	if (watch) await ctx.watch(); else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

{	// === UI テスト（Playwright で VSCode を外から操作する） ===
	// ⚠️ **bun では動かない**（Playwright の Electron 起動が 45秒でタイムアウトする。
	// node なら約2.8秒で起動する）。そのため esbuild で .mjs に出して node で走らせる。
	// import.meta.dirname を使うので format は esm
	const ctx = await context({
		...oBuild,
		entryPoints	: ['./test/ui/runUI'],
		outdir		: 'test/ui',
		outExtension: {'.js': '.mjs'},
		external	: ['playwright-core'],
		platform	: 'node',
		format		: 'esm',
		minify		: false,	// 失敗時に読むので
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
