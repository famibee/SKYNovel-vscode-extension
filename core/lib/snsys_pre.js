"use strict";
/* ***** BEGIN LICENSE BLOCK *****
    Copyright (c) 2021-2022 Famibee (famibee.blog38.fc2.com)

    This software is released under the MIT License.
    http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.init = void 0;
function init(pia) {
    return __awaiter(this, void 0, void 0, function () {
        var p, _a, enc, AES, PBKDF2, RIPEMD160, iv, pbkdf2, regFullCrypto, Buffer;
        return __generator(this, function (_b) {
            p = pia.tstDecryptInfo();
            _a = require('crypto-js'), enc = _a.enc, AES = _a.AES, PBKDF2 = _a.PBKDF2, RIPEMD160 = _a.RIPEMD160;
            iv = enc.Hex.parse(p.iv);
            pbkdf2 = PBKDF2(enc.Utf8.parse(p.pass), enc.Hex.parse(p.salt), { keySize: p.keySize, iterations: p.ite });
            regFullCrypto = /(^|\.)(sn|ssn|json|html?)$/;
            Buffer = require('buffer').Buffer;
            pia.setDec(function (ext, d) {
                regFullCrypto.lastIndex = 0;
                if (typeof d === 'string')
                    return {
                        ret: regFullCrypto.test(ext)
                            ? AES.decrypt(d, pbkdf2, { iv: iv }).toString(enc.Utf8)
                            : d,
                        ext_num: 0
                    };
                //		if (ext !== 'bin') return {ret: d, ext_num: 0};
                var cl = new DataView(d).getUint32(0, true);
                var b6 = d.slice(4, 4 + cl);
                //const code2hex = Buffer.from(b6, 'binary').toString('hex');
                //console.log(`fn:index.ts line:31         bin: +:%o -:%o       cl:${cl}`, code2hex.slice(0, 32), code2hex.slice(-32));
                var q = AES.decrypt(Buffer.from(b6, 'binary').toString('utf8'), pbkdf2, { iv: iv }).toString(enc.Utf8);
                var b = Buffer.from(q, 'base64');
                //console.log(`fn:index.ts line:34    original: ++%o --%o`, b.toString('hex').slice(0, 32), b.toString('hex').slice(-32));
                //	const v = b.readUInt8(0);
                //	const en = b.readUInt8(1);
                var b1 = b.slice(2);
                var b2 = Buffer.from(d.slice(4 + cl), 'binary');
                var ab = Buffer.concat([b1, b2]);
                //console.log(`fn:index.ts line:41 === b1len:${b1.length} + b2len:${b2.length} = full_len:${ab.length}`);
                return { ret: ab, ext_num: b.readUInt8(1) };
            });
            pia.setEnc(function (d) { return String(AES.encrypt(d, pbkdf2, { iv: iv })); });
            pia.getStK(function () { return p.stk; });
            pia.getHash(function (d) { return RIPEMD160(d).toString(enc.Hex); });
            return [2 /*return*/];
        });
    });
}
exports.init = init;
