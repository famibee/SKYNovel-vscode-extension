/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {T_TMPWIZ} from './types';
import {chkBun, is_win, replaceRegsFile, repWvUri, type T_PKG_JSON} from './CmnLib';
import {T_BOOT, traceMs} from './Trace';
import type {WorkSpaces} from './WorkSpaces';
import type {T_LocalSNVer} from './Project';
import type {T_CFG_RAW} from './ConfigBase';

import type {TreeDataProvider, ExtensionContext, WebviewPanel} from 'vscode';
import {TreeItem, window, commands, Uri, EventEmitter, ViewColumn, ProgressLocation, workspace, env, ConfigurationTarget, extensions} from 'vscode';
import {exec} from 'child_process';
import {tmpdir} from 'os';
import {copyFile, mkdirs, existsSync, move, outputJson, readFile, readJson, remove, writeFile} from 'fs-extra';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const AdmZip = require('adm-zip');

const nNodeReqVer = 24_011_000;

// テンプレートの取得元。進捗表示でユーザーに見せる
const URL_TMP_ZIP = (nm: string)=> `https://github.com/famibee/${nm}/archive/main.zip`;

// 拡張機能自身の更新確認。【通知のみ】で、取得もインストールもしない
const REPO_EXT = 'famibee/SKYNovel-vscode-extension';
const URL_EXT_LATEST = `https://api.github.com/repos/${REPO_EXT}/releases/latest`;
	// master の package.json ではなく Releases を見る。リリース手順では
	// 版を上げてコミットした後に Releases を作るので、master を見ると
	// 「まだダウンロードできない版」を告知してしまう
const URL_EXT_RELEASES = `https://github.com/${REPO_EXT}/releases`;
const KEY_SKIP_EXT_VER = 'skynovel.notifiedExtVer';	// 同じ版で繰り返し通知しない
const CFG_CHK_EXT_VER = 'skynovel.chkExtUpdate';

// Marketplace 削除により、再公開は新しい extension name になった（TODO §3.5）。
// 旧 ID は復活しないので、この2つは**別の拡張機能として共存できてしまう**
const ID_OLD_EXT = 'famibee2.skynovel2';

/**
 * 「4.31.1」を比較可能な数値に。`v` 接頭辞にも対応。
 * compare-versions は Windows10 で不具合が出たので手作り。
 *
 * ⚠️ **数字以外は落とす。** `v5.0.0-rc1` のような綴りだと `Number('0-rc1')` が
 * NaN になり、`NaN <= x` が false なので**全利用者に「新版あり」と誤通知**する。
 * Marketplace は `major.minor.patch` しか許さないので本来そうならないが、
 * タグの打ち間違い1回で起きるため、ここで吸収する
 */
function verNum(ver: string): number {
	const [a=0, b=0, c=0] = ver.replace(/^v/, '').split('.')
		.map(s=> Number(/^\d+/.exec(s)?.[0] ?? 0));
	return a *1_000_000 + b *1_000 + c;
}

export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i=0; i<32; ++i) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

let extPath = '';
export function oIcon(name: string) {return {
	light	: Uri.file(extPath +`/res/light/${name}.svg`),
	dark	: Uri.file(extPath +`/res/dark/${name}.svg`),
}}


type T_ENV_SRC = {
	nm		: string;
	icon	: string;
	label	: string;
}

type T_ENV = {
	ti		: TreeItem;
	ready	: boolean;
	icon	: string;	// 確認中の表示に戻す時に使う
}
type T_H_ENV = {
	NODE			: T_ENV;
	NPM				: T_ENV;
	BUN				: T_ENV;
	SN_ESM_VER		: T_ENV;
	SN_CJS_VER		: T_ENV;
	TEMP_ESM_VER	: T_ENV;
	TEMP_CJS_VER	: T_ENV;
	PY_FONTTOOLS	: T_ENV;
}


export class ActivityBar implements TreeDataProvider<TreeItem> {
	//MARK: 処理冒頭
	static start(ctx: ExtensionContext) {
		extPath = ctx.extensionPath;

		ActivityBar.#hEnv = <T_H_ENV>Object.fromEntries(
			(<T_ENV_SRC[]>[
				{nm: 'NODE',
					icon: 'node-js-brands',	label: 'Node.js'},
				{nm: 'NPM',
					icon: 'npm-brands',		label: 'npm'},
				{nm: 'BUN',
					icon: 'npm-brands',		label: 'bun'},
				{nm: 'SN_ESM_VER',
					icon: 'skynovel',		label: '(web) SKYNovel esm'},
				{nm: 'TEMP_ESM_VER',
					icon: 'skynovel',		label: '(web) テンプレ esm'},
				{nm: 'SN_CJS_VER',
					icon: 'skynovel',		label: '(web) SKYNovel'},
				{nm: 'TEMP_CJS_VER',
					icon: 'skynovel',		label: '(web) テンプレ'},
				{nm: 'PY_FONTTOOLS',
					icon: 'python-brands',	label: 'fonttools'},
			])
			.map(({nm, icon, label})=> {
				const ti = new TreeItem(label);
				ti.iconPath = oIcon(icon);
				ti.contextValue = label;
				return [nm, {ti, ready: false, icon}]
			})
		);

		this.#actBar = new ActivityBar(ctx);
	}
	static #actBar: ActivityBar;
	static stop() {this.#actBar.#dispose()}


	#workSps: WorkSpaces;
	static #hEnv: T_H_ENV;
	static getReady(nm: keyof T_H_ENV): boolean {return this.#hEnv[nm].ready}


	//MARK: コンストラクタ
	private constructor(private readonly ctx: ExtensionContext) {
		import('./WorkSpaces')
		.then(async ({WorkSpaces})=> {
			ctx.subscriptions.push(this.#workSps = new WorkSpaces(ctx, this));
			this.#canTempWizard = true;

			// ツリーとコマンドの登録は、環境確認（#chkEnv）や LSP 起動
			// （#workSps.start）を待たずに済ませる。待つと pip / npm の
			// 呼び出しが終わるまでアクティビティバーが空になり、コマンドも
			// 「見つかりません」になってしまう。各項目の表示は #chkEnv が
			// 項目ごとに onDidChangeTreeData を fire して埋めていく
			ctx.subscriptions.push(
				window.registerTreeDataProvider('skynovel-dev', this),
				commands.registerCommand('skynovel.TempWizard', ()=> this.#openTempWizard()),
				commands.registerCommand('skynovel.refreshEnv', ()=> this.#refreshEnv()),	// refreshボタン
				commands.registerCommand('skynovel.dlNode', ()=> this.#openEnvInfo()),
			);
			// ここまでで利用者はツリーもコマンドも使える（§4.5 起動時間の実測）
			traceMs('起動.操作可能まで.ms', performance.now() - T_BOOT);

			// 環境確認は start() と並行に。start() は中で bun の有無を待つが、
			// これは chkBun() で結果を共有するので二重に exec しない
			const pEnv = this.#chkEnv();
			const pDoc = import('./TreeDPDoc')
				.then(({TreeDPDoc})=> ctx.subscriptions.push(
					window.registerTreeDataProvider('skynovel-doc', new TreeDPDoc(ctx)),
				));
			const pTb = import('./ToolBox')
				.then(({ToolBox})=> ctx.subscriptions.push(ToolBox.init(ctx)));
			// 拡張機能自身の更新確認（通知のみ）。通知はボタンを押すまで
			// 解決しないので、起動の待ち合わせには入れない
			void this.#chkLastExtVer();
			void this.#chkOldExt();

			await this.#workSps.start();
			await Promise.allSettled([pEnv, pDoc, pTb]);
			traceMs('起動.環境確認まで.ms', performance.now() - T_BOOT);
		})
		.catch((e: unknown)=> console.error('fn:ActivityBar.ts constructor %o', e))
	}

	#dispose() {if (this.#wp) this.#wp.dispose()}

	//MARK: 環境確認
	// ここでは「検出」のみ行う。ユーザー環境へのインストールはしない
	async #chkEnv(again = false): Promise<boolean> {
		const tiNode = ActivityBar.#hEnv.NODE.ti;
		const tiNpm = ActivityBar.#hEnv.NPM.ti;
		const tiBun = ActivityBar.#hEnv.BUN.ti;
		const tiPFT = ActivityBar.#hEnv.PY_FONTTOOLS.ti;
		// 再確認（refresh ボタン）で前回の error / warn アイコンが残らないよう戻す
		for (const nm of <const>['NODE', 'NPM', 'BUN', 'PY_FONTTOOLS']) {
			const e = ActivityBar.#hEnv[nm];
			e.ready = false;
			e.ti.description = '-- 確認中…';
			e.ti.iconPath = oIcon(e.icon);
			this.#onDidChangeTreeData.fire(e.ti);
		}

		await Promise.allSettled([
			new Promise<void>(re=> exec('pip list', (e, stdout)=> {
				if (e) {
					tiPFT.description = '-- pip error';
					tiPFT.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiPFT);
					re();
					return;
				}

				// pip list は「Brotli」と大文字始まりで出るので i フラグ必須
				if (! /^fonttools\s/gim.test(stdout)
				|| ! /^brotli\s/gim.test(stdout)) {
					tiPFT.description = '-- 未導入（フォント最適化を使う時に確認します）';
					tiPFT.iconPath = oIcon('warn');
					this.#onDidChangeTreeData.fire(tiPFT);
					re();
					return;
				}

				this.#onReadyPyFontTools();
				re();
			})),
			new Promise<void>(re=> exec('node -v', (e, stdout)=> {
				if (e) {
					tiNode.description = '-- 見つかりません';
					tiNode.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNode);

					tiNpm.description = '-- （割愛）';
					tiNpm.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNpm);
					re();
					return;
				}

				const vNode = stdout.slice(1, -1);
				const splVNode = vNode.split('.');
				const nVNode = Number(splVNode[0]) *1_000_000
					+Number(splVNode[1]) *1_000 +Number(splVNode[2]);
					// compare-versions だと windows10 で不具合になるので手作りに
				if (nVNode < nNodeReqVer) {
					tiNode.description = `-- ${vNode} (${(nNodeReqVer / 1_000_000).toFixed(3)}.0 以上必須)`;
					tiNode.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNode);

					tiNpm.description = '-- （割愛）';
					tiNpm.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNpm);
					re();
					return;
				}
				ActivityBar.#hEnv.NODE.ready = true;
				tiNode.description = `-- ${vNode}`;
				tiNode.iconPath = oIcon('node-js-brands');
				this.#onDidChangeTreeData.fire(tiNode);
				re();
			})),
			new Promise<void>(re=> exec('npm -v', (e, stdout)=> {
				if (e) {
					tiNpm.description = '-- 見つかりません';
					tiNpm.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiNpm);
					re();
					return;
				}
				ActivityBar.#hEnv.NPM.ready = true;
				tiNpm.description = `-- ${stdout.trimEnd()}`;
				tiNpm.iconPath = oIcon('npm-brands');
				this.#onDidChangeTreeData.fire(tiNpm);
				re();
			})),
			// bun の有無は WorkSpaces.start() も待つので、結果を共有して二重に
			// exec しない（again=true で再確認）
			chkBun(again).then(({ok, ver})=> {
				if (! ok) {
					tiBun.description = '-- 見つかりません（npm を使います）';
					tiBun.iconPath = oIcon('warn');
					this.#onDidChangeTreeData.fire(tiBun);
					return;
				}
				ActivityBar.#hEnv.BUN.ready = true;
				tiBun.description = `-- ${ver}（優先）`;
				tiBun.iconPath = oIcon('npm-brands');
				this.#onDidChangeTreeData.fire(tiBun);
			}),
		]);
		return true;
	}

	// fonttools / brotli が揃っている場合の処理
	#onReadyPyFontTools() {
		const tiPFT = ActivityBar.#hEnv.PY_FONTTOOLS.ti;
		ActivityBar.#hEnv.PY_FONTTOOLS.ready = true;
		tiPFT.description = '-- ready';
		tiPFT.iconPath = oIcon('python-brands');
		this.#onDidChangeTreeData.fire(tiPFT);

		// fonttools用、環境変数PATHに pyftsubset.exe があるパスを追加
		if (! is_win) return;
		exec('python -m site --user-site', (e, stdout)=> {
			if (e) return;	// ありえないが
			const path = stdout.trimEnd().replace(/site-packages$/, 'Scripts');
			ActivityBar.#pathPyScripts = path;
			this.ctx.environmentVariableCollection.prepend('PATH', path +';');
		});
	}
	static #pathPyScripts = '';
	/**
	 * pyftsubset の実行コマンド。
	 * pip install --user のスクリプトは %APPDATA%\Python\PythonXX\Scripts に入るが、
	 * ここは PATH に無いことが多い。environmentVariableCollection での PATH 追加は
	 * VSCode のターミナルにしか効かず、拡張機能からの exec() には効かないので、
	 * 場所が分かっている場合はフルパスで実行する
	 */
	static get cmdPyftsubset() {return this.#pathPyScripts
		? `"${this.#pathPyScripts}\\pyftsubset"`
		: 'pyftsubset'}

	//MARK: フォント最適化に必要な Python パッケージの導入
	// 未導入なら、同意を得てから pip install する。断られたら false
	static prepPyFontTools() {return this.#actBar.#prepPyFontTools()}
	async #prepPyFontTools(): Promise<boolean> {
		if (ActivityBar.getReady('PY_FONTTOOLS')) return true;

		const CMD = `pip install ${is_win ?'--user ' :''}fonttools brotli`;
		const a = await window.showInformationMessage(
			'フォント最適化には Python パッケージ fonttools と brotli が必要です',
			{modal: true, detail: `この拡張機能から次のコマンドを実行してもよろしいですか？

    ${CMD}
${is_win ?'\n実行後、pyftsubset を見つけられるよう VSCode ターミナルの PATH に Python の Scripts フォルダを追加します。\n' :''}
【手動で入れる】を選んだ場合、コマンドは実行しません。ご自分で導入したあと、アクティビティバー【開発環境】の更新ボタンを押して下さい。`},
			'実行する', '手動で入れる',
		);
		if (a !== '実行する') return false;

		return window.withProgress({
			location	: ProgressLocation.Notification,
			title		: CMD,
			cancellable	: false,
		}, ()=> new Promise<boolean>(re=> exec(CMD, e=> {
			if (! e) {this.#onReadyPyFontTools(); re(true); return}

			const tiPFT = ActivityBar.#hEnv.PY_FONTTOOLS.ti;
			tiPFT.description = '-- install失敗';
			tiPFT.iconPath = oIcon('error');
			this.#onDidChangeTreeData.fire(tiPFT);
			void window.showErrorMessage(`${CMD} に失敗しました`, {modal: true, detail: e.message});
			re(false);
		})));
	}


	// refreshEnvボタン
	async #refreshEnv() {
		this.#workSps.enableBtn(false);
		const ok = await this.#chkEnv(true);	// 再確認なので bun も調べ直す
		this.#workSps.enableBtn(ok);
		if (ok) await this.chkLastSNVer(this.#workSps.aLocalSNVer);
		else this.#openEnvInfo();
	}
	readonly #onDidChangeTreeData = new EventEmitter<TreeItem | undefined>;
	readonly onDidChangeTreeData = this.#onDidChangeTreeData.event;

	readonly getTreeItem = (t: TreeItem)=> t;

	// 起動時？ と refreshボタンで呼ばれる
	getChildren(t?: TreeItem): TreeItem[] {
		if (! t) return Object.values(ActivityBar.#hEnv).map(v=> v.ti);

		const ret: TreeItem[] = [];
		if (t.label === 'Node.js') ActivityBar.#hEnv.NODE.ti.iconPath = oIcon(ActivityBar.#hEnv.NODE.ready ?'node-js-brands' :'error');
		return ret;
	}

	//MARK: 旧版の同居検出
	/**
	 * 旧版（`famibee2.skynovel2`）が入ったままなら警告する。
	 *
	 * Marketplace から削除された拡張機能の ID は復活しないため、再公開は
	 * **新しい extension name** になった（TODO §3.5）。結果、旧版と新版は
	 * VSCode から見て別の拡張機能で、**両方インストールできてしまう**。
	 * どちらも同じコマンド ID・ビュー ID を登録するので衝突する。
	 *
	 * 移行案内に書くだけでは読まれないので、実際に同居していたら知らせる。
	 * **記録して黙らせることはしない**（衝突は続いているのだから、
	 * 解消されるまで毎回出てよい）。
	 *
	 * ⚠️ **アンインストールはこちらから行わない。** 拡張機能の導入・削除を
	 * 自動で行わないのがこのプロジェクトの方針（TODO §5）。
	 * 拡張機能ビューを開くところまでで、押すのは利用者。
	 *
	 * 手順そのものは **GitHub Releases のリリースノートが担う**（専用ページは作らない）。
	 * この警告を見た人がまさに手順を知りたい相手なので、そこへの導線も出す
	 */
	async #chkOldExt() {
		if (! extensions.getExtension(ID_OLD_EXT)) return;

		const OPEN = '拡張機能ビューを開く';
		const DOC = '移行手順を見る';
		const a = await window.showWarningMessage(
			`旧版の拡張機能（${ID_OLD_EXT}）が入ったままです。`
			+ 'コマンドとビューが衝突して誤動作するので、旧版をアンインストールしてください。',
			OPEN, DOC,
		);
		if (a === OPEN) await commands.executeCommand(
			'workbench.extensions.search', '@installed skynovel',
		);
		else if (a === DOC) await env.openExternal(Uri.parse(URL_EXT_RELEASES));
	}

	//MARK: 拡張機能自身の更新確認
	/**
	 * 拡張機能の新版が出ていたら通知する。**通知のみで、取得もインストールもしない**
	 * （README・TODO §5 の方針）。
	 * Marketplace 配布が止まっている間、vsix で入れた拡張機能は VSCode が
	 * 自動更新しないため、これが唯一の告知手段になる
	 */
	async #chkLastExtVer() {
		if (! workspace.getConfiguration().get<boolean>(CFG_CHK_EXT_VER, true)) return;

		const verNow = (<T_PKG_JSON>this.ctx.extension.packageJSON).version;
		try {
			const res = await fetch(URL_EXT_LATEST, {
				headers: {accept: 'application/vnd.github+json'},
			});
			if (! res.ok) return;	// レート制限（未認証は60回/時）等。黙って諦める

			const {tag_name} = <{tag_name?: string}>await res.json();
			if (! tag_name) return;

			const verNew = tag_name.replace(/^v/, '');
			if (verNum(verNew) <= verNum(verNow)) return;

			// 一度応答した版は繰り返し知らせない
			if (this.ctx.globalState.get<string>(KEY_SKIP_EXT_VER) === verNew) return;

			const OPEN = 'リリースページを開く';
			const STOP = '今後知らせない';
			const a = await window.showInformationMessage(
				`SKYNovel 拡張機能の新版 v${verNew} があります（お使いのものは v${verNow}）。`
				+ 'Marketplace が利用できないため、自動では更新されません。',
				OPEN, STOP,
			);
			// ボタンを押さずに閉じた場合は記録しない。見逃した人に次回も知らせる
			// （これが唯一の告知手段なので）。うるさい場合は STOP で止められる
			if (! a) return;
			await this.ctx.globalState.update(KEY_SKIP_EXT_VER, verNew);

			if (a === OPEN) await env.openExternal(Uri.parse(URL_EXT_RELEASES));
			else await workspace.getConfiguration()
				.update(CFG_CHK_EXT_VER, false, ConfigurationTarget.Global);
		}
		catch (e: unknown) {console.error('fn:ActivityBar.ts #chkLastExtVer %o', e)}
	}

	//MARK: ネットの更新確認
	async chkLastSNVer(aLocalSNVer: T_LocalSNVer[]) {
		let newVerEsmSN = '';
		let newVerCjsSN = '';
		let newVerEsmTemp = '';
		let newVerCjsTemp = '';
		await Promise.allSettled([
			fetch('https://raw.githubusercontent.com/famibee/skynovel_esm/main/package.json')
			.then(async res=> {
				const json = <{version: string}>await res.json();
				if (! ('version' in json)) throw 'ネット上の package.json が異常です(esm)';
				newVerEsmSN = json.version;
				const tiSV = ActivityBar.#hEnv.SN_ESM_VER.ti;
				tiSV.description = '-- ' + newVerEsmSN;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			})
			.catch((e: unknown)=> console.error('fn:ActivityBar.ts esm %o', e))
			,
			fetch('https://raw.githubusercontent.com/famibee/tmp_esm_uc/main/CHANGELOG.md')
			.then(async res=> {
				const txt = await res.text();
				newVerEsmTemp = /\n## v(.+)\s/.exec(txt)?.[1] ?? '';
				const tiSV = ActivityBar.#hEnv.TEMP_ESM_VER.ti;
				tiSV.description = '-- ' + newVerEsmTemp;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),

			fetch('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json')
			.then(async res=> {
				const json = <{version: string}>await res.json();
				if (! ('version' in json)) throw 'ネット上の package.json が異常です(cjs)';
				newVerCjsSN = json.version;
				const tiSV = ActivityBar.#hEnv.SN_CJS_VER.ti;
				tiSV.description = '-- ' + newVerCjsSN;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			})
			.catch((e: unknown)=> console.error('fn:ActivityBar.ts cjs %o', e))
			,
			fetch('https://raw.githubusercontent.com/famibee/tmp_cjs_uc/main/CHANGELOG.md')
			.then(async res=> {
				const txt = await res.text();
				newVerCjsTemp = /\n## v(.+)\s/.exec(txt)?.[1] ?? '';
				const tiSV = ActivityBar.#hEnv.TEMP_CJS_VER.ti;
				tiSV.description = '-- ' + newVerCjsTemp;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),
		]);

		for (const o of aLocalSNVer) {
			const newVerSN = o.is_new_tmp ?newVerEsmSN :newVerCjsSN;
			const newVerTemp = o.is_new_tmp ?newVerEsmTemp :newVerCjsTemp;

			if (o.ver_temp && newVerTemp !== o.ver_temp) {
				window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください（テンプレ ${o.ver_temp}->${newVerTemp}）`);
				return;
			}
			if (o.ver_sn === '' || o.ver_sn.startsWith('ile:') || o.ver_sn.startsWith('./')) return;

			if (newVerSN !== o.ver_sn) window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください（エンジン ${o.ver_sn}->${newVerSN}）`);
		}
	}

	//MARK: 環境確認パネル
	#wp: WebviewPanel | null = null;
	#openEnvInfo() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#wp) {this.#wp.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/views';
		const uf_path_doc = Uri.file(path_doc);
		this.#wp = window.createWebviewPanel('SKYNovel-envinfo', '開発環境準備', column ?? ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [uf_path_doc],
		});
		this.#wp.onDidDispose(()=> {this.#wp = null});	// 閉じられたとき

		readFile(path_doc +'/envinfo.htm', 'utf-8', (e, inp)=> {
			if (e) throw e;
			if (! this.#wp) return;

			const wv = this.#wp.webview;
			this.#wp.webview.html = repWvUri(inp, wv, uf_path_doc);
		});
	}

	//MARK: テンプレ選択パネル
	#openTempWizard() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#wp) {this.#wp.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/views';
		const uf_path_doc = Uri.file(path_doc);
		const wp = this.#wp = window.createWebviewPanel('SKYNovel-tmpwiz', 'テンプレートから始める', column ?? ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [uf_path_doc],
		});
		wp.onDidDispose(()=> {this.#wp = null});	// 閉じられたとき

		wp.webview.onDidReceiveMessage((m: T_TMPWIZ)=> {
//console.log(`fn:ActivityBar.ts line:198 common m:%o`, m);
			switch (m.cmd) {
			case 'get':		wp.webview.postMessage({cmd: 'res', o: {}});	break;
			case 'info':	window.showInformationMessage(m.text); break;

			case 'input':
				if (m.id !== 'save_ns') break;

				// プロジェクトフォルダ名（半角英数記号）を指定
				this.#save_ns = m.val;
//console.log(`fn:ActivityBar.ts #openTempWizard id:${m.id} v:${m.val} chk:${this.#chkSave_ns()}`);
				wp.webview.postMessage({cmd: 'vld', o: {
					id		: 'save_ns',
					valid	: this.#chkSave_ns(),
				}});
				break;

			case 'tmp_cjs_hatsune':
			case 'tmp_cjs_uc':
			case 'tmp_cjs_sample':
			case 'tmp_esm_uc':
				if (! this.#chkSave_ns()) break;
				if (! this.#canTempWizard) {
					window.showInformationMessage('拡張機能の起動中です。しばしお待ち下さい');
					break;
				}

				// プロジェクトフォルダを置くパスを選んでもらう
				window.showOpenDialog({
					title	: 'プロジェクトフォルダを置く場所を指定して下さい',
					canSelectMany	: false,
					openLabel		: 'フォルダを選択',
					canSelectFiles	: false,
					canSelectFolders: true,
				})
				.then(fileUri=> {
					const path_dl = fileUri?.[0]?.fsPath;
					if (! path_dl) return;	// キャンセル

					// 既存のフォルダがある際はエラー中断で検討させる
					const fnTo = path_dl +'/'+ this.#save_ns;
					if (existsSync(fnTo)) {
						window.showErrorMessage(`既存のフォルダ ${this.#save_ns} があります`, {detail: 'フォルダ名を変えるか、既存のフォルダを削除して下さい', modal: true});
						return;
					}

					// テンプレートからプロジェクト作成
					this.#crePrjFromTmp(m.cmd, fnTo);
				});
				break;
			}
		}, false);

		readFile(path_doc +'/tmpwiz.htm', 'utf-8', (e, inp)=> {
			if (e) throw e;
			if (! this.#wp) return;

			const wv = this.#wp.webview;
			this.#wp.webview.html = repWvUri(inp, wv, uf_path_doc);
		});
	}
		#canTempWizard	= false;
	//MARK: テンプレから作成
	readonly	#crePrjFromTmp = (nm: string, fnTo: string)=> window.withProgress({
		location	: ProgressLocation.Notification,
		title		: 'テンプレートからプロジェクト作成',
		cancellable	: true,
	}, async (prg, tknCancel)=> {
		const td = tmpdir() +`/${nm}/`;
		await remove(td);
		await mkdirs(td);
		const pathZip = td +`${nm}.zip`;
		await remove(pathZip);
		const ac = new AbortController;
		let fncAbort = ()=> ac.abort();
		tknCancel.onCancellationRequested(()=> {fncAbort(); return void remove(td)});

		return new Promise<void>((re, rj)=> {
			// == zipダウンロード＆解凍
			const url = URL_TMP_ZIP(nm);
			prg.report({increment: 10, message: `ダウンロード中 ${url}`,});	// 取得元を明示
			const {signal} = ac;
			fetch(url, {signal})
			.then(async res=> {
				fncAbort = ()=> { /* empty */ };
				prg.report({increment: 40, message: 'ZIP生成中',});
				if (tknCancel.isCancellationRequested || ! res.ok) {rj(new Error('キャンセルボタンが押されました')); return;}

				const ab = await res.arrayBuffer();
				await writeFile(pathZip, Buffer.from(ab));
				prg.report({increment: 10, message: 'ZIP解凍中',});
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				new AdmZip(pathZip).extractAllTo(td, true);	// overwrite
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (tknCancel.isCancellationRequested) {rj(new Error('キャンセルボタンが押されました')); return;}

				// == ファイル調整
				prg.report({increment: 10, message: 'ファイル調整',});

				// prj.json の置換
				const pathUnZip = td +`${nm}-main/`;
				const fnPrjJs = pathUnZip +'doc/prj/prj.json';
				const oPrj = <T_CFG_RAW>await readJson(fnPrjJs, {encoding: 'utf8'});
				oPrj.save_ns = this.#save_ns;
				oPrj.debuger_token = '';
				await outputJson(fnPrjJs, oPrj, {spaces: '\t'});

				// package.json の置換
				const fnPkgJs = pathUnZip +'package.json';
				replaceRegsFile(fnPkgJs, [
					[
						/("name"\s*:\s*").*(")/,
						`$1${this.#save_ns}$2`,
					],
					[
						/("(?:appBundleId|appId)"\s*:\s*").*(")/g,
						`$1com.fc2.blog.famibee.skynovel.${this.#save_ns}$2`,
					],
					[
						/("artifactName"\s*:\s*").*(")/,
						'$1${name}-${version}-${arch}.${ext}$2',
					],
				], false);

				// フォルダ名変更と移動
				await move(pathUnZip, fnTo);

				prg.report({increment: 30, message: '完了。フォルダを開きます',});
				setTimeout(()=> {
					if (tknCancel.isCancellationRequested) {rj(new Error('キャンセルボタンが押されました')); return;}

					// フォルダをワークスペースで開く
					commands.executeCommand('vscode.openFolder', Uri.file(fnTo), false);
					re();
				}, 4000);
			})
			.catch((e: unknown)=> window.showErrorMessage(`エラーです:${String(e)}`));
		});
	});
	#save_ns	= '';
	#chkSave_ns = ()=> /^([a-zA-Z0-9!-/:-@¥[-`{-~]{1,})$/.test(this.#save_ns);	// https://regex101.com/r/JGxtnR/1
		// 正規表現を可視化してまとめたチートシート - Qiita https://qiita.com/grrrr/items/0b35b5c1c98eebfa5128


	//MARK: テンプレから更新
	readonly updPrjFromTmp = (fnTo: string)=> window.withProgress({
		location	: ProgressLocation.Notification,
		title		: 'テンプレートからプロジェクト更新',
		cancellable	: true,
	}, async (prg, tknCancel)=> {
		if (! existsSync(fnTo + '/CHANGELOG.md')) return Promise.reject(new Error('CHANGELOG.md がありません'));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const oOldPkgJS = await readJson(fnTo +'/package.json', {encoding: 'utf8'});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const nm: string = oOldPkgJS.repository.url.match(/git@github\.com:famibee\/(\w+)\./)?.[1] ?? '';

		const td = tmpdir() +'/SKYNovel/';
		await remove(td);
		await mkdirs(td);
		const pathZip = td +`${nm}.zip`;
		const ac = new AbortController;
		let fncAbort = ()=> ac.abort();
		tknCancel.onCancellationRequested(()=> {fncAbort(); return remove(td)});

		return new Promise<void>((re, rj)=> {
			// == zipダウンロード＆解凍
			const url = URL_TMP_ZIP(nm);
			prg.report({increment: 10, message: `ダウンロード中 ${url}`,});	// 取得元を明示
			const {signal} = ac;
			fetch(url, {signal})
			.then(async res=> {
				fncAbort = ()=> { /* empty */ };
				prg.report({increment: 40, message: 'ZIP生成中',});
				if (tknCancel.isCancellationRequested || ! res.ok) {rj(new Error('キャンセルボタンが押されました')); return;}

				const ab = await res.arrayBuffer();
				await writeFile(pathZip, Buffer.from(ab));
				prg.report({increment: 10, message: 'ZIP解凍中',});
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				new AdmZip(pathZip).extractAllTo(td, true);	// overwrite
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (tknCancel.isCancellationRequested) {rj(new Error('キャンセルボタンが押されました')); return;}

				// == ファイル調整
				prg.report({increment: 10, message: 'ファイル調整',});

				const pathUnZip = td +`${nm}-main/`;
				const copy = async (fn: string, chkExists = false)=> {
					if (chkExists && ! existsSync(fnTo +'/'+ fn)) return (()=> { /* empty */ })();
					return copyFile(pathUnZip + fn, fnTo +'/'+ fn)
				};
				// build/		// しばしノータッチ

				const is_new_tmp = existsSync(pathUnZip +'src/plugin/');
				const fld_src = is_new_tmp ?'src' :'core';
				await Promise.allSettled([
					copy(`${fld_src}/plugin/humane/index.js`, true),
					// src/app4webpack.js	やや難
					copy(`${fld_src}/wds.config.js`),
					// src/web4webpack.js	やや難
					copy(`${fld_src}/webpack.config.js`),

					// doc/prj/		// しばしノータッチ

					copy('CHANGELOG.md'),
				]);

				// package.json
				const oNewPkgJS = <T_PKG_JSON>await readJson(pathUnZip +'package.json', {encoding: 'utf8'});
				const lib_name = `@famibee/skynovel${is_new_tmp ?'_esm': ''}`
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				const v = <string>oOldPkgJS.dependencies[lib_name];
				if (v.startsWith('ile:') || v.startsWith('./')) {
					oNewPkgJS.dependencies[lib_name] = v;
				}
				await outputJson(fnTo +'/package.json', {
					...oOldPkgJS,
					dependencies	: oNewPkgJS.dependencies,
					devDependencies	: oNewPkgJS.devDependencies,
					scripts			: oNewPkgJS.scripts,
				}, {spaces: '\t'});
					// TODO: プラグインはまた別個にライブラリを考慮し更新

				prg.report({increment: 30, message: 'ファイル準備完了',});
				setTimeout(re, 4000);
			})
			.catch((e: unknown)=> window.showErrorMessage(`エラーです:${String(e)}`));
		});
	});

}
