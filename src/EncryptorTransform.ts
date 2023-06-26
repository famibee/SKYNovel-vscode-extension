/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2023 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {Transform} from 'stream';
import {Encryptor} from './Encryptor';
import {Buffer} from 'buffer';
import {extname} from 'path';

export class EncryptorTransform extends Transform {
	static	readonly #LEN_ENC	= 1024 *10;
	#cnt_code	= EncryptorTransform.#LEN_ENC;
	#ite_buf	= 2;
	#bh			: Buffer;

	readonly	#hExt2N: {[name: string]: number} = {
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

		this.#bh = Buffer.alloc(this.#ite_buf + this.#cnt_code);
		this.#bh[0] = 0;	// bin ver
		this.#bh[1] = this.#hExt2N[extname(short_path).slice(1)] ?? 0;
//console.log(`fn:EncryptorTransform.ts short_path:${short_path} id:${path.extname(short_path).slice(1)} new_id:${this.bh[1]}`);
	}

	override _transform(chunk: any, _enc: BufferEncoding, cb: ()=> void) {
		if (this.#cnt_code === 0) {
//console.log(`fn:EncryptorTransform.ts A len:${chunk.length}`);
			this.push(chunk); cb(); return;}

		const len = chunk.length;
//console.log(`fn:EncryptorTransform.ts B len:${len} cnt_code:${this.cnt_code}`);
		if (len < this.#cnt_code) {
//console.log(`fn:EncryptorTransform.ts C ite_buf:${this.ite_buf}`);
			this.#bh.set(chunk, this.#ite_buf);
			this.#ite_buf += len;
			this.#cnt_code -= len;
			cb();
			return;
		}

		this.#bh.set(chunk.slice(0, this.#cnt_code), this.#ite_buf);
		this.#ite_buf += this.#cnt_code;
		const cnt_code = this.#cnt_code;
		this.#codeArea();
		if (len > cnt_code) {
//console.log(`fn:EncryptorTransform.ts a len:${len - cnt_code}`);
			this.push(chunk.slice(cnt_code));}
		cb();
	}
	override _final(cb: ()=> void) {
//console.log(`fn:EncryptorTransform.ts _final`);
		this.#codeArea(); cb();
	}
	#codeArea() {
		if (this.#cnt_code === 0) return;
		this.#cnt_code = 0;

		const e = this.encry.enc(this.#bh.subarray(0, this.#ite_buf).toString('base64'));
//const d = Buffer.from(this.encry.dec(e), 'base64').toString('hex');
//console.log(`fn:EncryptorTransform.ts line:88 ++%o --%o`, d.slice(0, 32), d.slice(-32));

//const eb = Buffer.from(e, 'binary').toString('hex');
//console.log(`fn:EncryptorTransform.ts line:91 e:%o -:%o e.length:${e.length} ite_buf:${this.ite_buf}`, eb.slice(0, 32), eb.slice(-32));

		const bl = Buffer.alloc(4);
		bl.writeUInt32LE(e.length, 0);
		this.push(bl);

		this.push(e);
	}

}
