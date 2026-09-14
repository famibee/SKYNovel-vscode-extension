/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {extractSettingSnFromDmg, extractSettingSnFromExe, extractSettingSnFromInstaller} from '../src/InstallerExtract';

import {createPackage} from '@electron/asar';
import {path7za} from '7zip-bin';
import {expect, it} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirsSync, removeSync, writeFileSync} from 'fs-extra';
import {tmpdir} from 'node:os';
import {join} from 'node:path';


// 2026-09-14: ここでの合成データによるテストとは別に、実際の配布物
// （sn_osk_gitayu v1.1.0 の win/mac 両方の実インストーラー）で動作検証済み
// （同一ビルドの win/mac から同一チェックサムが得られることを確認）。
// src/docs/legacy-app-patch.md 参照。


//MARK: mac .dmg からの抽出

it('extractSettingSnFromDmg: マウント・basename抽出・アンマウントまで一気通貫で動く', async ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'installer_ext_dmg_'));
	try {
		const dApp = join(dTmp, 'src', 'MyGame.app');
		const dAsarSrc = join(dTmp, 'asarsrc', 'theme');
		mkdirsSync(dAsarSrc);
		writeFileSync(join(dAsarSrc, 'target.sn'), 'hello dmg test');
		mkdirsSync(join(dApp, 'Contents', 'Resources'));
		await createPackage(join(dTmp, 'asarsrc'), join(dApp, 'Contents', 'Resources', 'app.asar'));

		const pathDmg = join(dTmp, 'test.dmg');
		execFileSync('/usr/bin/hdiutil', ['create', '-volname', 'MyGame', '-srcfolder', join(dTmp, 'src'), '-ov', '-format', 'UDZO', pathDmg], {stdio: 'pipe'});

		const buf = extractSettingSnFromDmg(pathDmg, 'target.sn');
		expect(buf.toString('utf8')).toBe('hello dmg test');
	} finally {
		removeSync(dTmp);
	}
}, 20000);


//MARK: win .exe（NSIS）からの抽出

it('extractSettingSnFromExe: 7zアーカイブから resources/app.asar 経由で抽出できる', async ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'installer_ext_exe_'));
	try {
		const dAsarSrc = join(dTmp, 'asarsrc', 'theme');
		mkdirsSync(dAsarSrc);
		writeFileSync(join(dAsarSrc, 'target.sn'), 'hello exe test');

		const dResources = join(dTmp, 'pack', 'resources');
		mkdirsSync(dResources);
		await createPackage(join(dTmp, 'asarsrc'), join(dResources, 'app.asar'));

		// NSISインストーラーは内部的に7z形式のアーカイブなので、実物同様に
		// 7zaでresourcesフォルダをアーカイブし .exe 拡張子で保存する
		const pathExe = join(dTmp, 'fake.exe');
		execFileSync(path7za, ['a', '-t7z', pathExe, join(dTmp, 'pack', 'resources')], {stdio: 'pipe'});

		const buf = extractSettingSnFromExe(pathExe, 'target.sn');
		expect(buf.toString('utf8')).toBe('hello exe test');
	} finally {
		removeSync(dTmp);
	}
}, 20000);


//MARK: 拡張子による振り分け

it('extractSettingSnFromInstaller: 拡張子で.dmg/.exeを振り分ける', async ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'installer_ext_dispatch_'));
	try {
		const dAsarSrc = join(dTmp, 'asarsrc');
		mkdirsSync(dAsarSrc);
		writeFileSync(join(dAsarSrc, 'target.sn'), 'dispatch test');

		const dResources = join(dTmp, 'pack', 'resources');
		mkdirsSync(dResources);
		await createPackage(dAsarSrc, join(dResources, 'app.asar'));
		const pathExe = join(dTmp, 'MyGame.EXE');	// 大文字拡張子でも判定できること
		execFileSync(path7za, ['a', '-t7z', pathExe, join(dTmp, 'pack', 'resources')], {stdio: 'pipe'});

		const buf = extractSettingSnFromInstaller(pathExe, 'target.sn');
		expect(buf.toString('utf8')).toBe('dispatch test');
	} finally {
		removeSync(dTmp);
	}
}, 20000);


it('extractSettingSnFromInstaller: 未対応の拡張子は例外', ()=> {
	expect(()=> extractSettingSnFromInstaller('/tmp/foo.zip', 'target.sn')).toThrow();
});
