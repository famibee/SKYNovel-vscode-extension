履歴書き込み  
履歴に文字や付加情報を出力する

***
- text			String	表示したい文字列。ルビ文法（《》）も解析する

***
text=${1:表示したい文字列}

***
「現在のページ」のテキストに文字を追加する。
「現在のページ」に対する、任意の属性も自由に追加できる。その属性はconst.sn.log.jsonにも含まれ、フレームに渡しJavaScriptなどで（JSON.parse()して）利用できる
