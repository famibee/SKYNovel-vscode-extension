export async function init(pia) {
  const p = pia.tstDecryptInfo();
  const { enc, AES, PBKDF2, RIPEMD160 } = require("crypto-js");
  const iv = enc.Hex.parse(p.iv);
  const pbkdf2 = PBKDF2(enc.Utf8.parse(p.pass), enc.Hex.parse(p.salt), { keySize: p.keySize, iterations: p.ite });
  const regFullCrypto = /(^|\.)(sn|ssn|json|html?)$/;
  const { Buffer } = require("buffer");
  pia.setDec((ext, d) => {
    regFullCrypto.lastIndex = 0;
    if (typeof d === "string")
      return {
        ret: regFullCrypto.test(ext) ? AES.decrypt(d, pbkdf2, { iv }).toString(enc.Utf8) : d,
        ext_num: 0
      };
    const cl = new DataView(d).getUint32(0, true);
    const b6 = d.slice(4, 4 + cl);
    const q = AES.decrypt(Buffer.from(b6, "binary").toString("utf8"), pbkdf2, { iv }).toString(enc.Utf8);
    const b = Buffer.from(q, "base64");
    const b1 = b.slice(2);
    const b2 = Buffer.from(d.slice(4 + cl), "binary");
    const ab = Buffer.concat([b1, b2]);
    return { ret: ab, ext_num: b.readUInt8(1) };
  });
  pia.setEnc((d) => String(AES.encrypt(d, pbkdf2, { iv })));
  pia.getStK(() => p.stk);
  pia.getHash((d) => RIPEMD160(d).toString(enc.Hex));
}
