const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const src=fs.readFileSync(path.join(__dirname,"../public/pickup-checklist.js"),"utf8");
function load(extra){const w=Object.assign({},extra||{});w.window=w;vm.createContext(w);vm.runInContext(src,w);return w}
const W=load(),PC=W.PickupChecklist;
const {test:t}=require("node:test");
const LABELS=["Front of car","Driver side","Driver side front wheel","Driver side rear wheel","Back side","Passenger side","Passenger side front wheel","Passenger side rear wheel","Mileage","Exterior","Back seats"];
const ph=(labels)=>labels.map(l=>({label:l,storagePath:"p/"+l}));
const base={version:1,electricVehicle:"no",chargingCable:"",chargingCableReason:"",spareTyre:"no",logBook:"no",serviceHistory:"no",damagePresent:"no",damageComments:"",condition:"Good",mileage:100,fuelLevel:"Full",notes:""};
const req=ph([...LABELS,"Keys"]);
const throws=(f,re)=>assert.throws(f,re);

t("eleven slots exact, stable ids",()=>{
 assert.strictEqual(JSON.stringify(PC.vehicleSlots.map(s=>s.label)),JSON.stringify(LABELS));
 PC.vehicleSlots.forEach(s=>{assert.match(s.id,/^pc_/);assert.ok(!/^d?\d+$/.test(s.id))});
 assert.strictEqual(new Set(PC.vehicleSlots.map(s=>s.id)).size,11);
});
t("render uses callback with required, keys d1, wrappers hidden",()=>{
 const calls=[];const cs=(b,id,label,wide,required)=>{calls.push({id,label,required});return `<div id="box_${b.ref}_${id}"></div>`};
 const h=PC.render({ref:"R1",pickupPhotos:{},pickupInspection:{checklist:{...base,spareTyre:"yes"}}},cs);
 assert.strictEqual(calls.filter(c=>c.required&&LABELS.includes(c.label)).length,11);
 assert.ok(calls.some(c=>c.id==="d1"&&c.label==="Keys"&&c.required));
 ["Charging cable","Spare tyre","Log book","Service history","Damage photo 1"].forEach(l=>assert.ok(calls.some(c=>c.label===l),l));
 assert.match(h,/id="pc_spare_tyre_wrap_R1"(?! hidden)/);assert.match(h,/id="pc_log_book_wrap_R1" hidden/);
 assert.match(h,/id="pc_electric_vehicle_R1"/);assert.match(h,/value="yes" checked/);
 assert.match(h,/id="condition_R1"/);assert.match(h,/id="mileage_R1"/);assert.match(h,/id="fuel_R1"/);assert.match(h,/id="inspection_R1"/);
 assert.ok(!/Declaration|Picked Up/.test(h));
});
t("render restores stored damage slots",()=>{
 const ids=[];PC.render({ref:"R",pickupPhotos:{a:{label:"Damage photo 1"},b:{label:"Damage photo 7"}}},(b,id)=>{ids.push(id);return ""});
 assert.ok(ids.includes("pc_damage_1")&&ids.includes("pc_damage_7"));
});
t("base valid",()=>assert.ok(PC.validate(base,req)));
t("missing yes/no",()=>["electricVehicle","spareTyre","logBook","serviceHistory","damagePresent"].forEach(k=>throws(()=>PC.validate({...base,[k]:""},req),/Yes or No/)));
t("missing each vehicle photo and keys",()=>[...LABELS,"Keys"].forEach(l=>throws(()=>PC.validate(base,req.filter(p=>p.label!==l)),new RegExp(l))));
t("storagePath required, not image",()=>throws(()=>PC.validate(base,[...req.slice(1),{label:LABELS[0],image:"data:x"}]),/Front of car/));
t("EV cable conditions",()=>{
 throws(()=>PC.validate({...base,electricVehicle:"yes"},req),/charging cable/);
 throws(()=>PC.validate({...base,electricVehicle:"yes",chargingCable:"yes"},req),/Charging cable/);
 assert.ok(PC.validate({...base,electricVehicle:"yes",chargingCable:"yes"},[...req,...ph(["Charging cable"])]));
 throws(()=>PC.validate({...base,electricVehicle:"yes",chargingCable:"no"},req),/Explain/);
 assert.ok(PC.validate({...base,electricVehicle:"yes",chargingCable:"no",chargingCableReason:"Owner kept it"},req));
});
t("items yes require photos",()=>[["spareTyre","Spare tyre"],["logBook","Log book"],["serviceHistory","Service history"]].forEach(([k,l])=>{
 throws(()=>PC.validate({...base,[k]:"yes"},req),new RegExp(l));assert.ok(PC.validate({...base,[k]:"yes"},[...req,...ph([l])]));
}));
t("damage rules and condition consistency",()=>{
 throws(()=>PC.validate({...base,damagePresent:"yes"},req),/Describe/);
 throws(()=>PC.validate({...base,damagePresent:"yes",damageComments:"dent"},req),/damage photo/);
 throws(()=>PC.validate({...base,damagePresent:"yes",damageComments:"dent"},[...req,{label:"Damage photo 0",storagePath:"x"}]),/damage photo/);
 assert.ok(PC.validate({...base,damagePresent:"yes",damageComments:"dent"},[...req,...ph(["Damage photo 23"])]));
 throws(()=>PC.validate({...base,condition:"Damage Present"},req),/correct/);
 assert.ok(PC.validate({...base,condition:"Not Roadworthy"},req));
});
t("requiredLabels",()=>{assert.strictEqual(PC.requiredLabels(base).length,12);
 assert.ok(PC.requiredLabels({...base,electricVehicle:"yes",chargingCable:"yes",logBook:"yes"}).includes("Charging cable"));
 assert.ok(!PC.requiredLabels({...base,electricVehicle:"no",chargingCable:"yes"}).includes("Charging cable"));});

// fake doc
function fakeDoc(vals,radios){
 const els={};const get=id=>els[id]||(els[id]={id,hidden:false,value:vals[id]??"",querySelector:()=>null});
 return {els,getElementById:id=>(id in vals||id in els||/wrap/.test(id))?get(id):null,
  querySelector:sel=>{const m=sel.match(/name="([^"]+)"/);return m&&radios[m[1]]?{value:radios[m[1]]}:null}};
}
const R="X9";
const goodVals={["condition_"+R]:"Good",["mileage_"+R]:"4521",["fuel_"+R]:"Half",["inspection_"+R]:" notes ",["pc_charging_cable_reason_"+R]:"hidden reason",["pc_damage_comments_"+R]:"hidden dmg"};
const radios=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>["pc_"+k+"_"+R,v]));
t("read normalizes hidden values",()=>{
 const v=PC.read(fakeDoc(goodVals,radios({electric_vehicle:"no",charging_cable:"no",spare_tyre:"yes",log_book:"no",service_history:"no",damage_present:"no"})),{ref:R});
 assert.strictEqual(v.mileage,4521);assert.strictEqual(v.chargingCable,"");assert.strictEqual(v.chargingCableReason,"");assert.strictEqual(v.damageComments,"");
 assert.strictEqual(v.notes,"notes");assert.strictEqual(v.version,1);assert.strictEqual(v.spareTyre,"yes");
 const v2=PC.read(fakeDoc(goodVals,radios({electric_vehicle:"yes",charging_cable:"no",damage_present:"yes"})),{ref:R});
 assert.strictEqual(v2.chargingCableReason,"hidden reason");assert.strictEqual(v2.damageComments,"hidden dmg");
});
t("read throws bad basics",()=>{
 throws(()=>PC.read(fakeDoc({...goodVals,["mileage_"+R]:""},{}),{ref:R}),/mileage/);
 throws(()=>PC.read(fakeDoc({...goodVals,["mileage_"+R]:"abc"},{}),{ref:R}),/mileage/);
 throws(()=>PC.read(fakeDoc({...goodVals,["condition_"+R]:""},{}),{ref:R}),/condition/);
 throws(()=>PC.read(fakeDoc({...goodVals,["fuel_"+R]:"Lots"},{}),{ref:R}),/fuel/);
});
t("updateConditional toggles without rerender",()=>{
 let closed=0;const d=fakeDoc({},radios({electric_vehicle:"yes",charging_cable:"no",log_book:"yes",damage_present:"no"}));
 const w=load({closeDriverCameras:()=>{closed++;return true}});
 d.getElementById("pc_damage_wrap_"+R).querySelector=()=>({});
 w.PickupChecklist.updateConditional(R,d);
 assert.strictEqual(d.els["pc_ev_wrap_"+R].hidden,false);assert.strictEqual(d.els["pc_cable_reason_wrap_"+R].hidden,false);
 assert.strictEqual(d.els["pc_cable_photo_wrap_"+R].hidden,true);assert.strictEqual(d.els["pc_log_book_wrap_"+R].hidden,false);
 assert.strictEqual(d.els["pc_damage_wrap_"+R].hidden,true);assert.strictEqual(closed,1);
});
t("addPhoto many unique damage slots",()=>{
 const b={ref:R,pickupPhotos:{a:{label:"Damage photo 1",storagePath:"x"},b:{label:"Damage photo 4",storagePath:"y"}}};
 let html="";const list={id:"pc_damage_list_"+R,insertAdjacentHTML:(_,h)=>{html+=h},querySelectorAll:()=>(html.match(/id="box_X9_pc_damage_\d+"/g)||[]).map(s=>({id:s.slice(4,-1)}))};
 const w=load({getStore:()=>({bookings:[b]}),cameraSlot:(bb,id,label)=>`<div id="box_${bb.ref}_${id}" data-l="${label}"></div>`});
 const doc={getElementById:id=>id===list.id?list:null};
 const ns=[];for(let i=0;i<20;i++)ns.push(w.PickupChecklist.addPhoto(R,doc));
 assert.deepStrictEqual([...ns],Array.from({length:20},(_,i)=>i+5));assert.match(html,/data-l="Damage photo 24"/);
});
t("summary escaped and empty for non-v1",()=>{
 assert.strictEqual(PC.renderSummary(null),"");assert.strictEqual(PC.renderSummary({version:2}),"");
 const s=PC.renderSummary({...base,electricVehicle:"yes",chargingCable:"no",chargingCableReason:"<b>x</b>",damagePresent:"yes",damageComments:'<img src=x onerror="a">'});
 assert.ok(!/<img|<b>/.test(s));assert.match(s,/&lt;img/);assert.match(s,/No cable reason/);assert.match(s,/Damage comments/);
 const s2=PC.renderSummary({...base,chargingCableReason:"secret"});assert.ok(!/secret|Charging cable/.test(s2));
});
t("render escapes restored comments",()=>{
 const h=PC.render({ref:"R",pickupInspection:{checklist:{...base,damagePresent:"yes",damageComments:"</textarea><script>"}}},()=>"");
 assert.ok(!/<script>/.test(h));
});
