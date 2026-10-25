(function(root){
 "use strict";
 let selected=new Set(),host=null,options=null,saving=false,confirming=false,message="",error=false;
 const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function pending(){return (options.store.updateRequests||[]).filter(r=>r.status==="Pending Approval");}
 function booking(r){return (options.store.bookings||[]).find(b=>b.ref===r.bookingRef);}
 function eligible(){return pending().filter(r=>booking(r));}
 function summary(v){return `${E(v?.status||"—")}<small>Miles: ${E(v?.miles??0)} · Amount: £${Number(v?.amount||0).toFixed(2)}</small><small>Delivery: ${E(v?.destination||"—")}</small>`;}
 function render(container,config){
  host=container;options=config;
  const rows=pending(),allowed=new Set(eligible().map(r=>r.id));
  selected=new Set([...selected].filter(id=>allowed.has(id)));
  host.innerHTML=`<div class="panel"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0">Pending Approval</h2><p class="muted">Review pending booking changes. Select individual requests or Select All, then Approve All to save the selected changes together.</p></div><span class="badge amber">${rows.length} pending</span></div>
   <div class="pa-toolbar"><label><input type="checkbox" data-pa-all aria-label="Select all pending approvals" ${!allowed.size||saving?"disabled":""}> Select All</label><span data-pa-count></span><button type="button" class="btn primary" data-pa-approve>Approve All</button><button type="button" class="btn secondary" data-pa-back>Back to Dashboard</button></div>
   <div class="pa-message ${error?"pa-error":""}" role="${error?"alert":"status"}" data-pa-message>${E(message)}</div>
   <div class="scroll"><table class="pa-table"><thead><tr><th>Select</th><th>Booking / vehicle</th><th>Requested by</th><th>Current booking</th><th>Proposed changes</th><th>Reason</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>{
    const b=booking(r);
    return `<tr><td><input type="checkbox" data-pa-id="${E(r.id)}" aria-label="${E("Select "+r.bookingRef+" request "+r.id)}" ${selected.has(r.id)?"checked":""} ${!b||saving?"disabled":""}></td><td><b>${E(r.bookingRef)}</b><small>${E(b?.vehicle||"Booking unavailable")} · ${E(b?.reg||"—")}</small><small>${E(b?.business||b?.privateCustomerName||"—")}</small></td><td>${E(r.requestedBy)}<small>${E(r.requestedAt)}</small></td><td>${b?summary(b):"Booking unavailable — cannot approve"}</td><td>${summary(r.changes)}</td><td>${E(r.reason||"—")}</td><td><button type="button" class="btn primary" data-pa-single="${E(r.id)}" ${!b||saving?"disabled":""}>Approve</button> <button type="button" class="btn danger" data-pa-reject="${E(r.id)}" ${!b||saving?"disabled":""}>Reject</button></td></tr>`;
   }).join("")}</tbody></table></div>${rows.length?"":'<p class="muted">No pending booking approvals.</p>'}</div>`;
  host.querySelector("[data-pa-all]").onchange=e=>{
   selected=e.target.checked?new Set(eligible().map(r=>r.id)):new Set();
   host.querySelectorAll("[data-pa-id]").forEach(el=>{el.checked=selected.has(el.dataset.paId);});sync();
  };
  host.querySelectorAll("[data-pa-id]").forEach(el=>{el.onchange=()=>{if(el.checked)selected.add(el.dataset.paId);else selected.delete(el.dataset.paId);sync();};});
  host.querySelector("[data-pa-approve]").onclick=()=>approveIds([...selected]);
  host.querySelector("[data-pa-back]").onclick=()=>{if(!saving&&!confirming)root.PendingApprovals.back();};
  host.querySelectorAll("[data-pa-single]").forEach(el=>{el.onclick=()=>approveIds([el.dataset.paSingle]);});
  host.querySelectorAll("[data-pa-reject]").forEach(el=>{el.onclick=()=>{if(!saving&&!confirming)options.reject(el.dataset.paReject);};});
  sync();
 }
 function sync(){
  const all=host.querySelector("[data-pa-all]"),total=eligible().length;
  all.checked=total>0&&selected.size===total;all.indeterminate=selected.size>0&&selected.size<total;
  host.querySelector("[data-pa-count]").textContent=`${selected.size} selected`;
  const button=host.querySelector("[data-pa-approve]");
  button.disabled=saving||confirming||!options.canApprove||!selected.size;
  button.textContent=saving?"Approving…":`Approve All (${selected.size} selected)`;
 }
 async function approveIds(ids){
  if(saving||confirming||!options?.canApprove||!ids.length)return;
  const allowed=new Set(eligible().map(r=>r.id));
  ids=[...new Set(ids)].filter(id=>allowed.has(id));if(!ids.length)return;
  const refs=pending().filter(r=>ids.includes(r.id)).map(r=>r.bookingRef);
  confirming=true;sync();
  try{
   if(!await options.confirm(`Approve ${ids.length} selected booking update${ids.length===1?"":"s"}?\n${refs.join(", ")}\nThe proposed status, mileage, amount and delivery address will be saved.`))return;
   saving=true;confirming=false;message="";error=false;render(host,options);
   const result=await options.approve(ids);
   ids.forEach(id=>selected.delete(id));
   message=`${result.approved_count} booking update${result.approved_count===1?"":"s"} approved and saved.${result.already_approved_count?` ${result.already_approved_count} already approved.`:""}`;
  }catch(e){error=true;message=`Approval could not be confirmed: ${e.message||"Check your connection."} Refresh the list before retrying if the connection was interrupted.`;}
  finally{
   saving=false;confirming=false;
   if(host?.isConnected&&host.querySelector("[data-pa-approve]")){options.store=root.PendingApprovals.store();render(host,options);}
  }
 }
 root.PendingApprovals={render,approveIds,busy:()=>saving||confirming,
  store:()=>getStore(),back:()=>go("desktop")};
})(window);
