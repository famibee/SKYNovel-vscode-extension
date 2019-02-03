import * as vscode from 'vscode';
const fs = require('fs');

const aDispose: vscode.Disposable[] = [];


interface DecChars {
	aRange		: vscode.Range[];
	decorator	: vscode.TextEditorDecorationType;
}
let decChars: DecChars = {
	aRange: [],
	decorator: vscode.window.createTextEditorDecorationType({})
};
let timeout: NodeJS.Timer | null = null;

// ロード時に一度だけ呼ばれる
export function activate(context: vscode.ExtensionContext) {
	const aFld = vscode.workspace.workspaceFolders;
		// undefinedだった場合はファイルを開いている
		// フォルダーを開いている（len>1 ならワークスペース）
	// ファイル増減を監視し、path.json を自動更新する
	if (aFld) aFld.forEach(fld => {
		const pathPrj = fld.uri.fsPath +'/';
		if (! fs.existsSync(pathPrj +'prj.json')) return;

		const fw = vscode.workspace.createFileSystemWatcher(pathPrj +'?*/*');
		aDispose.push(fw.onDidCreate(()=> updPathJson(pathPrj)));
		aDispose.push(fw.onDidDelete(()=> updPathJson(pathPrj)));
		updPathJson(pathPrj);
	});


	// fn属性やlabel属性の値に下線を引くように
	let edActive = vscode.window.activeTextEditor;
	if (edActive) trgUpdDeco();

	vscode.window.onDidChangeActiveTextEditor(ed=> {
		edActive = ed;
		if (ed) trgUpdDeco();
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event=> {
		if (edActive && event.document === edActive.document) trgUpdDeco();
	}, null, context.subscriptions);


	function trgUpdDeco() {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(updDeco, 500);
	}
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
}

// 拡張機能が非アクティブ化されたときに、実行
export function deactivate() {
	aDispose.forEach(v=> v.dispose());
}


// path.json 作成
function updPathJson($cur: string) {
	const jsonPrj = fs.readFileSync($cur +'prj.json');
	const hPath = get_hPathFn2Exts($cur, JSON.parse(jsonPrj));
	fs.writeFileSync($cur +'path.json', JSON.stringify(hPath));
}

interface IExts { [ext: string]: string; };
interface IPathFn2Exts { [fn: string]: IExts; };

import m_fs = require('fs');
import m_path = require('path');
function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}
const hExtNG	= {	// Steam対策
	'db'		:0,
	'ini'		:0,
	'DS_Store'	:0
};

function get_hPathFn2Exts($cur: string, oCfg: any): IPathFn2Exts {
	const hPathFn2Exts: IPathFn2Exts = {};

//	const REG_FN_RATE_SPRIT	= /(.+?)(?:%40(\d)x)?(\.\w+)/;
	// ｛ファイル名：｛拡張子：パス｝｝形式で格納。
	//		検索が高速なハッシュ形式。
	//		ここでの「ファイル名」と「拡張子」はスクリプト経由なので
	//		URLエンコードされていない物を想定。
	//		パスのみURLエンコード済みの、File.urlと同様の物を。
	//		あとで実際にロード関数に渡すので。
	const lenCur = $cur.length;
	if (oCfg.search) for (const dir of oCfg.search) {
		const wd = m_path.resolve($cur, dir);
		if (! m_fs.existsSync(wd)) continue;

		for (const nm_base of m_fs.readdirSync(wd)) {
			const nm = nm_base.normalize('NFC');
			if (nm.charAt(0) == '.' || nm == 'Thumbs.db'
				|| nm == 'Desktop.ini' || nm == '_notes'
				|| nm == 'Icon\r') continue;
			const fo_url = m_path.resolve(wd, nm);
			if (m_fs.lstatSync(fo_url).isDirectory()) continue;
			const p = m_path.parse(nm);
			const fo_ext = p.ext.slice(1);
			if (fo_ext in hExtNG) continue;

			const fo_fn = p.name;
			let h_exts = hPathFn2Exts[fo_fn];
			if (! h_exts) {
				h_exts = hPathFn2Exts[fo_fn] = {':cnt': '1'};
			}
			else if (fo_ext in h_exts) {
				throw Error(`[xmlCfg.search.path] サーチパスにおいてファイル名＋拡張子【${fo_fn}】が重複しています。フォルダを縦断検索するため許されません`);
			}
			else {
				h_exts[':cnt'] = String(uint(h_exts[':cnt']) +1);
			}
		//	h_exts[fo_ext] = fo_url;
			h_exts[fo_ext] = fo_url.slice(lenCur);
/*
			const oRate = REG_FN_RATE_SPRIT.exec(fo_url);
			if (! oRate) continue;
			if (oRate[2]) continue;

			// fo_fnが「@無し」のh_extsに「@あり」を代入
			const fn_xga = oRate[1] + retinaFnTail + oRate[3];
			if (m_fs.existsSync(fn_xga)) {
				hPathFn2Retina[fo_fn] = true;
				h_exts[fo_ext] = fn_xga;
				continue;
			}
			h_exts[fo_ext] = fo_url;
*/
		}
	}

	return hPathFn2Exts;
}
//	let	retinaFnTail	= '';
//	let	hPathFn2Retina	: {[name: string]: boolean}	= {};
