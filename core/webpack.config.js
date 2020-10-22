module.exports = {
	entry: './core/src/extension',	// 「./」は必要
	target: 'node',
	resolve: {extensions: ['.ts', '.js'],},
	module: {rules: [{test: /\.ts$/, loader: 'ts-loader'},],},
	output: {
		path: process.cwd(),
		filename: 'extension.js',
		libraryTarget: 'umd',
		devtoolModuleFilenameTemplate: '../[resource-path]',
	},
	cache: {
		type: 'filesystem',
		buildDependencies: {config: [__filename]},
	},
	externals: {
	  vscode: 'umd vscode',	// the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
	},
};
