(function(root){
 "use strict";
 let selected=new Set(),host=null,options=null,saving=false,confirming=false,message="",error=false;
 let review=null,reviewLoading=false,kept=new Set();
 const fields=[["status","Status"],["miles","Miles"],["amount","Amount"],["destination","Destination"]];
 const different=(a,b)=>String(a??"")!==String(b??"");
 const outstanding=(r)=>fields.filter(([key])=>!(key==="status"&&r.current.status==="Delivered"&&r.request.changes?.[key]!=="Delivered")&&Object.hasOwn(r.request.changes||{},key)&&
  different(r.request.changes[key],r.request.previous?.[key])&&different(r.request.changes[key],r.current[key]));
 const display=(key,value)=>key==="amount"?"£"+Number(value||0).toFixed(2):E(value??"—");
 function reviewMarkup(){
  if(!review)return "";
  const requested=new Set(outstanding(review).map(([key])=>key));
  return `<section class="pa-review" aria-label="Review latest booking"><h3>Review latest booking — ${E(review.request.bookingRef)}</h3>
   <p>Compare the latest saved booking with the original request. Only checked changes will be resubmitted. Other details stay as they are now. No booking changes are saved until the replacement request is approved.</p>
   <div class="scroll"><table class="pa-review-table"><thead><tr><th>Field</th><th>Original</th><th>Latest saved</th><th>Requested</th><th>Keep requested change</th></tr></thead><tbody>
   ${fields.map(([key,label])=>`<tr><th>${label}</th><td>${display(key,review.request.previous?.[key])}</td><td>${display(key,review.current[key])}</td><td>${display(key,review.request.changes?.[key])}</td><td>${requested.has(key)?`<label><input type="checkbox" data-pa-keep="${key}" ${kept.has(key)?"checked":""} ${saving?"disabled":""}> Keep ${label.toLowerCase()} change</label>`:"No outstanding change"}</td></tr>`).join("")}
   </tbody></table></div>
   ${requested.size?"":"<p>All requested changes already match the latest booking, or no changed fields were recorded. You can close this review and reject the outdated request.</p>"}
    <div class="pa-message ${error?"pa-error":""}" data-pa-review-feedback role="${error?"alert":"status"}" tabindex="-1">${E(message)}</div>
    <p class="muted" id="pa-selection-hint" data-pa-selection-hint>${requested.size&&!kept.size?"Select at least one requested change above to enable submission.":""}</p>
    <div class="pa-toolbar"><button type="button" class="btn primary" data-pa-resubmit aria-describedby="pa-selection-hint" ${!kept.size||saving||reviewLoading?"disabled":""}>${saving?"Resubmitting…":"Submit replacement request"}</button>
   <button type="button" class="btn secondary" data-pa-reload ${saving||reviewLoading?"disabled":""}>Review latest booking again</button>
   <button type="button" class="btn secondary" data-pa-close ${saving||reviewLoading?"disabled":""}>Close review</button></div></section>`;
 }
 const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function pending(){return (options.store.updateRequests||[]).filter(r=>r.status==="Pending Approval");}
 function booking(r){return (options.store.bookings||[]).find(b=>b.ref===r.bookingRef);}
 function eligible(){return pending().filter(r=>booking(r));}
 function summary(v){return `${E(v?.status||"—")}<small>Miles: ${E(v?.miles??0)} · Amount: £${Number(v?.amount||0).toFixed(2)}</small><small>Delivery: ${E(v?.destination||"—")}</small>`;}
 function render(container,config){
  if(options&&options.sessionKey!==config.sessionKey){review=null;kept.clear();selected.clear();message="";error=false;}
  host=container;options=config;
  const rows=pending(),allowed=new Set(eligible().map(r=>r.id));
  selected=new Set([...selected].filter(id=>allowed.has(id)));
  host.innerHTML=`<div class="panel"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0">Pending Approval</h2><p class="muted">Review pending booking changes. Select individual requests or Select All, then Approve All to save the selected changes together.</p></div><span class="badge amber">${rows.length} pending</span></div>
   <div class="pa-toolbar"><label><input type="checkbox" data-pa-all aria-label="Select all pending approvals" ${!allowed.size||saving?"disabled":""}> Select All</label><span data-pa-count></span><button type="button" class="btn primary" data-pa-approve>Approve All</button><button type="button" class="btn secondary" data-pa-back>Back to Dashboard</button></div>
    <div class="pa-message ${error?"pa-error":""}" role="${error?"alert":"status"}" data-pa-message tabindex="-1">${E(message)}</div>
   <div class="scroll"><table class="pa-table"><thead><tr><th>Select</th><th>Booking / vehicle</th><th>Requested by</th><th>Current booking</th><th>Proposed changes</th><th>Reason</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>{
    const b=booking(r);
     return `<tr><td><input type="checkbox" data-pa-id="${E(r.id)}" aria-label="${E("Select "+r.bookingRef+" request "+r.id)}" ${selected.has(r.id)?"checked":""} ${!b||saving?"disabled":""}></td><td><b>${E(r.bookingRef)}</b><small>${E(b?.vehicle||"Booking unavailable")} · ${E(b?.reg||"—")}</small><small>${E(b?.business||b?.privateCustomerName||"—")}</small></td><td>${E(r.requestedBy)}<small>${E(r.requestedAt)}</small></td><td>${b?summary(b):"Booking unavailable — cannot approve"}</td><td>${summary(r.changes)}</td><td>${E(r.reason||"—")}</td><td><button type="button" class="btn primary" data-pa-single="${E(r.id)}" ${!b||saving?"disabled":""}>Approve</button> <button type="button" class="btn danger" data-pa-reject="${E(r.id)}" ${!b||saving?"disabled":""}>Reject</button> <button type="button" class="btn secondary" data-pa-review="${E(r.id)}" ${!b||saving||reviewLoading?"disabled":""}>Review latest booking</button></td></tr>`;
   }).join("")}</tbody></table></div>${rows.length?"":'<p class="muted">No pending booking approvals.</p>'}${reviewMarkup()}</div>`;
  host.querySelector("[data-pa-all]").onchange=e=>{
   selected=e.target.checked?new Set(eligible().map(r=>r.id)):new Set();
   host.querySelectorAll("[data-pa-id]").forEach(el=>{el.checked=selected.has(el.dataset.paId);});sync();
  };
  host.querySelectorAll("[data-pa-id]").forEach(el=>{el.onchange=()=>{if(el.checked)selected.add(el.dataset.paId);else selected.delete(el.dataset.paId);sync();};});
  host.querySelector("[data-pa-approve]").onclick=()=>approveIds([...selected]);
   host.querySelector("[data-pa-back]").onclick=()=>{if(!saving&&!confirming&&!reviewLoading){review=null;root.PendingApprovals.back();}};
   host.querySelectorAll("[data-pa-single]").forEach(el=>{if(review||reviewLoading)el.disabled=true;el.onclick=()=>approveIds([el.dataset.paSingle]);});
   host.querySelectorAll("[data-pa-reject]").forEach(el=>{el.onclick=()=>{if(!saving&&!confirming&&!reviewLoading){review=null;options.reject(el.dataset.paReject);}};});
   host.querySelectorAll("[data-pa-review]").forEach(el=>{el.onclick=()=>openReview(el.dataset.paReview);});
    host.querySelectorAll("[data-pa-keep]").forEach(el=>{el.onchange=()=>{if(el.checked)kept.add(el.dataset.paKeep);else kept.delete(el.dataset.paKeep);const button=host.querySelector("[data-pa-resubmit]");if(button)button.disabled=!kept.size||saving;const hint=host.querySelector("[data-pa-selection-hint]");if(hint)hint.textContent=kept.size?"":"Select at least one requested change above to enable submission.";};});
   const submit=host.querySelector("[data-pa-resubmit]");
   if(submit)submit.onclick=submitReview;
   const reload=host.querySelector("[data-pa-reload]");
   if(reload)reload.onclick=()=>openReview(review.request.id);
   const close=host.querySelector("[data-pa-close]");
   if(close)close.onclick=()=>{if(!saving&&!reviewLoading){review=null;kept.clear();render(host,options);}};
  sync();
 }
 function sync(){
  const all=host.querySelector("[data-pa-all]"),total=eligible().length;
  all.checked=total>0&&selected.size===total;all.indeterminate=selected.size>0&&selected.size<total;
  host.querySelector("[data-pa-count]").textContent=`${selected.size} selected`;
  const button=host.querySelector("[data-pa-approve]");
   button.disabled=saving||confirming||reviewLoading||!!review||!options.canApprove||!selected.size;
  button.textContent=saving?"Approving…":`Approve All (${selected.size} selected)`;
 }
 async function approveIds(ids){
   if(saving||confirming||reviewLoading||review||!options?.canApprove||!ids.length)return;
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
   }catch(e){error=true;message=`Approval could not be confirmed: ${e.message||"Check your connection."} ${/changed after this request/i.test(e.message||"")?"Use Review latest booking on the affected request to compare and resubmit it safely.":"Refresh the list before retrying if the connection was interrupted."}`;}
  finally{
   saving=false;confirming=false;
   if(host?.isConnected&&host.querySelector("[data-pa-approve]")){options.store=root.PendingApprovals.store();render(host,options);}
  }
 }
 async function openReview(id){
  if(saving||confirming||reviewLoading||!options?.canApprove)return;
  reviewLoading=true;message="Loading the latest saved booking…";error=false;render(host,options);
  try{
   const result=await options.review(id);
   if(!result?.request?.id||!result.current||!result.expected)throw new Error("Latest booking details were not confirmed.");
   review=result;kept=new Set(outstanding(review).map(([key])=>key));message="";
  }catch(e){error=true;message=e.message||"Could not load the latest booking.";}
  finally{reviewLoading=false;if(host?.isConnected&&host.querySelector("[data-pa-approve]")){options.store=root.PendingApprovals.store();render(host,options);host.querySelector(".pa-review")?.scrollIntoView?.({behavior:"smooth",block:"start"});}}
 }
 async function submitReview(){
  if(saving||confirming||reviewLoading||!review||!kept.size)return;
  const changes=Object.fromEntries(outstanding(review).filter(([key])=>kept.has(key)).map(([key])=>[key,review.request.changes[key]]));
  if(!Object.keys(changes).length)return;
  confirming=true;sync();
  try{
    if(!await options.confirm(`Submit a replacement request for ${review.request.bookingRef}?\nOnly the checked changes will be kept. The old request will be marked Superseded. You must still approve the replacement separately.`,"Submit replacement request","Submit replacement"))return;
    saving=true;confirming=false;error=false;message="Submitting replacement request. Please wait…";render(host,options);
   const result=await options.resubmit(review.request.id,review.expected,changes);
   if(!result?.request?.id||result.request.status!=="Pending Approval")throw new Error("Replacement request was not confirmed. Refresh before retrying.");
   selected.delete(review.request.id);review=null;kept.clear();error=false;
   message="Replacement request saved as Pending Approval. Review and approve it separately. The booking has not changed.";
  }catch(e){error=true;message=e.message||"Could not resubmit. Review the latest booking again.";}
   finally{saving=false;confirming=false;if(host?.isConnected&&host.querySelector("[data-pa-approve]")){options.store=root.PendingApprovals.store();render(host,options);const feedback=host.querySelector(review?"[data-pa-review-feedback]":"[data-pa-message]");feedback?.scrollIntoView?.({behavior:"smooth",block:"center"});feedback?.focus?.({preventScroll:true});}}
 }
 root.PendingApprovals={render,approveIds,reviewId:openReview,submitReview,busy:()=>saving||confirming||reviewLoading||!!review,
  store:()=>getStore(),back:()=>go("desktop")};
})(window);
