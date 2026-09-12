/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026 Famibee (famibee.blog38.fc2.com)

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
import type {ElectronApplication, Frame, Locator, Page} from 'playwright-core';
import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {mkFixture} from '../int/mkFixture';
import {hideSoon} from '../hideWin';

// src/Trace.ts の FP_TRACE と同じ式（vscode 非依存なので値は必ず一致する）。
// UI テストは拡張機能ホストの外で動くので、活性化中の extension には手が届かず、
// このファイル経由で watch イベントの計数を読む
const FP_TRACE = `${tmpdir()}/sn_ext_trace.json`;
const readTrace = (): {[key: string]: number}=> {
	try {return JSON.parse(readFileSync(FP_TRACE, 'utf8'))}
	catch {return {}}
};

const A_VSC = [
	// mac: 旧版の実行体名 `Electron` は現行版に存在しないため `Code` のみ
	'/Applications/Visual Studio Code.app/Contents/MacOS/Code',
	'C:/Program Files/Microsoft VS Code/Code.exe',
	'/usr/share/code/code',
];
const REPO = resolve(import.meta.dirname, '../..');
const TMP = `${tmpdir()}/sn_ext_ui`;
const isMac = process.platform === 'darwin';

type T_ARG = {win: Page, blues: boolean, prj: string, app: ElectronApplication};
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

	// ⚠️ ビューコンテナの `title`（package.json）が aria-label になる。
	// v4.33.0 で `SKYNovel` → `BlueSNovel` に変えたので、
	// `*="SKYNovel"` では**一致しない**（部分文字列として含まれない）
	await win.locator('.activitybar [aria-label*="BlueSNovel"]').first().click();
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
// 要点は `explorer.confirmDragAndDrop: false`（既定 true だと**黙って何も起きない**、
// run() 内で設定済み）。

/** VSCode 標準のエクスプローラーを開く（SKYNovel の独自パネルではない）。
 * 他のケースが【開発環境】ビューへ切り替えている場合があるので毎回明示的に戻す */
async function openExplorer(win: Page) {
	// アクティビティバーのアイコンのクリックは**トグル**で、既に開いていると閉じる
	// （openSnView() と同じ注意点）。コマンドパレット経由の
	// 「View: Show Explorer」は「表示する」だけで閉じないので、
	// 状態を見ずに毎回呼べる
	await win.keyboard.press(isMac ?'Meta+Shift+P' :'Control+Shift+P');
	await win.locator('.quick-input-widget').waitFor({state: 'visible'});
	await win.keyboard.type('View: Show Explorer');
	await win.waitForTimeout(400);
	await win.keyboard.press('Enter');
	await win.waitForTimeout(400);

	await win.locator('.monaco-list-row').first().waitFor({state: 'visible', timeout: 20_000});
	return win;
}

/**
 * ツリー行を展開する。**`doc` は `prj` が唯一の子なので1行に圧縮される**
 * （`explorer.compactFolders` 既定 true）。旧コードの厳密一致（`/^doc$/`）は
 * この圧縮後のラベル（例：`doc/prj`）にヒットしないため未完だった。
 * 部分一致（`hasText`）で探せば圧縮の有無によらず取れる
 */
async function expandRow(win: Page, text: string | RegExp) {
	const row = win.locator('.monaco-list-row').filter({hasText: text}).first();
	await row.waitFor({state: 'visible', timeout: 20_000});
	if (await row.getAttribute('aria-expanded') !== 'true') {
		await row.click();
		await win.waitForTimeout(400);
	}
	return row;
}

uiCase('D&D (VE)→(VE)：ドラッグで移動できる', async ({win})=> {
	await openExplorer(win);
	await expandRow(win, 'doc');			// 圧縮されていれば `doc/prj` 行にヒット
	await expandRow(win, /^pic$/);

	const src  = win.locator('.monaco-list-row').filter({hasText: 'dnd_src.png'}).first();
	const dest = win.locator('.monaco-list-row').filter({hasText: /^sound$/}).first();
	await src.waitFor({state: 'visible', timeout: 20_000});
	await dest.waitFor({state: 'visible', timeout: 20_000});

	const before = readTrace();
	await src.dragTo(dest);
	await win.waitForTimeout(1500);	// watchFld の 500ms デバウンス + dump() の 300ms
	const after = readTrace();

	const dCre = (after['watch.cre'] ?? 0) - (before['watch.cre'] ?? 0);
	const dDel = (after['watch.del'] ?? 0) - (before['watch.del'] ?? 0);
	console.log(`      移動後の差分: watch.cre +${String(dCre)} / watch.del +${String(dDel)}`);
	if (dCre < 1 || dDel < 1) {
		throw new Error(`ドラッグが効いていない可能性（watch.cre:${String(dCre)} watch.del:${String(dDel)}）`);
	}
	if (await src.isVisible().catch(()=> false)) {
		throw new Error('移動後もドラッグ元が pic 配下に見えたまま（移動できていない）');
	}
});

/** 修飾キーを押したままドラッグする。`dragTo()` に modifier 指定が無いため手動で組む */
async function dragWithModifier(win: Page, src: Locator, dest: Locator, modifier: 'Control' | 'Alt') {
	const bs = await src.boundingBox();
	const bd = await dest.boundingBox();
	if (! bs || ! bd) throw new Error('ドラッグ元・先の座標が取れない');

	await win.keyboard.down(modifier);
	await win.mouse.move(bs.x + bs.width /2, bs.y + bs.height /2);
	await win.mouse.down();
	await win.mouse.move(bd.x + bd.width /2, bd.y + bd.height /2, {steps: 10});
	await win.waitForTimeout(100);
	await win.mouse.up();
	await win.keyboard.up(modifier);
}

uiCase('D&D (VE)→(VE)：Ctrl+ドラッグでコピーできる', async ({win})=> {
	await openExplorer(win);
	await expandRow(win, 'doc');
	await expandRow(win, /^pic$/);

	const src  = win.locator('.monaco-list-row').filter({hasText: 'dnd_src2.png'}).first();
	const dest = win.locator('.monaco-list-row').filter({hasText: /^sound$/}).first();
	await src.waitFor({state: 'visible', timeout: 20_000});
	await dest.waitFor({state: 'visible', timeout: 20_000});

	const before = readTrace();
	// Windows/Linux は Ctrl+ドラッグ＝コピーが既定。mac は Ctrl+クリックが
	// 副ボタンクリック（右クリック）に化けるため Option(Alt) を使う
	await dragWithModifier(win, src, dest, isMac ?'Alt' :'Control');
	await win.waitForTimeout(1500);
	const after = readTrace();

	const dCre = (after['watch.cre'] ?? 0) - (before['watch.cre'] ?? 0);
	const dDel = (after['watch.del'] ?? 0) - (before['watch.del'] ?? 0);
	console.log(`      コピー後の差分: watch.cre +${String(dCre)} / watch.del +${String(dDel)}`);
	if (dCre < 1) throw new Error(`コピーが効いていない可能性（watch.cre:${String(dCre)}）`);
	if (dDel > 0) throw new Error(`削除が発生した＝コピーでなく移動になっている（watch.del:${String(dDel)}）`);
	if (! await src.isVisible().catch(()=> false)) {
		throw new Error('コピー後にドラッグ元が pic 配下から消えた（移動になっている）');
	}
});

/** Finder→(VE) のテスト用に、プロジェクト外（OS上の適当な場所）へ
 * ソースファイルを1つ用意する。プロジェクト内に置くと「そもそも外部由来
 * ではない」ことになり検証の意味が薄れるため、必ず `%TEMP%` 配下に置く */
function mkExtSrc(nm: string) {
	// ⚠️ ファイル名だけを一意にしてもワークスペース側の上書き確認ダイアログは
	// 防げない。**フォルダ自体を毎回一意にする**（`dragFromFinder` は
	// Finder の AX ツリーで「フォルダ内の1番目のアイコン」を無条件に掴むため、
	// 同じフォルダに前回以前の実行分が溜まっていると、ソート順次第で
	// 別ファイル（最悪、旧い無印の名前）を誤って掴んでしまう。実機で発生済み）
	const dir = `${tmpdir()}/sn_ext_dnd_ext_mac/${String(Date.now())}`;
	mkdirSync(dir, {recursive: true});
	const fp = `${dir}/${nm}`;
	copyFileSync(resolve(import.meta.dirname, '../mat/_yesno.png'), fp);
	return fp;
}

/**
 * Finder → VSCode(Explorer) の実ファイルドラッグ（mac限定）。
 *
 * Playwright の `dragTo()` は自分が起動した Electron の中でしか完結しない
 * （HTML5合成イベントで、外部アプリとは繋がらない）。そこで OS レベルの
 * 本物のドラッグを起こすため、`@nut-tree-fork/nut-js`（`CGEventPost`
 * ベース）でマウスを直接動かす。Finder 側の要素座標は System Events(AX)
 * ツリーを辿って取得する。実機PoCの経緯・踏んだ罠は file-watch.md の
 * 「Explorer↔VSCode 自動化の可能性」節（mac実機PoC）を参照
 *
 * @returns ドラッグ後も送り元ファイルが実在するか（move/copy の実態確認用）
 */
async function dragFromFinder(
	o: {win: Page, app: ElectronApplication},
	destRow: Locator,
	srcFile: string,
	opt: {optionKey?: boolean} = {},
): Promise<{srcExists: boolean}> {
	const {win, app} = o;
	const {mouse, keyboard, Key, Point, Button} = await import('@nut-tree-fork/nut-js');

	// VSCode ウィンドウを画面右半分の既知の位置へ（Finder 側は左半分に開く。
	// 座標計算後に動かすと screenX/Y が古くなるので、計算の**前に**確定させる）
	type T_BW = {show: ()=> void, setBounds: (b: {x: number, y: number, width: number, height: number})=> void};
	const bw = await app.browserWindow(win);
	await bw.evaluate((w: T_BW)=> {
		w.show();
		w.setBounds({x: 1280, y: 0, width: 1280, height: 1400});
	});
	await win.waitForTimeout(300);

	const box = await destRow.boundingBox();
	if (! box) throw new Error('ドロップ先(destRow)のboundingBoxが取得できません');
	const [winX, winY] = await win.evaluate(()=>
		[window.screenX, window.screenY]);
	// mac は nut.js・AppleScript(System Events) とも同じ論理ポイント座標系
	// なので dpr 変換は不要（Windows 版は SendInput が物理ピクセル基準の
	// ため要変換だった。file-watch.md 参照）
	const dropX = Math.round(winX + box.x + box.width /2);
	const dropY = Math.round(winY + box.y + box.height /2);

	// Finder 側: srcFile の親フォルダをウィンドウとして開く（画面左半分）。
	// ⚠️ 前回分の後始末（`close every window`）はここ、次のケースの開始時に
	// 行う。ドロップ直後にやると、VSCode側で確認ダイアログ（ネイティブ
	// sheet）が出ようとしている最中に Finder の activate がフォーカスを
	// 奪い、ダイアログの表示・視認を妨げる可能性があるため
	execFileSync('osascript', ['-e', 'tell application "Finder" to close every window']);
	const srcDir = srcFile.slice(0, srcFile.lastIndexOf('/'));
	execFileSync('osascript', ['-e', `tell application "Finder"
	activate
	set w to make new Finder window to (POSIX file "${srcDir}" as alias)
	set bounds of w to {0, 100, 1200, 900}
end tell`]);

	// アイコン1個の絶対座標を AX ツリーから取得
	// （window > AXSplitGroup[1]=サイドバー / [3]=本体 > AXScrollArea >
	//   AXList > AXList > AXGroup。詳細は file-watch.md 参照）。
	// ⚠️ **Finder が System Events から見て `frontmost` にならず
	// `windows of process "Finder"` が 0 件のまま返ることがある**（実機で
	// 再現・原因未特定。フォーカス管理が不安定な環境依存の症状とみられる）。
	// 毎回 `activate` し直しながら数回リトライする
	let aNum: number[] = [];
	for (let i = 0; i < 6; i++) {
		await new Promise(r=> setTimeout(r, 500));
		execFileSync('osascript', ['-e', 'tell application "Finder" to activate']);
		try {
			const posOut = execFileSync('osascript', ['-e', `tell application "System Events"
	tell process "Finder"
		set srcWin to window 1
		set sg to item 1 of (UI elements of srcWin)
		set sg2 to item 3 of (UI elements of sg)
		set sa to item 1 of (UI elements of sg2)
		set lst to item 1 of (UI elements of sa)
		set inner to item 1 of (UI elements of lst)
		set grp to item 1 of (UI elements of inner)
		return {position of grp, size of grp}
	end tell
end tell`], {encoding: 'utf8'}).trim();
			const n = posOut.split(',').map(s=> parseInt(s.trim(), 10));
			if (n.length >= 4 && ! n.some(v=> Number.isNaN(v))) {aNum = n; break}
		}
		catch { /* リトライ */ }
	}
	if (aNum.length < 4) throw new Error('Finderアイコンの座標が読めない（リトライ上限）');
	const [ix, iy, iw, ih] = <[number, number, number, number]>aNum;
	const src = new Point(ix + iw /2, iy + ih /2);
	const dst = new Point(dropX, dropY);

	// mac のコピー修飾キーは Option。ドラッグ中押しっぱなしにする。
	// ⚠️ 押しっぱなしの状態で例外が飛ぶと Alt が離されないまま残り、
	// 次のケース・次のプロジェクトの実行にまで影響しうるので try/finally で守る
	if (opt.optionKey) await keyboard.pressKey(Key.LeftAlt);
	try {
		await mouse.setPosition(src);
		await new Promise(r=> setTimeout(r, 300));
		await mouse.pressButton(Button.LEFT);
		await new Promise(r=> setTimeout(r, 200));
		const steps = 40;
		for (let i = 1; i <= steps; i++) {
			await mouse.setPosition(new Point(
				src.x + (dst.x -src.x) *i /steps,
				src.y + (dst.y -src.y) *i /steps,
			));
			await new Promise(r=> setTimeout(r, 20));
		}
		await new Promise(r=> setTimeout(r, 400));
		await mouse.releaseButton(Button.LEFT);
	}
	finally {
		if (opt.optionKey) await keyboard.releaseKey(Key.LeftAlt);
	}

	// ⚠️ ここでは閉じない（上のコメント参照）。次回呼び出し冒頭で閉じる
	return {srcExists: existsSync(srcFile)};
}

/**
 * 外部ファイルのドロップ後、`watch.cre` が増えるまで待つ。
 *
 * ⚠️ **VSCode の実ファイルコピーは非同期で、内部 D&D より明確に遅い**
 * （実機で「Copying...」がステータスバーに数秒残るのを確認済み）。
 * 固定 `waitForTimeout` だと「コピー中に検証してしまい未反映」を
 * 「ドロップが効いていない」と誤診断する。増えるまでポーリングする
 */
async function waitForTraceDelta(key: 'watch.cre' | 'watch.del', before: number, timeoutMs = 10_000): Promise<number> {
	const t0 = Date.now();
	let shot = false;
	for (;;) {
		const d = (readTrace()[key] ?? 0) - before;
		if (d >= 1) return d;
		if (Date.now() -t0 > timeoutMs) {
			// ⚠️ `win.screenshot()` は Playwright が描画しているページしか撮れず、
			// mac のネイティブ確認ダイアログ（sheet）は写らない可能性がある。
			// OS レベルの `screencapture` で別途撮る（screencapture 自体に
			// 画面収録権限が要る＝呼び出し元の端末アプリへの許可が必要）
			if (! shot) {
				shot = true;
				const fp = `${TMP}/os_screenshot_${String(Date.now())}.png`;
				try {
					execFileSync('screencapture', ['-x', fp]);
					console.log(`      OSレベルのスクリーンショット: ${fp}`);
				}
				catch (e) {console.log(`      screencapture失敗: ${e instanceof Error ? e.message : String(e)}`)}
				// ダイアログが本当に出ているなら少し待って再確認の余地を残す
				await new Promise(r=> setTimeout(r, 2000));
				continue;
			}
			return d;
		}
		await new Promise(r=> setTimeout(r, 300));
	}
}

uiCase('D&D Finder→(VE)：移動できる【mac限定・実機PoC済み】', async ({win, app})=> {
	if (! isMac) {console.log('      (mac 専用ケースのためスキップ)'); return}
	await openExplorer(win);
	await expandRow(win, 'doc');
	await expandRow(win, /^pic$/);
	const dest = win.locator('.monaco-list-row').filter({hasText: /^sound$/}).first();
	await dest.waitFor({state: 'visible', timeout: 20_000});

	const srcFile = mkExtSrc('dnd_ext_move_mac.png');
	const before = readTrace()['watch.cre'] ?? 0;
	const {srcExists} = await dragFromFinder({win, app}, dest, srcFile);
	const dCre = await waitForTraceDelta('watch.cre', before);
	console.log(`      Finder→(VE)移動後の差分: watch.cre +${String(dCre)} / 送り元ファイル残存:${String(srcExists)}`);
	if (dCre < 1) throw new Error(`ドロップが効いていない可能性（watch.cre:${String(dCre)}）`);
});

uiCase('D&D Finder→(VE)：コピーできる（Option+ドラッグ）【mac限定・実機PoC済み】', async ({win, app})=> {
	if (! isMac) {console.log('      (mac 専用ケースのためスキップ)'); return}
	await openExplorer(win);
	await expandRow(win, 'doc');
	await expandRow(win, /^pic$/);
	const dest = win.locator('.monaco-list-row').filter({hasText: /^sound$/}).first();
	await dest.waitFor({state: 'visible', timeout: 20_000});

	const srcFile = mkExtSrc('dnd_ext_copy_mac.png');
	const before = readTrace()['watch.cre'] ?? 0;
	const {srcExists} = await dragFromFinder({win, app}, dest, srcFile, {optionKey: true});
	const dCre = await waitForTraceDelta('watch.cre', before);
	console.log(`      Finder→(VE)コピー後の差分: watch.cre +${String(dCre)} / 送り元ファイル残存:${String(srcExists)}`);
	if (dCre < 1) throw new Error(`ドロップが効いていない可能性（watch.cre:${String(dCre)}）`);
});

/**
 * VSCode(Explorer) → Finder の実ファイルドラッグ（mac限定）。
 *
 * `dragFromFinder` と対称。win側の知見（(VE)→Explorer は VSCode 本体が
 * 持つドラッグアウト機能を本物の OS 入力で起動するだけで足り、拡張機能側の
 * 特別な対応は不要）がそのまま当てはまり、詰まりどころも同じだった
 *
 * @returns ドロップ先フォルダに実際にできたファイルのパス（空文字なら未達）
 */
async function dragToFinder(
	o: {win: Page, app: ElectronApplication},
	srcRow: Locator,
	opt: {optionKey?: boolean} = {},
): Promise<{dstFile: string}> {
	const {win, app} = o;
	const {mouse, keyboard, Key, Point, Button} = await import('@nut-tree-fork/nut-js');

	type T_BW = {show: ()=> void, setBounds: (b: {x: number, y: number, width: number, height: number})=> void};
	const bw = await app.browserWindow(win);
	await bw.evaluate((w: T_BW)=> {
		w.show();
		w.setBounds({x: 0, y: 0, width: 1280, height: 1400});
	});
	await win.waitForTimeout(300);

	const box = await srcRow.boundingBox();
	if (! box) throw new Error('ドラッグ元(srcRow)のboundingBoxが取得できません');
	const [winX, winY] = await win.evaluate(()=> [window.screenX, window.screenY]);
	const src = new Point(
		Math.round(winX + box.x + box.width /2),
		Math.round(winY + box.y + box.height /2),
	);

	// Finder 側: 空の送り先フォルダを開く（画面右半分。VSCode は左半分）
	execFileSync('osascript', ['-e', 'tell application "Finder" to close every window']);
	const dstDir = `${tmpdir()}/sn_ext_dnd_ext_mac_out/${String(Date.now())}`;
	mkdirSync(dstDir, {recursive: true});
	execFileSync('osascript', ['-e', `tell application "Finder"
	activate
	set w to make new Finder window to (POSIX file "${dstDir}" as alias)
	set bounds of w to {1280, 100, 2480, 900}
end tell`]);

	// 送り先は空なのでアイコン探索は不要。スクロールエリア（コンテンツ領域）
	// の中心を使う。frontmost にならず 0 件のまま返ることがある点は
	// dragFromFinder と同じなのでリトライする
	let aNum: number[] = [];
	for (let i = 0; i < 6; i++) {
		await new Promise(r=> setTimeout(r, 500));
		execFileSync('osascript', ['-e', 'tell application "Finder" to activate']);
		try {
			const posOut = execFileSync('osascript', ['-e', `tell application "System Events"
	tell process "Finder"
		set dstWin to window 1
		set sg to item 1 of (UI elements of dstWin)
		set sg2 to item 3 of (UI elements of sg)
		set sa to item 1 of (UI elements of sg2)
		return {position of sa, size of sa}
	end tell
end tell`], {encoding: 'utf8'}).trim();
			const n = posOut.split(',').map(s=> parseInt(s.trim(), 10));
			if (n.length >= 4 && ! n.some(v=> Number.isNaN(v))) {aNum = n; break}
		}
		catch { /* リトライ */ }
	}
	if (aNum.length < 4) throw new Error('Finder送り先の座標が読めない（リトライ上限）');
	const [sx, sy, sw, sh] = <[number, number, number, number]>aNum;
	const dst = new Point(sx + sw /2, sy + sh /2);

	if (opt.optionKey) await keyboard.pressKey(Key.LeftAlt);
	try {
		await mouse.setPosition(src);
		await new Promise(r=> setTimeout(r, 300));
		await mouse.pressButton(Button.LEFT);
		await new Promise(r=> setTimeout(r, 200));
		const steps = 40;
		for (let i = 1; i <= steps; i++) {
			await mouse.setPosition(new Point(
				src.x + (dst.x -src.x) *i /steps,
				src.y + (dst.y -src.y) *i /steps,
			));
			await new Promise(r=> setTimeout(r, 20));
		}
		await new Promise(r=> setTimeout(r, 400));
		await mouse.releaseButton(Button.LEFT);
	}
	finally {
		if (opt.optionKey) await keyboard.releaseKey(Key.LeftAlt);
	}

	// ドロップ先フォルダに実際にできたファイルを探す（VSCode 側の実装次第で
	// ファイル名が付け替わりうるため、名前を決め打ちにせず存在確認する）
	let dstFile = '';
	for (let i = 0; i < 10; i++) {
		const a = readdirSync(dstDir);
		if (a.length > 0) {dstFile = `${dstDir}/${a[0] ?? ''}`; break}
		await new Promise(r=> setTimeout(r, 500));
	}
	return {dstFile};
}

// ⚠️ 「Option+ドラッグ」版は用意したが削除した。win側の実測で
// 「Explorer↔VSCode間は修飾キーの有無で挙動が変わらない（常にコピー相当）」と
// 判明済みで、mac だけ別挙動という理由がない上に、実機で
// 「ドロップ先の Finder ウィンドウが消え、VSCode のチャットパネルへ
// 誤って落ちる」という不安定な症状が出た（原因未特定）。得られる情報の
// 割に、意図しない場所へファイルを落としうるリスクの方が大きいと判断した
uiCase('D&D (VE)→Finder：ドラッグアウトできる【mac限定】', async ({win, app, prj})=> {
	if (! isMac) {console.log('      (mac 専用ケースのためスキップ)'); return}
	await openExplorer(win);
	await expandRow(win, 'doc');
	await expandRow(win, /^pic$/);

	const nm = 'dnd_out_move_mac.png';
	const fp = `${prj}/pic/${nm}`;
	copyFileSync(resolve(import.meta.dirname, '../mat/_yesno.png'), fp);
	const row = win.locator('.monaco-list-row').filter({hasText: nm}).first();
	await row.waitFor({state: 'visible', timeout: 20_000});

	const {dstFile} = await dragToFinder({win, app}, row);
	await win.waitForTimeout(2000);
	// ⚠️ win側の実測で「Explorer↔VSCode間は無修飾・Ctrl+ドラッグとも常に
	// コピー相当（move操作の見た目でも送り元は消えない）」と判明済み。
	// mac も同じ VSCode 本体の実装を使うため、送り元の消失は断定せず観測のみ
	console.log(`      (VE)→Finder（無修飾）後: 送り先ファイル:${dstFile || '(できていない)'} / 送り元残存:${String(existsSync(fp))}`);
	if (! dstFile) throw new Error('送り先フォルダにファイルができていない（ドロップが効いていない可能性）');
});

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
	// ⚠️ mac の D&D ケース（dragFromFinder/dragToFinder）が開けっ放しにした
	// Finder ウィンドウが前回プロジェクトの実行から残っていることがある。
	// プロジェクトの実行をまたいで持ち越さないよう、開始時にも一掃しておく
	if (isMac) {
		try {execFileSync('osascript', ['-e', 'tell application "Finder" to close every window'])}
		catch { /* Finder 未起動などは無視 */ }
	}
	const fx = mkFixture(blues ?'ui_blues' :'ui', blues);

	// D&D テスト用のドラッグ元ファイル。名前を一意にして行セレクタの取り違えを防ぐ
	for (const nm of ['dnd_src.png', 'dnd_src2.png']) copyFileSync(
		resolve(import.meta.dirname, '../mat/_yesno.png'),
		`${fx.prj}/pic/${nm}`,
	);

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
			try {await fnc({win, blues, prj: fx.prj, app}); console.log(`  ok  ${nm}`)}
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
	finally {
		await app?.close();
		// mac の D&D ケースが開けっ放しにした Finder ウィンドウを残さない
		if (isMac) {
			try {execFileSync('osascript', ['-e', 'tell application "Finder" to close every window'])}
			catch { /* Finder 未起動などは無視 */ }
		}
	}
}

console.log(`fn:runUI.ts VSCode=${executablePath}`);
await run(false);
await run(true);

console.log(`\n${String(aCase.length *2 -ng)} / ${String(aCase.length *2)} 件成功`);
process.exit(ng > 0 ?1 :0);
