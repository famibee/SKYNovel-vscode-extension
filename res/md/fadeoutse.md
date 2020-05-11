効果音のフェードアウト  
効果音を無音に、段階的に変化させる

***
- buf		SE	サウンドバッファ	効果音を識別するサウンドバッファ。サウンドバッファを変えれば同時に複数の音を操作することが出来ます
- time	y		ミリ秒	フェード時間
- stop		true	Boolean	trueで「フェード終了時の再生停止」、falseなら行なわない
- delay		0	ミリ秒	変化する前に待機する遅延時

***
buf=${1{{サウンドバッファ}}} time=${2:1000}

***
機能ギャラリーにサンプルがあります。$(play)[効果音とBGM](https://famibee.github.io/SKYNovel_gallery/?cur=sound)
