const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=ts.transpileModule(read('lib/location-access.ts'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}
}).outputText;
function harness(){
  const state={foreground:false,background:false,canAsk:true,services:true,available:true,os:'android',env:'standalone',requests:[]};
  const permission=key=>({granted:state[key],canAskAgain:state.canAsk});
  const mocks={
    'react-native':{Platform:{get OS(){return state.os;}}},
    'expo-constants':{__esModule:true,default:{get executionEnvironment(){return state.env;}}},
    'expo-task-manager':{isAvailableAsync:async()=>state.available},
    'expo-location':{
      getForegroundPermissionsAsync:async()=>permission('foreground'),
      getBackgroundPermissionsAsync:async()=>permission('background'),
      requestForegroundPermissionsAsync:async()=>{state.requests.push('foreground');state.foreground=true;return permission('foreground');},
      requestBackgroundPermissionsAsync:async()=>{state.requests.push('background');state.background=true;return permission('background');},
      hasServicesEnabledAsync:async()=>state.services,
    },
  };
  const exports={};vm.runInNewContext(source,{exports,require:n=>{if(!mocks[n])throw Error(n);return mocks[n];}});
  return {state,api:exports};
}
test('Checking access never prompts or starts GPS; both permission grants are required',async()=>{
  const {state,api}=harness();
  assert.equal(await api.readLocationAccess(),'permission');
  state.foreground=true;
  assert.equal(await api.readLocationAccess(),'permission');
  state.background=true;
  assert.equal(await api.readLocationAccess(),'allowed');
  assert.deepEqual(state.requests,[]);
});
test('Explicit disclosure consent requests foreground before background; no coordinate API is used',async()=>{
  const {state,api}=harness();
  assert.equal(await api.requestLocationAccess(),'allowed');
  assert.deepEqual(state.requests,['foreground','background']);
});
test('Denied permanently, location disabled, and Expo Go cannot unlock native sign-in',async()=>{
  const {state,api}=harness();state.canAsk=false;
  assert.equal(await api.requestLocationAccess(),'permission');
  assert.deepEqual(state.requests,[]);
  state.foreground=true;state.background=true;state.services=false;
  assert.equal(await api.readLocationAccess(),'services');
  state.services=true;state.env='storeClient';
  assert.equal(await api.readLocationAccess(),'unsupported');
  state.env='standalone';state.available=false;
  assert.equal(await api.readLocationAccess(),'unsupported');
});
test('Permission revocation is read afresh; browser preview does not request native permissions',async()=>{
  const {state,api}=harness();state.foreground=true;state.background=true;
  assert.equal(await api.readLocationAccess(),'allowed');
  state.background=false;
  assert.equal(await api.readLocationAccess(),'permission');
  state.os='web';
  assert.equal(await api.readLocationAccess(),'allowed');
  assert.deepEqual(state.requests,[]);
});
test('Gate protects the complete native home and sign-in; returning from Settings rechecks without discarding drafts',()=>{
  assert.match(read('app/index.tsx'),/<DriverLocationGate><DriverHome\/><\/DriverLocationGate>/);
  const gate=read('components/DriverLocationGate.tsx');
  assert.match(gate,/opened &&/);
  assert.match(gate,/AppState\.addEventListener/);
  assert.match(gate,/state === 'active'/);
  assert.match(gate,/await stopNativeTracking\(\)/);
  assert.match(gate,/requesting\.current\) return/);
  assert.match(gate,/testID="location-continue"/);
  assert.match(gate,/testID="location-settings"/);
  assert.match(gate,/Permission alone does not start delivery tracking/);
});
test('Server returns coordinates only for an eligible undelivered job with a matching active capability',()=>{
  const sql=fs.readFileSync(path.join(__dirname,'../../../supabase/live-vehicle-tracking.sql'),'utf8');
  const track=sql.split('create or replace function public.track_vehicle(')[1].split('end $$;')[0];
  assert.match(track,/b\.delivered_at is null and ukow_tracking_private\.eligible\(b\.status\)/);
  assert.match(track,/t\.revoked_at is null and t\.expires_at>now\(\)/);
  assert.match(track,/l\.token_hash=s\.token_hash/);
  assert.match(sql,/new\.driver_id is distinct from old\.driver_id or new\.delivered_at is not null/);
});
