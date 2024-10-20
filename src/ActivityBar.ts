/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2024 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {docsel, is_win, replaceRegsFile, v2fp} from './CmnLib';
import {WorkSpaces} from './WorkSpaces';
import {ToolBox} from './ToolBox';
import {TreeDPDoc} from './TreeDPDoc';
const AdmZip = require('adm-zip');

import {TreeDataProvider, TreeItem, ExtensionContext, window, commands, Uri, EventEmitter, WebviewPanel, ViewColumn, ProgressLocation, languages, workspace} from 'vscode';
import {exec} from 'child_process';
import {tmpdir} from 'os';
import {copyFile, ensureDir, existsSync, move, outputJson, readFile, readJson, remove, writeFile} from 'fs-extra';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';


export const enum eTreeEnv {
	NODE = 0,
	NPM,
	SKYNOVEL_VER,
	TEMP_VER,
	PY_FONTTOOLS,
};


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
	light	: extPath +`/res/light/${name}.svg`,
	dark	: extPath +`/res/dark/${name}.svg`,
}};




export class ActivityBar implements TreeDataProvider<TreeItem> {
	//MARK: 処理冒頭
	static start(ctx: ExtensionContext) {
		extPath = ctx.extensionPath;

		ActivityBar.#actBar = new ActivityBar(ctx);
	}
	static #actBar: ActivityBar;
	static stop() {ActivityBar.#actBar.#dispose();}


	readonly #aEnv: {label: string, icon: string}[]	= [
		{icon: 'node-js-brands',label: 'Node.js',},
		{icon: 'npm-brands',	label: 'npm',},
		{icon: 'skynovel',		label: 'SKYNovel（最新）',},
		{icon: 'skynovel',		label: 'テンプレ（最新）',},
		{icon: 'python-brands',	label: 'fonttools',},
	];
	readonly #aTiEnv: TreeItem[] = [];
	static aReady	= [false, false, false, false, false];

	#workSps;
	#tlBox	: ToolBox;


	//MARK: コンストラクタ
	private constructor(private readonly ctx: ExtensionContext) {
		// LSP
		const module = ctx.asAbsolutePath('dist/LangSrv.js');
		const so: ServerOptions = {
			run		: {module, transport: TransportKind.ipc},
			debug	: {module, transport: TransportKind.ipc,
				options: {execArgv: ['--nolazy',
				'--inspect='+ (7000 + Math.round(Math.random() *999))
			//	'--inspect=6009'	// .vscode/launch.json とポート番号を合わせる
			]},}
		};
		const co: LanguageClientOptions = {
			documentSelector: [docsel],
			synchronize: {
				fileEvents: [
//					workspace.createFileSystemWatcher('**/.clientrc'),
					workspace.createFileSystemWatcher('**/doc/prj/path.json'),
						// LSPへファイル名キーワード更新のための情報提供
				],
			},
		};
		const lsp = new LanguageClient(
			'SKYNovelLangSrv',
			'SKYNovel Language Server',	// 開発ホストの【出力】タブに出る名前
			so,
			co,
		);
		ctx.subscriptions.push({dispose: ()=> lsp.stop()});

		// WorkSpaces
		this.#workSps = new WorkSpaces(ctx, this);

		// link WorkSpaces & LSP
		ctx.subscriptions.push(lsp.onRequest(ActivityBar.#REQ_ID, hd=> {
			switch (hd.cmd) {
				case 'log':		// 本来はリリース版で 'log' をコメントすべきだが
				case 'error':	console.error(hd.txt);	return;
			}
//console.log(`060 fn:ActivityBar.ts ⬇ lsp.onRequest hd:${JSON.stringify(hd).slice(0, 200)}`);
			this.#workSps.onRequest(hd);
		}));

		// 環境設定チェック
		this.#aTiEnv = this.#aEnv.map(v=> {
			const ti = new TreeItem(v.label);
			if (v.label) ti.iconPath = oIcon(v.icon);
			ti.contextValue = v.label;
			return ti;
		});
		ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-dev', this));
		ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-doc', new TreeDPDoc(ctx)));
		ctx.subscriptions.push(commands.registerCommand('skynovel.TempWizard', ()=> this.#openTempWizard()));

		Promise.allSettled([
			lsp.start(),
			this.#chkEnv(()=> {
				ctx.subscriptions.push(commands.registerCommand('skynovel.refreshEnv', ()=> this.#refreshEnv()));	// refreshボタン
				ctx.subscriptions.push(commands.registerCommand('skynovel.dlNode', ()=> this.#openEnvInfo()));

				this.#tlBox = ToolBox.init(ctx);

				ctx.subscriptions.push(languages.registerHoverProvider(docsel, this.#workSps));
			}),
		]).then(()=> {
			ctx.subscriptions.push(window.registerTreeDataProvider('skynovel-ws', this.#workSps));
			this.#canTempWizard = true;

			this.#workSps.start((cmd, uriWs, o)=> {
				// console.error - 本番でも【出力】-【ログ（ウインドウ）】に出力される
//console.log(`030 fn:ActivityBar.ts ⬆ lsp.sendRequest cmd:${cmd} pathWs=${v2fp(uriWs.path)}=`);
				lsp.sendRequest(ActivityBar.#REQ_ID, {cmd, pathWs: v2fp(uriWs.path), o});
			});
		});
	}
	static readonly #REQ_ID = ':SKYNovel:';

	#dispose() {
		if (this.#pnlWV) this.#pnlWV.dispose();
		this.#workSps.dispose();
		this.#tlBox.dispose();
	}

	//MARK: 環境確認
	async #chkEnv(finish: (ok: boolean)=> void) {
		const tiNode = this.#aTiEnv[eTreeEnv.NODE];
		const tiNpm = this.#aTiEnv[eTreeEnv.NPM];
		const tiPFT = this.#aTiEnv[eTreeEnv.PY_FONTTOOLS];
		ActivityBar.aReady[eTreeEnv.NODE] = false;
		ActivityBar.aReady[eTreeEnv.NPM] = false;
		ActivityBar.aReady[eTreeEnv.PY_FONTTOOLS] = false;
		exec('pip list', async (e, stdout)=> {
			if (e) {
				tiPFT.description = `-- pip error`;
				tiPFT.iconPath = oIcon('error');
				this.#onDidChangeTreeData.fire(tiPFT);
				finish(false);
				return;
			}
			if (! /^fonttools\s/gm.test(stdout)
			|| ! /^brotli\s/gm.test(stdout)) await new Promise<void>(re=> exec(`pip install ${is_win ?'--user ' :''}fonttools brotli`, e=> {
				if (e) {
					tiPFT.description = `-- install失敗`;
					tiPFT.iconPath = oIcon('error');
					this.#onDidChangeTreeData.fire(tiPFT);
					finish(false);
					return;
				}
				re();
			}));
			ActivityBar.aReady[eTreeEnv.PY_FONTTOOLS] = true;
			tiPFT.description = `-- ready`;
			tiPFT.iconPath = oIcon('python-brands');
			this.#onDidChangeTreeData.fire(tiPFT);

			// fonttools用、環境変数PATHに pyftsubset.exe があるパスを追加
			if (is_win) {
				exec('python -m site --user-site', async (e, stdout)=> {
					if (e) {finish(false); return;}		// ありえないが
					const path = stdout.slice(0, -15) +'Scripts\\;';
					const col = this.ctx.environmentVariableCollection;
					col.prepend('PATH', path);
				});
			}
		});
		await new Promise<void>(re=> exec('node -v', (e, stdout)=> {
			if (e) {
				tiNode.description = `-- 見つかりません`;
				tiNode.iconPath = oIcon('error');
				this.#onDidChangeTreeData.fire(tiNode);

				tiNpm.description = `-- （割愛）`;
				tiNpm.iconPath = oIcon('error');
				this.#onDidChangeTreeData.fire(tiNpm);
				finish(false);
				return;
			}

			const vNode = String(stdout).slice(1, -1);
			const splVNode = vNode.split('.');
			const nVNode = Number(splVNode[0]) *1_000_000
				+Number(splVNode[1]) *1_000 +Number(splVNode[2]);
				// compare-versions だと windows10 で不具合になるので手作りに
			if (nVNode < 22_010_000) {
				tiNode.description = `-- ${vNode} (22.10.0 以上必須)`;
				tiNode.iconPath = oIcon('error');
				this.#onDidChangeTreeData.fire(tiNode);

				tiNpm.description = `-- （割愛）`;
				tiNpm.iconPath = oIcon('error');
				this.#onDidChangeTreeData.fire(tiNpm);
				finish(false);
				return;
			}
			ActivityBar.aReady[eTreeEnv.NODE] = true;
			tiNode.description = `-- ${vNode}`;
			tiNode.iconPath = oIcon('node-js-brands');
			this.#onDidChangeTreeData.fire(tiNode);
			re();
		}));
		await new Promise<void>(re=> exec('npm -v', (e, stdout)=> {
			if (e) {
				tiNpm.description = `-- 見つかりません`;
				tiNpm.iconPath = oIcon('error');
				this.#onDidChangeTreeData.fire(tiNpm);
				finish(false);
				return;
			}
			ActivityBar.aReady[eTreeEnv.NPM] = true;
			tiNpm.description = `-- ${stdout.trimEnd()}`;
			tiNpm.iconPath = oIcon('npm-brands');
			this.#onDidChangeTreeData.fire(tiNpm);
			re();
		}));
		finish(true);
	}

	// refreshEnvボタン
	#refreshEnv() {
		this.#workSps.enableBtn(false);
		this.#chkEnv(ok=> {
			this.#workSps.enableBtn(ok);
			if (ok) this.#workSps.refreshEnv();
			else this.#openEnvInfo();
		});
	}
	readonly #onDidChangeTreeData = new EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData = this.#onDidChangeTreeData.event;

	readonly getTreeItem = (t: TreeItem)=> t;

	// 起動時？　と refreshボタンで呼ばれる
	getChildren(t?: TreeItem): Thenable<TreeItem[]> {
		if (! t) return Promise.resolve(this.#aTiEnv);

		const ret: TreeItem[] = [];
		if (t.label === 'Node.js') this.#aTiEnv[eTreeEnv.NODE].iconPath = oIcon((ActivityBar.aReady[eTreeEnv.NODE]) ?'node-js-brands' :'error');
		return Promise.resolve(ret);
	}

	//MARK: ネットの更新確認
	async chkLastSNVer(aLocalSNVer: {verSN: string, verTemp: string}[]) {
		let newVerSN = '';
		let newVerTemp = '';
		await Promise.allSettled([
			fetch('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json')
			.then(res=> res.json())
			.then(json=> {
				newVerSN = json.version;
				const tiSV = this.#aTiEnv[eTreeEnv.SKYNOVEL_VER];
				tiSV.description = '-- ' + newVerSN;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),
			fetch('https://raw.githubusercontent.com/famibee/SKYNovel_uc/master/CHANGELOG.md')
			.then(res=> res.text())
			.then(txt=> {
				newVerTemp = txt.match(/## v(.+)\s/)?.[1] ?? '';
				const tiSV = this.#aTiEnv[eTreeEnv.TEMP_VER];
				tiSV.description = '-- ' + newVerTemp;
				ActivityBar.#actBar.#onDidChangeTreeData.fire(tiSV);
			}),
		]);
		aLocalSNVer.forEach(async o=> {
			if (o.verTemp && newVerTemp !== o.verTemp) {
				window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください（テンプレ）`);
				return;
			}

			if (o.verSN === '' || o.verSN.slice(0, 4) === 'ile:') return;
			if (newVerSN !== o.verSN) window.showInformationMessage(`更新があります。【ベース更新】ボタンを押してください（エンジン）`);
		});
	}

	//MARK: 環境確認パネル
	#pnlWV: WebviewPanel | null = null;
	#openEnvInfo() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {this.#pnlWV.reveal(column); return;}

		const pathDoc = this.ctx.extensionPath +'/views';
		const uriDoc = Uri.file(pathDoc);
		this.#pnlWV = window.createWebviewPanel('SKYNovel-envinfo', '開発環境準備', column || ViewColumn.One, {
			enableScripts: false,
			localResourceRoots: [uriDoc],
		});
		this.#pnlWV.onDidDispose(()=> this.#pnlWV = null);	// 閉じられたとき

		readFile(pathDoc +'/envinfo.htm', 'utf-8', (e, data)=> {
			if (e) throw e;

			const wv = this.#pnlWV!.webview;
			this.#pnlWV!.webview.html = data
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replaceAll(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uriDoc)}/`);
		});
	}

	//MARK: テンプレ選択パネル
	#openTempWizard() {
		const column = window.activeTextEditor?.viewColumn;
		if (this.#pnlWV) {this.#pnlWV.reveal(column); return;}

		const path_doc = this.ctx.extensionPath +'/views';
		const uf_path_doc = Uri.file(path_doc);
		const wp = this.#pnlWV = window.createWebviewPanel('SKYNovel-tmpwiz', 'テンプレートから始める', column || ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [uf_path_doc],
		});
		wp.onDidDispose(()=> this.#pnlWV = null);	// 閉じられたとき

		wp.webview.onDidReceiveMessage(m=> {
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

			case 'tmp_hatsune':
			case 'tmp_uc':
			case 'tmp_sample':
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
				}).then(fileUri=> {
					const path_dl = fileUri?.[0]?.fsPath;
					if (! path_dl) return;	// キャンセル

					// 既存のフォルダがある際はエラー中断で検討させる
					const fnTo = path_dl +'/'+ this.#save_ns;
					if (existsSync(fnTo)) {
						window.showErrorMessage(`既存のフォルダ ${this.#save_ns} があります`, {detail: 'フォルダ名を変えるか、既存のフォルダを削除して下さい', modal: true});
						return;
					}

					// テンプレートからプロジェクト作成
					this.#crePrjFromTmp(m.cmd.slice(4), fnTo);
				})
				break;
			}
		}, false);

		readFile(path_doc +'/tmpwiz.htm', 'utf-8', (e, data)=> {
			if (e) throw e;

			const wv = this.#pnlWV!.webview;
			this.#pnlWV!.webview.html = data
			.replaceAll('${webview.cspSource}', wv.cspSource)
			.replace(/(href|src)="\.\//g, `$1="${wv.asWebviewUri(uf_path_doc)}/`);
		});
	}
		#canTempWizard	= false;
	//MARK: テンプレから作成
	readonly	#crePrjFromTmp = (nm: string, fnTo: string)=> window.withProgress({
		location	: ProgressLocation.Notification,
		title		: 'テンプレートからプロジェクト作成',
		cancellable	: true,
	}, async (prg, tknCancel)=> {
		const td = tmpdir() +'/SKYNovel/';
		await remove(td);
		ensureDir(td);
		const pathZip = td +`temp_${nm}.zip`;
		const pathUnZip = td +`SKYNovel_${nm}-master/`;
		await remove(pathZip);
		const ac = new AbortController;
		let fncAbort = ()=> ac.abort();
		tknCancel.onCancellationRequested(()=> {fncAbort(); return remove(td)});

		return new Promise<void>((re, rj)=> {
			// == zipダウンロード＆解凍
			prg.report({increment: 10, message: 'ダウンロード中',});
			const {signal} = ac;
			fetch(`https://github.com/famibee/SKYNovel_${nm}/archive/master.zip`, {signal})
			.then(async res=> {
				fncAbort = ()=> {};
				prg.report({increment: 40, message: 'ZIP生成中',});
				if (tknCancel.isCancellationRequested || ! res.ok) {rj(); return;}

				const ab = await res.arrayBuffer();
				await writeFile(pathZip, Buffer.from(ab));
				prg.report({increment: 10, message: 'ZIP解凍中',});
				new AdmZip(pathZip).extractAllTo(td, true);	// overwrite
				if (tknCancel.isCancellationRequested) {rj(); return;}

				// == ファイル調整
				prg.report({increment: 10, message: 'ファイル調整',});

				// prj.json の置換
				const fnPrjJs = pathUnZip +'doc/prj/prj.json';
				const oPrj = await readJson(fnPrjJs, {encoding: 'utf8'});
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
						`$1${this.#save_ns}-\${version}-\${arch}.\${ext}$2`,
					],
				], false);

				// フォルダ名変更と移動
				await move(pathUnZip, fnTo);

				prg.report({increment: 30, message: '完了。フォルダを開きます',});
				setTimeout(()=> {
					if (tknCancel.isCancellationRequested) {rj(); return;}

					// フォルダをワークスペースで開く
					commands.executeCommand('vscode.openFolder', Uri.file(fnTo), false);
					re();
				}, 4000);
			})
			.catch(reason=> window.showErrorMessage(`エラーです:${reason}`));
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
		if (! existsSync(fnTo + '/CHANGELOG.md')) return Promise.reject();

		const oOldPkgJS = await readJson(fnTo +'/package.json', {encoding: 'utf8'});
		const nm = oOldPkgJS.repository.url.match(/\/SKYNovel_(\w+)\./)?.[1] ?? '';

		const td = tmpdir() +'/SKYNovel/';
		await remove(td);
		ensureDir(td);
		const pathZip = td +`temp_${nm}.zip`;
		const pathUnZip = td +`SKYNovel_${nm}-master/`;
		const ac = new AbortController;
		let fncAbort = ()=> ac.abort();
		tknCancel.onCancellationRequested(()=> {fncAbort(); return remove(td)});

		return new Promise<void>((re, rj)=> {
			// == zipダウンロード＆解凍
			prg.report({increment: 10, message: 'ダウンロード中',});
			const {signal} = ac;
			fetch(`https://github.com/famibee/SKYNovel_${nm}/archive/master.zip`, {signal})
			.then(async res=> {
				fncAbort = ()=> {};
				prg.report({increment: 40, message: 'ZIP生成中',});
				if (tknCancel.isCancellationRequested || ! res.ok) {rj(); return;}

				const ab = await res.arrayBuffer();
				await writeFile(pathZip, Buffer.from(ab));
				prg.report({increment: 10, message: 'ZIP解凍中',});
				new AdmZip(pathZip).extractAllTo(td, true);	// overwrite
				if (tknCancel.isCancellationRequested) {rj(); return;}

				// == ファイル調整
				prg.report({increment: 10, message: 'ファイル調整',});

				const copy = (fn: string, chkExists = false)=> {
					if (chkExists && ! existsSync(fnTo +'/'+ fn)) return;
					return copyFile(pathUnZip + fn, fnTo +'/'+ fn)
				};
				// build/		// しばしノータッチ

				copy('core/plugin/humane/index.js', true);
				// core/app4webpack.js	やや難
				copy('core/wds.config.js');
				// core/web4webpack.js	やや難
				copy('core/webpack.config.js');

				// doc/prj/		// しばしノータッチ
				// doc/app.js
				// doc/favicon.ico
				// doc/web.htm

				copy('CHANGELOG.md');

				// package.json
				const oNewPkgJS = await readJson(pathUnZip +'package.json', {encoding: 'utf8'});
				if (oOldPkgJS.dependencies['@famibee/skynovel'].slice(0, 8) === 'file:../') {
					oNewPkgJS.dependencies['@famibee/skynovel'] =
					oOldPkgJS.dependencies['@famibee/skynovel'];
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
			.catch(reason=> window.showErrorMessage(`エラーです:${reason}`));
		});
	});

}
