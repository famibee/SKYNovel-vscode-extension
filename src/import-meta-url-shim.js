/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// esbuild が format:'cjs' で出力する際、import.meta.url を実体化できず
// 空オブジェクト {} に置き換えてしまう問題への対処。
// (npm-check-updates 等、ESM専用パッケージが内部で
//  `const require = createRequire(import.meta.url)` を使っており、
//  対策しないと `createRequire(undefined)` で例外になる)
//
// build.ts 側の define:{'import.meta.url': 'import_meta_url'} と対で使う。
//
// 注意: バンドル全体で単一の __filename (= 出力後の dist/extension.js) を
// 指す値になるため、各モジュール本来の実ファイルパスとは一致しない。
// ただし対象コードでの用途は Node.js 組み込みモジュール
// （'fs','path','url','net' など）の require のみであることを確認済みで、
// 組み込みモジュール解決はパスに依存しないため実害はない。
// もし将来、相対パス解決を伴う createRequire(import.meta.url) 依存を
// 別途bundleする場合は、この shim では不十分になるので external 化を検討すること。
export const import_meta_url = require('node:url').pathToFileURL(__filename).href;
