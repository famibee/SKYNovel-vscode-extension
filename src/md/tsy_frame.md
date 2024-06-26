フレームをトゥイーン開始  
フレームのトゥイーンアニメを行なう

***
- id`y``フレーム名`[add_fram]で定義したフレーム名
- time`y``0〜；ミリ秒`トゥイーンにかける時間
- delay``0`0〜；ミリ秒`トゥイーンを始める前の、何もしない待ち時間
- repeat``1`0〜；繰返し回数`0か負の値 で無限ループ。1を設定すると「繰り返しなし」、2を設定すると「二回同じ動き」を行なう
- ease``Linear.None`イージング名`揺れのイージング（値の変化の仕方）を指定する。[イージングの変化はこちらの図](https://createjs.com/demos/tweenjs/tween_sparktable)（または[こちら](https://sole.github.io/tween.js/examples/03_graphs.html)）が分かりやすい。指定できる値は[tsy]を参照
- yoyo``false`true、false`（暫定）ヨーヨーのように逆方向に戻って繰り返す
- chain``なにもしない`レイヤ名`指定したレイヤのトゥイーンアニメが終了してから、このトゥイーンを続けて開始する
- alpha``1.0`相対値か絶対値`レイヤの透過度。0（完全透明）〜0.5（半透明）〜1（不透明）<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- width``なにもしない`相対値か絶対値`横幅<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- height``なにもしない`相対値か絶対値`縦幅<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- rotation``0`相対値か絶対値`時計回りは0～180、反時計回りは0～-180を指定。左上を中心に回る<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- scale_x``1.0`相対値か絶対値`横方向を何倍に拡大／縮小するか。負の値ならレイヤを左右反転<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- scale_y``1.0`相対値か絶対値`縦方向を何倍に拡大／縮小するか。負の値ならレイヤを上下反転<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- x``0`相対値か絶対値`leftの変化目標値<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- y``0`相対値か絶対値`topの変化目標値<br/>> **相対値あるいは絶対値を指定できる**<br/>> x=500 .......... 500<br/>> x='=500' ....... 現在のxに+500加算した値<br/>> x='=-500' ...... 現在のxに-500加算した値<br/>> x='250,500' .... +250から＋500までの間でランダムな値<br/>> x='=250,500' ... +250から＋500までの間でランダムな値を現在のxに加算した値
- path``なにもしない`※コメントで解説`指定すると複数のポイントを連続してトゥイーンアニメする。<br/>ポイントは半角丸括弧()【吉里吉里拡張】や{}【JSON形式】が連続する文字列。<br/>

***
id=${1{{フレーム名}}} time=${2:トゥイーンにかける時間}

***
「目標値」を設定する時、相対値あるいは絶対値を指定できる

| 指定			 | 説明	|
--|--
| x=500			| X位置を500に |
| x='=500'		| 現在のX位置に+500加算した位置 |
| x='=-500'		| 現在のX位置に-500加算した位置 |
| x='250,500'	| +250から＋500までの間でランダムな位置 |
| x='=250,500'	| +250から＋500までの間でランダムな値を現在のX位置に加算した位置 |
