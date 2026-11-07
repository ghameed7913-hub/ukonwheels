const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const code=fs.readFileSync(path.join(__dirname,"../public/receipt-ledger.js"),"utf8");
const invoice=(overrides={})=>({invoiceNo:"INV-1",status:"Paid",business:"Movex",total:120,paidAmount:120,
 paymentDate:"2026-11-07",paymentMethod:"Bank Transfer",paymentReference:"BANK",
 items:[{ref:"JOB",charge:100}],...overrides});
const tx=(overrides={})=>({bookingRef:"INV-1",method:"Bank Transfer",amount:120,status:"Cleared",type:"Invoice Payment",...overrides});
function setup(store={invoices:[invoice()],bookings:[],transactions:[]}){
 const calls=[],alerts=[];
 const c=vm.createContext({window:{},role:"admin",currentSession:{user:{id:"admin"}},SUPABASE_CONFIGURED:true,
  sharedSavePending:null,sharedSaveInFlight:null,hasPermission:()=>false,flushSharedStore:async()=>true,
  getStore:()=>store,ensureAccountsData:()=>store,alert:v=>alerts.push(v),
  document:{getElementById:()=>({})},drawInvoices(){},crmConfirm:async()=>true,
  sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:{
   invoice:{...store.invoices[0],status:args.p_action==="settle"?"Paid":"Unpaid",paidAmount:args.p_action==="settle"?args.p_payment.amount:0},
   transactions:[],bookings:[{ref:"JOB",paymentStatus:args.p_action==="settle"?"Paid":"Pending",paidAmount:0,paidDate:"",paymentMethod:"Invoice"}]
  }}}}});
 vm.runInContext(code,c);c.ReceiptLedger=c.window.ReceiptLedger;
 return {c,api:c.ReceiptLedger,store,calls,alerts};
}
test("old duplicate bank receipts count exactly once using the current paid invoice",()=>{
 const s=setup({invoices:[invoice()],bookings:[],transactions:[tx(),tx(),tx({amount:999})]});
 assert.equal(s.api.total(s.store,"Bank Transfer"),120);
 assert.equal(s.api.rows(s.store).length,1);
 assert.equal(s.api.rows(s.store)[0].bankReference,"BANK");
});
test("reopened invoices immediately contribute zero to both bank and cash despite old receipt rows",()=>{
 for(const method of ["Bank Transfer","Cash"]){
  const s=setup({invoices:[invoice({status:"Unpaid",paidAmount:0,paymentMethod:""})],bookings:[],transactions:[tx({method})]});
  assert.equal(s.api.total(s.store,"Bank Transfer"),0);assert.equal(s.api.total(s.store,"Cash"),0);
 }
});
test("reopen, amend and repay changes methods and counts only the new exact invoice amount",()=>{
 const s=setup({invoices:[invoice()],bookings:[],transactions:[tx()]});
 assert.equal(s.api.total(s.store,"Bank Transfer"),120);
 Object.assign(s.store.invoices[0],{status:"Unpaid",paidAmount:0,total:85});
 assert.equal(s.api.total(s.store,"Bank Transfer"),0);
 Object.assign(s.store.invoices[0],{status:"Paid",paidAmount:85,paymentMethod:"Cash",paymentReference:""});
 s.store.transactions.push(tx({method:"Cash",amount:85}));
 assert.equal(s.api.total(s.store,"Bank Transfer"),0);assert.equal(s.api.total(s.store,"Cash"),85);
 Object.assign(s.store.invoices[0],{status:"Unpaid",paidAmount:0});
 assert.equal(s.api.total(s.store,"Cash"),0);
 Object.assign(s.store.invoices[0],{status:"Paid",total:90,paidAmount:90,paymentMethod:"Bank Transfer"});
 assert.equal(s.api.total(s.store,"Cash"),0);assert.equal(s.api.total(s.store,"Bank Transfer"),90);
});
test("direct booking receipts remain separate and invoice vehicles cannot double count",()=>{
 const store={invoices:[invoice()],bookings:[{ref:"JOB",paymentStatus:"Paid",invoiceNo:"INV-1"},{ref:"DIRECT",paymentStatus:"Paid"}],
  transactions:[tx(),tx({bookingRef:"JOB",type:"",amount:100}),tx({bookingRef:"DIRECT",type:"",amount:20}),
   tx({bookingRef:"DIRECT",type:"",amount:25}),tx({bookingRef:"MANUAL",type:"",method:"Cash",amount:10}),
   tx({bookingRef:"VOID",type:"",amount:1000,status:"Reversed"})]};
 const s=setup(store);
 assert.equal(s.api.total(store,"Bank Transfer"),145);
 assert.equal(s.api.total(store,"Cash"),10);
 assert.equal(s.api.rows(store).filter(t=>t.bookingRef==="DIRECT").length,1);
});
test("paid invoice receipts use the same paid amount as paid invoice history, including legacy metadata",()=>{
 const s=setup({invoices:[invoice({paidAmount:125}),invoice({invoiceNo:"INV-2",paidAmount:0,total:20,paymentMethod:"Cash"}),
  invoice({invoiceNo:"INV-3",paymentMethod:"Card",paidAmount:30})],bookings:[],transactions:[]});
 assert.equal(s.api.total(s.store,"Bank Transfer"),125);assert.equal(s.api.total(s.store,"Cash"),20);
 assert.equal(s.api.rows(s.store).length,3);
});
test("unmatched historical invoice attempts and invalid/reversed entries do not inflate totals",()=>{
 const s=setup({invoices:[],bookings:[],transactions:[tx(),tx({bookingRef:"UNKNOWN",amount:999}),tx({bookingRef:"PLAIN",type:"",amount:"invalid"})]});
 assert.equal(s.api.total(s.store,"Bank Transfer"),0);
});
test("RPC confirms reopen and synchronises the invoice, linked bookings and receipts without whole-store save",async()=>{
 const s=setup();s.store.bookings.push({ref:"JOB",paymentStatus:"Paid",amount:100});
 const result=await s.api.change(structuredClone(s.store.invoices[0]),"reopen");
 assert.equal(s.calls[0].name,"change_portal_invoice_payment");
 assert.equal(s.calls[0].args.p_expected.status,"Paid");
 assert.equal(result.invoice.status,"Unpaid");assert.equal(s.store.invoices[0].status,"Unpaid");
 assert.equal(s.store.bookings[0].paymentStatus,"Pending");assert.equal(s.store.bookings[0].amount,100);
 assert.equal(s.api.total(s.store,"Bank Transfer"),0);
});
test("permission, server failure and changed-session responses never pretend payment changed",async()=>{
 for(const role of ["client","driver","staff"]){
  const s=setup();s.c.role=role;await assert.rejects(s.api.change(invoice(),"reopen"),/permission/);assert.equal(s.calls.length,0);
 }
 const s=setup();s.c.sb.rpc=async()=>({error:{code:"PGRST202",message:"Missing RPC"}});
 await assert.rejects(s.api.change(invoice(),"reopen"),/invoice-payment-reconciliation.sql/);
 assert.equal(s.store.invoices[0].status,"Paid");
 s.c.sb.rpc=async()=>{s.c.currentSession.user.id="other";return {data:{invoice:invoice({status:"Unpaid"}),transactions:[],bookings:[]}}};
 await assert.rejects(s.api.change(invoice(),"reopen"),/sign-in changed/);
 assert.equal(s.store.invoices[0].status,"Paid");
});
test("actual Reopen handler uses the confirmed RPC rather than leaving old receipt rows active",async()=>{
 const s=setup();vm.runInContext(html.slice(html.indexOf("async function reopenInvoice("),html.indexOf("function loadInvoiceVehicles(")),s.c);
 await s.c.reopenInvoice("INV-1");
 assert.equal(s.calls[0].args.p_action,"reopen");assert.equal(s.store.invoices[0].status,"Unpaid");
});
test("cash/bank cards, transaction register and date-range reports use one receipt definition",()=>{
 assert.match(html,/const cash=ReceiptLedger.total\(s,"Cash"\)/);
 assert.match(html,/const bank=ReceiptLedger.total\(s,"Bank Transfer"\)/);
 assert.match(html,/ReceiptLedger.rows\(s\).slice\(\).reverse\(\)/);
 assert.match(html,/ReceiptLedger.rows\(s\).filter\(x=>x.method==="Cash"/);
 assert.match(html,/ReceiptLedger.rows\(s\).filter\(x=>x.method==="Bank Transfer"/);
 assert.match(html,/Enter the exact invoice total before marking it Paid/);
 assert.match(html,/Record its payment through Invoices/);
});
