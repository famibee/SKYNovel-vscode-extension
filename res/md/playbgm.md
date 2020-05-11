BGM の演奏  
BGMを再生する。[playse]とは違い、キー押下Skip中でも必ず再生を行なう。（canskip = false）

***
- fn	y		音声ファイル名	再生する音声ファイル名
- loop		true	Boolean	trueでBGMのようにループ再生する。
- volume		1.0	0.0〜1.0（実数）	再生音量。ただし音量を示すシステム変数（sys:const.an.sound.BGM.volume）は変更しない
- speed		1.0	0.0<（実数）	再生速度。（=1:元のまま、<1:遅い、>1:早い）
- join		true	Boolean	trueで読み込みを待って次のタグへ進む

***
fn=${1{{音声ファイル名}}}
