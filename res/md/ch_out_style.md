文字消去演出定義  
文字消去演出アニメを定義する

***
- name	y		文字消去演出名	文字消去演出を特定する名前
- wait		500	ミリ秒	一時的な文字消去速度。0で瞬時。
- alpha		0.0	0.0〜1.0（実数）	透過度。0（完全透明）〜0.5（半透明）〜1（不透明）
- x		'=0'	相対位置指定	以下のような相対位置指定が出来る<br/>500 ──　X位置を500に<br/>'=500' ──　文字位置を基準に+500加算した位置<br/>'=-500' ──　文字位置を基準に-500加算した位置	変化の目標値
- y		'=0'	相対位置指定
- scale_x		1.0	正負の実数値	横方向を何倍に拡大／縮小するか。負の値ならレイヤを左右反転
- scale_y		1.0	正負の実数値	縦方向を何倍に拡大／縮小するか。負の値ならレイヤを上下反転
- rotate		0	Number	回転角度（単位：deg 度）、正の値は時計回り
- join		false	Boolean	文字を順番に出すか（true）同時か（false）
- ease		'ease-out'	animation-timing-function	[CSSのanimation-timing-function プロパティ](https://developer.mozilla.org/ja/docs/Web/CSS/animation-timing-function)

***
name=${1:文字消去演出名} wait=${2:500}

***
[lay][span]などの ch_out_style属性で指定すると、定義どおりの文字消去演出アニメを行なう。  
文字消去演出は、次ページの文字出現演出と同時に行なわれる。文字消去演出を待ちたい場合は、[wait]などで待つ。
参考）[CSSのanimation-timing-function プロパティ](https://developer.mozilla.org/ja/docs/Web/CSS/animation-timing-function)

機能ギャラリーにサンプルがあります。$(play)[文字出現演出](https://famibee.github.io/SKYNovel_gallery/?cur=ch_in_out)
