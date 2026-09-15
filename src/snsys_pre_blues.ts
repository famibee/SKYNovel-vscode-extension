/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IPluginInitArgBlues} from './CmnLib';
import {Encryptor} from './Encryptor';
const {subtle} = crypto;

// BlueSNovel版：getStKはElectron専用でセーブ暗号化をenc()一本化したBlueSNovelには
//	消費先が無いため呼ばない（bluesnovel/src/sn/CmnInterface.ts のコメント参照）
export async function init(pia: IPluginInitArgBlues) {
	const p = pia.tstDecryptInfo();	// この行変更したら生成ファイルを開いて要動作確認
	const encry = new Encryptor(p, subtle);
	await encry.init();

	pia.setDec(async (ext, tx)=> {
		return REG_FULL_CRYPTO.test(ext) ?await encry.dec(tx) :tx
	});
	const REG_FULL_CRYPTO = /(^|\.)(ss?n|json|html?)$/;

	pia.setDecAB(async iab=> {
		const el = new DataView(iab.slice(0, 4)).getUint32(0, true);
		const e = iab.slice(4, 4+el);

		const b = await encry.decAb(e);

		const b1 = b.slice(2);	// [0]:version [1]:ext_num（BlueSNovelは拡張子を秘匿しないため未使用）
		const b2 = iab.slice(4+el);
		return new Blob([b1, b2]).arrayBuffer();
	});

	pia.setEnc(tx=> encry.enc(tx));
	pia.getHash(str=> encry.uuidv5(str));
}
