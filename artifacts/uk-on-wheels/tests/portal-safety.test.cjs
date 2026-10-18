const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function part(a,b){const start=html.indexOf(a),end=html.indexOf(b,start);assert.ok(start>=0&&end>start,a);return html.slice(start,end)}

for(const role of ["client","driver"]){
 test(`${role} startup uses its private RPC and never requests the operations row`,async()=>{
  let reads=0,timer;
  const context=vm.createContext({SUPABASE_CONFIGURED:true,role,sharedStoreChannel:null,
   scopedStoreTimer:null,currentSession:{user:{id:role}},STORE_CACHE:null,storeReady:false,
   setInterval:fn=>(timer=fn,1),clearInterval(){},
   sb:{rpc:async name=>{assert.equal(name,"read_own_portal_store");reads++;return{data:{invoices:[],staffUsers:[],payslips:[],holidays:[]}}},
    from(){throw Error("No shared-store access is allowed")}},
   getStore(){return context.STORE_CACHE},refreshPortalSafely(){},renderSharedSaveNotice(){},console});
  vm.runInContext(part("async function initStoreFromSupabase(","function defaults("),context);
  await context.initStoreFromSupabase({role,id:role});
  assert.equal(context.storeReady,true);assert.equal(reads,1);
  context.STORE_CACHE.bookings.push({ref:"OWN"});
  await timer();assert.equal(reads,2);assert.equal(context.STORE_CACHE.bookings[0].ref,"OWN");
  context.currentSession.user.id="another-account";
  await timer();assert.equal(reads,2);
 });
 test(`${role} view refreshes cannot overwrite the operations snapshot`,async()=>{
  const context=vm.createContext({SUPABASE_CONFIGURED:true,role,window:{dispatchEvent(){}},Event:class{},
   sb:{from(){throw Error("No shared-store writes are allowed")}}});
  vm.runInContext(part("function saveStore(","function renderSharedSaveNotice("),context);
  assert.equal(await context.saveStore({bookings:[]}),true);
 });
}

test("Missing private RPC fails closed instead of falling back to the shared row",async()=>{
 const context=vm.createContext({SUPABASE_CONFIGURED:true,role:"client",sharedStoreChannel:null,console:{error(){}},
  sb:{rpc:async()=>({error:{message:"RPC not installed"}}),from(){throw Error("Shared read forbidden")}}});
 vm.runInContext(part("async function initStoreFromSupabase(","function defaults("),context);
 await assert.rejects(context.initStoreFromSupabase({role:"client"}),/portal-safety-fixes.sql/);
 assert.equal(context.storeReady,false);
});

function bookingFixture(){
 const values={veh:"Ford Focus",reg:"AB12XYZ",pickup:"Leeds",dest:"York",receiver:"Receiver",mobile:"07000000000",
  miles:"88",bdate:"2030-03-04",ddate:"2030-03-05",dropoff:"17:00",notes:"Detailed notes"};
 const requests=[],notices=[];let fail=false;
 const context=vm.createContext({crypto:require("node:crypto").webcrypto,SUPABASE_CONFIGURED:true,
  currentSession:{user:{id:"client"}},role:"client",currentUser:{name:"Client",accountType:"private"},
  getStore:()=>({bookings:[]}),document:{getElementById:id=>id in values?{value:values[id]}:null},
  sb:{rpc:async(name,args)=>{requests.push({name,args});return fail?{error:{message:"Unavailable"}}:{data:{id:"booking"}}}},
  loadNormalizedPortalData:async()=>{},render(){},alert:text=>notices.push(text)});
 vm.runInContext(part("async function submitBooking(","function drawBusinesses("),context);
 return{context,requests,values,fail:()=>{fail=true},notices};
}
test("Single Client booking sends every date, miles, deadline and notes through the rich booking contract",async()=>{
 const {context,requests}=bookingFixture();await context.submitBooking();
 assert.equal(requests[0].name,"client_create_bulk_booking");
 const {p_reference,p_booking}=requests[0].args;
 assert.match(p_reference,/^UKOW-\d{4}-[A-F0-9]{32}$/);
 assert.equal(p_booking.bookingDate,"2030-03-04");assert.equal(p_booking.deliveryDate,"2030-03-05");
 assert.equal(p_booking.dropoffTill,"17:00");assert.equal(p_booking.miles,88);assert.equal(p_booking.notes,"Detailed notes");
 assert.equal(p_booking.customerType,"Private");assert.equal(p_booking._businessId,null);
});
test("A failed Client booking keeps the same reference when retried",async()=>{
 const {context,requests,fail}=bookingFixture();fail();await context.submitBooking();await context.submitBooking();
 assert.equal(requests[0].args.p_reference,requests[1].args.p_reference);
});

test("Underpayment does not mark an invoice or any of its jobs paid",async()=>{
 const invoice={invoiceNo:"I",total:120,status:"Unpaid",items:[{ref:"B",charge:100}]},booking={ref:"B",paymentStatus:"Pending"};
 let writes=0;const notices=[];
 const values={invoicePaidDate:"2030-03-04",invoicePaidMethod:"Cash",invoicePaidRef:"",invoicePaidAmount:"1"};
 const context=vm.createContext({ensureAccountsData:()=>({invoices:[invoice],bookings:[booking]}),
  document:{getElementById:id=>({value:values[id]})},alert:text=>notices.push(text),
  persistBookingPayment:async()=>{writes++;return true},saveStore(){writes++}});
 vm.runInContext(part("async function markInvoicePaid(","async function reopenInvoice("),context);
 await context.markInvoicePaid("I");assert.equal(writes,0);assert.equal(invoice.status,"Unpaid");
 assert.equal(booking.paymentStatus,"Pending");assert.match(notices[0],/not fully paid/);
});
test("A rejected server settlement leaves the invoice and cache unchanged",async()=>{
 const invoice={invoiceNo:"I",total:120,status:"Unpaid"},requests=[],notices=[];
 const values={invoicePaidDate:"2030-03-04",invoicePaidMethod:"Cash",invoicePaidRef:"",invoicePaidAmount:"120"};
 const context=vm.createContext({SUPABASE_CONFIGURED:true,ensureAccountsData:()=>({invoices:[invoice]}),
  document:{getElementById:id=>({value:values[id]})},alert:text=>notices.push(text),
  sb:{rpc:async(name,args)=>{requests.push({name,args});return{error:{message:"Permission denied"}}}},
  saveStore(){throw Error("Cannot save rejected payment")}});
 vm.runInContext(part("async function markInvoicePaid(","async function reopenInvoice("),context);
 await context.markInvoicePaid("I");assert.equal(invoice.status,"Unpaid");
 assert.equal(requests[0].name,"settle_portal_invoice");assert.match(notices[0],/not saved/);
});
test("Rejected account edits do not change the displayed saved user or claim success",async()=>{
 const user={id:"u",name:"Old Name",email:"old@example.invalid",role:"Staff",status:"Active",permissions:[]};
 const values={euFirstName:"New",euLastName:"Name",euEmail:"new@example.invalid",euRole:"Driver",euStatus:"Inactive"};
 const notices=[],requests=[];
 const context=vm.createContext({SUPABASE_CONFIGURED:true,role:"admin",currentSession:{user:{id:"admin"}},
  ensureStaffUsers:()=>({staffUsers:[user]}),document:{getElementById:id=>({value:values[id]||"",files:[]})},
  defaultPermissionsForRole:()=>[],serverPermissionKeys:()=>[],
  sb:{rpc:async(name,args)=>{requests.push({name,args});return{error:{message:"Not allowed"}}}},
  alert:text=>notices.push(text),saveStore(){throw Error("No optimistic save")}});
 vm.runInContext(part("async function saveUserInformationChanges(","function toggleVisaFields("),context);
 await context.saveUserInformationChanges(0);assert.equal(user.name,"Old Name");assert.equal(user.role,"Staff");
 assert.equal(requests[0].name,"admin_edit_portal_user");assert.match(notices[0],/not saved/);
});
