import js from '@eslint/js';
import {defineConfig, globalIgnores} from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig([
// ]);const a = ([	// 一時的 OFF 用
	globalIgnores([
		'eslint.config.mts',	// このファイル自身はチェックせず
		'src/webpack.config.js',
	]),
	js.configs.recommended,

	tseslint.configs.strictTypeChecked,		// バグも検出できる、より独自のルールを含むスーパーセット
	tseslint.configs.stylisticTypeChecked, {// バグを大幅に検出したりロジックを変更したりすることなく、一貫したスタイルを適用する追加ルール。

	// 型情報を使ったリンティング
	// tseslint.configs.recommendedTypeChecked, {
		languageOptions: {
			parserOptions: {
				projectService: true,
				// project: './tsconfig.eslint.json',	// なくてもいい？
				tsconfigRootDir: import.meta.dirname,
			},
		},
		// ignores: ['eslint.config.mts'],	// このファイル自身はチェックせず
			// 上の globalIgnores があればいらないみたい
	},
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		plugins: {
			js,
			import: importPlugin,
			'@typescript-eslint': tseslint.plugin,
		},
		extends: [
			'js/recommended',
		],
		languageOptions: {
			globals: {
				// ...globals.browser,	// Webブラウザ(Client)環境の場合
				...globals.node,	// Node.js(Server)環境の場合
				NodeJS : true,
			},
		},
		rules: {
			// 未使用変数チェックの回避 _
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['error', {
				'args': 'all',
				'argsIgnorePattern': '^_',
				'caughtErrors': 'all',
				'caughtErrorsIgnorePattern': '^_',
				'destructuredArrayIgnorePattern': '^_',
				'varsIgnorePattern': '^_',
				'ignoreRestSiblings': true
			}],
			'no-extra-semi': 'warn',	// セミコロン ; の重複
			'quotes': ['warn', 'single'],
			// awaitを忘れないように
			'@typescript-eslint/no-floating-promises': ['error', {
				ignoreIIFE: true,	// IIFEでは怒られないように
			}],
			// async/awaitを使うべきではない書き方を怒ってくれる
			'@typescript-eslint/no-misused-promises': 'error',

			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/consistent-indexed-object-style': ['error', 'index-signature'],
			// 'no-empty-function': 'off',
			// '@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'no-throw-literal': 'off',
			'@typescript-eslint/only-throw-error': 'off',
			'@typescript-eslint/consistent-type-assertions': ['error', {
				arrayLiteralTypeAssertions: 'allow',
				assertionStyle: 'angle-bracket',
				objectLiteralTypeAssertions: 'allow',
			}],
		},
	},
	{
		files: ['views/store/*.ts'],
		languageOptions: {
			globals: {
				window	: true
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
]);
