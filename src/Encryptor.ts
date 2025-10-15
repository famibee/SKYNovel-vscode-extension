/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IDecryptInfo} from './CmnLib';

import {v5} from 'uuid';
//x	const {subtle} = crypto;	// subtleの扱い、拡張機能と snsys_pre で変える必要があるので


// hex String 2 ArrayBuf (nodejs の Buffer を使わない)
export function hexStr2ab(i: string): ArrayBuffer {
	return new Uint8Array(
		(i.match(/../g)?.map(h=> parseInt(h, 16)) ?? []
	)).buffer;
}
export function ab2hexStr(ab: ArrayBuffer) {
	return [...new Uint8Array(ab)]
	.map(x=> x.toString(16).padStart(2, '0')).join('');
}

export function encAbBase64(ab: ArrayBuffer): string {
	return btoa(new Uint8Array(ab)
	.reduce((binStr, uint8)=> binStr + String.fromCharCode(uint8), ''));
}
export function decBase64Ab(base64: string): Uint8Array<ArrayBuffer> {
	return Uint8Array.from(atob(base64), binCh=> binCh.charCodeAt(0));
}
export function encStrBase64(s: string): string {
	return encAbBase64(
		new TextEncoder().encode(s).buffer
	);
}
export function decBase64Str(base64: string): string {
	return new TextDecoder().decode(
		decBase64Ab(base64)
	);
}
	// [JavaScript] Unicode 文字列やバイナリデータを Base64 エンコードおよびデコードする #JavaScript - Qiita https://qiita.com/kerupani129/items/1d6b936974ec65ae4833

export class Encryptor {
	readonly	#strHPass;
	readonly	#acp;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(private readonly hPass: IDecryptInfo, private readonly subtle: any) {
		this.#strHPass = JSON.stringify(hPass);
		this.#acp = {name: 'AES-GCM', iv: hexStr2ab(hPass.iv)};
		// subtle は拡張機能 と snsys_pre の分離の都合で外からもらう
	}

	get strHPass() {return this.#strHPass}
	#digest(s: string) {
		return this.subtle.digest('SHA-512', new TextEncoder().encode(s));
	}
	//async	hashSHA512(str: string) {return encAbBase64(await this.#digest(this.strHPass + str))}
	uuidv5(d: string) {return v5(d, this.hPass.pass)}

	async	init() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const keyMaterial = await this.subtle.importKey(
			'raw',
			await this.#digest(this.hPass.pass),
			'PBKDF2',
			false,
			['deriveKey'],
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.#key = await this.subtle.deriveKey(
			{
				name: 'PBKDF2',
				hash: 'SHA-512',
				iterations: this.hPass.ite,
				salt: hexStr2ab(this.hPass.salt),
			},
			keyMaterial,
			{name: this.#acp.name, length: 256},
			false,
			['encrypt', 'decrypt'],
		);
	}
	#key: CryptoKey;

	encAb(ab: ArrayBuffer): Promise<ArrayBuffer> {
		return this.subtle.encrypt(this.#acp, this.#key, ab);
	}
	async	enc(tx: string): Promise<string> {
		return encAbBase64(
			await this.encAb(
				new TextEncoder().encode(tx).buffer
			)
		);
	}

	decAb(ab: ArrayBuffer): Promise<ArrayBuffer> {
		return this.subtle.decrypt(this.#acp, this.#key, ab);
	}
	async	dec(encTx: string): Promise<string> {
		return new TextDecoder().decode(
			await this.decAb(
				decBase64Ab(encTx).buffer
			)
		);
	}

}
