const {test}=require("node:test");
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const code=fs.readFileSync(path.join(__dirname,"../public/photo-autosave.js"),"utf8");
function setup(){
 let failed=false,clicks=0;
 const status={dataset:{},textContent:"Photo ready — tap Capture & Store to upload it.",
  classList:{contains:()=>failed}};
 const image={src:"data:image/jpeg;base64,cGhvdG8="};
 const button={hidden:false,disabled:false,textContent:"Capture & Store",click(){clicks++;status.textContent="Uploading photo to secure booking storage…";}};
 const box={querySelector:s=>s===".captureMeta"?status:s===".camActions .primary"?button:s===".nativeCameraPreview"?image:null};
 const c={role:"driver",__ukowNativeEvidenceInstalled:true,document:{readyState:"complete",body:{},querySelectorAll:()=>[box]},queueMicrotask:fn=>fn(),MutationObserver:class{observe(){}}};
 c.window=c;vm.runInNewContext(code,c);
 return {c,status,image,button,clicks:()=>clicks,fail:v=>{failed=v;},scan:()=>c.UKOWPhotoAutosave.scan()};
}
test("Installed native bridge auto-saves a staged photo once, without a second tap",()=>{
 const h=setup();assert.equal(h.clicks(),1);assert.equal(h.button.hidden,true);
 h.status.textContent="Photo ready — tap Capture & Store to upload it.";
 h.scan();assert.equal(h.clicks(),1);
 h.image.src="data:image/jpeg;base64,bmV3";
 h.scan();assert.equal(h.clicks(),2);
});
test("A failed upload exposes Retry save and never loops automatic attempts",()=>{
 const h=setup();h.fail(true);h.status.textContent="Photo was not stored: Network offline.";
 h.scan();h.scan();
 assert.equal(h.button.hidden,false);assert.equal(h.button.textContent,"Retry save");assert.equal(h.clicks(),1);
});
test("Camera busy, cancelled and non-Driver states never trigger an upload",()=>{
 const h=setup();h.image.src="different";h.status.dataset.nativeBusy="1";
 h.status.textContent="Photo ready";h.scan();assert.equal(h.clicks(),1);
 delete h.status.dataset.nativeBusy;h.status.textContent="Camera cancelled";h.scan();assert.equal(h.clicks(),1);
 h.c.role="admin";h.status.textContent="Photo ready";h.scan();assert.equal(h.clicks(),1);
});
test("Both web shutters freeze the image before waiting for GPS",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 for(const [start,end] of [["async function captureCamera(","async function completePickup("],["async function captureDeliveryCamera(","async function incident("]]){
  const code=html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
  assert.ok(code.indexOf("drawImage(video")<code.indexOf("await getEvidencePosition()"));
  assert.match(code,/await uploadBookingEvidence/);
 }
 assert.doesNotMatch(html,/Capture & Store/);
});
