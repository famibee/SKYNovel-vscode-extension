var n=require("fs-extra"),_=require("node:path"),F=require("node:util");const[,,b,D]=process.argv,S=require("psd.js"),P=require("sharp");P.cache(!1);const x=__filename.slice(__dirname.length+1,-3),E=(0,n.mkdtempSync)(`/tmp/${x}-`);function A(r){return(0,_.basename)(r,(0,_.extname)(r))}function v(r,{name:d,left:c,top:a,width:p,height:t,layer:o},l,i,m,g){const e=r+"_"+d.replaceAll(w,"#"),s=`${D}face/${e}.png`,f=o.blendingMode(),u=`${l?";":""}	[add_face name=${e} dx=${c} dy=${a}${f==="normal"?"":` blendmode=${f}`}]
`;if(l){const h=`${E}/${e}.png`,y=o.image.saveAsPng(h).then(async()=>{await P(h).extend({left:c,right:m-c-p,top:a,bottom:g-a-t,background:{r:0,g:0,b:0,alpha:0}}).toFile(s)});i.push(y)}else i.push(o.image.saveAsPng(s));return u}const w=/[\\\/:*?"<>|\.\s]/g,$=[];S.open(b).then(r=>{const d=r.tree(),{document:{width:c,height:a}}=d.export(),p=A(b);let t=`;#ED FACE
; *******************************************************
&const.ae.\u7ACB\u3061\u7D75.${p} = true
;#ED {"width":${c}, "height":${a}}
`;const o=d.descendants(),l=o.length;let i=l;for(;0<=--i;){const{type:e,parent:s}=o[i];if(e==="group"||s.isRoot())break}let m="";for(let e=0;e<l;++e){const s=o[e],{type:f,name:u,parent:h}=s;if(f==="group"){t+=`;#ED FACE_FOLDER ${u}
`,m="_"+u;continue}h.isRoot()&&(m!==""&&(t+=`;#ED FACE_FOLDER /
`),m=""),t+=v(p+m,s,i<=e,$,c,a)}t+=`
; *******************************************************

[return]
`;const g=D+`face/face${p}.sn`;(0,n.ensureFileSync)(g),$.push((0,n.writeFile)(g,t,"utf8")),Promise.allSettled($).then(async()=>{await(0,n.remove)(E),console.log((0,F.styleText)(["bgGreen","black"],"fn:cnv_psd_face.ts ok.")),process.exit(0)})});
