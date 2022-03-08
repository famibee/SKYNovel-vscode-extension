BGM の演奏  
BGMを再生する。[playse]とは違い、キー押下Skip中でも必ず再生を行なう。（canskip = false）

***
- fn	y		音声ファイル名	再生する音声ファイル名
- loop		true	Boolean	trueでBGMのようにループ再生する。
- volume		1.0	0.0〜1.0（実数）	再生音量。ただし音量を示すシステム変数（sys:const.an.sound.BGM.volume）は変更しない
- speed		1.0	0.0<（実数）	再生速度。（=1:元のまま、<1:遅い、>1:早い）
- join		true	Boolean	trueで読み込みを待って次のタグへ進む
- canskip		true	Boolean	trueでキー押下Skip中なら再生をしない
- start_ms		0	ミリ秒	再生の開始位置を指定する。0は冒頭
- end_ms			ミリ秒	再生の終了位置を指定する。省略時は末端。<br/>正の値は「冒頭から何ms目を終端とするか」<br/>負の値は「末尾から何ms手前を終端とするか」の指定。
- ret_ms		0	ミリ秒	ループ戻り位置を指定する。0は冒頭。<br/>ループ再生中にend_ms指定位置（省略時は末尾）に到達した場合、この指定位置に戻る。 ループ再生しない（loop=false）際は無視される。

***
fn=${1{{音声ファイル名}}}
