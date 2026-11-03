const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const output={};
vm.runInNewContext(ts.transpileModule(read('lib/bridge.ts'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{exports:output,require:()=>({})});
async function run(logoutNow){
  const messages=[];
  const context={window:{ReactNativeWebView:{postMessage:value=>messages.push(JSON.parse(value))}}};
  if(logoutNow)context.logoutNow=logoutNow;
  vm.runInNewContext(output.LOGOUT_SCRIPT,context);
  await new Promise(resolve=>setImmediate(resolve));
  return messages;
}
test('Native logout delegates to the existing save-protected portal flow',async()=>{
  let calls=0;
  assert.deepEqual(await run(async()=>{calls++;}),[]);
  assert.equal(calls,1);
});
test('Declining portal logout does not emit a false signed-out event',async()=>{
  assert.deepEqual(await run(async()=>undefined),[]);
});
test('Logout reports unavailable portal and asynchronous failures',async()=>{
  for(const action of [undefined,async()=>{throw Error('offline');}]){
    const messages=await run(action);
    assert.equal(messages[0].type,'logout-error');
    assert.equal(messages.length,1);
  }
});
test('Both native logout controls exist; signed-out event clears account state',()=>{
  const home=read('app/index.tsx'),portal=read('components/DriverPortal.tsx');
  assert.match(home,/testID="home-logout"/);
  assert.match(portal,/testID="portal-logout"/);
  assert.match(home,/setSignedIn\(false\);setJobCounts\(null\);setSection\(null\);setNotificationId\(null\)/);
  assert.match(portal,/syncTrackingOwner\(null\)/);
});
test('Weather defaults to a compact pill with controls hidden until expanded',()=>{
  const weather=read('components/LocalWeather.tsx');
  assert.match(weather,/\[details, setDetails\] = useState\(false\)/);
  assert.match(weather,/testID="weather-summary"/);
  assert.match(weather,/\{details && <View/);
  assert.match(weather,/testID="weather-warning-summary"/);
  assert.match(weather,/warnings could not be confirmed/);
  assert.match(weather,/Weather unavailable/);
});
