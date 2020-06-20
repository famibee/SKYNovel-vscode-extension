/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {workspace, ExtensionContext} from 'vscode';

// =============== Global
export function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
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
		const isPS = String(workspace.getConfiguration('terminal.integrated.shell').get('windows')).slice(7);
		return (isPS === 'cmd.exe') ?'&' :';';
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
		if (txt != ret) m_fs.writeFileSync(dest, ret);
	}
	catch (err) {
		console.error(`replaceFile src:${src} ${err}`);
	}
}

export class CmnLib {
	static	readonly 	getFn = (path: string)=> basename(path, extname(path));
}
