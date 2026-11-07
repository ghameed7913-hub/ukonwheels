const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const source=html.slice(html.indexOf("function driverJourneyEvents("),html.indexOf("function drawDriverJobsMobile("));
function render(status){
 const c=vm.createContext({
  escapeHtml:v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"),
  VehicleTrackingUI:{renderDriver:()=>""},SUPABASE_CONFIGURED:true,ico:()=>"",
  pickupSteps:()=>"<section>Pickup inspection</section>",
  onRouteSteps:()=>"<section>Start journey</section>",
  journeySteps:()=>"<section>Delivery evidence</section>"
 });
 vm.runInContext(source,c);
 const booking={_normalizedId:"saved",ref:"UKOW001",status,vehicle:"Test Vehicle",reg:"TEST1",
  receiver:"Test Receiver",receiverMobile:"07000000000",destination:"Test Delivery Address",
  pickup:"Collection address",miles:123,amount:987.65,paymentStatus:"Paid",price:987.65,
  tariff:2.5,profit:123,invoiceNumber:"SECRET-INVOICE",driverNotes:"Use gate 2",
  timeline:[{title:"On Route",text:"Journey started"},{title:"Amount updated",text:"New charge £987.65"},
   {title:"Payment received",text:"Paid in full"},{title:"Admin update",text:"Invoice SECRET-INVOICE"},
   {title:"Charge changed",text:"Price set to 987.65"}]};
 return c.driverMobileJobCard(booking);
}
for(const status of ["Driver Assigned","Picked Up","On Route","Delayed","Delivered"]){
 test(status+": Driver receiver details contain only name, mobile and delivery address",()=>{
  const result=render(status);
  const details=result.match(/<summary>Receiver & booking details<\/summary>([\s\S]*?)<\/details>/)[1];
  assert.match(details,/Test Receiver/);assert.match(details,/07000000000/);assert.match(details,/Test Delivery Address/);
  assert.equal((details.match(/<b>/g)||[]).length,3);
  assert.doesNotMatch(details,/Miles|Amount|Payment|£|987\.65|SECRET-INVOICE/);
  assert.doesNotMatch(result,/987\.65|SECRET-INVOICE|Paid in full|Amount updated|Payment received/);
  assert.match(result,/Journey started/);assert.match(result,/Use gate 2/);
 });
}
test("Receiver details are escaped instead of rendering supplied HTML",()=>{
 const c=vm.createContext({
  escapeHtml:v=>String(v).replaceAll("<","&lt;").replaceAll(">","&gt;"),
  VehicleTrackingUI:{renderDriver:()=>""},SUPABASE_CONFIGURED:true,ico:()=>"",pickupSteps:()=>""
 });
 vm.runInContext(source,c);
 const page=c.driverMobileJobCard({_normalizedId:"id",status:"Driver Assigned",receiver:"<img src=x>",destination:"<script>alert(1)</script>"});
 const details=page.match(/<summary>Receiver & booking details<\/summary>([\s\S]*?)<\/details>/)[1];
 assert.doesNotMatch(details,/<img|<script/);
 assert.match(details,/&lt;img/);
});
