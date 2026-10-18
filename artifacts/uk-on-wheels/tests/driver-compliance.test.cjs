const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(root,"public/driver-compliance.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const escape=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
function setup(initial={driver:true,blocked:false,expired:[]}) {
  let response=initial, signouts=0, callback, notice="", counter=0;
  const elements=Object.fromEntries(["app","login","driverDocumentAlerts"].map(k=>[k,{
    innerHTML:"",classList:{add(){},remove(){}},remove(){}
  }]));
  const context=vm.createContext({
    window:{addEventListener(){},BulkBooking:{clearSession(){}}},
    document:{addEventListener(){},getElementById:id=>elements[id],body:{classList:{remove(){}}}},
    escapeHtml:escape, role:"driver",currentSession:{user:{id:"driver-1"}},currentUser:{name:"Driver"},
    currentStaffUser:null,STORE_CACHE:{},storeReady:true,
    scopedStoreTimer:null,sharedStoreChannel:null,normalizedChannel:null,
    IncidentUI:{captureForm(){}},closeDriverCameras(){},
    showAuthView:(view,text)=>notice=text,setAuthNotice:text=>notice=text,
    sb:{rpc:async name=>{assert.equal(name,"driver_document_status");return response?.error?response:{data:response}},
      auth:{signOut:async()=>{signouts++}},removeChannel:async()=>{}},
    setInterval:fn=>{callback=fn;return ++counter},clearInterval:()=>{callback=null},Promise
  });
  vm.runInContext(source,context);
  return {c:context,api:context.window.DriverCompliance,elements,
    set:value=>response=value,notice:()=>notice,signouts:()=>signouts,poll:()=>callback?.()};
}
test("Drivers see expired document notices only, escaped, without private HR details",async()=>{
  const s=setup({driver:true,blocked:false,expired:[{key:"qualificationExpiry",label:"<Qualification>",date:"2020-01-01"}]});
  await s.api.checkSession();
  assert.match(s.api.notices(),/&lt;Qualification>/);
  assert.match(s.api.notices(),/provide replacements to HR/);
  assert.doesNotMatch(s.api.notices(),/<input|passportNumber|reviewedBy/);
  assert.equal(s.signouts(),0);
});
test("A critical expired document prevents login and clears visible/cached user data",async()=>{
  const s=setup({driver:true,blocked:true,expired:[{label:"Passport",date:"2020-01-01"}]});
  await assert.rejects(s.api.checkSession(),/Passport/);
  assert.equal(s.signouts(),1);
  assert.equal(s.c.currentUser,null);assert.equal(s.c.currentSession,null);assert.equal(s.c.STORE_CACHE,null);
  assert.match(s.notice(),/Only HR can update/);
  assert.equal(s.elements.app.innerHTML,"");
});
test("An existing Driver session is locked on refresh after HR expiry changes",async()=>{
  const s=setup();await s.api.checkSession();s.api.start();
  s.set({driver:true,blocked:true,expired:[{label:"Driving licence",date:"2020-01-01"}]});
  await s.poll();
  assert.equal(s.signouts(),1);assert.match(s.notice(),/Driving licence/);
});
test("HR renewal permits a later sign-in and removes old notices",async()=>{
  const s=setup({driver:true,blocked:false,expired:[{label:"DBS",date:"2020-01-01"}]});
  await s.api.checkSession();assert.match(s.api.notices(),/DBS/);
  s.set({driver:true,blocked:false,expired:[]});await s.api.checkSession();
  assert.equal(s.api.notices(),"");assert.equal(s.signouts(),0);
});
test("Unconfirmed checks fail closed, not with a silent allow",async()=>{
  const s=setup({error:{message:"Missing setup"}});
  await assert.rejects(s.api.checkSession(),/Document checks could not be confirmed/);
  assert.equal(s.signouts(),1);assert.equal(s.c.currentSession,null);
});
test("A late status response cannot replace another session's state",async()=>{
  const s=setup();let resolve;
  s.c.sb.rpc=()=>new Promise(r=>resolve=r);
  const pending=s.api.checkSession();s.api.stop();
  resolve({data:{driver:true,blocked:false,expired:[{label:"wrong user"}]}});
  await assert.rejects(pending,/sign-in changed/);
  assert.equal(s.api.notices(),"");
});
test("Driver profile uses account name, email and phone only, never name-matched staff records",()=>{
  const a=html.indexOf("function drawDriverProfileMobile("),b=html.indexOf("function drawDriver(c)",a);
  const c=vm.createContext({currentUser:{name:"<Driver>",email:"driver@example.test",phone:"07000123456"},escapeHtml:escape});
  vm.runInContext(html.slice(a,b),c);
  const markup=c.drawDriverProfileMobile();
  assert.match(markup,/&lt;Driver>/);assert.match(markup,/driver@example.test/);assert.match(markup,/07000123456/);
  assert.doesNotMatch(markup,/Licence|DVLA|Safety|Status|driver@ukonwheels/);
  assert.doesNotMatch(html.slice(a,b),/staffUsers|find\(/);
  assert.match(html,/function checkDocumentExpiries\(\)\{\s*if\(role==="driver"\)return;/);
});
test("Fresh login and restored sessions check compliance before loading any portal store",()=>{
  for(const [start,end] of [
    ["async function loginNow(","// Creates a real Supabase"],
    ["async function restoreSupabaseSession(","async function logoutNow("]
  ]) {
    const text=html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
    assert.ok(text.indexOf("DriverCompliance.checkSession()")<text.indexOf("initStoreFromSupabase"));
    assert.ok(text.indexOf("DriverCompliance.checkSession()")>=0);
  }
});
