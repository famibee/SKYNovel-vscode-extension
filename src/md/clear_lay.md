レイヤ設定の消去  
画像や文字などレイヤ状態をクリアする

***
- layer``全てのレイヤ`レイヤ名（カンマ区切りで複数可）
- page``fore`fore、back、both`ページの裏表（both指定で両面）
- filter``false`true、false`true：フィルタもクリア

***
layer=${1{{レイヤ名}}} page=${2|fore,back|}

***
alpha、blendMode、rotation、scaleX、scaleYを初期値にする
※背景や背景画像はクリアしません（b_color、b_alpha） 　クリアしたい場合は、[lay back_clear=true]
