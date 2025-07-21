const[,,_="",S]=process.argv;import y from"psd.js";import b from"sharp";b.cache(!1);import{mkdtempSync as F}from"node:fs";import{ensureFileSync as R,remove as x,outputFile as A}from"fs-extra/esm";import{basename as L,extname as T}from"node:path";import{styleText as h}from"node:util";import{fileURLToPath as v}from"node:url";const w=v(import.meta.url),k=import.meta.dirname,C=w.slice(k.length+1,-3),P=F(`/tmp/${C}-`);function G(c){return L(c,T(c))}function N(c,{name:d,left:e,top:o,width:m,height:n,layer:r},p,i,a,l){const t=c+"_"+d.replaceAll(O,"#"),s=`${S}face/${t}.png`,f=r.blendingMode(),g=`${p?";":""}	[add_face name=${t} dx=${e} dy=${o}${f==="normal"?"":` blendmode=${f}`}]
`;if(!p)return i.push(r.image.saveAsPng(s)),g;const u=`${P}/${t}.png`,D=async()=>{console.log(h(["blueBright"],`fn:cnv_psd_face.ts canvas(${a},${l}) layer(${String(e).padStart(4)}, ${String(o).padStart(4)}, ${String(m).padStart(4)}, ${String(n).padStart(4)}) name:${t}:`));try{await r.image.saveAsPng(u),await b(u).extend({left:e,right:a-e-m,top:o,bottom:l-o-n,background:{r:0,g:0,b:0,alpha:0}}).toFile(s)}catch(E){console.log(h(["bgRed","white"],"  [ERR] %o"),E)}};return i.push(D()),g}const O=/[\\\/:*?"<>|\.\s]/g,$=[];y.open(_).then(c=>{const d=c.tree(),{document:{width:e,height:o}}=d.export(),m=G(_);let n=`;#ED FACE
; *******************************************************
;#ED {"width":${e}, "height":${o}}
`;const r=d.descendants(),p=r.length;let i=p;for(;0<=--i;){const{type:t,parent:s}=r[i];if(t==="group"||s.isRoot())break}let a="";for(let t=0;t<p;++t){const s=r[t],{type:f,name:g,parent:u}=s;if(f==="group"){n+=`;#ED FACE_FOLDER ${g}
`,a="_"+g;continue}u.isRoot()&&(a!==""&&(n+=`;#ED FACE_FOLDER /
`),a=""),n+=N(m+a,s,i<=t,$,e,o)}n+=`
; *******************************************************

[return]
`;const l=S+`face/face${m}.sn`;R(l),$.push(A(l,n,"utf8")),Promise.allSettled($).then(async()=>{await x(P),console.log(h(["bgGreen","black"],"fn:cnv_psd_face.ts ok.")),process.exit(0)})});
