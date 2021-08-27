/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import assert = require('power-assert');

import {Encryptor} from '../core/src/Encryptor';
import {EncryptorTransform} from '../core/src/EncryptorTransform';
import {IPluginInitArg, ITag, ILayerFactory} from '../core/src/CmnLib';
import {readFileSync, createReadStream, ensureFileSync, createWriteStream, statSync} from 'fs-extra';

context('class Encryptor', ()=> {
	let	encry: Encryptor;

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

	describe('Tst', ()=> {
		it('main_sn_full', ()=> {
			const src = readFileSync('test/mat/main.sn', {encoding: 'utf8'});
			const srcHex = Buffer.from(src.slice(0, 16)).toString('hex');
//console.log(`fn:Encryptor.test.ts line:31 srcHex:%o`, srcHex);
			assert.equal(srcHex, '095b6164645f6c6179206c617965723d');
			const stt = statSync('test/mat/main.sn');
			assert.equal(stt.size, 3031);	// ファイルサイズ

			const enc = encry.enc(src);	// 暗号化
//console.log(`fn:Encryptor.test.ts line:35 enc:%o`, enc.slice(0, 16));
			assert.equal(enc.slice(0, 16), 'xoVYiz0bdPtPhkDA');

			const dec = encry.dec(enc);	// 復号化
			const decHex = Buffer.from(dec.slice(0, 16)).toString('hex');
//console.log(`fn:Encryptor.test.ts line:40 decHex:%o`, decHex);
			assert.equal(decHex, '095b6164645f6c6179206c617965723d');
		});

		it('wood04_mp3_full_simple', ()=> {
			const src0 = readFileSync('test/mat/wood04.mp3', {encoding: 'hex'});
			const src0Hex = src0.slice(0, 32);
//console.log(`fn:Encryptor.test.ts line:48 src0Hex:%o`, src0Hex);
			assert.equal(src0Hex, '49443303000000000061434f4d4d0000');
			const stt = statSync('test/mat/wood04.mp3');
			assert.equal(stt.size, 3995);	// ファイルサイズ

			const src = readFileSync('test/mat/wood04.mp3', {encoding: 'utf8'});
			const srcHex = Buffer.from(src.slice(0, 16)).toString('hex');
//console.log(`fn:Encryptor.test.ts line:53 srcHex:%o`, srcHex);
			assert.equal(srcHex, '49443303000000000061434f4d4d0000');
	////console.log(`fn:Encryptor.test.ts line:55 len src0:${src0.length} src:${src.length}`);

			const enc = encry.enc(src);	// 暗号化
			const encHex = enc.slice(0, 32);
//console.log(`fn:Encryptor.test.ts line:59 encHex:%o`, encHex);
			assert.equal(encHex, 'xq+5mAwQFuMUz5a4neR73Ya7RYEhGYdk');

			const dec = encry.dec(enc);	// 復号化
			const decHex = Buffer.from(dec.slice(0, 16)).toString('hex');
//console.log(`fn:Encryptor.test.ts line:64 decHex:%o`, decHex);
			assert.equal(decHex, '49443303000000000061434f4d4d0000');
		});

		it('prj_json_simple', done=> {
			const path_src = 'test/mat/prj.json';
			const stt = statSync(path_src);
			assert.equal(stt.size, 650);	// ファイルサイズ

			// 暗号化
			const srcUtf8 = readFileSync(path_src, {encoding: 'utf8'});
			const enc = encry.enc(srcUtf8);
			assert.equal(enc, 'AxBoGNF1tJwzKdCZOXXGevZuuFmA1qrx/JA/f9mIb+MnzKKH70MzLwM+EDh/TeAeM8ggg/ONU7LgCl3jEfNTw/dsMBO1MfCsqFJiNWRTuB9khZXv2kp5tJclL6sZXYtAh9uPrPTXwCNIkmeKXmL5t0mzH+MwuXl88Ni9mt5Qlc3ir7YjgKSWqv2fmhAb74apsjc12DjxJSpJtZ6Q7E6Nuv/tFNo9lYPtoY3QLgHmdLHppHVIjUlMkGJ+M9mieyKBKZhiqmL+LZ6Vap6xs8vQFmpJsDGoWyFOtE/ph4K9x1xnpdDWR0YwUjSZ6RC3SX/faqVCAYJQn8/UsNHZa/O9ECHVNvPqgT+dZEuEG5OOt8q7Nfn+PzzJS/A9gaN+QkmVJmzwy8wtLK5UU1H11770Mp5Goln+dE8PeR7nliUp9R8P0zTgKW1gpXjwkB0qvyOf8Y+III5qsxTmUB94obSABeSFCcb98RJ72qKLUxOqTvElOMFkytsuyiBtDoR+Vce1BIjvhGGIu8uBlBVH+ySRzlwQqpB6mmZ4mkSqJwvNvW4lH77MtewkHNRpqv/xPerslc0788d24PEDuJ3NNoWi1QUKhNIdS141PMtTFCPMVNPeiQO6HFhXnRBDzxZ/R8qX0a0WF4Z+5+X8OhPsMUpRxeyvkgI5yKTRaCN9Y/kStNXY0dTIrly7QddXKfpAPvMNz3YINjJ0+sbXM0SS5q+fIpIkBAaaVxTM0TIlvBQVaMKcTfE0AytNgviXEVdAWh1zvx99euaa46k/btgKDH4fRv7wDaPks7+T8yKTml0ucMfZ7A8w/bl14YCTgwVfC9eYJpl5TZv831sZIh1/hAU5ZIWZk57B5Ps4d6dnG1nEPwU=');

			// 復号化
			const dec = encry.dec(enc);
			assert.equal(dec, srcUtf8);
			assert.equal(dec, `{"book":{"title":"桜の樹の下には1","creator":"ふぁみべぇ","cre_url":"https://twitter.com/ugainovel","publisher":"電子演劇部","pub_url":"https://ugainovel.blog.fc2.com/","detail":"梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。","version":"1.0.0"},"save_ns":"uc1","window":{"width":1024,"height":768},"log":{"max_len":1024},"init":{"bg_color":"#000000","tagch_msecwait":10,"auto_msecpagewait":3500},"debug":{"devtool":true,"token":false,"tag":false,"putCh":false,"baseTx":false,"masume":false,"variable":false,"debugLog":false},"code":{},"debuger_token":"10a95e72-c862-4faa-bfec-26cf28f03ecc"}
`);

			(async ()=> {
				// 復号化（本番方式）
				let fncDec: (ext: string, data: string)=> Promise<string>
					= (_, _2)=> Promise.resolve('');
				const hSN: IPluginInitArg = {
					addTag(_: string, _2: ITag) {},
					addLayCls(_: string, _2: ILayerFactory) {},
					searchPath(_: string, _2?: string): string {return ''},
					getVal(_: string, _2?: number | string): object {return {}},
					resume(_?: ()=> void) {},
					render(_: any, _2?: any, _3?: boolean) {},
					setPre(fnc: (ext: string, data: string)=> Promise<string>) {fncDec = fnc;},
					setEnc(_: (data: string)=> Promise<string>) {},
					getStK(_: ()=> string) {},
					getHash(_: (data: string)=> string) {},
				};
				const {init} = await import('../res/snsys_pre');
				await init(hSN);

				const pre = await fncDec('json', enc);
				const preUtf8 = Buffer.from(pre).toString('utf8');
	try {
				assert.equal(srcUtf8.length, preUtf8.length);
				assert.equal(srcUtf8, preUtf8);
				assert.equal(preUtf8, `{"book":{"title":"桜の樹の下には1","creator":"ふぁみべぇ","cre_url":"https://twitter.com/ugainovel","publisher":"電子演劇部","pub_url":"https://ugainovel.blog.fc2.com/","detail":"梶井基次郎「桜の樹の下には」をノベルゲーム化したものです。","version":"1.0.0"},"save_ns":"uc1","window":{"width":1024,"height":768},"log":{"max_len":1024},"init":{"bg_color":"#000000","tagch_msecwait":10,"auto_msecpagewait":3500},"debug":{"devtool":true,"token":false,"tag":false,"putCh":false,"baseTx":false,"masume":false,"variable":false,"debugLog":false},"code":{},"debuger_token":"10a95e72-c862-4faa-bfec-26cf28f03ecc"}
`);
	} catch (error) {console.error(`fn:Encryptor.test.ts line:146 %o`, error);}

				done();
			})();
		});

		it('wood04_mp3_stream_transform', done=> {
			// 暗号化
			const path_src = 'test/mat/wood04.mp3';
			const stt = statSync(path_src);
			assert.equal(stt.size, 3995);	// ファイルサイズ

			const srcHex = readFileSync(path_src, {encoding: 'hex'});
			const srcHex32 = srcHex.slice(0, 32);
			assert.equal(srcHex32, '49443303000000000061434f4d4d0000');

			const rs = createReadStream(path_src)
			.on('error', e=> console.error(`encrypter rs=%o`, e));

			const path_enc = 'test/mat/wood04.bin';
			ensureFileSync(path_enc);	// touch
			const ws = createWriteStream(path_enc)
			.on('close', async ()=> {
				const ench = readFileSync(path_enc, {encoding: 'hex'});
				const encHex = ench.slice(0, 32);
				assert.equal(encHex, '803e00006e42cd2dca81253d95f72609');

				const stt_bin = statSync(path_enc);
				assert.equal(stt_bin.size, 16004);	// ファイルサイズ

				// 復号化
				let fncDec: (ext: string, data: string)=> Promise<string>
					= (_, _2)=> Promise.resolve('');
				const hSN: IPluginInitArg = {
					addTag(_: string, _2: ITag) {},
					addLayCls(_: string, _2: ILayerFactory) {},
					searchPath(_: string, _2?: string): string {return ''},
					getVal(_: string, _2?: number | string): object {return {}},
					resume(_?: ()=> void) {},
					render(_: any, _2?: any, _3?: boolean) {},
					setPre(fnc: (ext: string, data: string)=> Promise<string>) {fncDec = fnc;},
					setEnc(_: (data: string)=> Promise<string>) {},
					getStK(_: ()=> string) {},
					getHash(_: (data: string)=> string) {},
				};
				const {init} = await import('../res/snsys_pre');
				await init(hSN);

				const enc = readFileSync(path_enc, {encoding: 'binary'});

console.log(`fn:Encryptor.test.ts line:165 DEC`);
				const pre = await fncDec('bin', enc);
				const preHex = Buffer.from(pre).toString('hex');	//o
				const preHex32 = preHex.slice(0, 32);
console.log(`fn:Encryptor.test.ts line:169 preHex:%o`, preHex32);
	try {
				assert.equal(preHex32, '49443303000000000061434f4d4d0000');
				assert.equal(srcHex.length, preHex.length);
				assert.equal(srcHex, preHex);

	} catch (error) {console.error(`fn:Encryptor.test.ts line:146 %o`, error);}
console.log(`fn:Encryptor.test.ts line:176 COMPED`);
				done();
			})
			.on('error', e=> console.error(`encrypter ws=%o`, e));

			const tr = new EncryptorTransform(encry, path_src);
			rs.pipe(tr).pipe(ws);
		});

/*
		it('free0509_mp3_stream_transform', done=> {
		});
*/

		it('test_promise', ()=> {
			return Promise.resolve(0);
			// (done) => {		done();
			// async () => {	await heavyJob();
		});

	});

});
