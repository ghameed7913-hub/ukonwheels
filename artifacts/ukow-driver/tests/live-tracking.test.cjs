const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/live-tracking.ts'),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}
}).outputText;
const session={token:'a'.repeat(64),booking_id:'00000000-0000-4000-8000-000000000001',
  owner_id:'00000000-0000-4000-8000-000000000002',reference:'UKOW00001',
  expires_at:new Date(Date.now()+86400000).toISOString(),endpoint:'https://example.supabase.co',anonKey:'test-public-anon-key'};
test('Native app enables locked-phone location on both Android and iPhone',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../app.json'),'utf8')).expo;
  const plugin=config.plugins.find(x=>Array.isArray(x)&&x[0]==='expo-location');
  assert.equal(plugin[1].isIosBackgroundLocationEnabled,true);
  assert.equal(plugin[1].isAndroidBackgroundLocationEnabled,true);
  assert.equal(plugin[1].isAndroidForegroundServiceEnabled,true);
});
function harness(){
  const state={running:false,available:true,granted:true,background:true,active:true,stored:null,requests:[],task:null,config:null};
  const Location={Accuracy:{High:4},ActivityType:{AutomotiveNavigation:1},
    hasStartedLocationUpdatesAsync:async()=>state.running,stopLocationUpdatesAsync:async()=>{state.running=false;},
    requestForegroundPermissionsAsync:async()=>({granted:state.granted}),
    getBackgroundPermissionsAsync:async()=>({granted:state.background}),
    requestBackgroundPermissionsAsync:async()=>({granted:state.background}),
    hasServicesEnabledAsync:async()=>true,
    startLocationUpdatesAsync:async(_,config)=>{state.running=true;state.config=config;},
    getCurrentPositionAsync:()=>new Promise(()=>{}),
  };
  const mocks={
    'expo-location':Location,
    'expo-task-manager':{isTaskDefined:()=>false,isAvailableAsync:async()=>state.available,defineTask:(_,f)=>state.task=f},
    'expo-secure-store':{AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY:1,
      getItemAsync:async()=>state.stored,setItemAsync:async(_,value)=>{state.stored=value;},
      deleteItemAsync:async()=>{state.stored=null;}},
    'expo-constants':{__esModule:true,default:{executionEnvironment:'standalone'}},
    'react-native':{Platform:{OS:'android'},Alert:{alert:(_,__,buttons)=>buttons[1].onPress()}},
  };
  const exports={};vm.runInNewContext(code,{exports,require:n=>{if(!mocks[n])throw Error('Unknown import '+n);return mocks[n];},
    URL,Date,JSON,AbortController,setTimeout,clearTimeout,console,
    fetch:async(url,options)=>{state.requests.push({url,headers:options.headers,body:JSON.parse(options.body)});
      return {ok:true,json:async()=>url.endsWith('close_vehicle_tracking')?true:{active:state.active,accepted:true}};}});
  return {api:exports,state,mocks};
}
test('Native background tracking requires a real app and grants; credentials are securely stored, never portal JWTs',async()=>{
  const {api,state}=harness();state.available=false;
  await assert.rejects(api.startNativeTracking(session),/not Expo Go/);assert.equal(state.stored,null);
  state.available=true;state.granted=false;
  await assert.rejects(api.startNativeTracking(session),/precise location/);assert.equal(state.running,false);
  state.granted=true;state.background=false;
  await assert.rejects(api.startNativeTracking(session),/all the time/);assert.equal(state.stored,null);
  state.background=true;
  const result=await api.startNativeTracking(session);
  assert.equal(result.sharing,true);assert.equal(state.running,true);
  assert.equal(state.config.showsBackgroundLocationIndicator,true);
  assert.equal(state.config.pausesUpdatesAutomatically,false);
  assert.equal(state.config.foregroundService.killServiceOnDestroy,false);
  assert.equal(JSON.parse(state.stored).token,session.token);
  assert.ok(!JSON.stringify(result).includes(session.token));
  await api.stopNativeTracking();assert.equal(state.stored,null);assert.equal(state.running,false);
});
test('Latest background fix posts only to the scoped endpoint; server delivery/reassignment rejection ends GPS',async()=>{
  const {api,state}=harness();await api.startNativeTracking(session);
  const timestamp=Date.now(),coords={latitude:55.8,longitude:-4.2,accuracy:8};
  await state.task({data:{locations:[{timestamp:timestamp-1000,coords:{...coords,latitude:40}},{timestamp,coords}]}});
  const request=state.requests.at(-1);
  assert.ok(request.url.endsWith('/rest/v1/rpc/publish_vehicle_location'));
  assert.equal(request.body.p_latitude,55.8);assert.equal(request.body.p_token,session.token);
  assert.equal(request.headers.Authorization,undefined);
  state.active=false;await state.task({data:{locations:[{timestamp:timestamp+1000,coords}]}});
  assert.equal(state.running,false);assert.equal(state.stored,null);
  assert.equal((await api.nativeTrackingStatus()).sharing,false);
});
test('Account switch/sign-out stops sharing and erases its native capability; unknown fetch hosts are rejected',async()=>{
  const {api,state}=harness();await api.syncTrackingOwner(session.owner_id);await api.startNativeTracking(session);
  await api.syncTrackingOwner('00000000-0000-4000-8000-000000000009');
  assert.equal(state.running,false);assert.equal(state.stored,null);
  assert.ok(state.requests.at(-1).url.endsWith('close_vehicle_tracking'));
  assert.equal(api.validTrackingSession({...session,endpoint:'https://attacker.example'}),false);
  assert.equal(api.validTrackingSession({...session,endpoint:'https://example.supabase.co/redirect'}),false);
  assert.equal(api.validTrackingSession({...session,expires_at:'2000-01-01'}),false);
  assert.equal(api.validTrackingSession({...session,token:'not-a-token'}),false);
});
test('Restored orphaned native location tasks are stopped instead of running silently forever',async()=>{
  const {api,state}=harness();state.running=true;state.stored='invalid JSON';
  const status=await api.nativeTrackingStatus();
  assert.equal(status.sharing,false);assert.equal(state.running,false);assert.equal(state.stored,null);
});
