効果音再生の終了待ち  
効果音再生の終了を待つ  
loop=trueなら待たない。 利用時は【音声再生[playse]がjoin=true(ちなみにデフォルト)であること】を必須条件とします

***
- buf		SE	サウンドバッファ	効果音を識別するサウンドバッファ。サウンドバッファを変えれば同時に複数の音を操作することが出来ます
- canskip		false	Boolean	trueでクリックキャンセル可能にする
- global		true	Boolean	グローバルイベント待ちを有効にするか
- stop		true	Boolean	trueで「クリックキャンセル時の再生停止」、falseなら行なわない。

***
buf=${1{{サウンドバッファ}}}

***
機能ギャラリーにサンプルがあります。$(play)[効果音とBGM](https://famibee.github.io/SKYNovel_gallery/?cur=sound)
