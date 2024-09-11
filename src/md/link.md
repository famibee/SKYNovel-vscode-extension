ハイパーリンク  
指定した文字レイヤの表ページに、ハイパーリンクを作成する

***
- layer``デフォルト文字レイヤ`文字レイヤ名`文字を表示するレイヤ名
- page``fore`fore、back`ページの裏表
- style``'background-color: rgba(255,0,0,0.5);'`CSS style`リンク上にマウスカーソルが乗っていない状態のCSS スタイル
- style_hover``'background-color: rgba(255,0,0,0.9);'`CSS style`文字ボタン上にマウスカーソルが乗っている状態（クリックしていない）のCSS スタイル
- style_clicked``styleの値`CSS style`文字ボタン上にマウスカーソルが乗っている状態（クリックしている）のCSS スタイル
- style_disable``'color: gray;'`CSS style`enabled=false 状態のCSS スタイル
- r_style``styleの値`CSS style`リンク上にマウスカーソルが乗っていない状態のルビのCSS スタイル
- r_style_hover``style_hoverの値`CSS style`文字ボタン上にマウスカーソルが乗っている状態（クリックしていない）のルビのCSS スタイル
- r_style_clicked``r_styleの値`CSS style`文字ボタン上にマウスカーソルが乗っている状態（クリックしている）のルビのCSS スタイル
- r_style_disable``'color: gray;'`CSS style`enabled=false 状態のルビのCSS スタイル
- ch_in_style``なにもしない`文字出現演出名`[ch_in_style]で定義した文字出現演出名
- ch_out_style``なにもしない`文字消去演出名`[ch_out_style]で定義した文字消去演出名
- wait``現在の文字表示速度`0〜；ミリ秒`一時的な文字表示速度。0で瞬時
- enabled``true`true、false`falseだと押せないボタンとなり、クリックイベントが発生しない。<br/>これにより文字レイヤの任意の位置に画像表示できる機能を提供する。<br/>画像は三等分しない。イベントや効果音指定は無効だが、ヒント機能は有効
- call``false`true、false`trueの場合は[call]、falseは[jump]。<br/>ただしcall=trueによりサブルーチンコールした場合、[return]によって「コールする前のイベント予約状態＆待ち状態」に戻る
- fn``処理中のスクリプト`スクリプトファイル名`クリック時にジャンプする先
- label``スクリプトの先頭`ラベル名`コール先のスクリプトにあるラベル`クリック時ジャンプ先で「&sn.eventLabel」にて値を受け取れる
- url`y`fn・label によるスクリプトジャンプ`ブラウザで開けるURL`クリック時にURLを開く。指定時は fn・label を無視する
- global``false`true、false`詳細は[event]と同様。<br/>※ボタンを[trans]する場合はtrueにしておく
- arg```ジャンプ先に渡したい値`指定した場合、クリック時ジャンプ先で「&sn.eventArg」にて値を受け取れる
- onenter``なにもしない`ラベル名`マウス重なり（フォーカス取得）時、指定したラベルをコールする。 必ず[return]で戻ること
- onleave``なにもしない`ラベル名`マウス重なり外れ（フォーカス外れ）時、指定したラベルをコールする。 必ず[return]で戻ること
- clickse``省略時は無音`音声ファイル名`指定すると、クリック時に効果音を再生する
- enterse``省略時は無音`音声ファイル名`指定すると、ボタン上にマウスカーソルが載った時に効果音を再生する
- leavese``省略時は無音`音声ファイル名`指定すると、ボタン上からマウスカーソルが外れた時に効果音を再生する
- clicksebuf``SYS`サウンドバッファ名`クリック時効果音を再生するサウンドバッファを指定する
- entersebuf``SYS`サウンドバッファ名`マウスオン時効果音を再生するサウンドバッファを指定する
- leavesebuf``SYS`サウンドバッファ名`マウスアウト時効果音を再生するサウンドバッファを指定する
- hint``表示しない`ヒント文字列`指定した場合のみ、マウスカーソルを載せるとツールチップス表示する
- hint_style```CSS style`hintの CSSを指定できる
- hint_opt```文字列`@popperjs/coreの動作を指定

***
${1{{ジャンプ先}}}][endlink

***
[link]から[endlink]（ハイパーリンクの終了）までで囲った範囲をリンク区間と呼び、
その区間の文字や縦中横がハイパーリンクになる。（リンク区間は入れ子に出来ません）
※選択肢として使用する場合、ジャンプ先のラベル直後には必ず[record_place]を記述して、ジャンプ直後でセーブしても正しくセーブされるようにして下さい

機能ギャラリーにサンプルがあります。$(play)[フォント利用](https://famibee.github.io/SKYNovel_gallery/?cur=ch_button)
