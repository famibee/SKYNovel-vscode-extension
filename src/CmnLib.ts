/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */


// =============== Global
export function int(o: unknown): number {return parseInt(String(o), 10)}
export function uint(o: unknown): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}

export	const	REG_SCRIPT	= /\.ss?n$/;

export	const docsel = {scheme: 'file', language: 'skynovel'};


// =============== WebView
import type {Uri, Webview} from 'vscode';
export function repWvUri(inp: string, wv: Webview, uriDoc: Uri): string {
	return inp
	.replaceAll('${webview.cspSource}', wv.cspSource)
	.replaceAll(/(href|src)="\.\//g, `$1="${String(wv.asWebviewUri(uriDoc))}/`);	// 必ず String() で
}


// =============== Project
export const is_win = process.platform === 'win32';
export const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';


// =============== LSP
export const REQ_ID = ':SKYNovel:';	// これは server/src/LangSrv.ts に置くの禁止


export type WORKSPACE_PATH	= string;	// doc/prj/script/main.sn
export type PROJECT_PATH	= string;	// script/main.sn
export type FULL_PATH		= string;	// /[user]/.../[prj]/doc/prj/script/main.sn
export type VSC_FULL_PATH	= string;	// c:\[user]\...\[prj]\doc\prj\script\main.sn
export type FULL_SCH_PATH	= string;	// file://c:\[user]\...\[prj]/doc/prj/
										// scheme つき

export function vsc2fp(p: VSC_FULL_PATH): FULL_PATH {return p.replace(/(?:\/\w:)?/, '');}
	// FULL_SCH_PATH は uri.path など
	// 4win 先頭の【'/'+ ドライブ名（小文字）】を取って扱う用

export function fullSchPath2fp(fsp: FULL_SCH_PATH): FULL_PATH {
	return decodeURIComponent(fsp.replace(/file:\/\/(\/\w%3A)?/, ''));
}	// 似たような名前のメソッドになるので目立たせる
	// 逆方向は難しそう、変換前の値は保存必要か

//	docs.get(fsp) などにはこれが必要
//NOTE: 雑コード
export const fp2fullSchPath: (fp: FULL_PATH)=> FULL_SCH_PATH = is_win
	? fp=> 'file://c:'+ encodeURI(fp)
	: fp=> 'file://'+ encodeURI(fp);


export function uri2path(p: string): string {return p.slice(7)}
	// 'file://' を取る


/*
// console.log(`fn:Project.ts drop scheme:${scheme} fp:${fp}: uri:${uri.toString()}: path=${path}= fsPath-${uri.fsPath}-`);

fn:Project.ts drop scheme:file
	fp		:/Users/[]/doc/prj/rule:
	uri		:file:///Users/[]/doc/prj/rule:
	path	=/Users/[]/doc/prj/rule=
	fsPath	-/Users/[]/doc/prj/rule-

fn:Project.ts drop scheme:file
	fp		:/Users/[]/doc/prj/rule:
	uri		:file:///c%3A/Users/[]/doc/prj/rule:
	path	=/C:/Users/[]/doc/prj/rule=
	fsPath	-c:\Users\[]\doc\prj\rule-

	★ファイル、パス、名前空間の命名 - Win32 アプリ | Microsoft Learn https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#namespaces
		> ファイルI/Oにおいて、パス文字列の先頭に「\\?\」を付けると、Windows APIは文字列解析を一切行わず、それに続く文字列をファイルシステムに直接送信します。例えば、ファイルシステムが長いパスとファイル名をサポートしている場合、 Windows APIによって強制されるMAX_PATHの制限を超えることができます。
*/

import type {T_H_ADIAG} from '../server/src/LspWs';
export const hDiagL2s	:{[code_name: string]: T_H_ADIAG} = {
	ファイル重複: {
		mes	: 'プロジェクト内でファイル【$】が重複しています。フォルダを縦断検索するため許されません',
		sev	: 'W',
	},
	ファイル名合成文字: {
		mes	: 'ファイル名は濁点(゛)・半濁点(゜)など合成文字を避けて下さい。トラブルの元です',
		sev	: 'W',
	},
	文字コード異常: {
		mes	: '文字コードが異常（$）です。UTF8 か ASCII にして下さい',
		sev	: 'E',
	},
}


// 階層フォルダ逐次処理
import {basename, extname, resolve} from 'node:path';
import {readdirSync, existsSync, readFileSync, ensureFileSync, statSync, writeFileSync} from 'fs-extra';

const REG_SYS_FN = /^(_notes|Icon\r|\.[^/]+|[^/]+\.(db|ini|git))$/;
	// 6 matches (144 steps, 0.1ms)【\n 入注意】 https://regex101.com/r/uFkUrb/1

export function treeProc(wd: FULL_SCH_PATH, fnc: (fp: FULL_PATH)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = d.name.normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		const fp = resolve(wd, nm);
		if (d.isDirectory()) {treeProc(fp, fnc); continue;}

		fnc(fp);
	}
}

export function foldProc(wd: FULL_SCH_PATH, fnc: (fp: FULL_PATH, nm: string)=> void, fncFld: (nm: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = d.name.normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		if (d.isDirectory()) {fncFld(nm); continue;}

		const fp = resolve(wd, nm);
		fnc(fp, nm);
	}
}

export function replaceFile(src: FULL_SCH_PATH, r: RegExp, rep: string, verbose = true, dest = src): boolean {
	try {
		if (! existsSync(src)) {
			console.error(`No change, No replace src:${src}`);
			return false;
		}
		if (dest !== src) ensureFileSync(dest);	// これが無いとエラーになったので

		const txt = readFileSync(src, {encoding: 'utf8'});
		const ret = txt.replace(r, rep);
		if (txt !== ret) {writeFileSync(dest, ret); return true}

		if (verbose) console.error(`replaceFile fail by same:${src}`);
	}
	catch (e) {
		console.error(`replaceFile src:${src} %o`, e);
	}
	return false;
}

export function replaceRegsFile(src: FULL_SCH_PATH, a: [r: RegExp, rep: string][], verbose = true, dest = src): boolean {
	try {
		if (! existsSync(src)) {
			console.error(`No change, No replace src:${src}`);
			return false;
		}
		if (dest !== src) ensureFileSync(dest);	// これが無いとエラーになったので

		const txt = readFileSync(src, {encoding: 'utf8'});
		let ret = txt;
		for (const [r, rep] of a) ret = ret.replace(r, rep);
		if (txt !== ret) {writeFileSync(dest, ret); return true}

		if (verbose) console.error(`replaceRegsFile fail by same:${src}`);
	}
	catch (e) {
		console.error(`replaceRegsFile src:${src} %o`, e);
	}
	return false;
}


//MARK: ファイル新旧チェック
export function chkUpdate(path1: FULL_PATH, path2: FULL_PATH, doesnt_exist = true): boolean {
	// Node jsで始めるfilesystem3 | https://kawano-shuji.com/justdiary/2020/08/09/node-js%E3%81%A7%E5%A7%8B%E3%82%81%E3%82%8Bfilesystem3/
	if (! existsSync(path1)) console.error(`chkUpdate err path1=${path1}=`);
	if (! existsSync(path2)) return doesnt_exist;

	const s1 = statSync(path1, {bigint: true});
	const s2 = statSync(path2, {bigint: true});
	return s1.mtimeMs > s2.mtimeMs;
}


/*export	function argChk_Boolean(hash: any, name: string, def: boolean): boolean {
	if (! (name in hash)) return hash[name] = def;

	return hash[name] = chkBoolean(hash[name]);
}*/
export	function chkBoolean(v: unknown): boolean {
	if (v === null) return false;

	// eslint-disable-next-line @typescript-eslint/no-base-to-string
	const v2 = String(v);
	return v2 === 'false'? false : Boolean(v2);
}

export	function getFn(path: string) {return basename(path, extname(path))}


// =============== EncryptorTransform
export type HArg = {
	タグ名?	: string;

	layer?	: string;	// レイヤ系
	class?	: string;
};
export type ITag = (hArg: HArg)=> boolean;

export type ILayerFactory = ()=> unknown;

export type PLUGIN_DECAB_RET = {
	ext_num	: number;
	ab		: ArrayBuffer;
};


// =============== Plugin
export type IPluginInitArg = {
//	getInfo(): T_PLUGIN_INFO;
//	addTag(tag_name: string, tag_fnc: ITag): void;
//	addLayCls(cls: string, fnc: ILayerFactory): void;
//	searchPath(fn: string, extptn?: string): string;
//	getVal(arg_name: string, def?: number | string): object;
//	resume(fnc?: ()=> void): void;
//	render(dsp: DisplayObject, renTx?: RenderTexture, clear?: boolean): void;
	setDec(fnc: (ext: string, tx: string)=> Promise<string>): void;
	setDecAB(fnc: (ab: ArrayBuffer)=> Promise<PLUGIN_DECAB_RET>): void;
	setEnc(fnc: (tx: string)=> Promise<string>): void;
	getStK(fnc: ()=> string): void;
	getHash(fnc: (str: string)=> string): void;

	tstDecryptInfo(): IDecryptInfo,		// 拡張機能のみに存在するテスト用
}

export type IDecryptInfo = {
	pass	: string;
	salt	: string;
	iv		: string;
	keySize	: number;
	ite		: number;
	stk		: string;
}
