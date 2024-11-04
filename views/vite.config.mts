import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from 'node:path';

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				setting: resolve(__dirname, 'setting.htm'),
			},
		},
	},
	plugins	: [vue()],
	optimizeDeps: {
		entries: ['views/setting.htm'],
		include: [
			'lib/bootstrap.bundle.min.js',
			'lib/fontawesome/all.min.js',
		],
	},
//	assetsInclude: ['./lib/**/*.woff2'],

	server	: {open: 'views/setting.htm'},
})
