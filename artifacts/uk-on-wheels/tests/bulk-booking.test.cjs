const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const source = fs.readFileSync(path.join(__dirname,"../public/bulk-booking.js"),"utf8");
const ui = fs.readFileSync(path.join(__dirname,"../public/bulk-booking-ui.js"),"utf8");
const html = fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");

function setup(options = {}) {
  const stored = options.stored || new Map(), saved = options.saved || new Map(), calls = [];
  const fields = {};
  for (const id of ["customerType","biz","privateCustomerName","privateCustomerMobile","privateCustomerEmail","pickup","dest","service","miles","bdate","ddate","receiver","mobile","dropoff","amount","notes","veh","reg","bulkBookingPanel","singleVehicleFields","bookingMode","bookingSharedFields","bulkBookingEditor","bulkVehicleRows","bulkBookingResults","bulkBookingStatus","bulkNewBatch"]) {
    fields[id] = {value:"",innerHTML:"",textContent:"",disabled:false,isConnected:true,addEventListener() {}};
  }
  const shared = {customerType:"Business",biz:"business-1",pickup:"Collection A",dest:"Delivery B",service:"Vehicle Delivery",miles:"40",amount:"100",receiver:"Test Receiver",mobile:"07000000000",notes:"Handle carefully",dropoff:"18:00"};
  for (const [id,value] of Object.entries(shared)) fields[id].value = value;
  const business = {id:"business-1",name:"Test Motors",status:"Active"};
  const button = {disabled:false,isConnected:true}, store = {bookings:[],businesses:[business]};
  let failRow = 0, loseResponse = false, lookupFails = false, writesBlocked = false, refreshFails = false, confirmation = true;
  const context = vm.createContext({
    window:{},crypto,console,Date,role:"admin",currentUser:{name:"Admin"},
    currentSession:{user:{id:"admin-test"}},SUPABASE_CONFIGURED:true,
    hasPermission:()=>true,selectedBookingBusiness:id=>id===business.id ? business : null,
    getStore:()=>store,saveStore:async()=>true,
    toggleCustomerTypeFields(){},crmConfirm:async()=>confirmation,
    loadNormalizedPortalData:async()=>{if(refreshFails)throw new Error("Refresh offline");},
    document:{getElementById:id=>fields[id],querySelector:()=>button},
    sessionStorage:{
      getItem:key=>stored.get(key)||null,
      setItem:(key,value)=>{if(writesBlocked)throw new Error("Storage blocked");stored.set(key,value);},
      removeItem:key=>stored.delete(key),
    },
    sb:{from:table=>{
      assert.equal(table,"bookings");
      return {select:()=>({eq:(field,ref)=>{
        assert.equal(field,"reference");
        return {maybeSingle:async()=>lookupFails ? {error:{message:"Lookup offline"}} : {data:saved.get(ref)||null}};
      }})};
    }},
    createLinkedBooking:async(booking,ref)=>{
      calls.push({booking:JSON.parse(JSON.stringify(booking)),ref});
      if (calls.length===failRow) throw new Error("RPC rejected this vehicle");
      assert.equal(saved.has(ref),false,"must not try to create an existing booking");
      const record={id:"id-"+saved.size,reference:ref,vehicle_registration:booking.reg,created_by:"admin-test"};
      saved.set(ref,record);
      if(loseResponse){loseResponse=false;throw new Error("Response was lost");}
      return record;
    },
  });
  vm.runInContext(ui,context);
  context.BulkBookingUI = context.window.BulkBookingUI;
  vm.runInContext(source,context);
  const api=context.window.BulkBooking;
  api.mount(); api.setMode("bulk");
  const state=()=>JSON.parse(stored.get("ukow-bulk-booking:admin-test")||"null");
  const fill=(index,values={})=>{
    const row=state().rows[index];
    for(const [field,value] of Object.entries({vehicle:"Ford Focus",reg:"AB"+(10+index)+" CDE",...values}))api.updateRow(row.id,field,value);
  };
  return {api,context,fields,stored,saved,calls,state,fill,button,store,business,
    failAt:n=>{failRow=n;},loseNext:()=>{loseResponse=true;},lookupFail:value=>{lookupFails=value;},
    blockStorage:()=>{writesBlocked=true;},failRefresh:()=>{refreshFails=true;},cancel:()=>{confirmation=false;}};
}

test("Bulk mode adds/removes vehicles and keeps the single booking path available",()=>{
  const s=setup();
  assert.equal(s.state().rows.length,2);
  assert.equal(s.fields.singleVehicleFields.hidden,true);
  assert.equal(s.fields.bulkBookingPanel.hidden,false);
  s.api.addRow();assert.equal(s.state().rows.length,3);
  s.api.removeRow(s.state().rows[2].id);assert.equal(s.state().rows.length,2);
  s.api.setMode("single");assert.equal(s.api.isActive(),false);
  assert.equal(s.fields.singleVehicleFields.hidden,false);
  assert.match(html,/return await submitBooking\(\)/);
});

test("All vehicles validate before any write, including duplicate registrations and invalid numbers",async()=>{
  const s=setup();s.fill(0);await s.api.submit();
  assert.equal(s.calls.length,0);assert.match(s.fields.bulkBookingStatus.textContent,/Vehicle 2/);
  s.fill(1,{reg:"ab10cde"});await s.api.submit();
  assert.equal(s.calls.length,0);assert.match(s.fields.bulkBookingStatus.textContent,/more than once/);
  s.fill(1,{reg:"ZZ12AAA",amount:"-1"});await s.api.submit();
  assert.equal(s.calls.length,0);assert.match(s.fields.bulkBookingStatus.textContent,/zero or more/);
  s.fill(1,{reg:"ZZ12AAA",amount:"Infinity"});await s.api.submit();
  assert.equal(s.calls.length,0);
});

test("Bulk save uses separate stable references, shared details and per-vehicle overrides",async()=>{
  const s=setup();s.fill(0);s.fill(1,{vehicle:"BMW 320",reg:"XY22 ZZZ",amount:"150.50",miles:"0"});
  await s.api.submit();
  assert.equal(s.calls.length,2);assert.equal(s.saved.size,2);
  assert.notEqual(s.calls[0].ref,s.calls[1].ref);
  for(const call of s.calls){
    assert.match(call.ref,/^UKOW-\d{4}-[A-F0-9]{32}$/);
    assert.equal(call.booking.pickup,"Collection A");assert.equal(call.booking.destination,"Delivery B");
    assert.equal(call.booking._businessId,"business-1");
    assert.match(call.booking.notes,/Latest drop-off time: 18:00/);
  }
  assert.equal(s.calls[0].booking.amount,100);assert.equal(s.calls[0].booking.miles,40);
  assert.equal(s.calls[1].booking.amount,150.5);assert.equal(s.calls[1].booking.miles,0);
  assert.ok(s.state().rows.every(r=>r.status==="saved"));
  assert.equal(s.api.isComplete(),true);assert.equal(s.button.disabled,true);
  await s.api.submit();assert.equal(s.calls.length,2);
});

test("Partial failures retain saved references and retry only unsaved vehicles",async()=>{
  const s=setup();s.fill(0);s.fill(1);s.failAt(2);
  await s.api.submit();
  assert.deepEqual(s.state().rows.map(r=>r.status),["saved","failed"]);
  const reference=s.state().rows[0].reference;
  assert.match(s.fields.bulkBookingStatus.textContent,/1 of 2/);
  assert.equal(s.fields.bookingSharedFields.disabled,true);
  s.fill(1,{vehicle:"Updated make",reg:"XY99 ZZZ"});
  s.failAt(0);await s.api.submit();
  assert.equal(s.calls.length,3);assert.equal(s.saved.size,2);
  assert.equal(s.state().rows[0].reference,reference);
  assert.equal(s.calls[2].booking.vehicle,"Updated make");
});

test("A lost successful response is reconciled without duplicating the vehicle",async()=>{
  const s=setup();s.fill(0);s.fill(1);s.loseNext();
  await s.api.submit();
  assert.equal(s.calls.length,1);assert.equal(s.saved.size,1);
  assert.equal(s.state().rows[0].status,"saved");
  assert.equal(s.state().rows[1].status,"editing");
  await s.api.submit();
  assert.equal(s.calls.length,2);assert.equal(s.saved.size,2);
});

test("An unverifiable reference blocks writes and locks the uncertain row until retry",async()=>{
  const s=setup();s.fill(0);s.fill(1);s.lookupFail(true);
  await s.api.submit();assert.equal(s.calls.length,0);
  const row=s.state().rows[0];assert.equal(row.status,"uncertain");
  s.api.updateRow(row.id,"reg","BAD");s.api.removeRow(row.id);
  assert.equal(s.state().rows[0].reg,row.reg);
  await s.api.newBatch();assert.match(s.fields.bulkBookingStatus.textContent,/interrupted saves/);
  s.lookupFail(false);await s.api.submit();assert.equal(s.calls.length,2);
});

test("Draft survives remount and refresh and restores interrupted rows with the same references",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  const draft=s.state();draft.rows[0].status="saving";
  s.saved.set(draft.rows[0].reference,{id:"existing",reference:draft.rows[0].reference,vehicle_registration:"AB10CDE",created_by:"admin-test"});
  s.stored.set("ukow-bulk-booking:admin-test",JSON.stringify(draft));
  const reopened=setup({stored:s.stored,saved:s.saved});
  assert.equal(reopened.state().rows[0].status,"uncertain");
  assert.equal(reopened.state().rows[0].reference,draft.rows[0].reference);
  await reopened.api.submit();assert.equal(reopened.calls.length,1);assert.equal(reopened.saved.size,2);
});

test("Double submission and edits during a save cannot duplicate or change the captured batch",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  let release;
  const original=s.context.createLinkedBooking;
  s.context.createLinkedBooking=async(...args)=>{await new Promise(resolve=>{release=resolve;});return original(...args);};
  const pending=s.api.submit();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.api.isBusy(),true);
  await s.api.submit();s.api.addRow();s.fill(0,{reg:"CHANGED"});
  s.context.createLinkedBooking=original;release();await pending;
  assert.equal(s.calls.length,2);assert.equal(s.calls[0].booking.reg,"AB10CDE");
});

test("Wrong-role and expired-session bulk submissions do not write bookings",async()=>{
  for(const role of ["client","driver"]){
    const s=setup();s.fill(0);s.fill(1);s.context.role=role;
    await s.api.submit();assert.equal(s.calls.length,0);
  }
  const s=setup();s.fill(0);s.fill(1);s.context.currentSession=null;
  await s.api.submit();assert.equal(s.calls.length,0);
});

test("Sign-out clears the draft and an account change during a save stops further vehicles",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  const original=s.context.createLinkedBooking;
  s.context.createLinkedBooking=async(...args)=>{
    const saved=await original(...args);s.context.currentSession={user:{id:"different-user"}};return saved;
  };
  await s.api.submit();assert.equal(s.calls.length,1);
  s.api.clearSession();assert.equal(s.stored.has("ukow-bulk-booking:admin-test"),false);
  assert.equal(s.api.isActive(),false);
});

test("Failed browser recovery storage blocks submission before network writes",async()=>{
  const s=setup();s.fill(0);s.fill(1);s.blockStorage();
  await s.api.submit();assert.equal(s.calls.length,0);
  assert.match(s.fields.bulkBookingStatus.textContent,/session storage/);
});

test("Inactive/missing businesses, required journey details and private email are validated before saving",async()=>{
  for(const change of [
    s=>{s.business.status="Inactive";},
    s=>{s.fields.biz.value="missing";},
    s=>{s.fields.pickup.value="";},
    s=>{s.fields.receiver.value="";},
    s=>{s.fields.customerType.value="Private";s.fields.privateCustomerName.value="Client";s.fields.privateCustomerEmail.value="invalid";},
  ]){
    const s=setup();s.fill(0);s.fill(1);change(s);
    await s.api.submit();assert.equal(s.calls.length,0);assert.ok(s.fields.bulkBookingStatus.textContent);
  }
});

test("Private bulk vehicles share the chosen Client portal email, not a business",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  s.fields.customerType.value="Private";s.fields.privateCustomerName.value="Private Client";
  s.fields.privateCustomerEmail.value="client@example.test";
  await s.api.submit();
  assert.equal(s.calls.length,2);
  for(const {booking} of s.calls){
    assert.equal(booking._businessId,null);assert.equal(booking.privateCustomerEmail,"client@example.test");
    assert.equal(booking.customerType,"Private");
  }
});

test("No booking is overwritten when a stable reference belongs to another registration or creator",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  const row=s.state().rows[0];
  s.saved.set(row.reference,{reference:row.reference,vehicle_registration:"OTHER",created_by:"admin-test"});
  await s.api.submit();assert.equal(s.calls.length,0);
  assert.equal(s.state().rows[0].status,"uncertain");
});

test("A list-refresh failure never claims the completed batch was lost",async()=>{
  const s=setup();s.fill(0);s.fill(1);s.failRefresh();
  await s.api.submit();assert.equal(s.saved.size,2);
  assert.match(s.fields.bulkBookingStatus.textContent,/All 2 vehicles booked successfully/);
  assert.match(s.fields.bulkBookingStatus.textContent,/could not refresh/);
});

test("Bulk UI escapes customer text and handlers, and exposes status and mobile styling",()=>{
  const s=setup();const content=s.context.BulkBookingUI.renderRows([{id:'"><script>bad</script>',vehicle:'"><img src=x onerror=bad()>',reg:"AB12CDE",status:"uncertain",message:"<script>bad</script>"}],false);
  assert.doesNotMatch(content,/<script>|<img/);
  assert.match(content,/disabled/);assert.match(content,/aria-label/);
  assert.match(s.context.BulkBookingUI.shell(),/aria-live="polite"/);
  const css=fs.readFileSync(path.join(__dirname,"../public/bulk-booking.css"),"utf8");
  assert.match(css,/@media/);
});
