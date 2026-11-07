const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const source=html.slice(html.indexOf("async function createLinkedBooking("),html.indexOf("function toggleCustomerTypeFields("));
function setup(){
  const calls=[];
  const ctx=vm.createContext({
    getStore:()=>({businesses:[]}),
    sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:{id:"booking"}};}}
  });
  vm.runInContext(source,ctx);
  return {calls,create:ctx.createLinkedBooking};
}
test("Private booking without portal email reaches the secured RPC with null",async()=>{
  const s=setup();
  await s.create({customerType:"Private",vehicle:"Test Vehicle",reg:"TEST1"});
  assert.equal(s.calls[0].args.p_private_client_email,null);
  assert.equal(s.calls[0].args.p_business_id,null);
});
test("Whitespace-only private email is optional; supplied email is passed for server validation",async()=>{
  const s=setup();
  await s.create({customerType:"Private",privateCustomerEmail:"  "});
  await s.create({customerType:"Private",privateCustomerEmail:" client@example.test "});
  assert.equal(s.calls[0].args.p_private_client_email,null);
  assert.equal(s.calls[1].args.p_private_client_email,"client@example.test");
});
test("Business booking still requires a saved registered business",async()=>{
  const s=setup();
  await assert.rejects(s.create({customerType:"Business",business:"Unknown"}),/registered business/);
  assert.equal(s.calls.length,0);
});
test("SQL permits absent email but retains active Client matching and staff authorisation",()=>{
  const sql=fs.readFileSync(path.join(__dirname,"../../../supabase/driver_photo_workflow_patch.sql"),"utf8");
  assert.match(sql,/elsif nullif\(trim\(p_private_client_email\), ''\) is not null then/);
  assert.match(sql,/lower\(role\) = 'client' and lower\(status\) = 'active'/);
  assert.match(sql,/Booking creation permission required/);
});
