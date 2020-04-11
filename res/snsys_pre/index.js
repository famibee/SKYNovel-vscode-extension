//@ts-check
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.init = hSN=> {
	(async ()=> {
		const p = {p:0};
		const crypto = await require('crypto-js');
		const iv = crypto.enc.Hex.parse(p.iv);
		const pbkdf2 = crypto.PBKDF2(
			crypto.enc.Utf8.parse(p.pass),
			crypto.enc.Hex.parse(p.salt),
			{keySize: p.keySize, iterations: p.ite}
		);
		hSN.setPre(async (ext, data)=> {
			if (regFullCrypto.test(ext)) return crypto.AES.decrypt(
				//@ts-ignore
				{ciphertext: crypto.enc.Base64.parse(data)}, pbkdf2, {iv: iv},
			).toString(crypto.enc.Utf8);
			if (ext != 'bin') return data;

			const cl = Buffer.from(data.slice(0, 4)).readUInt32LE(0);
			const e6 = Buffer.from(data.slice(4, 4+cl)).toString('hex');
			const ct = crypto.enc.Hex.parse(e6);
			//@ts-ignore
			const e2 = crypto.AES.decrypt({ciphertext: ct}, pbkdf2, {iv: iv});
			const b = Buffer.from(e2.toString(crypto.enc.Hex), 'hex');
	//		const v = b.readUInt8(0);
			const fm = hN2Ext[b.readUInt8(1)];
			const mime = fm.mime;
			if (! mime) {
				const bl = new Blob([b.slice(2), data.slice(4+cl)]);
				return bl.arrayBuffer();
			}
			const bl = new Blob([b.slice(2), data.slice(4+cl)], {type: mime});
			return new Promise(fm.fnc(bl));
		});
		hSN.setEnc(data=> crypto.AES.encrypt(data, pbkdf2, {iv: iv}));
		hSN.getStK(()=> p.stk);
	})();
}

const regFullCrypto = /(^|\.)(sn|json|html?)$/;

const fncImage = bl=> (rs, rj)=> {
	const img = new Image();
	img.onload = ()=> rs(img);
	img.onerror = e=> rj(e);
	img.src = URL.createObjectURL(bl);
};
const fncVideo = bl=> (rs, rj)=> {
	const v = document.createElement('video');
//	v.addEventListener('loadedmetadata', ()=> console.log(`loadedmetadata duration:${v.duration}`));
	v.addEventListener('error', ()=> rj(v.error.message));
	v.addEventListener('canplay', ()=> rs(v));
	v.src = URL.createObjectURL(bl);
};
const hN2Ext = {
	1	: {exp: 'jpeg', fnc: fncImage, mime: 'image/jpeg'},
	2	: {exp: 'png', fnc: fncImage, mime: 'image/png'},
	3	: {exp: 'svg', fnc: fncImage, mime: 'image/svg+xml'},
	4	: {exp: 'webp', fnc: fncImage, mime: 'image/webp'},
	10	: {exp: 'mp3', fnc: null, mime: ''},
	11	: {exp: 'm4a', fnc: null, mime: ''},
	12	: {exp: 'ogg', fnc: null, mime: ''},
	13	: {exp: 'aac', fnc: null, mime: ''},
	14	: {exp: 'flac', fnc: null, mime: ''},
	15	: {exp: 'wav', fnc: null, mime: ''},
	20	: {exp: 'mp4', fnc: fncVideo, mime: 'video/mp4'},
	21	: {exp: 'webm', fnc: fncVideo, mime: 'video/webm'},
	22	: {exp: 'ogv', fnc: fncVideo, mime: 'video/ogv'},
};
