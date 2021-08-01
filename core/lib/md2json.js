"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const idx2nmParam = ['name', 'required', 'default', 'rangetype', 'comment'];
const hMd = {};
const REG_TAG2MB = /~~~skynovel\n(.+?)\n~~~|\[([a-z_]+)]/gs;
const repTag2MB = (md) => md
    .replace(REG_TAG2MB, (a, p1, p2) => p1 ? a : `[[${p2}]](https://famibee.github.io/SKYNovel/tag.htm#${p2})`)
    .replace(/<br\/?>/g, '  \n');
const fs = require("fs-extra");
const path = './res/md/';
fs.readdirSync(path, { withFileTypes: true })
    .filter((d) => d.isFile())
    .forEach(({ name }) => {
    const nm = name.slice(0, -3);
    const txt = fs.readFileSync(path + name, { encoding: 'utf8' });
    const a = txt.split(/\*{3}\n*/);
    const len0 = a.length;
    if (len0 > 4)
        a.splice(3, len0, a.slice(3).join('***'));
    const prm = (a[1] ?? '').trim();
    const aPrm = (prm === '') ? [] : prm.split('\n').map(line => {
        const o = {};
        line.slice(2).split('\t')
            .forEach((c, i) => o[idx2nmParam[i]] = repTag2MB(c));
        return o;
    });
    hMd[nm] = {
        detail: (a[0] ?? '').trim(),
        param: aPrm,
        snippet: `\t${(a[2] ?? '').trim()}`.split('\n*\n').map(sn => {
            const i = sn.indexOf('\t');
            const a2 = sn.slice(i + 1);
            return { nm: nm + sn.slice(0, i), txt: a2 ? `${nm} ${a2}` : nm };
        }),
        comment: repTag2MB(a[3] ?? '').trim(),
    };
});
fs.writeFileSync('./core/md.json', JSON.stringify(hMd));
//# sourceMappingURL=md2json.js.map