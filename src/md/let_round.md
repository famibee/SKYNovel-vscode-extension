四捨五入  
四捨五入する

***
- name`y``代入変数名`代入する変数
- text`y``実数`四捨五入する数
- cast``出来るだけ数値変換`num、int、uint、bool、str`値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:四捨五入する数}

***
### コード例
~~~skynovel
[let_round name=a text=3.45]
[trace text=&a] ; <- 3
~~~
