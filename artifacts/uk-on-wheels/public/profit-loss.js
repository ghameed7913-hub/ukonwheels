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
  const deliveries=[],expenseRows=[],missingDeliveries=[],seen=new Map();
  function total(rows,field,dayFor=row=>String(row.date||"").slice(0,10),included=[]){
   return (rows||[]).reduce((sum,row)=>{
    const date=dayFor(row);
    if(!validDate(date)){excluded++;if(field==="amount"&&row.status==="Delivered")missingDeliveries.push(String(row.ref||row._normalizedId||"Unknown booking"));return sum}
    if(date<from||date>to)return sum;
    const amount=row[field]==null||row[field]===""?NaN:Number(row[field]);
    if(!Number.isFinite(amount))throw Error("A matching record has an invalid amount. Correct it before calculating Profit & Loss.");
    const pennies=Math.round(amount*100),next=sum+pennies;
    if(!Number.isSafeInteger(next))throw Error("The selected total is too large to calculate safely.");
    included.push({row,date,pennies});
    count++;return next;
   },0);
  }
  try{
   const bookings=(store.bookings||[]).filter(row=>{
    if(row.status!=="Delivered")return false;
    const key=row._normalizedId||row.ref;
    if(!key)return true;
    const signature=JSON.stringify([window.InvoiceVehicles.deliveryDay(row),row.amount,row.paymentStatus]);
    if(seen.has(key)){
     if(seen.get(key)!==signature)throw Error("Conflicting copies of booking "+key+". Refresh the portal before calculating Profit & Loss.");
     return false;
    }
    seen.set(key,signature);return true;
   });
   // Earned revenue: count each delivered booking charge once, never its invoice/payment again.
   const income=total(bookings,"amount",window.InvoiceVehicles.deliveryDay,deliveries);
   const expenses=total(store.expenses,"amount",undefined,expenseRows),net=income-expenses;
   if(!Number.isSafeInteger(income)||!Number.isSafeInteger(net))throw Error("The selected total is too large to calculate safely.");
   let pending=0,pendingCount=0;
   for(const delivery of deliveries){
    delivery.pendingPennies=String(delivery.row.paymentStatus||"").trim().toLowerCase()==="paid"?0:Math.max(0,delivery.pennies);
    if(delivery.pendingPennies>0)pendingCount++;
    pending+=delivery.pendingPennies;
    if(!Number.isSafeInteger(pending))throw Error("The pending payment total is too large to calculate safely.");
   }
   return {income,expenses,net,pending,pendingCount,excluded,count,deliveries,expenseRows,missingDeliveries};
  }catch(e){return {error:e.message}}
 }
 function render(){
  const end=today(),start=end.slice(0,7)+"-01";
  return `<div class="panel"><h2>Profit &amp; Loss</h2>
   <p>Select a date range to see completed-delivery revenue, expenses and net profit or loss. Both dates are included.</p>
   <div class="form">
    <label>From<input id="plFrom" type="date" value="${start}" required onchange="runPL()"></label>
    <label>To<input id="plTo" type="date" value="${end}" required onchange="runPL()"></label>
   </div>
   <div class="actions"><button class="btn primary" onclick="runPL()">Calculate P&amp;L</button>
   <button class="btn secondary" onclick="document.getElementById('plTo').value=ProfitLoss.today();runPL()">Up to today</button></div>
   <p class="muted">Revenue is the saved booking charge for each completed delivery, paid or unpaid, using its actual delivery date (UK time). Invoice totals, VAT, invoice-only extras and payments are not added again. Expenses use their recorded expense dates. Profit = revenue − expenses.</p>
   </div><div id="plResult" aria-live="polite"></div>`;
 }
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const displayDate=value=>value.split("-").reverse().join("/");
 let selectedTab="revenue",lastReport=null,lastPeriod=null;
 function calculate(store){
  const from=document.getElementById("plFrom")?.value,to=document.getElementById("plTo")?.value,result=document.getElementById("plResult");
  if(!result)return;
  const report=aggregate(store,from,to);
  if(report.error){lastReport=null;lastPeriod=null;result.innerHTML=`<div class="panel" style="margin-top:12px" role="alert">${escape(report.error)}</div>`;return}
  lastReport=report;lastPeriod={from,to};paintResult();
 }
 function paintResult(){
  const result=document.getElementById("plResult");
  if(!result||!lastReport||!lastPeriod)return;
  const report=lastReport,{from,to}=lastPeriod,pending=selectedTab==="pending";
  const rows=pending?report.deliveries.filter(x=>x.pendingPennies>0):report.deliveries;
  const tab=(key,title,amount,note)=>`<button type="button" class="card" id="pl-${key}-tab" role="tab" aria-selected="${selectedTab===key}" aria-controls="pl-details" tabindex="${selectedTab===key?0:-1}" onclick="ProfitLoss.selectTab('${key}',true)" onkeydown="ProfitLoss.tabKey(event)" style="text-align:left;font:inherit;cursor:pointer;${selectedTab===key?"outline:2px solid #c8102e;outline-offset:-2px;":""}"><b>${title}</b><strong${key==="pending"?' style="color:#92400e"':""}>${cash(amount)}</strong><small>${note}</small><small style="display:block;margin-top:6px">Click to view details</small></button>`;
  result.innerHTML=`<div class="panel" style="margin-top:12px"><h3>${displayDate(from)} to ${displayDate(to)}</h3>
   ${report.count?"":"<p>No matching completed deliveries or expense records for these dates.</p>"}
   <div class="cards"><div role="tablist" aria-label="Delivery payment details" style="display:contents">
   ${tab("revenue","Total Revenue",report.income,report.deliveries.length+" completed deliveries · paid and unpaid")}
   ${tab("pending","Pending Payment",report.pending,report.pendingCount+" completed deliveries awaiting payment")}
   </div>
   <div class="card"><b>Total Expenses</b><strong>${cash(report.expenses)}</strong></div>
   <div class="card"><b>Net ${report.net>=0?"Profit":"Loss"}</b><strong style="color:${report.net>=0?"#15803d":"#b91c1c"}">${cash(report.net)}</strong></div></div>
   <p class="muted">Pending Payment is the booking value not currently marked Paid, for deliveries completed within these dates. It is already included in revenue and is not deducted from profit. This is the current payment status, not a historical balance at the end date.</p>
   ${report.excluded?`<p role="alert">${report.excluded} record(s) without a valid actual delivery/expense date were excluded, so these totals may be incomplete. Requested delivery dates are not used.${report.missingDeliveries.length?" Missing actual delivery dates: "+report.missingDeliveries.map(escape).join(", ")+".":""}</p>`:""}
   <section id="pl-details" role="tabpanel" aria-labelledby="pl-${selectedTab}-tab" tabindex="0">
   <h3>${pending?"Pending payments":"Total revenue details"} — ${rows.length} completed deliveries</h3>
   ${rows.length?"":`<p>${pending?"No pending payments for completed deliveries in these dates.":"No completed deliveries in these dates."}</p>`}
   <div class="scroll"><table style="min-width:1100px"><thead><tr><th>Booking</th><th>Vehicle</th><th>Registration</th><th>Pickup</th><th>Delivery address</th><th>Actual delivery date</th><th>Payment</th><th>Revenue</th><th>Pending Payment</th></tr></thead><tbody>
   ${rows.map(x=>`<tr><td>${escape(x.row.ref||"—")}</td><td>${escape(x.row.vehicle||"—")}</td><td>${escape(x.row.reg||"—")}</td><td>${escape(x.row.pickup||"—")}</td><td>${escape(x.row.destination||"—")}</td><td>${displayDate(x.date)}</td><td>${escape(x.row.paymentStatus||"Unpaid")}</td><td>${cash(x.pennies)}</td><td>${cash(x.pendingPennies)}</td></tr>`).join("")}
   </tbody><tfoot><tr><th colspan="7">Totals</th><td>${cash(rows.reduce((sum,x)=>sum+x.pennies,0))}</td><td>${cash(rows.reduce((sum,x)=>sum+x.pendingPennies,0))}</td></tr></tfoot></table></div></section></div>`;
 }
 function selectTab(tab,focus=false){
  if(!["revenue","pending"].includes(tab)||!lastReport)return;
  selectedTab=tab;paintResult();
  if(focus)document.getElementById("pl-"+tab+"-tab")?.focus?.();
 }
 function tabKey(event){
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
  event.preventDefault();
  selectTab(event.key==="Home"?"revenue":event.key==="End"?"pending":selectedTab==="revenue"?"pending":"revenue",true);
 }
 let loadedBookings=null,owner=null,request=0;
 async function readBookings(client){
  const rows=[],size=1000;
  for(let offset=0;;offset+=size){
   const result=await client.from("bookings").select("id,reference,status,amount,delivered_at,payment_status,vehicle_make,vehicle_model,vehicle_registration,pickup_address,destination_address").eq("status","Delivered").order("id").range(offset,offset+size-1);
   if(result.error)throw Error(result.error.message||"Completed deliveries could not load.");
   if(!Array.isArray(result.data))throw Error("Completed deliveries returned an invalid response.");
   rows.push(...result.data.map(b=>({_normalizedId:b.id,ref:b.reference,status:b.status,amount:b.amount,_deliveredAt:b.delivered_at,paymentStatus:b.payment_status,vehicle:[b.vehicle_make,b.vehicle_model].filter(Boolean).join(" "),reg:b.vehicle_registration,pickup:b.pickup_address,destination:b.destination_address})));
   if(result.data.length<size)return rows;
  }
 }
 function reset(){request++;owner=null;loadedBookings=null;selectedTab="revenue";lastReport=null;lastPeriod=null}
 async function open(container,store,options={}){
  const token=++request,actor=options.actor?.();
  owner=actor;loadedBookings=null;selectedTab="revenue";lastReport=null;lastPeriod=null;
  container.innerHTML='<div class="panel"><h2>Loading completed deliveries for Profit &amp; Loss…</h2></div>';
  try{
   if(options.client){
    const canonical=await readBookings(options.client);
    if(token!==request||options.actor?.()!==actor||options.active?.()===false)return;
    const refs=new Set(canonical.map(b=>b.ref));
    // Keep legacy-only bookings; the live database is authoritative for normalized bookings.
    loadedBookings=[...canonical,...(store.bookings||[]).filter(b=>!b._normalizedId&&!refs.has(b.ref))];
   }
   if(token!==request||options.active?.()===false)return;
   container.innerHTML=render();calculate({...store,bookings:loadedBookings||store.bookings});
  }catch(error){
   if(token!==request||options.actor?.()!==actor||options.active?.()===false)return;
   container.innerHTML=`<div class="panel" role="alert"><h2>Profit &amp; Loss could not load</h2><p>${escape(error.message)}</p><p>Reopen Profit &amp; Loss to retry. No estimated totals are shown.</p></div>`;
  }
 }
 function calculateCurrent(store,actor){
  if(owner!==actor&&loadedBookings){reset();return}
  calculate({...store,bookings:loadedBookings||store.bookings});
 }
 window.ProfitLoss={today,validDate,aggregate,render,calculate:calculateCurrent,open,readBookings,reset,selectTab,tabKey};
})();
