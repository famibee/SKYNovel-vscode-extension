差分名称の定義  
差分名称を定義する

***
- name`y``差分名称`[lay]タグface属性で指定する差分名称
- fn``属性nameの値`画像ファイル名`表示する画像、アニメpng
- dx``0`実数；横座標`基本画像左上を原点とする差分画像の表示横位置
- dy``0`実数；縦座標`基本画像左上を原点とする差分画像の表示縦位置
- blendmode``何もしない`ブレンドモード名`このレイヤと下のレイヤとの重なりにおいて、ドット単位で色のブレンド演算を行なう

***
name=${1{{画像ファイル名}}}

***
本タグだけでは差分画像を表示しない。画像レイヤの[lay]タグface属性で指定する差分名称を登録するのみ。

例えば同じ画像で差分表示位置やブレンドモードが違う登録をしたい場合、
### コード例
~~~skynovel
[add_face name=a_normal fn=画像 dx=0 dy=0]
[add_face name=a_10_10 fn=画像 dx=10 dy=10]
[add_face name=a_screen fn=画像 dx=0 dy=0 blendmode=screen]
~~~
とnameを変えることで登録できます。


機能ギャラリーにサンプルがあります。$(play)[画像も動画も表情差分](https://famibee.github.io/SKYNovel_gallery/?cur=tag_lay_face)
