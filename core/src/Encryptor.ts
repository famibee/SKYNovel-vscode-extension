/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {lib, enc, PBKDF2, AES} from 'crypto-js';
import {v5} from 'uuid';
import {IDecryptInfo} from './CmnLib';

export class Encryptor {
	readonly	#pbkdf2	: lib.WordArray;
	readonly	#iv		: lib.WordArray;
	constructor(private readonly hPass: IDecryptInfo) {
		this.#iv = enc.Hex.parse(hPass.iv);
		this.#pbkdf2 = PBKDF2(
			enc.Utf8.parse(hPass.pass),
			enc.Hex.parse(hPass.salt),
			{
				keySize		: hPass.keySize,
				iterations	: hPass.ite,
			},
		);
	}
	get	strHPass(): string {return JSON.stringify(this.hPass);}
	uuidv5(short_path: string): string {return v5(short_path, this.hPass.pass);}

	enc(s: string | lib.WordArray): string {
		return AES.encrypt(s, this.#pbkdf2, {iv: this.#iv}).toString();
	}

	dec(s: string): string {	// テスト用復号
		return AES.decrypt(s, this.#pbkdf2, {iv: this.#iv}).toString(enc.Utf8);
	}

}
