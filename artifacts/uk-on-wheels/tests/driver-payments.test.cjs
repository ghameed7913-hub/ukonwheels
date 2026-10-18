const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const apiSource=fs.readFileSync(path.join(__dirname,"../public/driver-payments.js"),"utf8");
const uiSource=fs.readFileSync(path.join(__dirname,"../public/driver-payments-ui.js"),"utf8");
function setup(){
  let calls=0;
  const c=vm.createContext({window:{addEventListener(){}},document:{getElementById:()=>null,addEventListener(){}},
    role:"driver",driverMobileTab:"payments",currentSession:{user:{id:"driver-a",email:"a@example.invalid"}},currentUser:{email:"a@example.invalid"},
    sb:{rpc:async name=>{calls++;assert.equal(name,"read_own_portal_store");return {data:{payslips:[]}};}}});
  vm.runInContext(uiSource,c);c.DriverPaymentsUI=c.window.DriverPaymentsUI;
  vm.runInContext(apiSource,c);c.DriverPayments=c.window.DriverPayments;
  return {c,api:c.DriverPayments,ui:c.DriverPaymentsUI,calls:()=>calls};
}
const p=(id,extra={})=>({id,profileId:"driver-a",name:"Driver A",month:"2026-10",net:850,...extra});
test("Driver reads only their own HR payslips via scoped RPC; no name or conflicting-ID fallback",async()=>{
  const {c,api}=setup();
  c.sb.rpc=async(name,args)=>{
    assert.equal(name,"read_own_portal_store");assert.equal(args,undefined);
    return {data:{payslips:[p("own"),p("foreign",{profileId:"driver-b",email:"a@example.invalid"}),
      {id:"legacy",email:"A@EXAMPLE.INVALID",net:80},p("null-id",{profileId:null,email:"a@example.invalid"}),
      p("same-name",{profileId:"driver-b"}),{id:"foreign-legacy",name:"Driver A",email:"b@example.invalid",net:999}]}};
  };
  const items=await api.read();assert.deepEqual(Array.from(items,x=>x.id),["own","legacy"]);
  assert.equal(items[0].status,"Pending");assert.equal(items[1].net,80);
  assert.equal(items[1].basic,undefined);
});
test("A refresh shows Pending, later HR Paid state and paid date without changing HR records",async()=>{
  const {c,api}=setup();let record=p("PAY-1");
  c.sb.rpc=async()=>({data:{payslips:[record]}});
  await api.refresh();assert.equal(api.state().items[0].status,"Pending");
  record={...record,paymentStatus:"Paid",paidOn:"2026-10-18"};
  await api.refresh();assert.equal(api.state().items[0].status,"Paid");
  assert.equal(api.state().items[0].paidOn,"2026-10-18");
  api.acceptScopedStore({payslips:[{...record,paymentStatus:"Unpaid"}]});
  assert.equal(api.state().items[0].status,"Pending");
});
test("Request failures remain explicit and retain only the same Driver's last verified data",async()=>{
  const {c,api}=setup();api.acceptScopedStore({payslips:[p("own")]});
  c.sb.rpc=async()=>({error:{message:"Connection unavailable"}});
  await api.refresh();assert.equal(api.state().items.length,1);assert.match(api.state().error,/Connection/);
  c.currentSession={user:{id:"driver-b",email:"b@example.invalid"}};
  assert.equal(api.state().items.length,0);assert.equal(api.state().lastUpdated,null);
  c.sb.rpc=async()=>({data:{}});
  await api.refresh();assert.match(api.state().error,/incomplete/);
});
test("Concurrent refreshes deduplicate; late responses cannot populate another session",async()=>{
  const {c,api,calls}=setup();let finish;
  c.sb.rpc=()=>new Promise(r=>finish=r);
  const first=api.refresh(),second=api.refresh();await Promise.resolve();
  assert.equal(first,second);
  c.currentSession={user:{id:"driver-b",email:"b@example.invalid"}};
  finish({data:{payslips:[p("private")]}});await first;
  assert.equal(api.state().items.length,0);
});
test("Clients cannot call Driver payment reads; malformed totals do not become zero",async()=>{
  const {c,api,calls}=setup();c.role="client";
  await assert.rejects(api.read(),/Driver/);assert.equal(calls(),0);
  c.role="driver";
  assert.throws(()=>api.ownItems([p("bad",{net:"<img src=x onerror=unsafe()>"} )]),/invalid amount/);
});
test("Read-only page clearly groups Paid/Pending, explains balances owed and escapes identities",()=>{
  const {api,ui}=setup();
  const items=api.ownItems([p('PAY-"unsafe',{name:"<img src=x onerror=unsafe()>",net:850}),
    p("staff-hidden",{profileId:"staff-b",paymentStatus:"Paid",net:99999}),
    p("paid",{paymentStatus:"Paid",net:400,paidOn:"2026-10-18",basic:500,taxAmount:100,taxPct:20}),
    p("debt",{net:-50})]);
  const html=ui.render({items,loading:false,error:"",lastUpdated:"2026-10-18T12:00:00Z",openIds:["paid"]});
  assert.match(html,/Pending/);assert.match(html,/Paid/);assert.match(html,/850\.00/);assert.match(html,/400\.00/);
  assert.match(html,/owed to company/i);assert.doesNotMatch(html,/99,999|<img|onchange=|setStatus|setPayslipPayment/);
  assert.match(html,/&lt;img/);assert.match(html,/data-payment-ref="paid"[^>]*open/);
});
test("Loading/error states are not mistaken for an empty payment history",()=>{
  const {ui}=setup(),base={items:[],lastUpdated:null,openIds:[]};
  const loading=ui.render({...base,loading:true,error:""});
  const failed=ui.render({...base,loading:false,error:"Unavailable"});
  assert.match(loading,/loading/i);assert.doesNotMatch(loading,/No payslips have been issued/);
  assert.match(failed,/Could not load payments/i);assert.doesNotMatch(failed,/No payslips have been issued/);
  assert.match(ui.render({...base,lastUpdated:"2026-10-18",loading:false,error:""}),/No payslips have been issued/);
});
test("Local visual fixtures cannot bypass sign-in or load on the live domain",async()=>{
  const {c,api,calls}=setup();c.URLSearchParams=URLSearchParams;
  c.currentSession={user:{id:"local-preview-driver"}};
  c.location={hostname:"portal.ukonwheels.org",search:"?ui-preview=driver&ui-tab=payments"};
  assert.equal(api.isLocalPreview(),false);
  await api.read();assert.equal(calls(),1);
  c.location.hostname="127.0.0.1";c.getStore=()=>({payslips:[p("preview",{profileId:"local-preview-driver"})]});
  assert.equal(api.isLocalPreview(),true);assert.equal((await api.read())[0].id,"preview");
  assert.equal(calls(),1);
});
test("Driver Payments is reachable in the seven-button navigation without the legacy five-column override",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const fn=html.match(/function driverMobileNav\(\)\{[\s\S]*?\n\}/)[0];
  const c=vm.createContext({driverMobileTab:"payments",ico:()=>""});
  vm.runInContext(fn,c);const nav=c.driverMobileNav();
  assert.equal((nav.match(/<button/g)||[]).length,7);
  assert.match(nav,/aria-current="page"[^>]*setDriverMobileTab\('payments'\)/);
  assert.match(fs.readFileSync(path.join(__dirname,"../public/driver-incidents.css"),"utf8"),
    /\.driverApp \.driverBottomNav\{grid-template-columns:repeat\(7,/);
});
