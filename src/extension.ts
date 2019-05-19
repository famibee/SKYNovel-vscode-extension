/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {ReferenceProvider} from './ReferenceProvider';
import {ActivityBar} from './ActivityBar';

import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const img_size = require('image-size');
const https = require('https');

const aDispose: vscode.Disposable[] = [];
let edActive: vscode.TextEditor | undefined;

// ロード時に一度だけ呼ばれる
export function activate(context: vscode.ExtensionContext) {
	// アクティビティバー
	ActivityBar.start(context);	// このタイミングで環境チェック

	const aFld = vscode.workspace.workspaceFolders;
		// undefinedだった場合はファイルを開いている
		// フォルダーを開いている（len>1 ならワークスペース）
	// ファイル増減を監視し、path.json を自動更新する
	if (aFld) aFld.map(fld=> {
		const pathPrj = fld.uri.fsPath +'/prj/';
		if (fs.existsSync(pathPrj) && fs.existsSync(pathPrj +'prj.json')) {
			const fw = vscode.workspace.createFileSystemWatcher(pathPrj+'?*/*');
			aDispose.push(fw.onDidCreate(()=> updPathJson(pathPrj)));
			aDispose.push(fw.onDidDelete(()=> updPathJson(pathPrj)));
			updPathJson(pathPrj);
		}

		// プラグインフォルダ増減でビルドフレームワークに反映する機能
		// というか core/plugin/plugin.js を更新する機能
		const pathPlg = fld.uri.fsPath +'/core/plugin';
		if (fs.existsSync(pathPlg) && fs.existsSync(pathPlg +'.js')) {
			const fw = vscode.workspace.createFileSystemWatcher(pathPlg+'/?*/');
			aDispose.push(fw.onDidCreate(()=> updPlugin(pathPlg)));
			aDispose.push(fw.onDidDelete(()=> updPlugin(pathPlg)));
			updPlugin(pathPlg);
		}
	});

	// リファレンス
	new ReferenceProvider(context);

	// ライブラリ更新チェック
	if (aFld) https.get('https://raw.githubusercontent.com/famibee/SKYNovel/master/package.json', (res: any)=> {
		let body = '';
		res.setEncoding('utf8');
		res.on('data', (chunk: string)=> {body += chunk;});
		res.on('end', ()=> {
			const newVer = JSON.parse(body).version;
//console.log(`GitHub skynovel ver:${newVer}`);
			aFld.map(fld=> {
				const fnLocal = fld.uri.fsPath +'/package.json';
				if (! fs.existsSync(fnLocal)) return;

				const localVer = JSON.parse(fs.readFileSync(fnLocal)).dependencies.skynovel.slice(1);
				if (newVer == localVer) return;
//console.log(`local skynovel ver:${localVer}`);
				vscode.window.showInformationMessage(`SKYNovelに更新（${newVer}）があります。【タスクの実行...】から【npm: upd】を実行してください`);
			});
		});
	}).on('error', (e: Error)=> console.error(e.message));

	// fn属性やlabel属性の値に下線を引くように
	edActive = vscode.window.activeTextEditor;
	if (edActive) trgUpdDeco();

	vscode.window.onDidChangeActiveTextEditor(ed=> {
		edActive = ed;
		if (ed) trgUpdDeco();
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event=> {
		if (edActive && event.document === edActive.document) trgUpdDeco();
	}, null, context.subscriptions);
}

// 拡張機能が非アクティブ化されたときに、実行
export function deactivate() {
	ActivityBar.stopActBar();
	aDispose.map(v=> v.dispose());
}


	// fn属性やlabel属性の値に下線を引くように
	let timeout: NodeJS.Timer | null = null;
	function trgUpdDeco() {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(updDeco, 500);
	}

	interface DecChars {
		aRange		: vscode.Range[];
		decorator	: vscode.TextEditorDecorationType;
	}
	let decChars: DecChars = {
		aRange: [],
		decorator: vscode.window.createTextEditorDecorationType({})
	};
	function updDeco() {
		if (! edActive) return;
		const src = edActive.document.getText();

		vscode.window.setStatusBarMessage('');
		decChars.decorator.dispose();
		decChars = {
			aRange: [],
			decorator: vscode.window.createTextEditorDecorationType({
				'light': {
					'textDecoration': 'underline',
				},
				'dark': {
					'textDecoration': 'underline',
				}
			})
		}

		const regex = new RegExp('\\s(fn|label)\\=([^\\]\\s]+)', 'g');
		let m;
		while (m = regex.exec(src)) {
			const lenVar = m[1].length;
			decChars.aRange.push(new vscode.Range(
				edActive.document.positionAt(m.index +lenVar+2),
				edActive.document.positionAt(m.index +lenVar+2 + m[2].length)
			));
		}
		edActive.setDecorations(decChars.decorator, decChars.aRange);
	}


// plugin.js 作成
function updPlugin(cur: string) {
	const h: any = {};
	for (const nm of fs.readdirSync(cur)) {
		if (regNoUseSysFile.test(nm)) continue;
		const url = path.resolve(cur, nm);
		if (! fs.lstatSync(url).isDirectory()) continue;
		h[nm] = 0;
	}
	fs.writeFileSync(cur +'.js', `export default ${JSON.stringify(h)};`);
}


// path.json 作成
function updPathJson(cur: string) {
	const jsonPrj = fs.readFileSync(cur +'prj.json');
	const hPath = get_hPathFn2Exts(cur, JSON.parse(jsonPrj));
	fs.writeFileSync(cur +'path.json', JSON.stringify(hPath));
}

interface IExts { [ext: string]: string; };
interface IFn2Path { [fn: string]: IExts; };

const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
const regSprSheetImg = /^(.+)\.(\d+)x(\d+)\.(png|jpg|jpeg)$/;
function get_hPathFn2Exts($cur: string, oCfg: any): IFn2Path {
	const hFn2Path: IFn2Path = {};

//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
	// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
	//		検索が高速なハッシュ形式。
	//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
	//		URLエンコードされていない物を想定。
	//		パスのみURLエンコード済みの、File.urlと同様の物を。
	//		あとで実際にロード関数に渡すので。
	if (oCfg.search) for (const dir of oCfg.search) {
		const wd = path.resolve($cur, dir);
		if (! fs.existsSync(wd)) continue;

		for (const nm_base of fs.readdirSync(wd)) {
			const nm = nm_base.normalize('NFC');
			if (regNoUseSysFile.test(nm)) continue;
			const url = path.resolve(wd, nm);
			if (fs.lstatSync(url).isDirectory()) continue;

			// スプライトシート用json自動生成機能
			// breakline.5x20.png などから breakline.json を（無ければ）生成
			const m = nm.match(regSprSheetImg);
			if (! m) {addPath(hFn2Path, dir, nm); continue;}
			const fnJs = path.resolve(wd, m[1] +'.json');
			if (! fs.existsSync(fnJs)) {
				const size = img_size(url);
				const xLen = uint(m[2]);
				const yLen = uint(m[3]);
				const w = size.width /xLen;
				const h = size.height /yLen;
				const basename = m[1];
				const ext = m[4];

				const oJs :any = {
					frames: {},
					meta: {
						app: 'skynovel',
						version: '1.0',
						image: m[0],
						format: 'RGBA8888',
						size: {w: size.width, h :size.height},
						scale: 1,
						animationSpeed: 1,	// 0.01~1.00
					},
				};
				let cnt = 0;
				for (let ix=0; ix<xLen; ++ix) {
					for (let iy=0; iy<yLen; ++iy) {
						++cnt;
						oJs.frames[basename + String(cnt).padStart(4, '0') +'.'+ ext] = {
							frame: {x: ix *w, y: iy*h, w: w, h :h},
							rotated: false,
							trimmed: false,
							spriteSourceSize: {x: 0, y: 0, w: size.width, h :size.height},
							sourceSize: {w: w, h :h},
							pivot: {x: 0.5, y: 0.5},
						};
					}
				}
				fs.writeFileSync(fnJs, JSON.stringify(oJs));
				vscode.window.showInformationMessage(`[SKYNovel] ${nm} からスプライトシート用 ${m[1]}.json を自動生成しました`);

				addPath(hFn2Path, dir, `${m[1]}.json`);
			}
		}
	}

	return hFn2Path;
}

function addPath(hFn2Path: IFn2Path, dir: string, nm: string) {
		const p = path.parse(nm);
		const ext = p.ext.slice(1);
		const fn = p.name;
		let hExts = hFn2Path[fn];
		if (! hExts) {
			hExts = hFn2Path[fn] = {':cnt': '1'};
		}
		else if (ext in hExts) {
			vscode.window.showErrorMessage(`[SKYNovel] サーチパスにおいてファイル名＋拡張子【${fn}】が重複しています。フォルダを縦断検索するため許されません`);
		}
		else {
			hExts[':cnt'] = String(uint(hExts[':cnt']) +1);
		}
		hExts[ext] = path.resolve(dir, nm).slice(1);
	}
	function uint(o: any): number {
		const v = parseInt(String(o), 10);
		return v < 0 ? -v : v;
	}
