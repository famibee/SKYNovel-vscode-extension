/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {DocumentFilter, workspace, ExtensionContext, env, Uri, window as vsc_win} from 'vscode';

// =============== Global
export function int(o: any): number {return parseInt(String(o), 10)}
export function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}

export	const	REG_SCRIPT	= /\.ss?n$/;

export	const docsel: DocumentFilter = {scheme: 'file', language: 'skynovel'};

export const enum SEARCH_PATH_ARG_EXT {	// #searchPath 使用時、第二引数用
	DEFAULT	= '',
	SPRITE	= 'png|jpg|jpeg|json|svg|webp|mp4|webm',
		// NOTE: ogvがそもそも再生できないので、ogvのみ保留
	SCRIPT	= 'sn|ssn',
	FONT	= 'woff2|woff|otf|ttf',
	SOUND	= 'mp3|m4a|ogg|aac|flac|wav',
	HTML	= 'htm|html',
	CSS		=	'css',
	SN		=	'sn',

	TST_PNGPNG_	= 'png|png_',
	TST_HH		= 'hh',
	TST_EEE		= 'eee',
	TST_GGG		= 'ggg',
	TST_PNGXML	= 'png|xml',
};


// =============== Project
export interface IExts { [ext: string]: string | number; };
export interface IFn2Path { [fn: string]: IExts; };


export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i=0; i<32; ++i) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function setCtx4(ctx: ExtensionContext) {extPath = ctx.extensionPath;}
let extPath = '';
export function oIcon(name: string) {return {
	light: `${extPath}/res/light/${name}.svg`,
	dark: `${extPath}/res/dark/${name}.svg`,
}};


export const is_win = process.platform === 'win32';
export const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';
export const statBreak: {(): string} =
	is_mac ? ()=> '&&'
	: is_win ? ()=> {
		const chkShell = String(workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(-7);
		return (chkShell === 'cmd.exe') ?'&' :';';
	}
	: ()=> ';';


// 階層フォルダ逐次処理
import {readdirSync, existsSync, readFileSync, writeFileSync} from 'fs-extra';
import {resolve, basename, extname} from 'path';
const REG_SYS_FN = /^(_notes|Icon\r|\..+|.+\.(db|ini|git))$/;
	// 5 matches (122 steps, 0.1ms) https://regex101.com/r/rXUCzW/1

export const REG_IGNORE_SYS_PATH = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
	// 5 matches (392 steps, 0.0ms) https://regex101.com/r/kx9jui/1

export function treeProc(wd: string, fnc: (path: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		const path = resolve(wd, nm);
		if (d.isDirectory()) {treeProc(path, fnc); continue;}

		fnc(path);
	}
}

export function foldProc(wd: string, fnc: (path: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		if (d.isDirectory()) {fncFld(nm); continue;}

		const url = resolve(wd, nm);
		fnc(url, nm);
	}
}

export function replaceFile(src: string, r: RegExp, rep: string, dest = src) {
	try {
		if (! existsSync(src)) {
			console.error(`replaceFile no exists src:${src}`);
			return;
		}

		const txt = readFileSync(src, {encoding: 'utf8'});
		const ret = String(txt.replace(r, rep));
		if (txt !== ret) writeFileSync(dest, ret);
	}
	catch (err) {
		console.error(`replaceFile src:${src} ${err}`);
	}
}

export function replaceRegsFile(src: string, a: [r: RegExp, rep: string][], dest = src) {
	try {
		if (! existsSync(src)) {
			console.error(`replaceFile no exists src:${src}`);
			return;
		}

		const txt = readFileSync(src, {encoding: 'utf8'});
		let ret = txt;
		for (const [r, rep] of a) ret = ret.replace(r, rep);
		if (txt !== ret) writeFileSync(dest, ret);
	}
	catch (err) {
		console.error(`replaceFile src:${src} ${err}`);
	}
}

/*export	function argChk_Boolean(hash: any, name: string, def: boolean): boolean {
	if (! (name in hash)) return hash[name] = def;

	return hash[name] = chkBoolean(hash[name]);
}*/
export	function chkBoolean(v: any): boolean {
	if (v === null) return false;

	const v2 = String(v);
	return (v2 === 'false')? false : Boolean(v2);
}

export	function getFn(path: string) {return basename(path, extname(path))};


export	function openURL(url: Uri, pathWs: string) {
	switch (url.scheme) {
		case 'ws-file':
			workspace.openTextDocument(pathWs + url.path)
			.then(doc=> vsc_win.showTextDocument(doc));
			break;
	
		case 'ws-folder':
			env.openExternal(Uri.file(pathWs + url.path));
			break;

		default:	env.openExternal(url);
	}
}


// =============== EncryptorTransform
export type HArg = {
	タグ名?	: string;

	layer?	: string;	// レイヤ系
};
export interface ITag { (hArg: HArg): boolean; }

export interface ILayerFactory {
	(): any;
}

export type PLUGIN_PRE_RET = {
	ret		: string;
	ext_num	: number;
};
export type IPluginInitArg = {
//	addTag(tag_name: string, tag_fnc: ITag): void;
//	addLayCls(cls: string, fnc: ILayerFactory): void;
//	searchPath(fn: string, extptn?: string): string;
//	getVal(arg_name: string, def?: number | string): object;
//	resume(fnc?: ()=> void): void;
//	render(dsp: any, renTx?: any, clear?: boolean): void;
	setDec(fnc: (ext: string, d: string | ArrayBuffer)=> PLUGIN_PRE_RET): void;
	setEnc(fnc: (d: string)=> string): void;
	getStK(fnc: ()=> string): void;
	getHash(fnc: (data: string)=> string): void;

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
