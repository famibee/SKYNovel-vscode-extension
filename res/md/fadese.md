効果音のフェード  
効果音を指定した音量に、段階的に変化させる

***
- buf		SE	サウンドバッファ	効果音を識別するサウンドバッファ。サウンドバッファを変えれば同時に複数の音を操作することが出来ます
- volume	y		0.0〜1.0（実数）	音量
- time	y		ミリ秒	フェード時間
- delay		0	ミリ秒	変化する前に待機する遅延時

***
buf=${1{{サウンドバッファ}}} volume=${2:0.0} time=${3:1000}

***
機能ギャラリーにサンプルがあります。$(play)[効果音とBGM](https://famibee.github.io/SKYNovel_gallery/?cur=sound)