/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IDecryptInfo} from './CmnLib';
import {Encryptor} from './Encryptor';
import {assertHasExperienceConst, encryptedChecksum, settingSnFileName, appendPatchFooter, type T_LEGACY_PATCH_CONFIG} from './LegacyAppCheck';

import {webcrypto} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';


// 過去アプリ向けパッチ配布（購入者チェック付き）の配布物を生成する CLI
// （拡張機能には組み込まない・独立CLI。genUpdUrl.ts と同型）。
//
// 背景・仕様は src/docs/legacy-app-patch.md 参照。ここでやること：
// - 各 --setting（過去出荷ビルドごとの setting.sn 平文）について
//   assertHasExperienceConst() で &const.体験版 の存在を確認し、encryptedChecksum() で
//   チェックサムを計算 → 配列にする（詰められていない仕様#1：複数の過去出荷ビルド対応）
// - --rel-path と --crypto から settingSnFileName（asar 内で探す basename）を算出
// - Config を JSON化し、--stub（汎用バイナリ本体）の末尾に連結して --out に書き出す
//   （appendPatchFooter()。パッチアプリ本体・patch_app/src/footer.rs が読み取れる形式）
//
// ⚠️ ここでやらないこと（未実装・別途対応）：
// - downloadUrl が直リンクであることの検証（詰められていない仕様#2。検証粒度は未定）
// - 「インストール済みの過去バージョンアプリから自動でチェックサムを収集する」スキャン機能
//   （詰められていない仕様#1の収集方法。asar抽出が必要でこのCLIの範囲外）
//
// 使い方：
//   bun src/genLegacyPatch.ts \
//     --pass <pass.jsonのパス> \
//     --app-name <アプリ名> \
//     --rel-path <setting.snのdoc/prjからの相対パス。例: theme/setting.sn> \
//     --crypto <true|false> \
//     --download-url <URL> \
//     --stub <汎用バイナリ(stub)のパス> \
//     --out <出力先パス> \
//     --setting <setting.snの平文パス>  ※複数指定可（過去出荷ビルド分だけ繰り返す。最低1つ）

function parseArgs(argv: string[]) {
	const h: Record<string, string> = {};
	const settings: string[] = [];

	for (let i = 0; i < argv.length; i += 2) {
		const key = argv[i];
		const val = argv[i + 1];
		if (! key?.startsWith('--') || val === undefined) {
			console.error(`✗ 引数の形式が不正: ${key ?? '(無し)'}`);
			process.exit(1);
		}
		const name = key.slice(2);
		if (name === 'setting') settings.push(val);
		else h[name] = val;
	}
	return {h, settings};
}

const {h, settings} = parseArgs(process.argv.slice(2));
const {pass: pathPass, 'app-name': appName, 'rel-path': relPath, crypto: cryptoStr, 'download-url': downloadUrl, stub: pathStub, out: pathOut} = h;

function usageAndExit(message: string): never {
	console.error(`✗ ${message}`);
	console.error([
		'使い方: bun src/genLegacyPatch.ts',
		'  --pass <pass.jsonのパス> --app-name <アプリ名> --rel-path <theme/setting.sn等>',
		'  --crypto <true|false> --download-url <URL> --stub <汎用バイナリのパス> --out <出力先パス>',
		'  --setting <setting.snの平文パス>  ※複数指定可（最低1つ）',
	].join('\n'));
	process.exit(1);
}

if (! pathPass || ! appName || ! relPath || ! cryptoStr || ! downloadUrl || ! pathStub || ! pathOut) {
	usageAndExit('必須の引数が不足している');
}
if (cryptoStr !== 'true' && cryptoStr !== 'false') usageAndExit('--crypto は true か false で指定すること');
if (settings.length === 0) usageAndExit('--setting を最低1つ指定すること（過去出荷ビルド分だけ繰り返す）');
if (! /^https?:\/\//.test(downloadUrl)) usageAndExit(`--download-url は http(s):// で始まる必要がある: ${downloadUrl}`);
for (const p of [pathPass, pathStub, ...settings]) {
	if (! existsSync(p)) usageAndExit(`ファイルが見つからない: ${p}`);
}

const isCryptoMode = cryptoStr === 'true';

const hPass = <IDecryptInfo>JSON.parse(readFileSync(pathPass, {encoding: 'utf8'}));
const encry = new Encryptor(hPass, webcrypto.subtle);
await encry.init();

const checksumSetting: string[] = [];
for (const pathSetting of settings) {
	const plaintext = readFileSync(pathSetting, {encoding: 'utf8'});
	try {
		assertHasExperienceConst(plaintext);
	}
	catch (e) {
		usageAndExit(`${pathSetting}: ${(<Error>e).message}`);
	}
	checksumSetting.push(await encryptedChecksum(encry, plaintext));
}

const cfg: T_LEGACY_PATCH_CONFIG = {
	appName,
	checksumSetting,
	settingSnFileName	: settingSnFileName(encry, relPath, isCryptoMode),
	downloadUrl,
};

const stub = readFileSync(pathStub);
const patched = appendPatchFooter(stub, cfg);
writeFileSync(pathOut, patched);

console.log(`✓ 生成完了: ${pathOut}`);
console.log(`  appName: ${cfg.appName}`);
console.log(`  settingSnFileName: ${cfg.settingSnFileName}`);
console.log(`  checksumSetting: ${cfg.checksumSetting.length}件（過去出荷ビルド分）`);
console.log(`  downloadUrl: ${cfg.downloadUrl}`);
