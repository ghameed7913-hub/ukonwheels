const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../lib/weather-location.ts'),'utf8');
function harness(status,canAskAgain=true){
  let requests=0;
  const exports={};
  const permission={status,granted:status==='granted',canAskAgain};
  vm.runInNewContext(ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS}
  }).outputText,{exports,require:()=>({
    getForegroundPermissionsAsync:async()=>permission,
    requestForegroundPermissionsAsync:async()=>{requests++;return {...permission,status:'granted',granted:true};},
  })});
  return {check:exports.weatherLocationPermission,requests:()=>requests};
}
test('First app open requests foreground location to find the city automatically',async()=>{
  const h=harness('undetermined');
  assert.equal((await h.check(false,true)).granted,true);
  assert.equal(h.requests(),1);
});
test('Existing permission uses automatic location without another prompt',async()=>{
  const h=harness('granted');
  assert.equal((await h.check(false,true)).granted,true);
  assert.equal(h.requests(),0);
});
test('Automatic launch and resume do not reprompt after a previous denial',async()=>{
  for(const onOpen of [true,false]){
    const h=harness('denied');
    assert.equal((await h.check(false,onOpen)).granted,false);
    assert.equal(h.requests(),0);
  }
});
test('Manual retry may ask again but permanently denied permission requires Settings',async()=>{
  const retry=harness('denied');
  assert.equal((await retry.check(true,false)).granted,true);
  assert.equal(retry.requests(),1);
  const blocked=harness('denied',false);
  assert.equal((await blocked.check(true,false)).granted,false);
  assert.equal(blocked.requests(),0);
});
