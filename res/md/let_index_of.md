文字列で検索  
文字列内を検索し、文字列内の start 以降で、最初に val が見つかった位置を返す

***
- name	y		代入変数名	代入する変数。-1の場合は見つからなかった
- text	y		String	元になる文字列
- val	y		String	探す文字列
- start		0	0（先頭）〜	検索を開始する位置
- cast		出来るだけ数値変換	num、int、uint、bool、str	値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:元になる文字列} val=${3:探す文字列}

***
### コード例
~~~skynovel
&a='abcdeFGHIabcde'
[let_index_of name=a text=&a val=cd start=5]
[trace text=&a] ; -> 11
[let_index_of name=a text=&a val=GG]
[trace text=&a] ; -> -1
~~~
