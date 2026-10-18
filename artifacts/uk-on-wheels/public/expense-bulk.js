/* All rows are validated, then one authorised RPC commits the complete batch. */
window.ExpenseBulk=(()=>{
  const categories=["Wages","Salary","Fuel","Rent","Office","Entertainment","Utility Bills","Rider Fuel","Staff Fuel","Hotel Expense","Vehicle Recovery Expenses","Insurance","Other Expenses"];
  const methods=["Cash","Bank Transfer","Card"],fields=["date","category","amount","method","reference","payee","notes"];
  let owner=null,generation=0,pending=null;
  const empty=()=>({open:false,rows:[],saving:false,uncertain:false,error:"",errors:{},success:""});
  let draft=empty();
  function isLocalPreview(){return typeof location!=="undefined"&&["localhost","127.0.0.1"].includes(location.hostname)&&
    new URLSearchParams(location.search).get("ui-preview")==="admin"&&currentSession?.user?.id==="local-preview-admin";}
  function uid(){return typeof currentSession!=="undefined"?currentSession?.user?.id:null;}
  function canManage(){return ["admin","staff"].includes(typeof role==="undefined"?"":role)&&
    (role==="admin"||(typeof expenseCanManage!=="undefined"&&expenseCanManage===true))&&!!uid();}
  function reset(){owner=null;generation++;pending=null;draft=empty();const root=document.getElementById("expenseBulkPanel");if(root)root.innerHTML="";}
  function sync(){if(owner!==uid()){reset();owner=uid();}}
  function uuid(){return crypto.randomUUID();}
  function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London"}).format(new Date());}
  function row(){return {key:uuid(),date:today(),category:"",amount:"",method:"Cash",reference:"",payee:"",notes:""};}
  function cents(value){
    const m=/^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
    if(!m)throw Error("Enter a positive amount with up to two decimal places.");
    const p=BigInt(m[1])*100n+BigInt(((m[2]||"")+"00").slice(0,2));
    if(p<=0n||p>BigInt(Number.MAX_SAFE_INTEGER))throw Error("Enter a positive amount within the supported limit.");
    return p;
  }
  function total(){return Number(draft.rows.reduce((sum,r)=>{try{return sum+cents(r.amount);}catch{return sum;}},0n))/100;}
  function validate(rows){
    const errors={},payload=[];let sum=0n;
    if(!Array.isArray(rows)||rows.length<1||rows.length>200)return {errors,problem:"Enter between 1 and 200 expenses."};
    rows.forEach((r,i)=>{
      try{
        if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date+"T00:00:00Z"))||
          new Date(r.date+"T00:00:00Z").toISOString().slice(0,10)!==r.date)throw Error("Choose a valid expense date.");
        if(!categories.includes(r.category))throw Error("Choose an expense type.");
        if(!methods.includes(r.method))throw Error("Choose a payment method.");
        const p=cents(r.amount);sum+=p;
        for(const [key,max] of [["reference",120],["payee",500],["notes",2000]])
          if(typeof r[key]!=="string"||r[key].length>max)throw Error(key+" must be text, no longer than "+max+" characters.");
        payload.push({date:r.date,category:r.category,amount:Number(p)/100,method:r.method,
          reference:r.reference.trim(),payee:r.payee.trim(),notes:r.notes.trim()});
      }catch(e){errors[r.key||String(i)]=e.message;}
    });
    return {errors,payload,total:Number(sum)/100,problem:sum>BigInt(Number.MAX_SAFE_INTEGER)?"Batch total is too large.":""};
  }
  function state(){sync();return {...draft,rows:draft.rows.map(r=>({...r})),categories:categories.slice(),methods:methods.slice(),canManage:canManage(),total:total()};}
  function paint(){
    const root=document.getElementById("expenseBulkPanel");if(root&&window.ExpenseBulkUI)root.innerHTML=ExpenseBulkUI.render(state());
    const single=document.querySelector("[data-single-expense-save]");
    if(single)single.disabled=draft.saving||draft.uncertain||!canManage();
  }
  function open(){sync();if(!canManage())return;if(!draft.rows.length)draft.rows=[row(),row()];draft.open=true;draft.success="";paint();}
  async function close(){
    sync();if(draft.saving||draft.uncertain)return;
    const id=owner,gen=generation;
    const dirty=draft.rows.some(r=>r.category||r.amount||r.reference||r.payee||r.notes);
    if(dirty){
      const ok=typeof crmConfirm==="function"?await crmConfirm("Discard the unsaved bulk expenses?","Close bulk expenses","Discard"):window.confirm("Discard the unsaved bulk expenses?");
      if(!ok||id!==uid()||gen!==generation)return;
    }
    draft=empty();pending=null;paint();
  }
  function addRow(){sync();if(!canManage()||draft.saving||draft.uncertain||draft.rows.length>=200)return;draft.rows.push(row());paint();}
  function removeRow(key){sync();if(!canManage()||draft.saving||draft.uncertain||draft.rows.length<=1)return;draft.rows=draft.rows.filter(r=>r.key!==key);delete draft.errors[key];paint();}
  function update(key,field,value){
    sync();if(!canManage()||draft.saving||draft.uncertain||!fields.includes(field))return;
    const r=draft.rows.find(r=>r.key===key);if(!r)return;r[field]=String(value);
    const target=document.querySelector("#expenseBulkPanel [data-bulk-total]");
    if(target)target.textContent=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(total());
  }
  function capture(){
    const root=document.getElementById("expenseBulkPanel");if(!root)return;
    for(const el of root.querySelectorAll("[data-bulk-key]")){
      const r=draft.rows.find(r=>r.key===el.dataset.bulkKey);if(!r)continue;
      for(const input of el.querySelectorAll("[data-bulk-field]"))if(fields.includes(input.dataset.bulkField))r[input.dataset.bulkField]=input.value;
    }
  }
  async function submit(id,rows){
    const actor=uid();if(!canManage())throw Object.assign(Error("Accounts management permission is required."),{definiteFailure:true});
    if(isLocalPreview()){
      const s=getStore(),existing=(s.expenses||[]).filter(e=>e.batchId===id);
      const expenses=existing.length?s.expenses:[...(s.expenses||[]),...rows.map((r,i)=>({...r,id:"EXP-"+id+"-"+(i+1),source:"expense-batch",batchId:id}))];
      return {batch_id:id,saved_count:rows.length,expenses};
    }
    const r=await sb.rpc("save_expense_batch",{p_batch_id:id,p_expenses:rows});
    if(actor!==uid())throw Error("Your sign-in changed. Check the register after signing in again.");
    if(r.error){
      if(["PGRST202","42883"].includes(r.error.code))throw Object.assign(Error("Bulk Expenses needs setup. Ask Admin to run supabase/bulk-expenses.sql."),{definiteFailure:true});
      const definite=/^(22|23|42|P0001)/.test(r.error.code||"")&&!/already been saved/i.test(r.error.message||"");
      throw Object.assign(Error(r.error.message||"The expense save was not confirmed."),{definiteFailure:definite});
    }
    if(r.data?.batch_id!==id||r.data.saved_count!==rows.length||!Array.isArray(r.data.expenses)||
      r.data.expenses.filter(e=>e.source==="expense-batch"&&e.batchId===id).length!==rows.length)
      throw Error("The server response did not confirm every expense. Retry this batch.");
    return r.data;
  }
  async function save(){
    sync();if(!canManage()||draft.saving)return;
    if(!draft.uncertain){
      capture();const checked=validate(draft.rows);draft.errors=checked.errors;draft.error=checked.problem;
      if(checked.problem||Object.keys(checked.errors).length){paint();return;}
      pending={id:uuid(),rows:checked.payload,total:checked.total};
    }
    if(!pending){draft.error="Reopen Bulk Expense before saving.";paint();return;}
    const id=owner,gen=generation,batch=pending;
    draft.saving=true;draft.error="";paint();
    try{
      if(!isLocalPreview()&&typeof flushSharedStore==="function"&&!await flushSharedStore())
        throw Object.assign(Error("Other portal changes could not be saved. Retry them before saving this batch."),{definiteFailure:true});
      const result=await submit(batch.id,batch.rows);
      if(id!==uid()||gen!==generation)return;
      const s=getStore();s.expenses=result.expenses;STORE_CACHE=s;
      draft=empty();draft.success="Saved "+result.saved_count+" expense"+(result.saved_count===1?"":"s")+" — £"+batch.total.toFixed(2)+".";
      pending=null;paint();
      const register=document.getElementById("expenseRegister");
      if(register&&typeof expenseRegisterHtml==="function")register.innerHTML=expenseRegisterHtml(s);
    }catch(e){
      if(id!==uid()||gen!==generation)return;
      draft.error=e.message||"Expenses could not be saved.";draft.uncertain=!e.definiteFailure;
      if(e.definiteFailure)pending=null;
    }finally{if(id===uid()&&gen===generation){draft.saving=false;paint();}}
  }
  return {state,open,close,addRow,removeRow,update,save,reset,paint,submit,validate,cents,isLocalPreview};
})();
