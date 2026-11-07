(function(){
 "use strict";
 const supported=status=>["New Booked Vehicle","Delivered"].includes(status);
 const text=value=>String(value||"").trim();
 const escape=value=>text(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const name=row=>row.customerType==="Private"?(text(row.privateCustomerName)||"Private Customer"):(text(row.business)||"Unknown customer");
 const kind=row=>row.customerType==="Private"?"private":"business";
 const labelKey=row=>kind(row)+":"+name(row).toLowerCase();
 const identity=row=>kind(row)+":"+text(row.customerType==="Private"?row._clientId:row._businessId);
 const hasIdentity=row=>!!text(row.customerType==="Private"?row._clientId:row._businessId);
 let owner=null,selections=new Map();
 function reset(){owner=null;selections=new Map()}
 function sync(){
  const actor=typeof currentSession!=="undefined"?currentSession?.user?.id:null;
  if(actor!==owner){reset();owner=actor}
 }
 function model(rows,status){
  sync();
  const aliases=new Map();
  for(const row of rows)if(hasIdentity(row)){
   const key=labelKey(row);
   if(!aliases.has(key))aliases.set(key,new Set());
   aliases.get(key).add(identity(row));
  }
  const data={aliases,status,choices:[]},options=new Map();
  for(const row of rows){
   const key=customerKey(row,data),old=options.get(key);
   if(old)old.count++;
   else options.set(key,{key,label:name(row),count:1});
  }
  data.choices=[...options.values()].sort((a,b)=>a.label.localeCompare(b.label,"en",{sensitivity:"base"})||a.key.localeCompare(b.key));
  // Distinguish separately saved customers that happen to have the same name.
  const duplicateNames=new Map();
  data.choices.forEach(option=>{const key=option.label.toLowerCase();duplicateNames.set(key,(duplicateNames.get(key)||0)+1)});
  data.choices.forEach(option=>{if(duplicateNames.get(option.label.toLowerCase())>1)option.label+=" ("+option.key+")"});
  return data;
 }
 function customerKey(row,data){
  if(hasIdentity(row))return identity(row);
  const key=labelKey(row),matches=data.aliases.get(key);
  return matches?.size===1?[...matches][0]:key;
 }
 function selected(status){sync();return supported(status)?selections.get(status)?.key||"":""}
 function controls(data){
  if(!supported(data.status))return "";
  const value=selected(data.status),saved=selections.get(data.status);
  const missing=value&&!data.choices.some(option=>option.key===value);
  return `<label for="statusVehicleCustomer" style="flex:1;min-width:180px"><span style="display:block;margin-bottom:6px">Customer</span>
   <select id="statusVehicleCustomer" style="width:100%;box-sizing:border-box" onchange="StatusCustomerFilter.change(this.value)" aria-controls="statusVehicleTable" aria-describedby="statusVehicleCount">
   <option value="">All customers</option>
   ${data.choices.map(option=>`<option value="${escape(option.key)}"${value===option.key?" selected":""}>${escape(option.label)} (${option.count})</option>`).join("")}
   ${missing?`<option value="${escape(value)}" selected>${escape(saved.label)} (no vehicles)</option>`:""}
   </select></label>`;
 }
 function matches(key,status){const value=selected(status);return !value||key===value}
 function change(value){
  sync();
  if(typeof selectedStatusPage==="undefined"||!supported(selectedStatusPage))return;
  const select=document.getElementById("statusVehicleCustomer");
  selections.set(selectedStatusPage,{key:text(value),label:select?.selectedOptions?.[0]?.textContent||text(value)});
  const detail=document.getElementById("statusBookingDetail");if(detail)detail.innerHTML="";
  searchStatusVehicles(statusVehicleSearch);
 }
 window.StatusCustomerFilter={model,customerKey,controls,matches,change,selected,reset};
})();
