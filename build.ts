/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2024 Famibee (famibee.blog38.fc2.com)

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

(async()=> {
	{	// === メイン ===
		const ctx = await context({
			entryPoints	: ['./src/extension'],
			outdir		: 'dist',
			bundle		: true,
			external	: ['vscode', 'node-gyp'],
			platform	: 'node',
		//	treeShaking	: true,		// 省略可
			sourcemap	: true,
		//	minify		: prod,
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
			target	: 'esnext',
			lib: {
				entry	: 'views/setting.ts',
				fileName: _=> 'setting.js',
				formats	: ['es'],
			},
			minify	: prod ?'terser' :false,
			watch,
			outDir		: 'views',
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
			entryPoints	: ['./src/snsys_pre'],
			outdir		: 'dist',
			minify		: true,
			bundle		: true,
			format		: 'esm',
		});
		if (watch) await ctx.watch(); else {
			await ctx.rebuild();
			await ctx.dispose();
		}
	}

	{	// === batch ===
		const ctx = await context({
			entryPoints	: [
				'./src/batch/cnv_mat_pic',
				'./src/batch/cnv_mat_snd',
				'./src/batch/cnv_psd_face',
				'./src/batch/cut_round',
				'./src/batch/subset_font',
			],
			outdir		: 'dist',
			minify		: true,
			format		: 'cjs',	// Node.js の仕様
		});
		if (watch) await ctx.watch(); else {
			await ctx.rebuild();
			await ctx.dispose();
		}
	}

	{	// === lsp-skynovel-server ===
		const ctx = await context({
			entryPoints	: ['./server/src/LangSrv'],
			outdir		: 'dist',
			bundle		: true,
			platform	: 'node',
			minify		: true,
			format		: 'cjs',	// Node.js の仕様
		});
		if (watch) await ctx.watch(); else {
			await ctx.rebuild();
			await ctx.dispose();
		}
	}

})();
