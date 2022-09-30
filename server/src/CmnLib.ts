/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2022 Famibee (famibee.blog38.fc2.com)

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


export const is_win = process.platform === 'win32';
export const is_mac = process.platform === 'darwin';
//const is_linux = process.platform === 'linux';


// 階層フォルダ逐次処理
import {readdirSync, existsSync, readFileSync, writeFileSync} from 'fs-extra';
import {resolve, basename, extname} from 'path';
const REG_SYS_FN = /^(_notes|Icon\r|\..+|.+\.(db|ini|git))$/;
	// 5 matches (122 steps, 0.1ms) https://regex101.com/r/rXUCzW/1

export const REG_IGNORE_SYS_PATH = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
	// 5 matches (392 steps, 0.0ms) https://regex101.com/r/kx9jui/1

export function treeProc(wd: string, fnc: (path: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = d.name.normalize('NFC');
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



export	function getFn(path: string) {return basename(path, extname(path))};
