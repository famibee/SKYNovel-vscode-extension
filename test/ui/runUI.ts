/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

/**
 * UI 層のテスト（`bun run test:ui`）。
 *
 * test/int/（API 層）との違い：
 * - test/int/ … 拡張機能ホストの**内側**で `vscode` API を叩く。
 *   状態の検証は正確だが、**人が見る画面そのものは見ていない**
 * - test/ui/  … Playwright で VSCode の**画面を外から**操作する。
 *   通知ボタンのクリックや webview（Vue の設定画面）に届く
 *
 * ⚠️ セレクタは VSCode の内部 DOM に依存するので、VSCode の更新で壊れうる。
 * 壊れる箇所を自前で抱えるのが Playwright を選んだ代償
 * （専用ヘルパーを持つ vscode-extension-tester なら少ない。TODO §0(6) 参照）
 *
 * ⚠️ `--user-data-dir` と `--extensions-dir` は**必ずリポジトリ外**に。
 * リポジトリ内に置くと vsix へ混入する（実際に 140 ファイル混入させた）
 */

import {_electron as electron} from 'playwright-core';
import type {ElectronApplication, Frame, Page} from 'playwright-core';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {mkFixture} from '../int/mkFixture';

const A_VSC = [
	'/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
	'C:/Program Files/Microsoft VS Code/Code.exe',
	'/usr/share/code/code',
];
const REPO = resolve(import.meta.dirname, '../..');
const TMP = `${tmpdir()}/sn_ext_ui`;
const isMac = process.platform === 'darwin';

type T_ARG = {win: Page, blues: boolean};
const aCase: {nm: string, fnc: (o: T_ARG)=> Promise<void>}[] = [];
const it = (nm: string, fnc: (o: T_ARG)=> Promise<void>)=> {aCase.push({nm, fnc})};


/**
 * SKYNovel のビューコンテナを開く。
 * アクティビティバーのアイコンは**トグル**なので、開いているときに押すと閉じる。
 * ケース間でウィンドウを共有しているため、状態を見てから押すこと
 */
async function openSnView(win: Page) {
	const pane = win.locator('.pane', {has: win.locator('text=開発環境')}).first();
	if (await pane.isVisible().catch(()=> false)) return pane;

	await win.locator('.activitybar [aria-label*="SKYNovel"]').first().click();
	await pane.waitFor({state: 'visible', timeout: 20_000});
	return pane;
}


// === ここからテスト ===

it('コマンドパレットの見出しがプロジェクトのエンジンで切り替わる', async ({win, blues})=> {
	await win.keyboard.press(isMac ?'Meta+Shift+P' :'Control+Shift+P');
	await win.locator('.quick-input-widget').waitFor({state: 'visible'});
	// タイトルは package.nls で多言語化されており、新規 user-data-dir では
	// 英語で起動する。見出し（category）は多言語化されないのでそこで探す
	await win.keyboard.type('reference search');
	await win.waitForTimeout(1500);

	const a = await win.locator('.quick-input-list .monaco-list-row').allInnerTexts();
	const s = a.join(' / ').replaceAll('\n', ' ');
	console.log(`      候補: ${s || '(なし)'}`);
	await win.keyboard.press('Escape');

	// 「BlueSNovel」は「SKYNovel」を部分文字列に含まないので、素の includes で足りる
	const want = blues ?'BlueSNovel:' :'SKYNovel:';
	const ng   = blues ?'SKYNovel:' :'BlueSNovel:';
	if (! s.includes(want)) throw new Error(`見出し ${want} が出ていない`);
	if (s.includes(ng)) throw new Error(`出てはいけない見出し ${ng} が出ている`);
});

it('アクティビティバーの【開発環境】に環境の行が並ぶ', async ({win})=> {
	const pane = await openSnView(win);
	await win.waitForTimeout(1500);

	// 環境確認（pip / node / npm / bun）が埋まるまで待つ
	await win.waitForTimeout(6000);
	const a = await pane.locator('.monaco-list-row').allInnerTexts();
	console.log(`      行: ${a.map(v=> v.replaceAll('\n', ' ')).join(' | ') || '(なし)'}`);
	for (const nm of ['Node.js', 'npm', 'bun']) {
		if (! a.some(v=> v.includes(nm))) throw new Error(`${nm} の行が無い`);
	}
	// v4.31.2 の変更点：確認が終われば「確認中」は消えている
	if (a.some(v=> v.includes('確認中'))) {
		throw new Error('環境確認が終わっていない（-- 確認中… が残っている）');
	}
});


// (7) の「Vue の設定画面を自動テストできるか」の判断材料。
// ここでは**到達できること**だけを確かめる（Vue の内部構造には触らない）
it('設定画面（webview）の中身に到達できる', async ({win})=> {
	// skynovel.devPrjSet はツリー項目から引数付きで呼ばれるコマンドなので、
	// コマンドパレットから引数なしで実行しても開かない。人と同じくツリーを押す
	await openSnView(win);
	const paneWs = win.locator('.pane', {has: win.locator('text=ワークスペース')}).first();
	await paneWs.waitFor({state: 'visible', timeout: 20_000});
	// 行のクリックは選択だけ。動作は右端のインラインボタン（hover で出る）
	const row = paneWs.locator('.monaco-list-row').filter({hasText: /^設定$/}).first();
	await row.waitFor({state: 'visible', timeout: 20_000});
	await row.hover();
	await row.locator('.actions .action-label').first().click();

	// タブが開いたことの確認
	await win.locator('.tab', {hasText: '設定'}).first()
		.waitFor({state: 'visible', timeout: 20_000});
	await win.waitForTimeout(4000);

	// VSCode の webview は iframe の二段重ね（外: iframe.webview / 内: #active-frame）。
	// しかも CHAT パネル等も webview なので iframe.webview は複数ある。
	// frameLocator では1つ目を掴んでしまうため、全フレームから #app を探す
	let fr: Frame | undefined;
	for (const f of win.frames()) {
		if (await f.locator('#app').count().catch(()=> 0)) {fr = f; break}
	}
	console.log(`      フレーム総数:${String(win.frames().length)} #app を持つフレーム:${fr ?'あり' :'なし'}`);
	if (! fr) throw new Error('#app を持つフレームが見つからない（到達できていない）');

	const body = (await fr.locator('#app').innerText().catch(()=> '(取得不可)'))
		.replaceAll(/\s+/g, ' ').trim();
	console.log(`      設定画面の文字: ${body.slice(0, 140) || '(空)'}`);
	if (body === '' || body === '(取得不可)') {
		throw new Error('到達はできたが中身が空（Vue が描画していない）');
	}
});


// ⚠️ **(VE)→(VE) のドラッグ＆ドロップは自動化できる**（実証済み）。
// ただしこのスイートへの組み込みは未完（SKYNovel のフィクスチャ上で
// エクスプローラーの行セレクタが安定しない）。動く手順は TODO.md §3.8 に記録。
// 要点は `explorer.confirmDragAndDrop: false`（既定 true だと**黙って何も起きない**）

// === 実行 ===

const executablePath = A_VSC.find(fp=> existsSync(fp));
if (! executablePath) {
	console.error('VSCode が見つかりません');
	process.exit(1);
}
mkdirSync(TMP, {recursive: true});

let ng = 0;

/** フィクスチャを作って VSCode を起動し、全ケースを実行する */
async function run(blues: boolean) {
	const label = blues ?'BlueSNovel' :'SKYNovel';
	console.log(`\n=== ${label} プロジェクト ===`);
	const fx = mkFixture(blues ?'ui_blues' :'ui', blues);

	// ⚠️ `explorer.confirmDragAndDrop` は既定 true で、**これが有効だと
	// ドラッグ＆ドロップが黙って何も起きない**（Playwright の問題ではない）。
	// trace も有効にして計数をファイルへ出させる（Trace.ts FP_TRACE）
	mkdirSync(`${TMP}/ud/User`, {recursive: true});
	writeFileSync(`${TMP}/ud/User/settings.json`, JSON.stringify({
		'explorer.confirmDragAndDrop': false,
		'explorer.confirmDelete': false,
		'skynovel.trace': true,
	}, null, '\t'));

	let app: ElectronApplication | undefined;
	try {
		app = await electron.launch({
			executablePath,
			args: [
				`--extensionDevelopmentPath=${REPO}`,
				'--disable-extensions',		// 他の拡張機能だけ止まる（開発中のものは動く）
				'--disable-updates', '--skip-welcome', '--skip-release-notes',
				'--disable-workspace-trust',
				`--user-data-dir=${TMP}/ud`,	// リポジトリ外（vsix 混入を防ぐ）
				`--extensions-dir=${TMP}/ext`,
				fx.ws,
			],
			timeout: 60_000,
		});
		const win = await app.firstWindow();
		await win.waitForSelector('.monaco-workbench', {timeout: 60_000});
		await win.waitForTimeout(5000);		// 拡張機能の起動を待つ

		// --disable-extensions の通知トーストがクリックを遮るので閉じる
		for (const b of await win.locator('.notification-toast .codicon-notifications-clear').all()) {
			await b.click().catch(()=> undefined);
		}

		for (const {nm, fnc} of aCase) {
			try {await fnc({win, blues}); console.log(`  ok  ${nm}`)}
			catch (e: unknown) {
				++ng;
				console.error(`  NG  ${nm}\n      ${e instanceof Error ? e.message : String(e)}`);
				const fp = `${TMP}/ng_${label}_${String(ng)}.png`;
				await win.screenshot({path: fp});
				console.error(`      画面: ${fp}`);
			}
		}
	}
	catch (e: unknown) {console.error(`${label} 起動失敗 %o`, e); ++ng}
	finally {await app?.close()}
}

console.log(`fn:runUI.ts VSCode=${executablePath}`);
await run(false);
await run(true);

console.log(`\n${String(aCase.length *2 -ng)} / ${String(aCase.length *2)} 件成功`);
process.exit(ng > 0 ?1 :0);
