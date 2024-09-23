var n=require("fs-extra"),_=require("node:path"),F=require("node:util");const[,,b,D]=process.argv,S=require("psd.js"),P=require("sharp");P.cache(!1);const x=__filename.slice(__dirname.length+1,-3),E=(0,n.mkdtempSync)(`/tmp/${x}-`);function A(r){return(0,_.basename)(r,(0,_.extname)(r))}function v(r,{name:l,left:c,top:a,width:d,height:t,layer:o},p,i,m,g){const e=r+"_"+l.replaceAll(w,"#"),s=`${D}face/${e}.png`,f=o.blendingMode(),h=`${p?";":""}	[add_face name=${e} dx=${c} dy=${a}${f==="normal"?"":` blendmode=${f}`}]
`;if(p){const u=`${E}/${e}.png`,y=o.image.saveAsPng(u).then(async()=>{await P(u).extend({left:c,right:m-c-d,top:a,bottom:g-a-t,background:{r:0,g:0,b:0,alpha:0}}).toFile(s)});i.push(y)}else i.push(o.image.saveAsPng(s));return h}const w=/[\\\/:*?"<>|\.\s]/g,$=[];S.open(b).then(r=>{const l=r.tree(),{document:{width:c,height:a}}=l.export(),d=A(b);let t=`;#ED FACE
; *******************************************************
;#ED {"width":${c}, "height":${a}}
`;const o=l.descendants(),p=o.length;let i=p;for(;0<=--i;){const{type:e,parent:s}=o[i];if(e==="group"||s.isRoot())break}let m="";for(let e=0;e<p;++e){const s=o[e],{type:f,name:h,parent:u}=s;if(f==="group"){t+=`;#ED FACE_FOLDER ${h}
`,m="_"+h;continue}u.isRoot()&&(m!==""&&(t+=`;#ED FACE_FOLDER /
`),m=""),t+=v(d+m,s,i<=e,$,c,a)}t+=`
; *******************************************************

[return]
`;const g=D+`face/face${d}.sn`;(0,n.ensureFileSync)(g),$.push((0,n.writeFile)(g,t,"utf8")),Promise.allSettled($).then(async()=>{await(0,n.remove)(E),console.log((0,F.styleText)(["bgGreen","black"],"fn:cnv_psd_face.ts ok.")),process.exit(0)})});
