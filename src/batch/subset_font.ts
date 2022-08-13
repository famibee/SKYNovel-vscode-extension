/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const minify = aCmd.includes('--minify');

const subsetFont = require('subset-font');
import {outputFile, readFile, ensureLink, statSync, writeJsonSync, existsSync} from 'fs-extra';
const is_win = process.platform === 'win32';
import {userInfo} from 'os';
import {extname} from 'path';


const oLog: {[nm: string]: {inp: string, out: string, iSize: number, oSize: number, err: string}} = {};
const log_exit = (exit_code = -1)=> {
	writeJsonSync(__filename +'on', oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}

const fnc: (inp: string, out: string, str?: string)=> Promise<void> = minify
	? async (inp, out, str)=> {
		const bufIn = await readFile(inp);
		const bufOut = await subsetFont(bufIn, str, {targetFormat: 'woff2',});
		await outputFile(out, bufOut);
	}
	: (inp, out)=> ensureLink(inp, out);

const o = require('./font.json');
const a = [];

const {username} = userInfo();
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
	oLog[nm] = {inp, out, iSize: 1, oSize: 1, err: ''};
	if (! existsSync(inp)) {
		oLog[nm].err = `変換失敗です。入力ファイル ${o[nm].inp.slice(20)} が存在するか確認してください`;
		continue;
	}
	a.push(fnc(inp, out, o[nm].txt));
}
Promise.allSettled(a)
.then(()=> {
	for (const nm in oLog) {
		const q = oLog[nm];
		const inp = q.inp;
		const out = q.out;
		q.inp = o[nm].inp;	// プライベートな環境値を塗りつぶす
	//	q.out = // これは存在しない
		if (! existsSync(out)) {
			oLog[nm].err = `変換失敗です。出力ファイル ${q.out} が存在しません`;
			continue;
		}
		oLog[nm].iSize = statSync(inp).size;
		oLog[nm].oSize = statSync(out).size;
	}
	log_exit(0);
});
