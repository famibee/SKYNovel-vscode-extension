/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {extractByBasename} from './LegacyAppCheck';

import {path7za} from '7zip-bin';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';


// パッチ生成ツール（試作単体アプリ）決定（2026-09-14）：win版インストーラをそのまま
// mac起動のツールに渡す運用のため、インストーラーファイル自体から app.asar 内の
// setting.sn を取り出す処理。src/docs/legacy-app-patch.md 詰められていない仕様#1 参照。
//
// ✅ mac の .dmg・win の .exe（NSIS）とも実機データで動作確認済み（2026-09-14。
// sn_osk_gitayu v1.1.0 の実配布物で検証。同一ビルドの win/mac 双方から同一
// チェックサムが得られることを確認済み。詳細はコミットログ・作業記録参照）。
//
// win の .exe は Windows 実機・電子的な展開ツールが要ると想定していたが、
// NSIS インストーラーは中身が 7z 形式のアーカイブになっており、`7zip-bin`
// （electron-builder が内部で使う7zバイナリを配布するパッケージ。mac上でも
// 動くWindows実行ファイル用の7zバイナリが含まれる）で直接ピンポイント抽出できる
// ことが分かった。Windows実機は不要（当初の想定より対応範囲が広い）。


export function extractSettingSnFromDmg(dmgPath: string, settingSnFileName: string): Buffer {
	const dMount = mkdtempSync(join(tmpdir(), 'snlegacy-dmg-'));
	try {
		execFileSync('/usr/bin/hdiutil', ['attach', dmgPath, '-mountpoint', dMount, '-nobrowse', '-quiet'], {stdio: 'pipe'});
		try {
			const appDir = readdirSync(dMount).find(f=> f.endsWith('.app'));
			if (! appDir) throw new Error(`マウントした dmg 内に .app が見つからない: ${dmgPath}`);
			const pathAsar = join(dMount, appDir, 'Contents', 'Resources', 'app.asar');
			return extractByBasename(pathAsar, settingSnFileName);
		}
		finally {
			execFileSync('/usr/bin/hdiutil', ['detach', dMount, '-quiet'], {stdio: 'pipe'});
		}
	}
	finally {
		rmSync(dMount, {recursive: true, force: true});
	}
}

// NSIS インストーラー(.exe)は中身が7z形式のアーカイブなので、7za でピンポイント抽出できる
// （electron-builder既定レイアウトの resources/app.asar のみを取り出す。展開先が
// Windowsの正式なインストール先パスと違っても中身の抽出自体には影響しない）
export function extractSettingSnFromExe(exePath: string, settingSnFileName: string): Buffer {
	const dOut = mkdtempSync(join(tmpdir(), 'snlegacy-exe-'));
	try {
		execFileSync(path7za, ['x', exePath, 'resources/app.asar', `-o${dOut}`, '-y'], {stdio: 'pipe'});
		const pathAsar = join(dOut, 'resources', 'app.asar');
		return extractByBasename(pathAsar, settingSnFileName);
	}
	finally {
		rmSync(dOut, {recursive: true, force: true});
	}
}

export function extractSettingSnFromInstaller(installerPath: string, settingSnFileName: string): Buffer {
	const lower = installerPath.toLowerCase();
	if (lower.endsWith('.dmg')) return extractSettingSnFromDmg(installerPath, settingSnFileName);
	if (lower.endsWith('.exe')) return extractSettingSnFromExe(installerPath, settingSnFileName);
	throw new Error(`未対応のインストーラー形式: ${installerPath}（.dmg または .exe のみ対応）`);
}
