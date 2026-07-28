/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * テスト用に起動した VSCode にフォーカスを奪われないようにする（macOS のみ）。
 *
 * VSCode に「起動しても前面に出ない」フラグは**無い**。GUI アプリを spawn すれば
 * macOS は必ずそれをアクティブにする。そこで**起動直後に隠す**。
 *
 * - 統合テスト（test/int/）… `vscode` API を叩くだけで画面を操作しないので安全。
 *   拡張機能ホストは Node プロセスなので、レンダラのバックグラウンド抑制
 *   （タイマー間引き）も受けない。実測でも所要時間は変わらなかった
 * - UI テスト（test/ui/）… Playwright は CDP で入力を注入するので、
 *   OS のフォーカスは要らない。**隠したままでも 6/6 通ることを実測済み**
 *   （コマンドパレット・ツリーのクリック・webview の読み取りまで動く）
 */

import {execFile, execFileSync} from 'node:child_process';

/**
 * VSCode のプロセス（GUI 本体）の PID 一覧。
 *
 * ⚠️ AppleScript の `whose name is in {…}` は -1700 エラーになるので使わない
 * （一度これで「対象なし」と誤判定した）。`pgrep` で素直に見る。
 * 開発機の VSCode 本体は `…/MacOS/Code`、
 * `--extensionDevelopmentPath` で起動したテスト用は `…/MacOS/Electron`
 */
function pids(): Set<string> {
	try {
		return new Set(execFileSync('pgrep',
			['-f', 'Visual Studio Code.app/Contents/MacOS/Electron'], {encoding: 'utf8'})
			.split('\n').map(v=> v.trim()).filter(v=> v !== ''));
	}
	catch {return new Set}		// 1件も無いと pgrep は終了コード1
}

/**
 * 呼んだ時点の PID を覚え、`ms` 後に**増えていたものだけ**を隠す。
 *
 * ⚠️ ウィンドウタイトルでは見分けられない。統合テストのフィクスチャは
 * フォルダ名が `main` で、`sn_ext_test` はその親なのでタイトルに出ない
 */
export function hideSoon(ms = 6000, nRetry = 6) {
	if (process.platform !== 'darwin') return;

	// ⚠️ 呼ばれてから VSCode が立つまでの時間は、起動役によって違う
	// （@vscode/test-cli は設定を読んでから起動するので遅い）。
	// **見つかるまで数回試す**。一度きりだと空振りする
	const before = pids();
	let n = 0;
	const tick = ()=> {
		const add = [...pids()].filter(p=> ! before.has(p));
		if (add.length === 0) {
			if (++n >= nRetry) {console.log('fn:hideWin.ts 隠す対象なし'); return}
			setTimeout(tick, 2000);
			return;
		}

		const as = add.map(p=>
			`try
	set visible of (first process whose unix id is ${p}) to false
end try`).join('\n');
		execFile('osascript', ['-e', `tell application "System Events"\n${as}\nend tell`],
			e=> console.log(`fn:hideWin.ts テスト窓を隠した pid=${add.join(',')}${
				e ?` （失敗 ${e.message}）` :''}`));
	};
	setTimeout(tick, ms);
}
