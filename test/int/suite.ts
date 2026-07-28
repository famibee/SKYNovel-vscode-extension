/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/// <reference types="mocha" />
/**
 * VSCode の拡張機能ホストの**内側**で走るテスト本体。
 * `vscode` API がそのまま使えるので、「人が操作したときに何が起きるか」を
 * 直接確かめられる。
 *
 * 起動役は @vscode/test-cli（設定は リポジトリ直下の .vscode-test.mjs）。
 * **`it()` は Mocha のもの**。以前は自前の最小 it() を持っていたが、
 * 公式ランナーへ移行した（TODO §4.5）
 */

import {copyFileSync, readFileSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {extensions, Uri, workspace, WorkspaceEdit} from 'vscode';

type T_EXT_API = {
	getTraceCnt	: ()=> {[key: string]: number};
	getTraceMs	: ()=> {[key: string]: number[]};
	clearTrace	: ()=> void;
};

const EXT_ID = 'famibee2.bluesnovel';	// 旧 skynovel2。ID は復活しないので改名（TODO §3.5）
const sleep = (ms: number)=> new Promise(re=> setTimeout(re, ms));

/**
 * 「LSP に再走査を頼んだ回数」。経路が2つあるので足して見る（§3.7(d)-2）。
 * - `need_go.send` … 本文ごと送る重い経路（スクリプトの追加削除など）
 * - `upd_path.send` … path.json だけ送る軽い経路（画像・音声の追加削除）
 */
const nReq = (h: {[key: string]: number})=>
	(h['need_go.send'] ?? 0) + (h['upd_path.send'] ?? 0);

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

// ⚠️ **他のケースより先に置くこと。** 後続が api.clearTrace() を呼ぶので、
// 起動時の記録はそれまでにしか読めない
it('【調査】起動にかかる時間', async ()=> {
	await sleep(6000);		// 環境確認（pip/node/npm/bun）と LSP の初回走査を待つ
	const h = api.getTraceMs();
	const one = (k: string)=> {
		const a = h[k] ?? [];
		return a.length === 0 ?'(記録なし)' :`${String(a[0])} ms`;
	};
	console.log('  ── 起動（拡張機能のロード開始からの経過）──');
	console.log(`    操作可能まで（ツリー・コマンド登録）  ${one('起動.操作可能まで.ms')}`);
	console.log(`    LSP 準備まで（ホバー・補完が効く）    ${one('起動.LSP準備まで.ms')}`);
	console.log(`    環境確認まで（pip/node/npm/bun）      ${one('起動.環境確認まで.ms')}`);
	if ((h['起動.操作可能まで.ms'] ?? []).length === 0) {
		throw new Error('起動の計測が記録されていない');
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
	eq(nReq(h), 1, '再走査を頼んだ回数');
	eq(h['upd_path.send'] ?? 0, 1, 'うち軽い経路（本文を送らない）');
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
	eq(nReq(h), 1, '再走査を頼んだ回数（300ms がまとめる）');
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
	ge(nReq(h), 2, '再走査を頼んだ回数（まとまらないはず）');
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
		aRow.push([nm, `${w}  → 再走査:${String(nReq(h))}`]);
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
	eq(nReq(h), 0, '内容だけの変更での再走査');
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
	eq(nReq(h), 0, '再走査の回数（短絡が効いていれば0）');
});

// §3.7 の「支配的なのは LSP 側の全再パース」という見立てを実測で確かめる。
// 全走査.ms = 走査依頼から analyze_inf まで（本体の読み取り＋往復＋LSP の再パース）
// scanSrc.ms = そのうち本体がファイルを読んで文字コードを見るまで
// ⚠️ 落とさない（数字を記録するのが目的）。マシン・VSCode の版で変わる
it('【調査】全走査は何 ms か（本体の読み取り vs LSP の再パース）', async ()=> {
	const ws = workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (! ws) throw new Error('ワークスペースが開かれていない');
	const ext = `${extensions.getExtension(EXT_ID)?.extensionPath ?? ''}/test/mat`;

	// ⚠️ フィクスチャは 4ファイル / 674バイトしかない。実プロジェクトは
	// 18〜26ファイル / 220〜260KB（手元の全作品を計測）なので、そのままでは
	// 桁が違って判断に使えない。**実規模のスクリプトを一時的に置いてから測る**
	// ⚠️ ラベル・マクロ名は**ファイル内で重複させない**。同名を繰り返すと
	// ラベル重複／マクロ重複の診断が大量に出て、実プロジェクトではありえない
	// 負荷を測ることになる（一度それで 248ms という数字を出しかけた）
	const aFpTmp: string[] = [];
	for (let i = 0; i < 25; ++i) {
		const a = [
			`[macro name=m_perf${String(i)} nowarn_unused=true]`,
			'[ws buf=VOICE canskip=true stop=false][wq][l]',
			'[endmacro]',
		];
		for (let j = 0; j < 100; ++j) {		// 1ファイル約 9KB
			a.push(
				`*sec${String(j)}`,
				'[grp bg=white time=2000 sys_menu=false b_alpha=0]',
				'　テスト本文です。ここは実プロジェクトと同じくらいの分量にしています。[l][r]',
				'　二行目の本文。タグと地の文が混ざる実際の書かれ方に寄せています。[l][r]',
				`[if exp="const.sn.isDebugger"][jump label=*sec${String(j)}][endif]`,
				'',
			);
		}
		const fp = `${ws}/doc/prj/script/perf${String(i)}.sn`;
		writeFileSync(fp, a.join('\n'));
		aFpTmp.push(fp);
	}
	await sleep(6000);		// 追加ぶんの走査が落ち着くまで
	api.clearTrace();

	// 画像の追加・削除で path.json を実際に変えて、全走査を起こす
	for (let i = 0; i < 4; ++i) {
		const fp = `${ws}/doc/prj/pic/perf${String(i)}.png`;
		copyFileSync(`${ext}/_yesno.png`, fp);
		await sleep(2500);
		unlinkSync(fp);
		await sleep(2500);
	}
	for (const fp of aFpTmp) {try {unlinkSync(fp)} catch { /* 消えていてもよい */ }}

	const hMs = api.getTraceMs();
	const stat = (a: number[] = [])=> a.length === 0
		? '(記録なし)'
		: `${String(a.length)}回  中央値 ${String(a.slice().sort((x, y)=> x -y)[a.length >>1])
			} ms  最小 ${String(Math.min(...a))} / 最大 ${String(Math.max(...a))}`;

	console.log('  ── 全走査の所要時間 ──');
	console.log(`    全走査.ms   ${stat(hMs['全走査.ms'])}`);
	console.log(`    scanSrc.ms  ${stat(hMs['scanSrc.ms'])}`);
	console.log('  ── うち LSP 側の内訳（§3.7(d)-1）──');
	for (const [k, nm] of [
		['S.init.ms',  '状態の作り直し(scanInitAll+updPath)'],
		['S.parse.ms', 'パース(resolveScript)             '],
		['S.scan.ms',  '検証(scanScript)                  '],
		['S.nfd.ms',   'scanNFD                           '],
		['S.diag.ms',  'addDiag                           '],
		['S.job.ms',   '遅延検証(scanEnd 内 aEndingJob)   '],
		['S.end.ms',   'scanEnd の残り(集約・一覧・スニペット)'],
	]) console.log(`    ${nm ?? ''} ${stat(hMs[k ?? ''])}`);

	const a全 = hMs['全走査.ms'] ?? [];
	const aScan = hMs['scanSrc.ms'] ?? [];
	if (a全.length === 0) throw new Error('全走査が一度も起きていない（測れていない）');
	const m全 = a全.reduce((s, v)=> s +v, 0) /a全.length;
	const mScan = aScan.reduce((s, v)=> s +v, 0) /(aScan.length || 1);
	console.log(`    ⇒ 本体の読み取りは全体の ${(mScan /m全 *100).toFixed(1)}%`
		+ `（残り ${(m全 -mScan).toFixed(1)} ms が往復＋LSP の再パース）`);
});
