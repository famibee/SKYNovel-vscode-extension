/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const minify = aCmd.includes('--minify');

const subsetFont = require('subset-font');
const {outputFile, readFile, ensureLink, statSync, outputJsonSync} = require('fs-extra');
const is_win = process.platform === 'win32';
import os = require('os');
const {extname} = require('path');

const fnc: (inp: string, out: string, str?: string)=> Promise<void> = minify
	? async (inp, out, str)=> {
		const bufIn = await readFile(inp);
		const bufOut = await subsetFont(bufIn, str, {targetFormat: 'woff2',});
		await outputFile(out, bufOut);
	}
	: (inp, out)=> ensureLink(inp, out);

const o = require('./font.json');
const a = [];
const oInf: {[nm: string]: {inp: string, out: string, iSize: number, oSize: number}} = {};

const username = os.userInfo().username;
const PATH_PRJ_FONTS = 'core/font';
const PATH_USER_FONTS = is_win
	? `C:/Users/${username}/AppData/Local/Microsoft/Windows/Fonts`
	: `/Users/${username}/Library/Fonts`;
const PATH_OS_FONTS = is_win
	? `C:/Windows/Fonts`
	: `/Library/Fonts`;

for (const nm in o) {
	const inp = String(o[nm].inp)
	.replace('::PATH_PRJ_FONTS::', PATH_PRJ_FONTS)
	.replace('::PATH_USER_FONTS::', PATH_USER_FONTS)
	.replace('::PATH_OS_FONTS::', PATH_OS_FONTS);
	const out = `doc/prj/script/${nm}${minify ?'.woff2' :extname(inp)}`;
	oInf[nm] = {inp, out, iSize: 1, oSize: 1};
	a.push(fnc(inp, out, o[nm].txt));
}
Promise.allSettled(a)
.then(()=> {
	for (const nm in oInf) oInf[nm] = {
		...oInf[nm],
		inp		: o[nm].inp,		// プライベートな環境値を塗りつぶす
		iSize	: statSync(oInf[nm].inp).size,
		oSize	: statSync(oInf[nm].out).size,
	};
	outputJsonSync('core/font/info.json', oInf);
});
