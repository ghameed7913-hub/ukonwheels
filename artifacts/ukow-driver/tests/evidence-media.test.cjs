const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/evidence-media.ts'),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS}
}).outputText;
function harness({recent=null,fresh=null,timeout=false}={}){
 const calls=[],timers=[];
 const output={};
 const location={
  Accuracy:{Balanced:3},
  getLastKnownPositionAsync:async options=>{calls.push(['recent',options]);return recent;},
  getCurrentPositionAsync:async options=>{calls.push(['fresh',options]);return timeout?new Promise(()=>{}):fresh;},
 };
 const manipulation={SaveFormat:{JPEG:'jpeg'},manipulateAsync:async(...args)=>{
  calls.push(['resize',...args]);return {base64:'cGhvdG8=',uri:'file:///cache/small.jpg'};
 }};
 vm.runInNewContext(source,{
  exports:output,require:name=>name==='expo-location'?location:manipulation,
  setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},
  clearTimeout:id=>{timers[id-1].cleared=true;},
 });
 return {media:output,calls,timers};
}
function position(age=0,accuracy=10){
 return {timestamp:Date.now()-age,coords:{latitude:51.5,longitude:-0.1,accuracy}};
}
test('Large landscape and portrait photos match existing evidence limits before crossing bridge',()=>{
 const h=harness();
 assert.deepEqual({...h.media.evidenceSize(4000,3000)},{width:1280,height:960});
 assert.deepEqual({...h.media.evidenceSize(3000,4000)},{width:720,height:960});
 assert.deepEqual({...h.media.evidenceSize(640,480)},{width:640,height:480});
 assert.throws(()=>h.media.evidenceSize(0,4000),/invalid photo dimensions/);
});
test('Recent warmed GPS avoids all additional device lookups',async()=>{
 const h=harness(),warm=position(1000);
 assert.equal(await h.media.getEvidencePosition(warm),warm);
 assert.equal(h.calls.length,0);
});
test('Recent accurate device GPS is reused with actual accuracy preserved',async()=>{
 const recent=position(5000,40),h=harness({recent});
 const result=await h.media.getEvidencePosition();
 assert.equal(result,recent);assert.equal(result.coords.accuracy,40);
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0][1].maxAge,30000);
 assert.equal(h.timers[0].cleared,true);
});
test('Stale or inaccurate cached GPS is replaced rather than falsely labelled fresh',async()=>{
 for(const recent of [position(60000),position(500,200)]){
  const fresh=position(),h=harness({recent,fresh});
  assert.equal(await h.media.getEvidencePosition(),fresh);
  assert.equal(h.calls[1][0],'fresh');
  assert.equal(h.calls[1][1].accuracy,3);
 }
});
test('Stale warmed GPS is not reused after a long camera session',async()=>{
 const recent=position(),h=harness({recent});
 assert.equal(await h.media.getEvidencePosition(position(60000)),recent);
 assert.equal(h.calls.length,1);
});
test('GPS lookup has a 12 second deadline rather than waiting indefinitely',async()=>{
 const h=harness({timeout:true});
 const result=h.media.getEvidencePosition();
 assert.equal(h.timers[0].ms,12000);h.timers[0].fn();
 await assert.rejects(result,/Location took too long/);
 assert.equal(h.timers[0].cleared,true);
});
test('Invalid GPS is rejected without inventing coordinates',async()=>{
 const h=harness({fresh:position(60000)});
 await assert.rejects(h.media.getEvidencePosition(),/recent GPS position/);
 assert.equal(h.media.isRecentPosition({...position(),coords:{latitude:100,longitude:0,accuracy:5}}),false);
});
test('Native image processing returns a bounded JPEG, with resize and compression',async()=>{
 const h=harness();
 const result=await h.media.prepareEvidencePhoto({uri:'file:///camera/photo.jpg',width:4000,height:3000});
 assert.equal(result.image,'data:image/jpeg;base64,cGhvdG8=');
 const call=h.calls[0];
 assert.equal(call[0],'resize');assert.equal(call[2][0].resize.width,1280);
 assert.equal(call[3].base64,true);assert.equal(call[3].format,'jpeg');
});
test('A sequence of evidence photos reuses a recent accurate GPS fix',async()=>{
 const recent=position(1000,20),h=harness({recent});
 assert.equal(await h.media.getEvidencePosition(),recent);
 assert.equal(await h.media.getEvidencePosition(),recent);
 assert.equal(h.calls.length,1);
});
test('Overlapping photo location requests share the same device lookup',async()=>{
 const recent=position(),h=harness({recent});
 const results=await Promise.all([h.media.getEvidencePosition(),h.media.getEvidencePosition()]);
 assert.equal(results[0],recent);assert.equal(results[1],recent);
 assert.equal(h.calls.length,1);
});
