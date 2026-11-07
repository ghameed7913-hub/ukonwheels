/* Invoice receipts come from current paid invoices, never accumulated payment attempts. */
window.ReceiptLedger=(()=>{
 "use strict";
 const number=v=>Number.isFinite(Number(v))?Number(v):0;
 const active=t=>!["reversed","void","voided","cancelled","canceled"].includes(String(t.status||"").toLowerCase());
 const invoiceTransaction=t=>t.type==="Invoice Payment"||!!t.invoiceNo||/^INV-/i.test(String(t.bookingRef||""));
 function rows(store){
  const invoices=new Map((store.invoices||[]).filter(i=>i.invoiceNo).map(i=>[i.invoiceNo,i]));
  const invoicedBookings=new Set([...invoices.values()].flatMap(i=>(i.items||[]).map(it=>it.ref)));
  const bookings=new Map((store.bookings||[]).map(b=>[b.ref,b]));
  const payments=[],direct=new Map();
  for(const t of store.transactions||[]){
   if(!active(t)||invoices.has(t.bookingRef)||invoiceTransaction(t)||invoicedBookings.has(t.bookingRef))continue;
   const booking=bookings.get(t.bookingRef);
   if(booking){
    if(booking.paymentStatus!=="Paid"||booking.invoiceNo)continue;
    // The current booking payment replaces an earlier entry for that booking.
    direct.set(t.bookingRef,{...t,amount:number(t.amount)});
   }else payments.push({...t,amount:number(t.amount)});
  }
  payments.push(...direct.values());
  for(const invoice of invoices.values()){
   if(invoice.status!=="Paid")continue;
   const legacy=(store.transactions||[]).filter(t=>active(t)&&t.bookingRef===invoice.invoiceNo).at(-1);
   payments.push({
    date:invoice.paymentDate||legacy?.date||"",bookingRef:invoice.invoiceNo,business:invoice.business,
    method:invoice.paymentMethod||legacy?.method||"Not recorded",
    amount:number(invoice.paidAmount||invoice.total),bankReference:invoice.paymentReference||legacy?.bankReference||"",
    status:"Cleared",type:"Invoice Payment"
   });
  }
  return payments;
 }
 function total(store,method){return rows(store).filter(t=>t.method===method).reduce((sum,t)=>sum+Math.round(number(t.amount)*100),0)/100}
 const allowed=()=>!!currentSession?.user?.id&&(role==="admin"||(role==="staff"&&hasPermission("accounts")));
 const pending=new Set();
 async function change(invoice,action,payment={}){
  if(!allowed())throw Error("Accounts management permission is required.");
  if(!SUPABASE_CONFIGURED)throw Error("Connect the saved portal database before changing invoice payments.");
  if(pending.has(invoice.invoiceNo))return null;
  pending.add(invoice.invoiceNo);
  const actor=currentSession.user.id;
  try{
   if(sharedSavePending||sharedSaveInFlight)if(!await flushSharedStore())throw Error("Save pending portal changes before changing this invoice.");
   if(currentSession?.user?.id!==actor)throw Error("Your sign-in changed. Reload the invoice.");
   const result=await sb.rpc("change_portal_invoice_payment",{
    p_invoice_no:invoice.invoiceNo,p_expected:invoice,p_action:action,p_payment:payment
   });
   if(result.error)throw Error(result.error.message+((["PGRST202","42883"].includes(result.error.code))?" Ask Admin to run supabase/invoice-payment-reconciliation.sql.":""));
   if(currentSession?.user?.id!==actor)throw Error("Your sign-in changed. Reload to check the payment.");
   const data=result.data;
   if(data?.invoice?.invoiceNo!==invoice.invoiceNo||!Array.isArray(data.transactions)||!Array.isArray(data.bookings))throw Error("The server did not confirm the payment change. Reload before retrying.");
   const store=getStore(),index=store.invoices.findIndex(i=>i.invoiceNo===invoice.invoiceNo);
   if(index>=0)store.invoices[index]=data.invoice;
   store.transactions=data.transactions;
   for(const patch of data.bookings){
    const b=store.bookings.find(b=>b.ref===patch.ref);
    if(b)Object.assign(b,patch);
   }
   return data;
  }finally{pending.delete(invoice.invoiceNo)}
 }
 return {rows,total,change,allowed};
})();
