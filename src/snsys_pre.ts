/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {IPluginInitArg} from './CmnLib';
import {Encryptor} from './Encryptor';
const {subtle} = crypto;

export async function init(pia: IPluginInitArg): Promise<void> {
	const p = pia.tstDecryptInfo();	// この行変更したら生成ファイルを開いて要動作確認
	const encry = new Encryptor(p, subtle);
	await encry.init();

	pia.setDec(async (ext, tx)=> REG_FULL_CRYPTO.test(ext) ?await encry.dec(tx) :tx);
	const REG_FULL_CRYPTO = /(^|\.)(sn|ssn|json|html?)$/;

	pia.setDecAB(async iab=> {
		const el = new DataView(iab.slice(0, 4)).getUint32(0, true);
		const e = iab.slice(4, 4+el);
//console.log(`fn:snsys_pre.ts setDec      = bin: +:%o -:%o     elen:${el} size:${iad.byteLength}`, ab2hexStr(e.slice(0, 16)), ab2hexStr(e.slice(-16)));

		const b = await encry.decAb(e);

	//	const v = new DataView(b.slice(0, 1)).getUint8(0);
		const ext_num = new DataView(b.slice(1, 2)).getUint8(0);
//console.log(`fn:snsys_pre.ts                    s:${ab2hexStr(b.slice(0, 16))} ext_num:${ext_num}`);

		const b1 = b.slice(2);
		const b2 = iab.slice(4+el);
		const ab = await new Blob([b1, b2]).arrayBuffer();
//console.log(`fn:snsys_pre.ts setDec      - b1len:${b1.byteLength} + b2len:${b2.byteLength} = full_len:${ab.byteLength}`);

		return {ext_num, ab};
	});

	pia.setEnc(tx=> encry.enc(tx));
	pia.getStK(()=> p.stk);
	pia.getHash(str=> encry.uuidv5(str));
}
