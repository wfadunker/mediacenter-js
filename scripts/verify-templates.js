// Minimal EJS syntax/HTML smoke test used only for verifying the converted views,
// so tests can run even when dependency download is unavailable.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../views');
const helpers=require('../lib/helpers');
const htmlEscape=helpers.escapeHtml;
function compile(src, filename){
 let js="let out='';\nwith(ctx){\n",at=0,m;
 const re=/<%([=-]?)([\s\S]*?)%>/g;
 while((m=re.exec(src))){
  js+=`out+=${JSON.stringify(src.slice(at,m.index))};\n`;
  if(m[1]==='=')js+=`out+=htmlEscape((${m[2]}));\n`;
  else if(m[1]==='-')js+=`out+=String((${m[2]})??'');\n`;
  else js+=m[2]+'\n';
  at=m.index+m[0].length;
 }
 js+=`out+=${JSON.stringify(src.slice(at))};\n}\nreturn out;`;
 try{return new Function('ctx','htmlEscape','include',js)}
 catch(e){throw new Error(filename+': '+e.message+'\n'+js.slice(0,250))}
}
function render(relative,ctx){
 const file=path.join(root,relative+'.ejs');
 const src=fs.readFileSync(file,'utf8');
 const fn=compile(src,file);
 const include=(sub)=>{
  const nested=path.relative(root,path.resolve(path.dirname(file),sub));
  return render(nested,ctx);
 };
 try{return fn(ctx,htmlEscape,include)}catch(e){throw new Error(relative+': '+e.message,{cause:e})}
}
const data={id:7,judul:'Contoh Berita Publik',slug:'contoh-berita-publik',isi:'Berita awal\nBaris kedua informasi.',gambar:'berita/377c42af2a17b1dc.jpg',kategori:'Pemerintahan',tanggal:'2026-10-11',penulis:'Tim Media',sumber:'Diskominfo',updated_at:'2026-10-11 12:15:00'};
const all={...helpers,...helpers.nowTime(),csrfToken:'x'.repeat(64),pageTitle:'Judul',pageDescription:'Deskripsi',baseUrl:'/mediacenter-demo',adminBase:'/mediacenter-demo/masuksini',adminPage:'dashboard',username:'Administrator',currentPage:'index.php',isDashboard:true,kontenActive:false,notice:'',placeholderHome:helpers.placeholderHome,
 q:'',kategori:'',tahun:0,urut:'terbaru',page:1,newsRows:[data],totalBerita:1,totalPages:1,start:1,end:1,hasFilter:false,categories:['Pemerintahan'],archiveYears:[2026],
 utama:data,updates:[data],berita:data,gambar:helpers.gambarUrl(data.gambar),penulis:'Tim Media',sumber:'Diskominfo',publishedText:'11 Oktober 2026',updatedText:'11 Oktober 2026',paragraphs:['Paragraf pertama'],relatedItems:[data],
 settings:{about_title:'Profil Pemerintah',about_description:'Penjelasan informasi pemerintah daerah yang panjang.',portal_url:'https://www.hstkab.go.id/'},portalUrl:'https://www.hstkab.go.id/',
 initial:'A',totalKategori:1,totalGambar:1,updateTerakhir:'Hari ini',persenGambar:100,latestRows:[data],chartData:[{date:'2026-10-11',count:2}],chartMax:2,isDeleted:false,
 sessionIdleAt:1731200000000,sessionMaxAt:1731220000000,loginSince:'11 Okt 2026 08.00',categories:['Pemerintahan'],
 rows:[data],total:1,status:'created',errors:[],data,error:'',
};
const pages=['public/index','public/berita','public/detail','public/tentang','admin/index','admin/berita','admin/tambah-berita','admin/edit-berita','admin/login'];
for(const p of pages){
 const s=render(p,{...all});
 if(s.includes('<%'))throw new Error(p+' has unrendered EJS tags');
 if(!s.includes('Media Center'))throw new Error(p+' missing content');
 console.log('PASS',p,s.length,'bytes');
}
render('public/index',{...all,utama:null,updates:[]});
render('public/berita',{...all,newsRows:[],totalBerita:0,hasFilter:true,q:'uji',kategori:'Pendidikan',tahun:2025,urut:'terlama',page:2,totalPages:4,categories:['Pendidikan'],archiveYears:[2025]});
render('public/detail',{...all,berita:null});
render('admin/index',{...all,latestRows:[],chartData:[{date:'2026-10-11',count:0}],isDeleted:true});
render('admin/berita',{...all,rows:[],totalPages:4,page:2,q:'uji'});
render('admin/edit-berita',{...all,data:{...data,gambar:null},errors:['Perbaiki data']});
render('admin/login',{...all,error:'Username atau password tidak sesuai.'});
console.log('PASS empty & conditional states');
