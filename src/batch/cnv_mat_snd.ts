/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , modeInp='', setting, curPrj='', curPrjBase=''] = process.argv;

const {codec} = JSON.parse(setting!);

import ffmpeg_ins from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath(ffmpeg_ins.path);

import {resolve, parse, basename} from 'node:path';
import {styleText} from 'node:util';
import {existsSync, statSync, readdirSync} from 'node:fs';
import {mkdirs, move, readJsonSync, remove, writeJsonSync} from 'fs-extra/esm';
import type {T_OPTSND, T_OPTSND_FILE} from '../../views/types';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const REG_SYS_FN = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
async function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> Promise<void>) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		if (d.isDirectory()) {await fncFld(nm); continue;}

		const fp = resolve(wd, nm);
		fnc(fp, nm);
	}
}

export function chkUpdate(path1: string, path2: string, doesnt_exist = true): boolean {
	// Node jsで始めるfilesystem3 | https://kawano-shuji.com/justdiary/2020/08/09/node-js%E3%81%A7%E5%A7%8B%E3%82%81%E3%82%8Bfilesystem3/
	if (! existsSync(path1)) console.error(`chkUpdate err path1=${path1}=`);
	if (! existsSync(path2)) return doesnt_exist;

	const s1 = statSync(path1, {bigint: true});
	const s2 = statSync(path2, {bigint: true});
	return s1.mtimeMs > s2.mtimeMs;
}


const REG_EXT_ORG	= /\.(mp3|wav)$/;	// (mp3|opus|m4a|ogg|aac|flac|wav)


const fnLog = __filename +'on';
let oLog: T_OPTSND = {
	sum: {
		baseSize	: 0,
		optSize		: 0,
		pathSndOpt	: '',
		pathSndBase	: '',
	},
	hSize	: {},
};
const log_enter = ()=> {
	if (! existsSync(fnLog)) return;

	// 元素材がなければログ削除
	const o = {...oLog};
	oLog = readJsonSync(fnLog, {encoding: 'utf8'});
	o.sum = {...oLog.sum};
	for (const name in oLog.hSize) {
		const {fld_nm, ext, baseSize, optSize} = oLog.hSize[name]!;
		const pp = fld_nm + '.'+ ext;
		if (existsSync(resolve(curPrj, pp))
		|| existsSync(resolve(curPrjBase, pp))) o.hSize[name] = oLog.hSize[name]!;
		else {
			o.sum.baseSize -= baseSize;
			o.sum.optSize -= optSize;
		}
	}
	oLog = o;
};
const log_exit = (exit_code = -1)=> {
	const a = Object.entries(oLog.hSize)
	.sort(([k1], [k2])=> {
		const n1 = k1.toUpperCase();
		const n2 = k2.toUpperCase();
		if (n1 < n2) return -1;
		if (n1 > n2) return 1;
		return 0;
	});
	oLog.hSize = Object.fromEntries(a);

	writeJsonSync(fnLog, oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}


import PQueue from 'p-queue';
const queue = new PQueue({concurrency: 20, autoStart: false});
let start_cnt = 0;
const go = async ()=> {
	start_cnt = queue.size;
	console.log(styleText(['bgGreen', 'black'], `fn:cnv_mat_snd.ts start: ${start_cnt} tasks`));

	await queue.start().onIdle();
	log_exit(0);
};
let cnt = ()=> {
	const s = queue.size;
	if (s % 20 > 0) return;
	if (s === 0) {cnt = ()=> {}; return;}

	console.log(styleText(['bgGreen', 'black'], `fn:cnv_mat_snd.ts ${s}/${start_cnt} tasks`));
};


const extCnv = '.'+ codec;
const extOut = '.'+ (codec === 'opus' ?'m4a' :codec);
/*
	opus	(.m4a) Opus
	aac		(.aac) Advanced Audio Coding
	ogg		(.ogg) Vorbis
*/
/**
 * 
 * @param {string} pathInp	退避元パス (mp3|wav)
 * @param {string} pathBase	退避先パス (mp3|wav)
 * @param {boolean} do_move	退避moveするか
 * @returns {void} 返り値
 */
async function cnv(pathInp: string, pathBase: string, do_move: boolean = true): Promise<void> {
	return queue.add(async ()=> {
		const {dir, name} = parse(pathInp);
		if (do_move) await move(pathInp, pathBase, {overwrite: true});
		else await Promise.allSettled(
			['m4a','aac','ogg']
			.map(ext=> remove(dir +'/'+ name +'.'+ ext))
		);

		// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
		const {dir: dirBase, ext} = parse(pathBase);
		const pathWk = dirBase +'/'+ name + extCnv;
		const fi = oLog.hSize[name] ??= {fld_nm: basename(dir) +'/'+ name, baseSize: 0, optSize: 0, ext: <any>'',};

		await new Promise<void>(re=> ffmpeg(pathBase)
		.save(pathWk)	// 一度作業中ファイルは退避先に作る
	//	.on('start', (cl: any)=> console.log(`@@ ${cl} @@`))
		.on('error', (err: any)=> console.error(err))
		.on('end', async (_stdout: any, _stderr: any)=> {
			const baseSize = statSync(pathBase).size;
			const optSize = statSync(pathWk).size;
			oLog.hSize[name] = {...fi, baseSize, optSize, ext: <any>ext.slice(1),};
			oLog.sum.baseSize += baseSize;
			oLog.sum.optSize += optSize;

			await move(pathWk, dir +'/'+ name + extOut, {overwrite: true});
			cnt();
			re();
		}));
	});
}


switch (modeInp) {
	case 'enable':		// 変換有効化
		await mkdirs(curPrjBase);
		await foldProc(curPrj, ()=> {}, async dir=> {
			const wdBase = resolve(curPrjBase, dir);
			await mkdirs(wdBase);
			await foldProc(resolve(curPrj, dir), (url, nm)=> {
				// 退避素材フォルダに元素材を移動
				if (REG_EXT_ORG.test(nm)) {
					queue.add(()=> cnv(url, resolve(wdBase, nm)));
					return;
				}
			}, async ()=> {});
		});
		break;

	case 'disable':		// 変換無効化
		await foldProc(curPrjBase, ()=> {}, async dir=> {
			await foldProc(resolve(curPrjBase, dir), (url, nm)=> {
				if (! REG_EXT_ORG.test(nm)) return;

				// 対応する素材ファイルが無い場合、削除しないように
				const urlPrj = resolve(curPrj, dir, nm);
				queue.add(async ()=> {
					await move(url, urlPrj, {overwrite: true});
					cnt();
				});
				const urlOut = urlPrj.slice(0, -3);
				for (const ext of ['m4a','aac','ogg']) {
					queue.add(async ()=> {
						await remove(urlOut + ext);
						cnt();
					});
				}
			}, async ()=> {});
		});
		break;

	case 'reconv':		// 再変換
		// 現状、UI的に「常にエンコーダー変更」なので、旧全生成物削除（cnv()内でやってる）→全変換
		log_enter();
		oLog.sum.baseSize = 
		oLog.sum.optSize = 0;

		for (const {ext, fld_nm} of Object.values(oLog.hSize)) {
			queue.add(()=> cnv(
				resolve(curPrj, fld_nm + '.'+ ext),
				resolve(curPrjBase, fld_nm + '.'+ ext),
				false,
			));
		}
		break;

	case 'prj_scan':	// prjフォルダ走査
		log_enter();

		await mkdirs(curPrjBase);
		await foldProc(curPrj, ()=> {}, async dir=> {
			const wdBase = resolve(curPrjBase, dir);
			await mkdirs(wdBase);
			await foldProc(resolve(curPrj, dir), (url, nm)=> {
				// 退避素材フォルダに元素材を移動
				if (REG_EXT_ORG.test(nm)) {
					queue.add(()=> cnv(url, resolve(wdBase, nm)));
					return;
				}
			}, async ()=> {});
		});
		break;

	case 'base_scan':	// baseフォルダ走査
		log_enter();

		await foldProc(curPrjBase, ()=> {}, async dir=> {
			const wdBase = resolve(curPrjBase, dir);
			await mkdirs(wdBase);
			const wdPrj = resolve(curPrj, dir);
			await foldProc(wdBase, (url, nm)=> {
				if (! REG_EXT_ORG.test(url)) return;

				const toPath = resolve(wdPrj, nm.replace(REG_EXT_ORG, extOut));
				if (! chkUpdate(url, toPath)) return;

				// ログにあるならいったん合計値から過去サイズを差し引く（log_enter() とセット）
				const {name} = parse(toPath);
				if (name in oLog.hSize) {
					const {baseSize=0, optSize=0} = oLog.hSize[name]!;
					oLog.sum.baseSize -= baseSize;
					oLog.sum.optSize -= optSize;
				}

				queue.add(()=> cnv(toPath, url, false));
			}, async ()=> {});
		});
		break;

	default:{
		log_enter();

		const {dir, name, ext} = parse(modeInp);
		const o: T_OPTSND_FILE = {
			...oLog.hSize[name]!,
			fld_nm	: basename(dir) +'/'+ name,
			ext		: <any>ext.slice(1),
		};
		oLog.sum.baseSize -= o.baseSize;
		oLog.sum.optSize -= o.optSize;

		// 引数は全ファイル走査とは別の意味を持つ
			// 第一引数（退避元パス）
			// 第三引数（退避先パス）
			// 第四引数（moveする/しない）
		await cnv(modeInp, curPrj, Boolean(curPrjBase));
	}	break;
}
await go();
