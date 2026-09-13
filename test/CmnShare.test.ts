/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2026-2026 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {isUnderPath, longestUnderPath, normFp, type FULL_PATH} from '../src/CmnShare';

import {expect, it} from 'bun:test';

const fp = (s: string)=> normFp(s);


//MARK: isUnderPath

it('isUnderPath は配下のファイルを true とする', ()=> {
	expect(isUnderPath(fp('/work/doc/prj/script/main.sn'), fp('/work'))).toBe(true);
});

it('isUnderPath は dir 自身（末尾一致）を true とする', ()=> {
	expect(isUnderPath(fp('/work'), fp('/work'))).toBe(true);
});

it('isUnderPath は区切りを見ずに前方一致するだけの別フォルダを false とする（src/docs/multiroot.md 不具合6）', ()=> {
	// '/work2' は '/work' の前方一致だが配下ではない
	expect(isUnderPath(fp('/work2/doc/prj/script/main.sn'), fp('/work'))).toBe(false);
});

it('isUnderPath は無関係なパスを false とする', ()=> {
	expect(isUnderPath(fp('/other/doc/prj/script/main.sn'), fp('/work'))).toBe(false);
});

it('isUnderPath は dir 末尾に "/" があってもなくても同じ結果になる', ()=> {
	expect(isUnderPath(fp('/work/doc'), fp('/work/'))).toBe(true);
	expect(isUnderPath(fp('/work/doc'), fp('/work'))).toBe(true);
});


//MARK: longestUnderPath

it('longestUnderPath は入れ子のワークスペースで最長一致を返す（src/docs/multiroot.md 不具合6）', ()=> {
	// 「/work」と「/work/sub」の両方を開いている状態を再現。
	// 外側（/work）が先に登録されていても、内側（/work/sub）配下のファイルは
	// 内側の結果を返すべき（find() の早い者勝ちだと外側が誤って選ばれていた）
	const entries: [FULL_PATH, string][] = [
		[fp('/work'), '外側'],
		[fp('/work/sub'), '内側'],
	];
	const got = longestUnderPath(fp('/work/sub/doc/prj/script/main.sn'), entries);
	expect(got).toBe('内側');
});

it('longestUnderPath は登録順を逆にしても同じ結果になる', ()=> {
	const entries: [FULL_PATH, string][] = [
		[fp('/work/sub'), '内側'],
		[fp('/work'), '外側'],
	];
	const got = longestUnderPath(fp('/work/sub/doc/prj/script/main.sn'), entries);
	expect(got).toBe('内側');
});

it('longestUnderPath は外側配下・内側配下でないファイルには外側を返す', ()=> {
	const entries: [FULL_PATH, string][] = [
		[fp('/work'), '外側'],
		[fp('/work/sub'), '内側'],
	];
	const got = longestUnderPath(fp('/work/doc/prj/script/main.sn'), entries);
	expect(got).toBe('外側');
});

it('longestUnderPath はどの候補の配下でもなければ undefined を返す', ()=> {
	const entries: [FULL_PATH, string][] = [
		[fp('/work'), '外側'],
	];
	const got = longestUnderPath(fp('/other/doc/prj/script/main.sn'), entries);
	expect(got).toBeUndefined();
});
