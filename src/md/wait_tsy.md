トゥイーン終了待ち  
レイヤーやフレームの終了を待ち、再開する

***
- layer`y``レイヤ名`処理対象のレイヤ
- page``fore`fore、back`ページの裏表
- id`y``フレーム名`処理対象のフレーム
- canskip``true`true、false`クリックなどでウエイトをキャンセルできるか
- global``true`true、false`グローバルイベント待ちを有効にするか
- chk_exist_tw`false`true、false`トゥイーン存在チェックするか

***
layer=${1{{レイヤ名}}} canskip=${2|true,false|}

***
[event]などでイベントが登録されていても、イベント発生待ちを行わない。 繰返し回数が0（無限ループ）の場合、何もせず終了する。  
「layer（とpage）」を指定した場合はレイヤーの操作、  
「id」を指定した場合はフレームの操作を行なう

機能ギャラリーにサンプルがあります。$(play)[フォント利用](https://famibee.github.io/SKYNovel_gallery/?cur=tag_tsy)
