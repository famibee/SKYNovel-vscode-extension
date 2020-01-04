/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2020 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {workspace} from 'vscode';

// =============== Global
export function int(o: any): number {return parseInt(String(o), 10)}
export function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}
export function trim(s: string): string {return s.replace(/^\s+|\s+$/g,'')}
if (! ('toInt' in String.prototype)) {
	(String.prototype as any)['toInt'] = function () { return int(this); };
}
if (! ('toUint' in String.prototype)) {
	(String.prototype as any)['toUint'] = function () {
		const v = int(this);
		return v < 0 ? -v : v;
	};
}
if (! String.prototype.trim) {
	String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g,''); };
}


export function oIcon(name: string) {return {
	light: `${__filename}/../../../res/light/${name}.svg`,
	dark: `${__filename}/../../../res/dark/${name}.svg`
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
const fs = require('fs-extra');
const path = require('path');
const regNoUseSysFile = /^(\..+|.+.db|.+.ini|_notes|Icon\r)$/;
export const regNoUseSysPath = /\/(\..+|.+.db|.+.ini|_notes|Icon\r)$/;

export function treeProc(wd: string, fnc: (url: string)=> void) {
	fs.readdirSync(wd, {withFileTypes: true}).forEach((d: any)=> {
		regNoUseSysFile.lastIndex = 0;
		const nm = String(d.name).normalize('NFC');
		if (regNoUseSysFile.test(nm)) return;
		const url = path.resolve(wd, nm);
		if (d.isDirectory()) {treeProc(url, fnc); return;}

		fnc(url);
	});
}

export function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	fs.readdirSync(wd, {withFileTypes: true}).forEach((d: any)=> {
		regNoUseSysFile.lastIndex = 0;
		const nm = String(d.name).normalize('NFC');
		if (regNoUseSysFile.test(nm)) return;
		if (d.isDirectory()) {fncFld(nm); return;}

		const url = path.resolve(wd, nm);
		fnc(url, nm);
	});
}

export async function replaceFile(src: string, r: RegExp, rep: string, dest = src) {
	try {
		if (! fs.existsSync(src)) return;

		const txt = await fs.readFile(src, {encoding: 'utf8'});
		const ret = String(txt.replace(r, rep));
		if (txt != ret) await fs.outputFile(dest, ret);
	} catch (err) {
		console.error(`replaceFile src:${src} ${err}`);
	}
}
