/* Read-only spending report. Never edits expenses, forms or drafts. */
window.ExpenseReport=(()=>{
  "use strict";
  const ALL="";
  let owner=null,from="",to="",category=ALL,problem="";
  const uid=()=>typeof currentSession!=="undefined"?currentSession?.user?.id:null;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validDate=v=>typeof v==="string"&&/^[1-9]\d{3}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v+"T00:00:00Z"))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
  const pennies=v=>{const n=Number(v);return Number.isFinite(n)?Math.round(n*100):0;};
  const gbp=p=>(p<0?"-":"")+"£"+(Math.abs(p)/100).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
  function ukToday(now=new Date()){
    const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(x=>[x.type,x.value]));
    return p.year+"-"+p.month+"-"+p.day;
  }
  function monthRange(now){
    const t=ukToday(now),[y,m]=t.split("-").map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();
    return {from:t.slice(0,7)+"-01",to:t.slice(0,7)+"-"+String(last).padStart(2,"0")};
  }
  function validate(f){
    if(!validDate(f?.from))return "Enter a valid start date.";
    if(!validDate(f?.to))return "Enter a valid end date.";
    if(f.from>f.to)return "The start date must be on or before the end date.";
    return "";
  }
  function categories(rows,known){
    const set=new Set((known||[]).map(String).filter(Boolean));
    for(const r of rows||[])if(r&&String(r.category||"").trim())set.add(String(r.category).trim());
    return [...set];
  }
  /* Pure: aggregate(rows,{from,to,category}) — inclusive dates, integer pennies. */
  function aggregate(rows,filters){
    const f={from:filters?.from,to:filters?.to,category:filters?.category||ALL},error=validate(f);
    if(error)return {ok:false,error,filters:f,count:0,totalPennies:0,byCategory:[],byDay:[],rows:[]};
    const list=(rows||[]).filter(r=>r&&validDate(r.date)&&r.date>=f.from&&r.date<=f.to&&(!f.category||String(r.category||"").trim()===f.category))
      .map(r=>({date:r.date,category:String(r.category||"").trim()||"Uncategorised",amountPennies:pennies(r.amount),payee:r.payee||"",method:r.method||"",reference:r.reference||"",notes:r.notes||""}))
      .sort((a,b)=>a.date.localeCompare(b.date)||a.category.localeCompare(b.category));
    const cat=new Map(),day=new Map();
    for(const r of list){
      const c=cat.get(r.category)||{category:r.category,count:0,totalPennies:0};c.count++;c.totalPennies+=r.amountPennies;cat.set(r.category,c);
      day.set(r.date,(day.get(r.date)||0)+r.amountPennies);
    }
    const byDay=[];
    const span=(Date.parse(f.to+"T00:00:00Z")-Date.parse(f.from+"T00:00:00Z"))/864e5;
    if(span<=400){for(let t=Date.parse(f.from+"T00:00:00Z");t<=Date.parse(f.to+"T00:00:00Z");t+=864e5){const d=new Date(t).toISOString().slice(0,10);byDay.push({date:d,totalPennies:day.get(d)||0});}}
    else for(const [d,p] of [...day].sort())byDay.push({date:d,totalPennies:p});
    return {ok:true,error:"",filters:f,count:list.length,totalPennies:list.reduce((n,r)=>n+r.amountPennies,0),
      byCategory:[...cat.values()].sort((a,b)=>b.totalPennies-a.totalPennies||a.category.localeCompare(b.category)),byDay,rows:list};
  }
  function sync(){if(owner!==uid()){reset();owner=uid();}if(!from){const r=monthRange();from=r.from;to=r.to;}}
  function reset(){owner=null;from="";to="";category=ALL;problem="";}
  const el=id=>document.getElementById(id);
  function storeRows(){try{return (typeof getStore==="function"&&getStore().expenses)||[];}catch{return [];}}
  function knownTypes(){try{return window.ExpenseTypes?.list()||[];}catch{return [];}}
  function bars(agg){
    const max=Math.max(1,...agg.byCategory.map(c=>c.totalPennies));
    return `<figure class="xr-fig"><figcaption><b>Spend by category</b><span>Highest first · GBP</span></figcaption><ol class="xr-bars">${agg.byCategory.map(c=>
      `<li><span class="xr-bl">${esc(c.category)}</span><span class="xr-track" aria-hidden="true"><i style="transform:scaleX(${Math.max(0,c.totalPennies)/max})"></i></span><span class="xr-bv">${gbp(c.totalPennies)} <small>${c.count} rec · ${agg.totalPennies?(c.totalPennies/agg.totalPennies*100).toFixed(1):"0.0"}%</small></span></li>`).join("")}</ol></figure>`;
  }
  function trend(agg){
    const d=agg.byDay,n=d.length,W=600,H=150,max=Math.max(1,...d.map(x=>x.totalPennies));
     const start=Date.parse(d[0]?.date),end=Date.parse(d[n-1]?.date);
     const x=i=>n<2?W/2:(Date.parse(d[i].date)-start)/(end-start)*W,y=p=>H-(Math.max(0,p)/max)*(H-10);
    const pts=d.map((p,i)=>x(i).toFixed(1)+","+y(p.totalPennies).toFixed(1)).join(" ");
    const peak=d.reduce((a,b)=>b.totalPennies>a.totalPennies?b:a,d[0]||{date:"",totalPennies:0});
    const fmt=s=>s?new Date(s+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}):"";
    const label=`Daily spending from ${fmt(d[0]?.date)} to ${fmt(d[n-1]?.date)}. Peak ${gbp(peak.totalPennies)} on ${fmt(peak.date)}.`;
    return `<figure class="xr-fig"><figcaption><b>Daily spending trend</b><span>Peak ${gbp(peak.totalPennies)} · ${esc(fmt(peak.date))}</span></figcaption>
    <svg class="xr-svg" viewBox="-4 -4 ${W+8} ${H+8}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">
     <line x1="0" y1="${H}" x2="${W}" y2="${H}" class="xr-axis"/>
     ${n>1?`<polygon points="0,${H} ${pts} ${W},${H}" class="xr-area"/><polyline points="${pts}" class="xr-line" vector-effect="non-scaling-stroke"/>`:""}
     ${n<=31?d.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.totalPennies)}" r="3" class="xr-dot"><title>${esc(p.date)}: ${gbp(p.totalPennies)}</title></circle>`).join(""):""}
    </svg><div class="xr-ax"><span>${esc(fmt(d[0]?.date))}</span><span>Max ${gbp(max)}/day</span><span>${esc(fmt(d[n-1]?.date))}</span></div>
    <details class="xr-days"><summary>Daily values as text</summary><ul>${d.filter(p=>p.totalPennies).map(p=>`<li>${esc(p.date)}: ${gbp(p.totalPennies)}</li>`).join("")}</ul></details></figure>`;
  }
  function render(){
    sync();
    const rows=storeRows(),cats=categories(rows,knownTypes());
    if(category&&!cats.includes(category))cats.push(category);
    const agg=aggregate(rows,{from,to,category}),err=problem||agg.error;
    const tile=(name)=>{const c=agg.byCategory.find(x=>x.category===name);return `<div class="xr-tile"><b>${esc(name)}</b><strong>${gbp(c?.totalPennies||0)}</strong><small>${c?.count||0} record${c?.count===1?"":"s"}</small></div>`;};
    const custom=agg.byCategory.filter(c=>c.category!=="Fuel"&&c.category!=="Entertainment").reduce((a,c)=>({p:a.p+c.totalPennies,n:a.n+c.count}),{p:0,n:0});
    let body;
    if(err)body=`<p class="xr-msg error" role="alert">${esc(err)}</p>`;
    else if(!agg.count)body=`<div class="xr-empty" role="status"><b>No expenses recorded</b><span>Nothing saved between ${esc(from)} and ${esc(to)}${category?" for "+esc(category):""}. Widen the dates or choose All categories.</span></div>`;
    else body=`<div class="xr-tiles" role="status" aria-live="polite">
      <div class="xr-tile xr-main"><b>Total spent</b><strong>${gbp(agg.totalPennies)}</strong><small>${agg.count} record${agg.count===1?"":"s"}</small></div>
      ${tile("Fuel")}${tile("Entertainment")}
      <div class="xr-tile"><b>Other types</b><strong>${gbp(custom.p)}</strong><small>${custom.n} record${custom.n===1?"":"s"}</small></div></div>
      <p class="xr-note">Fuel figures are money spent (GBP); litres are not recorded.</p>
      <div class="xr-charts">${bars(agg)}${trend(agg)}</div>
      <details class="xr-detail"><summary>Matching records (${agg.count}) · ${gbp(agg.totalPennies)}</summary><div class="scroll"><table style="min-width:900px"><tr><th>Date</th><th>Category</th><th>Payee</th><th>Method</th><th>Reference</th><th>Amount</th><th>Notes</th></tr>
      ${agg.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.category)}</td><td>${esc(r.payee||"—")}</td><td>${esc(r.method||"—")}</td><td>${esc(r.reference||"—")}</td><td>${gbp(r.amountPennies)}</td><td>${esc(r.notes||"—")}</td></tr>`).join("")}
      <tr class="xr-total"><td colspan="5">Total (${agg.count})</td><td>${gbp(agg.totalPennies)}</td><td></td></tr></table></div></details>`;
    return `<div class="xr-head"><div><h3>Spending report</h3><p class="muted">Read-only. Dates are inclusive; unsaved entries are not counted.</p></div>
     <form class="xr-filters" onsubmit="event.preventDefault();ExpenseReport.apply()">
      <label>From<input type="date" id="xrFrom" value="${esc(from)}"></label>
      <label>To<input type="date" id="xrTo" value="${esc(to)}"></label>
      <label>Category<select id="xrCat"><option value="">All categories</option>${cats.map(c=>`<option value="${esc(c)}"${c===category?" selected":""}>${esc(c)}</option>`).join("")}</select></label>
      <div class="xr-btns"><button class="btn small primary" type="submit">Show report</button><button class="btn small secondary" type="button" onclick="ExpenseReport.thisMonth()">This month</button></div>
     </form></div>${body}`;
  }
  function paint(){
    if(typeof document==="undefined")return;
    const root=el("expenseReport");if(!root)return;
    const keep=document.activeElement?.id;
    root.innerHTML=render();
    if(keep&&/^xr/.test(keep))el(keep)?.focus();
  }
  function apply(){
    sync();const f=el("xrFrom")?.value||"",t=el("xrTo")?.value||"",c=el("xrCat")?.value||ALL;
    const e=validate({from:f,to:t});
     from=f;to=t;category=c;problem=e;
    paint();
  }
  function thisMonth(){sync();const r=monthRange();from=r.from;to=r.to;problem="";paint();}
   function mount(){
    const c=el("expenseRegister");if(!c||el("expenseReport"))return paint();
    const box=document.createElement("div");box.id="expenseReport";box.className="panel xr";box.setAttribute("aria-label","Expense spending report");
    c.insertAdjacentElement("afterend",box);paint();
  }
  return {aggregate,validate,categories,monthRange,ukToday,pennies,formatPennies:gbp,render,paint,mount,apply,thisMonth,reset,
     state:()=>({from,to,category,problem})};
})();
