更新チェック機能  
ネットにアプリの更新を確認し、ダウンロードもサポートする

***
- url	y		URL文字列	latest(-mac).ymlや、dmg(exe)を置いたWebサーバーのフォルダURLを指定する。終端は「/」をつけること

***
url=${1:WebページURL}

***
アプリの最新バージョンをネットで確認する。（アプリ版でのみ動作）
処理は非同期に行われ、更新があった時のみ更新確認ウインドウが表示される。
ダウンロードフォルダにアプリパッケージの dmg（インストーラー exe）をダウンロードする