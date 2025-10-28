/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2025-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {FULL_PATH, FULL_SCH_PATH, PROJECT_PATH} from './CmnLib';
import {vsc2fp} from './CmnLib';
import {FLD_CRYPT_DOC, REG_FULLCRYPTO, REG_NEEDCRYPTO} from './Project';
import {FLD_PRJ_BASE} from './PrjCmn';
import type {Encryptor} from './Encryptor';

import {Uri} from 'vscode';
import * as crc32 from 'crc-32';
import {closeSync, existsSync, openSync, readFileSync, readSync} from 'node:fs';
import {readJson, remove, writeJson} from 'fs-extra/esm';


export type T_DIFF = {
	hash: number,	// ファイル変更検知ハッシュ
	cn	: string,	// ファイル名匿名化辞書
};
export type H_T_DIFF = {[pp: PROJECT_PATH]: T_DIFF};

export type T_CN = {
	pathCn	: string | undefined,
	diff	: T_DIFF | undefined,
	pp		: PROJECT_PATH,
};


export class HDiff {
	#pp2hDiff	: H_T_DIFF	= <H_T_DIFF>Object.create(null);

	constructor(
		private readonly PATH_DIFF	: FULL_SCH_PATH,
				readonly FLD_SRC	: string,
		private readonly PATH_CRYPT	: FULL_SCH_PATH,
		private readonly encry		: Encryptor,
	) {
		const REG_path2 = `\\/(doc\\/prj|${FLD_SRC}\\/${FLD_PRJ_BASE})\\/`;	// (new RegExp('\')) の場合は、バックスラッシュは２つ必要
		this.#REG_path2cn = new RegExp(REG_path2 +'.+$');
		this.#REG_fp2pp	= new RegExp('^.+'+ REG_path2);
	}

	async init() {
		if (existsSync(this.PATH_DIFF)) this.#pp2hDiff = <H_T_DIFF>await readJson(this.PATH_DIFF);

		for (const [pp, {cn}] of Object.entries(this.#pp2hDiff)) {
			const fp = `${this.PATH_CRYPT}${cn}`;
			// 存在しなくなってるファイルの情報を削除
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			if (! existsSync(fp)) delete this.#pp2hDiff[pp];
		}
	}
	clear() {this.#pp2hDiff = <H_T_DIFF>Object.create(null)}
	// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
	del(pp: PROJECT_PATH) {delete this.#pp2hDiff[pp]}
	get(pp: PROJECT_PATH) {return this.#pp2hDiff[pp]}
	get keysPP(): PROJECT_PATH[] {return Object.keys(this.#pp2hDiff)}


	path2cn(afp: FULL_PATH): T_CN {
		const fp = vsc2fp(Uri.file(afp).path);
		const pp = this.fp2pp(fp);
		const diff = this.#pp2hDiff[pp];
		return {
			pathCn: diff
				? fp.replace(this.#REG_path2cn, `/${FLD_CRYPT_DOC}/prj/${diff.cn}`)
				: undefined,
			diff,
			pp,
		};
	}
	readonly	#REG_path2cn;
	readonly	#REG_fp2pp;
	fp2pp(fp: FULL_PATH): PROJECT_PATH {return fp.replace(this.#REG_fp2pp, '')}


	filter(regDiff: RegExp) {
		return Promise.allSettled(
			Object.entries(this.#pp2hDiff)
			.filter(([pp, ])=> regDiff.test(pp))
			.map(([, {cn}])=> remove(`${this.PATH_CRYPT}${cn}`))
		);
	}

	//MARK: ファイルハッシュの保存
	readonly save = ()=> writeJson(this.PATH_DIFF, this.#pp2hDiff);


	//MARK: ファイルハッシュの検知と辞書更新
	//	ファイル差異があるか返す
	isDiff({path}: Uri): boolean {
		const fp = vsc2fp(path);
		const {pathCn, diff, pp} = this.path2cn(fp);
// console.log(`fn:Project.ts #isDiff fp:${fp} pp:${pp} pathCn:${pathCn} A:${! existsSync(pathCn ?? '')}`);
		if (pathCn && ! existsSync(pathCn)) return true;

		let hash = 0;
		if (REG_FULLCRYPTO.test(fp)) {
			hash = crc32.buf(Buffer.from(readFileSync(fp, {encoding: 'utf8'}), 'binary'), 0);
		//	hash = crc32.str(readFileSync(fp, {encoding: 'utf8'}));
				// 高速らしい SheetJS/js-crc32: :cyclone: JS 標準 CRC-32 および CRC32C の実装 https://github.com/SheetJS/js-crc32
		}
		else {
			this.#bufChkDiff.fill(0, 0, this.#LEN_CHKDIFF);
			const fd = openSync(fp, 'r');
			readSync(fd, this.#bufChkDiff, 0, this.#LEN_CHKDIFF, 0);
			closeSync(fd);
			hash = crc32.buf(this.#bufChkDiff, 0);
		}
// console.log(`fn:Project.ts      B:${diff?.hash !== hash} b0:${diff?.hash} b1:${hash}`);
		if (diff?.hash === hash) return false;

		this.#pp2hDiff[pp] = {
			hash,
			cn	: REG_NEEDCRYPTO.test(pp)
				? pp
				.replace(this.#REG_SPATH2HFN, `$1/${this.encry.uuidv5(pp)}$2`)
				.replace(this.#REG_REPPATHJSON, '.bin')
				: pp,
		};
		return true;
	}
		readonly	#LEN_CHKDIFF	= 1024 *20;	// o
	//	readonly	#LEN_CHKDIFF	= 1024 *10;	// x 変更を検知しない場合があった
	//	readonly	#LEN_CHKDIFF	= 1024;		// x 変更を検知しない場合があった
		readonly	#REG_SPATH2HFN	= /([^/]+)\/[^/]+(\.\w+)/;
		#bufChkDiff = new Uint8Array(this.#LEN_CHKDIFF);
		readonly	#REG_REPPATHJSON	= /\.(jpe?g|png|svg|webp|mp3|m4a|ogg|aac|flac|wav|mp4|webm|ogv)/g;

}
