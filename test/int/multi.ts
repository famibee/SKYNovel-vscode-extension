/// <reference types="mocha" />
/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * **マルチルート（プロジェクト2つ）** の統合テスト。§3.8 (A)。
 *
 * `WatchFile.#updPathJson` と `encIfNeeded` は **`PrjCmn`（ワークスペース
 * フォルダ＝プロジェクトごとに1個）のインスタンスフィールド**（2026-09-13
 * 修正・旧実装は static で後勝ちだった）。`Project` を2つ開いても、
 * 片方のファイル変更が他方の path.json を作り直すことはない。
 *
 * 起動役は `.vscode-test.mjs` の `label: 'multi'` の設定
 */

import assert from 'node:assert';
import {copyFileSync, existsSync, readFileSync} from 'node:fs';
import {extensions, workspace, Uri} from 'vscode';
import {mkFixture} from './mkFixture';
import {normFp} from '../../src/CmnShare';

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

// §3.8 (A)。**A に画像を足したら A の path.json に載る**のが正しい挙動。
it('片方に画像を足すと、そちらの path.json にだけ載る', async ()=> {
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

	assert.ok(inA, 'A に足したのに A の path.json に載っていない');
	assert.ok(! inB, 'B の path.json にまで載っている（後勝ちが再発している）');
});

// src/docs/multiroot.md 不具合4。ルート行の label は常に空文字のため、
// 旧実装は findIndex(label 照合) が必ず -1 を返し、splice(-1, 1) で
// 末尾の1件を誤って消していた（閉じたのと別の行が消える）
it('フォルダを1つ閉じても、閉じたフォルダだけがツリーから消える（不具合4）', async ()=> {
	const exp = <{getWsRootPathWs?: ()=> string[] | undefined}>
		(extensions.getExtension(EXT_ID)?.exports ?? {});

	const c = mkFixture('multi/C');
	const okAdd = workspace.updateWorkspaceFolders(2, 0, {uri: Uri.file(c.ws)});
	if (! okAdd) throw new Error('フォルダの追加に失敗');
	await sleep(4000);

	const before = exp.getWsRootPathWs?.() ?? [];
	console.log(`      3フォルダ時: ${JSON.stringify(before)}`);
	assert.strictEqual(before.length, 3, `3フォルダ開いたはずが${String(before.length)}件`);

	// 先頭（A）を閉じる。旧実装だと末尾（C）が誤って消える
	const okDel = workspace.updateWorkspaceFolders(0, 1);
	if (! okDel) throw new Error('フォルダの削除に失敗');
	await sleep(4000);

	const after = exp.getWsRootPathWs?.() ?? [];
	console.log(`      A を閉じた後: ${JSON.stringify(after)}`);

	const nA = normFp(A), nB = normFp(B), nC = normFp(c.ws);
	assert.strictEqual(after.length, 2, `A を閉じたのに${String(after.length)}件残っている`);
	assert.ok(! after.includes(nA), 'A を閉じたのにまだツリーに残っている');
	assert.ok(after.includes(nB), 'B が消えている（無関係な行が消された）');
	assert.ok(after.includes(nC), 'C が消えている（末尾が誤って消された＝不具合4の再発）');
});
