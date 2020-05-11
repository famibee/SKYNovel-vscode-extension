文字を追加する  
文字レイヤに文字を出力する

***
- layer		デフォルト文字レイヤ	文字レイヤ名	文字を表示するレイヤ
- page		fore	fore、back	ページの裏表
- text	y		String	表示したい文字列。ルビ文法（《》）も解析する。改行も [r] で出来る
- record		true	Boolean	履歴に保存するか
- wait		現在の文字表示速度	ミリ秒	一時的な文字表示速度。0で瞬時。
- style		何もしない	CSS style	CSS styleを指定する。このタグによる表示のみに適用、以降は元に戻る
- ch_in_style		何もしない	文字出現演出名	[ch_in_style]で定義した文字出現演出名
- ch_out_style		何もしない	文字消去演出名	[ch_out_style]で定義した文字消去演出名

***
layer=${1{{文字レイヤ名}}} page=${2|fore,back|} text=${3:表示したい文字列} ch_in_style=${4{{文字出現演出名}}} ch_out_style=${5{{文字消去演出名}}}

***
[ch]を使わない、より簡潔な記述文法があります。
以下の記述は、
[ch text=&test]
[ch text=test]
[ch text="&a + b"]

以下のようにも書けます。&から&までを[ch]文と解釈します。
&test&
&'test'&
&a + b&

では「&（半角）」を表示するには？（これらの文法のせいで普通に書けない）
[ch text="&'&'"]として下さい
