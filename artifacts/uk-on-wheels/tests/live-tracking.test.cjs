const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'../'+n),'utf8');
const id='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002';
const session={booking_id:id,owner_id:owner,reference:'UKOW00001',token:'a'.repeat(64),
  expires_at:'2099-01-01T00:00:00Z',endpoint:'https://example.supabase.co',anonKey:'public-test-key'};
const tick=()=>new Promise(r=>setImmediate(r));
function driverHarness(){
  const intervals=[],calls=[],listeners={},c={window:null,role:'driver',currentSession:{user:{id:owner}},
    Event,Date,Map,console,setTimeout,clearTimeout,
    setInterval:f=>{intervals.push(f);return intervals.length;},clearInterval(){},
    addEventListener:(e,f)=>listeners[e]=f,dispatchEvent(){},confirm:()=>true,
    fetch:async(url,options)=>{calls.push({close:url,args:JSON.parse(options.body)});return {ok:true};},
    navigator:{geolocation:{watchPosition:(ok,fail)=>{c.position=ok;c.geoError=fail;calls.push('watch');return 4;},clearWatch:()=>calls.push('clear')}},
    VehicleTrackingAPI:{driverStatus:async()=>({sharing:true,booking_id:id}),
      start:async()=>session,publish:async(_,p)=>{calls.push({position:p});return {active:true,accepted:true};},
      stop:async bookingId=>calls.push({stop:bookingId})}};
  c.window=c;vm.runInNewContext(read('public/driver-tracking.js'),c);return {c,api:c.DriverTracking,calls,intervals};
}
test('Drivers explicitly start sharing; no GPS on login, watch removed on logout, and old-account fixes ignored',async()=>{
  const {c,api,calls}=driverHarness();api.init();await tick();
  assert.ok(!calls.includes('watch'));await api.start(id);assert.equal(api.status(id).sharing,true);
  await c.position({timestamp:Date.now(),coords:{latitude:55,longitude:-4,accuracy:10}});
  assert.equal(calls.filter(x=>x.position).length,1);
  const oldPosition=c.position;api.reset();await tick();
  assert.equal(api.status(id).sharing,false);assert.ok(calls.includes('clear'));
  assert.ok(calls.some(x=>x.close&&x.args.p_token===session.token));
  await oldPosition({timestamp:Date.now()+16000,coords:{latitude:56,longitude:0,accuracy:8}});
  assert.equal(calls.filter(x=>x.position).length,1);
});
test('Permission denial removes browser sharing; native failure still sends the authoritative server stop',async()=>{
  const {c,api,calls}=driverHarness();await api.start(id);c.geoError({code:1});await tick();
  assert.equal(api.status(id).sharing,false);assert.ok(calls.some(x=>x.stop===id));
  c.__ukowNativeTracking=command=>queueMicrotask(()=>c.__ukowNativeTrackingReply(command.id,
    command.action==='stop'?{ok:false,error:'Network unavailable'}:{ok:true,sharing:true,bookingId:id}));
  await api.stop(id);assert.equal(calls.filter(x=>x.stop===id).length,2);
  api.reset();await tick();
});
test('Vehicle tracking API validates own session and malformed positions, and does not return other-account async results',async()=>{
  const c={window:null,currentSession:{user:{id:owner}},sb:{supabaseUrl:session.endpoint,supabaseKey:session.anonKey,
    rpc:async(_,args)=>{c.args=args;return {data:c.response,error:c.error};}}};
  c.window=c;vm.runInNewContext(read('public/vehicle-tracking-api.js'),c);
  c.response=session;assert.equal((await c.VehicleTrackingAPI.start(id)).booking_id,id);
  assert.equal(c.args.p_booking_id,id);
  c.response={server_time:new Date().toISOString(),bookings:[{id,location:{latitude:91,longitude:0,accuracy:1}}]};
  await assert.rejects(c.VehicleTrackingAPI.search('AB12 CDE'),/Invalid location/);
  c.error={code:'PGRST202'};await assert.rejects(c.VehicleTrackingAPI.search(''),/live-vehicle-tracking.sql/);
  c.error=null;c.sb.rpc=async()=>{c.currentSession=null;return {data:{sharing:false}};};
  await assert.rejects(c.VehicleTrackingAPI.driverStatus(),/sign-in changed/);
});
test('Tracking UI shows only real GPS, stale/ended labels, safely escaped data and explicit Driver controls',()=>{
  const c={window:null,currentSession:{user:{id:owner}},Date,console,
    DriverTracking:{status:()=>({sharing:false})}};
  c.window=c;
  const source=read('public/vehicle-tracking-ui.js').replace('window.VehicleTrackingUI =',
    'window._trackingTest={detail:detail,st:st};window.VehicleTrackingUI =');
  vm.runInNewContext(source,c);
  const booking={id,reference:'UKOW00001',status:'On Route',registration:'AB12 CDE',driver_name:'<script>bad</script>',
    pickup:'Glasgow',destination:'London',sharing:true,events:[],location:{
      latitude:55.85,longitude:-4.25,accuracy:8,recorded_at:new Date().toISOString(),received_at:new Date().toISOString()}};
  let html=c._trackingTest.detail(booking);assert.match(html,/map-tracking/);assert.match(html,/Live/);
  assert.match(html,/&lt;script&gt;bad/);assert.doesNotMatch(html,/<script>/);
  html=c._trackingTest.detail({...booking,location:{...booking.location,recorded_at:'2000-01-01'}});
  assert.match(html,/Offline/);
  html=c._trackingTest.detail({...booking,status:'Delivered',sharing:false,location:null});
  assert.match(html,/no longer shared/i);assert.doesNotMatch(html,/<iframe/);
  for(const status of ['Delivered','Driver Assigned','New Booking','Cancelled']){
    html=c._trackingTest.detail({...booking,status});
    assert.doesNotMatch(html,/<iframe|55\.85|-4\.25/,'Inactive jobs must never display cached Driver coordinates');
  }
  html=c.VehicleTrackingUI.renderDriver({_normalizedId:id,ref:'UKOW00001',status:'Picked Up'});
  assert.match(html,/Start sharing/);assert.doesNotMatch(html,/a{64}/);
  html=c.VehicleTrackingUI.renderDriver({_normalizedId:id,status:'Driver Assigned'});
  assert.match(html,/after.*Picked Up/);
  html=c.VehicleTrackingUI.renderDriver({_normalizedId:id,status:'Delivered'});
  assert.doesNotMatch(html,/data-vt-act="start"/);
});
test('Both portals and both Driver card variants are wired to the shared tracking feature',()=>{
  const html=read('index.html');
  assert.match(html,/key:"vehicleTracking",label:"Track Vehicle"/);
  assert.match(html,/key:"clientTracking",label:"Track Vehicle"/);
  assert.match(html,/function drawClientTracking\(c\)\{\s*return VehicleTrackingUI.draw\(c\)/);
  assert.equal((html.match(/VehicleTrackingUI.renderDriver\(b\)/g)||[]).length,2);
  assert.match(html,/activeTab==="jobs"\)VehicleTrackingUI.mountDriver/);
  assert.equal((html.match(/VehicleTrackingUI\?\.reset\(\)/g)||[]).length,2);
});
