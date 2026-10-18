/* UK On Wheels - Driver pickup inspection checklist (classic script). Exposes window.PickupChecklist. */
(function(root){
"use strict";
var VEHICLE_SLOTS=[
 {id:"pc_front",label:"Front of car"},
 {id:"pc_driver_side",label:"Driver side"},
 {id:"pc_driver_front_wheel",label:"Driver side front wheel"},
 {id:"pc_driver_rear_wheel",label:"Driver side rear wheel"},
 {id:"pc_back",label:"Back side"},
 {id:"pc_passenger_side",label:"Passenger side"},
 {id:"pc_passenger_front_wheel",label:"Passenger side front wheel"},
 {id:"pc_passenger_rear_wheel",label:"Passenger side rear wheel"},
 {id:"pc_mileage",label:"Mileage"},
 {id:"pc_exterior",label:"Exterior"},
 {id:"pc_back_seats",label:"Back seats"}
];
var KEYS={id:"d1",label:"Keys"};
var ITEMS=[
 {key:"spareTyre",field:"spare_tyre",q:"Spare tyre present?",photoId:"pc_spare_tyre",label:"Spare tyre"},
 {key:"logBook",field:"log_book",q:"Log book (V5C) present?",photoId:"pc_log_book",label:"Log book"},
 {key:"serviceHistory",field:"service_history",q:"Service history present?",photoId:"pc_service_history",label:"Service history"}
];
var DAMAGE_RE=/^Damage photo ([1-9][0-9]*)$/;
var CONDITIONS=["Good","Fair","Damage Present","Not Roadworthy"];
var FUELS=["Empty","Quarter","Half","Three Quarters","Full"];
var storedCameraSlot=null;

function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function yn(v){return v==="yes"||v==="no"?v:""}
function fid(key,ref){return "pc_"+key+"_"+ref}
function savedLabels(photos){
 var out={};(photos||[]).forEach(function(p){if(p&&p.storagePath&&p.label)out[p.label]=true});return out;
}
function damageNumbers(photos){
 var n=[];(photos||[]).forEach(function(p){var m=p&&typeof p.label==="string"&&p.label.match(DAMAGE_RE);if(m&&n.indexOf(+m[1])<0)n.push(+m[1])});
 return n.sort(function(a,b){return a-b});
}
function checklistOf(b){var c=b&&b.pickupInspection&&b.pickupInspection.checklist;return c&&c.version===1?c:null}

function requiredLabels(v){
 v=v||{};var l=VEHICLE_SLOTS.map(function(s){return s.label});l.push(KEYS.label);
 if(v.electricVehicle==="yes"&&v.chargingCable==="yes")l.push("Charging cable");
 ITEMS.forEach(function(i){if(v[i.key]==="yes")l.push(i.label)});
 return l;
}

function ynControl(key,ref,q,val){
 var id=fid(key,ref),name=id;
 return '<fieldset class="pcYesNo full" id="'+id+'" data-pc-key="'+key+'"><legend>'+esc(q)+' *</legend>'+
  ["yes","no"].map(function(o){return '<label class="pcChoice"><input id="'+id+'_'+o+'" type="radio" name="'+name+'" value="'+o+'"'+(val===o?" checked":"")+
  ' onchange="PickupChecklist.updateConditional(\''+esc(ref)+'\')"> '+(o==="yes"?"Yes":"No")+'</label>'}).join("")+'</fieldset>';
}

var CSS='.pcYesNo{border:1px solid rgba(0,0,0,.12);border-radius:12px;min-width:0;padding:10px 12px;margin:0}.pcYesNo legend{font-weight:600;padding:0 4px}'+
 '.pcYesNo .pcChoice{display:inline-flex;align-items:center;gap:8px;min-height:44px;min-width:76px;margin:0 12px 0 0;padding:0;font-size:16px;white-space:nowrap;cursor:pointer}'+
 'body .pcYesNo .pcChoice input[type="radio"]{box-sizing:border-box;flex:0 0 22px;width:22px;min-width:22px;max-width:22px;height:22px;min-height:22px;max-height:22px;padding:0;margin:0;border-radius:50%;appearance:auto;accent-color:#e00820;vertical-align:middle;box-shadow:none}'+
 '.pcCond[hidden]{display:none!important}.pcCond{margin-top:10px}.pcSummary dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}.pcSummary dt{font-weight:600}';

function render(b,cameraSlot){
 if(typeof cameraSlot==="function")storedCameraSlot=cameraSlot;
 var cs=storedCameraSlot,ref=b.ref,c=checklistOf(b)||{},photos=Object.values(b.pickupPhotos||{});
 var ev=yn(c.electricVehicle),dmg=yn(c.damagePresent);
 var dn=damageNumbers(photos);if(!dn.length)dn=[1];
 var h='<style data-pc-style>'+CSS+'</style>';
 h+='<div class="step" data-pc-ref="'+esc(ref)+'"><h4>2. Vehicle Photos — Live Camera</h4><p class="muted">All 11 vehicle photos and a live photo of the keys are required.</p>'+
  '<div class="vehiclePhotoGrid">'+VEHICLE_SLOTS.map(function(s){return cs(b,s.id,s.label,false,true)}).join("")+cs(b,KEYS.id,KEYS.label,false,true)+'</div></div>';
 h+='<div class="step"><h4>3. Vehicle & Items</h4><div class="form">'+ynControl("electric_vehicle",ref,"Is this an electric vehicle?",ev)+
  '<div class="pcCond full" id="pc_ev_wrap_'+esc(ref)+'"'+(ev==="yes"?"":" hidden")+'>'+ynControl("charging_cable",ref,"Charging cable present?",yn(c.chargingCable))+
  '<div class="pcCond" id="pc_cable_photo_wrap_'+esc(ref)+'"'+(ev==="yes"&&c.chargingCable==="yes"?"":" hidden")+'><div class="vehiclePhotoGrid">'+cs(b,"pc_charging_cable","Charging cable",false,true)+'</div></div>'+
  '<div class="pcCond" id="pc_cable_reason_wrap_'+esc(ref)+'"'+(ev==="yes"&&c.chargingCable==="no"?"":" hidden")+'><label class="full">Why is there no charging cable? *<textarea id="'+fid("charging_cable_reason",ref)+'" class="full">'+esc(c.chargingCableReason||"")+'</textarea></label></div></div>';
 ITEMS.forEach(function(i){var v=yn(c[i.key]);
  h+=ynControl(i.field,ref,i.q,v)+'<div class="pcCond full" id="pc_'+i.field+'_wrap_'+esc(ref)+'"'+(v==="yes"?"":" hidden")+'><div class="vehiclePhotoGrid">'+cs(b,i.photoId,i.label,false,true)+'</div></div>';
 });
 h+='</div></div>';
 var pi=b.pickupInspection||{};
 h+='<div class="step"><h4>4. Vehicle Inspection Report</h4><div class="form">'+
  '<select id="condition_'+esc(ref)+'" aria-label="Overall vehicle condition" onchange="PickupChecklist.updateConditional(\''+esc(ref)+'\')"><option value="">Overall vehicle condition *</option>'+CONDITIONS.map(function(o){return '<option'+(pi.condition===o?" selected":"")+'>'+o+'</option>'}).join("")+'</select>'+
  '<input id="mileage_'+esc(ref)+'" type="number" min="0" inputmode="numeric" aria-label="Odometer mileage" placeholder="Odometer mileage *" value="'+(pi.mileage!=null&&pi.mileage!==""?esc(pi.mileage):"")+'">'+
  '<select id="fuel_'+esc(ref)+'" aria-label="Fuel or charge level"><option value="">Fuel / charge level *</option>'+FUELS.map(function(o){return '<option'+(pi.fuelLevel===o?" selected":"")+'>'+o+'</option>'}).join("")+'</select>'+
  ynControl("damage_present",ref,"Is there any damage present?",dmg)+
  '<div class="pcCond full" id="pc_damage_wrap_'+esc(ref)+'"'+(dmg==="yes"?"":" hidden")+'><label class="full">Damage comments *<textarea id="'+fid("damage_comments",ref)+'" class="full">'+esc(c.damageComments||"")+'</textarea></label>'+
  '<div class="vehiclePhotoGrid" id="pc_damage_list_'+esc(ref)+'">'+dn.map(function(n){return cs(b,"pc_damage_"+n,"Damage photo "+n,false,n===1)}).join("")+'</div>'+
  '<button type="button" class="btn secondary" onclick="PickupChecklist.addPhoto(\''+esc(ref)+'\')">Add another damage photo</button></div>'+
  '<textarea id="inspection_'+esc(ref)+'" class="full" aria-label="Inspection notes" placeholder="Warning lights, missing items and inspection notes">'+esc(pi.notes&&pi.notes!=="No additional inspection notes"?pi.notes:"")+'</textarea>'+
  '</div></div>';
 return h;
}

function radio(doc,key,ref){var el=doc.querySelector&&doc.querySelector('input[name="'+fid(key,ref)+'"]:checked');return el?yn(el.value):""}
function val(doc,id){var el=doc.getElementById(id);return el?String(el.value==null?"":el.value):""}

function updateConditional(ref,doc){
 doc=doc||root.document;if(!doc)return;
 var ev=radio(doc,"electric_vehicle",ref),cable=radio(doc,"charging_cable",ref),dmg=radio(doc,"damage_present",ref);
 var vis={};vis["pc_ev_wrap_"+ref]=ev==="yes";vis["pc_cable_photo_wrap_"+ref]=ev==="yes"&&cable==="yes";vis["pc_cable_reason_wrap_"+ref]=ev==="yes"&&cable==="no";
 vis["pc_damage_wrap_"+ref]=dmg==="yes";
 ITEMS.forEach(function(i){vis["pc_"+i.field+"_wrap_"+ref]=radio(doc,i.field,ref)==="yes"});
 var hiding=Object.keys(vis).some(function(id){var el=doc.getElementById(id);return el&&!vis[id]&&!el.hidden&&el.querySelector&&el.querySelector(".cameraBox.camera-active")});
  if(hiding&&typeof root.closeDriverCameras==="function"&&root.closeDriverCameras()===false)return;
 Object.keys(vis).forEach(function(id){var el=doc.getElementById(id);if(el)el.hidden=!vis[id]});
}

function read(doc,b){
 var ref=b.ref,condition=val(doc,"condition_"+ref),mRaw=val(doc,"mileage_"+ref).trim(),fuel=val(doc,"fuel_"+ref);
 if(CONDITIONS.indexOf(condition)<0)throw new Error("Select the overall vehicle condition.");
 var mileage=Number(mRaw);if(mRaw===""||!isFinite(mileage)||mileage<0)throw new Error("Enter a valid odometer mileage.");
 if(FUELS.indexOf(fuel)<0)throw new Error("Select the fuel / charge level.");
 var ev=radio(doc,"electric_vehicle",ref),cable=ev==="yes"?radio(doc,"charging_cable",ref):"";
 var dmg=radio(doc,"damage_present",ref);
 var v={version:1,electricVehicle:ev,chargingCable:cable,chargingCableReason:ev==="yes"&&cable==="no"?val(doc,fid("charging_cable_reason",ref)).trim():"",
  spareTyre:radio(doc,"spare_tyre",ref),logBook:radio(doc,"log_book",ref),serviceHistory:radio(doc,"service_history",ref),
  damagePresent:dmg,damageComments:dmg==="yes"?val(doc,fid("damage_comments",ref)).trim():"",
  condition:condition,mileage:mileage,fuelLevel:fuel,notes:val(doc,"inspection_"+ref).trim()};
 return v;
}

function validate(v,photos){
 v=v||{};var have=savedLabels(photos),q={electricVehicle:"electric vehicle",spareTyre:"spare tyre",logBook:"log book",serviceHistory:"service history",damagePresent:"damage present"};
 Object.keys(q).forEach(function(k){if(!yn(v[k]))throw new Error("Answer Yes or No for "+q[k]+".")});
 if(v.electricVehicle==="yes"){
  if(!yn(v.chargingCable))throw new Error("Answer Yes or No for charging cable.");
  if(v.chargingCable==="no"&&!String(v.chargingCableReason||"").trim())throw new Error("Explain why there is no charging cable.");
 }
 if(v.damagePresent==="yes"&&!String(v.damageComments||"").trim())throw new Error("Describe the damage present.");
 if(v.condition==="Damage Present"&&v.damagePresent!=="yes")throw new Error("Condition is "+v.condition+" but damage present is No. Please correct your answers.");
 var missing=requiredLabels(v).filter(function(l){return !have[l]});
 if(missing.length)throw new Error("Take and save the required photos: "+missing.join(", ")+".");
 if(v.damagePresent==="yes"&&!(photos||[]).some(function(p){return p&&p.storagePath&&DAMAGE_RE.test(p.label||"")}))throw new Error("Take and save at least one damage photo.");
 return true;
}

function addPhoto(ref,doc){
 doc=doc||root.document;
 var s=typeof root.getStore==="function"?root.getStore():null,b=s&&s.bookings&&s.bookings.find(function(x){return x.ref===ref});
 if(!b||!doc)return null;
 var cs=storedCameraSlot||(typeof root.cameraSlot==="function"?root.cameraSlot:null);if(!cs)return null;
 var list=doc.getElementById("pc_damage_list_"+ref);if(!list)return null;
 var max=0;damageNumbers(Object.values(b.pickupPhotos||{})).forEach(function(n){if(n>max)max=n});
 Array.prototype.forEach.call(list.querySelectorAll('[id^="box_'+ref+'_pc_damage_"]'),function(el){var n=+el.id.slice(("box_"+ref+"_pc_damage_").length);if(n>max)max=n});
 var n=max+1;list.insertAdjacentHTML("beforeend",cs(b,"pc_damage_"+n,"Damage photo "+n,false,false));
 return n;
}

function renderSummary(c){
 if(!c||c.version!==1)return "";
 var YN=function(x){return x==="yes"?"Yes":x==="no"?"No":"Not answered"},rows=[["Electric vehicle",YN(c.electricVehicle)]];
 if(c.electricVehicle==="yes"){rows.push(["Charging cable",YN(c.chargingCable)]);if(c.chargingCable==="no")rows.push(["No cable reason",c.chargingCableReason||""])}
 rows.push(["Spare tyre",YN(c.spareTyre)],["Log book",YN(c.logBook)],["Service history",YN(c.serviceHistory)],["Damage present",YN(c.damagePresent)]);
 if(c.damagePresent==="yes")rows.push(["Damage comments",c.damageComments||""]);
 return '<div class="pcSummary"><dl>'+rows.map(function(r){return "<dt>"+esc(r[0])+"</dt><dd>"+esc(r[1])+"</dd>"}).join("")+"</dl></div>";
}

var api={version:1,vehicleSlots:VEHICLE_SLOTS.slice(),keysSlot:KEYS,itemSlots:ITEMS,damageLabelPattern:DAMAGE_RE,css:CSS,
 render:render,read:read,validate:validate,updateConditional:updateConditional,addPhoto:addPhoto,renderSummary:renderSummary,requiredLabels:requiredLabels,escape:esc};
root.PickupChecklist=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:this);
