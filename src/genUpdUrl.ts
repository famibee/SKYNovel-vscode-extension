/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IDecryptInfo} from './CmnLib';
import {Encryptor} from './Encryptor';

import {webcrypto} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';


// update_check の既定パッチサーバーURLが恒久的に死んだ場合に配布する
// upd_url.json を生成するツール（拡張機能には組み込まない・独立CLI）。
//
// 背景・仕様は src/docs/features.md の「upd_url.json 生成 CLI」節を参照。
// - プロジェクトの pass.json（IDecryptInfo 形式）の鍵で {"url": "…"} を
//   AES-GCM 暗号化し、Base64 で upd_url.json に書き出す
// - 出力ファイルは userData 直下に配置する運用（配置自体はこのツールの外）
// - 拡張子は .sn / .json / .html のいずれかでないと engine 側の dec() が
//   復号処理をスキップするため、出力ファイル名は .json 系のまま変えないこと
//
// 使い方：
//   bun src/genUpdUrl.ts <pass.jsonのパス> <新しいURL> [出力先パス=./upd_url.json]

const [pathPass, url, pathOut = './upd_url.json'] = process.argv.slice(2);

if (! pathPass || ! url) {
	console.error('使い方: bun src/genUpdUrl.ts <pass.jsonのパス> <新しいURL> [出力先パス=./upd_url.json]');
	process.exit(1);
}
if (! existsSync(pathPass)) {
	console.error(`✗ pass.json が見つからない: ${pathPass}`);
	process.exit(1);
}
if (! /^https?:\/\//.test(url)) {
	console.error(`✗ URL は http(s):// で始まる必要がある: ${url}`);
	process.exit(1);
}

const hPass = <IDecryptInfo>JSON.parse(readFileSync(pathPass, {encoding: 'utf8'}));
const encry = new Encryptor(hPass, webcrypto.subtle);
await encry.init();

const encTx = await encry.enc(JSON.stringify({url}));
writeFileSync(pathOut, encTx, {encoding: 'utf8'});

console.log(`✓ 生成完了: ${pathOut}`);
console.log(`  中身: {"url":"${url}"}`);
console.log('  配置先: 配布済みアプリの userData 直下（例: %APPDATA%/<アプリ名>/upd_url.json）');
