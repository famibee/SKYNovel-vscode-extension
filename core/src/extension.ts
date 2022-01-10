/* ***** BEGIN LICENSE BLOCK *****
	Copyright (c) 2019-2022 Famibee (famibee.blog38.fc2.com)

	This software is released under the MIT License.
	http://opensource.org/licenses/mit-license.php
** ***** END LICENSE BLOCK ***** */

import {ActivityBar} from './ActivityBar';

import {ExtensionContext} from 'vscode';

// ロード時に一度だけ呼ばれる
export function activate(ctx: ExtensionContext) {ActivityBar.start(ctx);}

// 拡張機能が非アクティブ化されたときに、実行
export function deactivate() {ActivityBar.stop();}
