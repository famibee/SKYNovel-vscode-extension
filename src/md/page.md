ページ移動  
ページ遷移状態に入り、[p]停止位置を一つ移動する

***
- clear`いずれかを指定`なにもしない`true、false`trueでページ状態記録をクリアする
- to`いずれかを指定`なにもしない`prev、next、exit、load`prev：ひとつ前のページに戻る<br/>next：ひとつ次のページに進める<br/>exit：ページ遷移状態から抜ける<br/>load：ページ遷移状態で表示中ページからロードする
- style`いずれかを指定`なにもしない`CSS style`ページ移動中の既読文字に適用する CSS スタイル。初期値は貴文字と黒縁取りCSS

***
to=${1|prev,next,exit,load|}

***
[p]などの停止位置を「ページ」とみなし、戻ったり進んだりできる。
ページを進めても一度読んだ位置を再現できる。
save:sn.doRecLog が true の状態で[p][s]など。（[l][waitclick][wait][wv][wait_tsy][wf][ws]は対象外）で停止した際にそのページ状態の記録を行う。
