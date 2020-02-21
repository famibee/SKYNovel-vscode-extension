# SKYNovel Extension for VSCode
[![MIT License](https://img.shields.io/github/license/famibee/SKYNovel-vscode-extension.svg)](LICENSE)
![](https://img.shields.io/badge/platform-windows%20%7C%20macos-lightgrey.svg)

[![dependencies](https://david-dm.org/famibee/SKYNovel-vscode-extension/status.svg)](https://david-dm.org/famibee/SKYNovel-vscode-extension)
[![dependencies](https://david-dm.org/famibee/SKYNovel-vscode-extension/dev-status.svg)](https://david-dm.org/famibee/SKYNovel-vscode-extension?type=dev)

![logo.svg](res/icon.png)

[SKYNovel - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=famibee.skynovel)

[CHANGELOG.md](CHANGELOG.md)

---
## After installing this extension ... / この拡張機能をインストールしたら……。
 Next, let's download and unzip the sample project, and open the folder with VSCode!

　次はサンプルプロジェクトをダウンロード・解凍し、VSCodeで【フォルダを開く】してみましょう！
- [Novelgame(Yoko-gaki) sample project「初音館にて」](https://github.com/famibee/SKYNovel_hatsune)
- [Novelgame(Tate-gaki) sample project「桜の樹の下には」](https://github.com/famibee/SKYNovel_uc)
- [simple sample project](https://github.com/famibee/SKYNovel_sample)

---

## Features
- Startup timing:
	- When prj / prj.json exists in "Open folder".
	- When you open the .sn file.
- Add Activity Bar to provide various information and useful functions.
- Syntax Highlight
- Library update check
- The Reference search pallet to open API references
- Automatically Update prj/path.json
- Automatically Create SpriteSheet's json from images
	+ ex) breakline.5x20.png -> breakline.json
	+ It is meaningless and OK. Because it is internal processing.
- Automatically Update core/plugin/plugin.js
	+ It is meaningless and OK. Because it is internal processing.

## 機能
# 起動タイミング
- 「フォルダを開く」で prj/prj.json が存在するとき
- *.snファイルを開いたとき


# Activity Bar / アクティビティバー
- Activity Barを追加し、各種情報や便利機能を提供します。

	![](res/rm_activity_bar.jpg)

- ライブラリ更新チェック
	- 右下にポップアップ告知
	- Activity Barにも表示、ボタン一つで更新
	- 「ブラウザ版を起動」など、各種機能もボタン一つで

	![](res/rm_updchk0.jpg)

[![Reference search](https://blog-imgs-123.fc2.com/f/a/m/famibee/190204ref_search.gif)](https://www.youtube.com/watch?v=uIkWnAGBkGM "Reference search")

- ファイル増減を監視しして prj/path.json に自動更新
- スプライトシート用json自動生成機能
	+ ex) breakline.5x20.png というファイル名の画像から breakline.json を作成
	+ 意味不明でOK、内部的な処理なので

[![Reference search](https://blog-imgs-123.fc2.com/f/a/m/famibee/190204automatically.gif)](https://www.youtube.com/watch?v=tfrkImoufU4 "Reference search")

　スプライトシートは、生成された json を指定することで画像/動画と同じように使用できます。
![auto_json.png](res/rm_auto_json.png)


- プラグインフォルダ増減でビルドフレームワークに反映する機能
	+ 意味不明でOK、内部的な処理なので

# Syntax Highlight / シンタックスハイライト
- シンタックスハイライト（.sn スクリプトファイルを見やすく色分け）
![](res/rm_syntax_highlight.jpg)

# Reference search palette
You can open API references with your browser by following the steps
1. Push Ctrl+Shift+P to open the Command Pallet.
3. Execute the command "SKYNovel: Open reference search palette".
3. Input tag name to open the reference.

# リファレンス検索パレット
　次の手順でAPIリファレンスを開けます。
1. Ctrl+Shift+Pを押してコマンドパレットを開きます。

![](res/rm_ref_search0.jpg)

2. SKYNovel: Open reference search palette」というコマンドを実行します。

![](res/rm_ref_search1.jpg)

3. リファレンスを開きたいタグ名を入力し、EnterでWebのマニュアルを開きます。

![](res/rm_ref_search2.jpg)

---
## License ... [MIT](LICENSE)

---
## Famibee is ?
- [WebSite : 電子演劇部](https://famibee.blog.fc2.com/)
- [Github](https://github.com/famibee/SKYNovel)
- [npm](https://www.npmjs.com/package/skynovel)
- Twitter ([famibee](https://twitter.com/famibee))
