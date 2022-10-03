絶対値  
絶対値を求める。結果を変数に代入する

***
- name	y		代入変数名	代入する変数
- text	y		Number	絶対値を求める数
- cast		出来るだけ数値変換	num、int、uint、bool、str	値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:絶対値を求める数}

***
### コード例
~~~skynovel
[let_abs name=a text=-3.56]
[trace text=&a] ; -> 3.56
~~~
