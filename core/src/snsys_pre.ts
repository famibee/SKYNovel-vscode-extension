/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {IPluginInitArg} from './CmnLib';

export async function init(hIA: IPluginInitArg): Promise<void> {
	const p = hIA.tstDecryptInfo();	// 変更したら生成ファイルを開いて要動作確認

	const {enc, AES, PBKDF2, RIPEMD160} = await import('crypto-js');
	const iv = enc.Hex.parse(p.iv);
	const pbkdf2 = PBKDF2(
		enc.Utf8.parse(p.pass),
		enc.Hex.parse(p.salt),
		{keySize: p.keySize, iterations: p.ite}
	);

	const regFullCrypto = /(^|\.)(sn|ssn|json|html?)$/;
	const {Buffer} = require('buffer');
	hIA.setDec((ext, d)=> {
		if (typeof d === 'string') return {
			ret: regFullCrypto.test(ext)
				? AES.decrypt(d, pbkdf2, {iv},).toString(enc.Utf8)
				: d,
			ext_num: 0
		};
//		if (ext !== 'bin') return {ret: d, ext_num: 0};

		const cl = new DataView(d).getUint32(0, true);
		const b6 = d.slice(4, 4+cl);
//const code2hex = Buffer.from(b6, 'binary').toString('hex');
//console.log(`fn:index.ts line:31         bin: +:%o -:%o       cl:${cl}`, code2hex.slice(0, 32), code2hex.slice(-32));

		const q = AES.decrypt(Buffer.from(b6, 'binary').toString('utf8'), pbkdf2, {iv}).toString(enc.Utf8);
		const b = Buffer.from(q, 'base64');
//console.log(`fn:index.ts line:34    original: ++%o --%o`, b.toString('hex').slice(0, 32), b.toString('hex').slice(-32));

	//	const v = b.readUInt8(0);
	//	const en = b.readUInt8(1);
		const b1 = b.slice(2);
		const b2 = Buffer.from(d.slice(4+cl), 'binary');
		const ab = Buffer.concat([b1, b2]);
//console.log(`fn:index.ts line:41 === b1len:${b1.length} + b2len:${b2.length} = full_len:${ab.length}`);

		return {ret: ab, ext_num: b.readUInt8(1)};
	});

	hIA.setEnc(d=> String(AES.encrypt(d, pbkdf2, {iv})));
	hIA.getStK(()=> p.stk);
	hIA.getHash(d=> RIPEMD160(d).toString(enc.Hex));
}
