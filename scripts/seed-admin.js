require('dotenv').config();
const bcrypt=require('bcryptjs');
const repo=require('../lib/repository');
(async()=>{
  const username=process.argv[2]||process.env.ADMIN_USERNAME;
  const password=process.argv[3]||process.env.ADMIN_PASSWORD;
  if(!username||!password||password.length<10){
    console.error('Gunakan: npm run seed:admin -- username "password-minimal-10-karakter"');
    process.exit(1);
  }
  if(await repo.getUser(username)){console.error('Username sudah ada, tidak menimpa password.');process.exit(1);}
  const hash=await bcrypt.hash(password,12);
  await repo.createUser(username,hash);
  console.log('Admin berhasil dibuat:',username);
  process.exit(0);
})().catch(e=>{console.error('Gagal:',e.message);process.exit(1)});
