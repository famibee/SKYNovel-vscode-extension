module.exports = {
	entry: './src/extension',	// 「./」は必要
	target: 'node',
	resolve: {extensions: ['.ts', '...'],},
	module: {
		rules: [
			{test: /\.ts$/, loader: 'ts-loader', options: {
				onlyCompileBundledFiles: true,	// tsconfig.json の include 全体ではなく、実際にバンドルするファイルのみコンパイル
				reportFiles: ['src/**/*.ts'],	// 型エラーの報告も src/ のみに限定
					// server/src/*.ts は import type 経由で TS のプログラムに入るが、
					// 緩い設定の server/tsconfig.json で書かれており（そちらでは型エラー0）、
					// ここの厳しい設定（strict + noUncheckedIndexedAccess）を当てると
					// 100件超のエラーになる。views/ も vite 側でビルドされるもので対象外
			}},
			{test: /\.cs$/, loader: 'file-loader'},
		],
		exprContextCritical: false,
	},
	mode: 'development',
	// mode: 'production',
	output: {
		filename: 'extension.js',
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: '../[resource-path]',
	},
	cache: {
		type: 'filesystem',
		buildDependencies: {config: [__filename]},
	},
	devtool: 'nosources-source-map',
	externals: {
		vscode: 'commonjs vscode',	// the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
	},
//	stats: {
//		errorDetails: true, // --display-error-details
//	}
};
