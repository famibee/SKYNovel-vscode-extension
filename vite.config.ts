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
	resolve: {
		alias: {
			'@'	: './lib',	// いまは効いてない
		},
	},
	plugins	: [vue()],
	server	: {open: '/setting.htm'},
})