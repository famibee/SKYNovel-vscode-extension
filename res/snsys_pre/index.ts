/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2021-2021 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {IPluginInitArg, IDecryptInfo} from '../../core/src/CmnLib';

export async function init(hSN: IPluginInitArg): Promise<void> {
//		const p: any = {ite:0};
		const p: IDecryptInfo = {
			pass	: 'd0a3c6e5-ddc1-48ee-bf38-471e2e2e018a',
			salt	: '70a7c0b81cc31a8849cacdab8ed90163',
			iv		: '493f19a60e5f03f55576a98bfc892a13',
			keySize	: 16,
			ite		: 513,
			stk		: '3d01197ce022b188696791cf903cd197',
		};
		const {enc, AES, lib, PBKDF2, RIPEMD160} = await import('crypto-js');
		const iv = enc.Hex.parse(p.iv);
		const pbkdf2 = PBKDF2(
			enc.Utf8.parse(p.pass),
			enc.Hex.parse(p.salt),
			{keySize: p.keySize, iterations: p.ite}
		);

		const {Buffer} = require('buffer');
		hSN.setPre(async (ext, data): Promise<string>=> {
			if (regFullCrypto.test(ext)) return AES.decrypt(data, pbkdf2, {iv},).toString(enc.Utf8);
			if (ext != 'bin') return data;

			const bb = Buffer.from(data, 'binary');
			const cl = bb.readUInt32LE(0);
	//-		const cl = Buffer.from(data.slice(0, 4), 'binary').readUInt32LE(0);

console.log(`fn:index.ts line:39 bb.enc_area: +:%o -:%o       cl:${cl}`, Buffer.from(bb.slice(4, 4+cl)).toString('hex').slice(0, 32), Buffer.from(bb.slice(4, 4+cl)).toString('hex').slice(-32));
			const b6 = bb.slice(4, 4+cl).toString('base64');
console.log(`fn:index.ts line:41 b6-32:%o`, b6.slice(-32));



			const b = Buffer.from(AES.decrypt(
				lib.CipherParams.create({ciphertext: b6}),
				pbkdf2, {iv})
				//.words
			);
//			const b = Buffer.from(AES.decrypt(b6, pbkdf2, {iv}).words);
console.log(`fn:index.ts line:46 +++ b32:%o b-32:%o ext:${ext} id:${b.readUInt8(1)} b.len:${b.length}`, b.toString('hex').slice(0, 32), b.toString('hex').slice(-32));

		//	const v = b.readUInt8(0);
			const fm = hN2Ext[b.readUInt8(1)];
console.log(`fn:index.ts line:52    b1.tail:%o`, b.slice(2).toString('hex').slice(-16));
console.log(`fn:index.ts line:53    b1.tail:%o`, b.slice(2).toString('hex').replace(/(0c)+$/, '').slice(-16));
//			const b1 = b.slice(2, -3);	// TODO: === 尻に 0c0c0c これをどうするか
			const b1 = b.slice(2);
console.log(`fn:index.ts line:56 -- b1:%o b1.len:${b1.length} b1.hex.len:${b1.toString('hex').length}`, b1.toString('hex').slice(0, 32));
			const b2 = bb.slice(4+cl);
			const ab = Buffer.concat([b1, b2], b1.length + b2.length);
console.log(`fn:index.ts line:59 fm.ext:${fm.ext} fnc:${Boolean(fm?.fnc)} b1len:${b1.length} b2len:${b2.length}`);
console.log(`fn:index.ts line:60 === b:%o len:${ab.length}`, Buffer.from(ab.slice(0, 16)).toString('hex').slice(0, 32));

			return fm?.fnc
			? fm.fnc(new Buffer.Blob(ab, {type: fm.mime}))
//			? fm.fnc(new Blob(ab, {type: fm.mime}))
//			? new Promise(fm.fnc(new Blob(ab, {type: fm.mime})))
			: ab;
		});

		hSN.setEnc(async data=> String(AES.encrypt(data, pbkdf2, {iv})));
		hSN.getStK(()=> p.stk);
		hSN.getHash(data=> RIPEMD160(data).toString(enc.Hex));
}


const regFullCrypto = /(^|\.)(sn|ssn|json|html?)$/;

const fncImage = (bl: any)=> (rs: (arg0: HTMLImageElement)=> any, rj: (arg0: string | Event)=> any)=> {
	const img = new Image();
	img.onload = ()=> rs(img);
	img.onerror = e=> rj(e);
	img.src = URL.createObjectURL(bl);
};
const fncVideo = (bl: any)=> (rs: (arg0: HTMLVideoElement)=> any, rj: (arg0: string)=> any)=> {
	const v = document.createElement('video');
//	v.addEventListener('loadedmetadata', ()=> console.log(`loadedmetadata duration:${v.duration}`));
	v.addEventListener('error', ()=> rj(v.error.message));
	v.addEventListener('canplay', ()=> rs(v));
	v.src = URL.createObjectURL(bl);
};
const hN2Ext = {
	1	: {ext: 'jpeg', fnc: fncImage, mime: 'image/jpeg'},
	2	: {ext: 'png', fnc: fncImage, mime: 'image/png'},
	3	: {ext: 'svg', fnc: fncImage, mime: 'image/svg+xml'},
	4	: {ext: 'webp', fnc: fncImage, mime: 'image/webp'},
	10	: {ext: 'mp3', fnc: null, mime: ''},
	11	: {ext: 'm4a', fnc: null, mime: ''},
	12	: {ext: 'ogg', fnc: null, mime: ''},
	13	: {ext: 'aac', fnc: null, mime: ''},
	14	: {ext: 'flac', fnc: null, mime: ''},
	15	: {ext: 'wav', fnc: null, mime: ''},
	20	: {ext: 'mp4', fnc: fncVideo, mime: 'video/mp4'},
	21	: {ext: 'webm', fnc: fncVideo, mime: 'video/webm'},
	22	: {ext: 'ogv', fnc: fncVideo, mime: 'video/ogv'},
};
