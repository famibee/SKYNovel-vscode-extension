/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const watch = aCmd.includes('--watch') ?{} :null;
const prod = aCmd.includes('--production');
const node_env = prod ?'production' :'development';

import {build} from 'vite';
import vue from '@vitejs/plugin-vue';
//console.log(`fn:build.ts __dirname:${__dirname}:`);	// src
import {context} from 'esbuild';

const oBuild = {
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
build({
	define: {'process.env.NODE_ENV': JSON.stringify(node_env)},
	build: {
		...oBuild,
		lib: {
			entry	: 'views/setting.ts',
			fileName: _=> 'setting.js',
			formats	: ['es'],
		},
		minify	: prod ?'terser' :false,
		watch,
		emptyOutDir	: false,
		reportCompressedSize	: false,
	},
	plugins: [vue()],
	optimizeDeps: {
		entries	: ['views/setting.htm'],
		include	: [
			'views/lib/bootstrap.bundle.min.js',
			'views/lib/fontawesome/all.min.js',
		],
	},
//	assetsInclude: ['lib/ * * / *.woff2'],
});

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
