フレーム変数を取得  
フレーム内の変数から、値を取得する

***
- id	y		フレーム名	[add_fram]で定義したフレーム名
- var_name	y		String	フレーム内の変数/関数名

***
id=${1{{フレーム名}}} var_name=${2:フレーム内の変数/関数名}

***
関数名を指定した場合は関数を実行し、その戻り値を取得する。  
【const.sn.frm.（id名）.（var_name名）】に値がセットされる。

### コード例
~~~skynovel
[add_frame id=config src=_config visible=false]
[event key='dom=config:#close' label=*exit global=true]

[let_frame id=config var_name=val_sldBackAlpha]
&sys:TextLayer.Back.Alpha = const.sn.frm.config.val_sldBackAlpha/100
[return]

*val2ctrl
[set_frame id=config var_name=val_sldBackAlpha text=&sys:TextLayer.Back.Alpha*100]
[let_frame id=config var_name=val2ctrl function=true]
[return]
~~~

機能ギャラリーにサンプルがあります。$(play)[HTMLフレーム](https://famibee.github.io/SKYNovel_gallery/?cur=frame)
