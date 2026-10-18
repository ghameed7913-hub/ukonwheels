const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../public/payroll-payments.js"),"utf8");
function setup(){
  const calls=[];
  const c=vm.createContext({window:{},SUPABASE_CONFIGURED:true,currentSession:{user:{id:"admin"}},
    sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:{payslips:[{id:"P1",paymentVersion:4}],expenses:[],canManage:true}};}}});
  vm.runInContext(source,c);return {c,api:c.window.PayrollPayments,calls};
}
test("Payment API uses saved versions and atomic RPCs, not separate expense writes",async()=>{
  const {api,calls}=setup();assert.throws(()=>api.setStatus("P1","Paid"),/Refresh/);
  await api.read();await api.setStatus("P1","Paid");await api.create({id:"P2"},"Unpaid");
  assert.equal(calls[1].args.p_expected_version,4);assert.equal(calls[1].args.p_status,"Paid");
  assert.equal(calls[2].name,"create_portal_payslip");
});
test("Changing account invalidates versions and late responses cannot enter another account",async()=>{
  const {api,c}=setup();await api.read();c.currentSession={user:{id:"other"}};
  assert.throws(()=>api.setStatus("P1","Paid"),/Refresh/);
  let finish;c.sb.rpc=()=>new Promise(r=>finish=r);
  const pending=api.read();c.currentSession={user:{id:"third"}};
  finish({data:{payslips:[],expenses:[]}});await assert.rejects(pending,/sign-in changed/);
});
test("Missing setup and database failures are explicit",async()=>{
  const {api,c}=setup();c.sb.rpc=async()=>({error:{code:"PGRST202"}});
  await assert.rejects(api.read(),/supabase\/payslip-payments.sql/);
  c.sb.rpc=async()=>({error:{message:"HR management access required"}});
  await assert.rejects(api.create({},"Paid"),/HR management/);
});
