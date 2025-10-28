/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {Encryptor, encAbBase64, decBase64Ab, encStrBase64, decBase64Str, ab2hexStr, hexStr2ab} from '../src/Encryptor';
import {EncryptorTransform} from '../src/EncryptorTransform';
import type {IPluginInitArg, PLUGIN_DECAB_RET} from '../src/CmnLib';

import {readFile, createReadStream, ensureFileSync, createWriteStream, statSync} from 'fs-extra';
const {subtle} = (await import('crypto')).webcrypto;	// https://github.com/nodejs/node/blob/dae283d96fd31ad0f30840a7e55ac97294f505ac/doc/api/webcrypto.md

let	encry: Encryptor;
const infDecrypt = {
	pass	: 'd0a3c6e5-ddc1-48ee-bf38-471e2e2e018a',
	salt	: '70a7c0b81cc31a8849cacdab8ed90163',
	iv		: '493f19a60e5f03f55576a98bfc892a13',
	keySize	: 16,	// 未使用
	ite		: 513,
	stk		: '3d01197ce022b188696791cf903cd197',	// SysApp.#setStore() で使用
};

let fncDec: (ext: string, tx: string)=> Promise<string> = ()=> Promise.resolve('');
let fncDecAB: (ab: ArrayBuffer)=> Promise<PLUGIN_DECAB_RET>;
let hSN: IPluginInitArg;

beforeEach(async ()=> {
	encry = new Encryptor(infDecrypt, subtle);
	await encry.init();

	fncDec = ()=> Promise.resolve('');
	fncDecAB = ()=> Promise.resolve({ext_num: 0, ab: new ArrayBuffer(0)});
	hSN = {
		setDec	: fnc=> {fncDec = fnc},
		setDecAB: fnc=> {fncDecAB = fnc},
		setEnc	: ()=> { /* empty */ },
		getStK	: ()=> { /* empty */ },
		getHash	: ()=> { /* empty */ },	// infDecrypt.stk,
		tstDecryptInfo	: ()=> infDecrypt,
	};
});


it('hexStr', ()=> {
	const a = '68657820737472696e6720e382a8e383b3e382b3e383bce38389e383bbe38387e382b3e383bce38389';
	const b = 'hex string エンコード・デコード';
		// 16進数バイナリ文字列変換 日本語変換 Online - DenCode https://dencode.com/ja/string/hex

	const ab = hexStr2ab(a);
	expect(Buffer.from(ab).toString('hex')).toBe(a);

	const c = Buffer.from([0x68, 0x65, 0x78, 0x20, 0x73, 0x74, 0x72, 0x69, 0x6e, 0x67, 0x20, 0xe3, 0x82, 0xa8, 0xe3, 0x83, 0xb3, 0xe3, 0x82, 0xb3, 0xe3, 0x83, 0xbc, 0xe3, 0x83, 0x89, 0xe3, 0x83, 0xbb, 0xe3, 0x83, 0x87, 0xe3, 0x82, 0xb3, 0xe3, 0x83, 0xbc, 0xe3, 0x83, 0x89]);
	expect(c.compare(new Uint8Array(ab))).toBe(0);	// 0 if they are equal

	expect(ab2hexStr(ab)).toBe(a);

	expect(Buffer.from(ab).toString()).toBe(b);
});


it('enc dec AbBase64', ()=> {
	const a = 'Base64 エンコード・デコード';
	const b = 'QmFzZTY0IOOCqOODs+OCs+ODvOODieODu+ODh+OCs+ODvOODiQ==';
	expect(encStrBase64(a)).toBe(b);
	expect(decBase64Str(b)).toBe(a);
		// Base64 エンコード・デコード：画像などのデータをBase64文字列に変換、逆変換 | ラッコツールズ🔧 https://rakko.tools/tools/24/

	const b2 = 'n++gHsN5YofNGF5t02lkUw==';
	expect(encAbBase64(decBase64Ab(b2).buffer)).toBe(b2);
});


it('main_sn_full', async ()=> {
	const path_src = 'test/mat/main.sn';
	const stt = statSync(path_src);	// ファイルサイズ
	expect(stt.size).toBe(3031);

	const src = await readFile(path_src, {encoding: 'utf8'});
	const srcH = Buffer.from(src.slice(0, 16)).toString('hex');
	const chk_hex = '095b6164645f6c6179206c617965723d';
	expect(srcH).toBe(chk_hex);

	const enc = await encry.encAb(new TextEncoder().encode(src).buffer);	// 暗号化
	expect(enc.byteLength).toBe(3047);	// ファイルサイズ

	expect(Buffer.from(enc.slice(0, 16)).toString('hex')).toBe('9fc4783607f28259dbb25787738e9881');
	const bb = encAbBase64(enc.slice(0, 16));
	expect(bb).toBe('n8R4NgfyglnbsleHc46YgQ==');

	const dec = await encry.decAb(enc);	// 復号化
	const decH = Buffer.from(dec.slice(0, 16)).toString('hex');
	expect(decH).toBe(chk_hex);
	expect(src).toBe(Buffer.from(dec).toString('utf8'));
});


it('main_sn_full2', async ()=> {
	const src = await readFile('test/mat/main.sn', {encoding: 'utf8'});

	const enc = await encry.enc(src);	// 暗号化
	expect(enc.slice(0, 32)).toBe('n8R4NgfyglnbsleHc46YgW6TiKpMNHzd');

	const dec = await encry.dec(enc);	// 復号化
	expect(dec).toBe(src);
});


it('wood04_mp3_full_simple', async ()=> {
	const path_src = 'test/mat/wood04.mp3';
	const stt = statSync(path_src);	// ファイルサイズ
	expect(stt.size).toBe(3995);

	const src0 = await readFile(path_src, {encoding: 'hex'});
	const src0H = src0.slice(0, 32);
	expect(src0H).toBe('49443303000000000061434f4d4d0000');

	const src = await readFile(path_src, {encoding: 'utf8'});
	const srcH = Buffer.from(src.slice(0, 16)).toString('hex');
	expect(srcH).toBe('49443303000000000061434f4d4d0000');

	const enc = await encry.enc(src);	// 暗号化
	const encH = enc.slice(0, 32);
	expect(encH).toBe('39sqUWOt7jii83ipR6bqvAy2+89tMn7b');

	const dec = await encry.dec(enc);	// 復号化
	const decH = Buffer.from(dec.slice(0, 16)).toString('hex');
	expect(decH).toBe('49443303000000000061434f4d4d0000');
	expect(src).toBe(dec);
});


it('prj_json_simple', async ()=> {
	const path_src = 'test/mat/prj.json';
	const stt = statSync(path_src);	// ファイルサイズ
	expect(stt.size).toBe(650);

	// 暗号化
	const src = await readFile(path_src, {encoding: 'utf8'});
	const enc = await encry.enc(src);
	expect(enc).toBe('7b17PQzGzALZsE+PfoePnjbQHW7wtJES6j5KZBPPxL+RqPcKMKrU/kmSjHQ0zBKg2tH6iNM9gbJEW7ZolMlIpfPW/+jEaNM9NrwQYpHrAtSQPh7NJDrsvvtAaIHIlZE2JcQ8xm7jNJbmz46vOceiASzB/2KqIAdNJ32gNUA8v8cMzVT1l5dIBTxVHmdKnPh/hVe9dfaE9shM/SXeMraocfciCpFYYs5o6VeANlITz5U0IGLKFFLFTe/qz/enbvoLUIVFKYXqBxfkcrcZ+ezEt8c+PKT9ZyzSslXHs7wdRp9gC6MUu3DZbkla2qnvVCKARwZK8vK7zuFiawuxGudShOyya/i40kueD+mTOqq0BJ6gOgVg34gswIfDHG1Kl1ic0dnYa7t8ukJPuVp/c9sX/6pSZBhTZ8nybNZjyk7pmGOxZ5c51dZR1OPXY0ZV9Od1VOpSqE+vWsJ4dAbjwMGydvPVxVCAnhk82daemZB3fK2Bsp4DWuAduGDVB73K2XAgtF7Cbz7xLIRGJo4rs93UDQ22ksUP9uJKw2YbURTV70bOzqRCBBf8ISTGrjXz48m5TkOvrLZ28PFvFNKdVoEDpLxSVhwflBIkqi7Ik8Kf7fmXQPsY/P89A8XglOiR43ABT685kpoiUxnf5Sjpjo8jMudQ0tKsdLJcjhLYKgbBkDfd1yvNgF7f3c6oMaJTlbFx8yHGe1alCwBj0TGpxE0WnO1QOh39AVp5zRvHfxrAfzzucwlua3ltG5IZHoXqPliG8Rf4ewhic2bZjIk40uiM0DDTpn2RhcRBUR+y3npCLyLZh2qicldG2SYRkTKRHvsT8UcA8hja4qk/yAbsHF2E0h1m/iI9gRTA4avDij0Gr90BzuD9mLIRahTv');
	expect(enc.length).toBe(888);	// ファイルサイズ

	// 復号化
	const dec = await encry.dec(enc);
	expect(dec).toBe(src);
	expect(dec).toBe(`{"book":{"title":"桜の樹の下には1","creator":"ふぁみべぇ","cre_url":"https://twitter.com/ugainovel","publisher":"電子演劇部","pub_url":"https://ugainovel.blog.fc2.com/","detail":"梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。","version":"1.0.0"},"save_ns":"uc1","window":{"width":1024,"height":768},"log":{"max_len":1024},"init":{"bg_color":"#000000","tagch_msecwait":10,"auto_msecpagewait":3500},"debug":{"devtool":true,"token":false,"tag":false,"putCh":false,"baseTx":false,"masume":false,"variable":false,"debugLog":false},"code":{},"debuger_token":"10a95e72-c862-4faa-bfec-26cf28f03ecc"}
`);
});


it('prj_json_simple by Plugin', async ()=> {
	// 暗号化
	const path_src = 'test/mat/prj.json';
	const src = await readFile(path_src, {encoding: 'utf8'});
	const enc = await encry.enc(src);

	// 復号化（本番方式）
	const {init} = await import('../src/snsys_pre');
		// jestがESM対応できてないので
	await init(hSN);

	const ret = await fncDec('json', enc);
	const preUtf8 = Buffer.from(ret).toString('utf8');

	expect(src.length).toBe(preUtf8.length);
	expect(src).toBe(preUtf8);
	expect(preUtf8).toBe(`{"book":{"title":"桜の樹の下には1","creator":"ふぁみべぇ","cre_url":"https://twitter.com/ugainovel","publisher":"電子演劇部","pub_url":"https://ugainovel.blog.fc2.com/","detail":"梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。","version":"1.0.0"},"save_ns":"uc1","window":{"width":1024,"height":768},"log":{"max_len":1024},"init":{"bg_color":"#000000","tagch_msecwait":10,"auto_msecpagewait":3500},"debug":{"devtool":true,"token":false,"tag":false,"putCh":false,"baseTx":false,"masume":false,"variable":false,"debugLog":false},"code":{},"debuger_token":"10a95e72-c862-4faa-bfec-26cf28f03ecc"}
`);

});


it('prj_json_simple by Plugin unknown ext', async ()=> {
	// 暗号化
	const path_src = 'test/mat/prj.json';
	const src = await readFile(path_src, {encoding: 'utf8'});

	// 復号化（本番方式）
	const {init} = await import('../src/snsys_pre');
		// jestがESM対応できてないので
	await init(hSN);

	const ret = await fncDec('知らない拡張子', src);
	expect(ret).toBe(src);		// そのまま返す
});


// B,C
it('wood04_mp3_stream_transform', async ()=> {return new Promise<void>(done=> {
		// この形式でないと jest拡張機能が成功扱いしてくれない
		// ('wood04_mp3_stream_transform', done=> {
	// 暗号化
	const path_src = 'test/mat/wood04.mp3';
	/*	cfg.cnv_path = (path: string): string => {
			return path.replace(
				/^app-storage:/
			,	'app-storage')
		};*/
		/*	保留
		expect(cfg.searchPath('app-storage:/aaa.jpg')).toBe('app-storage:/aaa.jpg');
		expect(cfg.searchPath('app-storage:/aaa.sn')).toBe('app-storage:/aaa.sn');
		expect(cfg.searchPath('app-storage:/update0.png')).toBe('app-storage:/update0%40%40ex.png');*/
			// /Users/[user]/Library/Application Support/com.fc2.blog38.famibee.ANTest/に本当にファイルを置くこと
	const stt = statSync(path_src);
	expect(stt.size).toBe(3995);	// ファイルサイズ

	const rs = createReadStream(path_src)
	.on('error', e=> console.error('encrypter rs=%o', e));

	const path_enc = 'test/mat/wood04.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', ()=> {(async ()=> {
		expect((await readFile(path_enc, { encoding: 'hex' })).slice(0, 32)).toBe('ad0f00009695501650aeee38a2923b87');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(4017);	// ファイルサイズ

		// 復号化
		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = new Uint8Array(await readFile(path_enc)).buffer;
		//const encAB = await readFile(path_enc).buffer;	// NG、多分この不具合になる
			// fs.await readFile returns corrupt ArrayBuffer (fs.readFile works as expected) · Issue #11132 · nodejs/node https://github.com/nodejs/node/issues/11132
		expect(encAB.byteLength).toBe(stt_bin.size);	// ファイルサイズ

		const {ext_num, ab} = await fncDecAB(encAB);
		expect(ext_num).toBe(10);	// mp3
		expect(ab.byteLength).toBe(stt.size);	// ファイルサイズ

		const srcH = await readFile(path_src, {encoding: 'hex'});
		const decH = ab2hexStr(ab);
		expect(srcH.length).toBe(decH.length);
		expect(srcH).toBe(decH);
		expect(decH.slice(0, 32)).toBe('49443303000000000061434f4d4d0000');
		expect(decH.slice(-32)).toBe('62697320492032303034303632000094');

		done();
	})()})
	.on('error', e=> {console.error('encrypter ws=%o', e); done()});

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
});}, 1_000);


// B,a,A*n
it('free0509_mp3_stream_transform', ()=> new Promise<void>(done=> {
	// 暗号化
	const path_src = 'test/mat/free0509.mp3';
	const stt = statSync(path_src);
	expect(stt.size).toBe(1796953);	// ファイルサイズ

	const rs = createReadStream(path_src)
	.on('error', e=> console.error('encrypter rs=%o', e));

	const path_enc = 'test/mat/free0509.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', ()=> {(async ()=> {
		expect((await readFile(path_enc, { encoding: 'hex' })).slice(0, 32)).toBe('122800009695501650aeee38a2922be6');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(1796975);	// ファイルサイズ

		// 復号化
		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = new Uint8Array(await readFile(path_enc)).buffer;
		expect(encAB.byteLength).toBe(stt_bin.size);	// ファイルサイズ

		const {ext_num, ab} = await fncDecAB(encAB);
		expect(ext_num).toBe(10);	// mp3
		expect(ab.byteLength).toBe(stt.size);	// ファイルサイズ

		const srcH = await readFile(path_src, {encoding: 'hex'});
		const decH = ab2hexStr(ab);
		expect(srcH.length).toBe(decH.length);
		expect(srcH).toBe(decH);
		expect(decH.slice(0, 32)).toBe('49443303000000001000544954320000');
		expect(decH.slice(-32)).toBe('766581408179687474703a2f2f777700');

		done();
	})()})
	.on('error', e=> {console.error('encrypter ws=%o', e); done()});

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
}));


// B,a
it('_yesno_png_stream_transform', ()=> new Promise<void>(done=> {
	// 暗号化
	const path_src = 'test/mat/_yesno.png';
	const stt = statSync(path_src);
	expect(stt.size).toBe(18722);	// ファイルサイズ

	const rs = createReadStream(path_src)
	.on('error', e=> console.error('encrypter rs=%o', e));

	const path_enc = 'test/mat/_yesno.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', ()=> {(async ()=> {
		expect((await readFile(path_enc, { encoding: 'hex' })).slice(0, 32)).toBe('12280000969d90022deae332b8983be6');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(18744);	// ファイルサイズ

		// 復号化
		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = new Uint8Array(await readFile(path_enc)).buffer;
		expect(encAB.byteLength).toBe(stt_bin.size);	// ファイルサイズ

		const {ext_num, ab} = await fncDecAB(encAB);
		expect(ext_num).toBe(2);	// png
		expect(ab.byteLength).toBe(stt.size);	// ファイルサイズ

		const srcH = await readFile(path_src, {encoding: 'hex'});
		const decH = ab2hexStr(ab);
		expect(srcH.length).toBe(decH.length);
		expect(srcH).toBe(decH);
		expect(decH.slice(0, 32)).toBe('89504e470d0a1a0a0000000d49484452');
		expect(decH.slice(-32)).toBe('53f9df960000000049454e44ae426082');

		done();
	})()})
	.on('error', e=> {console.error('encrypter ws=%o', e); done()});

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
}));


// B,a,A*n
it('title_jpg_stream_transform', ()=> new Promise<void>(done=> {
	// 暗号化
	const path_src = 'test/mat/title.jpg';
	const stt = statSync(path_src);
	expect(stt.size).toBe(406121);	// ファイルサイズ

	const rs = createReadStream(path_src)
	.on('error', e=> console.error('encrypter rs=%o', e));

	const path_enc = 'test/mat/title.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', ()=> {(async ()=> {
		expect((await readFile(path_enc, { encoding: 'hex' })).slice(0, 32)).toBe('12280000969ee68a9c4dee28e8d472a0');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(406143);	// ファイルサイズ

		// 復号化
		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = new Uint8Array(await readFile(path_enc)).buffer;
		expect(encAB.byteLength).toBe(stt_bin.size);	// ファイルサイズ

		const {ext_num, ab} = await fncDecAB(encAB);
		expect(ext_num).toBe(1);	// jpeg
		expect(ab.byteLength).toBe(stt.size);	// ファイルサイズ

		const srcH = await readFile(path_src, {encoding: 'hex'});
		const decH = ab2hexStr(ab);
		expect(srcH.length).toBe(decH.length);
		expect(srcH).toBe(decH);
		expect(decH.slice(0, 32)).toBe('ffd8ffe000104a464946000102010048');
		expect(decH.slice(-32)).toBe('211a108d084684234211a108d085ffd9');

		done();
	})()})
	.on('error', e=> {console.error('encrypter ws=%o', e); done()});

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
}));


// B,a,A*n
it('nc10889_mp4_stream_transform', ()=> new Promise<void>(done=> {
	// 暗号化
	const path_src = 'test/mat/nc10889.mp4';
	const stt = statSync(path_src);
	expect(stt.size).toBe(369411);	// ファイルサイズ

	const rs = createReadStream(path_src)
	.on('error', e=> console.error('encrypter rs=%o', e));

	const path_enc = 'test/mat/nc10889.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', ()=> {(async ()=> {
		expect((await readFile(path_enc, { encoding: 'hex' })).slice(0, 32)).toBe('12280000968b195263b5884cdbe25696');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(369433);	// ファイルサイズ

		// 復号化
		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = new Uint8Array(await readFile(path_enc)).buffer;
		expect(encAB.byteLength).toBe(stt_bin.size);	// ファイルサイズ

		const {ext_num, ab} = await fncDecAB(encAB);
		expect(ext_num).toBe(20);	// mp4
		expect(ab.byteLength).toBe(stt.size);	// ファイルサイズ

		const srcH = await readFile(path_src, {encoding: 'hex'});
		const decH = ab2hexStr(ab);
		expect(srcH.length).toBe(decH.length);
		expect(srcH).toBe(decH);
		expect(decH.slice(0, 32)).toBe('00000018667479706d70343200000001');
		expect(decH.slice(-32)).toBe('7061636b657420656e643d2277223f3e');

		done();
	})()})
	.on('error', e=> {console.error('encrypter ws=%o', e); done()});

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
}));
