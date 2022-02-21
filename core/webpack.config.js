module.exports = {
	entry: './core/src/extension',	// 「./」は必要
	target: 'node',
	resolve: {extensions: ['.ts', '.js'],},
	module: {
		rules: [
			{test: /\.ts$/,
				exclude: /node_modules/,
				use: [{
					loader: 'thread-loader',
					options: {
						workers: 2,
						workerParallelJobs: 80,
						workerNodeArgs: ['--max-old-space-size=512'],
						name: 'ts-loader-pool',
					},
				}, {
					loader: 'esbuild-loader',
					options: {
						loader: 'ts',
						target: 'es2021',
					},
				}],
			},
			{test: /\.cs$/, loader: 'file-loader'},
		],
		exprContextCritical: false,
	},
	mode: 'development',
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
	devtool: 'nosources-source-map',
	externals: {
		vscode: 'umd vscode',	// the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
//		sharp: 'commonjs sharp',
	},
//	stats: {
//		errorDetails: true, // --display-error-details
//	}
};
