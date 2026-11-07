/* Disposable PostgreSQL only. Never reads DATABASE_URL or connects to Supabase. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawnSync}=require("node:child_process");
test("expense corrections persist securely, audit changes, reject stale saves and protect payroll",{timeout:60000},t=>{
 if(spawnSync("which",["initdb"]).status!==0)return t.skip("PostgreSQL unavailable");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-expense-corrections-")),data=path.join(dir,"data");
 const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:"utf8",timeout:20000});assert.equal(r.status,0,r.stderr+"\n"+r.stdout);};
 let started=false;
 try{
  run("initdb",["-D",data,"-U","runner","-A","trust","--no-locale","-E","UTF8"]);
  run("pg_ctl",["-D",data,"-l",path.join(dir,"log"),"-o",`-k ${dir} -p 55438 -c listen_addresses=''`,"start"]);started=true;
  run("psql",["-X","-h",dir,"-p","55438","-U","runner","-d","postgres","-v","ON_ERROR_STOP=1","-q",
   "-f",path.join(__dirname,"../../../scripts/src/test-expense-corrections.sql")]);
 }finally{
  if(started)spawnSync("pg_ctl",["-D",data,"-m","immediate","stop"],{stdio:"ignore"});
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
