import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from 'path';

export default defineConfig({
	root	: './views/',
	build: {
		rollupOptions: {
			input: {
				setting: resolve(__dirname, 'setting.htm'),
			},
		},
	},
	plugins	: [vue()],
	optimizeDeps: {
		entries: ['/setting.htm'],
		include: ['./lib/bootstrap.min.js', './lib/fontawesome/all.min.js'],
	},
//	assetsInclude: ['./lib/**/*.woff2'],

	server	: {open: '/setting.htm'},
})
