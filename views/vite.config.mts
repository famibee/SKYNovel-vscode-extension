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
