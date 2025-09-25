/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2020-2025 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// src/md/*.md ファイルをまとめて md.json にするツール
// パフォーマンスというかディスクアクセス改善用

// 属性	必須	省略時	値域・型	コメント
export interface MD_PARAM_DETAILS {
	name		: string;
	required	: string;
	def			: string;
	rangetype	: string;
	comment		: string;
}
const idx2nmParam = ['name', 'required', 'def', 'rangetype', 'comment'];

export interface MD_STRUCT {
	sum		: string,
	param	: MD_PARAM_DETAILS[],
	snippet	: {nm: string, txt: string}[],
	detail	: string,
}
const hMd: {[name: string]: MD_STRUCT} = {};

const REG_TAG2MB = /~~~skynovel\n(.+?)\n~~~|\[([a-z_]+)]/gs;
const repTag2MB = (md: string)=> md
	.replace(REG_TAG2MB, (a, p1, p2)=> p1 ?a :`[[${p2}]](https://famibee.github.io/SKYNovel/tag.html#${p2})`)
	.replaceAll(/<br\/?>/g, '  \n');

import {copy, readdirSync, readFileSync, writeFileSync} from 'fs-extra';

const path = './src/md/';
for (const {name} of readdirSync(path, {withFileTypes: true})
.filter(d=> d.isFile())) {
	const nm = name.slice(0, -3);	// .md 削除
	const txt = readFileSync(path + name, {encoding: 'utf8'});

	const [t0='', t1='', t2='', ...t9] = txt.split(/\*{3}\n*/);	// *** で分割
	const prm = t1.trim();
	const aPrm = (prm === '') ?[] :prm.split('\n').map(line=> {
		const o: any = {};
		line.slice(2).split('`')	//「- 」以降からバッククオート「`」区切り
		.forEach((c, i)=> o[idx2nmParam[i] ?? ''] = repTag2MB(c));
		return o;
	});
	hMd[nm] = {
		sum		: t0.trim(),
		param	: aPrm,
		snippet	: `\t${t2.trim()}`.split('\n*\n').map(sn=> {
			const i = sn.indexOf('\t');
			const a2 = sn.slice(i +1);
			return {nm: nm + sn.slice(0, i), txt: a2 ?`${nm} ${a2}` :nm};
		}),
		detail	: repTag2MB(t9.join('***')).trim(),	// 三つめ以降は再度連結
	};
}

writeFileSync('./src/md.json', JSON.stringify(hMd));
copy('./src/md.json', './server/src/md.json');	// 2 LSP
copy('./src/md.json', './dist/md.json');		// 2 LSP

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
