const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const exports_={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/push-bridge.ts'),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS}
}).outputText,{exports:exports_});
const id='12345678-1234-4123-8123-123456789012';
function harness(){
 const calls=[],messages=[],opened=[],notices=[],intervals=[];
 const c={window:null,role:'driver',currentSession:{user:{id:'driver-1'}},
  ReactNativeWebView:{postMessage:s=>messages.push(JSON.parse(s))},
  sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:true};}},
  driverPhotoIsSaving:()=>false,IncidentUI:{isSaving:()=>false},
  loadNormalizedPortalData:async()=>{},
  driverAssignedRows:()=>[{ref:'UKOW-1',status:'Driver Assigned'}],
  setDriverMobileTab:tab=>opened.push(tab),openDriverJob:ref=>opened.push(ref),
  __ukowOpenDriverSection:tab=>opened.push(tab),alert:text=>notices.push(text),
  normalizedBookingToPortal:b=>({ref:b.reference}),
  driverMobileJobCard:()=>'<div><details class="driverExtras">Details</details></div>',
  escapeHtml:value=>String(value).replace(/</g,'&lt;').replace(/>/g,'&gt;'),
  setInterval:fn=>intervals.push(fn),
 };
 c.window=c;vm.runInNewContext(exports_.DRIVER_PUSH_BRIDGE,c);
 return {c,calls,messages,opened,notices,intervals};
}
test('Phone token registers using the existing authenticated portal, without exporting auth tokens',async()=>{
 const h=harness();
 await h.c.__ukowRegisterDriverPush({id:'1',token:'ExpoPushToken[test_phone]',platform:'android',projectId:'e2493dec-778d-4129-9a50-2c6849bc1499'});
 assert.equal(h.calls[0].name,'register_driver_push');assert.equal(h.messages[0].ok,true);
 assert.equal(JSON.stringify(h.messages).includes('test_phone'),false);
 assert.equal(JSON.stringify(h.messages).includes('driver-1'),false);
});
test('Invalid registrations and non-Driver sessions cannot register phones',async()=>{
 const h=harness(),base={id:'1',token:'ExpoPushToken[test_phone]',platform:'android',projectId:'e2493dec-778d-4129-9a50-2c6849bc1499'};
 await h.c.__ukowRegisterDriverPush({...base,token:'not-a-token'});
 await h.c.__ukowRegisterDriverPush({...base,projectId:'other-project'});
 h.c.role='admin';await h.c.__ukowRegisterDriverPush(base);
 assert.equal(h.calls.length,0);
});
test('Missing Supabase setup is reported as failure, never falsely connected',async()=>{
 const h=harness();h.c.sb.rpc=async()=>({error:{code:'PGRST202'}});
 await h.c.__ukowRegisterDriverPush({id:'1',token:'ExpoPushToken[test_phone]',platform:'ios',projectId:'e2493dec-778d-4129-9a50-2c6849bc1499'});
 assert.equal(h.messages[0].ok,false);assert.match(h.messages[0].error,/Supabase/);
});
test('Tapping a notification revalidates ownership and opens the exact Driver job',async()=>{
 const h=harness();h.c.sb.rpc=async(name,args)=>{h.calls.push({name,args});return {data:{reference:'UKOW-1',title:'Driver instructions',message:'Collect after 10am'}};};
 await h.c.__ukowOpenDriverNotification(id);
 assert.equal(h.calls[0].name,'read_driver_push_notification');
 assert.deepEqual(h.opened,['jobs','UKOW-1']);assert.deepEqual(h.notices,['Collect after 10am']);
 assert.equal(h.messages[0].ok,true);
});
test('Wrong-account and reassigned job notifications cannot open data',async()=>{
 const h=harness();h.c.sb.rpc=async()=>({error:{message:'Wrong Driver'}});
 await h.c.__ukowOpenDriverNotification(id);assert.equal(h.opened.length,0);
 assert.equal(h.messages[0].ok,false);
});
test('Notification taps do not interrupt photo/report saving',async()=>{
 const h=harness();h.c.driverPhotoIsSaving=()=>true;
 await h.c.__ukowOpenDriverNotification(id);
 assert.equal(h.calls.length,0);assert.equal(h.opened.length,0);assert.equal(h.messages[0].ok,false);
});
test('Canonical instructions are preserved when normalizing booking data',()=>{
 const h=harness();
 assert.equal(h.c.normalizedBookingToPortal({reference:'UKOW-1',driver_instructions:'Use gate 2'}).driverNotes,'Use gate 2');
});
test('Instructions remain readable on the job, with markup escaped and no duplicate panel',()=>{
 const h=harness();
 const html=h.c.driverMobileJobCard({driverNotes:'Use gate 2 <script>bad()</script>'});
 assert.match(html,/Driver instructions/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
test('Account changes trigger registration refresh without exporting account IDs',()=>{
 const h=harness();h.intervals[0]();
 h.c.currentSession={user:{id:'driver-2'}};h.intervals[0]();
 assert.equal(h.messages.length,2);
 assert.deepEqual(h.messages.map(m=>m.type),['driver-push-session','driver-push-session']);
 assert.equal(JSON.stringify(h.messages).includes('driver-'),true); // Only the fixed event name.
 assert.equal(JSON.stringify(h.messages).includes('driver-2'),false);
});
test('Notification scripts accept IDs only, not arbitrary code or links',()=>{
 assert.throws(()=>exports_.pushOpenScript("');alert(1);//"));
 assert.match(exports_.pushOpenScript(id),/__ukowOpenDriverNotification/);
});
