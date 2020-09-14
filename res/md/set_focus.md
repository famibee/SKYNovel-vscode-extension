フォーカス移動  
[button][link]などのフォーカスを移動する

***
- to	y		prev、next、null	prev……追加順で前に移動<br/>next……追加順で次に移動<br/>null……どの[button][link]にもフォーカスがない状態にする
- add	y		（querySelectorAll()引数なセレクタ指定）	[event key='dom=（略）']指定していないフレーム内HTML要素にフォーカス移動対象に加えられる。<br/>【例】[set_focus add='dom=archive:.card-image,.btn_delete']
- del	y		（querySelectorAll()引数なセレクタ指定）	フォーカス移動対象から外す。<br/>【例】[set_focus del='dom=archive:.card-image,.btn_delete']

***
to=${1|prev,next,null|}

***
[button][link]が文字レイヤに追加された順番、あるいは逆順に「マウスオーバー」表示を移動し、選択する。Enter(Return)キーでボタンクリックと同じ動作をする。
フレーム内HTML要素も[event key='dom=（略）']で自動的にフォーカス移動対象に加えられる。
キーボードやゲームパッド、スイッチコントロールなどの操作を補助する。
