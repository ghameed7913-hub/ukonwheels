const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/driver-navigation.ts'),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS}
}).outputText,{exports:output});
function harness(){
 const calls=[],drafts=[],intervals=[],styles=[];
 const rows=[
  {ref:'ASSIGNED-1',status:'Driver Assigned',vehicle:'First car'},
  {ref:'ACTIVE-1',status:'Picked Up',vehicle:'Second car'},
  {ref:'ROUTE-1',status:'On Route'},
  {ref:'DELAY-1',status:'Delayed'},
  {ref:'DELIVERED-1',status:'Delivered'},
 ];
 const c={window:null,role:'driver',driverSelectedJobRef:null,driverPhotoIsSaving:()=>false,
  document:{head:{appendChild:node=>styles.push(node)},createElement:()=>({}),getElementById:id=>styles.find(node=>node.id===id)},
  IncidentUI:{isSaving:()=>false},setDriverMobileTab:tab=>calls.push(tab),
  driverAssignedRows:()=>rows,saveDriverFormDraft:()=>drafts.push(c.driverSelectedJobRef),
  drawDriverJobsMobile:()=>'<article>Original working inspection</article>',
  drawDriverHistoryMobile:()=>'<h3>Delivered History</h3><p>DELIVERED-1</p>',
  driverMobileNav:()=>'<button onclick="history"><span>icon</span>History</button>',
  setInterval:fn=>intervals.push(fn),
 };
 c.window=c;vm.runInNewContext(output.DRIVER_NAVIGATION_BRIDGE,c);
 return {c,calls,drafts,rows,intervals,styles};
}
test('Assigned and Active shortcuts open distinct real-data job lists',()=>{
 const h=harness();h.c.__ukowOpenDriverSection('assigned');
 let html=h.c.drawDriverJobsMobile().split('role="tabpanel">')[1];
 assert.match(html,/<h3[^>]*>Assigned Jobs/);assert.match(html,/First car/);
 assert.doesNotMatch(html,/Second car|ACTIVE-1|DELIVERED-1/);
 h.c.__ukowOpenDriverSection('active');html=h.c.drawDriverJobsMobile().split('role="tabpanel">')[1];
 assert.match(html,/<h3[^>]*>Active Jobs/);assert.match(html,/Second car/);
 assert.match(html,/ROUTE-1/);assert.match(html,/DELAY-1/);
 assert.doesNotMatch(html,/First car|ASSIGNED-1|DELIVERED-1/);
 assert.deepEqual(h.calls,['jobs','jobs']);
});
test('Delivered reuses existing history data without a duplicate bottom tab menu',()=>{
 const h=harness();h.c.__ukowOpenDriverSection('delivered');
 assert.deepEqual(h.calls,['history']);
 assert.ok(h.c.drawDriverHistoryMobile().includes('<h3>Delivered</h3>'));
 assert.match(h.c.drawDriverHistoryMobile(),/DELIVERED-1/);
 assert.equal(h.c.driverMobileNav(),'');
});
test('Assigned trade plate opens its own read-only portal destination',()=>{
 const h=harness();h.c.__ukowOpenDriverSection('tradePlate');
 assert.deepEqual(h.calls,['tradePlate']);
});
test('Opened sections hide existing menus and unrelated dashboard totals after every render',()=>{
 const h=harness();
 assert.equal(h.styles.length,1);
 assert.ok(h.styles[0].textContent.includes('.driverBottomNav'));
 assert.ok(h.styles[0].textContent.includes('.driverSummary'));
 assert.match(h.styles[0].textContent,/display:none!important/);
 assert.ok(h.styles[0].textContent.includes('padding-bottom:env(safe-area-inset-bottom)'));
 for(const section of ['assigned','active','delivered','incidents','holidays','payments','companyId','profile']){
  h.c.__ukowOpenDriverSection(section);
  h.intervals[0]();
  assert.equal(h.c.driverMobileNav(),'');
  assert.equal(h.styles.length,1);
 }
 h.c.__ukowOpenDriverSection('assigned');
 assert.match(h.c.drawDriverJobsMobile(),/role="tablist" aria-label="Job lists"/);
 assert.equal((h.c.drawDriverJobsMobile().match(/role="tab"/g)||[]).length,3);
});
test('Opening another list keeps drafts and clears a stale selected job',()=>{
 const h=harness();h.c.driverSelectedJobRef='ACTIVE-1';
 h.c.__ukowOpenDriverSection('assigned');
 assert.deepEqual(h.drafts,['ACTIVE-1']);assert.equal(h.c.driverSelectedJobRef,null);
 assert.match(h.c.drawDriverJobsMobile(),/Assigned Jobs/);
 assert.doesNotMatch(h.c.drawDriverJobsMobile(),/Original working inspection/);
});
test('Working-job renderer, inspections and capture controls are not replaced',()=>{
 const h=harness();h.c.driverSelectedJobRef='ACTIVE-1';
 assert.equal(h.c.drawDriverJobsMobile(),'<article>Original working inspection</article>');
 h.c.driverSelectedJobRef=null;
 assert.match(h.c.drawDriverJobsMobile(),/Active Jobs/);
});
test('Saving a photo blocks list changes without clearing selected job or draft',()=>{
 const h=harness();h.c.driverSelectedJobRef='ACTIVE-1';h.c.driverPhotoIsSaving=()=>true;
 h.c.__ukowOpenDriverSection('assigned');
 assert.equal(h.c.driverSelectedJobRef,'ACTIVE-1');
 assert.equal(h.calls.length,0);assert.equal(h.drafts.length,0);
});
test('Invalid targets and non-Drivers cannot navigate',()=>{
 const h=harness();h.c.__ukowOpenDriverSection('invalid');
 h.c.role='admin';h.c.__ukowOpenDriverSection('active');
 assert.equal(h.calls.length,0);
});
test('Job labels and reference attributes are escaped',()=>{
 const h=harness();h.rows[0].vehicle='<img src=x onerror=alert(1)>';
 h.rows[0].ref='" onclick="evil()';
 const html=h.c.drawDriverJobsMobile();
 assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/data-booking-ref="" onclick="evil/);
});
test('Bridge installation is idempotent',()=>{
 const h=harness(),before=h.c.drawDriverJobsMobile;
 vm.runInNewContext(output.DRIVER_NAVIGATION_BRIDGE,h.c);
 assert.equal(h.c.drawDriverJobsMobile,before);assert.equal(h.intervals.length,1);
});
test('Job tabs show real own-job counts and selected state in every list',()=>{
 const h=harness();
 for(const section of ['assigned','active','delivered']){
  h.c.__ukowOpenDriverSection(section);
  const html=section==='delivered'?h.c.drawDriverHistoryMobile():h.c.drawDriverJobsMobile();
  assert.equal((html.match(/role="tab"/g)||[]).length,3);
  assert.equal((html.match(/aria-selected="true"/g)||[]).length,1);
  assert.match(html,/Assigned jobs <span>1<\/span>/);
  assert.match(html,/Active jobs <span>3<\/span>/);
  assert.match(html,/Delivered <span>1<\/span>/);
  assert.ok(html.includes('aria-selected="true" onclick="window.__ukowOpenDriverSection(\''+section+'\')'));
 }
});
test('Delivered tab snapshots an unfinished job and clears the selection',()=>{
 const h=harness();h.c.driverSelectedJobRef='ACTIVE-1';
 h.c.__ukowOpenDriverSection('delivered');
 assert.deepEqual(h.drafts,['ACTIVE-1']);
 assert.equal(h.c.driverSelectedJobRef,null);
 assert.deepEqual(h.calls,['history']);
});
test('Tab clicks call the guarded navigation handler rather than bypassing it',()=>{
 const h=harness();
 const html=h.c.drawDriverJobsMobile();
 const onclick=html.match(/onclick="([^"]*__ukowOpenDriverSection[^"]*)"/)[1];
 h.c.driverPhotoIsSaving=()=>true;
 vm.runInNewContext(onclick,h.c);
 assert.equal(h.calls.length,0);
});
test('Native home receives own-job counts, updates and logout clearing',()=>{
 const h=harness(),messages=[];
 h.c.ReactNativeWebView={postMessage:value=>messages.push(JSON.parse(value))};
 h.c.currentUser={id:'driver-one'};
 const original=h.c.document.getElementById;
 let hidden=false;
 h.c.document.getElementById=id=>id==='app'?{classList:{contains:()=>hidden}}:original(id);
 const tick=h.intervals[0];
 tick();
 assert.deepEqual(messages.pop(),{type:'driver-job-counts',counts:{assigned:1,active:3,delivered:1}});
 tick();assert.equal(messages.length,0);
 h.rows.push({ref:'NEW-1',status:'Driver Assigned'});
 tick();assert.equal(messages.pop().counts.assigned,2);
 h.rows[0].status='Delivered';
 tick();assert.deepEqual(messages.pop().counts,{assigned:1,active:3,delivered:2});
 hidden=true;tick();
 assert.equal(messages.pop().counts,null);
 hidden=false;h.c.role='admin';tick();assert.equal(messages.length,0);
 h.c.role='driver';h.c.currentUser=null;tick();assert.equal(messages.length,0);
});
test('Home uses compact bell, removes promotional hero and wires real counts',()=>{
 const home=fs.readFileSync(path.join(__dirname,'../app/index.tsx'),'utf8');
 assert.match(home,/testID="alerts"/);
 assert.match(home,/\{alertsOpen&&<View testID="alerts-panel"/);
 assert.doesNotMatch(home,/Find your vehicle|Start the run|Pick up where/);
 assert.match(home,/onJobCounts=\{setJobCounts\}/);
 assert.match(home,/jobCounts\[item.id/);
 assert.doesNotMatch(home,/\{opened&&/);
});
