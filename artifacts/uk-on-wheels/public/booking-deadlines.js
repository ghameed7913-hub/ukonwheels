(function(root){
 "use strict";
 const deliveryStatuses=new Set(["picked up","on route","out for delivery","delayed","accident","claims","fault on route","assigned aa on route"]);
 function londonDay(now=new Date()){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 }
 function dateDay(value){
  const s=String(value||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  const d=new Date(s+"T12:00:00Z");
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s?s:null;
 }
 function state(b,today=londonDay()){
  const status=String(b.status||"").toLowerCase();
  if(b._deliveredAt||["delivered","cancelled","canceled","deleted"].includes(status))return null;
  if(!b._pickedUpAt&&!b._journeyStartedAt&&!deliveryStatuses.has(status))return null;
  const date=dateDay(b.deliveryDate),day=dateDay(today);
  if(!date||!day)return null;
  const tomorrow=new Date(day+"T12:00:00Z");tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  if(date>tomorrow.toISOString().slice(0,10))return null;
  return {label:"Delayed",detail:date<day?"delivery overdue":date===day?"delivery due today":"delivery due tomorrow"};
 }
 root.BookingDeadlines={state,londonDay,dateDay};
 if(!root.document)return;
 let account=null,sessionToken=null,version=0,busy=false,lastRead=0,notices=[],urgent=[],error="",serverDay=null,serverReadDay=null;
 const doc=root.document;
 const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function identity(){
  if(typeof role==="undefined"||!["admin","driver"].includes(role)||typeof currentSession==="undefined"||!currentSession?.user?.id)return null;
  return {id:currentSession.user.id,token:currentSession.access_token,role};
 }
 function clear(){
  version++;account=null;sessionToken=null;lastRead=0;busy=false;notices=[];urgent=[];error="";serverDay=null;serverReadDay=null;
  doc.getElementById("bookingDeadlinePanel")?.remove();
  doc.querySelectorAll(".booking-delivery-urgent").forEach(e=>e.classList.remove("booking-delivery-urgent"));
  doc.querySelectorAll(".booking-delayed-label").forEach(e=>e.remove());
 }
 function open(ref){
  if(typeof role!=="undefined"&&role==="driver"&&typeof openDriverJob==="function")openDriverJob(ref);
  else if(typeof openBookingFromRow==="function")openBookingFromRow(ref);
 }
 function mount(){
  const who=identity();
  if(!who||who.id!==account)return;
  const host=doc.getElementById("driverBody")||doc.getElementById("content");
  if(!host)return;
  let panel=doc.getElementById("bookingDeadlinePanel");
  if(!panel){panel=doc.createElement("section");panel.id="bookingDeadlinePanel";host.prepend(panel)}
  const count=notices.length,red=urgent.length;
  const content=error?`<b>Booking reminder check unavailable</b><p>${escape(error)}</p><button type="button" data-deadline-retry>Retry</button>`:
   (count||red)?`<details><summary>Booking alerts: ${red} Delayed delivery alert${red===1?"":"s"} · ${count} reminder${count===1?"":"s"}</summary><small>Delayed is an action alert from one day before delivery. Actual journey status is unchanged.</small><ul>${urgent.map(b=>`<li><button type="button" data-deadline-ref="${escape(b.reference)}">${escape(b.reference)}</button> ${escape(b.vehicle_registration)} — <strong>Delayed</strong>, delivery date ${escape(b.requested_delivery_date)}</li>`).join("")}${notices.map(n=>`<li><button type="button" data-deadline-ref="${escape(n.reference)}">${escape(n.title)}</button><br>${escape(n.message)}</li>`).join("")}</ul></details>`:"";
  panel.hidden=!content;
  panel.className="booking-deadline-panel"+(error?" booking-deadline-error":"");
  // Do not overwrite an open list on every unrelated DOM update.
  if(panel.dataset.content!==content){
   const expanded=panel.querySelector("details")?.open;
   panel.innerHTML=content;panel.dataset.content=content;
   if(expanded&&panel.querySelector("details"))panel.querySelector("details").open=true;
   panel.querySelectorAll("[data-deadline-ref]").forEach(el=>el.addEventListener("click",()=>open(el.dataset.deadlineRef)));
   panel.querySelector("[data-deadline-retry]")?.addEventListener("click",()=>{lastRead=0;tick()});
  }
  const bookings=typeof getStore==="function"?(getStore().bookings||[]):[];
  const day=serverReadDay===londonDay()?serverDay:londonDay();
  const byRef=new Map(bookings.map(b=>[b.ref,state(b,day)]));
  doc.querySelectorAll("tr,.driverJob,.driverJobSelect").forEach(row=>{
   let ref=row.dataset.bookingRef||row.querySelector(".driverPill")?.textContent.trim();
   if(!ref&&row.tagName==="TR"){
    ref=Array.from(row.cells||[]).slice(0,2).map(td=>{
     const bold=td.querySelector("b");
     return bold?bold.textContent.trim():Array.from(td.childNodes).filter(n=>!n.classList?.contains("booking-delayed-label")).map(n=>n.textContent).join("").trim();
    }).find(s=>byRef.has(s));
   }
   const alert=byRef.get(ref),label=row.querySelector(".booking-delayed-label");
   row.classList.toggle("booking-delivery-urgent",!!alert);
   if(alert){
    const text=alert.label+" — "+alert.detail;
    if(label){if(label.textContent!==text)label.textContent=text}
    else{const mark=doc.createElement("span");mark.className="booking-delayed-label";mark.textContent=text;(row.querySelector(".driverPill")?.parentElement||row.cells?.[0]||row).append(mark)}
   }else label?.remove();
  });
 }
 async function tick(){
  const who=identity();
  if(!who){if(account)clear();return}
  if(who.id!==account||who.token!==sessionToken){clear();account=who.id;sessionToken=who.token}
  mount();
  if(busy||Date.now()-lastRead<30000||typeof sb==="undefined"||!sb)return;
  busy=true;lastRead=Date.now();const requestVersion=version;
  try{
   const result=await sb.rpc("read_booking_deadline_reminders");
   if(result.error)throw new Error(result.error.code==="PGRST202"?"Run supabase/booking-deadline-reminders.sql to enable scheduled reminders.":result.error.message);
   if(!Array.isArray(result.data?.notifications)||!Array.isArray(result.data?.urgent)||!dateDay(result.data?.today))throw new Error("Unexpected booking reminder response. Refresh the portal or ask Admin to check the setup.");
   if(requestVersion!==version||identity()?.id!==who.id)return;
   notices=Array.isArray(result.data?.notifications)?result.data.notifications:[];
   urgent=Array.isArray(result.data?.urgent)?result.data.urgent:[];
   serverDay=dateDay(result.data?.today);serverReadDay=londonDay();error="";
  }catch(e){if(requestVersion===version){notices=[];urgent=[];error=e.message||"Unable to load booking reminders."}}
  finally{if(requestVersion===version){busy=false;mount()}}
 }
 let queued=false;
 function changed(){
  if(queued)return;queued=true;
  root.setTimeout(()=>{queued=false;tick()},100);
 }
 function start(){
  new MutationObserver(changed).observe(doc.body,{childList:true,subtree:true});
  root.setInterval(tick,30000);doc.addEventListener("visibilitychange",()=>{if(!doc.hidden){lastRead=0;tick()}});
  tick();
 }
 if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",start);else start();
})(typeof window!=="undefined"?window:globalThis);
