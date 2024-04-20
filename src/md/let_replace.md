正規表現で置換  
文字列を正規表現で検索し、マッチする箇所を文字列で置き換える

***
- name`y``代入変数名`代入する変数
- text`y``文字列`置換対象の文字列
- reg`y``文字列`正規表現
- flags``（なし）`文字列`正規表現のフラグ
- val`y``文字列`置き換える文字列
- cast``出来るだけ数値変換`num、int、uint、bool、str`値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:置換対象の文字列} reg=${3:正規表現} val=${4:置き換える文字列}

***
### コード例
~~~skynovel
&a='abcde'
[let_replace name=a text=&a reg='cd' val=GG]
[trace text=&a] ; -> abGGe
~~~
