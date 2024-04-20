正規表現で検索  
文字列内を正規表現で検索し、最初に val が見つかった位置を返す

***
- name`y``代入変数名`代入する変数
- text`y``文字列`検索対象の文字列
- reg`y``文字列`正規表現
- flags``（なし）`文字列`正規表現のフラグ
- cast``出来るだけ数値変換`num、int、uint、bool、str`値をセットする際の型。（詳細は[let]を参照）

***
name=${1{{代入変数名}}} text=${2:検索対象の文字列} reg=${3:正規表現}

***
### コード例
~~~skynovel
&a='abcde'
[let_search name=a text=&a reg='cd']
[trace text=&a] ; -> 2。a(=0),b(=1),c(=2)の2
~~~
