ウェイトを入れる  
指定時間スクリプト処理を待ち、再開する
[event]などでイベントが登録されていても、イベント発生待ちを行わない

***
- time	y		ミリ秒	処理を待つ時間
- canskip		true	Boolean	クリックなど（→詳細は[waitclick]）でウエイトをキャンセルできるか
- global		false	Boolean	グローバルイベント待ちを有効にするか<br/>※canskipと同時にtrueにするとエラー

***
time=${1:処理を待つ時間} 
