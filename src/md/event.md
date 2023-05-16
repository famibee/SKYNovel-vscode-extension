イベントを予約  
次の[s]などのイベント待ちに向けてイベント処理を予約する

***
- key	y		イベント名	イベントを発生させるトリガーイベント<br/>修飾キーの同時押し（あるいは修飾キーを押しといて通常キー）を任意に組み合わせられます。「半角プラスで」「ABC順に」「イベントのキー名の前に」繋げて下さい。<br/>（例1）key=alt+enter<br/>（例2）key=alt+ctrl+shift+enter
- call		false	Boolean	trueの場合は[call]、falseは[jump]。<br/>ただしcall=trueによりサブルーチンコールした場合、[return]によって「コールする前のイベント予約状態＆待ち状態」に戻る。
- fn	y		ジャンプ先	イベント発生時にジャンプする先。指定方法は[jump]と同様。<br/>callの場合、ジャンプ先から[return]で戻ると、再度[s]などのイベント待ち状態に戻る。
- label	y		ラベル名	イベント発生時にジャンプする先。指定方法は[jump]と同様。<br/>クリック時ジャンプ先で「&sn.eventLabel」にて値を受け取れる
- url	y	fn・label によるスクリプトジャンプ	ブラウザで開けるURL	クリック時にURLを開く。指定時は fn・label を無視する
- global		false	Boolean	trueを指定すると大域的なイベント扱いとなり、イベント発生時にイベント予約が削除されない
- arg		null	String	指定した場合、クリック時ジャンプ先で「&sn.eventArg」にて値を受け取れる
- del		false	Boolean	trueを指定すると予約済みイベントを削除する。<br/>fn/label/callとdelは同時指定できません
- need_err		true	Boolean	HTML内にセレクタ（key属性）に対応する要素が見つからない場合にエラーを出すか

***
key=${1{{イベント名}}} ${2{{ジャンプ先}}} global=${3|true,false|}

***
あるイベントが発生した際、global=falseのイベント予約は全て削除される
