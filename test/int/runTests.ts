/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * 統合テストの起動役。**実際の VSCode を拡張機能付きで立ち上げる**。
 *
 * - `bun run test:int` から呼ぶ
 * - **ローカルにインストール済みの VSCode を使う**（`vscodeExecutablePath`）。
 *   指定しないと @vscode/test-electron が VSCode 本体（約150MB）を
 *   毎回ダウンロードしようとする
 * - ⚠️ macOS には xvfb が無いので**ウィンドウが出る**（ヘッドレス不可）。
 *   実行中はフォーカスを取られる
 * - 開くのは一時フォルダのフィクスチャだけ（test/int/mkFixture.ts）。
 *   利用者の実プロジェクトには触らない
 */

import {runTests} from '@vscode/test-electron';
import {mkFixture} from './mkFixture';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';

// 既にある VSCode を使う（無ければ undefined を渡して自動ダウンロードに任せる）
const A_VSC = [
	'/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
	'C:/Program Files/Microsoft VS Code/Code.exe',
	'/usr/share/code/code',
];
const vscodeExecutablePath = A_VSC.find(fp=> existsSync(fp));

const extensionDevelopmentPath = resolve(import.meta.dirname, '../..');
const extensionTestsPath = resolve(import.meta.dirname, 'suite.js');

const fx = mkFixture('main');

try {
	console.log(`fn:runTests.ts VSCode=${vscodeExecutablePath ?? '(自動DL)'}`);
	console.log(`fn:runTests.ts フィクスチャ=${fx.ws}`);
	await runTests({
		vscodeExecutablePath,
		extensionDevelopmentPath,
		extensionTestsPath,
		launchArgs: [
			fx.ws,						// このフォルダを開く
			'--disable-extensions',		// 他の拡張機能の影響を除く
			'--disable-workspace-trust',
			// リポジトリ内に置くと vsix に同梱されてしまうので一時フォルダへ。
			// extensions-dir も指定しないと .vscode-test/extensions/ が
			// リポジトリ内に作られる（既定値がそこ）
			'--user-data-dir', `${tmpdir()}/sn_ext_test/_user-data`,
			'--extensions-dir', `${tmpdir()}/sn_ext_test/_extensions`,
		],
	});
}
catch (e: unknown) {
	console.error('統合テスト失敗 %o', e);
	process.exit(1);
}
