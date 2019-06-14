/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2018-2019 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

// =============== Global
export function int(o: any): number {return parseInt(String(o), 10)}
export function uint(o: any): number {
	const v = parseInt(String(o), 10);
	return v < 0 ? -v : v;
}
export function trim(s: string): string {return s.replace(/^\s+|\s+$/g,'')}
if (! ('toInt' in String.prototype)) {
	(String.prototype as any)['toInt'] = function () { return int(this); };
}
if (! ('toUint' in String.prototype)) {
	(String.prototype as any)['toUint'] = function () {
		const v = int(this);
		return v < 0 ? -v : v;
	};
}
if (! String.prototype.trim) {
	String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g,''); };
}
