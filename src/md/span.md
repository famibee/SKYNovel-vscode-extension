インラインスタイル設定  
この指定以降の文字のレイアウト（フォントや文字色など）を指定する

***
- layer``デフォルト文字レイヤ`文字レイヤ名`文字を表示するレイヤ
- page``fore`fore、back`ページの裏表
- wait``現在の文字表示速度`0〜；ミリ秒`一時的な文字表示速度。0で瞬時
- style``なにもしない`CSS style`文字の CSS Style を指定する。<br/>このタグ以降のルビ表示に適用される
- r_style``なにもしない`CSS style`ルビの CSS Style を指定する。<br/>このタグ以降のルビ表示に適用される
- ch_in_style``なにもしない`文字出現演出名`[ch_in_style]で定義した文字出現演出名
- ch_out_style``なにもしない`文字消去演出名`[ch_out_style]で定義した文字消去演出名
- r_align``現在値`left、center、right、justify、121、even、1ruby`ルビ揃えを指定する。<br/>> left ……（肩付き）先頭親文字から、ルビ間は密着<br/>> center ……（中付き）センター合わせ、〃<br/>> right ……（右／下揃え）末尾親文字から、〃<br/>> justify ……（両端揃え）先頭から末尾親文字間に、ルビ間は均等にあける<br/>> 121 ……（1-2-1(JIS)）ルビの前後を比率1、ルビ間を比率2であける<br/>> even ……（均等アキ）ルビの前後、ルビ間も均等にあける<br/>> 1ruby ……（1ルビ文字アキ）ルビの前後をルビ一文字空け、ルビ間は均等にあける<br/><br/>初期値は center。<br/><br/>※親文字よりルビの方が長い場合は、親文字に対する「中付き」表示になる<br/>→参考（[機能ギャラリー・直感的なルビ文法](https://famibee.github.io/SKYNovel_gallery/index.html?cur=built_in_ruby)）

***
style=${1:CSSstyle}

***
一時的に文字レイヤのlayout属性への指定を上書きするイメージ。 文字レイヤをクリア（[clear_text]、[clear_lay]）するとリセット、以降は元通り文字レイヤのlayout属性に従う
