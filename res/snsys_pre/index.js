//@ts-check
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.init = hSN=> {
	(async ()=> {
		const p = {p:0};
		const crypt = await require('crypto-js');
		const iv = crypt.enc.Hex.parse(p.iv);
		const pbkdf2 = crypt.PBKDF2(
			crypt.enc.Utf8.parse(p.pass),
			crypt.enc.Hex.parse(p.salt),
			{keySize: p.keySize, iterations: p.ite}
		);
		const regNeedCrypt = /(^|\.)(sn|json|bin)$/;
		const regFullCrypt = /(^|\.)(sn|json)$/;
		const hN2Ext = {
			0	: {exp: '', mime: ''},
			1	: {exp: 'jpeg', mime: 'image/jpeg'},
			2	: {exp: 'png', mime: 'image/png'},
			3	: {exp: 'svg', mime: 'image/svg+xml'},
			4	: {exp: 'webp', mime: 'image/webp'},
			10	: {exp: 'mp3', mime: ''},
			11	: {exp: 'm4a', mime: ''},
			12	: {exp: 'ogg', mime: ''},
			13	: {exp: 'aac', mime: ''},
			14	: {exp: 'flac', mime: ''},
			15	: {exp: 'wav', mime: ''},
			20	: {exp: 'mp4', mime: ''},
			21	: {exp: 'webm', mime: ''},
			22	: {exp: 'ogv', mime: ''},
		};
		hSN.setPre(async (ext, data)=> {
			if (! regNeedCrypt.test(ext)) return data;
			if (regFullCrypt.test(ext)) return crypt.AES.decrypt(
				//@ts-ignore
				{ciphertext: crypt.enc.Base64.parse(data)}, pbkdf2, {iv: iv},
			).toString(crypt.enc.Utf8);

			const cl = Buffer.from(data.slice(0, 4)).readUInt32LE(0);
			const e6 = Buffer.from(data.slice(4, cl+4)).toString('hex');
			const ct = crypt.enc.Hex.parse(e6);
			//@ts-ignore
			const e2 = crypt.AES.decrypt({ciphertext: ct}, pbkdf2, {iv: iv});
			const b = Buffer.from(e2.toString(crypt.enc.Hex), 'hex');
	//		const v = b.readUInt8(0);
			const mime = hN2Ext[b.readUInt8(1)].mime;
			if (! mime) {
				const bl = new Blob([b.slice(2), data.slice(cl+4)]);
				return bl.arrayBuffer();
			}

			const bl = new Blob([b.slice(2), data.slice(cl+4)], {type: mime});

			return new Promise((rs, rj)=> {
				const img = new Image();
				img.onload = ()=> {URL.revokeObjectURL(img.src); rs(img)};
				img.onerror = e=> rj(e);
				img.src = URL.createObjectURL(bl);
			});
		});
		hSN.setEnc(data=> crypt.AES.encrypt(data, pbkdf2, {iv: iv}));
		hSN.getStK(()=> p.stk);
	})();
}
