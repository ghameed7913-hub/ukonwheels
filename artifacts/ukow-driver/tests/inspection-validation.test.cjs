const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/inspection-validation.ts'),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS}
}).outputText,{exports:output});
function harness(){
 const nodes=new Map(),answers={},listeners={},ref='TEST-1';
 let pickupSaves=0,deliveries=0,scrolled=0,focused=0;
 function element(tag='DIV'){
  const attributes={},classes=new Set();
  return {tagName:tag,isConnected:true,value:'',checked:false,children:[],
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
   setAttribute:(k,v)=>attributes[k]=v,getAttribute:k=>attributes[k]||null,removeAttribute:k=>delete attributes[k],
   appendChild(node){this.children.push(node);node.parentElement=this;},
   insertAdjacentElement(_where,node){this.children.push(node);node.parentElement=this;},
   remove(){this.isConnected=false;},
   matches(selector){return tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'||tag==='BUTTON';},
   closest(){return this.host||this;},
   querySelector(){return element('BUTTON');},
   scrollIntoView(){scrolled++;},focus(){focused++;},
  };
 }
 function add(id,tag='DIV',value=''){
  const el=element(tag);el.value=value;nodes.set(id,el);return el;
 }
 const context={
  window:null,document:{
   head:element('HEAD'),getElementById:id=>nodes.get(id)||null,createElement:tag=>element(tag.toUpperCase()),
   addEventListener:(name,fn)=>listeners[name]=fn,
   querySelector:selector=>{const match=selector.match(/name="pc_(.+)_TEST-1"/);return match&&answers[match[1]]?{value:answers[match[1]]}:null;},
  },
  setInterval(){},role:'driver',driverPhotoIsSaving:()=>false,
  persistPickupChecklist:async()=>{pickupSaves++;return 'saved';},
  deliver:async()=>{deliveries++;return 'delivered';},
 };
 context.window=context;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../uk-on-wheels/public/pickup-checklist.js'),'utf8'),context);
 const pc=context.PickupChecklist,booking={ref,status:'Driver Assigned',_normalizedId:'booking-id',pickupPhotos:{},deliveryPhotos:{}};
 context.getStore=()=>({bookings:[booking]});
 add('ready_'+ref,'INPUT').checked=true;add('dec_'+ref,'INPUT').checked=true;
 add('condition_'+ref,'SELECT','Good');add('mileage_'+ref,'INPUT','1234');
 add('fuel_'+ref,'SELECT','Half');add('inspection_'+ref,'TEXTAREA','Keep these notes');
 for(const name of ['electric_vehicle','charging_cable','spare_tyre','log_book','service_history','damage_present']){
  answers[name]='no';add('pc_'+name+'_'+ref,'FIELDSET');
 }
 add('pc_charging_cable_reason_'+ref,'TEXTAREA');add('pc_damage_comments_'+ref,'TEXTAREA');
 const slots=[...pc.vehicleSlots,pc.keysSlot,{id:'pc_charging_cable',label:'Charging cable'},
  ...pc.itemSlots.map(x=>({id:x.photoId,label:x.label})),{id:'pc_damage_1',label:'Damage photo 1'}];
 for(const slot of slots){
  const box=element();box.classList.add('cameraBox');
  const status=add('s_'+ref+'_'+slot.id);status.host=box;
  booking.pickupPhotos[slot.id]={label:slot.label,storagePath:'secure/'+slot.id};
 }
 const deliveryLabels=['Front at Delivery','Rear at Delivery','Left Side at Delivery','Right Side at Delivery','Interior at Delivery','Dashboard / Mileage at Delivery'];
 deliveryLabels.forEach((label,id)=>{
  const box=element();box.classList.add('cameraBox');add('ds_'+ref+'_'+id).host=box;
  booking.deliveryPhotos[id]={label,storagePath:'secure/delivery-'+id};
 });
 add('dc_'+ref,'INPUT').checked=true;
 vm.runInNewContext(output.INSPECTION_VALIDATION_BRIDGE,context);
 return {context,api:context.UKOWInspectionValidation,booking,nodes,answers,listeners,ref,
  get pickupSaves(){return pickupSaves;},get deliveries(){return deliveries;},get scrolled(){return scrolled;},get focused(){return focused;}};
}
test('Only the missing photo gets an inline error; answers and all stored evidence remain intact',async()=>{
 const h=harness(),before=h.nodes.get('inspection_TEST-1').value;
 const removed=h.booking.pickupPhotos.pc_front;delete h.booking.pickupPhotos.pc_front;
 await h.context.persistPickupChecklist(h.ref,false);
 assert.equal(h.pickupSaves,0);
 const target=h.nodes.get('s_TEST-1_pc_front').host;
 assert.equal(target.getAttribute('aria-invalid'),'true');
 assert.match(target.children[0].textContent,/front of car/);
 assert.equal(h.nodes.get('condition_TEST-1').getAttribute('aria-invalid'),null);
 assert.equal(h.nodes.get('inspection_TEST-1').value,before);
 assert.equal(h.scrolled,1);assert.equal(h.focused,1);
 h.booking.pickupPhotos.pc_front=removed;h.api.refresh(h.ref);
 assert.equal(target.getAttribute('aria-invalid'),null);
 assert.equal(target.children[0].isConnected,false);
 assert.equal(await h.context.persistPickupChecklist(h.ref,false),'saved');
 assert.equal(h.pickupSaves,1);
});
test('Unanswered question is highlighted and clears on correction without resetting anything else',async()=>{
 const h=harness();delete h.answers.spare_tyre;
 await h.context.persistPickupChecklist(h.ref,false);
 const field=h.nodes.get('pc_spare_tyre_TEST-1');
 assert.equal(field.getAttribute('aria-invalid'),'true');
 assert.match(field.children[0].textContent,/Spare tyre/);
 assert.equal(h.nodes.get('pc_log_book_TEST-1').getAttribute('aria-invalid'),null);
 h.answers.spare_tyre='no';h.listeners.change();
 assert.equal(field.getAttribute('aria-invalid'),null);
 await h.context.persistPickupChecklist(h.ref,false);assert.equal(h.pickupSaves,1);
});
test('All missing fields are returned, while optional No photo fields remain valid',async()=>{
 const h=harness();
 h.nodes.get('mileage_TEST-1').value='';h.nodes.get('fuel_TEST-1').value='';
 delete h.answers.electric_vehicle;delete h.booking.pickupPhotos.pc_front;
 delete h.booking.pickupPhotos.pc_spare_tyre;delete h.booking.pickupPhotos.pc_charging_cable;
 const errors=h.api.collectPickup(h.ref,h.booking);
 assert.equal(errors.length,4);
 await h.context.persistPickupChecklist(h.ref,true);
 assert.equal(h.pickupSaves,0);
 assert.equal(h.nodes.get('mileage_TEST-1').getAttribute('aria-invalid'),'true');
 assert.equal(h.nodes.get('fuel_TEST-1').getAttribute('aria-invalid'),'true');
 assert.equal(h.nodes.get('pc_spare_tyre_TEST-1').getAttribute('aria-invalid'),null);
});
test('Conditional cable reason and damage comments appear only when required',()=>{
 const h=harness();h.answers.electric_vehicle='yes';h.answers.charging_cable='no';h.answers.damage_present='yes';
 const errors=h.api.collectPickup(h.ref,h.booking);
 assert.equal(errors.length,2);
 assert.ok(errors.some(e=>e.target===h.nodes.get('pc_charging_cable_reason_TEST-1')));
 assert.ok(errors.some(e=>e.target===h.nodes.get('pc_damage_comments_TEST-1')));
 h.nodes.get('pc_charging_cable_reason_TEST-1').value='Not supplied';
 h.nodes.get('pc_damage_comments_TEST-1').value='Scratch on rear bumper';
 assert.equal(h.api.collectPickup(h.ref,h.booking).length,0);
});
test('Preview-only photos never satisfy saved-evidence validation',()=>{
 const h=harness();h.booking.pickupPhotos.pc_front={label:'Front of car',image:'preview-only'};
 assert.equal(h.api.collectPickup(h.ref,h.booking).length,1);
});
test('Delivery highlights only the missing photo and handover question, then saves after correction',async()=>{
 const h=harness();h.booking.status='On Route';
 const saved=h.booking.deliveryPhotos[2];delete h.booking.deliveryPhotos[2];
 h.nodes.get('dc_TEST-1').checked=false;
 await h.context.deliver(h.ref);assert.equal(h.deliveries,0);
 assert.equal(h.nodes.get('ds_TEST-1_2').host.getAttribute('aria-invalid'),'true');
 assert.equal(h.nodes.get('dc_TEST-1').getAttribute('aria-invalid'),'true');
 h.booking.deliveryPhotos[2]=saved;h.nodes.get('dc_TEST-1').checked=true;h.listeners.change();
 assert.equal(h.nodes.get('dc_TEST-1').getAttribute('aria-invalid'),null);
 assert.equal(await h.context.deliver(h.ref),'delivered');
 assert.equal(h.deliveries,1);
});
test('Clear conditional errors when switching Yes to No, preserving uploaded evidence',async()=>{
 const h=harness();h.answers.electric_vehicle='yes';h.answers.charging_cable='no';
 const count=Object.keys(h.booking.pickupPhotos).length;
 await h.context.persistPickupChecklist(h.ref,false);
 const reason=h.nodes.get('pc_charging_cable_reason_TEST-1');
 assert.equal(reason.getAttribute('aria-invalid'),'true');
 h.answers.electric_vehicle='no';h.listeners.change();
 assert.equal(reason.getAttribute('aria-invalid'),null);
 assert.equal(Object.keys(h.booking.pickupPhotos).length,count);
});
