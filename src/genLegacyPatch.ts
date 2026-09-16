/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import type {IDecryptInfo} from './CmnLib';
import {checkDownloadUrl} from './DownloadUrlCheck';
import {Encryptor} from './Encryptor';
import {extractSettingSnFromInstaller} from './InstallerExtract';
import {assertHasExperienceConst, assertSafeAppName, checksumHex, sampledFileChecksum, settingSnFileName, appendPatchFooter, type T_LEGACY_PATCH_APP_CONFIG} from './LegacyAppCheck';

import {execFileSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';


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
// 2026-09-14: downloadUrl の直リンク検証（checkDownloadUrl()）を結線。失敗時は
// 警告を出すのみで生成は止めない（一時的なネットワーク障害の可能性があるため）。
//
// 2026-09-17: 実機スキャン（scanInstalled。生成ツールを実行しているマシンに
// インストール済みの旧バージョンを自動検出する機能）を廃止した。GUIの画面上に
// 何も表れない「その場の開発者PCの状態」に生成結果が左右され、再現性が無く
// 分かりにくいため（ユーザー指摘）。legacyInstallers（開発者が明示的に指定する
// インストーラーファイル）に一本化する
//
// 2026-09-17: 体験版チェック機構（setting.sn）自体が無い古いビルド向けの
// フォールバックを追加（legacy-app-patch.md 詰められていない仕様#8）。開発者に
// 「setting.snがあるか」を事前に聞いて切り替えさせるのではなく、①setting.sn抽出を
// 常に試み、②legacyInstaller全件について常にインストーラー本体（.exe/.dmg）
// そのもののチェックサム（sampledFileChecksum()）も無条件に計算しておく
// （常時ON。ユーザー指摘：「聞かなくていい、常にON」）。パッチアプリ本体
// （patch_app）側は実行時、まず①旧アプリの自動検出＋setting.sn抽出を試み、
// それが失敗した場合にだけ②購入者に当時のインストーラー本体を選ばせて
// チェックサム比較する（Windows実機やアプリのインストール状態に依存しない
// フォールバックとして常時利用可能。ただし体験版誤混入の自動検証は一切できない・
// 購入者に一手間かかる、というトレードオフがある）
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
//       "legacyInstallers": ["旧v1.0のインストーラーパス(.dmg/.exe)", ...]  ※最低1つ
//     },
//     ...   ← 複数アプリをまとめる場合はここに並べるだけ
//   ]
// }
//
// 使い方：
//   bun src/genLegacyPatch.ts --config <設定JSONのパス> --stub <汎用バイナリ(stub)のパス> --out <出力先パス>


// GUIの既定値・②代替ファイル未使用の判定基準（settingSnFileName算出時の relPath 既定値）
const DEFAULT_REL_PATH = 'theme/setting.sn';

type T_APP_ENTRY = {
	appName				: string;
	pass				: string;
	relPath				: string;
	crypto				: boolean;
	downloadUrl			: string;
	legacyInstallers	: string[];
	// 配布予定の最新版インストーラー（GUIの「最新版インストーラー」欄で選んだファイル。
	// downloadUrlの元になったのと同じファイル）。省略可（既定は空文字列＝チェックしない）。
	// 指定すると、そのチェックサムをchecksumLatestとして埋め込み、patch_app側が
	// 「インストール済みが既に最新版ならダウンロードをスキップする」判定に使う
	// （2026-09-17・ユーザー指摘）
	latestInstaller?	: string;
}

// mac向け.appバンドルの最小限のInfo.plist。CFBundleExecutableのみが実質必須
// （Finderが Contents/MacOS/<execName> を実行ファイルとして認識するために使う）
function macInfoPlist(execName: string): string {
	const escaped = execName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleExecutable</key>
	<string>${escaped}</string>
	<key>CFBundleIdentifier</key>
	<string>com.famibee.snlegacypatch.${escaped}</string>
	<key>CFBundleName</key>
	<string>${escaped}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>LSMinimumSystemVersion</key>
	<string>10.13</string>
	<key>NSHighResolutionCapable</key>
	<true/>
</dict>
</plist>
`;
}

// mac向け.appバンドルを bundlePath（"<名前>.app"）に書き出す。
// Contents/MacOS/<名前> に実行ファイル本体、Contents/Info.plist・PkgInfoを添える
function buildMacAppBundle(bundlePath: string, patched: Uint8Array): void {
	const execName = basename(bundlePath, '.app');
	if (! execName) usageAndExit(`.app 名が不正: ${bundlePath}`);

	const contentsDir = join(bundlePath, 'Contents');
	mkdirSync(join(contentsDir, 'MacOS'), {recursive: true});
	const execPath = join(contentsDir, 'MacOS', execName);
	writeFileSync(execPath, patched);
	chmodSync(execPath, 0o755);
	writeFileSync(join(contentsDir, 'Info.plist'), macInfoPlist(execName));
	writeFileSync(join(contentsDir, 'PkgInfo'), 'APPL????');
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
	const {appName, pass: pathPass, relPath, crypto: isCryptoMode, downloadUrl, legacyInstallers, latestInstaller} = entry;

	if (! appName || ! pathPass || ! relPath || typeof isCryptoMode !== 'boolean' || ! downloadUrl) {
		usageAndExit(`設定エントリの必須項目が不足している: ${JSON.stringify(entry)}`);
	}
	try {
		assertSafeAppName(appName);
	}
	catch (e) {
		usageAndExit((<Error>e).message);
	}
	if (! Array.isArray(legacyInstallers) || legacyInstallers.length === 0) usageAndExit(`legacyInstallers を最低1つ指定すること（${appName}）`);
	for (const p of [pathPass, ...legacyInstallers, ...(latestInstaller ? [latestInstaller] : [])]) {
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

	// ①setting.sn抽出を常に試み、②抽出できてもできなくても、インストーラー本体
	// そのもののチェックサムを無条件に計算しておく（常時ONのフォールバック用。
	// 詰められていない仕様#8。ユーザー指摘：発生確率を事前に聞いて切り替えさせるのではなく
	// 常に両方用意し、実行時（patch_app側）に①が失敗したら②へ自動フォールバックする）
	const checksumSetting: string[] = [];
	const checksumInstaller: string[] = [];
	const fallenBackFor: string[] = [];
	for (const pathInstaller of legacyInstallers) {
		let buf: Buffer | undefined;
		try {
			buf = extractSettingSnFromInstaller(pathInstaller, fnSettingSn);
		}
		catch {
			// setting.sn自体が無い＝体験版チェック機構が実装される前の古いビルドの
			// 可能性がある（詰められていない仕様#8）。これはハードエラーにはせず、
			// インストーラー本体チェックへのフォールバックに任せる
			fallenBackFor.push(pathInstaller);
		}

		if (buf) {
			// assertHasExperienceConst はテンプレ標準の setting.sn（&const.体験版）専用の
			// チェックであり、relPath が既定値（②代替ファイル未使用）のときにしか意味を
			// 持たない。②で選んだ代替ファイルは体験版/製品版で内容が異なる保証が無い
			// 一般のファイルなので、ここで強制すると「代替ファイルを使っている限り
			// 必ず失敗する」バグになる（2026-09-17・ユーザー指摘で発覚）
			if (! isCryptoMode && relPath === DEFAULT_REL_PATH) {
				// crypto:false のみ、抽出した中身が平文のまま残っているので自動チェックできる。
				// こちらは「ファイルはあるが想定と違う中身」＝設定ミスの可能性が高いので、
				// setting.sn自体が無い場合とは区別してハードエラーのままにする
				try {
					assertHasExperienceConst(buf.toString('utf8'));
				}
				catch (e) {
					usageAndExit(`${appName} / ${pathInstaller}: ${(<Error>e).message}`);
				}
			}
			checksumSetting.push(checksumHex(buf));
		}
		checksumInstaller.push(sampledFileChecksum(pathInstaller));
	}

	// 最新版インストーラーが渡されていれば、そのチェックサムも同じ方法で計算し
	// checksumLatest として埋め込む（既知チェックサム集合にも加える。①setting.snで
	// 抽出できればそちらへ、できなければ②インストーラー本体側へ。実行時に「インストール
	// 済みが既に最新版か」の判定に使う。2026-09-17・ユーザー指摘）
	let checksumLatest = '';
	if (latestInstaller) {
		try {
			const buf = extractSettingSnFromInstaller(latestInstaller, fnSettingSn);
			checksumLatest = checksumHex(buf);
			if (! checksumSetting.includes(checksumLatest)) checksumSetting.push(checksumLatest);
		}
		catch {
			checksumLatest = sampledFileChecksum(latestInstaller);
			if (! checksumInstaller.includes(checksumLatest)) checksumInstaller.push(checksumLatest);
		}
	}

	if (fallenBackFor.length > 0) {
		console.warn(`ℹ️  ${appName}: ${String(fallenBackFor.length)}件でsetting.snが見つからなかったため、`
			+'インストーラー本体チェックへの自動フォールバックを埋め込みます（購入者に当時のインストーラー本体を'
			+'選んでもらう一手間がかかります。体験版誤混入も自動検証できません。全て製品版であることを確認してください）：');
		for (const p of fallenBackFor) console.warn(`  - ${p}`);
	}
	// crypto:true、または②代替ファイル使用時は、抽出できた分についても体験版混入の
	// 自動検証ができない（代替ファイルは体験版/製品版で内容が異なる保証が無い。
	// ユーザー指摘：代替ファイルに求められるのは「過去版では体験版かどうかでこの
	// ファイルの中身が違う」という性質だが、それを機械的に検証する手段は無い）
	if ((isCryptoMode || relPath !== DEFAULT_REL_PATH) && legacyInstallers.length > fallenBackFor.length) {
		const reason = relPath !== DEFAULT_REL_PATH
			? '代替ファイル（②）を使っているため'
			: 'crypto:true のため';
		console.warn(`⚠️  ${appName}: ${reason}、legacyInstallers に体験版のインストーラーが`
			+' 混ざっていないか自動検証できません（詰められていない仕様#1参照）。'
			+`指定した ${String(legacyInstallers.length)} 件が全て製品版であることを確認してください`
			+(relPath !== DEFAULT_REL_PATH ? '（代替ファイルは体験版と製品版で中身が異なるものを選ぶこと）：' : '：'));
		for (const p of legacyInstallers) console.warn(`  - ${p}`);
	}

	cfgs.push({
		appName,
		checksumSetting,
		checksumInstaller,
		checksumLatest,
		settingSnFileName	: fnSettingSn,
		downloadUrl,
	});
}

const stub = readFileSync(pathStub);
const patched = appendPatchFooter(stub, cfgs);

// --out の拡張子でmac向け出力形式を切り替える。Finderでダブルクリック起動できる
// ようにするため（2026-09-17・ユーザー指摘：「配布パッチアプリを生成」でexe/dmg(app)を
// 作れるようにしたい）。それ以外（winの.exe等）は従来通り単一ファイルとして書き出す
if (pathOut.toLowerCase().endsWith('.dmg')) {
	// .appバンドルを一時フォルダに作ってから hdiutil create で.dmgに包む
	// （2026-09-17・ユーザー指摘：「dmg生成を」。開発者自身のゲーム配布物と同じ
	// 見慣れた形式で購入者に渡せるようにする）
	const dmgName = basename(pathOut, '.dmg');
	if (! dmgName) usageAndExit(`--out の .dmg 名が不正: ${pathOut}`);
	const tmpDir = mkdtempSync(join(tmpdir(), 'snlegacy-dmgbuild-'));
	try {
		const appBundlePath = join(tmpDir, `${dmgName}.app`);
		buildMacAppBundle(appBundlePath, patched);
		try {
			execFileSync('/usr/bin/hdiutil', ['create', '-volname', dmgName, '-srcfolder', appBundlePath, '-ov', '-format', 'UDZO', pathOut], {stdio: 'pipe'});
		}
		catch (e) {
			usageAndExit(`.dmg の作成に失敗（hdiutil）: ${(<Error>e).message}`);
		}
	}
	finally {
		rmSync(tmpDir, {recursive: true, force: true});
	}
}
else if (pathOut.toLowerCase().endsWith('.app')) {
	buildMacAppBundle(pathOut, patched);
}
else {
	writeFileSync(pathOut, patched);
	// writeFileSyncは実行権限を引き継がない（新規ファイルは既定モード）ため、mac/linux配布物
	// はこのままではダブルクリックで実行できない。winのexeには影響しない（chmodはwindowsでは
	// 読み取り専用フラグしか扱わないため無害）ので、OS判定せず常に付与する
	chmodSync(pathOut, 0o755);
}

console.log(`✓ 生成完了: ${pathOut}（${String(cfgs.length)}アプリ分）`);
for (const cfg of cfgs) {
	console.log(`  - ${cfg.appName}: checksumSetting ${String(cfg.checksumSetting.length)}件（過去出荷ビルド分）, settingSnFileName=${cfg.settingSnFileName}`
		+(cfg.checksumLatest ? '、最新版判定あり（既に最新ならDLをスキップ）' : ''));
}
