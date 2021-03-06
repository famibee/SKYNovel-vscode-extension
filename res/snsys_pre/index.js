//@ts-check
export function init(hSN) {
	(async ()=> {
		const p = {p:0};
		const {enc, AES, PBKDF2, RIPEMD160} = await import('crypto-js');
		const iv = enc.Hex.parse(p.iv);
		const pbkdf2 = PBKDF2(
			enc.Utf8.parse(p.pass),
			enc.Hex.parse(p.salt),
			{keySize: p.keySize, iterations: p.ite}
		);
		const {Buffer} = require('buffer');
		hSN.setPre(async (ext, data)=> {
			if (regFullCrypto.test(ext)) return Promise.resolve(
				AES.decrypt(		//@ts-ignore
					{ciphertext: enc.Base64.parse(data)},
					pbkdf2, {iv: iv},
				).toString(enc.Utf8)
			);
			if (ext != 'bin') return data;

			const cl = Buffer.from(data.slice(0, 4)).readUInt32LE(0);
			const e6 = Buffer.from(data.slice(4, 4+cl)).toString('hex');
			const ct = enc.Hex.parse(e6);
			//@ts-ignore
			const e2 = AES.decrypt({ciphertext: ct}, pbkdf2, {iv: iv});
			const b = Buffer.from(e2.words);
	//		const v = b.readUInt8(0);
			const fm = hN2Ext[b.readUInt8(1)];
			const ab = [Buffer.from(b.slice(2)), data.slice(4+cl)];
			return fm?.fnc
			? new Promise(fm.fnc(new Blob(ab, {type: fm.mime})))
			: new Blob(ab).arrayBuffer();
		});
		hSN.setEnc(data=> AES.encrypt(data, pbkdf2, {iv: iv}));
		hSN.getStK(()=> p.stk);
		hSN.getHash(data=> RIPEMD160(data).toString(enc.Hex));
	})();
}

const regFullCrypto = /(^|\.)(sn|ssn|json|html?)$/;

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
