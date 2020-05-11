ページ裏表を交換  
裏ページを表ページとクロスフェードする

***
- layer		全てのレイヤ	レイヤ名	クロスフェードするレイヤ（カンマ区切りで複数可能）。指定以外のレイヤは変化させない
- time		0	ミリ秒	変化にかける時間
- delay		0	ミリ秒	変化する前に待機する遅延時間
- rule			画像ファイル名	指定した場合はルール画像として、ピクセル単位でクロスフェードするタイミングをずらす。ルール画像の黒いピクセル（と同じ位置にあるピクセル）が先に処理され、白が最後になる。<br/>省略時は画面全体ピクセルで同時にクロスフェードする
- vague		0.04	トランジション期間全体を1とした値	表レイヤと裏レイヤの境界を曖昧にぼかす度合い
- ease		Linear.None（イージング無し）	イージング名	揺れのイージング（値の変化の仕方）を指定する。<br/>[イージングの変化はこちらの図](https://createjs.com/demos/tweenjs/tween_sparktable)（または[こちら](https://sole.github.io/tween.js/examples/03_graphs.html)）が分かりやすい。<br/>指定できる値は以下の通り。<br/>Back.In、Back.InOut、Back.Out<br/>Bounce.In、Bounce.InOut、Bounce.Out<br/>Circular.In、Circular.InOut、Circular.Out<br/>Cubic.In、Cubic.InOut、Cubic.Out<br/>Elastic.In、Elastic.InOut、Elastic.Out<br/>Exponential.In、Exponential.InOut、Exponential.Out<br/>Linear.None<br/>Quadratic.In、Quadratic.InOut、Quadratic.Out<br/>Quartic.In、Quartic.InOut、Quartic.Out<br/>Quintic.In、Quintic.InOut、Quintic.Out<br/>Sinusoidal.In、Sinusoidal.InOut、Sinusoidal.Out<br/>- [tween.js/README.md at master · tweenjs/tween.js](https://github.com/tweenjs/tween.js/blob/master/README.md)<br/>- [CreateJS でのトゥイーンの作成方法 - ICS MEDIA](https://ics.media/tutorial-createjs/tween/)
- glsl			シェーダー記述言語GLSL	機能ギャラリーに[フラグメントシェーダの動作サンプル](https://famibee.github.io/SKYNovel_gallery/?cur=glsl_slide)がありますので、詳細はそちらで。<br/>ざっくり説明すると、<br/>【vTextureCoord】がピクセルの位置、<br/>【uSampler】が一ピクセル単位の画像データ、<br/>【tick】が時間経過、です

***
layer=${1{{レイヤ名}}} time=${2:500} rule=${3{{画像ファイル名}}}][wt

***
クロスフェードを開始すると、終了を待たずに次のタグへと処理を進める。
終了を待ちたい場合は[wt]を使用する。

クロスフェード終了後は元・裏ページから元・表ページに内容をコピーし、同じ内容になる。

ルール画像は白黒かグレースケールを推奨。（見た目と動きが一致する）

$(warning)また[trans]～[wt]間で文字表示や[ch]は動作未定義、非推奨。
[trans]終了を待たず何かをするのは避けた方がよいでしょう。
