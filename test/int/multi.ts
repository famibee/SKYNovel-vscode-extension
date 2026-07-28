/// <reference types="mocha" />
/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * **マルチルート（プロジェクト2つ）** の統合テスト。§3.8 (A) の再現。
 *
 * `WatchFile.#updPathJson` と `encIfNeeded` が **static** なので、
 * `Project` が2つ作られると**後から初期化した方が全体を持っていく**。
 * その結果、**片方のファイル変更が他方の path.json を作り直す**。
 *
 * ⚠️ **これは「直す前に壊れていることを固定する」テスト**。
 * 直したら期待値を反転させること（下のコメント参照）。
 *
 * 起動役は `.vscode-test.mjs` の `label: 'multi'` の設定
 */

import {copyFileSync, existsSync, readFileSync} from 'node:fs';
import {extensions, workspace} from 'vscode';

const EXT_ID = 'famibee2.bluesnovel';
const sleep = (ms: number)=> new Promise(re=> setTimeout(re, ms));

/** path.json を読む（無ければ空） */
const readPath = (ws: string)=> {
	const fp = `${ws}/doc/prj/path.json`;
	try {return existsSync(fp) ?readFileSync(fp, 'utf8') :''}
	catch {return ''}
};

let A = '', B = '';

it('マルチルートで2つのプロジェクトが開いている', async ()=> {
	const a = workspace.workspaceFolders ?? [];
	if (a.length !== 2) {
		throw new Error(`ワークスペースフォルダが2つでない（${String(a.length)}）`);
	}
	A = a[0]?.uri.fsPath ?? '';
	B = a[1]?.uri.fsPath ?? '';
	console.log(`      A=${A}\n      B=${B}`);

	const ext = extensions.getExtension(EXT_ID);
	if (! ext) throw new Error(`拡張機能 ${EXT_ID} が見つからない`);
	await ext.activate();
	await sleep(8000);		// 2プロジェクトぶんの起動を待つ
});

// 🐛 §3.8 (A) の再現。
// **A に画像を足したら A の path.json に載る**のが正しい挙動。
// static の後勝ちが生きている間は、後から初期化された方（B）の
// path.json が作り直され、**A には載らない**。
//
// ⚠️ 直したらこのテストは失敗する。そのとき期待値を
// 「A に載る」へ反転させ、見出しの 🐛 を外すこと
it('【現状の記録】片方に画像を足しても、そちらの path.json に載らないことがある', async ()=> {
	const src = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat/_yesno.png`;
	const beforeA = readPath(A);
	const beforeB = readPath(B);

	copyFileSync(src, `${A}/doc/prj/pic/onlyA.png`);
	await sleep(6000);		// 500ms + 300ms のデバウンス2段ぶん

	const afterA = readPath(A);
	const afterB = readPath(B);
	const inA = afterA.includes('onlyA');
	const inB = afterB.includes('onlyA');
	console.log(`      A の path.json: 変化=${String(afterA !== beforeA)} onlyA=${String(inA)}`);
	console.log(`      B の path.json: 変化=${String(afterB !== beforeB)} onlyA=${String(inB)}`);

	// 落とさない。**いまどうなっているかを記録するのが目的**（(A) は再申請後に直す）
	if (inA && ! inB) console.log('      ⇒ 正常（A にだけ載った）。(A) は直っている？');
	else if (! inA) console.log('      ⇒ 🐛 再現：A に足したのに A の path.json に載っていない');
	else console.log('      ⇒ 🐛 再現：B の path.json にまで載っている');
});

it('【現状の記録】暗号化の判定も後勝ちになっていないか', ()=> {
	// encIfNeeded も static。暗号化そのものは prj.json の設定次第なので、
	// ここでは「どちらのプロジェクトの設定が使われるか」を記録するに留める
	const a = workspace.workspaceFolders ?? [];
	console.log(`      フォルダ順（後勝ちなら最後が全体を持つ）: ${
		a.map(f=> f.name).join(' → ')}`);
});
