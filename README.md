# SKYNovel Extension for VSCode
[![MIT License](https://img.shields.io/github/license/famibee/SKYNovel-vscode-extension.svg)](LICENSE)
![](https://img.shields.io/badge/platform-windows%20%7C%20macos-lightgrey.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/famibee/SKYNovel-vscode-extension?color=brightgreen)
![GitHub last commit](https://img.shields.io/github/last-commit/famibee/SKYNovel-vscode-extension)

[![dependencies](https://david-dm.org/famibee/SKYNovel-vscode-extension/status.svg)](https://david-dm.org/famibee/SKYNovel-vscode-extension)
[![dependencies](https://david-dm.org/famibee/SKYNovel-vscode-extension/dev-status.svg)](https://david-dm.org/famibee/SKYNovel-vscode-extension?type=dev)

![logo.svg](res/img/icon_skynovel.png)

[SKYNovel - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=famibee.skynovel)

[CHANGELOG.md](CHANGELOG.md)

---
## After installing this extension ... / この拡張機能をインストールしたら……。
 Next, let's download and unzip the sample project, and open the folder with VSCode!

　次はサンプルプロジェクトをダウンロード・解凍し、VSCodeで【フォルダを開く】してみましょう！
- [Novelgame(Yoko-gaki) sample project「初音館にて」](https://github.com/famibee/SKYNovel_hatsune)
- [Novelgame(Tate-gaki) sample project「桜の樹の下には」](https://github.com/famibee/SKYNovel_uc)
- [simple sample project](https://github.com/famibee/SKYNovel_sample)

# List of Functions / 機能一覧
- [Startup timing / 起動タイミング](#Startup-timing--起動タイミング)
- [shortcut key / ショートカットキー](#shortcut-key--ショートカットキー)
- [Syntax Highlight / シンタックスハイライト](#Syntax-Highlight--シンタックスハイライト)
- [Diagnostic function](#Diagnostic-function) / [診断機能](#診断機能)
- [Coding assistance](#Coding-assistance) / [コーディング補助](#コーディング補助)
- [Automatic icon creation](#Automatic-icon-creation) / [アイコン自動作成](#アイコン自動作成)
- [Outline view and symbol search](#Outline-view-and-symbol-search) / [アウトライン表示とシンボル検索](#アウトライン表示とシンボル検索)
- [Activity Bar / アクティビティバー](#Activity-Bar--アクティビティバー)
- [Debugger](#Debugger) / [デバッガー](#デバッガー)
- [Reference search palette / リファレンス検索パレット](#Reference-search-palette--リファレンス検索パレット)


---
## Startup timing / 起動タイミング
- When you open a file under the doc/prj folder of a template.
	- テンプレートのdoc/prjフォルダ下のファイルを開いたとき
- During debugging (e.g., by pressing F5 key)
	- デバッグ機能実行時（F5キー押下など）
- When using the debugging function.
	- デバッグ機能使用時


---
## shortcut key / ショートカットキー
- normal condition / 通常状態

	| Key	| Func	| 機能	|
	| - | - | - |
	| F2	| rename the macro	| マクロ名変更	|
	| F5	| Activate debug function	| デバッグ機能起動	|
	| F9	| Switching Breakpoints	| ブレークポイントの切り替え	|
	| F12	| 定義へ移動、定義をここに表示	| Go to definitions, and view definitions here	|

- Debugger running / デバッガー実行中

	| Key	| Func	| 機能	|
	| - | - | - |
	| F5	| Continue	| 続行	|
	| F6	| Pause	| 一時停止 |
	| F10	| Step over	| ステップオーバー |
	| F11	| Step-in	| ステップイン |
	| Shift + F11	| Step out	| ステップアウト |
	| Shift + Ctrl + F5	| restart button	| 再起動ボタン |
	| Shift + F5	| stop	| 停止 |


---
## Syntax Highlight / シンタックスハイライト
- Easy color coding of .sn script files.
	- .sn スクリプトファイルを見やすく色分け

![](res/img/syntax_highlight.png)


---
## Diagnostic function
![](res/img/diag0.png)

- Displays an error when there are files with the same file name in different folders.
- Error message on macro definition with predefined tag and same name.
- Error display for duplicate label names in the same script.
- Error display for macro definition duplication in multiple files.
- Warning when using undefined macros.

	![](res/img/diagnostic0.png)
- Report unused macro definitions.

	![](res/img/unused_macro0.png)
	![](res/img/unused_macro1.png)
	- After the macro is defined, the macro will not be reported even if it is not used, if [;#NO_WARM_UNUSED_MACRO (macro name)] is specified.
- Warning if line break tag exceeds 10 lines. (There's a lot of risk of forgetting to close the tag.)

## 診断機能
- 別々のフォルダに同じファイル名のファイルが存在する場合にエラー表示
- 定義済みのタグと同名マクロ定義にエラー表示
- 同一スクリプト内でのラベル名重複にエラー表示
- 複数ファイルでのマクロ定義重複にエラー表示
- 未定義マクロを使用時に警告

	![](res/img/diagnostic0.png)
- 未使用のマクロ定義を報告

	![](res/img/unused_macro0.png)
	![](res/img/unused_macro1.png)
	- マクロ定義後に【;#NO_WARM_UNUSED_MACRO （マクロ名）】という記述をすると、そのマクロは未使用でも報告しなくなります。
- 改行タグが10行を超えたら警告（タグ閉じ忘れの恐れが多いので）

---
## Coding assistance
- Hover information (Tag, Macro)
	![](res/img/hover_tag.png)
	![](res/img/hover_macro.png)
- Auto completion
	- Tag name (Start by typing "[".)
	![](res/img/auto_comp_tag.png)
		- Some tags also show usage examples.
		![](res/img/auto_comp_tag_detail0.png)
		![](res/img/auto_comp_tag_detail1.png)
	- Attribute (With attribute description)
		- Enter " " in [] to start the program.
		![](res/img/auto_comp_attr.png)
	- Attribute value (With attribute description)
		- Type "=" immediately after the attribute name in [] to start.
		![](res/img/auto_comp_val.png)
- Snippet completion
- Jump to definition / Show definition here (Tag, Macro, Plugin definition tag)
	- (Use F12 key to go back and forth between macro definition and macro usage)
	![](res/img/rmenu_peek.png)
	![](res/img/rmenu_def.png)
- Jump to reference / Show reference here (Tag, Macro, Plugin definition tag)
	![](res/img/rmenu_ref.png)
- Rename symbol (Macro name, Plugin definition tag)
	- (also activated by the F2 key)
	![](res/img/rename_plugin_tag.png)

## コーディング補助
- ホバーで情報表示（タグ、マクロ）
	![](res/img/hover_tag.png)
	![](res/img/hover_macro.png)
- コード補完
	- タグ名（「[」入力で起動）
	![](res/img/auto_comp_tag.png)
		- 一部のタグには使用例なども示しています
		![](res/img/auto_comp_tag_detail0.png)
		![](res/img/auto_comp_tag_detail1.png)
	- 属性名（属性の説明つき）
		- []内で「 」（半角スペース）入力すると起動
		![](res/img/auto_comp_attr.png)
	- 属性値名（属性の説明つき）
		- []内で属性名直後に「=」入力すると起動
		![](res/img/auto_comp_val.png)
- タグ入力時にスニペット挿入
- 「定義へ移動」「定義をここに表示」
	- （F12キーでマクロ定義とマクロ使用箇所を行ったり来たりできます）
	![](res/img/rmenu_peek.png)
	![](res/img/rmenu_def.png)
- 「参照へ移動」「参照をここに表示」
	![](res/img/rmenu_ref.png)
- 「シンボルの名前変更」
	- （F2キーでも起動）
	![](res/img/rename_plugin_tag.png)


---
## Automatic icon creation / アイコン自動作成
- Just prepare "build/icon.png" and it will automatically generate ".ico" file for Windows and ".icns" file for macOS.
	- 「build/icon.png」を準備するだけで、Windows 用の「.ico」ファイル、macOS 用の「.icns」ファイルを自動生成します。
![](res/img/gene_icon.png)


---
## Outline view and symbol search
### outline display
[View] - [Open View...] to display a list of symbols contained in the currently displayed file.
　Symbols are "labels, macro definitions, text, and partial tags (those involved in conditional branching and processing flow changes).
- [jump]
- [call]
- [event]
- [button]
- [link]
- [s]
- [if]
- [elsif]
- [else]

 Select a symbol from the list and press the Enter key to go to that symbol.

 For example, the template would look something like this

- main .sn is prefixed by [event] system and [button] in the title.

![](res/img/docsbl_0main.png)

- sub .sn has a lot of macro definitions

![](res/img/docsbl_1sub.png)

- The text is text-centric

![](res/img/docsbl_2ss000.png)

- Although it is not included in the template, even if [if]-type tags and text are complexly intertwined

![](res/img/docsbl_3ifs.png)

### Symbol Search
 Press the following keys to see a list of symbols in the file you are viewing.

|mac	|windows	|
--|--
|command + shift + o	|Ctrl + Shift + o	|
|Or command + p followed by @	|Or Ctrl + p followed by @	|

 If you continue typing ":", it will be sorted by category, such as label or macro definition.
 You can also select a symbol and press Enter to go to that symbol.

![](res/img/docsbl_4search.png)


## アウトライン表示とシンボル検索
### アウトライン表示
【表示】-【ビューを開く...】から【アウトライン】を選ぶと、表示中のファイルに含まれるシンボル一覧が表示されます。
　シンボルとは「ラベル、マクロ定義、テキスト、一部タグ（条件分岐と処理の流れ変更に関わるもの）」のことです。
- [jump]
- [call]
- [event]
- [button]
- [link]
- [s]
- [if]
- [elsif]
- [else]

　一覧からシンボルを選択し、Enterキーを押すとそのシンボルに移動します。

　例えばテンプレートでは以下のような表示になります。

- main .sn は最初の方に[event]系、タイトルの[button]がならぶ

![](res/img/docsbl_0main.png)

- sub .sn はマクロ定義がずらり

![](res/img/docsbl_1sub.png)

- 本文だとテキスト中心

![](res/img/docsbl_2ss000.png)

- テンプレートには含まれませんが、[if]系タグとテキストが複雑に絡み合っていてもこのとおり

![](res/img/docsbl_3ifs.png)

### シンボル検索サポート
　以下のキーを押すと、表示しているファイル内のシンボルの一覧が表示されます。

|mac	|windows	|
--|--
|command + shift + o	|Ctrl + Shift + o	|
|もしくは command + p のち @	|もしくは Ctrl + p のち @	|

　続けて「:」をタイプすると、ラベルやマクロ定義等のカテゴリごとにソートされます。
　こちらもシンボルを選択し、Enterキーを押すとそのシンボルに移動します。

![](res/img/docsbl_4search.png)


---
## Activity Bar / アクティビティバー
- Add Activity Bar to provide various information and useful functions.
	- Activity Barを追加し、各種情報や便利機能を提供します。

	![](res/img/activity_bar.png)

---
- Library update check
	- Pop-up announcement at the bottom right (if there is an update).
	- Display in Activity Bar, update with one button.
	- Various functions such as "Launch browser version" can be performed with a single button.
- ライブラリ更新チェック
	- （更新があれば）右下にポップアップ告知
	- Activity Barにも表示、ボタン一つで更新
	- 「ブラウザ版を起動」など、各種機能もボタン一つで

![](res/img/updchk0.jpg)


---
## Debugger
- You can debug like a high-level programming language with VSCode, including step-in breakpoints.
	- (If you've never used a debugger in VSCode, the following documentation may be a bit helpful)
		[Debugging in Visual Studio Code](https://code.visualstudio.com/docs/editor/debugging#_debug-actions)
	- Currently, only unpackaged and debug-launched apps can be debugged.


- [Debugger Function Overview](#Debugger-Function-Overview)
	- [Automatically launch and connect the app and browser versions](#Automatically-launch-and-connect-the-app-and-browser-versions)
	- [About the Debug Button Bar](#About-the-Debug-Button-Bar)
	- [breakpoint stop](#breakpoint-stop)
		- [(A) line breakpoint](#(A)-line-breakpoint)
		- [(B) conditional breakpoint](#(B)-conditional-breakpoint)
		- [(C) hit-count breakpoint](#hit-(C)-count-breakpoint)
		- [(D) data breakpoint](#(D)-data-breakpoint)
		- [(E) function breakpoint](#(E)-function-breakpoint)
	- [Variable View](#Variable-View)
	- [Watching View](#Watching-View)
	- [call stack view](#call-stack-view)
	- [Debugging Console REPL](#Debugging-Console-REPL)
- [Hovering over a variable while stopped displays the value](#Hovering-over-a-variable-while-stopped-displays-the-value)
- [The ability to move back the breakpoint on a blank or comment-only line at the start of a debug](#The-ability-to-move-back-the-breakpoint-on-a-blank-or-comment-only-line-at-the-start-of-a-debug)


---
## デバッガー
- ステップイン・ブレークポイントなど、VSCode で高級プログラム言語のようなデバッグが可能です。
	- （VSCode でのデバッガーを使用したことがない方は、以下のドキュメントが少し参考になるかも）
		[Visual Studio Codeでデバッグする](https://webdesign.vdlz.xyz/Editor/VSCode/Doc/Editor/Doc005_Debugging.html)（内容はやや古いが邦訳）
	- 現在デバッグできるのは、非パッケージ化・デバッグ起動アプリのみです。

- [デバッガー機能概要](#デバッガー機能概要)
	- [アプリ・ブラウザ版の起動と接続を自動で](#アプリ・ブラウザ版の起動と接続を自動で)
	- [デバッグボタンバーについて](#デバッグボタンバーについて)
	- [ブレークポイント停止](#ブレークポイント停止)（通ったら、タグや&変数操作処理前にブレーク）
		- [(A) 行ブレークポイント](#(A)-行ブレークポイント)
		- [(B) 条件式ブレークポイント](#(B)-条件式ブレークポイント)（条件式が真なら、（略）処理前にブレーク）
		- [(C) ヒットカウントブレークポイント](#(C)-ヒットカウントブレークポイント)（ｎ回以上通ったら、（略）処理前にブレーク）
		- [(D) データブレークポイント](#(D)-データブレークポイント)（変数値が変化したときにブレーク）
		- [(E) 関数ブレークポイント](#(E)-関数ブレークポイント)（指定したタグやマクロが呼ばれる直前にブレーク）
	- [変数ビュー](#変数ビュー)（スクリプト実行位置の変数値を表示）
	- [ウォッチ式ビュー](#ウォッチ式ビュー)
	- [コールスタックビュー](#コールスタックビュー)
	- [デバッグコンソールREPL](#デバッグコンソールREPL)（Read-Eval-Print Loop）、ブレーク時に式を手入力して値を調べられる
- [停止中、変数にホバーすると値を表示](#停止中、変数にホバーすると値を表示)
- [デバッグ開始時、空白やコメントのみの行に指定されたブレークポイントを後ろにずらす機能](#デバッグ開始時、空白やコメントのみの行に指定されたブレークポイントを後ろにずらす機能)


---
## Debugger Function Overview

### Automatically launch and connect the app and browser versions

1. Click the pause symbol (vertical bar in a triangle) that appears when you place the mouse cursor over [Launch: App Version].

	![](res/img/dbg_actber_run1a.png)

	(If you are using the browser version, click the pause symbol on the [Launch: Browser Version].

	![](res/img/dbg_actber_run1b.png)

2. the application version starts and stops at the beginning of the script (main.sn, the first digit of the first line).

	A band cursor, pentagon stop mark, and debug button bar appear on the stop line.
The call stack view will also show [main.sn 1:1]

	![](res/img/dbg_actber_run2.png)

### About the Debug Button Bar
	You can run through the tags and & assignment grammars one step at a time, or you can skip to a break point (see below).
	You can even skip to the breakpoint (see below).

![](res/img/dbg_actber_run3.png)

	1. Continue (F5 key)/Pause (F6 key)
		Continue ... Skip to breakpoint (waiting for events such as ka[l][p][s])
		Pause ... Pause (usually when waiting for an event)
	2. Step over (F10 key)
		If you're a macro, don't go inside, skip to the outside.
	3. Step-in (F11 key)
		If it's a macro, go inside. Otherwise, step over.
	4. Step out (Shift + F11)
		Skip from inside the macro until you get out. Otherwise, step over.
	5. restart button (Shift + Ctrl + F5 keys)
		Resume from the beginning of the game engine.
	6. stop (Shift + F5 key)
		Stop the debugger and the app, or quit debugging (stop each of the two)

### breakpoint stop
	Stops the break before processing tag and & variable operations. There are five types as follows.

### (A) line breakpoint
	If you click on the left side of the line number, the mark with a red circle will appear.
	The execution process of SKYNovel stops when it passes through there.

	It also appears in the breakpoint view.
	Breakpoints can be deleted, but you can also uncheck the checkbox to temporarily disable the breakpoint.

![](res/img/dbg_bp0.png)

### (B) conditional breakpoint
	If the conditional expression is true, then (abbreviated) break before processing

1. right-click on the breakpoint and select

	![](res/img/dbg_bp1.png)

2. Selecting 【Expressions】 from 【Editing】 allows you to enter a conditional expression.

	When passing through, it only breaks if the conditional expression is true.

	![](res/img/dbg_bp2.png)

### (C) hit-count breakpoint
	If it passes more than n times, it breaks before processing.

1. if you select [Hit Count] from [Edit]

	![](res/img/dbg_bp10.png)

2. You can enter the hit count of "How many times do you want to break here?".

	![](res/img/dbg_bp11.png)

### (D) data breakpoint
	Break when the value of the variable is changed

	When you right-click on a variable in the Variable View and click on "Suspend when the value is changed," you can change the value of the variable by clicking on "Stop". Change Breakpoints] is added.
	(In the case of tmp variable, it is not displayed in the variable view because the variable does not exist unless something is assigned. (e.g. "I'll be back")

![](res/img/dbg_bp_valchg0.png)

### (E) function breakpoint
	Break just before the specified tag or macro is called

1. If you press the "+" button in the breakpoint view and enter a tag or macro name, you will be able to see the following information

	![](res/img/dbg_bp_fnc0.png)

2. Break at all points just before it is called.

	![](res/img/dbg_bp_fnc1.png)

### Variable View
	Display variable values of the script execution position

1. You can check the contents of the variable.

	![](res/img/dbg_varview0.png)

2. It is possible to change the value of a variable by inputting it manually while the program is stopped.
	- However, a variable name that begins with "const.〜" cannot be changed.
	- In addition, some variables whose variable names begin with "sn.˜" can be changed by SKYNovel. If you change it, it will be fixed at the input value.

		![](res/img/dbg_varview1.png)
		![](res/img/dbg_varview2.png)

### Watching View
	If you register a variable or an expression, it will be displayed.
	If you register a variable or expression that you want to see how it changes, it will be highlighted whenever it changes.
	You can also register variables that do not (yet) exist. It will be displayed as 【null】.

![](res/img/dbg_watch0.png)

### call stack view
	Displays the break, step, etc. stop position.
	If it is in a macro, it shows the call hierarchy.

![](res/img/dbg_callstackview0.png)

### Debugging Console REPL
	Read-Eval-Print Loop, which allows you to look up the value by manually entering an expression on a break.

![](res/img/dbg_repl0.png)

## Hovering over a variable while stopped displays the value
	Normal hovering in tag and macro definition display is temporarily disabled

![](res/img/dbg_hovervar0.png)

## The ability to move back the breakpoint on a blank or comment-only line at the start of a debug

![](res/img/dbg_bp_move0.png)



## デバッガー機能概要
### アプリ・ブラウザ版の起動と接続を自動で

1. 【起動：アプリ版】にマウスカーソルをのせると出てくる、一時停止マーク（三角に縦棒）をクリック

	![](res/img/dbg_actber_run1a.png)

	（ブラウザ版なら【起動：ブラウザ版】の一時停止マークをクリック）

	![](res/img/dbg_actber_run1b.png)

2. アプリ版が起動し、スクリプト冒頭（main.sn、1行目の1桁目）で停止します。

	停止行に帯カーソルと五角形の停止マーク、デバッグボタンバーが現われ、
	コールスタックビューにも【main.sn 1:1】と表示されます。

	![](res/img/dbg_actber_run2.png)

### デバッグボタンバーについて
	タグや&代入文法を１ステップとして、一つずつ実行したり出来ます。
	ブレークポイント（後述）までスキップすることもできます。

![](res/img/dbg_actber_run3.png)

	1. 続行（F5 キー） / 一時停止（F6 キー）
		続行 ... ブレークポイント（か[l][p][s]などイベント待ち）までスキップ
		一時停止 ... 一時停止する（ふつうイベント待ちで押せるようになる）
	2. ステップオーバー（F10 キー）
		マクロなら中へ入らず、外に出たところまでスキップ
	3. ステップイン（F11 キー）
		マクロなら中へ入る。それ以外はステップオーバー
	4. ステップアウト（Shift + F11 キー）
		マクロ内から外に出るまで飛ばす。それ以外はステップオーバー
	5. 再起動ボタン（Shift + Ctrl + F5 キー）
		ゲームエンジン冒頭から再開する
	6. 停止（Shift + F5 キー）
		デバッガーやアプリを停止、デバッグ終了（２つそれぞれを停止して下さい）

### ブレークポイント停止
	タグや&変数操作処理前にブレーク停止する機能。次の五種類があります。

### (A) 行ブレークポイント
	行番号の左をクリックすると赤丸マークの目印が付きます。
	SKYNovelの実行処理がそこを通ると停止します。

	ブレークポイントビューにも表示されます。
	ブレークポイントは削除もできますが、チェックボックスを外すと一時的にブレークしないようにできます。

![](res/img/dbg_bp0.png)

### (B) 条件式ブレークポイント
	条件式が真なら、（略）処理前にブレーク

1. ブレークポイントを右クリックし、

	![](res/img/dbg_bp1.png)

2. 【編集】から【式】を選択すると、条件式を入力できます。

	ここを通る際、条件式が真である場合のみブレークします。

	![](res/img/dbg_bp2.png)

### (C) ヒットカウントブレークポイント
	ｎ回以上通ったら、（略）処理前にブレーク

1. 【編集】から【ヒットカウント】を選択すると、

	![](res/img/dbg_bp10.png)

2. 「ここを何回目に通ったときにブレークするか」のヒットカウント回数を入力できます。

	![](res/img/dbg_bp11.png)

### (D) データブレークポイント
	変数値が変化したときにブレーク

	変数ビューの変数を右クリックし、【値が変更されたときに中断】をクリックすると、【変数値変更ブレークポイント】が追加されます。
	（tmp変数の場合はなにか代入しないと変数が存在しないため、変数ビューに表示されません）

![](res/img/dbg_bp_valchg0.png)

### (E) 関数ブレークポイント
	指定したタグやマクロが呼ばれる直前にブレーク

1. ブレークポイントビューで「＋」ボタンを押し、タグやマクロ名を入力すると、

	![](res/img/dbg_bp_fnc0.png)

2. それが呼び出される直前、すべての箇所でブレークします。

	![](res/img/dbg_bp_fnc1.png)

### 変数ビュー
	スクリプト実行位置の変数値を表示

1. 変数の内容を確認できます。

	![](res/img/dbg_varview0.png)

2. 【値の設定】停止中、手入力で変数値変更が可能です。
	- ただし変数名が「const.〜」で始まる変数は変更不可です。
	- また変数名が「sn.〜」で始まる変数は SKYNovelが変化させるものがあり、それを変更すると入力値で固定されてしまいます。

		![](res/img/dbg_varview1.png)
		![](res/img/dbg_varview2.png)

### ウォッチ式ビュー
	変数や式を登録しておくと、表示されます。
	様子を見たい変数や式を登録しておくと、変化するたびに強調表示されます。
	（まだ）存在しない変数も登録しておけます。（【null】と表示されます）

![](res/img/dbg_watch0.png)

### コールスタックビュー
	ブレークやステップなどの停止位置を表示します。
	マクロ内なら呼び出し階層を表示します。

![](res/img/dbg_callstackview0.png)

### デバッグコンソールREPL
	（Read-Eval-Print Loop）、ブレーク時に式を手入力して値を調べられる

![](res/img/dbg_repl0.png)

### 停止中、変数にホバーすると値を表示
	タグやマクロ定義表示の通常ホバーは一時無効になる

![](res/img/dbg_hovervar0.png)

### デバッグ開始時、空白やコメントのみの行に指定されたブレークポイントを後ろにずらす機能

![](res/img/dbg_bp_move0.png)

---
## Reference search palette / リファレンス検索パレット
	Open the API reference with the following steps
		コマンドパレットからリファレンスを参照できる
	The Reference search pallet to open API references
		次の手順でAPIリファレンスを開けます。

[![Reference search](https://blog-imgs-123.fc2.com/f/a/m/famibee/190204ref_search.gif)](https://www.youtube.com/watch?v=uIkWnAGBkGM "Reference search")

1. press Ctrl+Shift+P to open the command palette.
	1. Ctrl+Shift+Pを押してコマンドパレットを開きます。

![](res/img/ref_search0.jpg)

2. Execute the command "SKYNovel: Open reference search palette".
	2. SKYNovel: Open reference search palette」というコマンドを実行します。

![](res/img/ref_search1.jpg)

3. type the tag name you want to open the reference and press Enter to open the web manual.
	3. リファレンスを開きたいタグ名を入力し、EnterでWebのマニュアルを開きます。

![](res/img/ref_search2.jpg)


---
- Automatically Update prj/path.json
- ファイル増減を監視して prj/path.json に自動更新


---
- Automatically Create SpriteSheet's json from images
	+ ex) breakline.5x20.png -> breakline.json
	+ It is meaningless and OK. Because it is internal processing.
- スプライトシート用json自動生成機能
	+ ex) breakline.5x20.png というファイル名の画像から breakline.json を作成
	+ 意味不明でOK、内部的な処理なので

[![Reference search](https://blog-imgs-123.fc2.com/f/a/m/famibee/190204automatically.gif)](https://www.youtube.com/watch?v=tfrkImoufU4 "Reference search")

　スプライトシートは、生成された json を指定することで画像/動画と同じように使用できます。
![auto_json.png](res/img/auto_json.png)


---
- Automatically Update core/plugin.js
	+ It is meaningless and OK. Because it is internal processing.
- プラグインフォルダ増減でビルドフレームワークに反映する機能
	+ 意味不明でOK、内部的な処理なので


---
## License ... [MIT](LICENSE)
- Font Awesome -- [Font Awesome Free License](https://fontawesome.com/license/free) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja))
- Other libraries -- About [MIT](https://opensource.org/licenses/mit-license.php).

---
## Famibee is ?
- [WebSite : 電子演劇部](https://famibee.blog.fc2.com/)
- [Github](https://github.com/famibee/SKYNovel)
- [npm](https://www.npmjs.com/package/skynovel)
- Twitter ([famibee](https://twitter.com/famibee))
