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

context('class Encryptor', ()=>{
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
		it('test_sn_full', ()=> {
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

		it('test_mp3_simple', ()=> {
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

		it('test_mp3_stream_transform', done=> {
			const stt = statSync('test/mat/wood04.mp3');
			assert.equal(stt.size, 3995);	// ファイルサイズ

			const rs = createReadStream('test/mat/wood04.mp3')
			.on('error', (e :any)=> console.error(`encrypter rs=%o`, e));

			const u2 = 'test/mat/wood04.bin';
			ensureFileSync(u2);	// touch
			const ws = createWriteStream(u2)
			.on('close', async ()=> {
				const enc = readFileSync(u2, {encoding: 'hex'});
				const encHex = enc.slice(0, 32);
				assert.equal(encHex, '803e000053f25c1e789e4e8b2fa36e09');

				const stt_bin = statSync('test/mat/wood04.bin');
				assert.equal(stt_bin.size, 16004);	// ファイルサイズ

				const hSN: IPluginInitArg = {
					addTag(_: string, _2: ITag) {},
					addLayCls(_: string, _2: ILayerFactory) {},
					searchPath(_: string, _2?: string): string {return ''},
					getVal(_: string, _2?: number | string): object {return {}},
					resume(_?: ()=> void) {},
					render(_: any, _2?: any, _3?: boolean) {},
					setPre(_: (ext: string, data: string)=> Promise<string>) {},
					setEnc(_: (data: string)=> Promise<string>) {},
					getStK(_: ()=> string) {},
					getHash(_: (data: string)=> string) {},
				};
				const {init} = await import('../res/snsys_pre');
				init(hSN);

				done();
			})
			.on('error', (e :any)=> console.error(`encrypter ws=%o`, e));

			const tr = new EncryptorTransform(encry, '', ws);
			rs.pipe(tr).pipe(ws);
		});

		it('test_promise', ()=> {
			return Promise.resolve(0);
			// (done) => {		done();
			// async () => {	await heavyJob();
		});

	});

});
