/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {Transform} from 'stream';
import {Encryptor} from './Encryptor';
import {Buffer} from 'buffer';
import path = require('path');

export class EncryptorTransform extends Transform {
	private	static	readonly LEN_ENC	= 1024 *10;
	private	cnt_code	= EncryptorTransform.LEN_ENC;
	private	ite_buf		= 2;
	private	bh			: Buffer;

	private readonly	hExt2N: {[name: string]: number} = {
		'jpg'	: 1,
		'jpeg'	: 1,
		'png'	: 2,
		'svg'	: 3,
		'webp'	: 4,
		'mp3'	: 10,
		'm4a'	: 11,
		'ogg'	: 12,
		'aac'	: 13,
		'flac'	: 14,
		'wav'	: 15,
		'mp4'	: 20,
		'webm'	: 21,
		'ogv'	: 22,
	};

	// 暗号化でレポートテキストを吐くようにする？（処理だけコメントアウトで残しても良さげ）
	constructor(private readonly encry: Encryptor, readonly short_path: string) {
		super();

		this.bh = Buffer.alloc(this.ite_buf + this.cnt_code);
		this.bh[0] = 0;	// bin ver
		this.bh[1] = this.hExt2N[path.extname(short_path).slice(1)] ?? 0;
//console.log(`fn:EncryptorTransform.ts line:43 short_path:${short_path} id:${path.extname(short_path).slice(1)} new_id:${this.bh[1]}`);
	}

	override _transform(chunk: any, _enc: BufferEncoding, cb: ()=> void) {
		if (this.cnt_code === 0) {
/**/console.log(`fn:EncryptorTransform.ts line:49 A enc:${_enc} len:${chunk.length}`);
			this.push(chunk); cb(); return;}

		const len = chunk.length;
/**/console.log(`fn:EncryptorTransform.ts line:53 B enc:${_enc} len:${len}`);
		if (this.cnt_code > len) {
			this.bh.set(chunk, this.ite_buf);
			this.ite_buf += len;
			this.cnt_code -= len;
			cb();
			return;
		}

		this.bh.set(chunk.slice(0, this.cnt_code), this.ite_buf);
		this.ite_buf += len;
/**/console.log(`fn:EncryptorTransform.ts line:64 C:${(this.cnt_code === len)}`);
		const need_after = this.cnt_code < len;
		this.codeArea();
		if (need_after) this.push(chunk.slice(this.cnt_code));
			// len -this.cnt_code
		cb();
	}
	override _final(cb: ()=> void) {
/**/console.log(`fn:EncryptorTransform.ts line:72 _final`);
		this.codeArea(); cb();
	}
	private codeArea() {
		if (this.cnt_code === 0) return;
		this.cnt_code = 0;
/*
console.log(`fn:EncryptorTransform.ts line:78   codeArea:%o`, Buffer.from(this.bh).toString('hex').slice(0, 32));
const g0 = Array.from(this.bh.slice(0, this.ite_buf));
console.log(`fn:EncryptorTransform.ts line:80   ite_buf:${this.ite_buf} g0.len:${g0.length}`);
const g1 = lib.WordArray.create(g0);
console.log(`fn:EncryptorTransform.ts line:82   g1_32:%o g1.len:${g1.words.length}`, Buffer.from(g1.words).toString('hex').slice(0, 32));
const enc = this.encry.enc(g1);
console.log(`fn:EncryptorTransform.ts line:84   enc:%o enc.len:${enc.length}`, enc.slice(0, 32));
*/
		const e = this.encry.enc(this.bh.slice(0, this.ite_buf).toString('base64'));
const d = Buffer.from(this.encry.dec(e), 'base64');
console.log(`fn:EncryptorTransform.ts line:88 ++ d:%o`, d.slice(0, 32));

const eb = Buffer.from(e, 'binary').toString('hex');
console.log(`fn:EncryptorTransform.ts line:91 e:%o -:%o e.length:${e.length} ite_buf:${this.ite_buf}`, eb.slice(0, 32), eb.slice(-32));

		const bl = Buffer.alloc(4);
		bl.writeUInt32LE(e.length, 0);	// cripted len
		this.push(bl);

		this.push(e);
	}

}
