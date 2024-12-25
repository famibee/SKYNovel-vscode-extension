const[,,_="",$]=process.argv;import E from"psd.js";import b from"sharp";b.cache(!1);import{mkdtempSync as F}from"fs";import{ensureFileSync as y,remove as S,outputFile as x}from"fs-extra/esm";import{basename as A,extname as v}from"node:path";import{styleText as L}from"node:util";const T=__filename.slice(__dirname.length+1,-3),D=F(`/tmp/${T}-`);function k(s){return A(s,v(s))}function w(s,{name:p,left:r,top:c,width:f,height:n,layer:t},m,a,i,l){const e=s+"_"+p.replaceAll(R,"#"),o=`${$}face/${e}.png`,d=t.blendingMode(),g=`${m?";":""}	[add_face name=${e} dx=${r} dy=${c}${d==="normal"?"":` blendmode=${d}`}]
`;if(m){const h=`${D}/${e}.png`,P=t.image.saveAsPng(h).then(async()=>{await b(h).extend({left:r,right:i-r-f,top:c,bottom:l-c-n,background:{r:0,g:0,b:0,alpha:0}}).toFile(o)});a.push(P)}else a.push(t.image.saveAsPng(o));return g}const R=/[\\\/:*?"<>|\.\s]/g,u=[];E.open(_).then(s=>{const p=s.tree(),{document:{width:r,height:c}}=p.export(),f=k(_);let n=`;#ED FACE
; *******************************************************
;#ED {"width":${r}, "height":${c}}
`;const t=p.descendants(),m=t.length;let a=m;for(;0<=--a;){const{type:e,parent:o}=t[a];if(e==="group"||o.isRoot())break}let i="";for(let e=0;e<m;++e){const o=t[e],{type:d,name:g,parent:h}=o;if(d==="group"){n+=`;#ED FACE_FOLDER ${g}
`,i="_"+g;continue}h.isRoot()&&(i!==""&&(n+=`;#ED FACE_FOLDER /
`),i=""),n+=w(f+i,o,a<=e,u,r,c)}n+=`
; *******************************************************

[return]
`;const l=$+`face/face${f}.sn`;y(l),u.push(x(l,n,"utf8")),Promise.allSettled(u).then(async()=>{await S(D),console.log(L(["bgGreen","black"],"fn:cnv_psd_face.ts ok.")),process.exit(0)})});
