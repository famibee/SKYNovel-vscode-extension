/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {workspace, ExtensionContext} from 'vscode';

// =============== Global
export function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}

export	const	REG_SCRIPT	= /\.(sn|ssn)$/;


// =============== Project
export interface IExts { [ext: string]: string | number; };
export interface IFn2Path { [fn: string]: IExts; };


export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function setCtx4(ctx0: ExtensionContext) {extPath = ctx0.extensionPath;}
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
import m_fs = require('fs-extra');
import {resolve, basename, extname} from 'path';
const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
export const regNoUseSysPath = /\/(\..+|.+.db|.+.ini|_notes|Icon\r)$/;

export function treeProc(wd: string, fnc: (url: string)=> void) {
	m_fs.readdirSync(wd, {withFileTypes: true}).forEach((d: any)=> {
		regNoUseSysFile.lastIndex = 0;
		const nm = String(d.name).normalize('NFC');
		if (regNoUseSysFile.test(nm)) return;
		const url = resolve(wd, nm);
		if (d.isDirectory()) {treeProc(url, fnc); return;}

		fnc(url);
	});
}

export function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	m_fs.readdirSync(wd, {withFileTypes: true}).forEach((d: any)=> {
		regNoUseSysFile.lastIndex = 0;
		const nm = String(d.name).normalize('NFC');
		if (regNoUseSysFile.test(nm)) return;
		if (d.isDirectory()) {fncFld(nm); return;}

		const url = resolve(wd, nm);
		fnc(url, nm);
	});
}

export function replaceFile(src: string, r: RegExp, rep: string, dest = src) {
	try {
		if (! m_fs.existsSync(src)) return;

		const txt = m_fs.readFileSync(src, {encoding: 'utf8'});
		const ret = String(txt.replace(r, rep));
		m_fs.ensureFileSync(dest);
		if (txt != ret) m_fs.writeFileSync(dest, ret);
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

export class CmnLib {
	static	readonly 	getFn = (path: string)=> basename(path, extname(path));
}
