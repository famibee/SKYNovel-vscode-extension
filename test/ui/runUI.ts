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
import {hideSoon} from '../hideWin';

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
// ⚠️ **`it` という名前にしない。** このリポジトリには `it` が
// すでに2つある（`bun:test` の import、統合テストの Mocha グローバル）。
// ここは Playwright を node で回す独自の枠組みなので、別名にして混同を避ける
const uiCase = (nm: string, fnc: (o: T_ARG)=> Promise<void>)=> {aCase.push({nm, fnc})};


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


/**
 * 設定画面（webview）を開いて、その中身のフレームを返す。
 *
 * VSCode の webview は iframe の二段重ね（外: `iframe.webview` / 内: `#active-frame`）。
 * しかも CHAT パネル等も webview なので `iframe.webview` は複数ある。
 * `frameLocator` では1つ目を掴むため、**全フレームから `#app` を探す**。
 *
 * 既に開いていれば開き直さない（ケース間でウィンドウを共有しているため）
 */
async function openStgFrame(win: Page): Promise<Frame> {
	const find = async ()=> {
		for (const f of win.frames()) {
			if (await f.locator('#app').count().catch(()=> 0)) return f;
		}
		return undefined;
	};
	const got = await find();
	if (got) return got;

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

	await win.locator('.tab', {hasText: '設定'}).first()
		.waitFor({state: 'visible', timeout: 20_000});
	await win.waitForTimeout(4000);

	const fr = await find();
	if (! fr) throw new Error('#app を持つフレームが見つからない（到達できていない）');
	return fr;
}


// === ここからテスト ===

uiCase('コマンドパレットの見出しがプロジェクトのエンジンで切り替わる', async ({win, blues})=> {
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

uiCase('アクティビティバーの【開発環境】に環境の行が並ぶ', async ({win})=> {
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
uiCase('設定画面（webview）の中身に到達できる', async ({win})=> {
	const fr = await openStgFrame(win);
	const body = (await fr.locator('#app').innerText().catch(()=> '(取得不可)'))
		.replaceAll(/\s+/g, ' ').trim();
	console.log(`      設定画面の文字: ${body.slice(0, 100) || '(空)'}`);
	if (body === '' || body === '(取得不可)') {
		throw new Error('到達はできたが中身が空（Vue が描画していない）');
	}
});


// §3.5「設定画面の Vue はオーバースペックか」の判断材料。
// **どこまで自動テストできるか**を実地で確かめる。ここが薄いと
// 「テストできないから作り直す」という誤った理由づけが生まれる
uiCase('設定画面：7つのタブが出て、切り替わる', async ({win})=> {
	const fr = await openStgFrame(win);
	const A_TAB = [
		['basic', '基本情報'], ['app', 'アプリ'], ['temp', 'テンプレ'],
		['debug', 'デバッグ'], ['PicOpt', '画像最適化'],
		['sndopt', '音声最適化'], ['pkg', 'パッケージ'],
	];
	for (const [id, nm] of A_TAB) {
		const tab = fr.locator(`#nav-${id ?? ''}-tab`);
		if (await tab.count() === 0) throw new Error(`タブ【${nm ?? ''}】が無い`);
	}

	// 既定は「基本情報」。押して「画像最適化」に移ることを確かめる
	await fr.locator('#nav-PicOpt-tab').click();
	await win.waitForTimeout(600);
	const cls = await fr.locator('#nav-PicOpt').getAttribute('class') ?? '';
	console.log(`      画像最適化タブの class: ${cls}`);
	if (! cls.includes('active')) throw new Error('タブを押しても切り替わらない');
});

// スライダーは「VSCode 標準の設定画面ではできない」ことの代表例（§3.5）。
// 実在と操作可能を確かめておけば、代替案を検討するときの要件になる
uiCase('設定画面：スライダーを操作できる', async ({win})=> {
	const fr = await openStgFrame(win);
	await fr.locator('#nav-PicOpt-tab').click();
	await win.waitForTimeout(600);

	// id に「.」が入るので属性セレクタで取る
	const sl = fr.locator('[id="cnv.mat.webp_quality"]');
	if (await sl.count() === 0) throw new Error('変換画質のスライダーが無い');

	const before = await sl.inputValue();
	await sl.fill('45');
	await sl.dispatchEvent('change');
	await win.waitForTimeout(400);
	const after = await sl.inputValue();
	console.log(`      スライダー: ${before} → ${after}`);
	if (after !== '45') throw new Error(`値が反映されない（${after}）`);
});

uiCase('設定画面：必須項目が空なら検証メッセージが出る', async ({win})=> {
	const fr = await openStgFrame(win);
	const n = await fr.locator('text=必須入力項目です').count();
	console.log(`      「必須入力項目です」の表示数: ${String(n)}`);
	if (n === 0) throw new Error('フィクスチャは著作者などが空なので、出るはず');
});


// ⚠️ **(VE)→(VE) のドラッグ＆ドロップは自動化できる**（実証済み）。
// ただしこのスイートへの組み込みは未完（SKYNovel のフィクスチャ上で
// エクスプローラーの行セレクタが安定しない）。動く手順は TODO.md §3.8 に記録。
// 要点は `explorer.confirmDragAndDrop: false`（既定 true だと**黙って何も起きない**）

// === 実行 ===

// ⚠️ 拡張機能ホストの中から起動されると `ELECTRON_RUN_AS_NODE=1` を受け継ぐ。
// VSCode が素の Node として起動してしまう（test/prep.ts に詳しく書いた）
// eslint-disable-next-line no-process-env
delete process.env.ELECTRON_RUN_AS_NODE;

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
		// Playwright は CDP で入力を注入するので OS のフォーカスは要らない。
		// **隠したままでも 6/6 通ることを実測済み**（コマンドパレット・
		// アクティビティバーのクリック・webview の読み取りまで全部動く）
		hideSoon(9000);
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
