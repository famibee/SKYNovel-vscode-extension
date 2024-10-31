/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2024 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , ...aCmd] = process.argv;
const minify = aCmd.includes('--minify');

import {exec} from 'child_process';
import {statSync, writeFile, writeJsonSync, existsSync, copy} from 'fs-extra';
const is_win = process.platform === 'win32';
import {userInfo} from 'os';
import {extname} from 'path';


type LOG = {inp: string, out: string, iSize: number, oSize: number, err: string};
const oLog: {[nm: string]: LOG} = {};
const log_exit = (exit_code = -1)=> {
	writeJsonSync(__filename +'on', oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}

const fnc: (log: LOG, nm: string, str: string)=> Promise<void> = minify
	? async (log, nm, str)=> {
		try {
			const fnTmp = __filename.slice(0, -3) +'_'+ nm +'.txt';
			await writeFile(fnTmp, str, {encoding: 'utf8'});

			str = str.replaceAll('\"', '\\"');
			await new Promise<void>((re, rj)=> exec(`pyftsubset "${log.inp}" --text-file="${fnTmp}" --layout-features='*' --flavor=woff2 --output-file="${log.out}" --verbose`, async (e, _stdout, stderr)=> {
				if (e) {
					const m = `${nm} 出力エラー：`+ e.message.replace(/--text-file=[^\n]+/, '...');
					console.error(m);
					log.err += m +'\n';
					rj();	// 必須。ないとログエラーが出ない
					return;
				}

				await writeFile(fnTmp, stderr, {encoding: 'utf8'});
				if (stderr.includes('Missing glyphs for requested Unicodes:')) log.err += `${nm} 出力警告：フォントファイルに含まれない文字がありました。ログを確認（Missing glyphs ...）して下さい。\n`;
				re();
			}));
		} catch (e) {
			if (e instanceof Error) log.err += e.message.replace(/--text-file=[^\n]+/, '...') +'\n';
			else log.err += `err pyftsubset "${log.inp}"`;
		}
	}
	: log=> copy(log.inp, log.out);

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

for (const [nm, v] of Object.entries(o)) {
	const inp = String((<any>v).inp)
	.replace('::PATH_PRJ_FONTS::', PATH_PRJ_FONTS)
	.replace('::PATH_USER_FONTS::', PATH_USER_FONTS)
	.replace('::PATH_OS_FONTS::', PATH_OS_FONTS);
	const out = `doc/prj/script/${nm}${minify ?'.woff2' :extname(inp)}`;
	const log = oLog[nm] = {inp, out, iSize: 1, oSize: 1, err: ''};
	if (! existsSync(inp)) {
		log.err = `変換失敗です。入力ファイル ${o[nm].inp.slice(20)} が存在するか確認してください`;
		continue;
	}
	a.push(fnc(log, nm, o[nm].txt));
}
Promise.allSettled(a)
.then(()=> {
	for (const [nm, log] of Object.entries(oLog)) {
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
