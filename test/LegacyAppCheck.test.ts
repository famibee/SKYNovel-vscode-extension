/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {checksumHex, matchesKnownChecksum, matchesAnyKnownChecksum, encryptedChecksum, settingSnFileName, hasExperienceConst, assertHasExperienceConst, MissingExperienceConstError, assertSafeAppName, UnsafeAppNameError, appendPatchFooter, extractByBasename, sampledFileChecksum} from '../src/LegacyAppCheck';
import {Encryptor} from '../src/Encryptor';
import type {IDecryptInfo} from '../src/CmnLib';

import {createPackage} from '@electron/asar';
import {expect, beforeEach, it} from 'bun:test';
import {mkdtempSync, mkdirsSync, removeSync, writeFileSync} from 'fs-extra';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const {subtle} = (await import('crypto')).webcrypto;

let encry: Encryptor;
const infDecrypt: IDecryptInfo = {
	pass	: 'd0a3c6e5-ddc1-48ee-bf38-471e2e2e018a',
	salt	: '70a7c0b81cc31a8849cacdab8ed90163',
	iv		: '493f19a60e5f03f55576a98bfc892a13',
	keySize	: 16,
	ite		: 513,
	stk		: '3d01197ce022b188696791cf903cd197',
};

beforeEach(async ()=> {
	encry = new Encryptor(infDecrypt, subtle);
	await encry.init();
});


//MARK: チェックサム比較

it('checksumHex は決定的', ()=> {
	const a = checksumHex('hello');
	const b = checksumHex('hello');
	expect(a).toBe(b);
	expect(a).not.toBe(checksumHex('hello2'));
});


it('matchesKnownChecksum は大小文字を無視して一致判定', ()=> {
	const hex = checksumHex('体験版 = false');
	expect(matchesKnownChecksum('体験版 = false', hex)).toBe(true);
	expect(matchesKnownChecksum('体験版 = false', hex.toUpperCase())).toBe(true);
	expect(matchesKnownChecksum('体験版 = true', hex)).toBe(false);
});


it('matchesAnyKnownChecksum: 配列のどれか1つと一致すればtrue', ()=> {
	const hexV1 = checksumHex('v1-bytes');
	const hexV2 = checksumHex('v2-bytes');
	expect(matchesAnyKnownChecksum('v2-bytes', [hexV1, hexV2])).toBe(true);
	expect(matchesAnyKnownChecksum('v3-bytes', [hexV1, hexV2])).toBe(false);
	expect(matchesAnyKnownChecksum('anything', [])).toBe(false);
});


it('encryptedChecksum は同じ平文なら常に同じ値（AES-GCM の決定性を利用）', async ()=> {
	const plaintext = '&const.体験版 = false';
	const c1 = await encryptedChecksum(encry, plaintext);
	const c2 = await encryptedChecksum(encry, plaintext);
	expect(c1).toBe(c2);

	const cOther = await encryptedChecksum(encry, '&const.体験版 = true');
	expect(c1).not.toBe(cOther);

	// 事前計算した既知の値と一致すること（暗号化結果自体は Encryptor.test.ts と同じ鍵で決定的）
	const enc = await encry.enc(plaintext);
	expect(c1).toBe(checksumHex(enc));
});


//MARK: パッチ生成時のみのエラーチェック（const.体験版 の存在確認）

it('hasExperienceConst: &const.体験版 = … を含む平文は true', ()=> {
	expect(hasExperienceConst('&const.体験版 = false')).toBe(true);
	expect(hasExperienceConst('前置き\n&const.体験版 = true\n後続')).toBe(true);
	expect(hasExperienceConst('&const.体験版   =   false')).toBe(true);	// 空白の揺れ
});


it('hasExperienceConst: 変数名が無い・改名されている平文は false', ()=> {
	expect(hasExperienceConst('&const.taiken_ban = false')).toBe(false);
	expect(hasExperienceConst('体験版という語があるだけの地の文')).toBe(false);
	expect(hasExperienceConst('')).toBe(false);
});


it('assertHasExperienceConst: 存在すれば何もしない、無ければ MissingExperienceConstError', ()=> {
	expect(()=> assertHasExperienceConst('&const.体験版 = false')).not.toThrow();
	expect(()=> assertHasExperienceConst('&const.taiken_ban = false')).toThrow(MissingExperienceConstError);
});


//MARK: settingSnFileName（asar 内で探す basename の算出）

it('settingSnFileName: crypto:true なら uuidv5(relPath) ＋元の拡張子', ()=> {
	const fn = settingSnFileName(encry, 'theme/setting.sn', true);
	expect(fn).toBe(`${encry.uuidv5('theme/setting.sn')}.sn`);
	expect(fn.endsWith('.sn')).toBe(true);
	expect(fn).not.toContain('setting');	// 元の名前は残らない
});


it('settingSnFileName: crypto:false なら basename そのまま', ()=> {
	expect(settingSnFileName(encry, 'theme/setting.sn', false)).toBe('setting.sn');
});


it('settingSnFileName: crypto:true でも relPath が違えば別の名前になる（決定的だが一意）', ()=> {
	const a = settingSnFileName(encry, 'theme/setting.sn', true);
	const b = settingSnFileName(encry, 'other/setting.sn', true);
	expect(a).not.toBe(b);
});


//MARK: asar からの1ファイル抽出（生成時・TS側。詰められていない仕様#1）

it('extractByBasename: フォルダ位置に関わらずbasenameで見つけて抽出できる', async ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'legacy_app_chk_asar_'));
	try {
		const dSrc = join(dTmp, 'src');
		mkdirsSync(join(dSrc, 'out', 'renderer', 'prj', 'theme'));
		writeFileSync(join(dSrc, 'out', 'renderer', 'prj', 'theme', 'target.sn'), 'hello asar');
		writeFileSync(join(dSrc, 'other.txt'), 'dummy');

		const pathAsar = join(dTmp, 'app.asar');
		await createPackage(dSrc, pathAsar);

		const buf = extractByBasename(pathAsar, 'target.sn');
		expect(buf.toString('utf8')).toBe('hello asar');
	} finally {
		removeSync(dTmp);
	}
});


it('extractByBasename: 見つからなければ例外', async ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'legacy_app_chk_asar_'));
	try {
		const dSrc = join(dTmp, 'src');
		mkdirsSync(dSrc);
		writeFileSync(join(dSrc, 'a.txt'), 'a');

		const pathAsar = join(dTmp, 'app.asar');
		await createPackage(dSrc, pathAsar);

		expect(()=> extractByBasename(pathAsar, 'no-such-file.sn')).toThrow();
	} finally {
		removeSync(dTmp);
	}
});


//MARK: sampledFileChecksum（体験版チェック機構が無いビルド向けフォールバック。
// patch_app（Rust）の sampled_file_checksum() と寸分違わず一致する必要がある）

it('sampledFileChecksum: 同じファイルなら常に同じ値', ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'legacy_app_chk_sample_'));
	try {
		const p = join(dTmp, 'a.bin');
		writeFileSync(p, 'hello world');
		expect(sampledFileChecksum(p)).toBe(sampledFileChecksum(p));
	} finally {
		removeSync(dTmp);
	}
});


it('sampledFileChecksum: 小さいファイルは内容が変われば値も変わる', ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'legacy_app_chk_sample_'));
	try {
		const pA = join(dTmp, 'a.bin');
		const pB = join(dTmp, 'b.bin');
		writeFileSync(pA, 'hello world');
		writeFileSync(pB, 'hello WORLD');
		expect(sampledFileChecksum(pA)).not.toBe(sampledFileChecksum(pB));
	} finally {
		removeSync(dTmp);
	}
});


it('sampledFileChecksum: サイズが同じでも中間バイトが違えば検出できる（先頭・末尾だけのサンプリングではない）', ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'legacy_app_chk_sample_'));
	try {
		const size = 65536 * 16;	// SAMPLE_CHUNK_SIZE * SAMPLE_COUNT
		const bufA = Buffer.alloc(size, 0);
		const bufB = Buffer.from(bufA);
		bufB[Math.floor(size / 2)] = 0xff;

		const pA = join(dTmp, 'a.bin');
		const pB = join(dTmp, 'b.bin');
		writeFileSync(pA, bufA);
		writeFileSync(pB, bufB);
		expect(sampledFileChecksum(pA)).not.toBe(sampledFileChecksum(pB));
	} finally {
		removeSync(dTmp);
	}
});


it('sampledFileChecksum: サイズが違えば内容の先頭が同じでも値が変わる', ()=> {
	const dTmp = mkdtempSync(join(tmpdir(), 'legacy_app_chk_sample_'));
	try {
		const pA = join(dTmp, 'a.bin');
		const pB = join(dTmp, 'b.bin');
		writeFileSync(pA, 'same-prefix');
		writeFileSync(pB, 'same-prefix-but-longer');
		expect(sampledFileChecksum(pA)).not.toBe(sampledFileChecksum(pB));
	} finally {
		removeSync(dTmp);
	}
});


//MARK: appendPatchFooter（パッチアプリ本体・footer.rs との往復整合性）

it('appendPatchFooter: stub＋JSON(配列)＋長さ(u32 LE)＋マジックの順で連結される', ()=> {
	const stub = new Uint8Array([1, 2, 3]);
	const cfg = [{
		appName				: 'MyGame',
		checksumSetting		: ['abc123', 'def456'],
		checksumInstaller	: [],
		checksumLatest		: '',
		latestArch			: '',
		settingSnFileName	: '3b0bb3e8-deff-5722-94d5-885d9cb5fd0e.sn',
		downloadUrl			: 'https://example.com/patch',
	}];
	const out = appendPatchFooter(stub, cfg);

	const jsonBytes = Buffer.from(JSON.stringify(cfg), 'utf8');
	const magic = Buffer.from('SNLPATCH', 'ascii');

	expect(out.subarray(0, 3)).toEqual(stub);
	expect(out.subarray(3, 3 + jsonBytes.length)).toEqual(new Uint8Array(jsonBytes));
	expect(Buffer.from(out.subarray(out.length - 4 - magic.length, out.length - magic.length)).readUInt32LE(0))
		.toBe(jsonBytes.length);
	expect(out.subarray(out.length - magic.length)).toEqual(new Uint8Array(magic));
});


it('appendPatchFooter: 複数アプリ分を1つの配列として連結できる', ()=> {
	const stub = new Uint8Array([9, 9]);
	const cfg = [
		{appName: 'GameA', checksumSetting: ['a1'], checksumInstaller: [], checksumLatest: '', latestArch: '', settingSnFileName: 'a.sn', downloadUrl: 'https://example.com/a'},
		{appName: 'GameB', checksumSetting: ['b1'], checksumInstaller: [], checksumLatest: '', latestArch: '', settingSnFileName: 'b.sn', downloadUrl: 'https://example.com/b'},
	];
	const out = appendPatchFooter(stub, cfg);
	const jsonBytes = Buffer.from(JSON.stringify(cfg), 'utf8');

	expect(out.subarray(2, 2 + jsonBytes.length)).toEqual(new Uint8Array(jsonBytes));
});


//MARK: assertSafeAppName（appName のパス組み立て安全性）

it('assertSafeAppName: 通常の名前は通す', ()=> {
	expect(()=> assertSafeAppName('MyGame')).not.toThrow();
	expect(()=> assertSafeAppName('大阪九龍条')).not.toThrow();
});


it('assertSafeAppName: "/"・"\\"・".." を含む名前は UnsafeAppNameError', ()=> {
	expect(()=> assertSafeAppName('../etc')).toThrow(UnsafeAppNameError);
	expect(()=> assertSafeAppName('foo/bar')).toThrow(UnsafeAppNameError);
	expect(()=> assertSafeAppName('foo\\bar')).toThrow(UnsafeAppNameError);
});
