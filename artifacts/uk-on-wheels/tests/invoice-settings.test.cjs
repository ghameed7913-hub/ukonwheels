const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const helper = fs.readFileSync(path.join(__dirname, "../public/invoice-tools.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
function context(client = {}) {
  const c = vm.createContext({window:{}, URL, crypto:require("node:crypto").webcrypto,
    document:{baseURI:"https://portal.example.test/portal/"}});
  vm.runInContext(helper,c);
  return {tools:c.window.InvoiceTools, client};
}
function fields(overrides = {}) {
  const values = {cfgCompanyName:"UK On Wheels",cfgBankName:"Saved Bank",cfgAccountNo:"12345678",...overrides};
  return {getElementById(id) {return id==="cfgShowLogo"?{checked:true}:id==="cfgInvoiceLogo"?{files:[]}:{value:values[id]||""};}};
}
function prepareSelection(c,inputs,store){
 inputs.invDeliveredFrom={value:"2030-01-01"};inputs.invDeliveredTo={value:"2030-01-31"};
 Object.assign(store.bookings[0],{business:inputs.invBiz.value,status:"Delivered",_deliveredAt:"2030-01-10T12:00:00Z"});
 c.window={};vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/invoice-vehicles.js"),"utf8"),c);
 c.InvoiceVehicles=c.window.InvoiceVehicles;c.loadInvoiceVehicles=()=>{};
 c.loadInvoiceVehicles.selection={key:c.InvoiceVehicles.readRange(c.document).key,refs:["BOOKING"]};
}
test("company and bank details are saved through one global server call, not per Client", async()=>{
  let sent;
  const client={rpc:async(name,args)=>{sent={name,args};return {data:{...args.p_settings,savedAt:"2030-01-01"}};}};
  const {tools}=context();
  const saved=await tools.saveSettings(client,{logoPath:""},fields());
  assert.equal(sent.name,"save_invoice_company_settings");
  assert.equal(sent.args.p_settings.bankAccountNumber,"12345678");
  assert.equal(saved.companyName,"UK On Wheels");
  assert.equal("business" in sent.args.p_settings,false);
});
test("rejected saves fail explicitly and do not mutate the existing saved details",async()=>{
  const previous={companyName:"Original",bankAccountNumber:"11111111"};
  const {tools}=context();
  await assert.rejects(tools.saveSettings({rpc:async()=>({error:{message:"Save rejected"}})},previous,fields()),/Save rejected/);
  assert.deepEqual(previous,{companyName:"Original",bankAccountNumber:"11111111"});
});
test("missing settings setup never pretends local defaults were saved",async()=>{
  const {tools}=context();
  await assert.rejects(tools.readSettings({rpc:async()=>({error:{message:"Function not found"}})}),/invoice-settings-patch.sql/);
});
test("sign-in changes stop settings writes before the server is called",async()=>{
  let writes=0;
  const {tools}=context();
  await assert.rejects(tools.saveSettings({rpc:async()=>{writes++;return {data:{companyName:"Changed"}};}},{},fields(),()=>false),/sign-in changed/);
  assert.equal(writes,0);
});
test("logo paths use immutable storage URLs; hidden and default logo choices work",()=>{
  const {tools}=context(),client={storage:{from:bucket=>({getPublicUrl:path=>({data:{publicUrl:"https://storage.example/"+bucket+"/"+path}})})}};
  assert.equal(tools.logoUrl({showLogo:false},client),"");
  assert.equal(tools.logoUrl({},client),"https://portal.example.test/portal/uk-on-wheels-logo.jpg");
  const name="logos/00000000-0000-4000-8000-000000000001.png";
  assert.equal(tools.logoUrl({logoPath:name},client),"https://storage.example/invoice-branding/"+name);
  assert.throws(()=>tools.logoUrl({logoPath:"javascript:alert(1)"},client),/invalid/);
});
test("logo validation rejects oversized, SVG and forged files before upload",async()=>{
  const {tools}=context();
  await assert.rejects(tools.readLogo({type:"image/svg+xml",size:20}),/PNG or JPG/);
  await assert.rejects(tools.readLogo({type:"image/png",size:2097153}),/2 MB/);
  await assert.rejects(tools.readLogo({type:"image/png",size:5,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer}),/not a valid/);
});
test("generated invoice freezes company, bank and billing details for future downloads",async()=>{
  const start=html.indexOf("function toggleInvoiceVat("),end=html.indexOf("function viewInvoice(",start);
  const store={invoiceSettings:{companyName:"Original",bankAccountNumber:"12345678",showLogo:false},
    invoices:[],bookings:[{ref:"BOOKING",vehicle:"Vehicle",reg:"TEST"}],businesses:[{name:"Client One",address:"First address"}]};
  const inputs={ii_0:{checked:true},ic_0:{value:"100"},invBiz:{value:"Client One"},invVatEnabled:{checked:false}};
  let saved;
  const c=vm.createContext({ensureAccountsData:()=>store,document:{getElementById:id=>inputs[id]},
    saveStore:async s=>{saved=JSON.parse(JSON.stringify(s));return true;},alert(){},drawInvoices(){}});
   prepareSelection(c,inputs,store);
   vm.runInContext(html.slice(start,end),c);
  await c.makeInvoice(["BOOKING"]);
  store.invoiceSettings.bankAccountNumber="99999999";
  store.businesses[0].address="Changed address";
  assert.equal(saved.invoices[0].companyDetails.bankAccountNumber,"12345678");
  assert.equal(saved.invoices[0].billTo.address,"First address");
  assert.equal(saved.invoices[0].vatEnabled,false);
});
test("actual PDF bytes contain company, bank details and invoice lines and paginate long invoices",async()=>{
  const {buildInvoicePdf}=await import("../src/invoice-pdf.js");
  const invoice={invoiceNo:"INV-TEST",date:"2030-01-01",vatEnabled:false,subtotal:100,total:100,
    items:Array.from({length:100},(_,n)=>({ref:"BOOKING-"+n,vehicle:"Sample vehicle",reg:"TEST",charge:1}))};
  const doc=buildInvoicePdf(invoice,{companyName:"Saved UK Company",bankAccountNumber:"12345678",showLogo:false},{name:"Correct Client"});
  const data=doc.output();
  assert.ok(data.startsWith("%PDF-"));
  assert.match(data,/Saved UK Company/);assert.match(data,/12345678/);
  assert.match(data,/Correct Client/);assert.match(data,/BOOKING-99/);
  assert.doesNotMatch(data,/VAT \(/);
  assert.ok(doc.getNumberOfPages()>1);
});
test("a sign-in change during invoice defaults loading prevents creation in another account's cache",async()=>{
  const start=html.indexOf("function toggleInvoiceVat("),end=html.indexOf("function viewInvoice(",start);
  const store={invoiceSettings:{},invoices:[],businesses:[{name:"Client"}],
    bookings:[{ref:"BOOKING",vehicle:"Vehicle",reg:"TEST"}]};
  const inputs={ii_0:{checked:true},ic_0:{value:"100"},invBiz:{value:"Client"},invVatEnabled:{checked:false}};
  let writes=0;
  const c=vm.createContext({SUPABASE_CONFIGURED:true,currentSession:{user:{id:"original"}},sb:{},
    ensureAccountsData:()=>store,document:{getElementById:id=>inputs[id]},
    saveStore:async()=>{writes++;return true;},alert(){},drawInvoices(){}});
  c.InvoiceTools={readSettings:async()=>{c.currentSession={user:{id:"different"}};return {companyName:"Original"};}};
   prepareSelection(c,inputs,store);
  vm.runInContext(html.slice(start,end),c);
  await c.makeInvoice(["BOOKING"]);
  assert.equal(writes,0);assert.equal(store.invoices.length,0);
});
test("PDF output preserves optional VAT and paid payment information",async()=>{
  const {buildInvoicePdf}=await import("../src/invoice-pdf.js");
  const data=buildInvoicePdf({invoiceNo:"INV-VAT",items:[],vatEnabled:true,vatPct:20,vatAmount:20,total:120,
    status:"Paid",paymentDate:"2030-01-02",paymentMethod:"Bank Transfer",paymentReference:"BANK-REF"},
    {companyName:"Company",showLogo:false},{}).output();
  assert.match(data,/20.00%/);assert.match(data,/BANK-REF/);assert.match(data,/Paid/);
});
test("both Admin and Client registers expose real PDF downloads and Client back navigation stays scoped",()=>{
  assert.match(html.slice(html.indexOf("function drawClientInvoices("),html.indexOf("function drawClientReports(")),/downloadInvoicePdf/);
  assert.match(html.slice(html.indexOf("function drawInvoices("),html.indexOf("async function saveInvoiceSettings(")),/downloadInvoicePdf/);
  assert.match(html,/onclick="backToInvoices\(\)"/);
});
test("Client Back navigation is not shadowed by the button's built-in ARIA role property",()=>{
  const start=html.indexOf("function backToInvoices("),end=html.indexOf("function viewInvoice(",start);
  let destination;
  const c=vm.createContext({role:"client",go:page=>{destination=page;}});
  vm.runInContext(html.slice(start,end),c);
  // Inline handlers resolve button.role before the portal's global `role`.
  // The actual role lookup must happen inside the normal function instead.
  const click=vm.runInContext("(function(){with(this){backToInvoices();}})",c);
  click.call({role:""});
  assert.equal(destination,"clientInvoices");
  c.role="admin";click.call({role:""});
  assert.equal(destination,"invoices");
});
test("Client and Driver cannot render the Admin invoice editor via a stale page value",()=>{
  const start=html.indexOf("function drawInvoices("),end=html.indexOf("async function saveInvoiceSettings(",start);
  let clientCalls=0;const panel={innerHTML:""};
  const c=vm.createContext({role:"client",drawClientInvoices:()=>{clientCalls++;}});
  vm.runInContext(html.slice(start,end),c);
  c.drawInvoices(panel);assert.equal(clientCalls,1);
  c.role="driver";c.drawInvoices(panel);
  assert.match(panel.innerHTML,/Access Restricted/);
  assert.doesNotMatch(panel.innerHTML,/Invoice Company/);
});
