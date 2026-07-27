/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * VSCode の拡張機能ホストの**内側**で走るテスト本体。
 * `vscode` API がそのまま使えるので、「人が操作したときに何が起きるか」を
 * 直接確かめられる。
 *
 * test/int/runTests.ts が VSCode を起動し、このファイルの run() を呼ぶ。
 * 依存を増やさないため mocha は使わず、最小の it() を自前で持つ
 */

import {copyFileSync, readFileSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {extensions, Uri, workspace, WorkspaceEdit} from 'vscode';

type T_EXT_API = {
	getTraceCnt	: ()=> {[key: string]: number};
	clearTrace	: ()=> void;
};

const EXT_ID = 'famibee2.skynovel2';
const sleep = (ms: number)=> new Promise(re=> setTimeout(re, ms));

const aCase: {nm: string, fnc: ()=> Promise<void>}[] = [];
const it = (nm: string, fnc: ()=> Promise<void>)=> {aCase.push({nm, fnc})};
function ge(got: number, want: number, mes: string) {
	if (got < want) throw new Error(`${mes}: ${String(want)} 以上を期待 / 実際 ${String(got)}`);
}
function eq(got: unknown, want: unknown, mes: string) {
	const g = JSON.stringify(got), w = JSON.stringify(want);
	if (g !== w) throw new Error(`${mes}: 期待 ${w} / 実際 ${g}`);
}


// === ここからテスト ===

let api: T_EXT_API;

it('拡張機能が起動し、テスト用の入口を公開している', async ()=> {
	const ext = extensions.getExtension(EXT_ID);
	if (! ext) throw new Error(`拡張機能 ${EXT_ID} が見つからない`);
	api = <T_EXT_API>await ext.activate();
	if (typeof api.getTraceCnt !== 'function') {
		throw new Error('activate() が getTraceCnt を返していない');
	}
});

it('画像を数枚まとめて追加しても、全走査は1回にまとまる', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');

	// 起動直後の走査が落ち着くのを待ってから計数を 0 に
	await sleep(4000);
	api.clearTrace();

	// 3枚を一度に置く（Finder から1回のドラッグで落とすのに相当）
	// 開発モードなので extensionPath はリポジトリのルート
	const src = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat/_yesno.png`;
	for (const i of [1, 2, 3]) {
		copyFileSync(src, `${ws}/doc/prj/pic/test_${String(i)}.png`);
	}

	// path.json の 500ms ＋ need_go の 300ms のデバウンス2段ぶん待つ
	await sleep(4000);

	const h = api.getTraceCnt();
	console.log(`  trace: ${JSON.stringify(h)}`);
	eq(h['need_go.send'] ?? 0, 1, 'need_go の送信回数');
	eq(h.go ?? 0, 1, '全走査（go）の回数');
});


// 画像と音声を同時に置くと、監視インスタンスが別（WfbOptPic / WfbOptSnd）なので
// 500ms デバウンス（#tiLasyPathJson はインスタンスフィールド）が2本走る。
// つまり updPathJson() が2回走り、そこを #sendNeedGo() の 300ms がまとめる
it('画像と音声を同時に追加すると updPathJson は2回・全走査は1回', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');
	const ext = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat`;

	await sleep(2500);
	api.clearTrace();

	copyFileSync(`${ext}/_yesno.png`, `${ws}/doc/prj/pic/mix.png`);
	copyFileSync(`${ext}/wood04.mp3`, `${ws}/doc/prj/sound/mix.mp3`);

	await sleep(4000);

	const h = api.getTraceCnt();
	console.log(`  trace: ${JSON.stringify(h)}`);
	ge(h['need_go.req'] ?? 0, 2, 'updPathJson 由来の要求回数（監視ごとに別デバウンス）');
	eq(h['need_go.send'] ?? 0, 1, 'need_go の送信回数（300ms がまとめる）');
});

// 上のテストが「監視が動いていないから1回」ではないことを示す対照実験。
// これが失敗するなら、上のテストは正しく測れていない
it('【対照】1枚ずつ間隔をあけて追加すると、走査は複数回になる', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');
	const src = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat/_yesno.png`;

	await sleep(2000);
	api.clearTrace();

	for (const i of [4, 5]) {
		copyFileSync(src, `${ws}/doc/prj/pic/ctrl_${String(i)}.png`);
		await sleep(2500);	// 500ms + 300ms のデバウンスを跨ぐ間隔
	}
	await sleep(1500);

	const h = api.getTraceCnt();
	console.log(`  trace: ${JSON.stringify(h)}`);
	ge(h['need_go.send'] ?? 0, 2, 'need_go の送信回数（まとまらないはず）');
});


// 変名は WatchFile #onDidRenameFiles が del + cre に分解して購読者へ流すが、
// lasyPathJson() は「監視の CRE/DEL ハンドラ」側にある。
// つまり変名で path.json が再生成されるのか（＝need_go が飛ぶのか）を確かめる
it('【調査】ファイル変名で path.json 再生成と全走査は起きるか', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');
	const ext = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat`;

	// 対象を1つ置いて落ち着かせる
	copyFileSync(`${ext}/_yesno.png`, `${ws}/doc/prj/pic/ren_before.png`);
	await sleep(4000);
	api.clearTrace();

	// (1) workspace.fs.rename … ファイルシステム操作
	await workspace.fs.rename(
		Uri.file(`${ws}/doc/prj/pic/ren_before.png`),
		Uri.file(`${ws}/doc/prj/pic/ren_after.png`),
		{overwrite: true},
	);
	await sleep(4000);
	console.log(`  (1) workspace.fs.rename : ${JSON.stringify(api.getTraceCnt())}`);

	// (2) WorkspaceEdit.renameFile … エディタ主導（onDidRenameFiles が発火する経路）
	api.clearTrace();
	const we = new WorkspaceEdit();
	we.renameFile(
		Uri.file(`${ws}/doc/prj/pic/ren_after.png`),
		Uri.file(`${ws}/doc/prj/pic/ren_edit.png`),
		{overwrite: true},
	);
	await workspace.applyEdit(we);
	await sleep(4000);
	console.log(`  (2) WorkspaceEdit.rename: ${JSON.stringify(api.getTraceCnt())}`);
	// 仕様確認が目的なので落とさない（結果を記録するだけ）
});


// 「エクスプローラー操作」と「外部（fs）操作」で発火イベントが違うのでは、という
// 疑いの検証。操作方法ごとに、どの監視イベントが飛ぶかを表にする。
// ⚠️ 落とさない（仕様を記録するのが目的）。VSCode の版で変わりうる
it('【調査】操作方法ごとの発火イベント一覧', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');
	const ext = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat`;
	const pic = `${ws}/doc/prj/pic`;
	const src = readFileSync(`${ext}/_yesno.png`);

	const aRow: [string, string][] = [];
	async function step(nm: string, fnc: ()=> Promise<void>) {
		api.clearTrace();
		await fnc();
		await sleep(3500);
		const h = api.getTraceCnt();
		const w = Object.entries(h)
			.filter(([k])=> k.startsWith('watch.'))
			.map(([k, v])=> `${k.slice(6)}:${String(v)}`).join(' ') || '(なし)';
		aRow.push([nm, `${w}  → go:${String(h.go ?? 0)}`]);
	}

	await sleep(3000);

	// --- 外部操作（Node の fs。fs-extra も同じ）---
	await step('外部 追加 (writeFileSync)', async ()=> {
		writeFileSync(`${pic}/m1.png`, src); await Promise.resolve();
	});
	await step('外部 変更 (writeFileSync 上書き)', async ()=> {
		writeFileSync(`${pic}/m1.png`, src); await Promise.resolve();
	});
	await step('外部 変名 (renameSync)', async ()=> {
		renameSync(`${pic}/m1.png`, `${pic}/m2.png`); await Promise.resolve();
	});
	await step('外部 削除 (unlinkSync)', async ()=> {
		unlinkSync(`${pic}/m2.png`); await Promise.resolve();
	});

	// --- VSCode の workspace.fs ---
	await step('VSCode 追加 (workspace.fs.writeFile)', async ()=> {
		await workspace.fs.writeFile(Uri.file(`${pic}/v1.png`), src);
	});
	await step('VSCode 変名 (workspace.fs.rename)', async ()=> {
		await workspace.fs.rename(Uri.file(`${pic}/v1.png`), Uri.file(`${pic}/v2.png`), {overwrite: true});
	});
	await step('VSCode 削除 (workspace.fs.delete)', async ()=> {
		await workspace.fs.delete(Uri.file(`${pic}/v2.png`));
	});

	// --- エディタ主導（WorkspaceEdit。エクスプローラーの操作はこの経路）---
	await step('エディタ 変名 (WorkspaceEdit.renameFile)', async ()=> {
		writeFileSync(`${pic}/e1.png`, src);
		await sleep(2500);
		api.clearTrace();
		const we = new WorkspaceEdit();
		we.renameFile(Uri.file(`${pic}/e1.png`), Uri.file(`${pic}/e2.png`), {overwrite: true});
		await workspace.applyEdit(we);
	});
	await step('エディタ 削除 (WorkspaceEdit.deleteFile)', async ()=> {
		const we = new WorkspaceEdit();
		we.deleteFile(Uri.file(`${pic}/e2.png`));
		await workspace.applyEdit(we);
	});

	console.log('  ── 操作方法ごとの発火イベント ──');
	for (const [nm, v] of aRow) console.log(`    ${nm.padEnd(38)} ${v}`);
});


// (F) path.json が変わらない追加では、LSP の全再パースを起こさない
it('path.json が変わらない変更では全走査しない', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');

	await sleep(3000);
	api.clearTrace();

	// WfbOptFont が見る拡張子（updPathJson=true）だが、内容だけの上書き。
	// 既にある setting.sn を書き換える → 存在は変わらないので path.json も同一
	writeFileSync(`${ws}/doc/prj/script/setting.sn`,
		`[title text="テスト${String(Date.now())}"]\n`);
	await sleep(4000);

	const h = api.getTraceCnt();
	console.log(`  trace: ${JSON.stringify(h)}`);
	// 内容変更なので CRE/DEL は飛ばない＝そもそも updPathJson が走らない想定
	eq(h.go ?? 0, 0, '内容だけの変更での全走査');
});

// (F) の短絡が実際に効く例：追加してすぐ消すと、500ms のデバウンスで
// updPathJson は1回だけ走り、その時点の path.json は元と同一になる
it('追加してすぐ消すと path.json は同一で、全走査しない', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');
	const ext = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat`;

	await sleep(3000);
	api.clearTrace();

	const fp = `${ws}/doc/prj/pic/blink.png`;
	copyFileSync(`${ext}/_yesno.png`, fp);
	await sleep(150);		// 500ms のデバウンス内に消す
	unlinkSync(fp);
	await sleep(4000);

	const h = api.getTraceCnt();
	console.log(`  trace: ${JSON.stringify(h)}`);
	eq(h['path.json.同一'] ?? 0, 1, 'path.json が同一と判定された回数');
	eq(h.go ?? 0, 0, '全走査の回数（短絡が効いていれば0）');
});


// === 実行 ===

export async function run(): Promise<void> {
	let ng = 0;
	for (const {nm, fnc} of aCase) {
		try {await fnc(); console.log(`  ok  ${nm}`)}
		catch (e: unknown) {
			++ng;
			console.error(`  NG  ${nm}\n      ${e instanceof Error ? e.message : String(e)}`);
		}
	}
	console.log(`\n${String(aCase.length -ng)} / ${String(aCase.length)} 件成功`);
	if (ng > 0) throw new Error(`${String(ng)} 件失敗`);
}
