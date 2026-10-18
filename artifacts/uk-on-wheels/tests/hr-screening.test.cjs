const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const vm=require("node:vm");
const {webcrypto}=require("node:crypto");
const source=readFileSync(resolve(__dirname,"../public/hr-screening-api.js"),"utf8");
function setup(sb) {
  const c={window:{},sb,SUPABASE_CONFIGURED:true,currentSession:{user:{id:"admin"}},crypto:webcrypto,Uint8Array};
  vm.createContext(c);vm.runInContext(source,c);return {api:c.window.HRScreeningAPI,c};
}
function file(type,bytes,name="evidence.pdf") {
  return {name,type,size:bytes.length,slice(){return {arrayBuffer:async()=>Uint8Array.from(bytes).buffer}}};
}
test("HR access is server-owned, setup failures explicit and no local persistence",async()=>{
  const {api}=setup({rpc:async(name,args)=>({data:!args.p_write})});
  const caps=await api.capabilities();assert.equal(caps.canRead,true);assert.equal(caps.canWrite,false);
  const missing=setup({rpc:async()=>({error:{code:"PGRST202"}})}).api;
  await assert.rejects(missing.capabilities(),/hr-screening-patch.sql/);
  assert.doesNotMatch(source,/localStorage|sessionStorage/);
});
test("HR draft retries reuse their identifier but confirmed new records get new identifiers",async()=>{
  const calls=[];let fail=true;
  const {api}=setup({rpc:async(name,{p_input})=>{
    calls.push(p_input);return fail?{error:{message:"Connection lost"}}:{data:{id:p_input.id,version:1}};
  }});
  await assert.rejects(api.save({version:0,data:{}}),/Connection lost/);
  fail=false;
  await api.save({version:0,data:{}});
  assert.equal(calls[0].id,calls[1].id);
  await api.save({version:0,data:{}});
  assert.notEqual(calls[1].id,calls[2].id);
});
test("HR uploaded files require matching signatures, allowed types and size",async()=>{
  let uploads=0;
  const {api}=setup({storage:{from:()=>({upload:async()=>{uploads++;return {data:{}}}})}});
  for (const f of [file("image/svg+xml",[1,2]),file("application/pdf",[1,2]),{type:"image/png",size:10485761}])
    await assert.rejects(api.upload("employee",f,"Identity",1),/Choose|contents/);
  assert.equal(uploads,0);
});
test("HR upload retries reuse durable object path and register expected record version",async()=>{
  let uploads=0,fail=true;const calls=[];
  const {api}=setup({
    storage:{from:bucket=>{assert.equal(bucket,"hr-screening");return {upload:async(path,f,options)=>{uploads++;assert.equal(options.upsert,false);return {data:{path}}}}}},
    rpc:async(name,args)=>{calls.push(args);return fail?{error:{message:"Temporary metadata failure"}}:{data:{id:"doc",recordVersion:2}}}
  });
  const f=file("application/pdf",Buffer.from("%PDF-1.7\n"));
  await assert.rejects(api.upload("employee",f,"Identity",1),/Temporary metadata/);
  fail=false;const doc=await api.upload("employee",f,"Identity",1);
  assert.equal(uploads,1);assert.equal(calls[0].p_path,calls[1].p_path);
  assert.equal(calls[1].p_version,1);assert.equal(doc.recordVersion,2);
});
test("HR sign-in change during upload prevents document registration",async()=>{
  let writes=0,context;
  const s=setup({storage:{from:()=>({upload:async()=>{context.currentSession={user:{id:"other"}};return {data:{}}}})},
    rpc:async()=>{writes++;return {data:{}}}});
  context=s.c;
  await assert.rejects(s.api.upload("employee",file("application/pdf",Buffer.from("%PDF-1.7")),"Identity",1),/sign-in changed/);
  assert.equal(writes,0);
});
test("HR document URLs expire and require a signed-in session",async()=>{
  let args;
  const {api,c}=setup({storage:{from:()=>({createSignedUrl:async(...a)=>{args=a;return {data:{signedUrl:"https://example.invalid/signed"}}}})}});
  assert.equal(await api.documentUrl("private/path"),"https://example.invalid/signed");
  assert.equal(args[1],120);assert.equal(args[2].download,true);
  c.currentSession=null;
  await assert.rejects(api.documentUrl("private/path"),/Sign in/);
});
test("HR list fetches all pages and document lookups are employee-scoped",async()=>{
  const filters=[],ranges=[];
  const {api}=setup({from:table=>({
    select(){return this},eq(key,value){filters.push([table,key,value]);return this},
    order(){return this},range(a,b){ranges.push([a,b]);return Promise.resolve({data:a===0?Array.from({length:500},()=>({id:"row"})):[]})},
    single(){return Promise.resolve({data:{id:"employee"}})}
  })});
  assert.equal((await api.list()).length,500);assert.deepEqual(ranges,[[0,499],[500,999]]);
  await api.get("employee");
  assert.ok(filters.some(f=>f[0]==="hr_employee_documents"&&f[1]==="employee_id"&&f[2]==="employee"));
});
test("HR route is separate from Create User and the UI never marks uploads as passed",()=>{
  const html=readFileSync(resolve(__dirname,"../index.html"),"utf8");
  assert.match(html,/function drawEmployeeRegistration\(c\)\{\s*return HRRegistration.draw\(c\)/);
  const ui=readFileSync(resolve(__dirname,"../public/hr-registration.js"),"utf8");
  assert.match(ui,/does not perform automated/);assert.doesNotMatch(ui,/\blocalStorage\s*(?:\.\s*(?:setItem|getItem|removeItem)|\[)/);
});
test("HR list constrains grid min-content width and scrolls inside its panel on phones",()=>{
  const css=readFileSync(resolve(__dirname,"../public/hr-registration.css"),"utf8");
  assert.match(css,/\.hrr-wrap\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*min-width:0/);
  assert.match(css,/\.hrr-wrap \.scroll\{[^}]*max-width:100%[^}]*overflow-x:auto/);
  assert.match(css,/\.hrr-wrap \.panel,\.hrr-wrap \[data-body\]\{min-width:0/);
});
