文字列から抜きだし  
文字列の一部を取り出す

***
- name	y		代入変数名	代入する変数
- text	y		String	元になる文字列
- pos		0	0（先頭）〜または〜-1（末尾）	何番目の文字から取り出すか。負の値なら「後ろから何個目か」。-1が最後の文字。【pos=-3 len=all】とすると、後ろから３文字を取り出す。
- len		1	文字数またはall	何文字取り出すか。all でpos以降の全て
- cast		出来るだけ数値変換	num、int、uint、bool、str	値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:元になる文字列} pos=${3:取り出す位置} len=${4:文字数またはall}

***
### コード例
~~~skynovel
&a='abcde'
[let_substr name=a text=&a pos=2 len=3]
[trace text=&a] ; -> 'cde'
[let_substr name=a text=&a pos=1 len=all]
[trace text=&a] ; -> 'de'
~~~
