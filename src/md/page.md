ページ移動  
[p]停止位置を一つ移動する

***
- clear	どちらかを指定	なにもしない	Boolean	trueでページ状態記録をクリアする
- to	どちらかを指定	なにもしない	prev または next<br/>prev：ひとつ前のページに戻る<br/>next：ひとつ次のページに進める

***
to=${1|prev,next|}

***
[p]などの停止位置を「ページ」とみなし、戻ったり進んだりできる。
ページを進めても一度読んだ位置を再現できる。
save:sn.doRecLog が true の状態で[p][s]など。（[l][waitclick][wait][wv][wait_tsy][wf][ws]は対象外）で停止した際にそのページ状態の記録を行う。
