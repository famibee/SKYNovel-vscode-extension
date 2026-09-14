/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IDecryptInfo} from './CmnLib';
import {checkDownloadUrl} from './DownloadUrlCheck';
import {Encryptor} from './Encryptor';
import {extractSettingSnFromInstaller} from './InstallerExtract';
import {assertHasExperienceConst, assertSafeAppName, checksumFromInstalledApp, checksumHex, settingSnFileName, appendPatchFooter, type T_LEGACY_PATCH_APP_CONFIG} from './LegacyAppCheck';

import {webcrypto} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';


// 過去アプリ向けパッチ配布（購入者チェック付き）の配布物を生成する CLI
// （拡張機能には組み込まない・独立CLI。genUpdUrl.ts と同型）。
//
// 背景・仕様は src/docs/legacy-app-patch.md 参照。
//
// 2026-09-14: 複数ver・複数アプリを1本の実行ファイルにまとめられるよう、
// フラットなCLI引数方式からJSON設定ファイル方式に変更（--app-name/--setting等の
// 引数だけでは複数アプリ×複数verの組み合わせが煩雑になるため）。
//
// 2026-09-14: `settings`（過去出荷ビルド分の平文 setting.sn のローカルパス）を
// `legacyInstallers`（過去出荷ビルド分のインストーラーファイルそのもの。.dmg/.exe）に
// 全面変更。理由：
// - 開発者は非プログラマ想定（GUI操作ぐらいはできる前提）で、平文 setting.sn を
//   手元に集めておく運用は非現実的。インストーラーファイル（開発者が当然保持している
//   はずの配布実績）をそのまま渡す方が明快（TODO.md §0・legacy-app-patch.md参照）
// - crypto:true のプロジェクトでは、暗号化済み setting.sn の現物さえあればチェックサム
//   計算に鍵は不要（詰められていない仕様#1）。インストーラーから直接抽出すれば
//   平文を経由する必要が無く、鍵（pass.json）は settingSnFileName の算出にのみ使う
//
// やること（アプリごとに）：
// - relPath と crypto から settingSnFileName（asar 内で探す basename）を算出
// - 各 --config の app エントリについて、legacyInstallers（過去出荷ビルドのインストーラー
//   ファイル）から extractSettingSnFromInstaller() で暗号化済み setting.sn を直接抽出し、
//   checksumHex() でチェックサムを計算 → 配列にする（詰められていない仕様#1）
// - crypto:false の場合のみ、抽出した中身は平文なので assertHasExperienceConst() で
//   検証できる。crypto:true では平文にアクセスできず自動検証はできないため、
//   体験版インストーラーを誤って混ぜないよう警告を表示する（詰められていない仕様#1）
// - appName はパス組み立てに使われるため assertSafeAppName() で検証する
//   （2026-09-14・セキュリティ確認で追加："/"・".." を含むとパストラバーサルになりうる）
// - 全アプリ分の Config をまとめて JSON 配列化し、--stub（汎用バイナリ本体）の末尾に連結して
//   --out に書き出す（appendPatchFooter()。パッチアプリ本体・patch_app/src/footer.rs が
//   読み取れる形式。Config = Vec<AppConfig>）
//
// 2026-09-14: downloadUrl の直リンク検証（checkDownloadUrl()）と、実機スキャン
// （checksumFromInstalledApp()。同一OSにインストール済みの旧バージョンから自動収集）
// を結線。どちらも失敗時は警告を出すのみで生成は止めない（downloadUrlは一時的な
// ネットワーク障害の可能性があり、実機スキャンは legacyInstallers で代替できるため）。
//
// ⚠️ ここでやらないこと（未実装・別途対応）：
// - 過去出荷ビルドのインストーラー自体に体験版チェック機構（setting.sn）が実装されて
//   いない場合がある（テンプレート更新前の古いバージョン。2026-09-14実機検証で判明。
//   legacy-app-patch.md 詰められていない仕様参照）。この場合 extractSettingSnFromInstaller
//   が例外を投げるので、そのバージョンは legacyInstallers から外すよう案内するのみ
//
// 設定ファイル（--config）の形式：
// {
//   "apps": [
//     {
//       "appName"         : "MyGame",
//       "pass"            : "pass.jsonのパス",
//       "relPath"         : "theme/setting.sn",
//       "crypto"          : true,
//       "downloadUrl"     : "https://example.com/mygame-patch",
//       "legacyInstallers": ["旧v1.0のインストーラーパス(.dmg/.exe)", ...],  ※最低1つ
//       "scanInstalled"   : false   ※省略可（既定false）。trueなら同一OSに
//                                     インストール済みの旧バージョンも自動でスキャンし、
//                                     見つかればチェックサムに追加する（見つからなくてもOK）
//     },
//     ...   ← 複数アプリをまとめる場合はここに並べるだけ
//   ]
// }
//
// 使い方：
//   bun src/genLegacyPatch.ts --config <設定JSONのパス> --stub <汎用バイナリ(stub)のパス> --out <出力先パス>


type T_APP_ENTRY = {
	appName				: string;
	pass				: string;
	relPath				: string;
	crypto				: boolean;
	downloadUrl			: string;
	legacyInstallers	: string[];
	scanInstalled?		: boolean;
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
	const {appName, pass: pathPass, relPath, crypto: isCryptoMode, downloadUrl, legacyInstallers, scanInstalled} = entry;

	if (! appName || ! pathPass || ! relPath || typeof isCryptoMode !== 'boolean' || ! downloadUrl) {
		usageAndExit(`設定エントリの必須項目が不足している: ${JSON.stringify(entry)}`);
	}
	try {
		assertSafeAppName(appName);
	}
	catch (e) {
		usageAndExit((<Error>e).message);
	}
	// legacyInstallers・scanInstalled のどちらか（または両方）で最低1件のチェックサムが
	// 確保できればよい。両方無い設定は許可しない
	if (! Array.isArray(legacyInstallers)) usageAndExit(`legacyInstallers が配列でない（${appName}）`);
	if (legacyInstallers.length === 0 && ! scanInstalled) usageAndExit(`legacyInstallers を最低1つ指定するか、scanInstalled:true を指定すること（${appName}）`);
	for (const p of [pathPass, ...legacyInstallers]) {
		if (! existsSync(p)) usageAndExit(`ファイルが見つからない（${appName}）: ${p}`);
	}

	// downloadUrl が実際にインストーラーの直リンクを指しているか検証する（詰められていない
	// 仕様#2）。一時的なネットワーク障害等もあり得るため、失敗時は警告のみで生成は続ける
	const urlCheck = await checkDownloadUrl(downloadUrl);
	if (! urlCheck.ok) {
		console.warn(`⚠️  ${appName}: downloadUrl の検証に失敗しました（${urlCheck.reason ?? '不明なエラー'}）。`
			+'配布前に手動でURLが直リンクであることを確認してください：'+ downloadUrl);
	}

	const hPass = <IDecryptInfo>JSON.parse(readFileSync(pathPass, {encoding: 'utf8'}));
	const encry = new Encryptor(hPass, webcrypto.subtle);
	await encry.init();

	const fnSettingSn = settingSnFileName(encry, relPath, isCryptoMode);

	const checksumSetting: string[] = [];
	for (const pathInstaller of legacyInstallers) {
		let buf: Buffer;
		try {
			buf = extractSettingSnFromInstaller(pathInstaller, fnSettingSn);
		}
		catch (e) {
			usageAndExit(`${appName} / ${pathInstaller}: setting.sn の抽出に失敗（${(<Error>e).message}）。このバージョンには体験版チェック機構（テンプレート標準の setting.sn）がまだ実装されていない古いビルドの可能性がある。legacyInstallers から外すこと`);
		}

		if (! isCryptoMode) {
			// crypto:false のみ、抽出した中身が平文のまま残っているので自動チェックできる
			try {
				assertHasExperienceConst(buf.toString('utf8'));
			}
			catch (e) {
				usageAndExit(`${appName} / ${pathInstaller}: ${(<Error>e).message}`);
			}
		}
		checksumSetting.push(checksumHex(buf));
	}

	// scanInstalled:true なら、同一OSにインストール済みの旧バージョンも自動でスキャンする
	// （案A拡張。legacyInstallers と違いOSをまたげないが、手元にインストール済みなら
	// インストーラーファイルを探さずに済む）。見つからなくてもエラーにはしない
	if (scanInstalled) {
		const hex = checksumFromInstalledApp(appName, fnSettingSn);
		if (hex) {
			checksumSetting.push(hex);
			console.log(`  ℹ️ ${appName}: 実機にインストール済みの旧バージョンを検出し、チェックサムに追加しました`);
		}
	}

	if (checksumSetting.length === 0) {
		usageAndExit(`${appName}: チェックサムを1件も確保できなかった（legacyInstallers・scanInstalledのどちらも空振り）。scanInstalled は実機に対象アプリがインストールされていない場合ヒットしない`);
	}

	if (isCryptoMode && legacyInstallers.length > 0) {
		console.warn(`⚠️  ${appName}: crypto:true のため、legacyInstallers に体験版のインストーラーが`
			+' 混ざっていないか自動検証できません（詰められていない仕様#1参照）。'
			+`指定した ${String(legacyInstallers.length)} 件が全て製品版であることを確認してください：`);
		for (const p of legacyInstallers) console.warn(`  - ${p}`);
	}

	cfgs.push({
		appName,
		checksumSetting,
		settingSnFileName	: fnSettingSn,
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
