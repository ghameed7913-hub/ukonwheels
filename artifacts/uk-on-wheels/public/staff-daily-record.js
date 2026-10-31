(function(){
"use strict";
const KINDS=["work","overtime","expense","advance","payment"];
const LABEL={work:"Work (days)",overtime:"Overtime",expense:"Expense owed to employee",advance:"Advance paid",payment:"Payment made"};
const st={data:null,month:null,staffId:"",personDraft:null,entryDraft:null,saving:false,error:"",loadError:"",actor:null,req:0};
const esc=v=>escapeHtml(String(v==null?"":v));
const money=v=>typeof currency==="function"?currency(v):"£"+Number(v||0).toFixed(2);
const p=v=>Math.round((Number(v)+Number.EPSILON)*100);
function londonDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function londonMonth(){return londonDate().slice(0,7)}
function uuid(){return crypto.randomUUID()}
function actorId(){return typeof currentSession!=="undefined"?currentSession?.user?.id||null:null}
function active(){return typeof page==="undefined"||page==="staffDailyRecord"}

function summary(person,entries,month,taxPct){
  const rows=(entries||[]).filter(e=>e.staff_id===person?.id&&String(e.entry_date).slice(0,7)===month);
  const sum=k=>rows.filter(e=>e.kind===k).reduce((a,e)=>a+p(e.amount),0);
  const monthly=person?.pay_basis==="monthly";
  const work=sum("work"),overtime=sum("overtime"),expense=sum("expense"),advance=sum("advance"),payment=sum("payment");
  const wages=monthly?p(person.rate):work;
  const taxable=wages+overtime,beforeTax=taxable+expense-advance-payment;
  const pct=Number(taxPct)>0?Math.min(100,Number(taxPct)):0,tax=Math.round(taxable*pct/100);
  const c=x=>x/100;
  return {count:rows.length,monthly,wages:c(wages),work:c(work),overtime:c(overtime),expense:c(expense),advance:c(advance),payment:c(payment),deductions:c(advance+payment),taxable:c(taxable),noTaxBalance:c(beforeTax),taxPct:pct,tax:c(tax),balance:c(beforeTax-tax)};
}

async function rpc(name,args){
  if(typeof sb==="undefined"||!sb?.rpc)throw Object.assign(Error("Supabase is not connected."),{setup:true});
  const {data,error}=await sb.rpc(name,args);
  if(error){const m=error.message||"Request failed.";const e=Error(m);if(/function|does not exist|PGRST202|schema cache/i.test(m+(error.code||"")))e.setup=true;throw e}
  if(["read_staff_daily_records","save_staff_pay_person","add_staff_daily_entry"].includes(name)&&
    (!data||!Array.isArray(data.people)||!Array.isArray(data.entries)||!Array.isArray(data.finalized)))throw Error("The saved staff record could not be confirmed. Refresh before retrying.");
  return data||{};
}
function finalizedFor(id,month){return (st.data?.finalized||[]).find(f=>f.staff_id===id&&f.month===month)}
function setupHtml(msg){return `<div class="panel"><h2>Staff daily record — setup needed</h2><p>${esc(msg)}</p><p class="muted">Run <b>supabase/staff-daily-records.sql</b> in the Supabase SQL editor, then retry. No sample data is shown.</p><button class="btn secondary" id="sdrRetry">Retry</button></div>`}

let host=null;
function load(c){
  host=c;const r=++st.req,actor=actorId();st.actor=actor;st.loadError="";
  c.innerHTML='<div class="panel"><h2>Loading staff daily record…</h2></div>';
  rpc("read_staff_daily_records",{}).then(d=>{
    if(r!==st.req||actorId()!==actor||!c.isConnected||!active())return;
    st.data=d;if(d.finances&&typeof mergePayrollFinances==="function")mergePayrollFinances(d.finances);paint();
  }).catch(e=>{
    if(r!==st.req||actorId()!==actor||!c.isConnected||!active())return;
    c.innerHTML=e.setup?setupHtml(e.message):`<div class="panel"><h2>Staff daily record could not load</h2><p role="alert">${esc(e.message)}</p><button class="btn secondary" id="sdrRetry">Retry</button></div>`;
    c.querySelector("#sdrRetry").onclick=()=>load(c);
  });
}
function draw(c){
 if(st.actor!==actorId()){st.data=null;st.personDraft=null;st.entryDraft=null;st.error="";st.staffId="";st.saving=false}
 st.month=st.month||londonMonth();load(c);
}

function readInputs(){
  const v=id=>host?.querySelector("#"+id)?.value;
  if(host?.querySelector("#sdrPName"))st.personDraft={...(st.personDraft||{}),name:v("sdrPName"),email:v("sdrPEmail"),basis:v("sdrPBasis"),rate:v("sdrPRate")};
  if(host?.querySelector("#sdrEDate"))st.entryDraft={...(st.entryDraft||{}),date:v("sdrEDate"),kind:v("sdrEKind"),days:v("sdrEDays"),amount:v("sdrEAmount"),notes:v("sdrENotes")};
  st.taxPct=v("sdrTax")??st.taxPct;
}

function paint(){
  const c=host;if(!c||!st.data||!active())return;
  const d=st.data,people=d.people||[],can=!!d.canManage,month=st.month;
  if(st.staffId&&!people.some(x=>x.id===st.staffId))st.staffId="";
  if(!st.staffId&&people[0])st.staffId=people[0].id;
  const person=people.find(x=>x.id===st.staffId);
  const s=person?summary(person,d.entries,month,st.taxPct):null;
  const fin=person&&finalizedFor(person.id,month);
  const pd=st.personDraft||{id:null,name:"",email:"",basis:"daily",rate:""};
  const ed=st.entryDraft||{date:londonDate(),kind:"work",days:"1",amount:"",notes:""};
  const rows=person?(d.entries||[]).filter(e=>e.staff_id===person.id&&String(e.entry_date).slice(0,7)===month).sort((a,b)=>String(a.entry_date).localeCompare(String(b.entry_date))):[];
  const dis=(!can||st.saving)?"disabled":"";
  c.innerHTML=`<div class="panel"><h2>Staff Daily Record</h2><p class="muted">One dated record of what each person earned, was reimbursed and was already paid, so nobody is paid twice. Expenses here are reimbursable amounts owed to the employee.</p>
  ${can?"":'<p class="badge">View only — Accounts management permission is required to save.</p>'}
  <div class="form"><label class="autoFieldWrap">Month<input id="sdrMonth" type="month" value="${esc(month)}"></label>
  <label class="autoFieldWrap">Person<select id="sdrPerson">${people.length?"":'<option value="">No saved people yet</option>'}${people.map(x=>`<option value="${esc(x.id)}" ${x.id===st.staffId?"selected":""}>${esc(x.name)} — ${x.pay_basis==="monthly"?"monthly":"daily"} ${money(x.rate)}</option>`).join("")}</select></label></div>
  <button class="btn secondary" id="sdrRefresh" ${st.saving?"disabled":""}>Refresh saved records</button>
  ${st.error?`<p role="alert" class="badge">${esc(st.error)}</p>`:""}</div>
  ${person?`<div class="panel" style="margin-top:12px"><h3>${esc(person.name)} — ${esc(month)}</h3>
  ${fin?`<p role="status" class="badge">Payslip ${esc(fin.payslip_id)}: ${esc(fin.paymentStatus||"Unpaid")}. Remaining to pay: ${money(fin.paymentStatus==="Paid"?0:fin.net)}. This month is closed. Record the final payment by marking the payslip Paid; do not enter it again as an advance or expense.</p>`:""}
  <div class="scroll"><table style="width:100%;min-width:0">
  <tr><td>${s.monthly?"Monthly salary (counted once)":"Daily work total"}</td><td style="text-align:right">${money(s.wages)}</td></tr>
  <tr><td>Overtime</td><td style="text-align:right">${money(s.overtime)}</td></tr>
  <tr><td>Reimbursable expenses owed</td><td style="text-align:right">${money(s.expense)}</td></tr>
  <tr><td>Less advances</td><td style="text-align:right">${money(-s.advance)}</td></tr>
  <tr><td>Less payments already made</td><td style="text-align:right">${money(-s.payment)}</td></tr>
  <tr><td><b>Balance before optional tax (no-tax estimate)</b></td><td style="text-align:right"><b>${money(s.noTaxBalance)}</b></td></tr>
  <tr><td><label>Optional tax % on wages + overtime only <input id="sdrTax" type="number" min="0" max="100" step="0.01" value="${esc(st.taxPct||"")}" style="width:90px"></label></td><td style="text-align:right">${money(-s.tax)}</td></tr>
  <tr><td><b>Balance after optional tax</b></td><td style="text-align:right"><b>${money(s.balance)}</b></td></tr></table></div>
  ${s.balance<0?`<p role="status">Overpaid by <b>${money(-s.balance)}</b>. Carry this forward; it is owed by the employee, not zero.</p>`:""}
  <h3>Add dated entry</h3><fieldset style="border:0;padding:0;margin:0" ${fin||!can||st.saving?"disabled":""}><div class="form">
  <label class="autoFieldWrap">Date<input id="sdrEDate" type="date" value="${esc(ed.date)}"></label>
  <label class="autoFieldWrap">Kind<select id="sdrEKind">${KINDS.map(k=>`<option value="${k}" ${k===ed.kind?"selected":""} ${k==="work"&&person.pay_basis==="monthly"?"disabled":""}>${LABEL[k]}</option>`).join("")}</select></label>
  ${ed.kind==="work"?`<label class="autoFieldWrap">Days worked (× ${money(person.rate)})<input id="sdrEDays" type="number" min="0" step="0.5" value="${esc(ed.days||"1")}"></label>`:""}
  <label class="autoFieldWrap">Amount (£)${ed.kind==="work"?" — blank uses days × rate":""}<input id="sdrEAmount" type="number" min="0" step="0.01" value="${esc(ed.amount)}"></label>
  <label class="full">Notes<textarea id="sdrENotes">${esc(ed.notes)}</textarea></label></div>
  ${person.pay_basis==="monthly"&&ed.kind==="work"?'<p class="muted">The monthly salary is counted once. Choose overtime, expenses, advances or payments to add a dated entry.</p>':""}
  <div class="actions"><button class="btn primary" id="sdrAddEntry">${st.saving?"Saving…":"Add entry"}</button></div></fieldset>
  <h3>Register — ${esc(month)}</h3>${rows.length?"":'<p class="muted">No entries for this month.</p>'}
  <div class="scroll"><table style="min-width:700px"><tr><th>Date</th><th>Kind</th><th>Amount</th><th>Notes</th></tr>${rows.map(e=>`<tr><td>${esc(e.entry_date)}</td><td>${esc(LABEL[e.kind]||e.kind)}</td><td>${money(e.amount)}</td><td>${esc(e.notes||"—")}</td></tr>`).join("")}
  ${rows.length?`<tr><td colspan="2"><b>Month totals</b></td><td><b>${money(s.work+s.overtime+s.expense)}</b> owed · ${money(s.deductions)} paid</td><td></td></tr>`:""}</table></div>
  <div class="actions"><button class="btn secondary" id="sdrGoPayslips">Go to Payslips</button></div>
  <p class="muted">On Payslips, select this employee (matched by email) and month ${esc(month)}, then click Load Daily Record.</p></div>`
  :'<div class="panel" style="margin-top:12px"><h3>No saved people</h3><p class="muted">Add the first person below to start a daily money record.</p></div>'}
  <div class="panel" style="margin-top:12px"><h3>${pd.id?"Edit person":"Staff setup"}</h3><fieldset style="border:0;padding:0;margin:0" ${dis}><div class="form">
  <label class="autoFieldWrap">Name *<input id="sdrPName" maxlength="120" value="${esc(pd.name)}"></label>
  <label class="autoFieldWrap">Email * (matches payslip employee)<input id="sdrPEmail" type="email" required value="${esc(pd.email)}"></label>
  <label class="autoFieldWrap">Pay basis<select id="sdrPBasis"><option value="daily" ${pd.basis!=="monthly"?"selected":""}>Daily</option><option value="monthly" ${pd.basis==="monthly"?"selected":""}>Monthly</option></select></label>
  <label class="autoFieldWrap">Rate (£ per day or month)<input id="sdrPRate" type="number" min="0" step="0.01" value="${esc(pd.rate)}"></label></div>
  <div class="actions"><button class="btn primary" id="sdrSavePerson">${st.saving?"Saving…":"Save person"}</button></div></fieldset></div>`;
  const q=id=>c.querySelector("#"+id);
  q("sdrMonth").onchange=e=>{readInputs();st.month=e.target.value||londonMonth();st.entryDraft=null;paint()};
  q("sdrPerson").onchange=e=>{readInputs();st.staffId=e.target.value;st.entryDraft=null;paint()};
  q("sdrRefresh").onclick=()=>{readInputs();load(c)};
  if(q("sdrTax"))q("sdrTax").onchange=()=>{readInputs();paint()};
  if(q("sdrEKind"))q("sdrEKind").onchange=()=>{readInputs();st.entryDraft.id=null;paint()};
  if(q("sdrAddEntry"))q("sdrAddEntry").onclick=addEntry;
  if(q("sdrGoPayslips"))q("sdrGoPayslips").onclick=()=>{window.staffPayslipSelection={staffId:st.staffId,month:st.month};go("hrPayslips")};
  q("sdrSavePerson").onclick=savePerson;
  if(q("sdrEditPerson"))q("sdrEditPerson").onclick=()=>{st.personDraft={id:person.id,name:person.name,email:person.email||"",basis:person.pay_basis,rate:String(person.rate??"")};paint()};
  if(q("sdrNewPerson"))q("sdrNewPerson").onclick=()=>{st.personDraft=null;paint()};
}

async function mutate(name,args,onOk){
  const actor=actorId();
  if(actor!==st.actor){st.error="Your sign-in changed. Reload this page before saving.";return paint()}
  st.saving=true;st.error="";paint();
  try{
    const d=await rpc(name,args);
    if(actorId()!==actor){st.saving=false;st.error="Your sign-in changed; the result was not shown.";return paint()}
    st.data=d;onOk();
    if(d.finances&&typeof mergePayrollFinances==="function")mergePayrollFinances(d.finances);
  }catch(e){if(actorId()!==actor)return;st.error=(e.setup?"Setup needed: run supabase/staff-daily-records.sql. ":"")+"Not saved: "+e.message}
  st.saving=false;if(host?.isConnected)paint();
}
function savePerson(){
  if(st.saving)return;readInputs();const d=st.personDraft;
  const name=(d.name||"").trim(),rate=Number(d.rate);
  if(!name){st.error="Enter a name.";return paint()}
  if(d.rate===""||!Number.isFinite(rate)||rate<0){st.error="Enter a rate of zero or more.";return paint()}
  const email=(d.email||"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){st.error="Enter a valid email so this record can be matched to the payslip.";return paint()}
  if(!d.id&&!d.newId)d.newId=uuid();
  const id=d.id||d.newId;
  mutate("save_staff_pay_person",{p_id:id,p_name:name,p_email:email,p_basis:d.basis==="monthly"?"monthly":"daily",p_rate:rate},()=>{st.staffId=id;st.personDraft=null});
}
function addEntry(){
  if(st.saving)return;readInputs();const d=st.entryDraft,person=(st.data.people||[]).find(x=>x.id===st.staffId);
  if(!person){st.error="Select a person.";return paint()}
  if(d.kind==="work"&&person.pay_basis!=="daily"){st.error="Monthly salary is counted once. Choose another entry type.";return paint()}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")){st.error="Enter a valid date.";return paint()}
  if(finalizedFor(person.id,d.date.slice(0,7))){st.error="A payslip already closes "+d.date.slice(0,7)+". Entries cannot be added.";return paint()}
  let amount=d.amount===""?NaN:Number(d.amount);
  if(d.kind==="work"&&d.amount===""){const days=Number(d.days);if(!Number.isFinite(days)||days<=0){st.error="Enter days worked.";return paint()}amount=p(days*Number(person.rate))/100}
  if(!Number.isFinite(amount)||amount<=0){st.error="Enter an amount above zero.";return paint()}
  const sig=JSON.stringify([person.id,d.date,d.kind,amount,d.notes]);
  if(!d.id||d.sig!==sig){d.id=uuid();d.sig=sig}
  const notes=(d.kind==="work"&&d.amount===""?d.days+" day(s) × "+Number(person.rate).toFixed(2)+(d.notes?" · ":""):"")+(d.notes||"").trim();
  mutate("add_staff_daily_entry",{p_id:d.id,p_staff_id:person.id,p_date:d.date,p_kind:d.kind,p_amount:amount,p_notes:notes},()=>{st.month=d.date.slice(0,7);st.entryDraft={date:d.date,kind:d.kind,days:"1",amount:"",notes:""}});
}

let payslipBusy=false;
async function useOnPayslip(){
  if(payslipBusy)return;
  const email=(document.getElementById("psUser")?.value||"").trim().toLowerCase(),month=document.getElementById("psMonth")?.value||"";
  if(!email)return alert("Select an employee first.");
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return alert("Select a valid pay month.");
  const actor=actorId();payslipBusy=true;
  try{
    const d=await rpc("read_staff_daily_records",{});
    if(actorId()!==actor)return alert("Your sign-in changed. Daily record not loaded.");
    if((document.getElementById("psUser")?.value||"").trim().toLowerCase()!==email||document.getElementById("psMonth")?.value!==month)return alert("Employee or month changed. Click Load Daily Record again.");
    const matches=(d.people||[]).filter(x=>(x.email||"").trim().toLowerCase()===email);
    if(!matches.length)return alert("No saved daily-record person has the email "+email+". Add the email in Accounts > Staff Daily Record.");
    if(matches.length>1)return alert("More than one daily-record person uses "+email+". Keep only one before loading.");
    const person=matches[0];
    const f=(d.finalized||[]).find(x=>x.staff_id===person.id&&x.month===month);
    if(f)return alert("A payslip ("+f.payslip_id+") already exists for "+person.name+" in "+month+". It cannot be loaded again.");
    const s=summary(person,d.entries,month,0);
    if(!s.count&&!s.monthly)return alert("No daily entries for "+person.name+" in "+month+".");
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v};
    set("psBasic",s.wages.toFixed(2));set("psOvertime",s.overtime.toFixed(2));set("psFuel","0");set("psOtherExpenses",s.expense.toFixed(2));
    set("psFood","0");set("psTravel","0");set("psAdvance",s.deductions.toFixed(2));set("psRate","0");
    if(!document.getElementById("psOtherExpenses")&&s.expense>0)alert("Reimbursable expenses of "+money(s.expense)+" were not loaded because the other expenses field is missing.");
    window.staffPayslipSelection={staffId:person.id,month};
    const notice=document.getElementById("staffPayslipNotice");
    if(notice)notice.textContent="Daily record loaded for "+person.name+", "+month+". Earlier advances/payments: "+money(s.deductions)+". Add any missing daily entries before generating; generation closes this month.";
    if(typeof refreshPayslipEstimate==="function")refreshPayslipEstimate();
  }catch(e){alert((e.setup?"Setup needed: run supabase/staff-daily-records.sql. ":"")+"Daily record could not load: "+e.message)}
  finally{payslipBusy=false}
}

let payslipPeople=[],payslipOwner=null;
async function preparePayslip(){
  const actor=actorId(),select=document.getElementById("psUser"),notice=document.getElementById("staffPayslipNotice");
  payslipPeople=[];payslipOwner=actor;
  try{
    const d=await rpc("read_staff_daily_records",{});
    if(actor!==actorId()||!select?.isConnected)return;
    payslipPeople=d.people||[];
    for(const person of payslipPeople){
      if(!Array.from(select.options).some(o=>o.value.toLowerCase()===person.email.toLowerCase())){
        const o=document.createElement("option");o.value=person.email;o.textContent=person.name+" — Staff daily record";select.append(o);
      }
    }
    if(notice?.isConnected)notice.textContent="For recorded staff, select the person and month, then Load Daily Record. Generate only after all daily entries are complete: one payslip closes that month.";
  }catch(e){if(actor===actorId()&&notice?.isConnected)notice.textContent="Daily record unavailable: "+e.message}
}
function payslipPerson(email){
  if(payslipOwner!==actorId())return null;
  const p=payslipPeople.find(x=>x.email.toLowerCase()===String(email||"").toLowerCase());
  return p?{id:p.id,email:p.email,name:p.name,role:"Staff"}:null;
}
async function createPayslip(record,status){
  const actor=actorId(),d=await rpc("read_staff_daily_records",{});
  if(actor!==actorId())throw Error("Your sign-in changed.");
  const person=(d.people||[]).find(p=>p.email.toLowerCase()===record.email.toLowerCase());
  if(!person)return PayrollPayments.create(record,status);
  const selected=window.staffPayslipSelection;
  if(!selected||selected.staffId!==person.id||selected.month!==record.month)throw Error("Click Load Daily Record for this employee and month before generating the payslip.");
  if(!window.confirm("Generate this staff payslip and close "+record.month+"? Add all daily earnings, expenses, advances and payments first. Record the final balance afterwards using the payslip Paid status."))throw Error("Payslip was not generated. The daily record is still open.");
  const result=await rpc("create_staff_record_payslip",{p_staff_id:person.id,p_payslip:record,p_status:status});
  if(actor!==actorId())throw Error("Your sign-in changed.");
  if(!Array.isArray(result.payslips)||!result.payslips.some(p=>p.id===record.id)||!Array.isArray(result.expenses))throw Error("The saved payslip could not be confirmed. Refresh before retrying.");
  return result;
}
window.StaffDailyRecord={draw,useOnPayslip,preparePayslip,payslipPerson,createPayslip,summary,londonMonth,londonDate};
})();
