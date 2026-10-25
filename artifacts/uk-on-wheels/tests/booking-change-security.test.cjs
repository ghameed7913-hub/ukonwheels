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
  getStore:()=>s,document:{getElementById:id=>fields[id]},
  alert:m=>messages.push(m),crmConfirm:async()=>true,
  lookupAmountBooking(){},lookupDestinationBooking(){},
  sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:{request:{
   id:"R1",bookingRef:b.ref,status:"Pending Approval",changes:{...args.p_changes}
  }}};}}
 });
 vm.runInContext([
  part("const bookingChangeSubmissions=","function drawUpdateApprovals("),
  part("async function saveAmountUpdate(","function drawDestinationUpdate("),
  part("async function saveDestinationUpdate(","function evidenceSection(")
 ].join("\n"),c);
 return {b,s,c,calls,messages,fields};
}
test("Update Amount queues the proposal without changing the creation charge",async()=>{
 const x=setup();await x.c.saveAmountUpdate("B1");
 assert.equal(x.b.amount,171.56);assert.equal(x.b.destination,"London");
 assert.equal(x.calls[0].name,"request_booking_change");
 assert.equal(x.calls[0].args.p_changes.amount,200);
 assert.equal(x.s.updateRequests[0].status,"Pending Approval");
 assert.match(x.messages[0],/current charge has not changed/);
});
test("Update Destination queues the address without changing the saved booking",async()=>{
 const x=setup();await x.c.saveDestinationUpdate("B1");
 assert.equal(x.b.destination,"London");assert.equal(x.b.amount,171.56);
 assert.equal(x.calls[0].args.p_changes.destination,"Leeds");
 assert.match(x.messages[0],/current address has not changed/);
});
test("invalid, unchanged, cancelled and unauthorized requests never reach the server",async()=>{
 for(const value of ["","-1","not-a-number","171.56"]){
  const x=setup();x.fields.newAmountValue.value=value;await x.c.saveAmountUpdate("B1");assert.equal(x.calls.length,0);
 }
 const x=setup();x.c.crmConfirm=async()=>false;await x.c.saveDestinationUpdate("B1");assert.equal(x.calls.length,0);
 x.c.role="driver";await x.c.saveAmountUpdate("B1");assert.equal(x.calls.length,0);
});
test("destination-only Operations access can request addresses but cannot request amounts",async()=>{
 const x=setup();x.c.hasPermission=key=>key==="destination";
 await x.c.saveDestinationUpdate("B1");assert.equal(x.calls.length,1);
 await x.c.saveAmountUpdate("B1");assert.equal(x.calls.length,1);
 assert.match(x.messages.at(-1),/permission/);
});
test("failed saves and session changes do not apply proposals or claim success",async()=>{
 const x=setup();x.c.sb.rpc=async()=>({error:{code:"PGRST202",message:"missing"}});
 await x.c.saveAmountUpdate("B1");assert.equal(x.s.updateRequests.length,0);
 assert.match(x.messages[0],/booking-change-security.sql/);assert.equal(x.b.amount,171.56);
 x.messages.length=0;x.c.sb.rpc=async()=>{x.c.currentSession={user:{id:"other"}};
  return {data:{request:{id:"R2",status:"Pending Approval"}}};};
 await x.c.saveDestinationUpdate("B1");assert.equal(x.s.updateRequests.length,0);
 assert.match(x.messages[0],/sign-in changed/);
});
test("repeat clicks submit once, and a later retry merges the confirmed request once",async()=>{
 const x=setup();let finish;
 x.c.sb.rpc=async(name,args)=>{x.calls.push({name,args});await new Promise(r=>finish=r);
  return {data:{request:{id:"R1",status:"Pending Approval"}}};};
 const first=x.c.requestBookingChange(x.b,{amount:200});
 await new Promise(r=>setImmediate(r));
 assert.equal(await x.c.requestBookingChange(x.b,{amount:200}),false);
 finish();assert.equal(await first,true);assert.equal(x.calls.length,1);
 x.c.sb.rpc=async()=>({data:{request:{id:"R1",status:"Pending Approval"}}});
 await x.c.requestBookingChange(x.b,{amount:200});assert.equal(x.s.updateRequests.length,1);
});
test("Edit Booking and legacy manual controls submit protected changes before any direct write",()=>{
 const edit=part("async function editBooking(","async function persistNormalizedStatus(");
 assert.ok(edit.indexOf("requestBookingChange")<edit.indexOf('sb.rpc("admin_update_booking_details"'));
 const manual=part("async function confirmManualUpdate(","function ensureInvoiceSettings(");
 assert.match(manual,/if\(field==="amount"\|\|field==="destination"\)[\s\S]*requestBookingChange[\s\S]*return;/);
 const single=part("async function submitSingleBookingUpdate(","const bookingChangeSubmissions=");
 assert.match(single,/requestBookingChange/);assert.doesNotMatch(single,/saveStore/);
 const create=part("async function createLinkedBooking(","function toggleCustomerTypeFields(");
 assert.match(create,/p_amount:Number\(booking.amount\|\|0\)/);
});
