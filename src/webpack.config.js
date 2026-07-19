module.exports = {
	entry: './src/extension',	// 「./」は必要
	target: 'node',
	resolve: {extensions: ['.ts', '...'],},
	module: {
		rules: [
			{test: /\.ts$/, loader: 'ts-loader', options: {compiler: '@typescript/old'}},	// typescript@7 は Compiler API(sys 等)やlib.*.d.tsを持たないため、フルセットのクラシックAPI(typescript@6系)である @typescript/old を使う
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
