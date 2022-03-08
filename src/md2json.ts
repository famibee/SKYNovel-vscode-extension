/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2020-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// src/md/*.md ファイルをまとめて md.json にするツール
// パフォーマンスというかディスクアクセス改善用

// 属性	必須	省略時	値域・型	コメント
export interface MD_PARAM_DETAILS {
	name		: string;
	required	: string;
	default		: string;
	rangetype	: string;
	comment		: string;
}
const idx2nmParam = ['name', 'required', 'default', 'rangetype', 'comment'];

export interface MD_STRUCT {
	detail	: string,
	param	: MD_PARAM_DETAILS[],
	snippet	: {nm: string, txt: string}[],
	comment	: string,
}
const hMd: {[name: string]: MD_STRUCT} = {};

const REG_TAG2MB = /~~~skynovel\n(.+?)\n~~~|\[([a-z_]+)]/gs;
const repTag2MB = (md: string)=> md
	.replace(REG_TAG2MB, (a, p1, p2)=> p1 ?a :`[[${p2}]](https://famibee.github.io/SKYNovel/tag.html#${p2})`)
	.replace(/<br\/?>/g, '  \n');

import fs = require('fs-extra');

const path = './src/md/';
fs.readdirSync(path, {withFileTypes: true})
.filter((d: any)=> d.isFile())
.forEach(({name}: any)=> {
	const nm = name.slice(0, -3);
	const txt = fs.readFileSync(path + name, {encoding: 'utf8'});
	const a = txt.split(/\*{3}\n*/);
	const len0 = a.length;
	if (len0 > 4) a.splice(3, len0, a.slice(3).join('***'));
	const prm = (a[1] ?? '').trim();
	const aPrm = (prm === '') ?[] :prm.split('\n').map(line=> {
		const o: any = {};
		line.slice(2).split('\t')
		.forEach((c, i)=> o[idx2nmParam[i]] = repTag2MB(c));
		return o;
	});
	hMd[nm] = {
		detail	: (a[0] ?? '').trim(),
		param	: aPrm,
		snippet	: `\t${(a[2] ?? '').trim()}`.split('\n*\n').map(sn=> {
			const i = sn.indexOf('\t');
			const a2 = sn.slice(i +1);
			return {nm: nm + sn.slice(0, i), txt: a2 ?`${nm} ${a2}` :nm};
		}),
		comment	: repTag2MB(a[3] ?? '').trim(),
	};
});

fs.writeFileSync('./src/md.json', JSON.stringify(hMd));

	/* === OK、美しい or 役立つ
- 列挙
~~取り消し文字列~~
$(info)	$(warning)	$(symbol-event) $(globe)	https://microsoft.github.io/vscode-codicons/dist/codicon.html

> 引用文章
> > 引用文章

	=== OK、だが目立たない
これは *イタリック* です
これは **ボールド** です
これは ***イタリック＆ボールド*** です

| TH1 | TH2 |
--|--
| TD1 | TD3 |
| TD2 | TD4 |

*/
