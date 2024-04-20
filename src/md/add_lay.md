レイヤを追加する  
レイヤはページの裏表があり、文字レイヤや画像レイヤなどの種類があります

***
- layer`y``未使用のレイヤ名`レイヤ名を指定する。未使用のレイヤ名でなければエラー＆アプリ停止
- class`y``grp、txt`レイヤの種類。grp（画像レイヤ）、txt（文字レイヤ）のレイヤ種別

***
layer=${1:レイヤ名} class=${2|grp,txt|}

***
### コード例
~~~skynovel
[add_lay layer=base class=grp]
[add_lay layer=0 class=grp]
[add_lay layer=mes class=txt]
~~~
