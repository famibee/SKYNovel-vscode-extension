/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * `.vscode-test.mjs`（@vscode/test-cli の設定）から呼ぶ準備処理。
 *
 * 設定ファイルは素の JS なので、TypeScript で書いたフィクスチャ生成や
 * ウィンドウ隠しをここから提供する（esbuild で `test/prep.mjs` に出す）。
 *
 * ⚠️ **@vscode/test-cli 本体には手を入れない。** 公式のランナーに寄せるのが
 * 移行の目的なので、足りない分（フィクスチャ・実 VSCode の指定・
 * リポジトリ外の user-data-dir・フォーカス対策）だけをここで補う
 */

import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {mkFixture, mkMultiFixture} from './int/mkFixture';
import {hideSoon} from './hideWin';

/** 既にある VSCode を使う（無ければ undefined → test-cli が自動ダウンロード） */
const A_VSC = [
	'/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
	'C:/Program Files/Microsoft VS Code/Code.exe',
	'/usr/share/code/code',
];

export function prepare() {
	// ⚠️ **VSCode の拡張機能ホストの中（統合ターミナル・Claude Code 拡張機能など）から
	// 起動されると `ELECTRON_RUN_AS_NODE=1` を受け継ぐ。** そのままだと VSCode が
	// 素の Node として起動し、開くはずのフォルダを**スクリプトとして実行**しようとして
	// `Cannot find module '<フィクスチャ>'` で落ちる。素のターミナルでは起きない
	// eslint-disable-next-line no-process-env
	delete process.env.ELECTRON_RUN_AS_NODE;

	const fx = mkFixture('main');
	hideSoon();		// 起動直後に隠す（画面を操作しないテストなので影響なし）

	const dir = `${tmpdir()}/sn_ext_test`;
	return {
		ws		: fx.ws,
		fromPath: A_VSC.find(fp=> existsSync(fp)),
		// ⚠️ 既定では `.vscode-test/` が**リポジトリ内**に作られる。
		// 一度これで 140 ファイルを vsix に混入させたので、必ず一時フォルダへ
		launchArgs	: [
			'--disable-extensions',		// 他の拡張機能の影響を除く
			'--disable-workspace-trust',
			'--user-data-dir', `${dir}/_user-data`,
			'--extensions-dir', `${dir}/_extensions`,
		],
	};
}

/** マルチルート（§3.8 (A) 再現）用。`.code-workspace` のパスを返す */
export function prepareMulti(): string {return mkMultiFixture().file}
