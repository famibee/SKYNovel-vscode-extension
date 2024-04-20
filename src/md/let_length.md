文字列の長さ  
文字列の長さを求める

***
- name`y``代入変数名`代入する変数
- text`y``文字列`長さを求める文字列
- cast``出来るだけ数値変換`num、int、uint、bool、str`値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:長さを求める文字列}

***
### コード例
~~~skynovel
&a='abcde'
[let_length name=a text=&a]
[trace text=&a] ; -> 5
~~~
