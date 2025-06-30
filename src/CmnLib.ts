/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */


// =============== Global
export function int(o: any): number {return parseInt(String(o), 10)}
export function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}

export	const	REG_SCRIPT	= /\.ss?n$/;

export	const docsel = {scheme: 'file', language: 'skynovel'};


// =============== Project
export const is_win = process.platform === 'win32';
export const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';


export function v2fp(s: string) {return s.replace(/(?:\/\w:)?/, '');}
	// 4win 先頭の【'/'+ ドライブ名（小文字）】を取って扱う用
	// TODO: v2fp() いずれなくす
/*
console.log(`fn:Project.ts drop scheme:${scheme} fp:${fp}: uri:${uri.toString()}: path=${path}= fsPath-${uri.fsPath}-`);

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
*/


// 階層フォルダ逐次処理
import {basename, extname, resolve} from 'node:path';
import {readdirSync, existsSync, readFileSync, ensureFileSync, statSync, writeFileSync} from 'fs-extra';

const REG_SYS_FN = /^(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
	// 6 matches (144 steps, 0.1ms)【\n 入注意】 https://regex101.com/r/uFkUrb/1

export function treeProc(wd: string, fnc: (fp: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		const fp = resolve(wd, nm);
		if (d.isDirectory()) {treeProc(fp, fnc); continue;}

		fnc(fp);
	}
}

export function foldProc(wd: string, fnc: (fp: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		if (d.isDirectory()) {fncFld(nm); continue;}

		const fp = resolve(wd, nm);
		fnc(fp, nm);
	}
}

export function replaceFile(src: string, r: RegExp, rep: string, verbose = true, dest = src): boolean {
	try {
		if (! existsSync(src)) {
			console.error(`No change, No replace src:${src}`);
			return false;
		}
		if (dest !== src) ensureFileSync(dest);	// これが無いとエラーになったので

		const txt = readFileSync(src, {encoding: 'utf8'});
		const ret = String(txt.replace(r, rep));
		if (txt !== ret) {writeFileSync(dest, ret); return true}

		if (verbose) console.error(`replaceFile fail by same:${src}`);
	}
	catch (err) {
		console.error(`replaceFile src:${src} ${err}`);
	}
	return false;
}

export function replaceRegsFile(src: string, a: [r: RegExp, rep: string][], verbose = true, dest = src): boolean {
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
	catch (err) {
		console.error(`replaceRegsFile src:${src} ${err}`);
	}
	return false;
}


export function chkUpdate(path1: string, path2: string, doesnt_exist = true): boolean {
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
export	function chkBoolean(v: any): boolean {
	if (v === null) return false;

	const v2 = String(v);
	return (v2 === 'false')? false : Boolean(v2);
}

export	function getFn(path: string) {return basename(path, extname(path))};


// =============== EncryptorTransform
export type HArg = {
	タグ名?	: string;

	layer?	: string;	// レイヤ系
};
export interface ITag { (hArg: HArg): boolean; }

export interface ILayerFactory {
	(): any;
}

export type PLUGIN_DECAB_RET = {
	ext_num	: number;
	ab		: ArrayBuffer;
};

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
