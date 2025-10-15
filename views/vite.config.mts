/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from 'node:path';

export default defineConfig({
	root: 'views',
	base: './',		// 必要
	build: {
		outDir: '../dist',
		rollupOptions: {
			input: {
				setting: resolve(__dirname, 'setting.html'),
			},
			output: {
				entryFileNames: 'assets/setting.js',
				// chunkFileNames: 'assets/setting.js',
				assetFileNames: 'assets/setting.[ext]',
			},
		},
		emptyOutDir: false,
		// emptyOutDir: true,	// dist 下をクリア
	},
	plugins	: [vue()],
	optimizeDeps: {
		entries: ['setting.html'],
		include: [
			'lib/bootstrap.bundle.min.js',
			'lib/fontawesome/all.min.js',
		],
	},
//	assetsInclude: ['./lib/**/*.woff2'],

	server	: {open: 'setting.html'},
})
