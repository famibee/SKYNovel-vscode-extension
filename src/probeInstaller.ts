/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IDecryptInfo} from './CmnLib';
import {Encryptor} from './Encryptor';
import {extractSettingSnFromInstaller} from './InstallerExtract';
import {settingSnFileName} from './LegacyAppCheck';

import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';


// 過去版インストーラー1件について、①setting.sn抽出が実際に成功するかどうかだけを
// 判定する軽量プローブ。genLegacyPatch.ts本体（複数アプリ・複数インストーラーを
// まとめて処理し、チェックサムやフッターを生成する）とは別の、単発の判定専用CLI。
//
// patch_gen_gui（GUI）が「asar内の代替ファイルを指定…」ボタンを表示すべきか
// （＝①setting.snで通るなら不要）を、過去版インストーラーを追加した瞬間に
// 判定するために使う（2026-09-17・ユーザー指摘：①でいけるなら②のボタンを
// 出さないようにしたい）。チェックサム計算・設定JSON生成は行わない。

function parseArgs(argv: string[]) {
	const h: {[key: string]: string} = {};
	for (let i = 0; i < argv.length; i += 2) {
		const key = argv[i];
		const val = argv[i + 1];
		if (! key?.startsWith('--') || val === undefined) {
			console.error(`引数の形式が不正: ${key ?? '(無し)'}`);
			process.exit(2);
		}
		h[key.slice(2)] = val;
	}
	return h;
}

const {pass: pathPass, relPath, crypto: cryptoStr, installer: pathInstaller} = parseArgs(process.argv.slice(2));
if (! pathPass || ! relPath || ! cryptoStr || ! pathInstaller) {
	console.error('使い方: bun src/probeInstaller.ts --pass <path> --relPath <relPath> --crypto <true|false> --installer <インストーラーのパス>');
	process.exit(2);
}

const isCryptoMode = cryptoStr === 'true';

try {
	const hPass = <IDecryptInfo>JSON.parse(readFileSync(pathPass, {encoding: 'utf8'}));
	const encry = new Encryptor(hPass, webcrypto.subtle);
	await encry.init();
	const fnSettingSn = settingSnFileName(encry, relPath, isCryptoMode);
	extractSettingSnFromInstaller(pathInstaller, fnSettingSn);
	console.log('OK');
}
catch (e) {
	console.log(`FAIL: ${(<Error>e).message}`);
	process.exit(1);
}
