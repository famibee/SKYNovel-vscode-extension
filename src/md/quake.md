画面を揺らす  
画面全体を揺らす

***
- time	y		ミリ秒数	揺らす時間
- hmax		10	Integer	横方向の最大揺らし幅。幅はランダム値を取る
- vmax		10	Integer	縦方向の最大揺らし幅。幅はランダム値を取る
- delay		0	ミリ秒数	トゥイーンを始める前の、何もしない待ち時間- 
- repeat		1	0〜	繰返し回数。0か負の値 で無限ループ。1を設定すると「繰り返しなし」、2を設定すると「二回同じ動き」を行なう。
- ease		Linear.None	イージング名	揺れのイージング（値の変化の仕方）を指定する。[イージングの変化はこちらの図](https://createjs.com/demos/tweenjs/tween_sparktable)（または[こちら](https://sole.github.io/tween.js/examples/03_graphs.html)）が分かりやすい。指定できる値は[tsy]を参照
- yoyo		false	Boolean	（暫定）ヨーヨーのように逆方向に戻って繰り返す

***
time=${1:500} hmax=${2:10} vmax=${3:10}][wq

***
機能ギャラリーにサンプルがあります。$(play)[文字出現演出](https://famibee.github.io/SKYNovel_gallery/?cur=tag_quake)
