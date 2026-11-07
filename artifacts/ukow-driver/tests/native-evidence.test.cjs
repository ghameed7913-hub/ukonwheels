const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/native-evidence.ts'),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS}
}).outputText,{exports:exportsObject});
function harness(){
 const sent=[],timers=new Map(),uploads=[];
 let timer=0,fail=false;
 const classes={toggle(){},add(){},remove(){}};
 const button={disabled:false},preview={prepend(){}};
 const box={classList:classes,querySelector:s=>s==='.camActions .primary'?button:s==='.cameraPreview'?preview:s==='.cameraAreaTab span'?{textContent:'Front of car'}:null,querySelectorAll:()=>[]};
 const status={dataset:{},classList:classes,isConnected:true,closest:()=>box};
 const canvas={getContext:()=>({drawImage(){},fillRect(){},fillText(){}}),toDataURL:()=>'data:image/jpeg;base64,c2F2ZWQ='};
 const booking={ref:'TEST-1',_normalizedId:'secure-id'};
 class Image {naturalWidth=1600;naturalHeight=1200;set src(value){this.onload();}}
 const context={
  window:null,role:'driver',currentUser:{},pickupChecklistSaves:new Set(),
  document:{getElementById:id=>/^(s|ds)_TEST-1_0$/.test(id)?status:/^(c|dcv)_TEST-1_0$/.test(id)?canvas:null,
   createElement:()=>({style:{}})},
  ReactNativeWebView:{postMessage:x=>sent.push(JSON.parse(x))},
  setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id),setInterval(){},
  startCamera(){throw Error('Web camera should not run');},captureCamera(){},startDeliveryCamera(){},captureDeliveryCamera(){},
  getStore:()=>({bookings:[booking]}),
  uploadBookingEvidence:async(...args)=>{uploads.push(args);if(fail)throw Error('Network offline');return 'secure/photo.jpg';},
  updateEvidencePreview:()=>{status.dataset.captured='1';},Image,
 };
 context.window=context;vm.runInNewContext(exportsObject.NATIVE_EVIDENCE_BRIDGE,context);
 const result={id:'1',image:'data:image/jpeg;base64,aGVsbG8=',timestamp:'2026-10-24T12:00:00Z',latitude:51,longitude:0,accuracy:5};
 return {context,sent,status,button,uploads,booking,result,timers,setFail:v=>fail=v};
}
test('Pickup automatically stores against the same booking after the camera returns',async()=>{
 const h=harness();h.context.startCamera('TEST-1','0');
 assert.deepEqual(h.sent,[{type:'take-evidence-photo',id:'1'}]);
 assert.equal(h.button.disabled,true);assert.equal(h.uploads.length,0);
 await h.context.__ukowNativeEvidenceResult(h.result);
 assert.equal(h.button.disabled,false);assert.equal(h.status.dataset.captured,'1');
 assert.equal(h.uploads.length,1);
 assert.equal(h.uploads[0][0],h.booking);assert.equal(h.uploads[0][2],'pickup');
 assert.equal(h.uploads[0][7],h.result.timestamp);
 assert.equal(h.booking.pickupPhotos['0'].storagePath,'secure/photo.jpg');
 assert.equal(h.status.dataset.captured,'1');
 assert.equal(h.timers.size,0);
});
test('Delivery uses the delivery evidence type',async()=>{
 const h=harness();h.context.startDeliveryCamera('TEST-1','0');
 await h.context.__ukowNativeEvidenceResult(h.result);
 assert.equal(h.uploads.length,1);
 assert.equal(h.uploads[0][2],'delivery');assert.ok(h.booking.deliveryPhotos['0']);
 assert.equal(h.booking.pickupPhotos,undefined);
});
test('Cancel preserves existing saved evidence and clears the busy state',async()=>{
 const h=harness();h.status.dataset.captured='1';h.context.startCamera('TEST-1','0');
 await h.context.__ukowNativeEvidenceResult({id:'1',cancelled:true});
 assert.equal(h.status.dataset.captured,'1');assert.equal(h.button.disabled,false);
 assert.equal(h.timers.size,0);assert.equal(h.uploads.length,0);
});
test('Upload failure does not mark saved, keeps the photo for retry and re-enables controls',async()=>{
 const h=harness();h.context.startCamera('TEST-1','0');
 h.setFail(true);
 await h.context.__ukowNativeEvidenceResult(h.result);
 assert.notEqual(h.status.dataset.captured,'1');assert.equal(h.button.disabled,false);
 assert.match(h.status.textContent,/Network offline/);
 assert.match(h.status.textContent,/Retry save/);
 h.setFail(false);await h.context.captureCamera('TEST-1','0');
 assert.equal(h.status.dataset.captured,'1');
});
test('Invalid GPS and unsolicited results cannot save a photo',async()=>{
 const h=harness();
 await h.context.__ukowNativeEvidenceResult(h.result);
 h.context.startCamera('TEST-1','0');
 await h.context.__ukowNativeEvidenceResult({...h.result,latitude:NaN});
 await h.context.captureCamera('TEST-1','0');
 assert.equal(h.uploads.length,0);
});
test('Signed-out and non-Driver sessions cannot open native camera',()=>{
 const h=harness();h.context.currentUser=null;h.context.startCamera('TEST-1','0');
 h.context.currentUser={};h.context.role='admin';h.context.startCamera('TEST-1','0');
 assert.equal(h.sent.length,0);
});
