/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2023 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {Encryptor} from '../src/Encryptor';
import {EncryptorTransform} from '../src/EncryptorTransform';
import {IPluginInitArg, PLUGIN_PRE_RET} from '../src/CmnLib';
import {readFileSync, createReadStream, ensureFileSync, createWriteStream, statSync} from 'fs-extra';

let	encry: Encryptor;
const infDecrypt = {
	pass	: 'd0a3c6e5-ddc1-48ee-bf38-471e2e2e018a',
	salt	: '70a7c0b81cc31a8849cacdab8ed90163',
	iv		: '493f19a60e5f03f55576a98bfc892a13',
	keySize	: 16,
	ite		: 513,
	stk		: '3d01197ce022b188696791cf903cd197',
};

beforeEach(()=> {
	encry = new Encryptor({
		pass	: 'd0a3c6e5-ddc1-48ee-bf38-471e2e2e018a',
		salt	: '70a7c0b81cc31a8849cacdab8ed90163',
		iv		: '493f19a60e5f03f55576a98bfc892a13',
		keySize	: 16,
		ite		: 513,
		stk		: '3d01197ce022b188696791cf903cd197',
	});
});

it('main_sn_full',()=> {
	const src = readFileSync('test/mat/main.sn', {encoding: 'utf8'});
	const srcH = Buffer.from(src.slice(0, 16)).toString('hex');
	expect(srcH).toBe('095b6164645f6c6179206c617965723d');
	const stt = statSync('test/mat/main.sn');
	expect(stt.size).toBe(3031);	// ファイルサイズ

	const enc = encry.enc(src);	// 暗号化
	expect(enc.slice(0, 16)).toBe('xoVYiz0bdPtPhkDA');

	const dec = encry.dec(enc);	// 復号化
	const decH = Buffer.from(dec.slice(0, 16)).toString('hex');
	expect(decH).toBe('095b6164645f6c6179206c617965723d');
	expect(src).toBe(dec);
});

it('wood04_mp3_full_simple',()=> {
	const src0 = readFileSync('test/mat/wood04.mp3', {encoding: 'hex'});
	const src0H = src0.slice(0, 32);
	expect(src0H).toBe('49443303000000000061434f4d4d0000');
	const stt = statSync('test/mat/wood04.mp3');
	expect(stt.size).toBe(3995);	// ファイルサイズ

	const src = readFileSync('test/mat/wood04.mp3', {encoding: 'utf8'});
	const srcH = Buffer.from(src.slice(0, 16)).toString('hex');
	expect(srcH).toBe('49443303000000000061434f4d4d0000');

	const enc = encry.enc(src);	// 暗号化
	const encH = enc.slice(0, 32);
	expect(encH).toBe('xq+5mAwQFuMUz5a4neR73Ya7RYEhGYdk');

	const dec = encry.dec(enc);	// 復号化
	const decH = Buffer.from(dec.slice(0, 16)).toString('hex');
	expect(decH).toBe('49443303000000000061434f4d4d0000');
	expect(src).toBe(dec);
});

it('prj_json_simple', async ()=> {
	const path_src = 'test/mat/prj.json';
	const stt = statSync(path_src);
	expect(stt.size).toBe(650);	// ファイルサイズ

	// 暗号化
	const src = readFileSync(path_src, {encoding: 'utf8'});
	const enc = encry.enc(src);
	expect(enc).toBe('AxBoGNF1tJwzKdCZOXXGevZuuFmA1qrx/JA/f9mIb+MnzKKH70MzLwM+EDh/TeAeM8ggg/ONU7LgCl3jEfNTw/dsMBO1MfCsqFJiNWRTuB9khZXv2kp5tJclL6sZXYtAh9uPrPTXwCNIkmeKXmL5t0mzH+MwuXl88Ni9mt5Qlc3ir7YjgKSWqv2fmhAb74apsjc12DjxJSpJtZ6Q7E6Nuv/tFNo9lYPtoY3QLgHmdLHppHVIjUlMkGJ+M9mieyKBKZhiqmL+LZ6Vap6xs8vQFmpJsDGoWyFOtE/ph4K9x1xnpdDWR0YwUjSZ6RC3SX/faqVCAYJQn8/UsNHZa/O9ECHVNvPqgT+dZEuEG5OOt8q7Nfn+PzzJS/A9gaN+QkmVJmzwy8wtLK5UU1H11770Mp5Goln+dE8PeR7nliUp9R8P0zTgKW1gpXjwkB0qvyOf8Y+III5qsxTmUB94obSABeSFCcb98RJ72qKLUxOqTvElOMFkytsuyiBtDoR+Vce1BIjvhGGIu8uBlBVH+ySRzlwQqpB6mmZ4mkSqJwvNvW4lH77MtewkHNRpqv/xPerslc0788d24PEDuJ3NNoWi1QUKhNIdS141PMtTFCPMVNPeiQO6HFhXnRBDzxZ/R8qX0a0WF4Z+5+X8OhPsMUpRxeyvkgI5yKTRaCN9Y/kStNXY0dTIrly7QddXKfpAPvMNz3YINjJ0+sbXM0SS5q+fIpIkBAaaVxTM0TIlvBQVaMKcTfE0AytNgviXEVdAWh1zvx99euaa46k/btgKDH4fRv7wDaPks7+T8yKTml0ucMfZ7A8w/bl14YCTgwVfC9eYJpl5TZv831sZIh1/hAU5ZIWZk57B5Ps4d6dnG1nEPwU=');

	// 復号化
	const dec = encry.dec(enc);
	expect(dec).toBe(src);
	expect(dec).toBe(`{"book":{"title":"桜の樹の下には1","creator":"ふぁみべぇ","cre_url":"https://twitter.com/ugainovel","publisher":"電子演劇部","pub_url":"https://ugainovel.blog.fc2.com/","detail":"梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。","version":"1.0.0"},"save_ns":"uc1","window":{"width":1024,"height":768},"log":{"max_len":1024},"init":{"bg_color":"#000000","tagch_msecwait":10,"auto_msecpagewait":3500},"debug":{"devtool":true,"token":false,"tag":false,"putCh":false,"baseTx":false,"masume":false,"variable":false,"debugLog":false},"code":{},"debuger_token":"10a95e72-c862-4faa-bfec-26cf28f03ecc"}
`);

try {
		// 復号化（本番方式）
		let fncDec: (ext: string, d: string | ArrayBuffer)=> PLUGIN_PRE_RET = (_, _2)=> ({ret: '', ext_num: 0,});
		const hSN: IPluginInitArg = {
			setDec	: fnc=> fncDec = fnc,
			setEnc	: ()=> {},
			getStK	: ()=> {},
			getHash	: ()=> {},
			tstDecryptInfo	: ()=> infDecrypt,
		};
		const {init} = require('../src/snsys_pre');
//		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const {ret, ext_num} = fncDec('json', enc);
		expect(ext_num).toBe(0);	// other
		const preUtf8 = Buffer.from(ret).toString('utf8');

		expect(src.length).toBe(preUtf8.length);
		expect(src).toBe(preUtf8);
		expect(preUtf8).toBe(`{"book":{"title":"桜の樹の下には1","creator":"ふぁみべぇ","cre_url":"https://twitter.com/ugainovel","publisher":"電子演劇部","pub_url":"https://ugainovel.blog.fc2.com/","detail":"梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。","version":"1.0.0"},"save_ns":"uc1","window":{"width":1024,"height":768},"log":{"max_len":1024},"init":{"bg_color":"#000000","tagch_msecwait":10,"auto_msecpagewait":3500},"debug":{"devtool":true,"token":false,"tag":false,"putCh":false,"baseTx":false,"masume":false,"variable":false,"debugLog":false},"code":{},"debuger_token":"10a95e72-c862-4faa-bfec-26cf28f03ecc"}
`);
} catch (error) {console.error(`fn:Encryptor.test.ts %o`, error);}

});

// B,C
it('wood04_mp3_stream_transform', async ()=> {return new Promise<void>(done=> {
//it('wood04_mp3_stream_transform', done=> {
		// この形式でないと jest拡張機能が成功扱いしてくれない
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

	const srcH = readFileSync(path_src, {encoding: 'hex'});

	const rs = createReadStream(path_src)
	.on('error', e=> console.error(`encrypter rs=%o`, e));

	const path_enc = 'test/mat/wood04.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', async ()=> {
		expect(readFileSync(path_enc, {encoding: 'hex'}).slice(0, 32)).toBe('d81b00004f426a66395939456b654f59');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(7132);	// ファイルサイズ

try {
		// 復号化
		let fncDec: (ext: string, d: string | ArrayBuffer)=> PLUGIN_PRE_RET = (_, _2)=> ({ret: '', ext_num: 0,});
		const hSN: IPluginInitArg = {
			setDec	: fnc=> fncDec = fnc,
			setEnc	: ()=> {},
			getStK	: ()=> {},
			getHash	: ()=> {},
			tstDecryptInfo	: ()=> infDecrypt,
		};
		const {init} = require('../src/snsys_pre');
//		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);
		const encAB = readFileSync(path_enc).buffer;
		const {ret, ext_num} = fncDec('bin', encAB);
		expect(ext_num).toBe(10);	// mp3
		const preH = Buffer.from(ret).toString('hex');

		expect(srcH.length).toBe(preH.length);
		expect(srcH).toBe(preH);
		expect(preH.slice(0, 32)).toBe('49443303000000000061434f4d4d0000');
		expect(preH.slice(-32)).toBe('62697320492032303034303632000094');

} catch (error) {console.error(`fn:Encryptor.test.ts %o`, error);}
		done();
	})
	.on('error', e=> console.error(`encrypter ws=%o`, e));

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
});});

// B,a,A*n
it('free0509_mp3_stream_transform', done=> {
	// 暗号化
	const path_src = 'test/mat/free0509.mp3';
	const stt = statSync(path_src);
	expect(stt.size).toBe(1796953);	// ファイルサイズ

	const srcH = readFileSync(path_src, {encoding: 'hex'});

	const rs = createReadStream(path_src)
	.on('error', e=> console.error(`encrypter rs=%o`, e));

	const path_enc = 'test/mat/free0509.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', async ()=> {
		expect(readFileSync(path_enc, {encoding: 'hex'}).slice(0, 32)).toBe('2c4700005a2b6f2f6f6d34514f744832');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(1804937);	// ファイルサイズ

try {
		// 復号化
		let fncDec: (ext: string, d: string | ArrayBuffer)=> PLUGIN_PRE_RET = (_, _2)=> ({ret: '', ext_num: 0,});
		const hSN: IPluginInitArg = {
			setDec	: fnc=> fncDec = fnc,
			setEnc	: ()=> {},
			getStK	: ()=> {},
			getHash	: ()=> {},
			tstDecryptInfo	: ()=> infDecrypt,
		};
		const {init} = require('../src/snsys_pre');
//		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = readFileSync(path_enc).buffer;
		const {ret, ext_num} = fncDec('bin', encAB);
		expect(ext_num).toBe(10);	// mp3
		const preH = Buffer.from(ret).toString('hex');

		expect(srcH.length).toBe(preH.length);
		expect(srcH).toBe(preH);
		expect(preH.slice(0, 32)).toBe('49443303000000001000544954320000');
		expect(preH.slice(-32)).toBe('766581408179687474703a2f2f777700');

} catch (error) {console.error(`fn:Encryptor.test.ts %o`, error);}
		done();
	})
	.on('error', e=> console.error(`encrypter ws=%o`, e));

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
});

// B,a
it('_yesno_png_stream_transform', done=> {
	// 暗号化
	const path_src = 'test/mat/_yesno.png';
	const stt = statSync(path_src);
	expect(stt.size).toBe(18722);	// ファイルサイズ

	const srcH = readFileSync(path_src, {encoding: 'hex'});

	const rs = createReadStream(path_src)
	.on('error', e=> console.error(`encrypter rs=%o`, e));

	const path_enc = 'test/mat/_yesno.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', async ()=> {
		expect(readFileSync(path_enc, {encoding: 'hex'}).slice(0, 32)).toBe('2c47000043434a786f736c6d55644979');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(26706);	// ファイルサイズ

try {
		// 復号化
		let fncDec: (ext: string, d: string | ArrayBuffer)=> PLUGIN_PRE_RET = (_, _2)=> ({ret: '', ext_num: 0,});
		const hSN: IPluginInitArg = {
			setDec	: fnc=> fncDec = fnc,
			setEnc	: ()=> {},
			getStK	: ()=> {},
			getHash	: ()=> {},
			tstDecryptInfo	: ()=> infDecrypt,
		};
		const {init} = require('../src/snsys_pre');
//		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = readFileSync(path_enc).buffer;
		const {ret, ext_num} = fncDec('bin', encAB);
		expect(ext_num).toBe(2);	// png
		const preH = Buffer.from(ret).toString('hex');

		expect(srcH.length).toBe(preH.length);
		expect(srcH).toBe(preH);
		expect(preH.slice(0, 32)).toBe('89504e470d0a1a0a0000000d49484452');
		expect(preH.slice(-32)).toBe('53f9df960000000049454e44ae426082');

} catch (error) {console.error(`fn:Encryptor.test.ts %o`, error);}
		done();
	})
	.on('error', e=> console.error(`encrypter ws=%o`, e));

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
});

// B,a,A*n
it('title_jpg_stream_transform', done=> {
	// 暗号化
	const path_src = 'test/mat/title.jpg';
	const stt = statSync(path_src);
	expect(stt.size).toBe(406121);	// ファイルサイズ

	const srcH = readFileSync(path_src, {encoding: 'hex'});

	const rs = createReadStream(path_src)
	.on('error', e=> console.error(`encrypter rs=%o`, e));

	const path_enc = 'test/mat/title.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', async ()=> {
		expect(readFileSync(path_enc, {encoding: 'hex'}).slice(0, 32)).toBe('2c4700006f5672344c6f6b36456b744f');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(414105);	// ファイルサイズ

try {
		// 復号化
		let fncDec: (ext: string, d: string | ArrayBuffer)=> PLUGIN_PRE_RET = (_, _2)=> ({ret: '', ext_num: 0,});
		const hSN: IPluginInitArg = {
			setDec	: fnc=> fncDec = fnc,
			setEnc	: ()=> {},
			getStK	: ()=> {},
			getHash	: ()=> {},
			tstDecryptInfo	: ()=> infDecrypt,
		};
		const {init} = require('../src/snsys_pre');
//		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);

		const encAB = readFileSync(path_enc).buffer;
		const {ret, ext_num} = fncDec('bin', encAB);
		expect(ext_num).toBe(1);	// jpeg
		const preH = Buffer.from(ret).toString('hex');

		expect(srcH.length).toBe(preH.length);
		expect(srcH).toBe(preH);
		expect(preH.slice(0, 32)).toBe('ffd8ffe000104a464946000102010048');
		expect(preH.slice(-32)).toBe('211a108d084684234211a108d085ffd9');

} catch (error) {console.error(`fn:Encryptor.test.ts %o`, error);}
		done();
	})
	.on('error', e=> console.error(`encrypter ws=%o`, e));

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
});

// B,a,A*n
it('nc10889_mp4_stream_transform', done=> {
	// 暗号化
	const path_src = 'test/mat/nc10889.mp4';
	const stt = statSync(path_src);
	expect(stt.size).toBe(369411);	// ファイルサイズ

	const srcH = readFileSync(path_src, {encoding: 'hex'});

	const rs = createReadStream(path_src)
	.on('error', e=> console.error(`encrypter rs=%o`, e));

	const path_enc = 'test/mat/nc10889.bin';
	ensureFileSync(path_enc);	// touch
	const ws = createWriteStream(path_enc)
	.on('close', async ()=> {
		expect(readFileSync(path_enc, {encoding: 'hex'}).slice(0, 32)).toBe('2c47000034456a2f6836367549685061');

		const stt_bin = statSync(path_enc);
		expect(stt_bin.size).toBe(377395);	// ファイルサイズ

try {
		// 復号化
		let fncDec: (ext: string, d: string | ArrayBuffer)=> PLUGIN_PRE_RET = (_, _2)=> ({ret: '', ext_num: 0,});
		const hSN: IPluginInitArg = {
			setDec	: fnc=> fncDec = fnc,
			setEnc	: ()=> {},
			getStK	: ()=> {},
			getHash	: ()=> {},
			tstDecryptInfo	: ()=> infDecrypt,
		};
		const {init} = require('../src/snsys_pre');
//		const {init} = await import('../src/snsys_pre');
			// jestがESM対応できてないので
		await init(hSN);
		const encAB = readFileSync(path_enc).buffer;
		const {ret, ext_num} = fncDec('bin', encAB);
		expect(ext_num).toBe(20);	// mp4
		const preH = Buffer.from(ret).toString('hex');

		expect(srcH.length).toBe(preH.length);
		expect(srcH).toBe(preH);
		expect(preH.slice(0, 32)).toBe('00000018667479706d70343200000001');
		expect(preH.slice(-32)).toBe('7061636b657420656e643d2277223f3e');

} catch (error) {console.error(`fn:Encryptor.test.ts %o`, error);}
		done();
	})
	.on('error', e=> console.error(`encrypter ws=%o`, e));

	const tr = new EncryptorTransform(encry, path_src);
	rs.pipe(tr).pipe(ws);
});
