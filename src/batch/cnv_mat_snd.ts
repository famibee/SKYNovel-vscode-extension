/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2023 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

const [, , pathInp, setting, curPrj, curPrjBase=''] = process.argv;

const {codec} = JSON.parse(setting);

const ffmpeg_ins = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpeg_ins.path);

import {resolve, parse, basename} from 'path';
import {ensureDir, existsSync, move, readdirSync, readJsonSync, remove, statSync, writeJsonSync} from 'fs-extra';
import {T_OPTSND, T_OPTSND_FILE} from '../../views/types';

const REG_SYS_FN = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	for (const d of readdirSync(wd, {withFileTypes: true})) {
		const nm = String(d.name).normalize('NFC');
		if (REG_SYS_FN.test(nm)) continue;
		if (d.isDirectory()) {fncFld(nm); continue;}

		const fp = resolve(wd, nm);
		fnc(fp, nm);
	}
}


const REG_CNV_AAC	= /\.(mp3|wav)$/;	// (mp3|opus|m4a|ogg|aac|flac|wav)


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
const log_exit = (exit_code = -1)=> {
	const a = Object.entries(oLog.hSize);
	a.sort((p1, p2)=> {
		const k1 = p1[0], k2 = p2[0];
		if (k1 < k2) return -1;
		if (k1 > k2) return 1;
		return 0;
	})
	oLog.hSize = Object.fromEntries(a);

	writeJsonSync(fnLog, oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}


import PQueue from 'p-queue';
const queue = new PQueue({concurrency: 20, autoStart: false});
let start_cnt = 0;
const go = async ()=> {
	start_cnt = queue.size;
	console.error(`fn:cnv_mat_snd.ts start: ${start_cnt} tasks`);	// log

	queue.start();
	await queue.onIdle();
	log_exit(0);
};
let cnt = ()=> {
	const s = queue.size;
	if (s % 20 > 0) return;
	if (s === 0) {cnt = ()=> {}; return;}

	console.error(`fn:cnv_mat_snd.ts ${s}/${start_cnt} tasks`);	// log
};


/**
 * 
 * @param {string} urlInp	退避元パス (mp3|wav)
 * @param {string} urlBase	退避先パス (mp3|wav)
 * @param {string} no_move	退避moveする/しない
 * @returns {void} 返り値
 */
const extCnv = '.'+ codec;
const extOut = '.'+ (codec === 'opus' ?'m4a' :codec);
/*
	opus	(.m4a) Opus
	aac		(.aac) Advanced Audio Coding
	ogg		(.ogg) Vorbis
*/
function cnv(pathInp: string, pathBase: string, no_move: string = ''): void {
	queue.add(async ()=> {
		const {dir, name, ext} = parse(pathInp);
		if (no_move === 'no_move') await Promise.allSettled(
			['m4a','aac','ogg']
			.map(ext=> remove(dir +'/'+ name +'.'+ ext))
		);
		else await move(pathInp, pathBase, {overwrite: true});

		// 退避素材フォルダから元々フォルダに最適化中間ファイル生成
		const {dir: dirBase} = parse(pathBase);
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


switch (pathInp) {
	case 'restore':	// ファイル最適化 解除
		foldProc(curPrjBase, ()=> {}, dir=> {
			foldProc(resolve(curPrjBase, dir), (url, nm)=> {
				if (! REG_CNV_AAC.test(nm)) return;

				// 対応する素材ファイルが無い場合、削除しないように
				const urlPrj = resolve(curPrj, dir, nm);
				queue.add(async ()=> {await move(url, urlPrj, {overwrite: true}); cnt();});
				const urlOut = urlPrj.slice(0, -3);
				['m4a','aac','ogg'].
				forEach(ext=> queue.add(async ()=> {await remove(urlOut + ext); cnt();}));
			}, ()=> {});
		});

		go();
		break;

	case 'all_recnv':
		if (existsSync(fnLog)) {
			oLog = readJsonSync(fnLog, {encoding: 'utf8'});
			oLog.sum.baseSize = 
			oLog.sum.optSize = 0;
		}

		for (const e of Object.values(oLog.hSize)) {
			const ext = '.'+ e.ext;
			if (! REG_CNV_AAC.test(ext)) continue;

			cnv(
				resolve(curPrj, e.fld_nm + ext),
				resolve(curPrjBase, e.fld_nm + ext),
				'no_move',
			);
		}

		go();
		break;

	case 'minimum_of_all':
		if (existsSync(fnLog)) oLog = readJsonSync(fnLog, {encoding: 'utf8'});

		foldProc(curPrjBase, ()=> {}, dir=> {
			const wdBase = resolve(curPrjBase, dir);
			ensureDir(wdBase);
			const wdPrj = resolve(curPrj, dir);
			foldProc(wdBase, (url, name)=> {
				if (! REG_CNV_AAC.test(url)) return;

				const toPath = resolve(wdPrj, name.replace(REG_CNV_AAC, extOut));
				if (existsSync(toPath)) {	// 存在しても古い場合は処理
					const tsFr = statSync(url).mtimeMs;
					const tsTo = statSync(toPath).mtimeMs;
					if (tsFr < tsTo) return;	// to が新しい
				}

				// 最適化処理する
				const nm = parse(toPath).name;
				if (nm in oLog.hSize) {
					const {baseSize=0, optSize=0} = oLog.hSize[nm];
					oLog.sum.baseSize -= baseSize;
					oLog.sum.optSize -= optSize;
				}

				cnv(toPath, url, 'no_move');
			}, ()=> {});
		});

		go();
		break;

	case 'all':{	// ファイル最適化
		ensureDir(curPrjBase);
		foldProc(curPrj, ()=> {}, dir=> {
			const wdBase = resolve(curPrjBase, dir);
			ensureDir(wdBase);
			foldProc(resolve(curPrj, dir), (url, name)=> {
				// 退避素材フォルダに元素材を移動
				if (REG_CNV_AAC.test(name)) {cnv(url, resolve(wdBase, name)); return;}
			}, ()=> {});
		});

		go();
	}	break;

	default:{
		if (existsSync(fnLog)) oLog = readJsonSync(fnLog, {encoding: 'utf8'});

		const {dir, name, ext} = parse(pathInp);
		const o: T_OPTSND_FILE = {
			...oLog.hSize[name],
			fld_nm	: basename(dir) +'/'+ name,
			ext		: <any>ext.slice(1),
		};
		oLog.sum.baseSize -= o.baseSize;
		oLog.sum.optSize -= o.optSize;

		// 引数は全ファイル走査とは別の意味を持つ
			// 第一引数（退避元パス）
			// 第三引数（退避先パス）
			// 第四引数（moveする/しない）
		cnv(pathInp, curPrj, curPrjBase);

		go();
	}	break;
}
