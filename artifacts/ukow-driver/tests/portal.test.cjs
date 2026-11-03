const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
function moduleFrom(file,mocks={}) {
 const exports={}; const filename=path.join(__dirname,'..',file);
 const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>{if(name in mocks)return mocks[name];throw Error('Unexpected import '+name);},URL});
 return exports;
}
const evidence=moduleFrom('lib/native-evidence.ts');
const validation=moduleFrom('lib/inspection-validation.ts');
const navigation=moduleFrom('lib/driver-navigation.ts');
const push=moduleFrom('lib/push-bridge.ts');
const tracking=moduleFrom('lib/tracking-bridge.ts');
const bridge=moduleFrom('lib/bridge.ts',{'./native-evidence':evidence,'./inspection-validation':validation,'./driver-navigation':navigation,'./push-bridge':push,'./tracking-bridge':tracking});
const portal=moduleFrom('lib/portal.ts',{'expo-constants':{__esModule:true,default:{expoConfig:{extra:{portalUrl:'https://portal.ukonwheels.org'}}}}});
test('Only the exact HTTPS portal origin stays inside the app',()=>{
 assert.equal(portal.navigationKind('https://portal.ukonwheels.org/'),'portal');
 assert.equal(portal.navigationKind('https://portal.ukonwheels.org/recovery'),'portal');
 assert.equal(portal.navigationKind('https://portal.ukonwheels.org.evil.test/'),'external');
 assert.equal(portal.navigationKind('http://portal.ukonwheels.org/'),'blocked');
 for(const url of ['javascript:alert(1)','file:///etc/passwd','data:text/html,test','blob:https://evil.test/x','bad url'])
  assert.equal(portal.navigationKind(url),'blocked');
 assert.equal(portal.navigationKind('tel:999'),'external');
});
test('Driver navigation accepts only fixed section IDs, never arbitrary JavaScript',()=>{
 for(const section of portal.sections)assert.match(bridge.sectionScript(section.id),/role==='driver'/);
 assert.throws(()=>bridge.sectionScript("jobs');alert(1);//"));
});
function harness(mediaDevices){
 const sent=[],intervals=[],tabs=[];
 let hidden=true,logsOut=0,normalClicks=0,normalEvents=0;
 class Anchor {click(){normalClicks++;}dispatchEvent(){normalEvents++;return true;}}
 const context={
  window:{ReactNativeWebView:{postMessage:value=>sent.push(JSON.parse(value))}},
  document:{getElementById:id=>id==='app'?{classList:{contains:()=>hidden,add:()=>{hidden=true;}}}:null},
  setInterval:fn=>intervals.push(fn),HTMLAnchorElement:Anchor,
   navigator:{mediaDevices},setTimeout,clearTimeout,
  role:'admin',currentUser:null,logoutNow:()=>logsOut++,setDriverMobileTab:s=>tabs.push(s),
 };
  context.window.document=context.document;
  context.window.setDriverMobileTab=context.setDriverMobileTab;
 vm.runInNewContext(bridge.PORTAL_BRIDGE,context);
 return {context,sent,intervals,Anchor,tabs,setHidden:v=>hidden=v,get logsOut(){return logsOut;},get normalClicks(){return normalClicks;},get normalEvents(){return normalEvents;}};
}
test('Bridge ignores loading/login state and only announces an authenticated Driver',()=>{
 const h=harness();h.intervals[0]();assert.equal(h.sent.length,0);
 h.context.currentUser={name:'Driver'};h.context.role='driver';h.intervals[0]();assert.equal(h.sent.length,0);
 h.setHidden(false);h.intervals[0]();h.intervals[0]();
 assert.deepEqual(h.sent,[{type:'driver-ready'}]);
 assert.equal(h.logsOut,0);
});
test('A non-Driver authenticated portal is hidden and signed out',()=>{
 const h=harness();h.context.currentUser={name:'Admin'};h.setHidden(false);h.intervals[0]();
 assert.equal(h.logsOut,1);assert.deepEqual(h.sent,[{type:'wrong-role'}]);
});
test('Re-login announces readiness again without transmitting account or session data',()=>{
 const h=harness();h.context.role='driver';h.context.currentUser={name:'Private name',email:'private@example.test'};h.setHidden(false);h.intervals[0]();
 h.setHidden(true);h.context.currentUser=null;h.intervals[0]();
 h.setHidden(false);h.context.currentUser={name:'Another driver'};h.intervals[0]();
 assert.deepEqual(h.sent.map(event=>event.type),['driver-ready','signed-out','driver-ready']);
 assert.equal(JSON.stringify(h.sent).includes('Private'),false);
 assert.equal(JSON.stringify(h.sent).includes('email'),false);
});
test('Section navigation does nothing before Driver login',()=>{
 const h=harness();vm.runInNewContext(bridge.sectionScript('companyId'),h.context);
 assert.equal(h.tabs.length,0);
 h.context.role='driver';vm.runInNewContext(bridge.sectionScript('companyId'),h.context);
 assert.deepEqual(h.tabs,['companyId']);
});
test('Normal links and non-download click events are preserved',()=>{
 const h=harness();const a=new h.Anchor();a.href='https://portal.ukonwheels.org';a.download='';
 a.click();a.dispatchEvent({type:'click'});a.dispatchEvent({type:'focus'});
 assert.equal(h.normalClicks,1);assert.equal(h.normalEvents,2);
});
test('Bridge installation is idempotent',()=>{
 const h=harness(),count=h.intervals.length;vm.runInNewContext(bridge.PORTAL_BRIDGE,h.context);
 assert.equal(h.intervals.length,count);
});
test('Live camera waits for native permission before calling getUserMedia',async()=>{
 let calls=0;
 const stream={live:true};
 const media={getUserMedia:async()=>{calls++;return stream;}};
 const h=harness(media);
 const result=media.getUserMedia({video:true,audio:false});
 assert.equal(calls,0);
 assert.deepEqual(h.sent,[{type:'camera-permission',id:'1'}]);
 h.context.window.__ukowCameraPermissionResult('unrelated',true);
 assert.equal(calls,0);
 h.context.window.__ukowCameraPermissionResult('1',true);
 assert.equal(await result,stream);
 assert.equal(calls,1);
});
test('Denied native camera permission never opens the camera and can be retried',async()=>{
 let calls=0;
 const media={getUserMedia:async()=>{calls++;return 'live';}};
 const h=harness(media);
 const denied=media.getUserMedia({video:true});
 h.context.window.__ukowCameraPermissionResult('1',false);
 await assert.rejects(denied,/permission was not granted/);
 assert.equal(calls,0);
 const retry=media.getUserMedia({video:true});
 h.context.window.__ukowCameraPermissionResult('2',true);
 assert.equal(await retry,'live');
 assert.equal(calls,1);
});
