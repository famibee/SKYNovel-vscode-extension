/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IDecryptInfo} from './CmnLib';
import {Encryptor} from './Encryptor';
import {assertHasExperienceConst, assertSafeAppName, encryptedChecksum, settingSnFileName, appendPatchFooter, type T_LEGACY_PATCH_APP_CONFIG} from './LegacyAppCheck';

import {webcrypto} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';


// 過去アプリ向けパッチ配布（購入者チェック付き）の配布物を生成する CLI
// （拡張機能には組み込まない・独立CLI。genUpdUrl.ts と同型）。
//
// 背景・仕様は src/docs/legacy-app-patch.md 参照。
//
// 2026-09-14: 複数ver・複数アプリを1本の実行ファイルにまとめられるよう、
// フラットなCLI引数方式からJSON設定ファイル方式に変更（--app-name/--setting等の
// 引数だけでは複数アプリ×複数verの組み合わせが煩雑になるため）。1アプリ分の処理内容
// （assertHasExperienceConst → encryptedChecksum → settingSnFileName）自体は変わっていない。
//
// やること（アプリごとに）：
// - 各 --config の app エントリについて、settings（過去出荷ビルドごとの setting.sn 平文）を
//   assertHasExperienceConst() で確認し、encryptedChecksum() でチェックサムを計算 → 配列にする
//   （詰められていない仕様#1：複数の過去出荷ビルド対応）
// - appName はパス組み立てに使われるため assertSafeAppName() で検証する
//   （2026-09-14・セキュリティ確認で追加："/"・".." を含むとパストラバーサルになりうる）
// - relPath と crypto から settingSnFileName（asar 内で探す basename）を算出
// - 全アプリ分の Config をまとめて JSON 配列化し、--stub（汎用バイナリ本体）の末尾に連結して
//   --out に書き出す（appendPatchFooter()。パッチアプリ本体・patch_app/src/footer.rs が
//   読み取れる形式。Config = Vec<AppConfig>）
//
// ⚠️ ここでやらないこと（未実装・別途対応）：
// - downloadUrl が直リンクであることの検証（詰められていない仕様#2。検証粒度は未定）
// - 「インストール済みの過去バージョンアプリから自動でチェックサムを収集する」スキャン機能
//   （詰められていない仕様#1の収集方法。asar抽出が必要でこのCLIの範囲外）
//
// 設定ファイル（--config）の形式：
// {
//   "apps": [
//     {
//       "appName"     : "MyGame",
//       "pass"        : "pass.jsonのパス",
//       "relPath"     : "theme/setting.sn",
//       "crypto"      : true,
//       "downloadUrl" : "https://example.com/mygame-patch",
//       "settings"    : ["setting.snの平文パス", ...]   ※最低1つ（過去出荷ビルド分だけ並べる）
//     },
//     ...   ← 複数アプリをまとめる場合はここに並べるだけ
//   ]
// }
//
// 使い方：
//   bun src/genLegacyPatch.ts --config <設定JSONのパス> --stub <汎用バイナリ(stub)のパス> --out <出力先パス>


type T_APP_ENTRY = {
	appName		: string;
	pass		: string;
	relPath		: string;
	crypto		: boolean;
	downloadUrl	: string;
	settings	: string[];
}

function usageAndExit(message: string): never {
	console.error(`✗ ${message}`);
	console.error([
		'使い方: bun src/genLegacyPatch.ts',
		'  --config <設定JSONのパス> --stub <汎用バイナリのパス> --out <出力先パス>',
		'',
		'設定JSONの形式は本ファイル冒頭のコメント、または src/docs/legacy-app-patch.md 参照',
	].join('\n'));
	process.exit(1);
}

function parseArgs(argv: string[]) {
	const h: {[key: string]: string} = {};
	for (let i = 0; i < argv.length; i += 2) {
		const key = argv[i];
		const val = argv[i + 1];
		if (! key?.startsWith('--') || val === undefined) usageAndExit(`引数の形式が不正: ${key ?? '(無し)'}`);
		h[key.slice(2)] = val;
	}
	return h;
}

const {config: pathConfig, stub: pathStub, out: pathOut} = parseArgs(process.argv.slice(2));

if (! pathConfig || ! pathStub || ! pathOut) usageAndExit('必須の引数が不足している（--config --stub --out）');
for (const p of [pathConfig, pathStub]) {
	if (! existsSync(p)) usageAndExit(`ファイルが見つからない: ${p}`);
}

const configRaw = <{apps?: T_APP_ENTRY[]}>JSON.parse(readFileSync(pathConfig, {encoding: 'utf8'}));
if (! Array.isArray(configRaw.apps) || configRaw.apps.length === 0) {
	usageAndExit('設定JSONの apps が空、または配列でない（最低1アプリ）');
}

const cfgs: T_LEGACY_PATCH_APP_CONFIG[] = [];

for (const entry of configRaw.apps) {
	const {appName, pass: pathPass, relPath, crypto: isCryptoMode, downloadUrl, settings} = entry;

	if (! appName || ! pathPass || ! relPath || typeof isCryptoMode !== 'boolean' || ! downloadUrl) {
		usageAndExit(`設定エントリの必須項目が不足している: ${JSON.stringify(entry)}`);
	}
	try {
		assertSafeAppName(appName);
	}
	catch (e) {
		usageAndExit((<Error>e).message);
	}
	if (! /^https?:\/\//.test(downloadUrl)) usageAndExit(`downloadUrl は http(s):// で始まる必要がある（${appName}）: ${downloadUrl}`);
	if (! Array.isArray(settings) || settings.length === 0) usageAndExit(`settings を最低1つ指定すること（${appName}）`);
	for (const p of [pathPass, ...settings]) {
		if (! existsSync(p)) usageAndExit(`ファイルが見つからない（${appName}）: ${p}`);
	}

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
			usageAndExit(`${appName} / ${pathSetting}: ${(<Error>e).message}`);
		}
		checksumSetting.push(await encryptedChecksum(encry, plaintext));
	}

	cfgs.push({
		appName,
		checksumSetting,
		settingSnFileName	: settingSnFileName(encry, relPath, isCryptoMode),
		downloadUrl,
	});
}

const stub = readFileSync(pathStub);
const patched = appendPatchFooter(stub, cfgs);
writeFileSync(pathOut, patched);

console.log(`✓ 生成完了: ${pathOut}（${String(cfgs.length)}アプリ分）`);
for (const cfg of cfgs) {
	console.log(`  - ${cfg.appName}: checksumSetting ${String(cfg.checksumSetting.length)}件（過去出荷ビルド分）, settingSnFileName=${cfg.settingSnFileName}`);
}
