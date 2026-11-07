const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),vm=require("node:vm");
const {spawnSync}=require("node:child_process"),ts=require("typescript");
test("Installed native bridge auto-saves in a real DOM, and a failed retake safely retries",()=>{
 const root=path.resolve(__dirname,"../../..");
 const exportsObject={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/native-evidence.ts"),"utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS}
 }).outputText,{exports:exportsObject});
 const automatic="say(status,'Saving photo automatically…',false);\n   await store(kind,ref,id);";
 assert.ok(exportsObject.NATIVE_EVIDENCE_BRIDGE.includes(automatic));
 // Exercise the older bridge already installed on users' phones.
 const bridge=exportsObject.NATIVE_EVIDENCE_BRIDGE.replace(automatic,"say(status,'Photo ready — tap Capture & Store to upload it.',false);");
 const autosave=fs.readFileSync(path.join(root,"artifacts/uk-on-wheels/public/photo-autosave.js"),"utf8");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ukow-auto-photo-"));
 const file=path.join(dir,"test.html");
 try{
  fs.writeFileSync(file,`<!doctype html><body>
  <div class="cameraBox"><button class="cameraAreaTab"><span>Front of car</span></button>
   <div class="cameraPreview"><canvas id="c_TEST-1_0"></canvas></div>
   <div class="camActions"><button class="primary" onclick="captureCamera('TEST-1','0')">Capture &amp; Store</button></div>
   <div id="s_TEST-1_0" class="captureMeta"></div></div><pre id="verdict">RUNNING</pre>
  <script>
   let role='driver',currentUser={},pickupChecklistSaves=new Set(),requests=[],uploads=0,fail=false,release;
   const booking={ref:'TEST-1',_normalizedId:'test-only'};
   function getStore(){return {bookings:[booking]};}
   function startCamera(){} function captureCamera(){}
   window.ReactNativeWebView={postMessage:value=>requests.push(JSON.parse(value))};
   async function uploadBookingEvidence(){uploads++;if(fail)throw Error('Test offline');await new Promise(resolve=>release=resolve);return 'test-only/photo.jpg';}
   function updateEvidencePreview(status){status.dataset.captured='1';status.classList.remove('error');status.textContent='Stored';}
  </script><script>${bridge}</script><script>${autosave}</script><script>
   const check=(ok,message)=>{if(!ok)throw Error(message);};
   async function waitFor(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out');}
   (async()=>{
    const status=document.getElementById('s_TEST-1_0'),button=document.querySelector('.primary');
    const result=()=>({id:requests.at(-1).id,image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9S0AAAAASUVORK5CYII=',timestamp:new Date().toISOString(),latitude:51,longitude:0,accuracy:5});
    startCamera('TEST-1','0');await __ukowNativeEvidenceResult(result());
    await waitFor(()=>uploads===1);
    check(button.hidden,'Capture & Store must be hidden');
    check(button.disabled,'Navigation guard must see upload busy');
    check(status.dataset.captured!=='1','Unconfirmed upload cannot count as saved');
    release();await waitFor(()=>status.dataset.captured==='1');
    check(booking.pickupPhotos['0'].storagePath==='test-only/photo.jpg','Booking link missing');
    fail=true;startCamera('TEST-1','0');await __ukowNativeEvidenceResult(result());
    await waitFor(()=>status.classList.contains('error'));
    await waitFor(()=>!button.hidden);
    check(uploads===2,'Automatic retry loop');
    check(status.dataset.captured==='1','Failed retake lost old saved photo');
    check(button.textContent==='Retry save','No retry action');
    fail=false;button.click();await waitFor(()=>uploads===3);
    release();await waitFor(()=>!button.disabled&&!status.classList.contains('error'));
    check(!document.querySelector('.nativeCameraPreview'),'Staged image not cleared after save');
    document.getElementById('verdict').textContent='PASS';
   })().catch(error=>document.getElementById('verdict').textContent='FAIL: '+error.message);
  </script>`);
  const run=spawnSync("chromium",["--headless","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--virtual-time-budget=5000","--dump-dom","file://"+file],{encoding:"utf8",timeout:30000,maxBuffer:2000000});
  assert.equal(run.status,0,run.stderr);
  assert.match(run.stdout,/<pre id="verdict">PASS<\/pre>/,run.stdout.match(/<pre id="verdict">.*?<\/pre>/)?.[0]||run.stderr);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
