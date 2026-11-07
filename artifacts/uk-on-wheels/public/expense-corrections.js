/* Authorised corrections; never save an entire portal snapshot to edit expenses. */
window.ExpenseCorrections=(()=>{
 "use strict";
 const fields=["date","category","amount","method","reference","payee","notes"];
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const uid=()=>typeof currentSession!=="undefined"?currentSession?.user?.id:null;
 const linked=x=>x?.source==="payslip"||!!x?.payslipId;
 const allowed=()=>!!uid()&&["admin","staff"].includes(typeof role==="undefined"?"":role)&&
  (role==="admin"||(typeof expenseCanManage!=="undefined"&&expenseCanManage===true));
 let busy=false;
 function reset(){document.getElementById("expenseCorrectionDialog")?.remove();}
 function actions(x){
  if(!allowed())return "";
  if(linked(x))return '<span class="muted">Manage via payslip</span>';
  if(!x.id)return '<span class="muted">No expense ID — contact Admin</span>';
  const id=esc(JSON.stringify(String(x.id)));
  return `<button type="button" class="btn small secondary" onclick="ExpenseCorrections.open(${id},'edit')">Edit</button> <button type="button" class="btn small secondary" onclick="ExpenseCorrections.open(${id},'delete')">Delete</button>`;
 }
 async function commit(original,action,values){
  if(!allowed())throw Error("Accounts management permission is required.");
  if(linked(original))throw Error("Correct this expense through its payslip.");
  const actor=uid();
  if(window.ExpenseBulk?.isLocalPreview()){
   const store=getStore(),current=store.expenses.find(x=>x.id===original.id);
   if(JSON.stringify(current)!==JSON.stringify(original))throw Error("This expense has changed. Refresh the register.");
   return {expense_id:original.id,action,expenses:store.expenses.flatMap(x=>x.id!==original.id?[x]:action==="delete"?[]:[{...x,...values}])};
  }
  if(typeof flushSharedStore==="function"&&!await flushSharedStore())throw Error("Save pending portal changes before correcting an expense.");
  if(actor!==uid())throw Error("Your sign-in changed. Reopen the register.");
  const r=await sb.rpc("correct_portal_expense",{p_id:String(original.id),p_expected:original,p_action:action,p_values:values||null});
  if(actor!==uid())throw Error("Your sign-in changed. Reopen the register.");
  if(r.error){
   if(["PGRST202","42883"].includes(r.error.code))throw Error("Expense corrections need setup. Ask Admin to run supabase/expense-corrections.sql.");
   throw Error(r.error.message||"The correction could not be confirmed. Refresh the register before retrying.");
  }
  if(r.data?.expense_id!==String(original.id)||r.data?.action!==action||!Array.isArray(r.data.expenses))
   throw Error("The server did not confirm this correction. Refresh the register before retrying.");
  return r.data;
 }
 function open(id,action){
  if(busy||!allowed()||!["edit","delete"].includes(action))return;
  const original=getStore().expenses.find(x=>String(x.id)===String(id));
  if(!original||linked(original))return;
  // Copy the exact server snapshot for conflict detection.
  const snapshot=JSON.parse(JSON.stringify(original)),actor=uid();
  document.getElementById("expenseCorrectionDialog")?.remove();
  const dialog=document.createElement("dialog");dialog.id="expenseCorrectionDialog";
  dialog.style.cssText="width:min(720px,94vw);max-height:90vh;overflow:auto;border:1px solid #cbd5e1;border-radius:14px;padding:24px;color:inherit;background:var(--panel,#fff)";
  const types=[...new Set([...(window.ExpenseTypes?.list()||[]),original.category])];
  const input=(name,label,type="text",extra="")=>`<label>${label}<input name="${name}" type="${type}" value="${esc(original[name]||"")}" ${extra}></label>`;
  dialog.innerHTML=`<form><h2>${action==="edit"?"Edit expense":"Delete expense?"}</h2>
   ${action==="delete"?`<p>Remove ${esc(original.category)} · ${esc(original.date)} · £${Number(original.amount).toFixed(2)} from the expense register and totals? A secure correction history will be retained.</p>`:
   `<div class="form">${input("date","Date *","date","required")}
   <label>Category *<select name="category" required>${types.map(c=>`<option${c===original.category?" selected":""}>${esc(c)}</option>`).join("")}</select></label>
   ${input("amount","Amount (£) *","number",'min="0.01" step="0.01" required')}
   <label>Payment method<select name="method">${["Cash","Bank Transfer","Card"].map(m=>`<option${m===original.method?" selected":""}>${m}</option>`).join("")}</select></label>
   ${input("reference","Receipt / Reference","text",'maxlength="120"')}${input("payee","Supplier / Paid To","text",'maxlength="500"')}
   <label class="full">Notes<textarea name="notes" maxlength="2000">${esc(original.notes||"")}</textarea></label></div>`}
   <p role="alert" id="expenseCorrectionError"></p><div class="actions"><button type="button" class="btn secondary" data-cancel>Cancel</button>
   <button class="btn primary" type="submit">${action==="edit"?"Save changes":"Delete expense"}</button></div></form>`;
  document.body.append(dialog);
  const close=()=>{if(!busy){dialog.close();dialog.remove();}};
  dialog.querySelector("[data-cancel]").onclick=close;
  dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault();});
  dialog.querySelector("form").onsubmit=async e=>{
   e.preventDefault();if(busy)return;
   const error=dialog.querySelector("#expenseCorrectionError");error.textContent="";
   if(actor!==uid()){error.textContent="Your sign-in changed. Close this dialog.";return;}
   let values=null;
   if(action==="edit"){
    values=Object.fromEntries(fields.map(f=>[f,dialog.querySelector(`[name="${f}"]`).value]));
    const checked=ExpenseBulk.validate([{key:"edit",...values}]);
    const problem=checked.problem||checked.errors.edit;
    if(problem){error.textContent=problem;return;}
    values=checked.payload[0];
   }
   busy=true;dialog.querySelectorAll("button,input,select,textarea").forEach(x=>x.disabled=true);
   try{
    const result=await commit(snapshot,action,values);
    if(actor!==uid())return;
    const store=getStore();store.expenses=result.expenses;STORE_CACHE=store;
    dialog.close();dialog.remove();
    window.ExpenseMonth?.paint();window.ExpenseReport?.paint();
   }catch(err){error.textContent=err.message||"Correction could not be confirmed. Refresh the register.";}
   finally{busy=false;dialog.querySelectorAll("button,input,select,textarea").forEach(x=>x.disabled=false);}
  };
  dialog.showModal();
 }
 return {actions,open,commit,linked,allowed,reset};
})();
