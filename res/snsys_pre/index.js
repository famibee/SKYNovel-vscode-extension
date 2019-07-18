"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.init = hSN=> {
	(async () => {
		const p = {p:0};
		const crypt = await Promise.resolve().then(()=> require('crypto-js'));

		const iv = crypt.enc.Hex.parse(p.iv);
		const pbkdf2 = crypt.PBKDF2(
			crypt.enc.Utf8.parse(p.pass),
			crypt.enc.Hex.parse(p.salt),
			{keySize: p.keySize, iterations: p.ite}
		);
		hSN.setPre((ext, data)=> {
			if (ext.slice(-1) != '_') return data;

			return crypt.AES.decrypt(
				{ciphertext: crypt.enc.Base64.parse(data)},
				pbkdf2,
				{iv: iv},
			).toString(crypt.enc.Utf8);
		});
		hSN.setEnc(data=> crypt.AES.encrypt(
			data,
			pbkdf2,
			{iv: iv},
		));
	})();
}
