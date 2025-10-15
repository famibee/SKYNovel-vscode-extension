/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {Encryptor} from './Encryptor';

import {Transform} from 'node:stream';
import {Buffer} from 'node:buffer';
import {extname} from 'node:path';


const LEN_CODE	= 1024 *10;


export class EncryptorTransform extends Transform {
	#len_code	= LEN_CODE;
	#ite		= 2;
	#bh			: Buffer<ArrayBuffer>;

	readonly	#hExt2N: {[ext: string]: number} = {
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

	constructor(private readonly encry: Encryptor, readonly short_path: string) {
		super();

		this.#bh = Buffer.alloc(this.#ite + this.#len_code);
		this.#bh[0] = 0;	// bin ver
		this.#bh[1] = this.#hExt2N[extname(short_path).slice(1)] ?? 0;
//console.log(`fn:EncryptorTransform.ts short_path:${short_path} id:${extname(short_path).slice(1)} ext_num:${this.#bh[1]}`);
	}

	override _transform(chunk: any, _enc: string, cb: ()=> void) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const size: number = chunk.length;
		if (this.#len_code === 0) {
//console.log(`fn:EncryptorTransform.ts A size:${size}`);
			this.push(chunk); cb(); return;}

//console.log(`fn:EncryptorTransform.ts B size:${size} len_code:${this.#len_code} ite:${this.#ite}`);
		if (size < this.#len_code) {
//console.log(`fn:EncryptorTransform.ts C`);
			this.#bh.set(chunk, this.#ite);
			this.#ite += size;
			this.#len_code -= size;
			cb();
			return;
		}

		this.#bh.set(chunk.slice(0, this.#len_code), this.#ite);
		this.#ite += this.#len_code;
		const code_size = this.#len_code;
		void this.#codeArea().then(()=> {
			if (size > code_size) {
//console.log(`fn:EncryptorTransform.ts a len:${size - code_size}`);
				this.push(chunk.slice(code_size));}
			cb();
		});
	}
	override _final(cb: ()=> void) {
//console.log(`fn:EncryptorTransform.ts _final`);
		void this.#codeArea().then(()=> cb());
	}
	async	#codeArea() {
		if (this.#len_code === 0) return;
		this.#len_code = 0;

//console.log(`fn:EncryptorTransform.ts #codeArea s:${ab2hexStr(this.#bh.buffer.slice(0, 16))}`);
		const e = await this.encry.encAb(this.#bh.buffer.slice(0, this.#ite));
//console.log(`fn:EncryptorTransform.ts #codeArea e:%o -:%o e.length:${e.byteLength} ite:${this.#ite}`, ab2hexStr(e.slice(0, 16)), ab2hexStr(e.slice(-16)));

		const bl = Buffer.alloc(4);
		bl.writeUInt32LE(e.byteLength, 0);
		this.push(bl);

		this.push(new Uint8Array(e));
		//this.push(e);	// err
	}

}
