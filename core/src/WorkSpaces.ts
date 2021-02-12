/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {statBreak, is_win, treeProc, oIcon} from './CmnLib';
import {Project} from './Project';
import {initDebug} from './DebugAdapter';
import {CteScore} from './CteScore';
import {MyTreeItem, TREEITEM_CFG} from './MyTreeItem';

import {TreeDataProvider, ExtensionContext, TreeItem, tasks, TreeItemCollapsibleState, workspace, TaskProcessEndEvent, WorkspaceFoldersChangeEvent, EventEmitter, Event, WorkspaceFolder, window, Task, ShellExecution, Range, TextEditorDecorationType, TextEditor, env, Uri, debug} from 'vscode';

import {existsSync, readJsonSync, statSync, readFileSync, ensureDirSync, writeFileSync, createReadStream, createWriteStream} from 'fs-extra';
import archiver = require('archiver');
import {basename, dirname} from 'path';
import png2icons = require('png2icons');
const {execSync} = require('child_process');

interface DecChars {
	aRange		: Range[];
	decorator	: TextEditorDecorationType;
}

export class WorkSpaces implements TreeDataProvider<TreeItem> {
	private readonly	aTiRoot		: TreeItem[] = [];
	private readonly	oTiPrj		: {[name: string]: TreeItem[]} = {};

	private	readonly aTreeTmp	: TREEITEM_CFG[] = [
		{cmd: 'SnUpd',		icon: 'skynovel',	label: 'SKYNovel更新',
			npm: `npm un -S skynovel ${statBreak()
			} npm i @famibee/skynovel@latest ${statBreak()
			} npm run webpack:dev`},
		{cmd: 'LibUpd',		icon: 'plugin',		label: '全ライブラリ更新',
			npm: `ncu -u --target minor ${statBreak()
			} npm i ${statBreak()
			} npm run webpack:dev`},
		{cmd: 'ReBuild',	icon: 'gear',		label: 'リビルド',
			npm: 'npm run rebuild'},
		{cmd: 'PrjSet',		icon: 'gear',		label: '設定'},
		{cmd: 'Crypto',		icon: 'gear',		label: '暗号化'},
		{cmd: 'TaskWeb',	icon: 'browser',	label: '起動：ブラウザ版',
			npm: 'npm run web',		dbg: true,},
		{cmd: 'TaskApp',	icon: 'electron',	label: '起動：アプリ版',
			npm: 'npm run start',	dbg: true,},
		{cmd: '', icon: '',label: '生成', children: [
			{cmd: 'PackWin',	icon: 'windows',	label: 'Windows exe x64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -w --x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.exe"`},
			//	} ./node_modules/.bin/electron-builder -w --x64 --ia32`},
					// 一パッケージに統合型、ファイルサイズ二倍になる
			{cmd: 'PackWin32',	icon: 'windows',	label: 'Windows exe ia32',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -w --ia32 -c.artifactName="\${prj.title}-\${prj.version}-ia32.exe"`},
			{cmd: 'PackMac',	icon: 'macosx',		label: 'macOS dmg x64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -m dmg:x64 -c.artifactName="\${prj.title}-\${prj.version}-x64.dmg"`,
				forMac: true,},
			{cmd: 'PackMacArm64',	icon: 'macosx',	label: 'macOS dmg arm64',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -m dmg:arm64 -c.artifactName="\${prj.title}-\${prj.version}-arm64.dmg"`,
				forMac: true,},
				// Appleシリコンサポート| Electronブログ https://www.electronjs.org/blog/apple-silicon
					// 将来的にはarm64、x64アプリを1つのユニバーサルバイナリに「マージ」できるパッケージをリリースする予定ですが、このバイナリは巨大であり、ユーザーへの出荷にはおそらく理想的ではないことに注意してください。
			{cmd: 'PackLinux',	icon: 'linux',		label: 'Linux AppImage',
				npm: `npm run webpack:pro ${statBreak()
				} ./node_modules/.bin/electron-builder -l`},
				// Command Line Interface (CLI) - electron-builder https://www.electron.build/cli
			{cmd: 'PackFreem',	icon: 'freem',		label: 'ふりーむ！形式 zip',
				npm: 'npm run webpack:pro'},
		]},
	];
	private	readonly idxDevSnUpd	= 0;
	private	readonly idxDevCrypto	= 4;

	private hPrj	: {[dir: string]: Project}	= {};

	constructor(private readonly ctx: ExtensionContext, private readonly chkLastSNVer: ()=> void) {
		this.refresh();
		workspace.onDidChangeWorkspaceFolders(e=> this.refresh(e));

		tasks.onDidEndTaskProcess(e=> this.hOnEndTask?.[e.execution.task.name](e));

		this.onUpdDoc(window.activeTextEditor);
		window.onDidChangeActiveTextEditor(te=> this.onUpdDoc(te), null, ctx.subscriptions);
		workspace.onDidCloseTextDocument(td=> {
			if (this.teActive?.document === td) this.teActive = undefined;
		});
		workspace.onDidChangeTextDocument(e=> {
			if (e.document === this.teActive?.document) this.onUpdDoc(this.teActive);
		}, null, ctx.subscriptions);

		// デバッガ
		const emDbgLayTd: EventEmitter<TreeItem | undefined> = new EventEmitter();
		initDebug(ctx, o=> {
			switch (o.タグ名) {
				case ':connect':
					this.tiLayers = [];
					break;
				case ':disconnect':
					this.tiLayers = [];
					emDbgLayTd.fire(undefined);
					break;

				case 'add_lay':{
					const t = new TreeItem(o.layer);
					if (o.class === 'txt') {
						t.iconPath = oIcon('comment');
						t.tooltip = `文字レイヤ ${o.layer}`;
						t.collapsibleState = TreeItemCollapsibleState.Expanded;
					}
					else {
						t.iconPath = oIcon(o.layer === 'base' ?'image' :'user');
						t.tooltip = `画像レイヤ ${o.layer}`;
					}
	//				t.collapsibleState = TreeItemCollapsibleState.Expanded;
					t.command = {
						command: 'skynovel.tiLayers.selectNode',
						title: 'Select Node',
						arguments: [o.layer],
					};
					this.tiLayers.push(t);
					emDbgLayTd.fire(undefined);
				}	break;
			}
		});
		ctx.subscriptions.push(window.registerTreeDataProvider('sn-layers', {
			getChildren: (t?: TreeItem)=> {
				if (! t) return this.tiLayers;

				const icon: any = t.iconPath;
				const a: {label: string, icon: string}[]
				= icon.dark.slice(-11) === 'comment.svg'
				? [
					{label: 'ボタン',		icon: 'hand-point-down'},
//					{label: 'トゥイーン',	icon: 'object-group'},
				]
				: [
//					{label: '差分画像',		icon: 'images'},
//					{label: 'トゥイーン',	icon: 'object-group'},
				];
				return a.map(v=> {
					const ti = new TreeItem(v.label);
					ti.iconPath = oIcon(v.icon);
					ti.command = {
						command: 'skynovel.tiLayers.selectNode',
						title: 'Select Node',
						arguments: [t.label +'/'+ ti.label],
					};
					return ti;
				});
			},
			getTreeItem: t=> t,
			onDidChangeTreeData: emDbgLayTd.event,
		}));

		CteScore.init(ctx);
	}
	private	tiLayers	: TreeItem[]	= [];

	private tidDelay: NodeJS.Timer | null = null;
	private onUpdDoc(te: TextEditor | undefined) {
		if (! te) return;
		if (te.document.languageId !== 'skynovel') return;

		this.teActive = te;

		// 遅延
		if (this.tidDelay) clearTimeout(this.tidDelay);
		this.tidDelay = setTimeout(()=> this.updDeco(), 500);
	}

	private teActive: TextEditor | undefined;
	private decChars: DecChars = {
		aRange: [],
		decorator: window.createTextEditorDecorationType({})
	};
	private	static	readonly REG_FN_OR_LABEL = /(?<=\s)(?:fn|label)\s*=\s*([^\]\s]+)/g;
	private	updDeco() {
		if (! this.teActive) return;

		const doc = this.teActive.document;
		const src = doc.getText();

		window.setStatusBarMessage('');
		this.decChars.decorator.dispose();
		this.decChars = {
			aRange: [],
			decorator: window.createTextEditorDecorationType({
				'light': {'textDecoration': 'underline',},
				'dark': {'textDecoration': 'underline',}
			})
		}

		// fn属性やlabel属性の値に下線を引くように
		let m;
		// 全ループリセットかかるので不要	.lastIndex = 0;	// /gなので必要
		while (m = WorkSpaces.REG_FN_OR_LABEL.exec(src)) {
			this.decChars.aRange.push(new Range(
				doc.positionAt(m.index +m[0].length -m[1].length),
				doc.positionAt(m.index +m[0].length)
			));
		}
		this.teActive.setDecorations(this.decChars.decorator, this.decChars.aRange);
	}

	private refresh(e?: WorkspaceFoldersChangeEvent): void {
		const aFld = workspace.workspaceFolders;
		if (! aFld) return;	// undefinedだった場合はファイルを開いている

		// フォルダーを開いている（len>1 ならワークスペース）
		if (! e)  {
			// 起動時
			aFld.forEach(fld=> this.makePrj(fld));	// 生成
			this.aTiRoot[0].collapsibleState = TreeItemCollapsibleState.Expanded;	// 利便性的に先頭は開く
			this.emPrjTD.fire(undefined);
			return;
		}

		// フォルダ増減時
		if (e.added.length > 0) this.makePrj(aFld.slice(-1)[0]);
			// 最後の一つと思われる
		else {
			const nm = e.removed[0].name;	// 一つだけ対応
			const del = this.aTiRoot.findIndex(v=> v.label === nm);
			this.aTiRoot.splice(del, 1);

			const dir = e.removed[0].uri.fsPath;
			delete this.oTiPrj[dir];

			this.hPrj[dir].dispose();
		}
		this.emPrjTD.fire(undefined);
	}
	private readonly emPrjTD: EventEmitter<TreeItem | undefined> = new EventEmitter();
	readonly onDidChangeTreeData: Event<TreeItem | undefined> = this.emPrjTD.event;

	// WorkspaceFolder を TreeItem に反映
	private makePrj(wsFld: WorkspaceFolder) {
		const dir = wsFld.uri.fsPath;
		const existPkgJS = existsSync(dir +'/package.json');
		const isPrjValid = existPkgJS && existsSync(dir+'/doc/prj/prj.json');
		const t = new MyTreeItem({
			cmd		: '',
			icon	: '',
			label	: '',
			desc	: wsFld.name,
			children: isPrjValid ? this.aTreeTmp : [{
				cmd		: '',
				icon	: 'warn',
				label	: `${existPkgJS ?'prj' :'package'}.json がありません`,
			}],
		}, dir, this.ctx, (ti, btn_nm, cfg)=> this.onClickTreeItemBtn(wsFld, ti, btn_nm, cfg))
		t.collapsibleState = TreeItemCollapsibleState.Collapsed;
		this.aTiRoot.push(t);
		this.oTiPrj[dir] = t.children;	// プロジェクト追加

		if (! isPrjValid) return;

		this.updLocalSNVer(dir);
		this.hPrj[dir] = new Project(this.ctx, wsFld, title=> {
			t.label = title;
			this.emPrjTD.fire(t);
		});
		this.dspCryptoMode(dir);
	}
	// ローカル SKYNovel バージョン調査
	private updLocalSNVer(dir: string) {
		const o = readJsonSync(dir +'/package.json');
		const localVer = o?.dependencies['@famibee/skynovel']?.slice(1);
		this.oTiPrj[dir][this.idxDevSnUpd].description = localVer ?`-- ${localVer}` :'取得できません';
	}
	private dspCryptoMode(dir: string) {
		const tc = this.oTiPrj[dir];
		const fpf = this.hPrj[dir];
		tc[this.idxDevCrypto].description = `-- ${fpf.isCryptoMode ?'する' :'しない'}`;
	}

	private	hOnEndTask: {[nm: string]: (e: TaskProcessEndEvent)=> void}	= {};
	private onClickTreeItemBtn(wsFld: WorkspaceFolder, ti: TreeItem, btn_nm: string, cfg: TREEITEM_CFG) {
		const pathWs = wsFld.uri.fsPath;
		let cmd = `cd "${pathWs}" ${statBreak()} `;
		if (! existsSync(pathWs +'/node_modules')) cmd += `npm i ${statBreak()} `;		// 自動で「npm i」

		// メイン処理
		const prj = this.hPrj[pathWs];
		if (cfg.npm) cmd += cfg.npm
			.replace(/\${prj.title}/g, prj.title)
			.replace(/\${prj.version}/g, prj.version);
		switch (btn_nm) {	// タスク前処理
			case 'SnUpd':	this.chkLastSNVer();	break;
			case 'PrjSet':	prj.openPrjSetting();	return;
			case 'Crypto':
				window.showInformationMessage('暗号化（する / しない）を切り替えますか？', {modal: true}, 'はい')
				.then(a=> {
					if (a != 'はい') return;

					prj.tglCryptoMode();
					this.dspCryptoMode(pathWs);
					this.emPrjTD.fire(ti);
				});
				return;

			case 'TaskWebDbg':
				debug.startDebugging(wsFld, 'webデバッグ');	return;

			case 'TaskAppDbg':
				debug.startDebugging(wsFld, 'appデバッグ');	return;

			case 'PackFreem':
				let find_ng = false;
				treeProc(pathWs +'/doc/prj', url=> {
					if (find_ng || url.slice(-4) !== '.svg') return;

					find_ng = true;
					window.showErrorMessage(
						`ふりーむ！では svg ファイル使用禁止です。png などに置き換えて下さい`, 'フォルダを開く', 'Online Converter',
					)
					.then(a=> {switch (a) {
						case 'フォルダを開く':
							env.openExternal(Uri.file(dirname(url)));	break;
						case 'Online Converter':
							env.openExternal(Uri.parse('https://cancerberosgx.github.io/demos/svg-png-converter/playground/'));
							break;
					}});
				});
				if (find_ng) return;
				break;
		}

		// アイコン生成
		switch (btn_nm) {
			case 'TaskWeb':
			case 'TaskApp':
			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackLinux':
				const fnIcon = pathWs +'/build/icon.png';
				if (! existsSync(fnIcon)) break;

				const mtPng = statSync(fnIcon).mtimeMs;
				const bIconPng = readFileSync(fnIcon);
				ensureDirSync(pathWs +'/build/icon/');
				//png2icons.setLogger(console.log);
			{
				const fn = pathWs +'/build/icon/icon.icns';
				const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
				if (mtPng > mt) {
					const b = png2icons.createICNS(bIconPng, png2icons.BILINEAR, 0);
					if (b) writeFileSync(fn, b);
				}
			}
			{
				const fn = pathWs +'/build/icon/icon.ico';
				const mt = existsSync(fn) ?statSync(fn).mtimeMs :0;
				if (mtPng > mt) {
					const b = png2icons.createICO(bIconPng, png2icons.BICUBIC2, 0, false, true);
					if (b) writeFileSync(fn, b);
				}
			}
				break;
		}

		// Windowsでの PowerShell スクリプト実行ポリシーについて警告
		switch (btn_nm) {
			case 'PackWin':
			case 'PackWin32':
				if (! is_win) break;
				if (! /(Restricted|AllSigned)/.test(
					execSync('PowerShell Get-ExecutionPolicy'))) break;

				window.showErrorMessage(`管理者権限つきのPowerShell で実行ポリシーを RemoteSigned などに変更して下さい。\n例、管理者コマンドプロンプトで）PowerShell Set-ExecutionPolicy RemoteSigned`, {modal: true}, '参考サイトを開く')
				.then(a=> {if (a) env.openExternal(Uri.parse('https://qiita.com/Targityen/items/3d2e0b5b0b7b04963750'));});
				return;
		}

		const t = new Task(
			{type: 'SKYNovel '+ btn_nm},	// definition（タスクの一意性）
			wsFld,
			cfg.label,					// name、UIに表示
			'SKYNovel',					// source
			new ShellExecution(cmd),
		);
		switch (btn_nm) {	// タスク後処理
			case 'SnUpd':
			case 'LibUpd':
				this.hOnEndTask[cfg.label] = e=> {
					if (e.execution.task.definition.type !== t.definition.type) return;
					if (e.execution.task.source !== t.source) return;

					this.updLocalSNVer(pathWs);
					this.emPrjTD.fire(undefined);
				};
				break;

			case 'PackWin':
			case 'PackWin32':
			case 'PackMac':
			case 'PackLinux':
				this.hOnEndTask[cfg.label] = ()=> window.showInformationMessage(
					`${cfg.label} パッケージを生成しました`,
					'出力フォルダを開く',
				).then(a=> {if (a) env.openExternal(Uri.file(pathWs +'/build/package/'))});
				break;

			case 'PackFreem':	this.hOnEndTask[cfg.label] = ()=> {
				const arc = archiver.create('zip', {zlib: {level: 9},})
				.append(createReadStream(pathWs +'/doc/web.htm'), {name: 'index.html'})
				.append(createReadStream(pathWs +'/build/include/readme.txt'), {name: 'readme.txt'})
				.glob('web.js', {cwd: pathWs +'/doc/'})
				.glob('web.*.js', {cwd: pathWs +'/doc/'})
				.glob(`${
					prj.isCryptoMode ?Project.fldnm_crypto_prj :'prj'
				}/**/*`, {cwd: pathWs +'/doc/'})
				.glob('favicon.ico', {cwd: pathWs +'/doc/'});

				const fn_out = `${basename(pathWs)}_1.0freem.zip`;
				const ws = createWriteStream(pathWs +`/build/package/${fn_out}`)
				.on('close', ()=> window.showInformationMessage(
					`ふりーむ！形式で出力（${fn_out}）しました`,
					'出力フォルダを開く',
				).then(a=> {if (a) env.openExternal(Uri.file(pathWs +'/build/package/'))}));
				arc.pipe(ws);
				arc.finalize();	// zip圧縮実行
				};
				break;
		}
		tasks.executeTask(t)
		.then(undefined, rj=> console.error(`fn:WorkSpaces onClickTreeItemBtn() rj:${rj.message}`));
	}

	getTreeItem = (t: TreeItem)=> t;
	getChildren = (t?: TreeItem)=> t ?(t as MyTreeItem)?.children ?? [] :this.aTiRoot;

	dispose() {
		for (const dir in this.hPrj) this.hPrj[dir].dispose();
		this.hPrj = {};
	}

}
