変数代入・演算  
変数に値を代入する

***
- name	y		代入変数名	代入する変数
- text	y		String	セットする値
- cast		出来るだけ数値変換	num、int、uint、bool、str	値をセットする際の型。<br/>num……数値（実数）。「01」は数値の1となる。<br/>int……数値（符合付き整数）<br/>uint……数値（符合なし整数）<br/>bool……Boolean<br/>str……文字列。「01」は「01」のまま

***
name=${1{{代入変数名}}} text=${2:セットする値}

***
### コード例
~~~skynovel
[let name=a text='てんぐ👺🌈𩸽🌕']
[trace text=&a] ; -> 'てんぐ👺🌈𩸽🌕'
&a='abcde'
[trace text=&a] ; -> 'abcde'


[let_substr name=a text=&a pos=2 len=3]
[trace text=&a] ; -> 'cde'
[let_substr name=a text=&a pos=1 len=all]
[trace text=&a] ; -> 'de'
~~~
