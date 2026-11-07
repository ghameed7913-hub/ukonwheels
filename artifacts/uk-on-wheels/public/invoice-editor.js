window.InvoiceEditor=(()=>{
 "use strict";
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const uid=()=>typeof currentSession!=="undefined"?currentSession?.user?.id:null;
 const allowed=()=>!!uid()&&(role==="admin"||(role==="staff"&&hasPermission("accounts")));
 const billingFields=["name","address","postcode","email","phone","vatNumber","companyReg"];
 const clone=v=>JSON.parse(JSON.stringify(v));
 let busy=false;
 function reset(){document.getElementById("invoiceEditDialog")?.remove()}
 function action(invoice){
  return allowed()?`<button class="btn secondary" type="button" onclick="InvoiceEditor.open(${esc(JSON.stringify(invoice.invoiceNo))})">Edit Invoice</button>`:"";
 }
 function amount(value,label){
  const n=Number(value);
  if(String(value).trim()===""||!Number.isFinite(n)||n<0||n>100000000||Math.abs(n*100-Math.round(n*100))>0.00001)throw Error(label+" must be zero or more, with up to two decimal places.");
  return n;
 }
 function validate(original,values){
  for(const key of ["date","dueDate"]){
   if(key==="dueDate"&&!values[key])continue;
   if(!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(values[key]||"")||new Date(values[key]+"T12:00:00Z").toISOString().slice(0,10)!==values[key])throw Error("Enter valid invoice and due dates.");
  }
  if(values.dueDate&&values.dueDate<values.date)throw Error("The due date cannot be before the invoice date.");
  if(!Array.isArray(values.charges)||values.charges.length!==(original.items||[]).length||!values.charges.length)throw Error("The invoice vehicles changed. Close and reload the invoice.");
  const charges=values.charges.map(v=>amount(v,"Vehicle charge"));
  const extra=amount(values.extraPhrasal,"Extra charges"),other=amount(values.otherCharges,"Other charges");
  const rate=values.vatEnabled?amount(values.vatPct,"VAT rate"):0;
  if(rate>100)throw Error("VAT rate must be between 0 and 100.");
  const totals=calculateInvoiceTotals(charges.reduce((sum,v)=>sum+Math.round(v*100),0)/100,values.vatEnabled,rate,extra,other);
  const billTo=Object.fromEntries(billingFields.map(k=>[k,String(values.billTo?.[k]||"").trim()]));
  if(!billTo.name)throw Error("Enter the billing name.");
  if(Object.values(billTo).some(v=>v.length>500))throw Error("Billing details must be 500 characters or fewer per field.");
  const reason=String(values.reason||"").trim(),description=String(values.otherDescription||"").trim();
  if(!reason||reason.length>1000)throw Error("Enter an amendment reason, up to 1,000 characters.");
  if(description.length>2000)throw Error("Other charges description must be 2,000 characters or fewer.");
  const revised={...original,date:values.date,dueDate:values.dueDate||"",billTo,
   items:original.items.map((it,n)=>({...it,charge:charges[n]})),...totals,
   extraPhrasal:extra,otherCharges:other,otherDescription:description};
  if(original.status==="Paid"&&(charges.some((v,n)=>v!==Number(original.items[n].charge))||
    extra!==Number(original.extraPhrasal||0)||other!==Number(original.otherCharges||0)||
    values.vatEnabled!==(original.vatEnabled!==false)||rate!==Number(original.vatPct||0)||
    totals.total!==Number(original.total)))throw Error("This invoice is paid. Recorded charges and VAT cannot be changed; only dates, billing details and the description can be amended.");
  return {values:{date:revised.date,dueDate:revised.dueDate,billTo,charges,vatEnabled:values.vatEnabled,vatPct:rate,
   extraPhrasal:extra,otherCharges:other,otherDescription:description,reason},revised};
 }
 async function commit(original,values){
  if(!allowed())throw Error("Accounts management permission is required.");
  const checked=validate(original,values),actor=uid();
  if(!SUPABASE_CONFIGURED)throw Error("Connect the saved portal database before amending invoices.");
  if(sharedSavePending||sharedSaveInFlight){
   if(!await flushSharedStore())throw Error("Save the pending portal changes before editing an invoice.");
  }
  if(actor!==uid())throw Error("Your sign-in changed. Reopen the invoice.");
  const {data,error}=await sb.rpc("amend_portal_invoice",{p_invoice_no:original.invoiceNo,p_expected:original,p_values:checked.values});
  if(error)throw Error(error.message+((error.code==="PGRST202"||error.code==="42883")?" Ask Admin to run supabase/invoice-amendments.sql.":""));
  if(actor!==uid())throw Error("Your sign-in changed while saving. Reload to check the invoice.");
  if(!data||data.invoiceNo!==original.invoiceNo||!Number.isInteger(data.amendmentRevision))throw Error("The server did not confirm the amendment. Reload the invoice before retrying.");
  // Patch only the saved invoice, not a whole-portal snapshot.
  const store=getStore(),index=(store.invoices||[]).findIndex(i=>i.invoiceNo===original.invoiceNo);
  if(index>=0)store.invoices[index]=data;
  return data;
 }
 function open(invoiceNo){
  if(busy||!allowed())return;
  const found=(getStore().invoices||[]).find(i=>i.invoiceNo===invoiceNo);
  if(!found)return alert("Invoice not found.");
  const original=clone(found),actor=uid(),paid=original.status==="Paid";
  reset();
  const dialog=document.createElement("dialog");dialog.id="invoiceEditDialog";
  dialog.style.cssText="width:min(900px,94vw);max-height:90vh;overflow:auto;border:1px solid #cbd5e1;border-radius:14px;padding:24px;background:var(--panel,#fff);color:inherit";
  const input=(name,label,value,type="text",extra="")=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const billTo=original.billTo||getStore().businesses?.find(b=>b.name===original.business)||{name:original.business};
  dialog.innerHTML=`<form><h2>Edit Invoice ${esc(invoiceNo)}</h2><p>${esc(original.business)} · ${esc(original.status||"Unpaid")}. Invoice number, linked client and booked vehicles stay unchanged.</p>
   ${paid?'<p role="note">This invoice is paid. You can correct dates, billing details and the description, but recorded charges, VAT and payments are protected.</p>':""}
   <div class="form">${input("date","Invoice date *",original.date,"date","required")}${input("dueDate","Due date",original.dueDate,"date")}
   ${billingFields.map(k=>input("bill_"+k,({name:"Billing name",address:"Billing address",postcode:"Postcode",email:"Billing email",phone:"Phone",vatNumber:"VAT number",companyReg:"Company registration"})[k],billTo[k],"text",'maxlength="500"'+(k==="name"?" required":""))).join("")}</div>
   <h3>Vehicle charges</h3><div class="scroll"><table><thead><tr><th>Booking</th><th>Vehicle</th><th>Registration</th><th>Charge (£)</th></tr></thead><tbody>
   ${(original.items||[]).map((it,n)=>`<tr><td>${esc(it.ref)}</td><td>${esc(it.vehicle)}</td><td>${esc(it.reg)}</td><td><input name="charge_${n}" type="number" min="0" max="100000000" step="0.01" value="${esc(it.charge)}" aria-label="Charge for ${esc(it.ref)}" required ${paid?"disabled":""}></td></tr>`).join("")}</tbody></table></div>
   <div class="form"><label style="display:flex;gap:8px;align-items:center"><input name="vatEnabled" type="checkbox" style="width:auto" ${original.vatEnabled===false?"":"checked"} ${paid?"disabled":""}> Apply VAT</label>
   ${input("vatPct","VAT rate (%)",original.vatPct||0,"number",'min="0" max="100" step="0.01" '+(paid?"disabled":""))}
   ${input("extraPhrasal","Extra charges (£)",original.extraPhrasal||0,"number",'min="0" step="0.01" '+(paid?"disabled":""))}
   ${input("otherCharges","Other charges (£)",original.otherCharges||0,"number",'min="0" step="0.01" '+(paid?"disabled":""))}
   <label class="full">Other charges description<textarea name="otherDescription" maxlength="2000">${esc(original.otherDescription||"")}</textarea></label>
   <label class="full">Reason for amendment *<textarea name="reason" maxlength="1000" required></textarea></label></div>
   <p id="invoiceEditTotals" role="status" aria-live="polite"></p><p id="invoiceEditError" role="alert"></p>
   <div class="actions"><button class="btn secondary" type="button" data-cancel>Cancel</button><button class="btn primary" type="submit">Save invoice changes</button></div></form>`;
  document.body.append(dialog);
  const form=dialog.querySelector("form"),field=name=>form.elements.namedItem(name);
  const read=()=>({date:field("date").value,dueDate:field("dueDate").value,
   billTo:Object.fromEntries(billingFields.map(k=>[k,field("bill_"+k).value])),
   charges:original.items.map((_,n)=>field("charge_"+n).value),vatEnabled:field("vatEnabled").checked,
   vatPct:field("vatPct").value,extraPhrasal:field("extraPhrasal").value,otherCharges:field("otherCharges").value,
   otherDescription:field("otherDescription").value,reason:field("reason").value});
  const preview=()=>{
   field("vatPct").disabled=paid||!field("vatEnabled").checked;
   try{
    const draft=validate(original,{...read(),reason:"Preview"}).revised;
    dialog.querySelector("#invoiceEditTotals").textContent=`Subtotal: ${money(draft.subtotal)} · VAT: ${money(draft.vatAmount)} · Extras: ${money(draft.extraTotal)} · Total: ${money(draft.total)}`;
   }catch(e){dialog.querySelector("#invoiceEditTotals").textContent=e.message}
  };
  form.addEventListener("input",preview);form.addEventListener("change",preview);preview();
  const close=()=>{if(!busy){dialog.close();dialog.remove()}};
  dialog.querySelector("[data-cancel]").onclick=close;
  dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault()});
  form.onsubmit=async e=>{
   e.preventDefault();if(busy)return;
   const error=dialog.querySelector("#invoiceEditError");error.textContent="";
   if(actor!==uid()){error.textContent="Your sign-in changed. Close this editor.";return}
   busy=true;
   const button=form.querySelector('[type="submit"]');button.disabled=true;
   try{
    await commit(original,read());
    busy=false;close();
    if(page==="invoiceView")viewInvoice(invoiceNo);
    else if(page==="invoices")drawInvoices(document.getElementById("content"));
    alert("Invoice amended successfully. The invoice view and new PDF downloads use the corrected details.");
   }catch(e){error.textContent=e.message}
   finally{busy=false;button.disabled=false}
  };
  dialog.showModal();
 }
 return {action,open,commit,validate,reset,allowed};
})();
