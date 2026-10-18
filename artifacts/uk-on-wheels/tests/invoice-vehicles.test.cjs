const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const helper=fs.readFileSync(path.join(__dirname,"../public/invoice-vehicles.js"),"utf8");
function setup(){
 const booking=(ref,stamp,other={})=>({ref,vehicle:"Sample vehicle",reg:ref,business:"Client A",status:"Delivered",paymentStatus:"Pending",amount:100,_deliveredAt:stamp,...other});
 const store={invoiceSettings:{companyName:"Issuer",showLogo:false},invoices:[],businesses:[{name:"Client A"},{name:"Client B"}],bookings:[
  booking("START","2026-10-01T00:00:00+01:00"),
  booking("END","2026-10-31T23:59:59Z"),
  booking("EARLY","2026-09-30T12:00:00Z"),
  booking("LATE","2026-11-01T00:00:00Z"),
  booking("OTHER","2026-10-10T12:00:00Z",{business:"Client B"}),
  booking("UNDONE","2026-10-10T12:00:00Z",{status:"Picked Up"}),
  booking("PAID","2026-10-10T12:00:00Z",{paymentStatus:"Paid"}),
  booking("INVOICED","2026-10-10T12:00:00Z",{invoiceNo:"EXISTING"}),
  booking("UNKNOWN",null,{deliveryDate:"2026-10-10"}),
 ]};
 const fields={invBiz:{value:"Client A"},invDeliveredFrom:{value:"2026-10-01"},invDeliveredTo:{value:"2026-10-31"},invVatEnabled:{checked:false},invVat:{value:"20"},invVehicleArea:{innerHTML:""},generateInvoiceBtn:{addEventListener(){}},content:{innerHTML:""}};
 const notices=[],saves=[];
 const c=vm.createContext({window:{},ensureAccountsData:()=>store,currentSession:{user:{id:"actor"}},document:{getElementById:id=>fields[id]},alert:m=>notices.push(m),
  escapeHtml:v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])),
  saveStore:async s=>{saves.push(JSON.parse(JSON.stringify(s)));return true},drawInvoices(){},go(){}});
 vm.runInContext(helper,c);c.InvoiceVehicles=c.window.InvoiceVehicles;
 vm.runInContext(html.slice(html.indexOf("function loadInvoiceVehicles("),html.indexOf("function viewInvoice(")),c);
 const load=()=>{
  c.loadInvoiceVehicles();
  (c.loadInvoiceVehicles.selection?.refs||[]).forEach((ref,i)=>{fields["ii_"+i]={checked:false};fields["ic_"+i]={value:"100"}});
  return Array.from(c.loadInvoiceVehicles.selection?.refs||[]);
 };
 return {c,store,fields,notices,saves,load};
}
test("Delivery period uses actual UK delivery dates, including DST and inclusive boundaries, never requested dates",()=>{
 const s=setup(),api=s.c.InvoiceVehicles;
 assert.equal(api.deliveryDay({_deliveredAt:"2026-09-30T23:30:00Z"}),"2026-10-01");
 assert.equal(api.deliveryDay({_deliveredAt:"2026-10-25T00:30:00Z"}),"2026-10-25");
 assert.equal(api.deliveryDay({_deliveredAt:"2026-10-25T01:30:00Z"}),"2026-10-25");
 assert.equal(api.deliveryDay({deliveryDate:"2026-10-10"}),"");
 assert.equal(api.deliveryDay({_deliveredAt:"not-a-date",deliveryDate:"2026-10-10"}),"");
 assert.equal(api.deliveryDay({deliveryEvidence:{deliveredAt:"2026-10-10T12:00:00Z"}}),"2026-10-10");
 assert.deepEqual(s.load(),["START","END"]);
 assert.match(s.fields.invVehicleArea.innerHTML,/no recorded actual delivery date/);
 assert.match(s.fields.invVehicleArea.innerHTML,/id="ii_0" type="checkbox" aria-label/);
 assert.doesNotMatch(s.fields.invVehicleArea.innerHTML,/checkbox" checked/);
});
test("Missing, impossible and reversed dates clear stale selection and cannot produce invoices",async()=>{
 for(const [from,to] of [["","2026-10-31"],["2026-10-01",""],["2026-10-32","2026-11-01"],["2026-11-01","2026-10-01"]]){
  const s=setup();s.load();s.fields.invDeliveredFrom.value=from;s.fields.invDeliveredTo.value=to;
  s.c.loadInvoiceVehicles();assert.equal(s.c.loadInvoiceVehicles.selection,null);
  await s.c.makeInvoice(["START","END"]);assert.equal(s.saves.length,0);
 }
});
test("Only checked vehicles and their edited charges reach saved invoices and booking links",async()=>{
 const s=setup(),refs=s.load();
 s.fields.ii_1.checked=true;s.fields.ic_1.value="125.50";
 await s.c.makeInvoice(refs);
 const invoice=s.saves[0].invoices[0];
 assert.deepEqual(invoice.items.map(i=>i.ref),["END"]);
 assert.equal(invoice.total,125.5);assert.equal(invoice.vehicleCount,1);
 assert.equal(invoice.deliveryFrom,"2026-10-01");assert.equal(invoice.deliveryTo,"2026-10-31");
 assert.equal(invoice.items[0].deliveredDate,"2026-10-31");
 assert.equal(s.store.bookings.find(b=>b.ref==="START").invoiceNo,undefined);
 assert.equal(s.store.bookings.find(b=>b.ref==="END").invoiceNo,invoice.invoiceNo);
});
test("Select all, clear selection, empty selection and empty results are safe",async()=>{
 const s=setup(),refs=s.load();s.c.selectInvoiceVehicles(true);
 assert.ok(s.fields.ii_0.checked&&s.fields.ii_1.checked);
 s.c.selectInvoiceVehicles(false);await s.c.makeInvoice(refs);
 assert.equal(s.saves.length,0);assert.match(s.notices.at(-1),/at least one/);
 s.fields.invDeliveredFrom.value="2026-12-01";s.fields.invDeliveredTo.value="2026-12-31";s.load();
 assert.match(s.fields.invVehicleArea.innerHTML,/No Delivered Vehicles Available/);
 assert.equal(s.c.loadInvoiceVehicles.selection,null);
});
test("Changed client/date, stale row references, negative charges, paid or newly invoiced bookings are rejected",async()=>{
 for(const mutate of [
  s=>{s.fields.invBiz.value="Client B"},s=>{s.fields.invDeliveredTo.value="2026-10-30"},
  s=>{s.fields.ic_0.value="-1"},s=>{s.fields.ic_0.value="NaN"},
  s=>{s.store.bookings[0].paymentStatus="Paid"},s=>{s.store.bookings[0].invoiceNo="NEW"},
  s=>{s.store.bookings[0].business="Client B"},s=>{s.store.bookings[0].status="On Route"},
  s=>{s.store.bookings[0]._deliveredAt="2026-09-01T00:00:00Z"},
  s=>{s.store.bookings.shift()},
 ]){
  const s=setup(),refs=s.load();s.fields.ii_0.checked=true;mutate(s);
  await s.c.makeInvoice(refs);assert.equal(s.saves.length,0);assert.equal(s.store.invoices.length,0);
 }
 const s=setup();s.load();s.fields.ii_0.checked=true;
 await s.c.makeInvoice(["EARLY"]);assert.equal(s.saves.length,0);
});
test("A change during asynchronous company-settings load cannot save stale invoice vehicles",async()=>{
 for(const mutate of [s=>{s.fields.invBiz.value="Client B"},s=>{s.store.bookings[0].invoiceNo="OTHER"},s=>{s.c.currentSession=null}]){
  const s=setup(),refs=s.load();s.fields.ii_0.checked=true;
  s.c.SUPABASE_CONFIGURED=true;s.c.sb={};
  s.c.InvoiceTools={readSettings:async()=>{mutate(s);return {companyName:"Issuer"}}};
  await s.c.makeInvoice(refs);assert.equal(s.saves.length,0);assert.equal(s.store.invoices.length,0);
 }
});
test("Client and date controls reload candidates automatically and vehicle text is escaped",()=>{
 assert.match(html,/id="invBiz" onchange="loadInvoiceVehicles\(\)"/);
 for(const id of ["invDeliveredFrom","invDeliveredTo"])assert.match(html,new RegExp('id="'+id+'"[^>]+onchange="loadInvoiceVehicles\\(\\)"'));
 const s=setup();s.store.bookings[0].vehicle='<img src=x onerror="bad()">';
 s.load();assert.match(s.fields.invVehicleArea.innerHTML,/&lt;img/);
 assert.doesNotMatch(s.fields.invVehicleArea.innerHTML,/<img/);
});
