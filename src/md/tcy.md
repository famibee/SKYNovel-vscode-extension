縦中横を表示する  
縦中横文字を追加する。ルビは同時に設定する

***
- layer		デフォルト文字レイヤ	文字レイヤ名	文字を表示するレイヤ
- page		fore	fore、back	ページの裏表
- t	y		String	縦中横文字列、通常半角文字を指定する
- r		ルビ無し	String	ルビ文字列
- wait		現在の文字表示速度	ミリ秒	一時的な文字表示速度。0で瞬時。
- style		何もしない	CSS style	CSS styleを指定する。このタグによる表示のみに適用、以降は元に戻る
- ch_in_style		何もしない	文字出現演出名	[ch_in_style]で定義した文字出現演出名
- ch_out_style		何もしない	文字消去演出名	[ch_out_style]で定義した文字消去演出名

***
t=${1:縦中横文字列}

***
機能ギャラリーにサンプルがあります。$(play)[トップページの「451」](https://famibee.github.io/SKYNovel_gallery/)
