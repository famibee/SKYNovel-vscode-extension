/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2022-2022 Famibee (famibee.blog38.fc2.com)

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

const REG_IGNORE_SYS_PATH = /^.+\/(_notes|Icon\r|\.[^\/]+|[^\/]+\.(db|ini|git))$/;
function foldProc(wd: string, fnc: (url: string, nm: string)=> void, fncFld: (nm: string)=> void) {
	readdirSync(wd, {withFileTypes: true}).forEach((d: any)=> {
		const nm = String(d.name).normalize('NFC');
		if (REG_IGNORE_SYS_PATH.test(nm)) return;
		if (d.isDirectory()) {fncFld(nm); return;}

		const url = resolve(wd, nm);
		fnc(url, nm);
	});
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
	writeJsonSync(fnLog, oLog, {encoding: 'utf8'});
	if (exit_code > -1) process.exit(exit_code);
}


const a: (()=> Promise<void>)[] = [];

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
	a.push(
		async ()=> {
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
				re();
			}));
		},
	);
}

switch (pathInp) {
	case 'restore':	// ファイル最適化 解除
		foldProc(curPrjBase, ()=> {}, dir=> {
			foldProc(resolve(curPrjBase, dir), (url, nm)=> {
				if (! REG_CNV_AAC.test(nm)) return;

				// 対応する素材ファイルが無い場合、削除しないように
				const urlPrj = resolve(curPrj, dir, nm);
				a.push(()=> move(url, urlPrj, {overwrite: true}));
				const urlOut = urlPrj.slice(0, -3);
				['opus','aac','ogg'].
				forEach(ext=> a.push(()=>remove(urlOut + ext)));
			}, ()=> {});
		});

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
		break;

	case 'all_no_move':
		if (existsSync(fnLog)) {
			oLog = readJsonSync(fnLog, {encoding: 'utf8'});
			oLog.sum.baseSize = 
			oLog.sum.optSize = 0;
		}

		for (const nm in oLog.hSize) {
			const e = oLog.hSize[nm];
			const ext = '.'+ e.ext;
			if (! REG_CNV_AAC.test(ext)) continue;

			cnv(
				resolve(curPrj, e.fld_nm + ext),
				resolve(curPrjBase, e.fld_nm + ext),
				'no_move',
			);
		}

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
		break;

	case 'all':{	// ファイル最適化
		ensureDir(curPrjBase);
		foldProc(curPrj, ()=> {}, dir=> {
			const wdBase = resolve(curPrjBase, dir);
			ensureDir(wdBase);
			foldProc(resolve(curPrj, dir), (url, name)=> {
				// 退避素材フォルダに元素材を移動
				if (! REG_CNV_AAC.test(name)) return;
				cnv(url, resolve(wdBase, name));
			}, ()=> {});
		});

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
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

		Promise.allSettled(a.map(t=> t()))
		.then(()=> log_exit(0));
	}	break;
}