文字ごとのウェイト  
特定の文字の直後に自動的にウェイトを入れる。
textに指定した文字に対し、timeに指定した数値が対応する。
通常の文字表示速度にtimeの数値を掛け算する

***
- enabled		現在値	Boolean	自動ウェイトを有効にするか。初期値false
- text	両方同時に指定、或いは省略	現在値	String	ウェイトを指定する文字の集まり
- time	(↑と同じ)	現在値	カンマ区切りの数値	文字表示ウェイト倍数

***
enabled=${1|true,false|} text=${2:'、。'} time=${3:'50,100'}

***
　以下のように指定する。

### コード例
~~~skynovel
[autowc enabled=true text="４５６" time="50,100,150"]
[autowc enabled=true text="４５６" time="100,100,100"]
[autowc enabled=false]
~~~

　以下はエラーとなる。
### コード例
~~~skynovel
;x [autowc enabled=true text="４５６" time="100,100"]
;x [autowc enabled=true text="４５６" time="100,100,100,100"]
;x [autowc enabled=true text="４５６"]
;x [autowc enabled=true time="100,100,100"]
;x [autowc enabled=true]
;x [autowc enabled=true text="" time=""]
;x [autowc text="" time=""]
~~~
