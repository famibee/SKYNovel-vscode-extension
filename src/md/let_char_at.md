文字列から一字取りだし  
文字列中の一文字を取り出す。結果を変数に代入する

***
- name`y``代入変数名`代入する変数
- text`y``文字列`元になる文字列
- pos``0`0〜`何番目の文字を取り出すか。0（先頭）
- cast``出来るだけ数値変換`num、int、uint、bool、str`値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:元になる文字列} pos=${3:取り出す位置}

***
### コード例
~~~skynovel
&a='abcde'
[let_char_at name=a text=&a pos=1]
[trace text=&a] ; -> 'b'
~~~
