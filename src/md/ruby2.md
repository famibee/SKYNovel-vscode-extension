文字列と複数ルビの追加  
親文字列とルビ文字列のセットで文字を追加する

***
- layer``デフォルト文字レイヤ`文字レイヤ名`文字を表示するレイヤ
- page``fore`fore、back`ページの裏表
- t`y``文字列`親文字列
- r`y``文字列`ルビ文字列
- style``なにもしない`CSS style`文字の CSS Style を指定する。<br/>このタグによる表示のみに適用、以降は元に戻る
- r_style``なにもしない`CSS style`ルビの CSS Style を指定する。<br/>このタグによる表示のみに適用、以降は元に戻る
- wait``現在の文字表示速度`0〜；ミリ秒`一時的な文字表示速度。0で瞬時

***
t=${1:親文字列} r=${2:ルビ文字列}

***
機能ギャラリーにサンプルがあります。$(play)[直感的なルビ文法](https://famibee.github.io/SKYNovel_gallery/?cur=ruby)
