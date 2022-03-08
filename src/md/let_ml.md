インラインテキスト代入  
[let_ml]〜[endlet_ml]で囲んだ複数行テキストを代入する

***
- name	y		代入変数名	代入する変数

***
name=${1{{代入変数名}}}]
	ここに自由な複数行テキストを
[endlet_ml

***
【JSON文字列を「.」表記で取り出せる書式】との組み合わせで、以下のようなことができます。

### コード例
~~~skynovel
[let_ml name=a]
	{
		"b": 3,
		"c": 5
	}
[endlet_ml]
[trace text=&a] ; -> {"b": 3, "c": 5}
[trace text=&a.b] ; -> 3
[trace text=&a.c] ; -> 5
~~~

機能ギャラリー【[フラグメントシェーダで[trans ]](https://famibee.github.io/SKYNovel_gallery/?cur=glsl_slide)】では、GLSLというシェーダー記述言語を扱うのに使用しています。

### コード例
~~~skynovel
[let_ml name=ml]
	precision mediump float;
	varying vec2 vTextureCoord;
	uniform sampler2D uSampler;
	uniform float tick;

	void main(void) {
		vec2 pos = vTextureCoord;
		pos.x = pos.x + tick;
		if (pos.x > 1.0) gl_FragColor = vec4(0);
		else gl_FragColor = texture2D(uSampler, pos);
	}
[endlet_ml]
~~~
