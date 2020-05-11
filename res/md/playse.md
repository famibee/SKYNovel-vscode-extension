効果音の再生  
効果音を再生する

***
- fn	y		音声ファイル名	再生する音声ファイル名
- buf		SE	サウンドバッファ	効果音を識別するサウンドバッファ。サウンドバッファを変えれば同時に複数の音を操作することが出来ます
- loop		false	Boolean	trueでBGMのようにループ再生する。
- volume		1.0	0.0〜1.0（実数）	再生音量。ただし音量を示すシステム変数（sys:const.an.sound.BGM.volume）は変更しない
- speed		1.0	0.0<（実数）	再生速度。（=1:元のまま、<1:遅い、>1:早い）
- join		true	Boolean	trueで読み込みを待って次のタグへ進む

***
fn=${1{{音声ファイル名}}} buf=${2{{サウンドバッファ}}}

***
機能ギャラリーにサンプルがあります。$(play)[効果音とBGM](https://famibee.github.io/SKYNovel_gallery/?cur=sound)
