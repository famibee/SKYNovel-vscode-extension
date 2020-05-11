BGMのフェードアウト  
BGMを無音に、段階的に変化させる

***
- time	y		ミリ秒	フェード時間
- stop		true	Boolean	trueで「フェード終了時の再生停止」、falseなら行なわない
- delay		0	ミリ秒	変化する前に待機する遅延時

***
time=${1:1000}
