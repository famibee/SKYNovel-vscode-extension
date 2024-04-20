トランス終了待ち  
[trans]で開始したトランスの終了を待つ

***
- canskip``true`true、false`trueでクリックキャンセル可能にする
- global``true`true、false`グローバルイベント待ちを有効にするか

***
canskip=${1|true,false|}

***
終了次第、スクリプト処理を次へ進める。

$(warning)また[trans]～[wt]間で文字表示や[ch]は動作未定義、非推奨。
[trans]終了を待たず何かをするのは避けた方がよいでしょう。
