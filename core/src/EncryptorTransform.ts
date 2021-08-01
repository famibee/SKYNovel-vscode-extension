/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {Transform} from 'stream';
import {WriteStream} from 'fs-extra';
import {Encryptor} from './Encryptor';
import path = require('path');
import {lib} from 'crypto-js';

export class EncryptorTransform extends Transform {
	private	static	readonly LEN_ENC	= 1024 *10;
	private	cnt_code	= EncryptorTransform.LEN_ENC;
	private	ite_buf		= 2;
	private	bh			: Uint8Array;

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
	constructor(private readonly encry: Encryptor, readonly short_path: string, private readonly ws: WriteStream) {
		super({transform: (chunk: any, enc: any, cb: (error?: Error | null, data?: any) => void)=> this.transform(chunk, enc, cb)});
		this.on('end', ()=> this.end());

		this.bh = new Uint8Array(this.ite_buf + this.cnt_code);
		this.bh[0] = 0;	// bin ver
		this.bh[1] = this.hExt2N[path.extname(short_path).slice(1)] ?? 0;
	}

	private transform(chunk: any, _enc: any, cb: (error?: Error | null, data?: any) => void): void {
		if (this.cnt_code === 0) {cb(null, chunk); return;}

		const len = chunk.length;
		if (this.cnt_code > len) {
			this.bh.set(chunk, this.ite_buf);
			this.ite_buf += len;
			this.cnt_code -= len;
			cb(null);
			return;
		}

		this.bh.set(chunk.slice(0, this.cnt_code), this.ite_buf);
		const e = Buffer.from(
			this.encry.enc(lib.WordArray.create(Array.from(this.bh))), 'base64',
		); // atob(e6)

		const bl = Buffer.alloc(4);
		bl.writeUInt32LE(e.length, 0);	// cripted len
		this.push(bl);

		this.push(e);

		cb(null, (this.cnt_code === len) ?null :chunk.slice(this.cnt_code));
		this.cnt_code = 0;
	}
	override end(): void {
		if (this.cnt_code === 0) return;

		const e = Buffer.from(
			this.encry.enc(
				lib.WordArray.create(Array.from(this.bh.slice(0, this.ite_buf)))
			),
			'base64',
		); // atob(e6)

		const bl = Buffer.alloc(4);
		bl.writeUInt32LE(e.length, 0);	// cripted len
		this.ws.write(bl);

		//this.ws.write(e);
		this.ws.end(e);	// これがないと WriteStreamに closeイベントが発生しない
	}

}
