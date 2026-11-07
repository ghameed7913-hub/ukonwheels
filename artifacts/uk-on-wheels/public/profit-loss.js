(function(){
 "use strict";
 const cash=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(n/100);
 function today(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const part=k=>parts.find(p=>p.type===k).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
 }
 function validDate(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+"T12:00:00Z");
  return !isNaN(date)&&date.toISOString().slice(0,10)===value;
 }
 function aggregate(store,from,to){
  if(!validDate(from)||!validDate(to))return {error:"Choose valid From and To dates."};
  if(from>to)return {error:"From date must be on or before To date."};
  let excluded=0,count=0;
  function total(rows,field){
   return (rows||[]).reduce((sum,row)=>{
    const date=String(row.date||"").slice(0,10);
    if(!validDate(date)){excluded++;return sum}
    if(date<from||date>to)return sum;
    const amount=Number(row[field]||0);
    if(!Number.isFinite(amount))throw Error("A matching record has an invalid amount. Correct it before calculating Profit & Loss.");
    const next=sum+Math.round(amount*100);
    if(!Number.isSafeInteger(next))throw Error("The selected total is too large to calculate safely.");
    count++;return next;
   },0);
  }
  try{
   // Keep the existing P&L sources: transactions plus paid invoices, less expenses.
   const income=total(store.transactions,"amount")+total((store.invoices||[]).filter(i=>i.status==="Paid"),"total");
   const expenses=total(store.expenses,"amount"),net=income-expenses;
   if(!Number.isSafeInteger(income)||!Number.isSafeInteger(net))throw Error("The selected total is too large to calculate safely.");
   return {income,expenses,net,excluded,count};
  }catch(e){return {error:e.message}}
 }
 function render(){
  const end=today(),start=end.slice(0,7)+"-01";
  return `<div class="panel"><h2>Profit &amp; Loss</h2>
   <p>Select a date range to see income, expenses and net profit or loss. Both dates are included.</p>
   <div class="form">
    <label>From<input id="plFrom" type="date" value="${start}" required onchange="runPL()"></label>
    <label>To<input id="plTo" type="date" value="${end}" required onchange="runPL()"></label>
   </div>
   <div class="actions"><button class="btn primary" onclick="runPL()">Calculate P&amp;L</button>
   <button class="btn secondary" onclick="document.getElementById('plTo').value=ProfitLoss.today();runPL()">Up to today</button></div>
   <p class="muted">Income uses transaction dates and paid invoice dates. Expenses use their recorded expense dates. Unpaid invoices are not included.</p>
   </div><div id="plResult" aria-live="polite"></div>`;
 }
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const displayDate=value=>value.split("-").reverse().join("/");
 function calculate(store){
  const from=document.getElementById("plFrom")?.value,to=document.getElementById("plTo")?.value,result=document.getElementById("plResult");
  if(!result)return;
  const report=aggregate(store,from,to);
  if(report.error){result.innerHTML=`<div class="panel" style="margin-top:12px" role="alert">${escape(report.error)}</div>`;return}
  result.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${displayDate(from)} to ${displayDate(to)}</h3>
   ${report.count?"":"<p>No matching income or expense records for these dates.</p>"}
   <div class="cards"><div class="card"><b>Total Income</b><strong>${cash(report.income)}</strong></div>
   <div class="card"><b>Total Expenses</b><strong>${cash(report.expenses)}</strong></div>
   <div class="card"><b>Net ${report.net>=0?"Profit":"Loss"}</b><strong style="color:${report.net>=0?"#15803d":"#b91c1c"}">${cash(report.net)}</strong></div></div>
   ${report.excluded?`<p role="status">${report.excluded} record(s) without a valid date were excluded. Correct their dates to include them in a date-based report.</p>`:""}</div>`;
 }
 window.ProfitLoss={today,validDate,aggregate,render,calculate};
})();
