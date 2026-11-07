const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const code=fs.readFileSync(path.join(__dirname,"../public/invoice-editor.js"),"utf8");
const original={invoiceNo:"INV-EDIT",business:"Movex",date:"2026-11-01",dueDate:"2026-11-30",status:"Unpaid",
 items:[{ref:"UKOW1",vehicle:"Ford",reg:"AB12 CDE",charge:100},{ref:"UKOW2",vehicle:"VW",reg:"EF34 GHI",charge:50}],
 companyDetails:{companyName:"Original issuer",bankAccountNumber:"original"},subtotal:150,
 vatEnabled:true,vatPct:20,vatAmount:30,extraPhrasal:0,otherCharges:0,extraTotal:0,total:180};
function values(){return {date:"2026-11-02",dueDate:"2026-12-02",
 billTo:{name:"Movex",address:"Correct address",postcode:"AA1 1AA",email:"",phone:"",vatNumber:"",companyReg:""},
 charges:["110.10","50.20"],vatEnabled:false,vatPct:"20",extraPhrasal:"10",otherCharges:"5.50",
 otherDescription:"Corrected extra charge",reason:"Corrected vehicle charges"}}
function setup(){
 const store={invoices:[structuredClone(original)]},calls=[];
 const c=vm.createContext({window:{},role:"admin",currentSession:{user:{id:"admin"}},
  hasPermission:()=>false,SUPABASE_CONFIGURED:true,sharedSavePending:null,sharedSaveInFlight:null,
  flushSharedStore:async()=>true,getStore:()=>store,document:{getElementById:()=>null},
  sb:{rpc:async(name,args)=>{
   calls.push({name,args});
   return {data:{...original,...c.window.InvoiceEditor.validate(args.p_expected,args.p_values).revised,amendmentRevision:1}};
  }}});
 vm.runInContext(html.slice(html.indexOf("function calculateInvoiceTotals("),html.indexOf("async function makeInvoice(")),c);
 vm.runInContext(code,c);return {c,editor:c.window.InvoiceEditor,store,calls};
}
test("amendments recalculate line charges, optional VAT and extras without mutating the original",()=>{
 const {editor}=setup(),r=editor.validate(original,values()).revised;
 assert.equal(r.subtotal,160.3);assert.equal(r.vatAmount,0);assert.equal(r.total,175.8);
 assert.equal(r.invoiceNo,original.invoiceNo);assert.equal(r.business,original.business);
 assert.deepEqual(r.companyDetails,original.companyDetails);assert.equal(original.items[0].charge,100);
 assert.deepEqual(r.items.map(i=>i.ref),["UKOW1","UKOW2"]);
 const v=values();v.vatEnabled=true;v.vatPct=20;
 assert.equal(editor.validate(original,v).revised.total,207.86);
});
test("invalid amounts, dates, empty bills and missing reasons are rejected",()=>{
 const {editor}=setup();
 for(const bad of [-1,Infinity,NaN,"",0.001,"invalid",100000001]){
  const v=values();v.charges[0]=bad;assert.throws(()=>editor.validate(original,v),/Vehicle charge/);
 }
 for(const date of ["","2026-02-30","2026-13-01"]){
  const v=values();v.date=date;assert.throws(()=>editor.validate(original,v));
 }
 for(const update of [{dueDate:"2020-01-01"},{reason:""},{billTo:{name:""}},{charges:[]},{vatEnabled:true,vatPct:101}]){
  assert.throws(()=>editor.validate(original,{...values(),...update}));
 }
});
test("paid invoices accept billing corrections but reject charge, VAT and fee changes",()=>{
 const {editor}=setup(),paid={...original,status:"Paid",paidAmount:180,paymentReference:"BANK"};
 const v={...values(),charges:[100,50],vatEnabled:true,vatPct:20,extraPhrasal:0,otherCharges:0};
 const r=editor.validate(paid,v).revised;
 assert.equal(r.paidAmount,180);assert.equal(r.paymentReference,"BANK");assert.equal(r.total,180);
 assert.equal(r.billTo.address,"Correct address");
 for(const change of [{charges:[101,50]},{vatEnabled:false},{extraPhrasal:1},{otherCharges:1},{vatPct:21}])
  assert.throws(()=>editor.validate(paid,{...v,...change}),/paid/);
});
test("confirmed RPC amendment replaces only that invoice and is reused by register, view and PDF",async()=>{
 const {editor,store,calls}=setup();
 store.invoices.push({invoiceNo:"OTHER",total:999});
 const result=await editor.commit(structuredClone(original),values());
 assert.equal(calls[0].name,"amend_portal_invoice");
 assert.equal(calls[0].args.p_expected.invoiceNo,"INV-EDIT");
 assert.equal(result.amendmentRevision,1);assert.equal(store.invoices[0].total,175.8);
 assert.equal(store.invoices[1].total,999);
 assert.match(html,/InvoiceEditor\.action\(i\)/);
 assert.match(html,/InvoiceEditor\.action\(original\)/);
 assert.match(html,/invoice=store\.invoices\.find/);
});
test("failed or unconfirmed saves keep original invoice and expose the real error",async()=>{
 for(const reply of [{error:{code:"PGRST202",message:"Function missing"}},{data:{}},{error:{message:"Invoice changed"}}]){
  const {c,editor,store}=setup();c.sb.rpc=async()=>reply;
  await assert.rejects(editor.commit(structuredClone(original),values()),/invoice-amendments.sql|did not confirm|Invoice changed/);
  assert.equal(store.invoices[0].total,180);
 }
});
test("permission and session guards reject Clients, Drivers and report-only Staff",async()=>{
 const {c,editor,calls}=setup();
 for(const role of ["client","driver","staff"]){
  c.role=role;assert.equal(editor.action(original),"");
  await assert.rejects(editor.commit(original,values()),/permission/);
 }
 assert.equal(calls.length,0);
 c.role="staff";c.hasPermission=()=>true;assert.match(editor.action(original),/Edit Invoice/);
 c.sharedSavePending={};c.flushSharedStore=async()=>{c.currentSession.user.id="different";return true};
 await assert.rejects(editor.commit(original,values()),/sign-in changed/);
 assert.equal(calls.length,0);
});
test("a session change after server save never patches another account's cache",async()=>{
 const {c,editor,store}=setup();c.sb.rpc=async()=>{c.currentSession.user.id="other";return {data:{...original,amendmentRevision:1}}};
 await assert.rejects(editor.commit(original,values()),/sign-in changed/);
 assert.equal(store.invoices[0].total,180);
});
test("PDF generation consumes the amended invoice and billing snapshot",async()=>{
 const {buildInvoicePdf}=await import("../src/invoice-pdf.js");
 const {editor}=setup(),revised=editor.validate(original,values()).revised;
 const pdf=buildInvoicePdf(revised,{companyName:"Issuer",showLogo:false},revised.billTo).output();
 assert.match(pdf,/Correct address/);assert.match(pdf,/175.80/);assert.doesNotMatch(pdf,/VAT \(/);
});
