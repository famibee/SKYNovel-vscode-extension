改ページクリック待ち  
シナリオファイルの順次処理を停止し、クリックやキー押下（→詳細は[waitclick]）を待つ

***
- visible		true	Boolean	trueで改ページ記号を表示、falseで非表示
- er		何もしない	Boolean	trueで改ページ待ち後に[er]処理を行なう

***
visible=${1|true,false|}

***
「breakpage」という画像やアニメpngファイルが用意されていれば、改ページクリック待ちマークとして表示する。
クリックやキー押下が発生した場合、処理を再開する。
[event]などでイベントが登録されていれば、イベント発生待ちを行う。