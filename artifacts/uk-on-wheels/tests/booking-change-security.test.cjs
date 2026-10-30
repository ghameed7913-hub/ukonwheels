const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function part(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));}
function setup(){
 const b={ref:"B1",amount:171.56,destination:"London",miles:10,status:"Picked Up"};
 const s={bookings:[b],updateRequests:[]},calls=[],messages=[];
 const fields={newAmountValue:{value:"200"},newDestinationValue:{value:"Leeds"}};
 const c=vm.createContext({
  currentSession:{user:{id:"operator"}},storeReady:true,role:"staff",hasPermission:()=>true,
  sharedSavePending:false,sharedSaveInFlight:false,STORE_CACHE:s,
   getStore:()=>c.STORE_CACHE,document:{getElementById:id=>fields[id]},
  alert:m=>messages.push(m),crmConfirm:async()=>true,
  lookupAmountBooking(){},lookupDestinationBooking(){},
   sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:{saved:true,booking:{...b,...args.p_changes}}};}}
 });
 vm.runInContext([
   part("const bookingChangeSubmissions=","function drawStatus("),
  part("async function saveAmountUpdate(","function drawDestinationUpdate("),
  part("async function saveDestinationUpdate(","function evidenceSection(")
 ].join("\n"),c);
 return {b,s,c,calls,messages,fields};
}
test("Update Amount saves the charge immediately without creating an approval",async()=>{
 const x=setup();await x.c.saveAmountUpdate("B1");
 assert.equal(x.c.STORE_CACHE.bookings[0].amount,200);assert.equal(x.c.STORE_CACHE.bookings[0].destination,"London");
 assert.equal(x.calls[0].name,"save_booking_changes");
 assert.equal(x.calls[0].args.p_changes.amount,200);
 assert.equal(x.s.updateRequests.length,0);
 assert.match(x.messages[0],/Amount saved successfully/);
});
test("Update Destination saves immediately while keeping the charge",async()=>{
 const x=setup();await x.c.saveDestinationUpdate("B1");
 assert.equal(x.c.STORE_CACHE.bookings[0].destination,"Leeds");assert.equal(x.c.STORE_CACHE.bookings[0].amount,171.56);
 assert.equal(x.calls[0].args.p_changes.destination,"Leeds");
 assert.match(x.messages[0],/Destination saved successfully/);
});
test("invalid, unchanged, cancelled and unauthorized requests never reach the server",async()=>{
 for(const value of ["","-1","not-a-number","171.56"]){
  const x=setup();x.fields.newAmountValue.value=value;await x.c.saveAmountUpdate("B1");assert.equal(x.calls.length,0);
 }
 const x=setup();x.c.crmConfirm=async()=>false;await x.c.saveDestinationUpdate("B1");assert.equal(x.calls.length,0);
 x.c.role="driver";await x.c.saveAmountUpdate("B1");assert.equal(x.calls.length,0);
});
test("destination-only Operations access can save addresses but cannot save amounts",async()=>{
 const x=setup();x.c.hasPermission=key=>key==="destination";
 await x.c.saveDestinationUpdate("B1");assert.equal(x.calls.length,1);
 await x.c.saveAmountUpdate("B1");assert.equal(x.calls.length,1);
 assert.match(x.messages.at(-1),/permission/);
});
test("failed saves and session changes never update local values or claim success",async()=>{
 const x=setup();x.c.sb.rpc=async()=>({error:{code:"PGRST202",message:"missing"}});
 await x.c.saveAmountUpdate("B1");assert.equal(x.s.updateRequests.length,0);
 assert.match(x.messages[0],/booking-direct-updates.sql/);assert.equal(x.b.amount,171.56);
 x.messages.length=0;x.c.sb.rpc=async()=>{x.c.currentSession={user:{id:"other"}};
  return {data:{request:{id:"R2",status:"Pending Approval"}}};};
 await x.c.saveDestinationUpdate("B1");assert.equal(x.s.updateRequests.length,0);
 assert.match(x.messages[0],/sign-in changed/);
});
test("repeat clicks save once and a later edit merges confirmed values",async()=>{
 const x=setup();let finish;
 x.c.sb.rpc=async(name,args)=>{x.calls.push({name,args});await new Promise(r=>finish=r);
  return {data:{saved:true,booking:{...x.b,...args.p_changes}}};};
 const first=x.c.saveBookingChanges(x.b,{amount:200});
 await new Promise(r=>setImmediate(r));
 assert.equal(await x.c.saveBookingChanges(x.b,{amount:200}),false);
 finish();assert.equal(await first,true);assert.equal(x.calls.length,1);
 x.c.sb.rpc=async()=>({data:{saved:true,booking:{...x.b,amount:210}}});
 await x.c.saveBookingChanges(x.c.STORE_CACHE.bookings[0],{amount:210});
 assert.equal(x.c.STORE_CACHE.bookings[0].amount,210);assert.equal(x.s.updateRequests.length,0);
});
test("Edit Booking, legacy controls and Single Update all use secure immediate saves",()=>{
 const edit=part("async function editBooking(","async function persistNormalizedStatus(");
 assert.match(edit,/saveBookingChanges\(b,changes/);
 assert.doesNotMatch(edit,/requestBookingChange|sb\.rpc|saveStore/);
 const manual=part("async function confirmManualUpdate(","function ensureInvoiceSettings(");
 assert.match(manual,/saveBookingChanges\(b,\{\[field\]:newValue\}/);
 const single=part("async function submitSingleBookingUpdate(","const bookingChangeSubmissions=");
 assert.match(single,/saveBookingChanges/);assert.doesNotMatch(single,/saveStore/);
 const create=part("async function createLinkedBooking(","function toggleCustomerTypeFields(");
 assert.match(create,/p_amount:Number\(booking.amount\|\|0\)/);
});
