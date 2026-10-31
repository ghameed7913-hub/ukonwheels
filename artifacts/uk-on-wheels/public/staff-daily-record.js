(function(){
"use strict";
const KINDS=["work","overtime","expense","advance","payment","bonus","fuel"];
const LABEL={work:"Normal pay",overtime:"Overtime",expense:"Expense owed to employee",advance:"Advance paid",payment:"Payment made",bonus:"Bonus",fuel:"Fuel"};
const st={rows:null,newIds:{},taxOn:false,batchId:null,notice:"",data:null,roster:null,month:null,date:null,saving:false,error:"",loadError:"",actor:null,req:0};
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
  const work=sum("work"),overtime=sum("overtime"),expense=sum("expense"),advance=sum("advance"),payment=sum("payment"),bonus=sum("bonus"),fuel=sum("fuel");
  const wages=monthly?p(person.rate):work;
  /* Tax base stays wages + overtime only; bonus and fuel are added untaxed in this estimate. */
  const taxable=wages+overtime,beforeTax=taxable+expense+bonus+fuel-advance-payment;
  const pct=Number(taxPct)>0?Math.min(100,Number(taxPct)):0,tax=Math.round(taxable*pct/100);
  const c=x=>x/100;
  return {count:rows.length,monthly,wages:c(wages),work:c(work),overtime:c(overtime),expense:c(expense),bonus:c(bonus),fuel:c(fuel),advance:c(advance),payment:c(payment),deductions:c(advance+payment),taxable:c(taxable),noTaxBalance:c(beforeTax),taxPct:pct,tax:c(tax),balance:c(beforeTax-tax)};
}

async function rpc(name,args){
  if(typeof sb==="undefined"||!sb?.rpc)throw Object.assign(Error("Supabase is not connected."),{setup:true});
  const {data,error}=await sb.rpc(name,args);
  if(error){const m=error.message||"Request failed.";const e=Error(m);if(/function|does not exist|PGRST202|schema cache/i.test(m+(error.code||"")))e.setup=true;throw e}
  if(["read_staff_daily_records","save_staff_pay_person","add_staff_daily_entry","save_staff_daily_sheet"].includes(name)&&
    (!data||!Array.isArray(data.people)||!Array.isArray(data.entries)||!Array.isArray(data.finalized)))throw Error("The saved staff record could not be confirmed. Refresh before retrying.");
  if(name==="read_staff_pay_roster"&&(!data||!Array.isArray(data.employees)))throw Error("The staff roster (Users and HR) could not be read. The sheet is not shown so no employee is silently missing.");
  return data||{};
}
function finalizedFor(id,month){return (st.data?.finalized||[]).find(f=>f.staff_id===id&&f.month===month)}
function setupHtml(msg){return `<div class="panel sdr"><h2>Staff pay sheet: setup needed</h2><p>${esc(msg)}</p><p class="muted">Run <b>supabase/staff-simple-sheet.sql</b> in the Supabase SQL editor after the earlier staff-record setup, then retry. No sample data is shown.</p><button class="btn secondary" id="sdrRetry">Retry</button></div>`}

(function css(){try{if(document.getElementById("sdrCss"))return;const s=document.currentScript?.src||"./staff-daily-record.js";const l=document.createElement("link");l.id="sdrCss";l.rel="stylesheet";l.href=new URL("staff-daily-record.css",s).href;document.head.append(l)}catch(e){}})();

/* ---------- pure sheet helpers ---------- */
const AMTS=["work","overtime","expense","advance","payment","bonus","fuel"];
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
  if(!person&&email&&!EMAIL.test(email))e.email="Email is optional, but if given it must be valid";
  if(person&&!r.personId&&(String(r.name||"").trim()&&String(r.name).trim()!==person.name||(r.basis&&r.basis!==person.pay_basis)||(String(r.rate||"").trim()!==""&&Number(r.rate)!==Number(person.rate))))e.email="Email belongs to saved "+person.name+" ("+person.pay_basis+" "+Number(person.rate).toFixed(2)+"); saved pay terms cannot change here";
  if(!person&&(String(r.rate??"").trim()===""||!Number.isFinite(rate)||rate<0||rate>9999999999.99||Math.abs(rate*100-Math.round(rate*100))>0.00001))e.rate="Rate of 0 or more, up to 2 decimal places";
  const dateValue=/^\d{4}-\d{2}-\d{2}$/.test(r.date||"")?new Date(r.date+"T00:00:00Z"):null;
  if(!dateValue||isNaN(dateValue.getTime())||dateValue.toISOString().slice(0,10)!==r.date||r.date<"2000-01-01"||r.date>"2100-12-31")e.date="Valid date between 2000 and 2100";
  if(String(r.notes||"").length>2000)e.notes="Notes must be 2000 characters or fewer";
  const out={};
  for(const k of AMTS){const n=parseAmt(r[k]);if(!Number.isFinite(n)||n<0||n>9999999999.99||Math.abs(n*100-Math.round(n*100))>0.00001)e[k]="0 or more, up to 2 decimal places";out[k]=Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0}
  if(basis==="monthly"&&out.work>0)e.work="Monthly salary is counted once; leave blank";
  const rosterUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.rosterId||"")?r.rosterId:null;
  const pid=person?person.id:((newIds?newIds[email||r.key]:null)||rosterUuid);
  if(person&&r.date&&(finalized||[]).some(f=>f.staff_id===person.id&&f.month===String(r.date).slice(0,7)))e.date="Payslip closes "+String(r.date).slice(0,7);
  return {row:{key:r.key,person_id:pid,existing:!!person,name,email:person?String(person.email||"").toLowerCase():email,pay_basis:basis,rate:Number.isFinite(rate)?rate:0,date:r.date||"",...out,notes:String(r.notes||"").trim()},errors:e};
}
/* New people repeated across drafts must share terms. Mutates errors map. */
function crossCheck(norm){
  const seen={};
  norm.forEach(({row,errors})=>{if(row.existing||!row.email)return;/* blank emails never match each other */const t=seen[row.email];
    if(!t)seen[row.email]=row;else if(t.name!==row.name||t.pay_basis!==row.pay_basis||t.rate!==row.rate)errors.email="Same email as another draft row but different name/basis/rate"});
  return norm;
}
/* Per person-month totals, saved + draft. Amounts in pounds. */
function sheetTotals(people,entries,finalized,normRows,month,taxPct){
  const g=new Map(),pct=Number(taxPct)>0?Math.min(100,Number(taxPct)):0;
  const get=(key,info,m)=>{const k=key+"|"+m;if(!g.has(k))g.set(k,{key:k,pid:info.id||null,name:info.name,email:info.email,basis:info.pay_basis,rate:Number(info.rate)||0,month:m,saved:null,fin:null,d:{wages:0,overtime:0,expense:0,advance:0,payment:0,bonus:0,fuel:0},drafts:0});return g.get(k)};
  for(const pr of people||[]){const has=(entries||[]).some(e=>e.staff_id===pr.id&&String(e.entry_date).slice(0,7)===month);if(has||pr.pay_basis==="monthly")get(pr.id,pr,month)}
  for(const {row} of normRows||[]){if(!row.date||!row.name)continue;const m=row.date.slice(0,7);if(m!==month)continue;
    const pr=row.existing?(people||[]).find(x=>x.id===row.person_id):null;
    const t=get(pr?pr.id:(row.email||"k:"+row.key),pr||{id:row.person_id,name:row.name,email:row.email,pay_basis:row.pay_basis,rate:row.rate},m);
    t.drafts++;t.d.wages+=row.pay_basis==="daily"?p(row.work):0;for(const k of ["overtime","expense","advance","payment","bonus","fuel"])t.d[k]+=p(row[k]||0)}
  let grand=0,grandSaved=0;const list=[];
  for(const t of g.values()){
    const pr=t.pid?(people||[]).find(x=>x.id===t.pid):null;
    const s=pr?summary(pr,entries,t.month,0):null;t.saved=s;
    t.fin=pr?(finalized||[]).find(f=>f.staff_id===pr.id&&f.month===t.month):null;
    const sw=s?p(s.wages):0,so=s?p(s.overtime):0,se=s?p(s.expense):0,sd=s?p(s.deductions):0,sb_=s?p(s.bonus):0,sf=s?p(s.fuel):0;
    const newMonthly=!pr&&t.basis==="monthly"?p(t.rate):0;
    const wages=sw+t.d.wages+newMonthly,ot=so+t.d.overtime,exp=se+t.d.expense,ded=sd+t.d.advance+t.d.payment,bon=sb_+t.d.bonus,fuel=sf+t.d.fuel;
    const taxable=wages+ot,tax=Math.round(taxable*pct/100);
    const savedOnly=s?p(s.noTaxBalance)-Math.round((sw+so)*pct/100):0;
    let bal=taxable+exp+bon+fuel-ded-tax;let savedBal=savedOnly;
    if(t.fin){bal=t.fin.paymentStatus==="Paid"?0:p(t.fin.net||0);savedBal=bal}
    Object.assign(t,{wages:wages/100,overtime:ot/100,expense:exp/100,bonus:bon/100,fuel:fuel/100,deductions:ded/100,tax:tax/100,balance:bal/100,savedBalance:savedBal/100});
    grand+=bal;grandSaved+=savedBal;list.push(t);
  }
  list.sort((a,b)=>a.name.localeCompare(b.name)||a.month.localeCompare(b.month));
  return {groups:list,grand:grand/100,grandSaved:grandSaved/100,unsaved:(grand-grandSaved)/100,taxPct:pct};
}
function sigOf(r){return JSON.stringify([r.person_id,r.name,r.email,r.pay_basis,r.rate,r.date,r.work,r.overtime,r.expense,r.advance,r.payment,r.bonus||0,r.fuel||0,r.notes])}
/* Builds RPC rows; assigns stable IDs (mutates drafts' ids/sig only when content changed). */
function buildPayload(drafts,norm,newIds,mkId){
  mkId=mkId||uuid;
  return norm.map(({row},i)=>{
    const d=drafts[i];
    const nk=row.email||row.key;if(!row.person_id){newIds[nk]=newIds[nk]||mkId();row.person_id=newIds[nk]}
    const sig=sigOf(row);
    if(!d.ids||d.sig!==sig||AMTS.some(k=>!d.ids[k])){d.ids={};AMTS.forEach(k=>d.ids[k]=mkId());d.sig=sig}
    return {person_id:row.person_id,name:row.name,email:row.email||null,pay_basis:row.pay_basis,rate:row.rate,date:row.date,work:row.work,overtime:row.overtime,expense:row.expense,advance:row.advance,payment:row.payment,bonus:row.bonus||0,fuel:row.fuel||0,notes:row.notes,entry_ids:{...d.ids}};
  });
}
function blank(r){return !r.personId&&!String(r.name||"").trim()&&!String(r.email||"").trim()&&AMTS.every(k=>String(r[k]??"").trim()==="")&&!String(r.notes||"").trim()}
/* A row is a real change only if the user typed something. Roster names alone never count. */
function meaningful(r){if(!r)return false;if(r.auto)return AMTS.some(k=>String(r[k]??"").trim()!=="")||!!String(r.notes||"").trim();return !blank(r)}
let seq=0;
function rowKey(){return "r"+Date.now().toString(36)+(seq++)}
function employeeRole(person){
  const role=String(person?.role||"").trim(),detail=String(person?.roleLabel||person?.staffRole||"").trim();
  if(/^(admin|super[ _-]?admin)$/i.test(role))return "Admin";
  if(/^driver$/i.test(role))return "Driver";
  const label=detail||role;
  if(!label)return "Not assigned";
  if(/^(hr|human resources)$/i.test(label))return "HR";
  if(/^staff$/i.test(label))return "Other Staff";
  if(/^unassigned$/i.test(label))return "Unassigned";
  return label;
}
/* Pure: merges roster employees + ledger people into sheet rows, one row each, no duplicates.
   Keeps existing rows (typed values), refreshes identity of auto rows, auto rows sorted by name then manual rows. */
function mergeRoster(rows,roster,people,mkKey){
  mkKey=mkKey||rowKey;
  const ppl=people||[],lc=v=>String(v||"").trim().toLowerCase();
  const byId=new Map(ppl.map(x=>[x.id,x])),byEmail=new Map();ppl.forEach(x=>{if(lc(x.email)&&!byEmail.has(lc(x.email)))byEmail.set(lc(x.email),x)});
  const out=(rows||[]).map(r=>({...r}));
  const has=(pid,email,rid)=>out.find(r=>(pid&&r.personId===pid)||(rid&&r.rosterId===rid)||(email&&lc(r.email)===email));
  for(const r of out){if(!r.auto||r.personId)continue;const m=byEmail.get(lc(r.email))||(r.rosterId&&byId.get(r.rosterId));if(m){r.personId=m.id;r.name=m.name;r.email=m.email||r.email;r.basis=m.pay_basis;r.rate=String(m.rate??"0")}}
  for(const e of roster||[]){
    if(!e||/^client$/i.test(String(e.role||"")))continue;
    const email=lc(e.email),led=byId.get(e.id)||(email&&byEmail.get(email))||null;
    const ex=has(led?.id,email||lc(led?.email),e.id);
    if(ex){if(ex.auto&&!ex.rosterId)ex.rosterId=e.id;ex.role=e.role||"";ex.roleLabel=e.roleLabel||e.staffRole||"";continue}
    out.push(led?{key:mkKey(),auto:true,rosterId:e.id,personId:led.id,name:led.name,email:led.email||"",basis:led.pay_basis,rate:String(led.rate??"0"),role:e.role||"",roleLabel:e.roleLabel||e.staffRole||"",source:e.source||""}
      :{key:mkKey(),auto:true,rosterId:e.id,personId:"",name:String(e.name||e.email||"Unnamed").trim(),email:email,basis:"daily",rate:"0",role:e.role||"",roleLabel:e.roleLabel||e.staffRole||"",source:e.source||""});
  }
  for(const x of ppl){if(has(x.id,lc(x.email)))continue;out.push({key:mkKey(),auto:true,personId:x.id,name:x.name,email:x.email||"",basis:x.pay_basis,rate:String(x.rate??"0"),source:"Ledger"})}
  for(const r of out)for(const k of AMTS)if(r[k]==null)r[k]="";
  const autos=out.filter(r=>r.auto).sort((a,b)=>String(a.name).localeCompare(String(b.name))),man=out.filter(r=>!r.auto);
  return autos.concat(man);
}

/* ---------- draft persistence (actor scoped; prior-version drafts kept as dated pending rows) ---------- */
function dkey(){return "ukowSdrDrafts:"+(actorId()||"anon")}
function loadDrafts(){try{const j=JSON.parse(localStorage.getItem(dkey())||"null");
  st.rows=(Array.isArray(j?.rows)?j.rows:[]).map(r=>j?.v===2?r:{...r,auto:!!r.personId,dateOwn:true});
  st.newIds=j?.newIds||{};st.taxOn=!!j?.taxOn;st.batchId=j?.batchId||null;st.taxPct=j?.taxPct||"";if(j?.date)st.date=j.date}
  catch(e){st.rows=[];st.newIds={};st.batchId=null}}
function persist(){try{const rows=(st.rows||[]).filter(r=>!r.auto||meaningful(r)||r.ids);
  if(rows.length||st.taxOn||st.batchId)localStorage.setItem(dkey(),JSON.stringify({v:2,rows,newIds:st.newIds,taxOn:st.taxOn,taxPct:st.taxPct,batchId:st.batchId,date:st.date}));else localStorage.removeItem(dkey())}catch(e){}}
let unloadBound=false;
function bindUnload(){if(unloadBound)return;unloadBound=true;window.addEventListener("beforeunload",ev=>{if(st.rows&&st.rows.some(meaningful)){ev.preventDefault();ev.returnValue=""}})}
function defaultDate(m){return m===londonMonth()?londonDate():m+"-01"}
function rowDate(r){return r.dateOwn&&r.date?r.date:st.date}
function newManual(){return {key:rowKey(),auto:false,personId:"",name:"",email:"",basis:"daily",rate:"0",work:"",overtime:"",expense:"",advance:"",payment:"",bonus:"",fuel:"",notes:""}}

let host=null;
function load(c){
  host=c;const r=++st.req,actor=actorId();st.actor=actor;st.loadError="";
  if(!st.data)c.innerHTML='<div class="sdr"><div class="panel"><div class="sdrSkel"></div><div class="sdrSkel"></div><div class="sdrSkel"></div><div class="sdrSkel short"></div></div></div>';
  Promise.all([rpc("read_staff_daily_records",{}),rpc("read_staff_pay_roster",{})]).then(([d,ro])=>{
    if(r!==st.req||actorId()!==actor||!c.isConnected||!active())return;
    st.data=d;st.roster=ro.employees;st.rows=mergeRoster(st.rows,st.roster,d.people);
    if(d.finances&&typeof mergePayrollFinances==="function")mergePayrollFinances(d.finances);paint();
  }).catch(e=>{
    if(r!==st.req||actorId()!==actor||!c.isConnected||!active())return;
    c.innerHTML=e.setup?setupHtml(e.message):`<div class="panel sdr"><h2>Staff pay sheet could not load</h2><p role="alert" class="sdrErr" data-testid="status-load-error">${esc(e.message)}</p><p class="muted">Your typed amounts are kept on this device.</p><button class="btn secondary" id="sdrRetry" data-testid="button-retry">Retry</button></div>`;
    c.querySelector("#sdrRetry").onclick=()=>load(c);
  });
}
function draw(c){
  if(st.actor!==actorId()||!st.rows){st.data=null;st.roster=null;st.error="";st.saving=false;st.notice="";st.date=null;loadDrafts()}
  bindUnload();st.date=st.date||defaultDate(st.month||londonMonth());st.month=st.date.slice(0,7);load(c);
}

function normRows(rows){const d=st.data||{};return crossCheck(rows.map(r=>normalizeRow({...r,date:rowDate(r)},d.people,d.finalized,st.newIds)))}
const COLS=[["work","Normal pay / Salary £"],["expense","Expenses £"],["overtime","Overtime £"],["bonus","Bonus £"],["fuel","Fuel £"],["advance","Advances £"],["payment","Paid £"]];
const LEDGERED=r=>{const pr=r.personId&&(st.data?.people||[]).find(x=>x.id===r.personId);return pr||null};

function identityCell(r,i,can){
  const pr=LEDGERED(r),dis=!can||st.saving?" disabled":"";
  const att=f=>` data-k="${esc(r.key)}" data-f="${f}" id="sdr-${esc(r.key)}-${f}"`;
  const fin=pr&&finalizedFor(pr.id,st.month);
  const tags=[];
  if(!r.auto)tags.push('<span class="sdrTag new">new</span>');
  if(fin)tags.push(`<span class="sdrTag lock">payslip ${esc(fin.paymentStatus||"issued")}</span>`);
  if(r.dateOwn&&r.date&&r.date!==st.date)tags.push(`<button class="sdrTag old" data-redate="${esc(r.key)}" title="Earlier draft dated ${esc(r.date)}. Click to move it to the sheet date." data-testid="button-redate-${i}">dated ${esc(r.date)}</button>`);
  const needEmail=!pr&&!(r.auto&&EMAIL.test(String(r.email||"")));
  const name=r.auto?`<span class="sdrName" data-testid="text-name-${i}">${esc(r.name)}</span>`
    :`<input class="sdrNameIn" type="text" maxlength="120" placeholder="Employee name"${att("name")} aria-label="Row ${i+1} name" value="${esc(r.name)}"${dis} data-testid="input-name-${i}">`;
  const email=needEmail?`<input class="sdrEmail" type="email" placeholder="optional"${att("email")} aria-label="Row ${i+1} email" value="${esc(r.email)}"${dis} data-testid="input-email-${i}">`:"";
  const basis=pr?`${pr.pay_basis==="monthly"?"Monthly salary":"Daily / manual"} · rate ${money(pr.rate)} (saved)`:"";
  const terms=pr?`<p>${esc(basis)}</p>${pr.email?`<p>${esc(pr.email)}</p>`:"<p>No email: not linked to Payslips</p>"}`
    :`<label>Pay basis <select${att("basis")}${dis} data-testid="select-basis-${i}"><option value="daily" ${r.basis!=="monthly"?"selected":""}>Daily / manual</option><option value="monthly" ${r.basis==="monthly"?"selected":""}>Monthly salary</option></select></label>
      <label>Rate £ <input class="num" inputmode="decimal"${att("rate")} value="${esc(r.rate)}"${dis} data-testid="input-rate-${i}"></label>${r.auto&&r.email?`<p>${esc(r.email)}</p>`:""}`;
  return `<div class="sdrId">${name}${tags.join("")}${!r.auto?`<button class="sdrX" data-del="${esc(r.key)}" aria-label="Remove row ${i+1}"${st.saving?" disabled":""} data-testid="button-remove-row-${i}">remove</button>`:""}</div>
  <details class="sdrMeta"><summary data-testid="toggle-details-${i}">details</summary>${email?`<label>Email (optional, links payslip) ${email}</label>`:""}${terms}${r.source?`<p>From ${esc(r.source)}${r.role?" · "+esc(r.role):""}</p>`:""}
  <label>Note <input type="text"${att("notes")} value="${esc(r.notes||"")}"${dis} data-testid="input-notes-${i}"></label></details>`;
}
function amtCell(r,i,f,can){
  const pr=LEDGERED(r),monthly=(pr?pr.pay_basis:r.basis)==="monthly";
  const fin=pr&&finalizedFor(pr.id,st.month);
  if(f==="work"&&monthly)return `<td class="sdrSal" data-testid="text-salary-${i}"><span>${money(pr?pr.rate:parseAmt(r.rate)||0)}</span><small>salary, once a month</small></td>`;
  const dis=!can||st.saving||fin?" disabled":"";
  return `<td><input type="text" inputmode="decimal" class="num" placeholder="0.00" data-k="${esc(r.key)}" data-f="${f}" id="sdr-${esc(r.key)}-${f}" aria-label="Row ${i+1} ${esc(LABEL[f])}" value="${esc(r[f]??"")}"${dis} data-testid="input-${f}-${i}"></td>`;
}

function paint(){
  const c=host;if(!c||!st.data||!active())return;
  const d=st.data,people=d.people||[],can=!!d.canManage,month=st.month;
  const savedRows=(d.entries||[]).filter(e=>String(e.entry_date).slice(0,7)===month).sort((a,b)=>String(a.entry_date).localeCompare(String(b.entry_date)));
  const byId=Object.fromEntries(people.map(x=>[x.id,x]));
  const rows=st.rows;
  c.innerHTML=`<div class="sdr">
  <header class="sdrHead"><div><h2>Staff Pay Sheet</h2>
  <p class="muted">Type amounts for everyone below and press <b>Save</b>. Every employee from Users and HR is listed automatically. Saved amounts are history and are added to each person's total.</p>
  ${can?"":'<p class="badge" data-testid="status-readonly">View only. Accounts management permission is required to add amounts.</p>'}</div>
  <div class="sdrTools"><label>Month <input id="sdrMonth" type="month" value="${esc(month)}" data-testid="input-month"></label>
  <label>Entry date <input id="sdrDate" type="date" value="${esc(st.date)}" data-testid="input-entry-date"></label>
  <label class="sdrTax"><input type="checkbox" id="sdrTaxOn" ${st.taxOn?"checked":""} data-testid="toggle-tax"> Tax</label>
  <label class="sdrTax" ${st.taxOn?"":"hidden"}><input id="sdrTax" class="num" inputmode="decimal" value="${esc(st.taxPct||"")}" style="width:52px" data-testid="input-tax">% on pay + overtime</label>
  <button class="btn secondary" id="sdrRefresh" ${st.saving?"disabled":""} data-testid="button-refresh">Refresh</button></div></header>
  ${st.error?`<p role="alert" class="sdrErr" data-testid="status-error">${esc(st.error)}</p>`:""}
  ${st.notice?`<p role="status" class="sdrOk" data-testid="status-notice">${esc(st.notice)}</p>`:""}
  <div class="panel sdrSheetPanel">
  <div class="sdrScroll"><table class="sdrGrid" id="sdrGrid"><thead><tr><th class="idx">#</th><th>Name</th><th>Role</th>${COLS.map(([,l])=>`<th class="num">${l}</th>`).join("")}<th class="num">Total payable</th></tr></thead>
  <tbody>${rows.map((r,i)=>`<tr class="${r.auto?"auto":"manual"}" data-row="${esc(r.key)}" data-testid="row-sheet-${i}"><td class="idx">${i+1}</td><td class="sdrIdCell">${identityCell(r,i,can)}</td><td class="sdrRole" data-testid="text-role-${i}">${esc(employeeRole(r))}</td>${COLS.map(([f])=>amtCell(r,i,f,can)).join("")}<td class="num sdrTot" data-tot="${esc(r.key)}" data-testid="text-payable-${i}"></td></tr><tr class="errRow" data-err="${esc(r.key)}" hidden><td></td><td colspan="${COLS.length+3}" class="rowErr" role="status"></td></tr>`).join("")}
  ${rows.length?"":`<tr><td colspan="${COLS.length+4}" class="sdrEmpty">No employees yet. Add users in Create User or HR, or press Add employee.</td></tr>`}</tbody>
  <tfoot id="sdrFoot"></tfoot></table></div>
  <div class="sdrBar">${can?`<button class="btn secondary" id="sdrAdd" ${st.saving?"disabled":""} data-testid="button-add-employee">+ Add employee</button>`:"<span></span>"}
  <div class="sdrBtns"><span class="sdrCount" id="sdrCount"></span>${can&&st.batchId?`<button class="btn secondary" id="sdrDiscard" ${st.saving?"disabled":""} data-testid="button-discard">Discard unsaved</button>`:""}
  ${can?`<button class="btn primary" id="sdrSave" ${st.saving?"disabled":""} data-testid="button-save-rows">${st.saving?"Saving…":"Save"}</button>`:""}</div></div>
  <p class="muted sdrHint">Total payable = pay + expenses + overtime + bonus + fuel − advances − paid${st.taxOn?" − tax (on pay + overtime only)":""}. Each total includes saved ${esc(month)} amounts plus what you type now. Saved amounts cannot be edited here. Paid only reduces what is due; no money is sent.</p>
  </div>
  <details class="panel sdrHist"><summary data-testid="toggle-history">Saved history, ${esc(month)} <span class="sdrPill">${savedRows.length} entr${savedRows.length===1?"y":"ies"}, read-only</span></summary>
  <div class="sdrScroll"><table class="sdrGrid saved"><thead><tr><th>Date</th><th>Name</th><th>Kind</th><th class="num">Amount</th><th>Notes</th></tr></thead><tbody>
  ${savedRows.length?savedRows.map((e,i)=>`<tr data-testid="row-saved-${i}"><td>${esc(e.entry_date)}</td><td>${esc(byId[e.staff_id]?.name||"Unknown")}</td><td>${esc(LABEL[e.kind]||e.kind)}</td><td class="num">${money(e.amount)}</td><td>${esc(e.notes||"")}</td></tr>`).join(""):`<tr><td colspan="5" class="sdrEmpty">Nothing saved for ${esc(month)} yet.</td></tr>`}</tbody></table></div>
  <div class="actions"><button class="btn secondary" id="sdrGoPayslips" data-testid="button-payslips">Go to Payslips</button></div>
  <p class="muted">On Payslips, select the employee (matched by email) and month, then click Load Daily Record.</p></details></div>`;
  refreshDerived();
  const q=id=>c.querySelector("#"+id);
  q("sdrMonth").onchange=e=>{const m=e.target.value||londonMonth();st.month=m;st.date=defaultDate(m);persist();paint()};
  q("sdrDate").onchange=e=>{const v=e.target.value;if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return;st.date=v;st.month=v.slice(0,7);persist();paint()};
  q("sdrRefresh").onclick=()=>load(c);
  q("sdrTaxOn").onchange=e=>{st.taxOn=e.target.checked;if(st.taxOn&&String(st.taxPct??"").trim()==="")st.taxPct="20";persist();paint()};
  q("sdrTax").oninput=e=>{st.taxPct=e.target.value;persist();refreshDerived()};
  q("sdrGoPayslips").onclick=()=>{window.staffPayslipSelection=null;go("hrPayslips")};
  if(!can)return;
  q("sdrAdd").onclick=()=>{st.rows.push(newManual());persist();paint();const k=st.rows[st.rows.length-1].key;c.querySelector(`[data-k="${k}"][data-f="name"]`)?.focus()};
  q("sdrSave").onclick=save;
  if(q("sdrDiscard"))q("sdrDiscard").onclick=()=>{if(!confirm("Discard all unsaved amounts and new employees? Anything already saved on the server stays. Refresh and check saved history before typing again."))return;st.rows=[];st.newIds={};st.batchId=null;st.error="";st.notice="Unsaved amounts discarded. Saved records have not been changed.";persist();load(c)};
  const grid=q("sdrGrid");
  grid.addEventListener("input",onCell);
  grid.addEventListener("change",onCell);
  grid.addEventListener("click",e=>{
    const rd=e.target.closest("[data-redate]")?.dataset.redate;if(rd){const r=st.rows.find(x=>x.key===rd);if(r){r.dateOwn=false;persist();paint()}return}
    const k=e.target.closest("[data-del]")?.dataset.del;if(!k)return;const r=st.rows.find(x=>x.key===k);if(!blank(r)&&!confirm("Remove this unsaved employee row?"))return;st.rows=st.rows.filter(x=>x.key!==k);persist();paint()});
  grid.addEventListener("keydown",e=>{if(e.key!=="Enter"||!e.target.matches("input"))return;e.preventDefault();const f=e.target.dataset.f,i=st.rows.findIndex(x=>x.key===e.target.dataset.k);
    for(let j=i+1;j<st.rows.length;j++){const el=c.querySelector(`[data-k="${st.rows[j].key}"][data-f="${f}"]:not([disabled])`);if(el){el.focus();el.select?.();return}}});
}
function onCell(e){
  const el=e.target,k=el.dataset.k,f=el.dataset.f;if(!k||!f)return;
  const r=st.rows.find(x=>x.key===k);if(!r)return;
  r[f]=el.value;
  if(f==="basis"&&e.type==="change"){if(el.value==="monthly")r.work="";persist();paint();host.querySelector(`[data-k="${k}"][data-f="basis"]`)?.focus();return}
  persist();refreshDerived();
}
/* Update totals and validation markers without re-rendering inputs (keeps focus). */
function refreshDerived(){
  if(!host)return;const d=st.data;if(!d)return;
  const dirty=st.rows.filter(meaningful),norm=normRows(dirty),errBy=new Map(dirty.map((r,i)=>[r.key,norm[i]]));
  const taxValue=parseAmt(st.taxPct),taxValid=!st.taxOn||(String(st.taxPct??"").trim()!==""&&Number.isFinite(taxValue)&&taxValue>=0&&taxValue<=100);
  const taxInput=host.querySelector("#sdrTax");if(taxInput){if(taxValid)taxInput.removeAttribute("aria-invalid");else taxInput.setAttribute("aria-invalid","true")}
  const t=sheetTotals(d.people,d.entries,d.finalized,norm,st.month,st.taxOn&&taxValid?taxValue:0);
  const used=new Set(),colSum={};COLS.forEach(([f])=>colSum[f]=0);
  st.rows.forEach((r,i)=>{
    const n=errBy.get(r.key),errors=n?n.errors:{};
    host.querySelectorAll(`[data-k="${r.key}"]`).forEach(el=>{const m=errors[el.dataset.f];if(m){el.setAttribute("aria-invalid","true");el.title=m}else{el.removeAttribute("aria-invalid");el.removeAttribute("title")}});
    const er=host.querySelector(`[data-err="${r.key}"]`);if(er){const msgs=Object.entries(errors).map(([f,m])=>(LABEL[f]||f)+": "+m);er.hidden=!msgs.length;er.querySelector(".rowErr").textContent=msgs.length?"Row "+(i+1)+": "+msgs.join(" · "):""}
    const pr=LEDGERED(r),email=String(r.email||"").trim().toLowerCase(),pid=pr?pr.id:(n?.row.person_id||null);
    const g=t.groups.find(x=>!used.has(x)&&((pid&&x.pid===pid)||(!pr&&!x.pid&&x.key.startsWith((email||"k:"+r.key)+"|"))));if(g)used.add(g);
    if(rowDate(r).slice(0,7)===st.month)COLS.forEach(([f])=>{const v=parseAmt(r[f]);if(Number.isFinite(v)&&v>0)colSum[f]+=p(v)});
    const tot=host.querySelector(`[data-tot="${r.key}"]`);
    if(tot){const bal=g?g.balance:0,sv=g?g.savedBalance:0,nw=bal-sv;
      tot.innerHTML=`<b class="${bal<0?"neg":""}">${money(bal)}</b>${(sv||nw)?`<small>saved ${money(sv)}${nw?` <i>${nw>0?"+":"−"} new ${money(Math.abs(nw))}</i>`:""}</small>`:""}`;
      tot.closest("tr").classList.toggle("dirty",meaningful(r))}
  });
  const orphan=t.groups.filter(g=>!used.has(g)).reduce((a,g)=>a+g.balance,0);
  const foot=host.querySelector("#sdrFoot");
  if(foot)foot.innerHTML=!taxValid?`<tr class="grand"><td colspan="${COLS.length+4}" role="alert" class="sdrErr">Enter a tax percentage between 0 and 100 to calculate the total.</td></tr>`
    :`<tr class="newRow"><td></td><td>New amounts typed now</td><td></td>${COLS.map(([f])=>`<td class="num" data-testid="text-new-${f}">${money(colSum[f]/100)}</td>`).join("")}<td class="num" data-testid="text-unsaved-total">${(t.unsaved<0?"− ":"+ ")+money(Math.abs(t.unsaved))}</td></tr>
    <tr class="savedRow"><td></td><td colspan="${COLS.length+2}">Saved ${esc(st.month)} payable${orphan?` (includes ${money(orphan)} from rows dated outside this sheet)`:""}</td><td class="num" data-testid="text-saved-total">${money(t.grandSaved)}</td></tr>
    <tr class="grand"><td></td><td colspan="${COLS.length+2}">Grand total payable, ${esc(st.month)}${t.taxPct?` after ${t.taxPct}% tax`:""}</td><td class="num ${t.grand<0?"neg":""}" data-testid="text-grand-total">${money(t.grand)}</td></tr>`;
  const cnt=host.querySelector("#sdrCount");if(cnt)cnt.textContent=dirty.length?dirty.length+" changed row"+(dirty.length===1?"":"s")+" to save":"No unsaved changes";
}

async function save(){
  if(st.saving)return;
  const actor=actorId();
  if(actor!==st.actor){st.error="Your sign-in changed. Reload this page before saving.";return paint()}
  st.rows=st.rows.filter(r=>r.auto||!blank(r));
  const dirty=st.rows.filter(meaningful);
  if(!dirty.length){st.error="Nothing to save. Type an amount or add an employee first.";persist();return paint()}
  if(dirty.length>100){st.error="Save at most 100 changed rows at a time ("+dirty.length+" changed).";return paint()}
  const norm=normRows(dirty),bad=norm.findIndex(n=>Object.keys(n.errors).length);
  if(bad>=0){const r=dirty[bad];st.error="Fix "+(r.name||"the new employee row")+" before saving. Nothing was saved.";paint();host.querySelector(`[data-k="${r.key}"][aria-invalid]`)?.focus();return}
  const payload=buildPayload(dirty,norm,st.newIds);st.batchId=st.batchId||uuid();const batch=st.batchId;persist();
  st.saving=true;st.error="";st.notice="";paint();
  try{
    const d=await rpc("save_staff_daily_sheet",{p_rows:payload,p_batch_id:batch});
    if(actorId()!==actor){st.saving=false;st.error="Your sign-in changed; the result was not shown.";return paint()}
    st.data=d;const n=dirty.length;st.newIds={};st.batchId=null;
    st.rows=mergeRoster([],st.roster,d.people);persist();st.notice=n+" row"+(n===1?"":"s")+" saved. The sheet is ready for new amounts.";
    if(d.finances&&typeof mergePayrollFinances==="function")mergePayrollFinances(d.finances);
  }catch(e){if(actorId()!==actor)return;
    if(/already completed/i.test(e.message||"")){st.saving=false;st.error="This save batch was already completed with different values. Saved history was refreshed; compare it with your typed amounts and clear any already saved before saving again. "+e.message;persist();if(host?.isConnected)load(host);return}
    st.error=(e.setup?"Setup needed: run supabase/staff-simple-sheet.sql. ":"")+"Not saved. Your typed amounts are kept: "+e.message}
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
    const matches=(d.people||[]).filter(x=>String(x.email||"").trim().toLowerCase()===email);
    if(!matches.length)return alert("No saved daily-record person has the email "+email+". Add the email in Accounts > Staff Daily Record.");
    if(matches.length>1)return alert("More than one daily-record person uses "+email+". Keep only one before loading.");
    const person=matches[0];
    const f=(d.finalized||[]).find(x=>x.staff_id===person.id&&x.month===month);
    if(f)return alert("A payslip ("+f.payslip_id+") already exists for "+person.name+" in "+month+". It cannot be loaded again.");
    const s=summary(person,d.entries,month,0);
    if(!s.count&&!s.monthly)return alert("No daily entries for "+person.name+" in "+month+".");
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v};
    set("psBasic",s.wages.toFixed(2));set("psOvertime",s.overtime.toFixed(2));set("psFuel",s.fuel.toFixed(2));set("psBonus",s.bonus.toFixed(2));set("psOtherExpenses",s.expense.toFixed(2));
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
    for(const person of payslipPeople){if(!person.email||!EMAIL.test(String(person.email)))continue;
      if(!Array.from(select.options).some(o=>o.value.toLowerCase()===String(person.email).toLowerCase())){
        const o=document.createElement("option");o.value=person.email;o.textContent=person.name+" — Staff daily record";select.append(o);
      }
    }
    if(notice?.isConnected)notice.textContent="For recorded staff, select the person and month, then Load Daily Record. Generate only after all daily entries are complete: one payslip closes that month.";
  }catch(e){if(actor===actorId()&&notice?.isConnected)notice.textContent="Daily record unavailable: "+e.message}
}
function payslipPerson(email){
  if(payslipOwner!==actorId())return null;
  const p=email?payslipPeople.find(x=>x.email&&String(x.email).toLowerCase()===String(email).toLowerCase()):null;
  return p?{id:p.id,email:p.email,name:p.name,role:"Staff"}:null;
}
async function createPayslip(record,status){
  const actor=actorId(),d=await rpc("read_staff_daily_records",{});
  if(actor!==actorId())throw Error("Your sign-in changed.");
  const person=record.email?(d.people||[]).find(p=>p.email&&String(p.email).toLowerCase()===String(record.email).toLowerCase()):null;
  if(!person)return PayrollPayments.create(record,status);
  const selected=window.staffPayslipSelection;
  if(!selected||selected.staffId!==person.id||selected.month!==record.month)throw Error("Click Load Daily Record for this employee and month before generating the payslip.");
  if(!window.confirm("Generate this staff payslip and close "+record.month+"? Add all daily earnings, expenses, advances and payments first. Record the final balance afterwards using the payslip Paid status."))throw Error("Payslip was not generated. The daily record is still open.");
  const result=await rpc("create_staff_record_payslip",{p_staff_id:person.id,p_payslip:record,p_status:status});
  if(actor!==actorId())throw Error("Your sign-in changed.");
  if(!Array.isArray(result.payslips)||!result.payslips.some(p=>p.id===record.id)||!Array.isArray(result.expenses))throw Error("The saved payslip could not be confirmed. Refresh before retrying.");
  return result;
}
window.StaffDailyRecord={draw,mergeRoster,rosterRows:mergeRoster,employeeRole,meaningful,useOnPayslip,preparePayslip,payslipPerson,createPayslip,summary,londonMonth,londonDate,normalizeRow,crossCheck,sheetTotals,buildPayload,parseAmt};
})();
