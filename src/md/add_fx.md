シェーダエフェクト追加  
grpレイヤにシェーダエフェクトを重ねる

***
- layer``全てのレイヤ`レイヤ名（カンマ区切りで複数可）
- page``fore`fore、back、both`ページの裏表（both指定で両面）
- fx`y``wave、rgbShift、snow、rain、fireworks等`シェーダエフェクト名。[def_fx]で定義したプリセット名も指定できる
- name``自動採番`識別子`[clear_fx]や[wait_fx]などで指定する識別子
- time``0`0〜；ミリ秒`0で無限
- loop``true`true、false`単発再生フラグ
- speed``1`実数`時間の進み方の倍率
- reverse``false`true、false`逆再生フラグ
- keep``プリセットの既定値`true、false`時間経過後も最終フレームで凍結するか

***
layer=${1{{レイヤ名}}} fx=${2{{fx名}}}
