効果音再生の終了待ち  
効果音再生の終了を待つ  
loop=trueなら待たない。 利用時は【音声再生[playse]がjoin=true(ちなみにデフォルト)であること】を必須条件とします

***
- buf``SE`サウンドバッファ名`効果音を識別する名前。サウンドバッファ名を変えれば同時に複数の音を操作することが出来ます
- canskip``false`true、false`trueでクリックキャンセル可能にする
- global``true`true、false`グローバルイベント待ちを有効にするか
- stop``true`true、false`trueで「クリックキャンセル時の再生停止」、falseなら行なわない。

***
buf=${1{{サウンドバッファ}}}

***
機能ギャラリーにサンプルがあります。$(play)[効果音とBGM](https://famibee.github.io/SKYNovel_gallery/?cur=sound)
