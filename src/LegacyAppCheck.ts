/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {Encryptor} from './Encryptor';

import {extractFile, listPackage} from '@electron/asar';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {basename, extname, join} from 'node:path';


// 過去アプリ向けパッチ配布（購入者チェック付き）の下ごしらえ。
// src/docs/legacy-app-patch.md の「最有力」の組み合わせ（案A＋チェックサム比較）を
// コアロジックだけ切り出したもの。まだどこからも呼ばれていない（未結線）。
//
// ✅ 決定済み（2026-09-12・作者確認）：`const.体験版` はテンプレ標準として変更されない前提
// でよい。プロジェクト側で改名・削除されていた場合の検出漏れは許容する（テンプレ準拠が前提）
//
// 未決の論点（同ドキュメント参照）：
// - パッチアプリの実装基盤・配布経路（→ この先の話。ここでは扱わない）
//
// このモジュールが担うのは「購入者チェック」の判定ロジックそのものだけ：
// - 案A：旧アプリが実機にインストールされているか
// - チェックサム比較：暗号化済み setting.sn が既知の値と一致するか（体験版誤認の回避、鍵不要）
//
// ⚠️ 実装基盤に Rust を採る場合、このロジック自体は移植先（パッチアプリ本体・Rust）で
// 再実装することになる。ここ（TypeScript／拡張機能側）が担うのは、パッチアプリに埋め込む
// チェックサムの計算（`encryptedChecksum()`）だけになる見込み


//MARK: チェックサム比較（体験版誤認の回避・鍵不要）

// AES-GCM は決定的（Encryptor.ts 参照：IV が pass.json に固定値で保存されているため、
// 同じプロジェクトの同じ平文は常に同じ暗号文になる）。よって暗号化済みデータの
// チェックサムだけで、鍵を一切持たずに「既知の内容と一致するか」を判定できる。
export function checksumHex(data: string | Uint8Array): string {
	return createHash('sha256').update(data).digest('hex');
}

export function matchesKnownChecksum(data: string | Uint8Array, expectedHex: string): boolean {
	return checksumHex(data) === expectedHex.toLowerCase();
}

// 過去に複数回リリースされた setting.sn のいずれかと一致するか（legacy-app-patch.md
// 「詰められていない仕様」#1：チェックサム1個の一致のみでは旧バージョン購入者を誤って
// 弾いてしまう問題への対応。既知チェックサムの配列のどれか1つと一致すればよい）
export function matchesAnyKnownChecksum(data: string | Uint8Array, expectedHexes: readonly string[]): boolean {
	return expectedHexes.some(hex=> matchesKnownChecksum(data, hex));
}

// ビルド時（sn_extension 側）に、製品版 setting.sn のチェックサムをパッチアプリへ
// 埋め込むために使う。encry は呼び出し側で init() 済みのものを渡す。
export async function encryptedChecksum(encry: Encryptor, plaintext: string): Promise<string> {
	return checksumHex(await encry.enc(plaintext));
}


//MARK: パッチ生成時のみの算出（settingSnFileName：asar 内で探す basename）

// asar 内での格納フォルダ位置は問わない（basename 探索方式。legacy-app-patch.md
// 2026-09-13 決定）。crypto:true の場合のみ HDiff.ts と同じ uuidv5(relPath) に置換され、
// 拡張子は変換対象外（`.sn` のまま維持）。relPath は doc/prj からの相対パス（例：
// "theme/setting.sn"）を渡す。isCryptoMode はプロジェクトの crypto:true/false 設定値
export function settingSnFileName(encry: Encryptor, relPath: string, isCryptoMode: boolean): string {
	return isCryptoMode
		? `${encry.uuidv5(relPath)}${extname(relPath)}`
		: basename(relPath);
}


//MARK: パッチ生成時のみのエラーチェック（const.体験版 の存在確認）

// チェックサム比較は「const.体験版 が setting.sn に書かれている」前提の上に成り立つ
// （体験版誤認の回避はこの変数の有無で判定するため）。プロジェクト側で変数名を
// 改名・削除していると、パッチ生成者が気づかないまま「常に一致しない」チェックサムを
// 埋め込んでしまう。パッチアプリ本体（実行時・利用者の手元）は平文を持たないので
// ここでは検出できず、平文にアクセスできる生成時（sn_extension 側）だけで確認できる。
const REG_EXPERIENCE_CONST = /&const\.体験版\s*=/;

export function hasExperienceConst(plaintext: string): boolean {
	return REG_EXPERIENCE_CONST.test(plaintext);
}

export class MissingExperienceConstError extends Error {
	constructor() {
		super('setting.sn に &const.体験版 が見つからない。テンプレ標準の変数名から改名・削除されていないか確認すること（LegacyAppCheck.ts 冒頭コメント参照）');
	}
}

// パッチ生成 CLI から呼ぶ想定のガード。平文に const.体験版 が無ければ例外を投げる
export function assertHasExperienceConst(plaintext: string): void {
	if (! hasExperienceConst(plaintext)) throw new MissingExperienceConstError();
}


//MARK: パッチ生成時のみのガード（appName のパス組み立て安全性）

// appName はパッチアプリ本体（Rust側 detect::candidate_install_paths）で
// インストール先パス組み立てにそのまま使われる（例：`/Applications/${appName}.app`）。
// `/`・`\`・`..` を許すと、`/Applications` 外の任意ディレクトリを指すパストラバーサルに
// なりうる（2026-09-14・セキュリティ確認で指摘）。パッチアプリ本体側には検証を持たせず、
// 平文にアクセスできる生成時（ここ）だけで弾く
const REG_UNSAFE_APP_NAME = /[/\\]|\.\./;

export class UnsafeAppNameError extends Error {
	constructor(appName: string) {
		super(`appName に "/"・"\\"・".." を含めることはできない（インストール先パスの組み立てにそのまま使われるため）: ${appName}`);
	}
}

export function assertSafeAppName(appName: string): void {
	if (REG_UNSAFE_APP_NAME.test(appName)) throw new UnsafeAppNameError(appName);
}


//MARK: 案A：インストール済みアプリの検出

export type T_APP_DETECT_ENV = {
	platform			: NodeJS.Platform;
	macApplicationsDir	: string;
	winInstallBaseDirs	: string[];	// Program Files 等。存在しない環境変数は呼び出し側で除いておく
}

function defaultDetectEnv(): T_APP_DETECT_ENV {
	// eslint-disable-next-line no-process-env
	const {ProgramFiles, 'ProgramFiles(x86)': progFilesX86, LOCALAPPDATA} = process.env;
	return {
		platform			: process.platform,
		macApplicationsDir	: '/Applications',
		winInstallBaseDirs	: [
			ProgramFiles,
			progFilesX86,
			LOCALAPPDATA && join(LOCALAPPDATA, 'Programs'),
		].filter((v): v is string=> !! v),
	};
}

// 実在確認だけを行う（レジストリは見ない）。候補パスは呼び出し側でも参照できるよう分離。
// パス結合は実行ホストの path モジュールに委ねる（本番では platform と実行ホストが一致するため。
// platform を差し替えるのはテスト用の分岐選択のみが目的で、セパレータ変換までは意図していない）
export function candidateInstallPaths(appName: string, env: Partial<T_APP_DETECT_ENV> = {}): string[] {
	const e = {...defaultDetectEnv(), ...env};

	if (e.platform === 'darwin') return [join(e.macApplicationsDir, `${appName}.app`)];
	if (e.platform === 'win32') return e.winInstallBaseDirs.map(base=> join(base, appName));

	return [];	// 対象外プラットフォーム（Linux 等は配布対象外）
}

export function detectInstalledApp(appName: string, env: Partial<T_APP_DETECT_ENV> = {}): boolean {
	return candidateInstallPaths(appName, env).some(existsSync);
}


//MARK: asar からの1ファイル抽出（生成時・TS側。詰められていない仕様#1）

// asar 内をbasenameで検索して1ファイル抽出する（フォルダ位置は問わない。
// patch_app/src/asar.rs と同じ探索方式のTS版）。
// ⚠️ Rust側（パッチアプリ本体・配布物）は配布サイズ・依存管理の制約から自前実装だが、
// ここ（生成時・開発者マシン上でのみ動く sn_extension 側）にその制約は無いため、
// 既存パッケージ @electron/asar をそのまま使う（車輪の再発明を避ける）。
// 2026-09-14: 実機の app.asar（127MB規模）で動作確認済み（listPackage 約10ms・
// extractFile 1ms未満。legacy-app-patch.md の Rust側実測と同水準）
export function extractByBasename(archivePath: string, target: string): Buffer {
	const list = listPackage(archivePath, {isPack: false});
	const found = list.find(p=> basename(p) === target);
	if (! found) throw new Error(`asar内に "${target}" が見つからない: ${archivePath}`);
	// @electron/asar の内部パスは "/" 始まりだが extractFile には先頭 "/" 無しで渡す
	return extractFile(archivePath, found.startsWith('/') ? found.slice(1) : found);
}

// インストール済みアプリのパスから app.asar のパスを推測する（electron-builder既定レイアウト。
// patch_app/src/detect.rs の asar_path_for_install() と同じ規約）。
// ⚠️ win側は electron-builder既定値からの推測のみで未検証（Windows実機が無い。詰められていない仕様#5）
export function asarPathForInstall(installPath: string, platform: NodeJS.Platform): string {
	if (platform === 'darwin') return join(installPath, 'Contents', 'Resources', 'app.asar');
	if (platform === 'win32') return join(installPath, 'resources', 'app.asar');
	throw new Error(`対象外プラットフォーム: ${platform}`);
}

// 実機にインストール済みの過去バージョンアプリから、暗号化済み setting.sn のチェックサムを
// 直接収集する（詰められていない仕様#1「収集方法の方針決定」の実装）。鍵は一切使わない
// （抽出した暗号文をそのまま checksumHex() に渡すだけ）。同一OSの実機にインストール済みの
// アプリしか見つけられない（candidateInstallPaths と同じ制約。OSをまたぐ場合は
// パッチ生成ツールの「インストーラー直接渡し」方式を使う。legacy-app-patch.md参照）
export function checksumFromInstalledApp(appName: string, settingSnFileName: string, env: Partial<T_APP_DETECT_ENV> = {}): string | undefined {
	const e = {...defaultDetectEnv(), ...env};
	for (const installPath of candidateInstallPaths(appName, env)) {
		if (! existsSync(installPath)) continue;
		const asarPath = asarPathForInstall(installPath, e.platform);
		if (! existsSync(asarPath)) continue;
		return checksumHex(extractByBasename(asarPath, settingSnFileName));
	}
	return undefined;
}


//MARK: 自己参照データの連結（footer）

// パッチアプリ本体（Rust・patch_app/src/footer.rs）の MAGIC・レイアウトと必ず一致させること：
// [汎用バイナリ本体(stub)][JSON][JSONバイト長(u32 LE)][8バイトのマジック文字列]
const FOOTER_MAGIC = 'SNLPATCH';

// 1アプリ分の設定。埋め込みJSONのトップレベルはこれの配列（T_LEGACY_PATCH_CONFIG）
// （2026-09-14: 複数ver・複数アプリを1本の実行ファイルで扱えるようにする対応。
// Rust側 footer::AppConfig / Config = Vec<AppConfig> と対応させること）
export type T_LEGACY_PATCH_APP_CONFIG = {
	appName				: string;
	checksumSetting		: string[];		// 複数の既知チェックサム（過去出荷ビルド分）
	settingSnFileName	: string;		// asar 内で探す basename（フォルダ位置は問わない）
	downloadUrl			: string;
}

// 埋め込みJSONのトップレベルはアプリごとの設定の配列（Rust側 Config = Vec<AppConfig> と対応）
export type T_LEGACY_PATCH_CONFIG = T_LEGACY_PATCH_APP_CONFIG[];

// stub（汎用バイナリ本体）の末尾に Config（アプリごとの設定の配列）の JSON を連結する。
// パッチアプリ本体の footer::extract_trailing_json() が読み取れる形式にする
// （順序：json ++ len(u32 LE) ++ magic）
export function appendPatchFooter(stub: Uint8Array, cfg: T_LEGACY_PATCH_CONFIG): Uint8Array {
	const jsonBytes = Buffer.from(JSON.stringify(cfg), 'utf8');
	const lenBuf = Buffer.alloc(4);
	lenBuf.writeUInt32LE(jsonBytes.length, 0);
	return Buffer.concat([Buffer.from(stub), jsonBytes, lenBuf, Buffer.from(FOOTER_MAGIC, 'ascii')]);
}
