const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/customer-reference.js"),"utf8"),context);
const api=context.window.CustomerReference;
const part=(from,to)=>html.slice(html.indexOf(from),html.indexOf(to));
test("Reference is optional, preserves instructions and allows leading zeros",()=>{
  assert.equal(api.notes("","Leave keys at reception"),"Leave keys at reception");
  assert.equal(api.notes("  ",""),"");
  assert.equal(api.notes("  000123/A  ","Keep dry"),"Customer reference: 000123/A\n\nKeep dry");
  assert.equal(api.value({notes:api.notes("000123/A","Keep dry")}),"000123/A");
  assert.throws(()=>api.notes("a".repeat(121)),/120 characters/);
  assert.throws(()=>api.notes("two\nlines"),/single line/);
  assert.equal(api.value({notes:"ordinary old instructions"}),"");
});
test("Admin RPC persists reference with instructions, without replacing the UKOW reference",async()=>{
  let call;
  const c=vm.createContext({
    getStore:()=>({businesses:[]}),
    sb:{rpc:async(name,args)=>{call={name,args};return {data:{id:"saved",reference:"UKOW00123",client_notes:args.p_notes}};}}
  });
  vm.runInContext(part("async function createLinkedBooking(","function toggleCustomerTypeFields("),c);
  const saved=await c.createLinkedBooking({customerType:"Private",notes:api.notes("PO-0007","Collect at reception")});
  assert.equal(call.name,"admin_create_delivery_booking");
  assert.equal(call.args.p_reference,null);
  assert.equal(call.args.p_notes,"Customer reference: PO-0007\n\nCollect at reception");
  assert.equal(saved.reference,"UKOW00123");
  // Both RPCs store notes in client_notes, which the normalizer loads on refresh.
  assert.equal(api.value(saved),"PO-0007");
  const normalized=part("function normalizedBookingToPortal(","async function loadNormalizedPortalData(");
  assert.match(normalized,/notes:b\.client_notes\|\|""/);
});
test("Single booking passes same persisted notes to Client and Admin creation paths",()=>{
  const create=part("async function submitBooking(","function drawBusinesses(");
  assert.match(create,/notes:CustomerReference\.notes\(document\.getElementById\("customerReference"\)/);
  assert.match(create,/sb\.rpc\("client_create_bulk_booking",\{p_reference:submitBooking\.clientDraft\.reference,p_booking:booking\}\)/);
  assert.match(create,/await createLinkedBooking\(booking\)/);
  const form=part("function drawBooking(","async function createLinkedBooking(");
  assert.match(form,/Customer reference \(optional\)/);
  assert.match(form,/<input id="customerReference" maxlength="120"/);
  assert.doesNotMatch(form,/<input id="customerReference"[^>]*required/);
});
test("Reference displays safely to operations and Clients, with legacy rows unchanged",()=>{
  const b={notes:api.notes('<img src=x onerror="alert(1)">',"Keep instructions")};
  assert.match(api.detail(b),/&lt;img/);
  assert.doesNotMatch(api.summary(b),/<img/);
  assert.equal(api.detail({}),"");
  assert.match(part("function viewStatusBooking(","function findBookingByRef("),/CustomerReference\.detail\(b\)/);
  assert.match(html,/CustomerReference\.summary\(b\)/);
});
test("Invoice references include all vehicles, preserve snapshots and safely support older invoices",()=>{
 const bookings=[{ref:"UKOW1",notes:api.notes("PO-<001>")},{ref:"UKOW2",notes:api.notes("000456")}];
 const invoice={items:[{ref:"UKOW1"},{ref:"UKOW2"},{ref:"UKOW1"}]};
 assert.equal(api.invoiceSummary(invoice,bookings),"PO-&lt;001&gt;<br>000456");
 assert.equal(api.invoiceItem({ref:"UKOW1",customerReference:"SAVED"},bookings),"SAVED");
 assert.equal(api.invoiceItem({ref:"UKOW1",customerReference:""},bookings),"");
 assert.equal(api.invoiceSummary({items:[{ref:"missing"}]},bookings),"—");
 for(const [start,end]of [["function drawClientInvoices(","function drawClientReports("],["function drawInvoices(","async function saveInvoiceSettings("],["function openMarkInvoicePaid(","async function markInvoicePaid("]]){
  assert.match(part(start,end),/CustomerReference\.invoiceSummary\(i,s\.bookings\)/);
 }
 assert.match(part("function viewInvoice(","async function downloadInvoicePdf("),/safe\(CustomerReference\.invoiceItem/);
 assert.match(part("async function downloadInvoicePdf(","function drawPayments("),/customerReference:CustomerReference\.invoiceItem/);
});
test("Downloaded invoice PDFs contain customer references beside booking numbers",async()=>{
 const {buildInvoicePdf}=await import("../src/invoice-pdf.js");
 const pdf=buildInvoicePdf({invoiceNo:"INV-REF",items:[{ref:"UKOW1",customerReference:"PO-000123",charge:100}],subtotal:100,total:100,vatEnabled:false},{showLogo:false});
 const data=pdf.output();
 assert.match(data,/Customer ref: PO-000123/);
 assert.match(data,/UKOW1/);
});
