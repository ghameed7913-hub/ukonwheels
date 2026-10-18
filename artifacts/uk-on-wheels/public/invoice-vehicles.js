(function(){
 "use strict";
 function dateOnly(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return "";
  const d=new Date(value+"T00:00:00Z");
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:"";
 }
 function deliveryDay(booking){
  const value=booking._deliveredAt||booking.deliveredAt||booking.deliveryEvidence?.deliveredAt;
  if(!value)return "";
  if(dateOnly(value))return value;
  if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(String(value)))return "";
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return "";
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const part=type=>parts.find(p=>p.type===type).value;
  return part("year")+"-"+part("month")+"-"+part("day");
 }
 function readRange(doc){
  const client=doc.getElementById("invBiz")?.value||"";
  const from=doc.getElementById("invDeliveredFrom")?.value||"";
  const to=doc.getElementById("invDeliveredTo")?.value||"";
  if(!client)throw new Error("Select a client.");
  if(!dateOnly(from)||!dateOnly(to))throw new Error("Choose both Delivered from and Delivered to dates.");
  if(from>to)throw new Error("Delivered from must be on or before Delivered to.");
  return {client,from,to,key:JSON.stringify([client,from,to])};
 }
 function eligible(booking,range){
  const day=deliveryDay(booking);
  return booking.business===range.client&&booking.status==="Delivered"&&
   booking.paymentStatus!=="Paid"&&!booking.invoiceNo&&!!day&&day>=range.from&&day<=range.to;
 }
 function matching(bookings,range){
  return bookings.filter(b=>eligible(b,range)).sort((a,b)=>deliveryDay(a).localeCompare(deliveryDay(b))||String(a.ref).localeCompare(String(b.ref)));
 }
 function validate(items,bookings,range){
  for(const item of items){
   const booking=bookings.find(b=>b.ref===item.ref);
   if(!booking||!eligible(booking,range))throw new Error("Vehicle "+item.ref+" is no longer available for this client and delivery period. Reload the delivered vehicles.");
   if(!Number.isFinite(item.charge)||item.charge<0)throw new Error("Enter a valid charge of zero or more for vehicle "+item.ref+".");
  }
 }
 window.InvoiceVehicles={deliveryDay,readRange,eligible,matching,validate};
})();
