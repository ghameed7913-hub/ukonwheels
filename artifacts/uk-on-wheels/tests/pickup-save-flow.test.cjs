const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const helper=fs.readFileSync(path.join(__dirname,"../public/pickup-checklist.js"),"utf8");
const source=html.slice(html.indexOf("async function completePickup("),html.indexOf("function driverMapLink("));
function setup(){
 const b={ref:"SYNTHETIC-1",_normalizedId:"booking-1",status:"Driver Assigned",driver:"Synthetic Driver",pickupPhotos:{},timeline:[]};
 const fields={},radios={electric_vehicle:"no",spare_tyre:"no",log_book:"no",service_history:"no",damage_present:"no"};
 const add=(id,props)=>fields[id]={id,isConnected:true,disabled:false,...props};
 add("ready_"+b.ref,{checked:true});add("dec_"+b.ref,{checked:true});
 add("condition_"+b.ref,{value:"Good"});add("mileage_"+b.ref,{value:"1000"});add("fuel_"+b.ref,{value:"Half"});add("inspection_"+b.ref,{value:"Review complete"});
 add("pickupSaveStatus_"+b.ref,{textContent:""});
 const card={querySelectorAll:()=>Object.values(fields)};
 const notices=[],calls=[];
 const c=vm.createContext({window:{},role:"driver",SUPABASE_CONFIGURED:true,currentSession:{user:{id:"driver-1"}},getStore:()=>({bookings:[b]}),
  document:{getElementById:id=>id==="driverActiveJob"?card:fields[id],querySelector:selector=>{
   const key=Object.keys(radios).find(k=>selector.includes('name="pc_'+k+'_'+b.ref+'"'));return key?{value:radios[key]}:null}},
  pickupChecklistSaves:new Set(),driverFormDrafts:{},saveDriverFormDraft(){},closeDriverCameras(){return true},draw(){calls.push({type:"draw"})},
  alert:message=>notices.push(message),sb:{rpc:async(name,args)=>{
   calls.push({type:"rpc",name,args});
   return {data:{booking_id:b._normalizedId,condition:args.p_checklist.condition,odometer_mileage:args.p_checklist.mileage,fuel_level:args.p_checklist.fuelLevel,notes:args.p_checklist.notes,inspected_at:"2026-10-19T10:00:00Z",checklist:JSON.parse(JSON.stringify(args.p_checklist))}};
  }}});
 c.driverPhotoIsSaving=()=>c.pickupChecklistSaves.size>0;
 vm.runInContext(helper,c);
 c.window.PickupChecklist.requiredLabels().forEach((label,i)=>b.pickupPhotos[i]={label,storagePath:"booking-1/"+i+".jpg"});
 vm.runInContext(source,c);
 return {c,b,fields,radios,notices,calls,rpcs:()=>calls.filter(x=>x.type==="rpc")};
}
test("Save persists answers but does not advance status; Picked Up only follows a confirmed matching save",async()=>{
 const s=setup();await s.c.completePickup(s.b.ref);
 assert.equal(s.rpcs().length,0);assert.match(s.notices.at(-1),/Save pickup evidence/);
 await s.c.savePickupEvidence(s.b.ref);
 assert.equal(s.b.status,"Driver Assigned");assert.equal(s.rpcs()[0].args.p_complete,false);
 assert.equal(s.b.pickupInspection.checklist.spareTyre,"no");
 await s.c.completePickup(s.b.ref);
 assert.equal(s.rpcs()[1].args.p_complete,true);assert.equal(s.b.status,"Picked Up");
 assert.equal(Object.keys(s.b.pickupPhotos).length,12);assert.equal(s.b.timeline.length,1);
 assert.equal(s.calls.filter(x=>x.type==="draw").length,1);
});
test("Edited checklist requires another Save, while server-reordered JSON keys do not",async()=>{
 const s=setup();await s.c.savePickupEvidence(s.b.ref);
 s.b.pickupInspection.checklist=Object.fromEntries(Object.entries(s.b.pickupInspection.checklist).reverse());
 s.fields["inspection_"+s.b.ref].value="Changed notes";
 await s.c.completePickup(s.b.ref);assert.equal(s.rpcs().length,1);assert.equal(s.b.status,"Driver Assigned");
 await s.c.savePickupEvidence(s.b.ref);await s.c.completePickup(s.b.ref);
 assert.equal(s.b.status,"Picked Up");assert.equal(s.b.pickupInspection.notes,"Changed notes");
});
test("Missing required photos, conditional evidence, Ready/declaration and invalid mileage prevent even Save",async()=>{
 for(const change of [
  s=>delete s.b.pickupPhotos[3],
  s=>s.fields["ready_"+s.b.ref].checked=false,
  s=>s.fields["dec_"+s.b.ref].checked=false,
  s=>s.fields["mileage_"+s.b.ref].value="-1",
  s=>s.radios.spare_tyre="yes",
  s=>{s.radios.electric_vehicle="yes";s.radios.charging_cable="no"},
  s=>{s.radios.damage_present="yes"},
 ]){
  const s=setup();change(s);await s.c.savePickupEvidence(s.b.ref);
  assert.equal(s.rpcs().length,0);assert.equal(s.b.status,"Driver Assigned");assert.ok(s.notices.length);
 }
});
test("Failed saves preserve Driver input, uploaded photos and original status",async()=>{
 const s=setup();s.c.sb.rpc=async()=>({error:{code:"PGRST202",message:"Missing function"}});
 await s.c.savePickupEvidence(s.b.ref);
 assert.equal(s.b.pickupInspection,undefined);assert.equal(s.b.status,"Driver Assigned");
 assert.equal(s.fields["mileage_"+s.b.ref].value,"1000");assert.equal(Object.keys(s.b.pickupPhotos).length,12);
 assert.match(s.notices.at(-1),/supabase\/pickup-checklist.sql/);
 assert.equal(s.c.pickupChecklistSaves.size,0);assert.ok(Object.values(s.fields).every(f=>!f.disabled));
});
test("Unlinked bookings, wrong roles, absent sessions and non-assigned statuses cannot submit",async()=>{
 for(const change of [
  s=>s.c.role="client",s=>s.c.currentSession=null,s=>delete s.b._normalizedId,s=>s.b.status="Delivered"
 ]){
  const s=setup();change(s);await s.c.savePickupEvidence(s.b.ref);assert.equal(s.rpcs().length,0);
 }
});
test("A sign-in change or unconfirmed server response cannot mark the local pickup saved",async()=>{
 for(const mode of ["actor","response"]){
  const s=setup();
  s.c.sb.rpc=async()=>{
   if(mode==="actor")s.c.currentSession={user:{id:"other"}};
   return {data:{booking_id:"wrong",checklist:{}}};
  };
  await s.c.savePickupEvidence(s.b.ref);
  assert.equal(s.b.pickupInspection,undefined);assert.equal(s.b.status,"Driver Assigned");
  assert.ok(s.notices.length);assert.equal(s.c.pickupChecklistSaves.size,0);
 }
});
test("Saving blocks navigation-sensitive controls and repeated submissions until the request ends",async()=>{
 const s=setup();let finish;
 s.c.sb.rpc=()=>new Promise(resolve=>finish=resolve);
 const pending=s.c.savePickupEvidence(s.b.ref);
 assert.equal(s.c.pickupChecklistSaves.size,1);assert.ok(Object.values(s.fields).every(f=>f.disabled));
 await s.c.completePickup(s.b.ref);
 finish({error:{message:"Synthetic network error"}});await pending;
 assert.equal(s.c.pickupChecklistSaves.size,0);assert.ok(Object.values(s.fields).every(f=>!f.disabled));
 assert.equal(s.b.status,"Driver Assigned");
});
test("Driver form drafts retain radio answers and refresh their conditional camera sections",()=>{
 assert.match(html,/draft\[el.id\]=\["checkbox","radio"\].includes\(el.type\)\?el.checked/);
 assert.match(html,/if\(activeTab==="jobs"&&showingJob\)restoreDriverFormDraft\(\)/);
 assert.match(html,/checklist:inspection.checklist\|\|null/);
});
