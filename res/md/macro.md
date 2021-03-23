マクロ定義の開始  
[macro]と[endmacro]に囲まれた部分をマクロとして定義する。定義したマクロは既存のタグと同様に使用できる。渡した属性は、マクロ側で「mp:」スコープにより参照できる

***
- name	y	マクロ名	String	既存のタグやマクロと重複しないマクロ名
- nowarn_unused		false	Boolean	true：未使用警告を止める
- design_unit		false	Boolean	true：デバッグモード時、マクロの引数変更とする（マクロの内部をサーチさせない）
- stepin		true	Boolean	false：デバッグモード時、ステップインしない（マクロ内で停止させない）

***
name=${1:マクロ名}]
	; ここにマクロの処理内容を
[endmacro
