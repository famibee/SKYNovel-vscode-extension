フレーム追加  
HTMLファイルをベースとする「フレーム」を追加する

***
- id`y``フレーム名`他のタグなどで操作・参照する歳の名前となる
- src`y``HTMLファイル名`フレームとして読み込むhtmlファイルのファイル名（画像や音声などのfn属性と同じように）
- alpha``1.0`0.0〜1.0；透過度`0（完全透明）〜0.5（半透明）〜1（不透明）
- scale_x``1.0`実数`横方向を何倍に拡大／縮小するか。負の値ならレイヤを左右反転
- scale_y``1.0`実数`縦方向を何倍に拡大／縮小するか。負の値ならレイヤを上下反転
- rotate``0`-360〜360；回転角度`正の値は時計回り
- visible``true`true、false`trueで行末クリック待ち記号を表示、falseで非表示
- b_color``透過`色指定。0x000000など`背後の矩形色。初期値は 透過（htmlで画像を表示すれば表示）
- x``0`実数；横座標`画面左上を原点とする画面内におけるフレームの横位置を指定
- y``0`実数；縦座標`画面左上を原点とする画面内におけるフレームの縦位置を指定
- width``フレームの横サイズ`1〜；横幅`表示するフレームの横ドットサイズ。元のサイズと異なる場合は拡大・縮小される
- height``フレームの縦サイズ`1〜；縦幅`保存するフレームの縦ドットサイズ。元のサイズと異なる場合は拡大・縮小される

***
id=${1{{フレーム名}}} src=${2{{HTMLファイル名}}} visible=${3|true,false|}

***
$(warning)注：これは HTML要素の iframe（インラインフレーム要素）で、フレームは全てのレイヤの手前に表示され、互い違いに重ねられない。   
const.sn.frm.（フレーム名）系の値もセットする。

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
