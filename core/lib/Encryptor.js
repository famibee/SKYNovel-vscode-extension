"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encryptor = void 0;
const crypto_js_1 = require("crypto-js");
const fs_extra_1 = require("fs-extra");
class Encryptor {
    constructor(hPass) {
        this.hPass = hPass;
        this.iv = crypto_js_1.enc.Hex.parse(hPass.iv);
        this.pbkdf2 = crypto_js_1.PBKDF2(crypto_js_1.enc.Utf8.parse(hPass.pass), crypto_js_1.enc.Hex.parse(hPass.salt), {
            keySize: parseInt(hPass.keySize),
            iterations: parseInt(hPass.ite),
        });
    }
    async tst(s, url_out) {
        const e = crypto_js_1.AES.encrypt(s, this.pbkdf2, { iv: this.iv });
        await fs_extra_1.outputFile(url_out, e.toString());
    }
}
exports.Encryptor = Encryptor;
//# sourceMappingURL=Encryptor.js.map