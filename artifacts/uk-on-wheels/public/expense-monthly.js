/* Monthly views never replace or trim the complete, server-backed expense register. */
window.ExpenseMonth=(()=>{
  "use strict";
  let owner=null,generation=0,month="",day="",entryDate="",automatic=true,rolloverNotice="";
  let pending=null,saving=false,error="",success="";
  const uid=()=>typeof currentSession!=="undefined"?currentSession?.user?.id:null;
  const el=id=>document.getElementById(id);
  const validMonth=v=>/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(String(v));
  const validDate=v=>/^[1-9]\d{3}-\d{2}-\d{2}$/.test(String(v))&&Number.isFinite(Date.parse(v+"T00:00:00Z"))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
  function today(now=new Date()){
    const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(x=>[x.type,x.value]));
    return p.year+"-"+p.month+"-"+p.day;
  }
  function bounds(m){
    if(!validMonth(m))throw Error("Choose a valid month.");
    const [y,n]=m.split("-").map(Number),last=new Date(Date.UTC(y,n,0)).getUTCDate();
    return {min:m+"-01",max:m+"-"+last,days:last,firstDay:(new Date(m+"-01T00:00:00Z").getUTCDay()+6)%7};
  }
  const title=m=>new Intl.DateTimeFormat("en-GB",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(m+"-01T12:00:00Z"));
  function filter(rows,m,d=""){
    if(!validMonth(m))return [];
    return (rows||[]).filter(r=>validDate(r.date)&&r.date.slice(0,7)===m&&(!d||r.date===d));
  }
  const total=rows=>rows.reduce((n,r)=>n+(Number.isFinite(Number(r.amount))?Math.round(Number(r.amount)*100):0),0)/100;
  function bulk(){return window.ExpenseBulk?.state()||{rows:[],saving:false,uncertain:false,canManage:false};}
  function singleDirty(){return ["exCat","exAmount","exRef","exPayee","exNotes"].some(id=>!!el(id)?.value?.trim());}
  function dirty(){return singleDirty()||bulk().rows.some(r=>r.category||r.amount||r.reference||r.payee||r.notes);}
  function locked(){const b=bulk();return saving||!!pending||b.saving||b.uncertain;}
  function reset(){
    owner=null;generation++;month="";day="";entryDate="";automatic=true;rolloverNotice="";
    pending=null;saving=false;error="";success="";
  }
  function sync(){
    if(owner!==uid()){reset();owner=uid();}
    const date=today(),current=date.slice(0,7);
    if(!month){month=current;entryDate=date;}
    if(automatic&&month!==current){
      if(dirty()||locked())rolloverNotice="A new month has started. Save or clear your unfinished expenses before switching to "+title(current)+". Your dates have not been changed.";
      else{month=current;day="";entryDate=date;rolloverNotice="";}
    }
  }
  function state(rows){
    sync();rows=rows||(typeof getStore==="function"?getStore().expenses:[])||[];
    const monthRows=filter(rows,month),visible=filter(rows,month,day),b=bounds(month),months=new Set([month,today().slice(0,7)]);
    for(const r of rows)if(validDate(r.date))months.add(r.date.slice(0,7));
    return {month,title:title(month),day,today:today(),entryDate,firstDay:b.firstDay,
      days:Array.from({length:b.days},(_,i)=>{
        const date=month+"-"+String(i+1).padStart(2,"0"),entries=monthRows.filter(r=>r.date===date);
        return {date,number:i+1,count:entries.length,total:total(entries)};
      }),
      monthCount:monthRows.length,monthTotal:total(monthRows),visibleCount:visible.length,visibleTotal:total(visible),
      canManage:bulk().canManage,locked:locked(),rolloverNotice,
      availableMonths:[...months].sort().reverse().map(value=>({value,label:title(value)}))};
  }
  function paintMessage(){
    const message=el("expenseEntryStatus");if(!message)return;
    message.textContent=error||success;
    message.className="expenseEntryStatus "+(error?"error":"success");
    message.setAttribute("role",error?"alert":"status");
  }
  function paint(){
    const s=state(),root=el("expenseMonthPanel");
    if(root&&window.ExpenseMonthUI)root.innerHTML=ExpenseMonthUI.render(s);
    const register=el("expenseRegister");
    if(register&&typeof expenseRegisterHtml==="function")register.innerHTML=expenseRegisterHtml(getStore());
    const date=el("exDate"),b=bounds(month);
    if(date){date.min=b.min;date.max=b.max;if(!singleDirty()&&!pending)date.value=entryDate;}
    for(const input of document.querySelectorAll("#expenseSingleForm input, #expenseSingleForm select, #expenseSingleForm textarea"))input.disabled=saving||!!pending||!s.canManage;
    const button=el("singleExpenseSave");
    if(button){button.disabled=saving||bulk().saving||bulk().uncertain||!s.canManage;button.textContent=saving?"Saving…":pending?"Retry save":"Add Expense";}
    const clear=el("singleExpenseClear");if(clear)clear.disabled=saving||!!pending||!s.canManage;
    paintMessage();
    window.ExpenseReport?.paint();
  }
  function blocked(){
    if(!locked())return false;
    window.alert("Confirm the pending expense save before changing the month or date. Your entries have been kept.");paint();return true;
  }
  function selectMonth(value){
    sync();if(!validMonth(value)){paint();return false;}
    if(blocked())return false;
    if(value!==month&&dirty()){
      window.alert("You have unfinished expenses. Save them, or clear the single expense and close the bulk form, before changing month. Nothing has been removed.");
      paint();return false;
    }
    month=value;day="";entryDate=value===today().slice(0,7)?today():value+"-01";
    automatic=value===today().slice(0,7);rolloverNotice="";
    if(!singleDirty()&&el("exDate"))el("exDate").value=entryDate;
    window.ExpenseBulk?.setDefaultDate(entryDate);paint();return true;
  }
  function shiftMonth(delta){
    sync();if(![-1,1].includes(delta))return false;
    const [y,n]=month.split("-").map(Number),date=new Date(Date.UTC(y,n-1+delta,1));
    return selectMonth(date.toISOString().slice(0,7));
  }
  function selectDay(value){
    sync();if(!validDate(value)||value.slice(0,7)!==month||blocked())return false;
    day=value;entryDate=value;if(el("exDate"))el("exDate").value=value;
    window.ExpenseBulk?.setDefaultDate(value);paint();return true;
  }
  function allDays(){sync();if(blocked())return;day="";paint();}
  function defaultDate(){sync();return entryDate;}
  function inMonth(value){sync();return validDate(value)&&value.slice(0,7)===month;}
  function validateRows(rows){
    sync();return rows.every(r=>inMonth(r.date))?"":"Every expense date must be in "+title(month)+". Change the date or save this month before switching to another month.";
  }
  function clearFields(){
    for(const id of ["exCat","exAmount","exRef","exPayee","exNotes"])if(el(id))el(id).value="";
    if(el("exMethod"))el("exMethod").value="Cash";
  }
  async function clearSingle(){
    sync();if(saving||pending)return;
    const actor=uid(),gen=generation;
    if(singleDirty()){
      const ok=typeof crmConfirm==="function"?await crmConfirm("Clear this unsaved expense? Saved expenses will not be affected.","Clear expense","Clear"):window.confirm("Clear this unsaved expense? Saved expenses will not be affected.");
      if(!ok||actor!==uid()||gen!==generation)return;
    }
    clearFields();error="";success="";paint();
  }
  async function saveSingle(){
    sync();const b=bulk();if(!b.canManage||saving||b.saving||b.uncertain)return;
    if(!pending){
      const row={key:"single",date:el("exDate")?.value||"",category:el("exCat")?.value||"",
        amount:el("exAmount")?.value||"",method:el("exMethod")?.value||"Cash",
        reference:el("exRef")?.value||"",payee:el("exPayee")?.value||"",notes:el("exNotes")?.value||""};
      const checked=ExpenseBulk.validate([row]);error=checked.problem||checked.errors.single||validateRows([row]);
      if(error){paintMessage();return;}
      pending={id:crypto.randomUUID(),rows:checked.payload};
    }
    const actor=uid(),gen=generation,batch=pending;
    saving=true;error="";success="";paint();ExpenseBulk.paint();
    try{
      if(!ExpenseBulk.isLocalPreview()&&typeof flushSharedStore==="function"&&!await flushSharedStore())
        throw Object.assign(Error("Other portal changes could not be saved. Retry before saving this expense."),{definiteFailure:true});
      if(actor!==uid()||gen!==generation)return;
      const result=await ExpenseBulk.submit(batch.id,batch.rows);
      if(actor!==uid()||gen!==generation)return;
      const store=getStore();store.expenses=result.expenses;STORE_CACHE=store;
      pending=null;clearFields();success="Saved expense for "+batch.rows[0].date+" — £"+batch.rows[0].amount.toFixed(2)+".";
    }catch(e){
      if(actor!==uid()||gen!==generation)return;
      error=(e.message||"The expense could not be confirmed.")+(e.definiteFailure?"":" Your original entry is kept. Use Retry save to confirm it without creating a duplicate.");
      if(e.definiteFailure)pending=null;
    }finally{
      if(actor===uid()&&gen===generation){saving=false;ExpenseBulk.paint();paint();}
    }
  }
  function afterSave(){paint();}
  function refresh(){if(typeof page!=="undefined"&&page==="expenses"&&el("expenseMonthPanel"))paint();}
  if(window.addEventListener)window.addEventListener("focus",refresh);
  if(document.addEventListener)document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
  if(window.setInterval)window.setInterval(refresh,60000);
  return {state,paint,reset,today,bounds,filter,total,validDate,validMonth,title,selectMonth,selectDay,allDays,shiftMonth,
    thisMonth:()=>selectMonth(today().slice(0,7)),defaultDate,inMonth,validateRows,clearSingle,saveSingle,afterSave,
    singleLocked:()=>saving||!!pending,singleSaving:()=>saving};
})();
