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


type LOG = {inp: string, out: string, iSize: number, oSize: number, err: string};
const oLog: {[nm: string]: LOG} = {};
const log_exit = (exit_code = -1)=> {
	writeJsonSync(__filename +'on', oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}

const fnc: (log: LOG, str: string)=> Promise<void> = minify
	? async (log, str)=> {
		try {
			const bufIn = await readFile(log.inp);

			// woff2 変換に失敗しても woff なら成功する場合があるので、リトライ
			const a = ['woff2','woff','sfnt'];
			const len = a.length;
			for (let i=0; i<len; ++i) {
				try {
					const bufOut = await subsetFont(bufIn, str, {targetFormat: a[i]});
					log.out += ['woff2','woff','ttf'][i];
					await outputFile(log.out, bufOut);
					break;
				} catch {
					log.err += `【${a[i]} 変換失敗】\n`;
					continue;
				}
			}
		} catch (e) {log.err += e.message +'\n';}
	}
	: log=> ensureLink(log.inp, log.out);

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
	const out = `doc/prj/script/${nm}${minify ?'.' :extname(inp)}`;
	const log = oLog[nm] = {inp, out, iSize: 1, oSize: 1, err: ''};
	if (! existsSync(inp)) {
		log.err = `変換失敗です。入力ファイル ${o[nm].inp.slice(20)} が存在するか確認してください`;
		continue;
	}
	a.push(fnc(log, o[nm].txt));
}
Promise.allSettled(a)
.then(()=> {
	for (const nm in oLog) {
		const log = oLog[nm];
		const {inp, out} = log;
		log.inp = o[nm].inp;	// プライベートな環境値を塗りつぶす
	//	log.out = // これは存在しない
		if (! existsSync(out)) {
			log.err += `変換失敗です。出力ファイル ${log.out} が存在しません`;
			continue;
		}
		log.iSize = statSync(inp).size;
		log.oSize = statSync(out).size;
	}
	log_exit(0);
});
