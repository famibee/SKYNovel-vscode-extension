マクロ定義の開始  
[macro]と[endmacro]に囲まれた部分をマクロとして定義する。定義したマクロは既存のタグと同様に使用できる。渡した属性は、マクロ側で「mp:」スコープにより参照できる

***
- name	y	マクロ名	String	既存のタグやマクロと重複しないマクロ名
- nowarn_unused		false	Boolean	true：未使用警告を止める
- design_unit		false	Boolean	true：デバッグモード時、マクロの引数変更とする（マクロの内部をサーチさせない）
- stepin		true	Boolean	false：デバッグモード時、ステップインしない（マクロ内で停止させない）
- sum		概要説明	String	拡張機能で表示する概要説明
- detail		詳細説明	String	拡張機能で表示する詳細説明
- snippet_ext		詳細説明	SP_GSM、SOUND、FONT、SCRIPT	指定するとスニペット候補に追加できる
- %(属性名)		属性の詳細説明	型名|省略値|概要	属性名末尾に「?」を書くと【省略可能な属性】であると示す


***
name=${1:マクロ名}
	sum='概要説明'
	%aaa='型|省略値|引数説明'
]
	; ここにマクロの処理内容を
[endmacro
