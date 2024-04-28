フィルター個別切替  
個別にフィルター有効・無効を変更する

***
- layer``全てのレイヤ`レイヤ名（カンマ区切りで複数可）
- page``fore`fore、back、both`ページの裏表（both指定で両面）
- index``0`0〜`追加したフィルターの中で、有効・無効を変更するフィルターの番号。<br/>0が最初のフィルター。フィルターを重ねるたびに1加算したindexになる
- enabled`true`true、false`フィルターを有効にするか

***
layer=${1{{レイヤ名}}} page=${2|fore,back,both|} index=${3:フィルターの番号} enabled=${4|true,false|}
