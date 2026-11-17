require('dotenv').config();
const express=require('express');
const session=require('express-session');
const multer=require('multer');
const bcrypt=require('bcryptjs');
const crypto=require('node:crypto');
const dnsPromises=require('node:dns').promises;
const path=require('node:path');
const fs=require('node:fs');
const store=require('./lib/repository');
const H=require('./lib/helpers');
const {MySQLSessionStore}=require('./lib/session-store');
const app=express();
const base=H.baseUrl;
const ADMIN_PATH=base+'/masuksini';
const ADMIN_COOKIE='mc_admin_sid';
const SESSION_IDLE_MS=30*60*1000;
const SESSION_MAX_MS=8*60*60*1000;
const prod=process.env.NODE_ENV==='production';
const sessionSecret=process.env.SESSION_SECRET||'';
const weakSecrets=new Set(['GANTI_DENGAN_STRING_ACAK_PANJANG_MINIMAL_32_KARAKTER','local-only-not-for-production-change-this']);
if(prod&&(sessionSecret.length<32||weakSecrets.has(sessionSecret)))throw new Error('SESSION_SECRET wajib diisi dengan string acak minimal 32 karakter dan tidak boleh memakai nilai contoh.');
if(prod)app.set('trust proxy',1);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.disable('x-powered-by');
const isAdminUrl=reqPath=>reqPath===ADMIN_PATH||reqPath.startsWith(ADMIN_PATH+'/');
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies','none');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Origin-Agent-Cluster','?1');
  if(isAdminUrl(req.path)){
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
    res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  }
  if(prod)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
});
app.use(base+'/assets',express.static(path.join(__dirname,'public/assets'),{immutable:prod,maxAge:prod?'7d':0}));
app.get(base+'/assets/img/berita/:file',(req,res,next)=>{
 const file=String(req.params.file||'');
 if(!/^[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(file))return next();
 store.getImage(file).then(img=>{
  if(!img)return next();
  res.set('Cache-Control',prod?'public, max-age=604800, immutable':'no-store');
  res.type(img.mime).send(img.data);
 }).catch(next);
});
app.use(express.urlencoded({extended:false,limit:'100kb',parameterLimit:100}));
app.use(express.json({limit:'100kb'}));
const sessionStore=store.mode==='mysql'&&store.pool?new MySQLSessionStore({pool:store.pool,ttlMs:SESSION_IDLE_MS}):undefined;
app.use(session({
  name:ADMIN_COOKIE,
  secret:sessionSecret||'local-only-not-for-production-change-this',
  store:sessionStore,
  resave:false,
  saveUninitialized:false,
  rolling:true,
  cookie:{httpOnly:true,sameSite:'strict',secure:prod,maxAge:SESSION_IDLE_MS,path:ADMIN_PATH}
}));
const clearAdminCookie=res=>{
  for(const cookiePath of [ADMIN_PATH,base,'/']){
    res.clearCookie(ADMIN_COOKIE,{path:cookiePath,sameSite:'strict',secure:prod});
  }
  res.clearCookie('mediacenter.sid',{path:'/'});
};
const userAgentHash=req=>crypto.createHash('sha256').update(String(req.get('user-agent')||'')).digest('hex').slice(0,32);
app.use((req,res,next)=>{
  if(!req.session||!req.session.adminId)return next();
  const now=Date.now();
  const loginAt=Number(req.session.loginAt)||now;
  const lastSeen=Number(req.session.lastSeen)||now;
  const expired=now-loginAt>SESSION_MAX_MS||now-lastSeen>SESSION_IDLE_MS||(req.session.uaHash&&req.session.uaHash!==userAgentHash(req));
  if(expired){
    return req.session.destroy(()=>{
      clearAdminCookie(res);
      res.redirect(303,ADMIN_PATH+'?status=expired');
    });
  }
  req.session.lastSeen=now;
  req.session.cookie.maxAge=SESSION_IDLE_MS;
  next();
});
app.use((req,res,next)=>{
  const adminPath=isAdminUrl(req.path);
  if(adminPath&&!req.session)return next(new Error('Sesi tidak tersedia. Muat ulang halaman.'));
  if(adminPath&&!req.session.csrf)req.session.csrf=crypto.randomBytes(32).toString('hex');
  let adminPage='';
  if(adminPath){
    const rel=req.path.slice(ADMIN_PATH.length).replace(/\/+$/,'')||'/';
    adminPage=rel==='/'||rel==='/dasbor'?(req.session.adminId?'dashboard':'login'):
      rel==='/berita'?'berita':rel==='/berita/tambah'?'tambah':rel==='/berita/edit'?'edit':'other';
  }
  const currentPage=adminPage==='dashboard'?'index.php':adminPage==='berita'?'berita.php':adminPage==='tambah'?'tambah-berita.php':adminPage==='edit'?'edit-berita.php':'login.php';
  const username=req.session?.username||'Administrator';
  const logged=Boolean(req.session?.adminId);
  const loginAt=Number(req.session?.loginAt)||0;
  const sessionIdleAt=logged?Date.now()+SESSION_IDLE_MS:0;
  const sessionMaxAt=logged&&loginAt?loginAt+SESSION_MAX_MS:0;
  const publicPath=req.path.slice(base.length).replace(/\/+$/,'')||'/';
  const navActive=publicPath==='/berita'||publicPath==='/detail'?'berita':publicPath==='/tentang'?'tentang':'beranda';
  res.locals={...res.locals,...H,...H.nowTime(),csrfToken:req.session?.csrf||'',navActive,
    username,initial:[...username][0]?.toUpperCase()||'A',adminBase:ADMIN_PATH,adminPage,
    currentPage,isDashboard:adminPage==='dashboard',kontenActive:['berita','tambah','edit'].includes(adminPage),
    sessionIdleAt,sessionMaxAt,loginSince:logged&&loginAt?H.waktuAdmin(new Date(loginAt)):''};
  next();
});
const isValidCsrf=(req)=>{
  const expected=Buffer.from(req.session.csrf||'','utf8');const received=Buffer.from(String(req.body?.csrf_token||''),'utf8');
  return expected.length===received.length && expected.length>0 && crypto.timingSafeEqual(expected,received);
};
function csrf(req,res,next){if(!isValidCsrf(req))return res.status(419).send('Permintaan tidak valid (CSRF). Segarkan halaman dan coba lagi.');next();}
const wantsJson=req=>req.get('x-requested-with')==='fetch'||String(req.get('accept')||'').includes('application/json');
function auth(req,res,next){
  if(req.session.adminId)return next();
  clearAdminCookie(res);
  if(wantsJson(req))return res.status(401).json({ok:false,expired:true});
  return res.redirect(303,req.path===ADMIN_PATH+'/dasbor'?ADMIN_PATH:ADMIN_PATH+'?status=expired');
}
const wrap=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res,next)).catch(next);
const text=(s,max=255)=>String(s||'').replace(/[\x00-\x08\x0B-\x1F\x7F]/g,'').trim().slice(0,max);
const positive=(x,d=1)=>Math.max(1,Number.parseInt(x,10)||d);
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().startsWith(s);}
const renderPublic=(res,name,data={})=>res.render('public/'+name,data);
const renderAdmin=(res,name,data={})=>res.render('admin/'+name,data);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024},fileFilter:(req,file,cb)=>{const allowed=/^image\/(jpeg|png|webp)$/.test(file.mimetype);if(!allowed)req.uploadError='Format gambar hanya JPG, PNG, atau WebP.';cb(null,allowed);}}).single('gambar');
const imageDir=path.join(__dirname,'public/assets/img/berita');
// Pengambilan gambar dari tautan URL (fitur edit berita).
const REMOTE_IMAGE_MAX=2*1024*1024;
function isBlockedIp(ip){
 const v6=ip.toLowerCase();
 if(v6.includes(':')){
  if(v6==='::1'||v6==='::'||v6.startsWith('fc')||v6.startsWith('fd')||v6.startsWith('fe80'))return true;
  const mapped=v6.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return mapped?isBlockedIp(mapped[1]):false;
 }
 const o=ip.split('.').map(Number);
 if(o.length!==4||o.some(n=>!Number.isInteger(n)||n<0||n>255))return true;
 if(o[0]===0||o[0]===10||o[0]===127)return true;
 if(o[0]===172&&o[1]>=16&&o[1]<=31)return true;
 if(o[0]===192&&o[1]===168)return true;
 if(o[0]===169&&o[1]===254)return true;
 if(o[0]===100&&o[1]>=64&&o[1]<=127)return true;
 return false;
}
async function assertPublicHost(hostname){
 let addrs;
 try{addrs=await dnsPromises.lookup(hostname,{all:true,verbatim:true});}
 catch{throw new Error('Alamat host gambar tidak ditemukan.');}
 if(addrs.some(a=>isBlockedIp(a.address)))throw new Error('URL gambar menunjuk ke alamat jaringan internal dan tidak diizinkan.');
}
async function fetchRemoteImage(raw,ttlHops=3){
 let url;
 try{url=new URL(raw);}catch{throw new Error('URL gambar tidak valid.');}
 if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error('URL gambar harus dimulai dengan http:// atau https://.');
 if(!/^[\w.-]+\.[a-z]{2,}$/i.test(url.hostname))throw new Error('Nama host pada URL gambar tidak valid.');
 await assertPublicHost(url.hostname);
 let res;
 try{
  res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'user-agent':'MediaCenterHST/1.0 (+verifikasi gambar)','accept':'image/jpeg,image/png,image/webp'}});
 }catch{
  throw new Error('Tidak dapat mengambil gambar dari tautan tersebut (host tidak merespons).');
 }
 if([301,302,303,307,308].includes(res.status)&&res.headers.get('location')){
  if(res.body)try{await res.body.cancel();}catch{}
  if(ttlHops<=0)throw new Error('Terlalu banyak pengalihan pada URL gambar.');
  let next;
  try{next=new URL(res.headers.get('location'),url);}catch{throw new Error('Pengalihan URL gambar tidak valid.');}
  return fetchRemoteImage(next.href,ttlHops-1);
 }
 if(!res.ok)throw new Error(`Tautan gambar merespons dengan status HTTP ${res.status}.`);
 if(!/^image\/(jpeg|png|webp)\b/i.test(String(res.headers.get('content-type')||'')))throw new Error('Tautan tidak mengarah ke gambar JPG, PNG, atau WebP.');
 const len=Number(res.headers.get('content-length'))||0;
 if(len>REMOTE_IMAGE_MAX)throw new Error('Ukuran gambar dari tautan maksimal 2 MB.');
 const reader=res.body.getReader();const chunks=[];let total=0;
 for(;;){
  const {done,value}=await reader.read();
  if(done)break;
  total+=value.length;
  if(total>REMOTE_IMAGE_MAX){try{await reader.cancel();}catch{}throw new Error('Ukuran gambar dari tautan maksimal 2 MB.');}
  chunks.push(value);
 }
 const buffer=Buffer.concat(chunks);
 const ext=fileExtension(buffer);
 if(!ext)throw new Error('Isi tautan bukan gambar JPG, PNG, atau WebP yang valid.');
 return {buffer,ext,contentType:'image/'+(ext==='jpg'?'jpeg':ext)};
}
function fileExtension(buffer){
 if(buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)return 'jpg';
 if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';
 return null;
}
const IMAGE_MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
async function saveImage(file){
 if(!file)return null;
 const ext=fileExtension(file.buffer);
 if(!ext)throw new Error('Format gambar hanya JPG, PNG, atau WebP.');
 return writeImage(file.buffer,ext);
}
async function writeImage(buffer,ext){
 const name=crypto.randomBytes(12).toString('hex')+'.'+ext;
 if(store.mode==='mysql'){await store.putImage(name,IMAGE_MIME[ext],buffer);return 'berita/'+name;}
 fs.mkdirSync(imageDir,{recursive:true});
 fs.writeFileSync(path.join(imageDir,name),buffer,{flag:'wx'});
 return 'berita/'+name;
}
async function deleteImage(name){
 if(!name)return;
 const file=path.basename(name);
 if(![file,'berita/'+file].includes(name)||!/^[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(file))return;
 if(store.mode==='mysql'){try{await store.removeImage(file);}catch(e){console.warn('Gagal menghapus gambar:',e.message);}return;}
 const f=path.join(imageDir,file);
 if(f.startsWith(imageDir+path.sep))try{fs.unlinkSync(f);}catch(e){if(e.code!=='ENOENT')console.warn('Gagal menghapus gambar:',e.message);}
}
function newsFields(req){
 const b=req.body||{};
 return {judul:text(b.judul,255),isi:text(b.isi,100000),kategori:text(b.kategori,100),tanggal:text(b.tanggal,10),penulis:text(b.penulis,150),sumber:text(b.sumber,255)};
}
function fieldErrors(d){const errors=[];
 if(d.judul.length<3)errors.push('Judul berita minimal 3 karakter.');
 if(d.isi.length<10)errors.push('Isi berita minimal 10 karakter.');
 if(!d.kategori)errors.push('Kategori wajib diisi.');
 if(!validDate(d.tanggal))errors.push('Tanggal publikasi tidak valid.');
 else if(d.tanggal>H.todayIso())errors.push('Tanggal publikasi tidak boleh melewati hari ini.');
 return errors;
}
const uploadHandler=(req,res,next)=>upload(req,res,err=>{
 if(err){req.uploadError=err.code==='LIMIT_FILE_SIZE'?'Ukuran gambar maksimal 2 MB.':err.message;req.file=undefined;}
 next();
});
// WEBSITE PUBLIK
app.get('/',(req,res)=>res.redirect(base+'/'));
app.get(base,wrap(async(req,res)=>{
 const n=await store.latestNews(7);
   renderPublic(res,'index',{navActive:'beranda',pageTitle:'Media Center Kabupaten Hulu Sungai Tengah',pageDescription:'Kanal informasi resmi Pemerintah Kabupaten Hulu Sungai Tengah untuk berita, pelayanan publik, dan perkembangan daerah.',utama:n[0]||null,updates:n.slice(1)});
}));
app.get(base+'/berita',wrap(async(req,res)=>{
 const q=text(req.query.q,100),kategori=text(req.query.kategori,100),tahun=Number(req.query.tahun)||0,urut=req.query.urut==='terlama'?'terlama':'terbaru',page=positive(req.query.page);
 const limit=9;const {rows,total}=await store.listNews({q,kategori,tahun,urut,page,limit});
 const categories=await store.categories(),archiveYears=await store.years();
   renderPublic(res,'berita',{navActive:'berita',pageTitle:'Berita dan Informasi | Media Center HST',pageDescription:'Pusat berita dan informasi resmi Pemerintah Kabupaten Hulu Sungai Tengah.',q,kategori,tahun,urut,page,newsRows:rows,totalBerita:total,totalPages:Math.max(1,Math.ceil(total/limit)),start:total?(page-1)*limit+1:0,end:Math.min(page*limit,total),hasFilter:Boolean(q||kategori||tahun||urut==='terlama'),categories,archiveYears});
}));
app.get(base+'/detail',wrap(async(req,res)=>{
 const slug=text(req.query.slug,180);
 if(!slug)return res.redirect(base+'/berita');
 const berita=/^[a-z0-9_-]+$/i.test(slug)?await store.getBySlug(slug):null;
 const kategori=berita?.kategori||'Informasi',penulis=berita?.penulis||'Media Center HST',sumber=berita?.sumber||'Belum dicantumkan';
 const relatedItems=berita?(await store.listNews({kategori,limit:8})).rows.filter(x=>x.id!==berita.id).slice(0,3):[];
 if(!berita)res.status(404);
   renderPublic(res,'detail',{navActive:'berita',pageTitle:berita?`${berita.judul} | Media Center HST`:'Berita tidak ditemukan | Media Center HST',pageDescription:berita?H.excerpt(berita.isi):'Informasi tidak ditemukan.',berita,kategori,penulis,sumber,gambar:berita?H.gambarUrl(berita.gambar):'',publishedText:berita?H.tanggalBerita(berita.tanggal):'',updatedText:berita?H.waktuAdmin(berita.updated_at):'',paragraphs:berita?String(berita.isi).split(/\r?\n+/).map(s=>s.trim()).filter(Boolean):[],relatedItems});
}));
app.get(base+'/tentang',wrap(async(req,res)=>{
  const settings=H.defaultSettings;
  let portalUrl=settings.portal_url||'https://www.hstkab.go.id/';
  try{const parsed=new URL(portalUrl);if(parsed.protocol!=='https:'||!/(^|\.)hstkab\.go\.id$/.test(parsed.hostname))portalUrl='https://www.hstkab.go.id/';}catch{portalUrl='https://www.hstkab.go.id/';}
  renderPublic(res,'tentang',{navActive:'tentang',pageTitle:'Tentang Media Center | Kabupaten Hulu Sungai Tengah',pageDescription:H.excerpt(settings.about_description,155),settings,portalUrl});
}));

// Pembatasan percobaan login per alamat IP dan per username.
const loginAttempts=new Map();
const usernameAttempts=new Map();
const LOGIN_WINDOW_MS=15*60*1000;
const LOGIN_MAX_ATTEMPTS=5;
const LOGIN_MAX_USERNAME_ATTEMPTS=10;
function loginRecord(map,key,now){
 let record=map.get(key);
 if(!record||now-record.start>LOGIN_WINDOW_MS){record={start:now,count:0};map.set(key,record);}
 return record;
}
function loginKeys(req){
 const ip=String(req.ip||req.socket.remoteAddress||'unknown');
 const username=text(req.body?.username,100).toLocaleLowerCase('id-ID');
 return {ip,username};
}
function loginBlocked(req){
 const now=Date.now(),keys=loginKeys(req);
 const ipRecord=loginRecord(loginAttempts,keys.ip,now);
 const userRecord=keys.username?loginRecord(usernameAttempts,keys.username,now):null;
 return {blocked:ipRecord.count>=LOGIN_MAX_ATTEMPTS||Boolean(userRecord&&userRecord.count>=LOGIN_MAX_USERNAME_ATTEMPTS),record:ipRecord};
}
function registerLoginFailure(req){
 const now=Date.now(),keys=loginKeys(req);
 loginRecord(loginAttempts,keys.ip,now).count++;
 if(keys.username)loginRecord(usernameAttempts,keys.username,now).count++;
}
function clearLoginFailures(req){
 const keys=loginKeys(req);
 loginAttempts.delete(keys.ip);
 if(keys.username)usernameAttempts.delete(keys.username);
}
function loginThrottle(req,res,next){
 const state=loginBlocked(req);
 if(state.blocked){
  res.setHeader('Retry-After',String(Math.ceil((LOGIN_WINDOW_MS-(Date.now()-state.record.start))/1000)));
  return res.status(429).render('admin/login',{error:'Terlalu banyak percobaan masuk. Silakan coba kembali beberapa menit lagi.',notice:''});
 }
 next();
}
const loginCleanup=setInterval(()=>{
 const now=Date.now();
 for(const map of [loginAttempts,usernameAttempts])for(const [key,value] of map)if(now-value.start>LOGIN_WINDOW_MS)map.delete(key);
},LOGIN_WINDOW_MS);
if(typeof loginCleanup.unref==='function')loginCleanup.unref();

// ADMIN
async function renderDashboard(req,res){
 const s=await store.stats(),latestRows=await store.latestNews(5),chartData=await store.activity();
 renderAdmin(res,'index',{
  totalBerita:Number(s.totalBerita),totalKategori:Number(s.totalKategori),totalGambar:Number(s.totalGambar),
  updateTerakhir:H.waktuAdmin(s.latest),persenGambar:s.totalBerita?Math.round(s.totalGambar/s.totalBerita*100):0,
  latestRows,chartData,chartMax:Math.max(1,...chartData.map(x=>x.count)),isDeleted:req.query.status==='deleted'
 });
}
app.get(ADMIN_PATH,wrap(async(req,res)=>{
 if(req.session.adminId)return renderDashboard(req,res);
 const status=text(req.query.status,20);
 const notice=status==='logout'?'Anda telah keluar. Sesi administrator sudah berakhir.':
  status==='expired'?'Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.':'';
 renderAdmin(res,'login',{error:'',notice,status});
}));
app.get(ADMIN_PATH+'/login',(req,res)=>res.redirect(303,ADMIN_PATH));
app.get(ADMIN_PATH+'/dasbor',auth,(req,res)=>res.redirect(303,ADMIN_PATH));
app.post(ADMIN_PATH,loginThrottle,csrf,wrap(async(req,res)=>{
 if(req.session.adminId)return res.redirect(303,ADMIN_PATH);
 const username=text(req.body.username,100);
 const user=await store.getUser(username);
 const password=String(req.body.password||'').slice(0,128);
 const stored=user?.password?.replace(/^\$2y\$/,'$2a$')||'$2a$10$NAWSEAGZrEoPpvNsG2qvC.BtGkDDGMuDDymd.dpb89ugwuCZbYPBO';
 const valid=await bcrypt.compare(password,stored);
 if(!user||!valid){
  registerLoginFailure(req);
  return res.status(401).render('admin/login',{error:'Username atau password tidak sesuai.',notice:''});
 }
 clearLoginFailures(req);
 req.session.regenerate(err=>{
  if(err)return res.status(500).send('Sesi gagal dibuat. Silakan coba lagi.');
  req.session.adminId=user.id;
  req.session.username=user.username;
  req.session.csrf=crypto.randomBytes(32).toString('hex');
  req.session.loginAt=Date.now();
  req.session.lastSeen=Date.now();
  req.session.uaHash=userAgentHash(req);
  req.session.cookie.maxAge=SESSION_IDLE_MS;
  req.session.save(saveErr=>{
   if(saveErr)return res.status(500).send('Sesi gagal disimpan. Silakan coba lagi.');
   res.redirect(303,ADMIN_PATH);
  });
 });
}));
app.post(ADMIN_PATH+'/logout',auth,csrf,(req,res)=>{
 const finish=()=>{
  clearAdminCookie(res);
  res.setHeader('Clear-Site-Data','"cache"');
  res.redirect(303,ADMIN_PATH+'?status=logout');
 };
 req.session.destroy(()=>finish());
});
app.get(ADMIN_PATH+'/logout',(req,res)=>res.redirect(303,ADMIN_PATH));
// Penjaga sesi di sisi klien: memeriksa status dan memperbarui batas waktu hanya saat ada aktivitas.
app.get(ADMIN_PATH+'/sesi',auth,(req,res)=>{
  const now=Date.now(),loginAt=Number(req.session.loginAt)||now;
  res.set('Cache-Control','no-store');
  res.json({ok:true,username:req.session.username||'Administrator',idleUntil:now+SESSION_IDLE_MS,maxAt:loginAt+SESSION_MAX_MS,serverNow:now});
});
app.get(ADMIN_PATH+'/gambar-pratinjau',auth,wrap(async(req,res)=>{
 const raw=text(req.query.url,2048);
 if(!raw)return res.status(400).json({error:'URL gambar masih kosong.'});
 try{
  const img=await fetchRemoteImage(raw);
  res.set('Cache-Control','no-store');
  res.type(img.contentType);
  res.send(img.buffer);
 }catch(err){
  res.status(400).json({error:err.message||'Gambar tidak dapat dimuat dari tautan tersebut.'});
 }
}));
async function doDelete(req){
 const id=Math.max(0,parseInt(req.body.id,10)||0),r=id?await store.getById(id):null;
 if(r){await store.deleteNews(id);await deleteImage(r.gambar);}
}
app.get(ADMIN_PATH+'/berita',auth,wrap(async(req,res)=>{
  const q=text(req.query.q,100),kategori=text(req.query.kategori,100),page=positive(req.query.page),limit=10;
  const {rows,total}=await store.listNews({q,kategori,page,limit});
  const categories=await store.categories();
  renderAdmin(res,'berita',{q,kategori,page,total,totalPages:Math.max(1,Math.ceil(total/limit)),rows,categories,status:text(req.query.status,20)});
}));
app.post(ADMIN_PATH+'/berita',auth,csrf,wrap(async(req,res)=>{
 if(req.body.action!=='delete')return res.status(400).send('Aksi tidak dikenal.');
 await doDelete(req);
 res.redirect(303,ADMIN_PATH+'/berita?status=deleted');
}));
function blankData(){return {judul:'',isi:'',kategori:'',tanggal:H.todayIso(),penulis:'',sumber:'',gambar:null,gambar_url:'',sumber_gambar:'upload'};}
app.get(ADMIN_PATH+'/berita/tambah',auth,(req,res)=>renderAdmin(res,'tambah-berita',{data:blankData(),errors:[]}));
app.post(ADMIN_PATH+'/berita/tambah',auth,uploadHandler,csrf,wrap(async(req,res)=>{
 const data={...newsFields(req),gambar_url:text(req.body.gambar_url,2048),sumber_gambar:text(req.body.sumber_gambar,10)},errors=fieldErrors(data);if(req.uploadError)errors.push(req.uploadError);
 let image=null;
 if(!errors.length)try{
 if(req.file)image=await saveImage(req.file);
 else if(data.gambar_url){const img=await fetchRemoteImage(data.gambar_url);image=await writeImage(img.buffer,img.ext);}
 await store.createNews({...data,gambar:image});return res.redirect(303,ADMIN_PATH+'/berita?status=created');
}catch(err){await deleteImage(image);errors.push(err.message||'Gagal menyimpan gambar.');}
 res.status(422).render('admin/tambah-berita',{data,errors});
}));
app.get(ADMIN_PATH+'/berita/edit',auth,wrap(async(req,res)=>{
 const data=await store.getById(Math.max(0,parseInt(req.query.id,10)||0));if(!data)return res.status(404).send('Berita tidak ditemukan.');
 renderAdmin(res,'edit-berita',{data,errors:[]});
}));
app.post(ADMIN_PATH+'/berita/edit',auth,uploadHandler,csrf,wrap(async(req,res)=>{
 const id=Math.max(0,parseInt(req.query.id,10)||0),old=await store.getById(id);if(!old)return res.status(404).send('Berita tidak ditemukan.');
 const data={...old,...newsFields(req)},errors=fieldErrors(data);if(req.uploadError)errors.push(req.uploadError);
 let fresh=null;
 const urlInput=text(req.body.gambar_url,2048);
 if(!errors.length)try{
 if(req.file){fresh=await saveImage(req.file);data.gambar=fresh;}
 else if(!('hapus_gambar' in req.body)&&urlInput){
  const img=await fetchRemoteImage(urlInput);
  fresh=await writeImage(img.buffer,img.ext);
  data.gambar=fresh;
 }
 else if('hapus_gambar' in req.body)data.gambar=null;
 await store.updateNews(id,data);
 if(old.gambar&&old.gambar!==data.gambar)await deleteImage(old.gambar);
 return res.redirect(303,ADMIN_PATH+'/berita?status=updated');
}catch(err){
 errors.push(err.message||'Gagal menyimpan gambar.');
 if(fresh){await deleteImage(fresh);data.gambar=old.gambar;}
}
 res.status(422).render('admin/edit-berita',{data,errors});
}));
// URL kompatibilitas dari aplikasi PHP sebelumnya untuk halaman publik.
const legacy={
 '/mediacenter/index.php':base+'/', '/mediacenter/berita.php':base+'/berita', '/mediacenter/detail.php':base+'/detail','/mediacenter/tentang.php':base+'/tentang'
};
for(const [p,v] of Object.entries(legacy)){
 const q=req=>req.url.includes('?')?req.url.slice(req.url.indexOf('?')):'';
 app.get(base+p,(req,res)=>res.redirect(301,v+q(req)));
}
app.use((req,res)=>res.status(404).send('<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 - Tidak ditemukan</title><main><h1>404 - Halaman tidak ditemukan</h1><p>Alamat yang Anda tuju tidak tersedia.</p><a href="'+H.baseUrl+'/">Kembali ke beranda</a></main></html>'));
app.use((err,req,res,next)=>{
 console.error(err);
 if(res.headersSent)return next(err);
 res.status(500).send(prod?'Terjadi kesalahan pada server.':'Kesalahan server: '+H.escapeHtml(err.message));
});
if(require.main===module){const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log(`Media Center JavaScript aktif: http://localhost:${port}${base}/ (DB_MODE=${store.mode})`));}
module.exports=app;
