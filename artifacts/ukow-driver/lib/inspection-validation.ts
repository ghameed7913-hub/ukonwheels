// Field-level validation for the embedded Driver portal. The portal remains
// responsible for the final authenticated save and server-side validation.
export const INSPECTION_VALIDATION_BRIDGE = `
(function(root){
 if(root.UKOWInspectionValidation)return;
 const marked=new Map();
 let errorSequence=0;
 const doc=root.document;
 const val=id=>String(doc.getElementById(id)?.value??'').trim();
 const radio=(key,ref)=>doc.querySelector('input[name="pc_'+key+'_'+ref+'"]:checked')?.value||'';
 function photo(kind,ref,id){
  return doc.getElementById((kind==='pickup'?'s_':'ds_')+ref+'_'+id)?.closest('.cameraBox')||null;
 }
 function collectPickup(ref,booking){
  const errors=[],checklist=root.PickupChecklist;
  const add=(id,message)=>errors.push({target:doc.getElementById(id),message});
  if(!doc.getElementById('ready_'+ref)?.checked)add('ready_'+ref,'Confirm Ready to Pickup.');
  const values={
   electricVehicle:radio('electric_vehicle',ref),chargingCable:radio('charging_cable',ref),
   spareTyre:radio('spare_tyre',ref),logBook:radio('log_book',ref),
   serviceHistory:radio('service_history',ref),damagePresent:radio('damage_present',ref),
  };
  const questions=[
   ['electric_vehicle',values.electricVehicle,'Is this an electric vehicle?'],
   ['spare_tyre',values.spareTyre,'Spare tyre present?'],
   ['log_book',values.logBook,'Log book present?'],
   ['service_history',values.serviceHistory,'Service history present?'],
   ['damage_present',values.damagePresent,'Is there any damage present?'],
  ];
  if(values.electricVehicle==='yes')questions.push(['charging_cable',values.chargingCable,'Charging cable present?']);
  questions.forEach(([field,value,label])=>{
   if(value!=='yes'&&value!=='no')add('pc_'+field+'_'+ref,'Choose Yes or No: '+label);
  });
  if(values.electricVehicle==='yes'&&values.chargingCable==='no'&&!val('pc_charging_cable_reason_'+ref))
   add('pc_charging_cable_reason_'+ref,'Explain why the charging cable is not available.');
  const condition=val('condition_'+ref),mileage=val('mileage_'+ref),fuel=val('fuel_'+ref);
  if(!condition)add('condition_'+ref,'Select the overall vehicle condition.');
  if(mileage===''||!Number.isFinite(Number(mileage))||Number(mileage)<0)
   add('mileage_'+ref,'Enter a valid odometer mileage.');
  if(!fuel)add('fuel_'+ref,'Select the fuel / charge level.');
  if(values.damagePresent==='yes'&&!val('pc_damage_comments_'+ref))
   add('pc_damage_comments_'+ref,'Describe the damage in the comments.');
  if(condition==='Damage Present'&&values.damagePresent==='no')
   add('pc_damage_present_'+ref,'The condition says Damage Present. Select Yes, or correct the vehicle condition.');
  const saved=new Set(Object.values(booking.pickupPhotos||{}).filter(p=>p?.storagePath).map(p=>p.label));
  if(checklist){
   const slots=[...checklist.vehicleSlots,checklist.keysSlot];
   if(values.electricVehicle==='yes'&&values.chargingCable==='yes')slots.push({id:'pc_charging_cable',label:'Charging cable'});
   checklist.itemSlots.forEach(item=>{if(values[item.key]==='yes')slots.push({id:item.photoId,label:item.label});});
   slots.forEach(slot=>{if(!saved.has(slot.label))errors.push({target:photo('pickup',ref,slot.id),message:'Take and store the '+slot.label.toLowerCase()+' photo.'});});
   if(values.damagePresent==='yes'&&!Object.values(booking.pickupPhotos||{}).some(p=>p?.storagePath&&/^Damage photo [1-9][0-9]*$/.test(p.label||'')))
    errors.push({target:photo('pickup',ref,'pc_damage_1'),message:'Take and store at least one photo of the damage.'});
  }
  if(!doc.getElementById('dec_'+ref)?.checked)add('dec_'+ref,'Accept the Driver declaration.');
  return errors;
 }
 const deliveryLabels=['Front at Delivery','Rear at Delivery','Left Side at Delivery','Right Side at Delivery','Interior at Delivery','Dashboard / Mileage at Delivery'];
 function collectDelivery(ref,booking){
  const saved=new Set(Object.values(booking.deliveryPhotos||{}).filter(p=>p?.storagePath).map(p=>p.label));
  const errors=[];
  deliveryLabels.forEach((label,id)=>{if(!saved.has(label))errors.push({target:photo('delivery',ref,id),message:'Take and store the '+label.toLowerCase()+' photo.'});});
  if(!doc.getElementById('dc_'+ref)?.checked)errors.push({target:doc.getElementById('dc_'+ref),message:'Confirm the vehicle was handed over to the receiver.'});
  return errors;
 }
 function clear(target){
  const mark=marked.get(target);if(!mark)return;
  mark.message.remove();mark.host.classList.remove('ukowFieldInvalid');
  target.removeAttribute('aria-invalid');
  const described=String(target.getAttribute('aria-describedby')||'').split(/\\s+/).filter(id=>id&&id!==mark.id);
  if(described.length)target.setAttribute('aria-describedby',described.join(' '));else target.removeAttribute('aria-describedby');
  marked.delete(target);
 }
 function show(error,ref){
  const target=error.target;if(!target)return;
  const old=marked.get(target);
  if(old){old.message.textContent=error.message;return;}
  const host=target.matches?.('input[type="checkbox"]')?(target.closest('label')||target):target;
  const message=doc.createElement('p'),id='ukowFieldError_'+(++errorSequence);
  message.id=id;message.className='ukowFieldError';message.textContent=error.message;message.setAttribute('role','status');
  if(target.classList.contains('cameraBox')||target.tagName==='FIELDSET')target.appendChild(message);
  else host.insertAdjacentElement('afterend',message);
  host.classList.add('ukowFieldInvalid');target.setAttribute('aria-invalid','true');
  target.setAttribute('aria-describedby',[target.getAttribute('aria-describedby'),id].filter(Boolean).join(' '));
  marked.set(target,{host,message,id,ref});
 }
 function bookingFor(ref){
  return typeof getStore==='function'?getStore().bookings.find(b=>b.ref===ref):null;
 }
 function errorsFor(ref,kind){
  const booking=bookingFor(ref);if(!booking)return [];
  return kind==='delivery'?collectDelivery(ref,booking):collectPickup(ref,booking);
 }
 function apply(ref,kind,full,focus){
  const errors=errorsFor(ref,kind),byTarget=new Map(errors.filter(e=>e.target).map(e=>[e.target,e]));
  for(const [target,mark] of marked){
   if(!target.isConnected){clear(target);continue;}
   if(mark.ref!==ref)continue;
   const error=byTarget.get(target);
   if(error)show(error,ref);else clear(target);
  }
  if(full)errors.forEach(error=>show(error,ref));
  if(focus&&errors.length){
   const first=errors.find(error=>error.target)?.target;
   if(first){
    for(let parent=first.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
    first.scrollIntoView?.({behavior:'smooth',block:'center'});
    const control=first.matches?.('input,select,textarea,button')?first:first.querySelector?.('input,select,textarea,button');
    control?.focus?.({preventScroll:true});
   }
  }
  return errors.length===0;
 }
 function refresh(ref){
  const booking=bookingFor(ref);if(!booking)return;
  apply(ref,booking.status==='Driver Assigned'?'pickup':'delivery',false,false);
 }
 root.UKOWInspectionValidation={collectPickup,collectDelivery,refresh,
  validatePickup:ref=>apply(ref,'pickup',true,true),validateDelivery:ref=>apply(ref,'delivery',true,true)};
 function install(){
  if(!doc.getElementById('ukowFieldValidationStyle')&&doc.head){
   const style=doc.createElement('style');style.id='ukowFieldValidationStyle';
   style.textContent='.ukowFieldError{display:block!important;color:#a51222!important;background:#fff0f1;border-left:3px solid #d4142b;padding:8px 10px;margin:7px 0;font-size:14px;line-height:1.4;grid-column:1/-1}.ukowFieldInvalid{outline:2px solid #d4142b!important;outline-offset:2px;scroll-margin-top:150px}.cameraBox>.ukowFieldError{margin:8px}.ukowFieldInvalid input,.ukowFieldInvalid textarea{outline-offset:0}';
   doc.head.appendChild(style);
  }
  if(typeof root.persistPickupChecklist==='function'&&!root.persistPickupChecklist.ukowFieldValidation){
   const original=root.persistPickupChecklist;
   const wrapped=async function(ref,complete){
    const booking=bookingFor(ref);
    if(typeof role!=='undefined'&&role==='driver'&&booking?.status==='Driver Assigned'){
     if(typeof driverPhotoIsSaving==='function'&&driverPhotoIsSaving())return;
     if(!apply(ref,'pickup',true,true))return;
    }
    return original.apply(this,arguments);
   };
   wrapped.ukowFieldValidation=true;root.persistPickupChecklist=wrapped;
  }
  if(typeof root.deliver==='function'&&!root.deliver.ukowFieldValidation){
   const original=root.deliver;
   const wrapped=async function(ref){
    const booking=bookingFor(ref);
    if(typeof role!=='undefined'&&role==='driver'&&booking&&booking._normalizedId){
     if(typeof driverPhotoIsSaving==='function'&&driverPhotoIsSaving())return;
     if(!apply(ref,'delivery',true,true))return;
    }
    return original.apply(this,arguments);
   };
   wrapped.ukowFieldValidation=true;root.deliver=wrapped;
  }
 }
 doc.addEventListener?.('input',()=>{for(const ref of new Set([...marked.values()].map(m=>m.ref)))refresh(ref);});
 doc.addEventListener?.('change',()=>{for(const ref of new Set([...marked.values()].map(m=>m.ref)))refresh(ref);});
 install();setInterval(install,700);
})(window);`;
