const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function setup(){
 const c=vm.createContext({window:{}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/pickup-photo-guides.js"),"utf8"),c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/pickup-checklist.js"),"utf8"),c);
 vm.runInContext(html.slice(html.indexOf("function cameraSlot("),html.indexOf(" const cameraStreams=",html.indexOf("function cameraSlot("))),c);
 return {c,g:c.window.PickupPhotoGuides,checklist:c.window.PickupChecklist};
}
test("Every required vehicle and conditional item photo has a grey reference illustration",()=>{
 const {g,checklist}=setup();
 const labels=[...checklist.vehicleSlots.map(x=>x.label),"Keys","Charging cable","Spare tyre","Log book","Service history","Damage photo 1","Damage photo 250"];
 for(const label of labels){
  assert.equal(g.has(label),true,label);
  const guide=g.render(label);
  assert.match(guide,/<svg/);assert.match(guide,/class="pickupPhotoGuide"/);
  assert.match(guide,/class="pickupPhotoHint"/);
  assert.doesNotMatch(guide,/<image\b|<img\b|<script|(?:src|href)\s*=\s*["']https?:|onload=|onerror=|data-captured=|storagePath|<span/);
 }
});
test("Front/rear, four wheel positions, mileage, rear seats and item guides are distinct",()=>{
 const {g}=setup();
 for(const labels of [
  ["Front of car","Back side"],["Driver side","Passenger side"],
  ["Driver side front wheel","Driver side rear wheel","Passenger side front wheel","Passenger side rear wheel"],
  ["Mileage","Exterior","Back seats"],["Log book","Service history","Keys","Charging cable","Spare tyre"]
 ])assert.equal(new Set(labels.map(x=>g.render(x))).size,labels.length);
});
test("UK Driver and Passenger side hints are explicit and unknown text cannot inject markup",()=>{
 const {g}=setup();
 assert.match(g.render("Driver side"),/right/i);assert.match(g.render("Passenger side"),/left/i);
 assert.equal(g.has("Unknown"),false);assert.equal(g.render('<img onerror="bad()">'),"");
});
test("Guides preserve actual camera labels, live-camera clicks, and the unsaved evidence state",()=>{
 const {c}=setup(),b={ref:"GUIDE-1",_normalizedId:"booking-1",pickupPhotos:{}};
 const slot=c.cameraSlot(b,"pc_driver_front_wheel","Driver side front wheel",false,true);
 assert.match(slot,/class="cameraAreaTab has-photo-guide"/);
 assert.match(slot,/<span>Driver side front wheel<\/span>/);
 assert.match(slot,/startCamera\('GUIDE-1','pc_driver_front_wheel'\)/);
 assert.doesNotMatch(slot,/data-captured="1"|photo-stored/);
 assert.match(slot,/Not captured/);
 assert.match(slot,/data-required="1"/);
 assert.equal(Object.keys(b.pickupPhotos).length,0);
});
test("Stored actual photos still open the evidence preview and are not replaced by guides",()=>{
 const {c}=setup(),b={ref:"GUIDE-1",_normalizedId:"booking-1",pickupPhotos:{p:{label:"Front of car",storagePath:"booking-1/front.jpg",image:"https://photos.example/front.jpg"}}};
 const slot=c.cameraSlot(b,"pc_front","Front of car",false,true);
 assert.match(slot,/photo-stored/);assert.match(slot,/toggleStoredPhoto\(this\)/);
 assert.match(slot,/class="storedPhoto" src="https:\/\/photos.example\/front.jpg"/);
 assert.match(slot,/data-captured="1"/);
 assert.match(html,/\.photo-stored \.cameraAreaTab\.has-photo-guide>\.pickupPhotoGuide/);
});
test("Guide loading is artifact-relative and its notice distinguishes references from stored evidence",()=>{
 assert.match(html,/src="\.\/pickup-photo-guides.js"/);
 assert.match(html,/guides only, not saved evidence/);
 assert.match(html,/capture your own photo/);
});
