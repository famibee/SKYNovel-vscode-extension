フレーム変数に設定  
フレーム内の変数に、値を設定する

***
- id	y		フレーム名	[add_fram]で定義したフレーム名
- var_name	y		String	フレーム内の変数名
- text	y	セットする値	String	フレーム内の変数にセットする値

***
id=${1{{フレーム名}}} var_name=${2:フレーム内の変数名} text=${3:セットする値}

***
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
