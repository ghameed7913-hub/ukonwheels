(function(){
"use strict";
const KINDS=["work","overtime","expense","advance","payment"];
const LABEL={work:"Work (days)",overtime:"Overtime",expense:"Expense owed to employee",advance:"Advance paid",payment:"Payment made"};
const st={rows:null,newIds:{},taxOn:false,batchId:null,notice:"",data:null,month:null,staffId:"",personDraft:null,entryDraft:null,saving:false,error:"",loadError:"",actor:null,req:0};
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
  if(["read_staff_daily_records","save_staff_pay_person","add_staff_daily_entry","save_staff_daily_sheet"].includes(name)&&
    (!data||!Array.isArray(data.people)||!Array.isArray(data.entries)||!Array.isArray(data.finalized)))throw Error("The saved staff record could not be confirmed. Refresh before retrying.");
  return data||{};
}
function finalizedFor(id,month){return (st.data?.finalized||[]).find(f=>f.staff_id===id&&f.month===month)}
function setupHtml(msg){return `<div class="panel sdr"><h2>Staff daily record — setup needed</h2><p>${esc(msg)}</p><p class="muted">Run <b>supabase/staff-daily-records.sql</b> in the Supabase SQL editor, then retry. No sample data is shown.</p><button class="btn secondary" id="sdrRetry">Retry</button></div>`}

(function css(){try{if(document.getElementById("sdrCss"))return;const s=document.currentScript?.src||"./staff-daily-record.js";const l=document.createElement("link");l.id="sdrCss";l.rel="stylesheet";l.href=new URL("staff-daily-record.css",s).href;document.head.append(l)}catch(e){}})();

/* ---------- pure sheet helpers ---------- */
const AMTS=["work","overtime","expense","advance","payment"];
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseAmt(v){const s=String(v==null?"":v).trim();if(s==="")return 0;const n=Number(s);return Number.isFinite(n)?n:NaN}
/* Normalize one draft row against saved people. Returns {row, errors:{field:msg}} */
function normalizeRow(r,people,finalized,newIds){
  const e={},ppl=people||[];
  let person=r.personId?ppl.find(x=>x.id===r.personId):null;
  const email=String(r.email||"").trim().toLowerCase();
  if(!person&&email)person=ppl.find(x=>String(x.email||"").toLowerCase()===email)||null;
  const name=person?person.name:String(r.name||"").trim();
  const basis=person?person.pay_basis:(r.basis==="monthly"?"monthly":"daily");
  const rate=person?Number(person.rate):parseAmt(r.rate);
  if(!name)e.name="Name required";
  if(!person&&!EMAIL.test(email))e.email="Valid email required to link the payslip";
  if(person&&!r.personId&&(String(r.name||"").trim()&&String(r.name).trim()!==person.name||(r.basis&&r.basis!==person.pay_basis)||(String(r.rate||"").trim()!==""&&Number(r.rate)!==Number(person.rate))))e.email="Email belongs to saved "+person.name+" ("+person.pay_basis+" "+Number(person.rate).toFixed(2)+"); saved pay terms cannot change here";
  if(!person&&(String(r.rate??"").trim()===""||!Number.isFinite(rate)||rate<0||rate>9999999999.99||Math.abs(rate*100-Math.round(rate*100))>0.00001))e.rate="Rate of 0 or more, up to 2 decimal places";
  const dateValue=/^\d{4}-\d{2}-\d{2}$/.test(r.date||"")?new Date(r.date+"T00:00:00Z"):null;
  if(!dateValue||isNaN(dateValue.getTime())||dateValue.toISOString().slice(0,10)!==r.date||r.date<"2000-01-01"||r.date>"2100-12-31")e.date="Valid date between 2000 and 2100";
  if(String(r.notes||"").length>2000)e.notes="Notes must be 2000 characters or fewer";
  const out={};
  for(const k of AMTS){const n=parseAmt(r[k]);if(!Number.isFinite(n)||n<0||n>9999999999.99||Math.abs(n*100-Math.round(n*100))>0.00001)e[k]="0 or more, up to 2 decimal places";out[k]=Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0}
  if(basis==="monthly"&&out.work>0)e.work="Monthly salary is counted once; leave blank";
  const pid=person?person.id:(email&&newIds?newIds[email]||null:null);
  if(person&&r.date&&(finalized||[]).some(f=>f.staff_id===person.id&&f.month===String(r.date).slice(0,7)))e.date="Payslip closes "+String(r.date).slice(0,7);
  return {row:{key:r.key,person_id:pid,existing:!!person,name,email:person?String(person.email||"").toLowerCase():email,pay_basis:basis,rate:Number.isFinite(rate)?rate:0,date:r.date||"",...out,notes:String(r.notes||"").trim()},errors:e};
}
/* New people repeated across drafts must share terms. Mutates errors map. */
function crossCheck(norm){
  const seen={};
  norm.forEach(({row,errors})=>{if(row.existing||!row.email)return;const t=seen[row.email];
    if(!t)seen[row.email]=row;else if(t.name!==row.name||t.pay_basis!==row.pay_basis||t.rate!==row.rate)errors.email="Same email as another draft row but different name/basis/rate"});
  return norm;
}
/* Per person-month totals, saved + draft. Amounts in pounds. */
function sheetTotals(people,entries,finalized,normRows,month,taxPct){
  const g=new Map(),pct=Number(taxPct)>0?Math.min(100,Number(taxPct)):0;
  const get=(key,info,m)=>{const k=key+"|"+m;if(!g.has(k))g.set(k,{key:k,pid:info.id||null,name:info.name,email:info.email,basis:info.pay_basis,rate:Number(info.rate)||0,month:m,saved:null,fin:null,d:{wages:0,overtime:0,expense:0,advance:0,payment:0},drafts:0});return g.get(k)};
  for(const pr of people||[]){const has=(entries||[]).some(e=>e.staff_id===pr.id&&String(e.entry_date).slice(0,7)===month);if(has||pr.pay_basis==="monthly")get(pr.id,pr,month)}
  for(const {row} of normRows||[]){if(!row.date||!row.name)continue;const m=row.date.slice(0,7);if(m!==month)continue;
    const pr=row.existing?(people||[]).find(x=>x.id===row.person_id):null;
    const t=get(pr?pr.id:(row.email||row.name),pr||{id:row.person_id,name:row.name,email:row.email,pay_basis:row.pay_basis,rate:row.rate},m);
    t.drafts++;t.d.wages+=row.pay_basis==="daily"?p(row.work):0;for(const k of ["overtime","expense","advance","payment"])t.d[k]+=p(row[k])}
  let grand=0,grandSaved=0;const list=[];
  for(const t of g.values()){
    const pr=t.pid?(people||[]).find(x=>x.id===t.pid):null;
    const s=pr?summary(pr,entries,t.month,0):null;t.saved=s;
    t.fin=pr?(finalized||[]).find(f=>f.staff_id===pr.id&&f.month===t.month):null;
    const sw=s?p(s.wages):0,so=s?p(s.overtime):0,se=s?p(s.expense):0,sd=s?p(s.deductions):0;
    const newMonthly=!pr&&t.basis==="monthly"?p(t.rate):0;
    const wages=sw+t.d.wages+newMonthly,ot=so+t.d.overtime,exp=se+t.d.expense,ded=sd+t.d.advance+t.d.payment;
    const taxable=wages+ot,tax=Math.round(taxable*pct/100);
    const savedOnly=s?p(s.noTaxBalance)-Math.round((sw+so)*pct/100):0;
    let bal=taxable+exp-ded-tax;let savedBal=savedOnly;
    if(t.fin){bal=t.fin.paymentStatus==="Paid"?0:p(t.fin.net||0);savedBal=bal}
    Object.assign(t,{wages:wages/100,overtime:ot/100,expense:exp/100,deductions:ded/100,tax:tax/100,balance:bal/100,savedBalance:savedBal/100});
    grand+=bal;grandSaved+=savedBal;list.push(t);
  }
  list.sort((a,b)=>a.name.localeCompare(b.name)||a.month.localeCompare(b.month));
  return {groups:list,grand:grand/100,grandSaved:grandSaved/100,unsaved:(grand-grandSaved)/100,taxPct:pct};
}
function sigOf(r){return JSON.stringify([r.person_id,r.name,r.email,r.pay_basis,r.rate,r.date,r.work,r.overtime,r.expense,r.advance,r.payment,r.notes])}
/* Builds RPC rows; assigns stable IDs (mutates drafts' ids/sig only when content changed). */
function buildPayload(drafts,norm,newIds,mkId){
  mkId=mkId||uuid;
  return norm.map(({row},i)=>{
    const d=drafts[i];
    if(!row.person_id){newIds[row.email]=newIds[row.email]||mkId();row.person_id=newIds[row.email]}
    const sig=sigOf(row);
    if(!d.ids||d.sig!==sig){d.ids={};AMTS.forEach(k=>d.ids[k]=mkId());d.sig=sig}
    return {person_id:row.person_id,name:row.name,email:row.email,pay_basis:row.pay_basis,rate:row.rate,date:row.date,work:row.work,overtime:row.overtime,expense:row.expense,advance:row.advance,payment:row.payment,notes:row.notes,entry_ids:{...d.ids}};
  });
}

/* ---------- draft persistence ---------- */
function dkey(){return "ukowSdrDrafts:"+(actorId()||"anon")}
function loadDrafts(){try{const j=JSON.parse(localStorage.getItem(dkey())||"null");st.rows=Array.isArray(j?.rows)?j.rows:[];st.newIds=j?.newIds||{};st.taxOn=!!j?.taxOn;st.batchId=j?.batchId||null;st.taxPct=j?.taxPct||""}catch(e){st.rows=[];st.newIds={};st.batchId=null}}
function persist(){try{if(st.rows.length||st.taxOn||st.batchId)localStorage.setItem(dkey(),JSON.stringify({rows:st.rows,newIds:st.newIds,taxOn:st.taxOn,taxPct:st.taxPct,batchId:st.batchId}));else localStorage.removeItem(dkey())}catch(e){}}
let unloadBound=false;
function bindUnload(){if(unloadBound)return;unloadBound=true;window.addEventListener("beforeunload",ev=>{if(st.rows&&st.rows.some(r=>!blank(r))){ev.preventDefault();ev.returnValue=""}})}
function blank(r){return !r.personId&&!String(r.name||"").trim()&&!String(r.email||"").trim()&&AMTS.every(k=>String(r[k]||"").trim()==="")&&!String(r.notes||"").trim()}
let seq=0;
function newRow(from){return {key:"r"+Date.now().toString(36)+(seq++),personId:from?.personId||"",name:from?.name||"",email:from?.email||"",basis:from?.basis||"daily",rate:from?.rate??"",date:from?.date||(st.month&&st.month!==londonMonth()?st.month+"-01":londonDate()),work:"",overtime:"",expense:"",advance:"",payment:"",notes:""}}

let host=null;
function load(c){
  host=c;const r=++st.req,actor=actorId();st.actor=actor;st.loadError="";
  if(!st.data)c.innerHTML='<div class="panel sdr"><div class="sdrSkel"></div><div class="sdrSkel"></div><div class="sdrSkel short"></div></div>';
  rpc("read_staff_daily_records",{}).then(d=>{
    if(r!==st.req||actorId()!==actor||!c.isConnected||!active())return;
    st.data=d;if(d.finances&&typeof mergePayrollFinances==="function")mergePayrollFinances(d.finances);paint();
  }).catch(e=>{
    if(r!==st.req||actorId()!==actor||!c.isConnected||!active())return;
    c.innerHTML=e.setup?setupHtml(e.message):`<div class="panel sdr"><h2>Staff daily record could not load</h2><p role="alert">${esc(e.message)}</p><button class="btn secondary" id="sdrRetry">Retry</button></div>`;
    c.querySelector("#sdrRetry").onclick=()=>load(c);
  });
}
function draw(c){
 if(st.actor!==actorId()||!st.rows){st.data=null;st.error="";st.saving=false;st.notice="";loadDrafts()}
 bindUnload();st.month=st.month||londonMonth();load(c);
}

function normAll(){const d=st.data||{};return crossCheck(st.rows.map(r=>normalizeRow(r,d.people,d.finalized,st.newIds)))}
const FIELDS=[["date","Date","date"],["staff","Staff",""],["name","Name","text"],["email","Email","email"],["basis","Pay","" ],["rate","Rate £","num"],["work","Work £","num"],["overtime","Overtime £","num"],["expense","Expenses £","num"],["advance","Advance £","num"],["payment","Paid £","num"],["notes","Notes","text"]];

function cellHtml(r,i,f,people,errs,can){
  const lock=!!r.personId,dis=!can||st.saving?" disabled":"",id=`sdr-${r.key}-${f}`,lbl=`Row ${i+1} ${f}`;
  const err=errs[f]?` aria-invalid="true" title="${esc(errs[f])}"`:"";
  const tid=` data-testid="input-${f}-${i}" data-k="${esc(r.key)}" data-f="${f}" id="${id}" aria-label="${esc(lbl)}"`;
  if(f==="staff")return `<select${tid}${dis}><option value="">New person</option>${people.map(x=>`<option value="${esc(x.id)}" ${x.id===r.personId?"selected":""}>${esc(x.name)}</option>`).join("")}</select>`;
  if(f==="basis")return `<select${tid}${dis}${lock?" disabled":""}${err}><option value="daily" ${r.basis!=="monthly"?"selected":""}>Daily</option><option value="monthly" ${r.basis==="monthly"?"selected":""}>Monthly</option></select>`;
  const typ=f==="date"?"date":f==="email"?"email":"text",num=["rate",...AMTS].includes(f);
  const ro=lock&&["name","email","rate"].includes(f)?" readonly":"";
  const monthlyWork=f==="work"&&r.basis==="monthly"?` placeholder="monthly" `:"";
  return `<input type="${typ}"${num?' inputmode="decimal" class="num"':""}${tid} value="${esc(r[f])}"${ro}${dis}${err}${monthlyWork}${f==="name"?' maxlength="120"':""}>`;
}

function paint(){
  const c=host;if(!c||!st.data||!active())return;
  const d=st.data,people=d.people||[],can=!!d.canManage,month=st.month;
  const norm=normAll();
  const savedRows=(d.entries||[]).filter(e=>String(e.entry_date).slice(0,7)===month).sort((a,b)=>String(a.entry_date).localeCompare(String(b.entry_date)));
  const byId=Object.fromEntries(people.map(x=>[x.id,x]));
  c.innerHTML=`<div class="sdr">
  <div class="panel sdrHead"><div><h2>Staff Daily Record</h2>
  <p class="muted">Type rows like a spreadsheet. Nothing is stored until you press <b>Save rows</b>. No money is transferred by this page: amounts in <b>Paid</b> only reduce what is due and are added to Salary expenses once.</p>
  ${can?"":'<p class="badge" data-testid="status-readonly">View only — Accounts management permission is required to add rows.</p>'}</div>
  <div class="sdrTools"><label>Month <input id="sdrMonth" type="month" value="${esc(month)}" data-testid="input-month"></label>
  <label class="sdrTax"><input type="checkbox" id="sdrTaxOn" ${st.taxOn?"checked":""} data-testid="toggle-tax"> Tax on wages + overtime</label>
  <label class="sdrTax" ${st.taxOn?"":"hidden"}>% <input id="sdrTax" class="num" inputmode="decimal" value="${esc(st.taxPct||"")}" style="width:64px" data-testid="input-tax"></label>
  <button class="btn secondary" id="sdrRefresh" ${st.saving?"disabled":""} data-testid="button-refresh">Refresh saved</button></div></div>
  ${st.error?`<p role="alert" class="sdrErr" data-testid="status-error">${esc(st.error)}</p>`:""}
  ${st.notice?`<p role="status" class="sdrOk" data-testid="status-notice">${esc(st.notice)}</p>`:""}
  ${can?`<div class="panel"><div class="sdrBar"><h3>Unsaved rows <span class="sdrPill draft" id="sdrCount">${st.rows.length}</span></h3>
  <div class="sdrBtns">${st.batchId?`<button class="btn secondary" id="sdrDiscard" ${st.saving?"disabled":""}>Discard draft batch</button>`:""}<button class="btn secondary" id="sdrAdd" ${st.saving||st.rows.length>=100?"disabled":""} data-testid="button-add-row">Add row</button>
  <button class="btn primary" id="sdrSave" ${st.saving||!st.rows.length?"disabled":""} data-testid="button-save-rows">${st.saving?"Saving…":"Save rows"}</button></div></div>
  <p class="muted sdrHint">Pick a saved person in <b>Staff</b> to autofill (their pay terms are fixed), or type a new name, email and terms. Work £ is for daily staff only; monthly salary is counted once per person per month. Blank amounts count as 0. Max 100 rows per save.</p>
  <div class="sdrScroll"><table class="sdrGrid" id="sdrGrid"><thead><tr><th>#</th>${FIELDS.map(f=>`<th scope="col">${f[1]}</th>`).join("")}<th>Row £</th><th><span class="sr">Remove</span></th></tr></thead>
  <tbody>${st.rows.map((r,i)=>{const n=norm[i];return `<tr class="draft" data-row="${esc(r.key)}" data-testid="row-draft-${i}"><td class="idx">${i+1}</td>${FIELDS.map(([f])=>`<td>${cellHtml(r,i,f,people,n.errors,can)}</td>`).join("")}<td class="num rowTot" data-tot="${esc(r.key)}"></td><td><button class="sdrX" data-del="${esc(r.key)}" aria-label="Remove draft row ${i+1}" ${st.saving?"disabled":""} data-testid="button-remove-row-${i}">Remove</button></td></tr><tr class="errRow" data-err="${esc(r.key)}"><td></td><td colspan="${FIELDS.length+2}" class="rowErr" role="status"></td></tr>`}).join("")}
  ${st.rows.length?"":`<tr><td colspan="${FIELDS.length+3}" class="sdrEmpty">No unsaved rows. Press Add row to start typing.</td></tr>`}</tbody></table></div></div>`:""}
  <div class="panel"><h3>Payable — ${esc(month)} saved plus unsaved preview</h3><div class="sdrScroll" id="sdrTotals"></div>
  <p class="muted">Estimate for the selected month only; draft rows dated in other months are excluded. Finalized months show the payslip: zero once Paid, otherwise its net. Negative means overpaid and is owed back by the employee.</p></div>
  <div class="panel"><h3>Saved entries — ${esc(month)} <span class="sdrPill">read-only</span></h3>
  <p class="muted">Saved entries cannot be edited here. Corrections are handled separately.</p>
  <div class="sdrScroll"><table class="sdrGrid saved"><thead><tr><th>Date</th><th>Name</th><th>Kind</th><th class="num">Amount</th><th>Notes</th></tr></thead><tbody>
  ${savedRows.length?savedRows.map((e,i)=>`<tr data-testid="row-saved-${i}"><td>${esc(e.entry_date)}</td><td>${esc(byId[e.staff_id]?.name||"Unknown")}</td><td>${esc(LABEL[e.kind]||e.kind)}</td><td class="num">${money(e.amount)}</td><td>${esc(e.notes||"—")}</td></tr>`).join(""):`<tr><td colspan="5" class="sdrEmpty">No saved entries for ${esc(month)}.</td></tr>`}</tbody></table></div>
  <div class="actions"><button class="btn secondary" id="sdrGoPayslips" data-testid="button-payslips">Go to Payslips</button></div>
  <p class="muted">On Payslips, select the employee (matched by email) and month, then click Load Daily Record.</p></div></div>`;
  refreshDerived(norm);
  const q=id=>c.querySelector("#"+id);
  q("sdrMonth").onchange=e=>{st.month=e.target.value||londonMonth();paint()};
  q("sdrRefresh").onclick=()=>load(c);
  q("sdrTaxOn").onchange=e=>{st.taxOn=e.target.checked;if(st.taxOn&&String(st.taxPct??"").trim()==="")st.taxPct="20";persist();paint()};
  q("sdrTax").oninput=e=>{st.taxPct=e.target.value;persist();refreshDerived()};
  q("sdrGoPayslips").onclick=()=>{window.staffPayslipSelection=null;go("hrPayslips")};
  if(!can)return;
  q("sdrAdd").onclick=()=>{const last=st.rows[st.rows.length-1];st.rows.push(newRow(last&&{date:last.date}));persist();paint();const k=st.rows[st.rows.length-1].key;c.querySelector(`[data-k="${k}"][data-f="staff"]`)?.focus()};
  q("sdrSave").onclick=save;
  if(q("sdrDiscard"))q("sdrDiscard").onclick=()=>{if(!confirm("Discard this entire unsaved draft batch? Any payments already saved on the server will remain. Refresh and check saved records before entering them again."))return;st.rows=[];st.newIds={};st.batchId=null;st.error="";st.notice="Draft batch discarded. Saved records have not been changed.";persist();load(c)};
  const grid=q("sdrGrid");
  grid.addEventListener("input",onCell);
  grid.addEventListener("change",onCell);
  grid.addEventListener("click",e=>{const k=e.target.closest("[data-del]")?.dataset.del;if(!k)return;const r=st.rows.find(x=>x.key===k);if(!blank(r)&&!confirm("Remove this unsaved row?"))return;st.rows=st.rows.filter(x=>x.key!==k);persist();paint()});
  grid.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches("input")){e.preventDefault();const last=e.target.closest("tr").dataset.row===st.rows[st.rows.length-1]?.key;if(last)q("sdrAdd").click();else{const f=e.target.dataset.f,i=st.rows.findIndex(x=>x.key===e.target.dataset.k);c.querySelector(`[data-k="${st.rows[i+1].key}"][data-f="${f}"]`)?.focus()}}});
}
function onCell(e){
  const el=e.target,k=el.dataset.k,f=el.dataset.f;if(!k||!f)return;
  const r=st.rows.find(x=>x.key===k);if(!r)return;
  if(f==="staff"){if(e.type!=="change")return;const pr=(st.data.people||[]).find(x=>x.id===el.value);
    if(pr)Object.assign(r,{personId:pr.id,name:pr.name,email:pr.email||"",basis:pr.pay_basis,rate:String(pr.rate??"")});else Object.assign(r,{personId:"",name:"",email:"",rate:""});
    if(r.basis==="monthly")r.work="";persist();paint();host.querySelector(`[data-k="${k}"][data-f="name"]`)?.focus();return}
  r[f]=el.value;persist();
  if(f==="basis"&&e.type==="change"){if(el.value==="monthly")r.work="";persist();paint();host.querySelector(`[data-k="${k}"][data-f="basis"]`)?.focus();return}
  refreshDerived();
}
/* Update totals, row totals and validation markers without re-rendering inputs (keeps focus). */
function refreshDerived(norm){
  if(!host)return;norm=norm||normAll();const d=st.data;
  norm.forEach(({row,errors},i)=>{const key=st.rows[i].key;
    const tot=host.querySelector(`[data-tot="${key}"]`);if(tot){const v=(row.pay_basis==="daily"?row.work:0)+row.overtime+row.expense-row.advance-row.payment;tot.textContent=money(v)}
    host.querySelectorAll(`[data-k="${key}"]`).forEach(el=>{const m=errors[el.dataset.f];if(m){el.setAttribute("aria-invalid","true");el.title=m}else{el.removeAttribute("aria-invalid");el.removeAttribute("title")}});
    const er=host.querySelector(`[data-err="${key}"]`);if(er){const msgs=Object.entries(errors).map(([f,m])=>f+": "+m);er.hidden=!msgs.length;er.querySelector(".rowErr").textContent=msgs.length?"Row "+(i+1)+" — "+msgs.join(" · "):""}
  });
  const taxValue=parseAmt(st.taxPct),taxValid=!st.taxOn||(String(st.taxPct??"").trim()!==""&&Number.isFinite(taxValue)&&taxValue>=0&&taxValue<=100);
  const taxInput=host.querySelector("#sdrTax");
  if(taxInput){if(taxValid)taxInput.removeAttribute("aria-invalid");else taxInput.setAttribute("aria-invalid","true")}
  const t=sheetTotals(d.people,d.entries,d.finalized,norm,st.month,st.taxOn?taxValue:0),box=host.querySelector("#sdrTotals");
  if(!box)return;
  if(!taxValid){box.innerHTML='<p role="alert" class="sdrErr">Enter an optional tax percentage between 0 and 100 to calculate the payable total.</p>';return}
  box.innerHTML=t.groups.length?`<table class="sdrGrid totals"><thead><tr><th>Name</th><th>Month</th><th>Basis</th><th class="num">Wages</th><th class="num">Overtime</th><th class="num">Expenses</th><th class="num">Advances + paid</th>${t.taxPct?`<th class="num">Tax ${t.taxPct}%</th>`:""}<th class="num">Payable</th></tr></thead><tbody>
  ${t.groups.map((g,i)=>`<tr class="${g.drafts?"hasDraft":""}" data-testid="row-total-${i}"><td>${esc(g.name)}${g.drafts?` <span class="sdrPill draft">+${g.drafts} unsaved</span>`:""}${g.fin?` <span class="sdrPill">payslip ${esc(g.fin.paymentStatus||"Unpaid")}</span>`:""}</td><td>${esc(g.month)}</td><td>${g.basis==="monthly"?"Monthly (once)":"Daily"}</td><td class="num">${money(g.wages)}</td><td class="num">${money(g.overtime)}</td><td class="num">${money(g.expense)}</td><td class="num">${money(-g.deductions)}</td>${t.taxPct?`<td class="num">${money(-g.tax)}</td>`:""}<td class="num pay ${g.balance<0?"neg":""}" data-testid="text-payable-${i}">${money(g.balance)}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td colspan="${t.taxPct?8:7}">Saved payable</td><td class="num" data-testid="text-saved-total">${money(t.grandSaved)}</td></tr>
  <tr class="draftFoot"><td colspan="${t.taxPct?8:7}">Unsaved rows change</td><td class="num">${money(t.unsaved)}</td></tr>
  <tr class="grand"><td colspan="${t.taxPct?8:7}">Total payable${st.rows.length?" (including unsaved preview)":""}</td><td class="num ${t.grand<0?"neg":""}" data-testid="text-grand-total">${money(t.grand)}</td></tr></tfoot></table>`
  :'<p class="sdrEmpty">Nothing payable yet for this month.</p>';
  const cnt=host.querySelector("#sdrCount");if(cnt)cnt.textContent=st.rows.length;
}

async function save(){
  if(st.saving)return;
  const actor=actorId();
  if(actor!==st.actor){st.error="Your sign-in changed. Reload this page before saving.";return paint()}
  st.rows=st.rows.filter(r=>!blank(r));
  if(!st.rows.length){st.error="Nothing to save.";persist();return paint()}
  if(st.rows.length>100){st.error="Save at most 100 rows at a time.";return paint()}
  const norm=normAll(),bad=norm.findIndex(n=>Object.keys(n.errors).length);
  if(bad>=0){st.error="Fix row "+(bad+1)+" before saving. Nothing was saved.";paint();host.querySelector(`[data-k="${st.rows[bad].key}"][aria-invalid]`)?.focus();return}
  const payload=buildPayload(st.rows,norm,st.newIds);st.batchId=st.batchId||uuid();const batch=st.batchId;persist();
  st.saving=true;st.error="";st.notice="";paint();
  try{
    const d=await rpc("save_staff_daily_sheet",{p_rows:payload,p_batch_id:batch});
    if(actorId()!==actor){st.saving=false;st.error="Your sign-in changed; the result was not shown.";return paint()}
    st.data=d;const n=st.rows.length;st.rows=[];st.newIds={};st.batchId=null;persist();st.notice=n+" row"+(n===1?"":"s")+" saved.";
    if(d.finances&&typeof mergePayrollFinances==="function")mergePayrollFinances(d.finances);
  }catch(e){if(actorId()!==actor)return;
    if(/already completed/i.test(e.message||"")){st.saving=false;st.error="This save batch was already completed with different values. Saved records were refreshed below; compare them with your unsaved rows and remove any already saved before saving again. "+e.message;persist();if(host?.isConnected)load(host);return}
    st.error=(e.setup?"Setup needed: run supabase/staff-daily-spreadsheet.sql. ":"")+"Not saved — your rows are kept: "+e.message}
  st.saving=false;if(host?.isConnected)paint();
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
window.StaffDailyRecord={draw,useOnPayslip,preparePayslip,payslipPerson,createPayslip,summary,londonMonth,londonDate,normalizeRow,crossCheck,sheetTotals,buildPayload,parseAmt};
})();
