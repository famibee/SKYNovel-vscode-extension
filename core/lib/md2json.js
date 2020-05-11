"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const idx2nmParam = ['name', 'required', 'default', 'rangetype', 'comment'];
const hMd = {};
const REG_TAG2MB = /~~~skynovel\n(.+?)\n~~~|\[([a-z_]+)]/gs;
const repTag2MB = (md) => md
    .replace(REG_TAG2MB, (a, p1) => p1 ? a : '[[$1]](https://famibee.github.io/SKYNovel/tag.htm#$1)')
    .replace(/<br\/?>/g, '  \n');
const fs = require("fs-extra");
const path = './res/md/';
fs.readdirSync(path, { withFileTypes: true })
    .filter((d) => d.isFile())
    .forEach(({ name }) => {
    var _a, _b, _c, _d;
    const nm = name.slice(0, -3);
    const txt = fs.readFileSync(path + name, { encoding: 'utf8' });
    const a = txt.split(/\*{3}\n*/);
    const len0 = a.length;
    if (len0 > 4)
        a.splice(3, len0, a.slice(3).join('***'));
    const prm = ((_a = a[1]) !== null && _a !== void 0 ? _a : '').trim();
    const aPrm = (prm == '') ? [] : prm.split('\n').map(line => {
        const o = {};
        line.slice(2).split('\t')
            .forEach((c, i) => o[idx2nmParam[i]] = repTag2MB(c));
        return o;
    });
    hMd[nm] = {
        detail: ((_b = a[0]) !== null && _b !== void 0 ? _b : '').trim(),
        param: aPrm,
        snippet: `\t${((_c = a[2]) !== null && _c !== void 0 ? _c : '').trim()}`.split('\n*\n').map(sn => {
            const i = sn.indexOf('\t');
            const a2 = sn.slice(i + 1);
            return { nm: nm + sn.slice(0, i), txt: a2 ? `${nm} ${a2}` : nm };
        }),
        comment: repTag2MB((_d = a[3]) !== null && _d !== void 0 ? _d : '').trim(),
    };
});
fs.writeFileSync('./core/md.json', JSON.stringify(hMd));
//# sourceMappingURL=md2json.js.map