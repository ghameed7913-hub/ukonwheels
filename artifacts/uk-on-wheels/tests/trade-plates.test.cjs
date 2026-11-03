const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=name=>fs.readFileSync(path.join(__dirname,"../",name),"utf8");
const A="00000000-0000-4000-8000-000000000001",B="00000000-0000-4000-8000-000000000002";
const plate={driver_id:A,driver_name:"Driver <A>",plate_number:"123AB",expires_on:"2099-12-31",version:7};
const tick=()=>new Promise(r=>setImmediate(r));
function apiHarness(){
  const calls=[],c={window:null,SUPABASE_CONFIGURED:true,currentSession:{user:{id:A}}};
  c.window=c;c.sb={rpc:async(name,args)=>{calls.push({name,args});return {data:c.response,error:c.error};}};
  vm.runInNewContext(read("public/trade-plates-api.js"),c);
  return {c,calls,api:c.TradePlatesAPI};
}
test("Trade plate API sends exact versioned RPC inputs and verifies save/remove confirmation",async()=>{
  const {c,calls,api}=apiHarness();c.response=plate;
  assert.equal((await api.save({driverId:A,plateNumber:"123AB",expiresOn:"2099-12-31",expectedVersion:0})).version,7);
  assert.equal(calls[0].name,"save_driver_trade_plate");
  assert.equal(calls[0].args.p_expected_version,0);
  assert.equal(calls[0].args.p_driver_id,A);
  c.response={removed:true};await api.remove({driverId:A,expectedVersion:7});
  assert.equal(calls[1].args.p_expected_version,7);
  c.response={};await assert.rejects(api.remove({driverId:A,expectedVersion:7}),/Removal was not confirmed/);
  await assert.rejects(api.save({driverId:A,expectedVersion:null}),/Refresh/);
});
test("Own assignment is isolated, setup errors are actionable, and switched accounts ignore stale responses",async()=>{
  const {c,api}=apiHarness();c.response={assignment:{...plate,driver_id:B}};
  await assert.rejects(api.mine(),/not assigned to your account/);
  c.response={assignment:null};assert.equal((await api.mine()).assignment,null);
  c.error={code:"PGRST202"};await assert.rejects(api.mine(),/driver-trade-plates.sql/);
  c.error=null;c.sb.rpc=async()=>{c.currentSession={user:{id:B}};return {data:{assignment:plate}};};
  await assert.rejects(api.mine(),/sign-in changed/);
});
function uiHarness(){
  const timers=[],listeners={},calls=[],controls={};
  const input=value=>({value,addEventListener(){}});
  const form={driverId:input(""),plate:input(""),exp:input(""),addEventListener(){},
    querySelector:()=>controls.submit};
  const container={isConnected:true,_html:"",get innerHTML(){return this._html;},set innerHTML(value){
    this._html=value;
    if(value.includes('<form')){
      controls.submit={disabled:false,textContent:"Save assignment"};
      form.driverId.value=(value.match(/<option value="([^"]+)" selected/)||[])[1]||"";
      form.plate.value=(value.match(/name="plate"[^>]*value="([^"]*)"/)||[])[1]||"";
      form.exp.value=(value.match(/name="exp"[^>]*value="([^"]*)"/)||[])[1]||"";
    }
  },querySelector(s){
    if(s==="form")return form;
    if(s==='button[type="submit"]')return controls.submit;
    return controls[s]||(controls[s]={innerHTML:"",disabled:false});
  },querySelectorAll(){return [];}};
  const driver={isConnected:true,innerHTML:"",querySelector:()=>({})};
  const c={window:null,currentSession:{user:{id:A}},Date,Intl,console,
    confirm:()=>true,setInterval:f=>{timers.push(f);return timers.length;},clearInterval(){},
    document:{hidden:false,getElementById:()=>driver},
    addEventListener:(k,f)=>listeners[k]=f,removeEventListener:k=>delete listeners[k],
    TradePlatesAPI:{
      list:async()=>({canManage:true,drivers:[{id:A,name:"Driver <A>"}],assignments:c.items}),
      save:async args=>{calls.push(args);if(c.fail)throw Error("Server conflict");return plate;},
      remove:async()=>{},
      mine:async()=>({assignment:c.mine})
    },items:[],mine:plate};
  c.window=c;vm.runInNewContext(read("public/trade-plates-ui.js"),c);
  return {c,ui:c.TradePlatesUI,container,driver,form,controls,calls,listeners,timers};
}
test("HR form preserves failed input, submits new assignment at version zero, and keeps server strings escaped",async()=>{
  const h=uiHarness();await h.ui.draw(h.container);
  assert.match(h.container.innerHTML,/Driver &lt;A&gt;/);
  assert.match(h.container.innerHTML,/No trade plates are assigned/);
  h.form.driverId.value=A;h.form.plate.value="123 - ab";h.form.exp.value="2099-12-31";h.c.fail=true;
  h.form.onsubmit({preventDefault(){}});await tick();
  assert.equal(h.calls[0].expectedVersion,0);assert.equal(h.calls[0].plateNumber,"123AB");
  assert.equal(h.form.plate.value,"123 - ab");
  assert.match(h.controls['[data-tp="msg"]'].innerHTML,/Could not save/);
  h.c.fail=false;h.form.onsubmit({preventDefault(){}});await tick();
  assert.match(h.container.innerHTML,/Saved 123AB for Driver &lt;A&gt;/);
});
test("HR replacement uses latest version and duplicate normalised plates are rejected",async()=>{
  const h=uiHarness();h.c.items=[plate];await h.ui.draw(h.container);
  h.form.driverId.value=A;h.form.plate.value="555 CD";h.form.exp.value="2099-12-31";
  h.form.onsubmit({preventDefault(){}});await tick();assert.equal(h.calls[0].expectedVersion,7);
  h.c.items=[{...plate,driver_id:B}];await h.ui.draw(h.container);
  h.form.driverId.value=A;h.form.plate.value="123 AB";h.form.exp.value="2099-12-31";
  h.form.onsubmit({preventDefault(){}});await tick();
  assert.equal(h.calls.length,1);assert.match(h.controls['[data-tp="msg"]'].innerHTML,/already assigned/);
});
test("Driver tab is read-only, refreshes removal, marks expiry, escapes names, and cancels work on logout",async()=>{
  const h=uiHarness();assert.match(h.ui.renderDriver(),/tradePlateDriver/);
  h.ui.mountDriver();await tick();
  assert.match(h.driver.innerHTML,/123AB/);assert.match(h.driver.innerHTML,/Driver &lt;A&gt;/);
  assert.doesNotMatch(h.driver.innerHTML,/<input|<select|Remove|Save assignment|data-edit/);
  h.c.mine=null;h.timers[0]();await tick();assert.match(h.driver.innerHTML,/No trade plate is assigned/);
  h.c.mine={...plate,expires_on:"2000-01-01"};h.listeners.focus();await tick();
  assert.match(h.driver.innerHTML,/Expired/);
  let resolve;h.c.TradePlatesAPI.mine=()=>new Promise(r=>resolve=r);h.listeners.focus();h.ui.reset();
  h.driver.innerHTML="signed out";resolve({assignment:plate});await tick();assert.equal(h.driver.innerHTML,"signed out");
  assert.equal(h.listeners.focus,undefined);
});
test("Trade plates are wired to Admin/HR navigation, Driver tab and auth resets, never the shared store",()=>{
  const html=read("index.html");
  assert.equal((html.match(/key:"tradePlates",label:"Trade plates"/g)||[]).length,2);
  assert.equal((html.match(/TradePlatesUI\?\.reset\(\)/g)||[]).length,2);
  assert.match(html,/if\(page==="tradePlates"\)[\s\S]*?hasPermission\("hr"\)[\s\S]*?TradePlatesUI.draw\(c\)/);
  assert.match(html,/activeTab==="tradePlate"\)body=TradePlatesUI.renderDriver/);
  assert.match(html,/activeTab==="tradePlate"\)TradePlatesUI.mountDriver/);
  assert.match(html,/onclick="setDriverMobileTab\('tradePlate'\)"/);
  assert.doesNotMatch(read("public/trade-plates-ui.js")+read("public/trade-plates-api.js"),/localStorage|sessionStorage|getStore\(/);
});
