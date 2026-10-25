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
  const stored = options.stored || new Map(), saved = options.saved || new Map(), calls = [], rpcCalls=[];
  const fields = {};
  for (const id of ["bookingVehicleCount","bookingVehicleCountControls","applyVehicleCount","customerType","biz","privateCustomerName","privateCustomerMobile","privateCustomerEmail","pickup","dest","service","miles","bdate","ddate","receiver","mobile","dropoff","amount","notes","veh","reg","bulkBookingPanel","singleVehicleFields","bookingMode","bookingSharedFields","bulkBookingEditor","bulkVehicleRows","bulkBookingResults","bulkBookingStatus","bulkNewBatch"]) {
    fields[id] = {value:"",innerHTML:"",textContent:"",disabled:false,isConnected:true,addEventListener() {}};
  }
  const shared = {customerType:"Business",biz:"business-1",pickup:"Collection A",dest:"Delivery B",service:"Vehicle Delivery",miles:"40",amount:"100",receiver:"Test Receiver",mobile:"07000000000",notes:"Handle carefully",dropoff:"18:00"};
  for (const [id,value] of Object.entries(shared)) fields[id].value = value;
  const business = {id:"business-1",name:"Test Motors",status:"Active"};
  const button = {disabled:false,isConnected:true}, store = {bookings:[],businesses:[business]};
  let failRow = 0, loseResponse = false, lookupFails = false, writesBlocked = false, refreshFails = false, confirmation = true;
  const context = vm.createContext({
    window:{},crypto,console,Date,role:options.role || "admin",currentUser:options.user || {name:"Admin"},
    currentSession:{user:{id:"admin-test",email:"own@example.test"}},SUPABASE_CONFIGURED:true,
    hasPermission:()=>true,selectedBookingBusiness:id=>store.businesses.find(b=>b.id===id)||null,
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
  context.sb.rpc=async(name,payload)=>{
    rpcCalls.push({name,payload});
    if(options.rpcMissing)return {error:{code:"PGRST202",message:"Function missing"}};
    return {data:await context.createLinkedBooking(payload.p_booking,payload.p_reference)};
  };
  api.mount(); if(!options.restore)api.setMode("bulk");
  if(!options.empty && JSON.parse(stored.get("ukow-bulk-booking:admin-test")||"{}").rows?.length===0){api.addRow();api.addRow();}
  const state=()=>JSON.parse(stored.get("ukow-bulk-booking:admin-test")||"null");
  const fill=(index,values={})=>{
    const row=state().rows[index];
    for(const [field,value] of Object.entries({vehicle:"Ford Focus",reg:"AB"+(10+index)+" CDE",...values}))api.updateRow(row.id,field,value);
  };
  return {api,context,fields,stored,saved,calls,rpcCalls,state,fill,button,store,business,
    failAt:n=>{failRow=n;},loseNext:()=>{loseResponse=true;},lookupFail:value=>{lookupFails=value;},
    blockStorage:()=>{writesBlocked=true;},failRefresh:()=>{refreshFails=true;},cancel:()=>{confirmation=false;}};
}

test("vehicle count opens manual rows, keeps initial vehicle and saves separate references and charges",async()=>{
  const s=setup({empty:true});
  s.api.setMode("single");
  s.fields.veh.value="Ford Focus";s.fields.reg.value="AB10 CDE";
  s.fields.bookingVehicleCount.value="3";
  assert.equal(s.api.needsVehicleCount(),true);
  assert.equal(await s.api.setVehicleCount(),true);
  assert.equal(s.state().mode,"multiple");
  assert.equal(s.state().rows.length,3);
  assert.equal(s.state().rows[0].vehicle,"Ford Focus");
  assert.equal(s.fields.bookingSharedFields.hidden,false);
  assert.equal(s.fields.singleVehicleFields.hidden,true);
  assert.match(s.fields.bulkBookingPanel.innerHTML,/Vehicle details/);
  assert.doesNotMatch(s.fields.bulkBookingPanel.innerHTML,/Choose Excel file/);
  assert.equal(s.api.needsVehicleCount(),false);
  s.fill(1,{amount:"175"});s.fill(2);
  const row=s.state().rows[2];
  s.api.setOwnDetails(row.id,true);
  s.api.updateDetail(row.id,"dest","Separate destination");
  await s.api.submit();
  assert.equal(s.saved.size,3);
  assert.equal(new Set(s.calls.map(c=>c.ref)).size,3);
  assert.deepEqual(s.calls.map(c=>c.booking.amount),[100,175,100]);
  assert.equal(s.calls[2].booking.destination,"Separate destination");
  assert.ok(s.calls.every(c=>c.booking.status==="New Booked Vehicle"));
  assert.equal(s.fields.bookingVehicleCount.disabled,true);
  await s.api.submit();
  assert.equal(s.calls.length,3,"Saved vehicles must not be created twice");
});

test("manual vehicle count validates bounds and protects entered and committed rows",async()=>{
  const s=setup({empty:true});
  for(const n of ["",0,-1,1.5,101,"no"])assert.equal(await s.api.setVehicleCount(n),false);
  await s.api.setVehicleCount(3);
  s.fill(0);s.fill(1);s.fill(2);
  s.cancel();
  assert.equal(await s.api.setVehicleCount(2),false);
  assert.equal(s.state().rows.length,3);
  s.failAt(2);
  await s.api.submit();
  assert.equal(s.saved.size,1);
  assert.equal(await s.api.setVehicleCount(4),false);
  assert.equal(s.state().rows.length,3);
  s.failAt(0);
  await s.api.submit();
  assert.equal(s.saved.size,3);
});

test("manual vehicle drafts restore after refresh and private Clients stay single-only",async()=>{
  const s=setup({empty:true});
  await s.api.setVehicleCount(2);s.fill(0);s.fill(1);
  const fresh=setup({empty:true,stored:s.stored,saved:s.saved,restore:true});
  assert.equal(fresh.state().mode,"multiple");
  assert.equal(fresh.fields.bookingSharedFields.hidden,false);
  assert.match(fresh.fields.bulkVehicleRows.innerHTML,/Ford Focus/);
  const p=setup({empty:true,role:"client",user:{name:"Private",accountType:"private"}});
  assert.equal(await p.api.setVehicleCount(2),false);
  assert.equal(p.api.isActive(),false);
});

test("Business Clients can enter multiple vehicles but cannot set charges or change ownership",async()=>{
  const s=setup({empty:true,role:"client",user:{name:"Test Motors",businessId:"business-1",accountType:"business"}});
  s.fields.amount.value="";
  await s.api.setVehicleCount(2);s.fill(0);s.fill(1);
  await s.api.submit();
  assert.equal(s.rpcCalls.length,2);
  assert.ok(s.rpcCalls.every(c=>c.name==="client_create_bulk_booking"&&c.payload.p_booking._businessId==="business-1"&&c.payload.p_booking.amount===0));
  assert.equal(s.saved.size,2);
});

test("Excel correction badges and repaired phone warnings stay visible and editable before saving",async()=>{
  const s=setup({empty:true});
  s.context.window.BookingExcel={readFile:async()=>[
    {excelRow:2,values:{customerType:"Business",biz:"business-1",vehicle:"Ford Focus",reg:"AB10CDE",pickup:"Collection A",dest:"Delivery B",receiver:"Test Receiver",mobile:"07123456789",bdate:"2026-10-17",ddate:"2026-10-18",dropoff:"14:00",service:"delivery"},
      errors:{},warnings:{mobile:"Excel removed the leading zero. Restored 07123456789; check it before saving."}},
    {excelRow:3,values:{customerType:"Business",biz:"business-1",vehicle:"Ford Focus",reg:"AB11CDE"},errors:{bdate:"Booking date: enter a real date"},warnings:{}},
  ]};
  await s.api.uploadFile({name:"synthetic.xlsx"});
  assert.equal(s.calls.length,0,"Import only previews, never saves");
  assert.match(s.fields.bulkVehicleRows.innerHTML,/Needs correction/);
  assert.match(s.fields.bulkVehicleRows.innerHTML,/Restored 07123456789/);
  assert.equal(s.state().rows[0].details.dropoff,"14:00");
  assert.match(s.state().rows[0].importWarnings.mobile,/leading zero/);
  s.api.updateDetail(s.state().rows[0].id,"mobile","07987654321");
  assert.equal(s.state().rows[0].importWarnings.mobile,undefined);
  const refreshed=s.context.BulkBookingUI.renderRows(s.state().rows,false,{},s.store.businesses,true,{});
  assert.doesNotMatch(refreshed,/Restored 07123456789/);
  await s.api.submit();
  assert.equal(s.calls.length,0,"An invalid second row still blocks the entire batch");
});

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
  assert.equal(s.calls.length,0);assert.match(s.state().rows[1].message,/Vehicle 2/);
  s.fill(1,{reg:"ab10cde"});await s.api.submit();
  assert.equal(s.calls.length,0);assert.match(s.state().rows[1].message,/more than once/);
  s.fill(1,{reg:"ZZ12AAA",amount:"-1"});await s.api.submit();
  assert.equal(s.calls.length,0);assert.match(s.state().rows[1].message,/zero or more/);
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
  for(const role of ["driver"]){
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

test("Every single booking field is available on each bulk vehicle, with safe business options",()=>{
  const s=setup();s.fill(0);
  const id=s.state().rows[0].id;
  s.api.setOwnDetails(id,true);
  let content=s.fields.bulkVehicleRows.innerHTML;
  for(const field of ["vehicle","reg","customerType","biz","pickup","dest","service","miles","bdate","ddate","receiver","mobile","dropoff","amount","notes"]){
    assert.equal((content.match(new RegExp('id="bulk-'+id+'-'+field+'"',"g"))||[]).length,1,field);
  }
  s.api.updateDetail(id,"customerType","Private");
  content=s.fields.bulkVehicleRows.innerHTML;
  for(const field of ["privateCustomerName","privateCustomerMobile","privateCustomerEmail"])
    assert.match(content,new RegExp('id="bulk-'+id+'-'+field+'"'));
  s.business.status="Inactive";s.api.updateDetail(id,"customerType","Business");
  assert.match(s.fields.bulkVehicleRows.innerHTML,/<option value="business-1" selected disabled>Test Motors - inactive/);
});

test("Separate vehicle details reach the booking save without changing shared defaults or another vehicle",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  s.store.businesses.push({id:"business-2",name:"Second Motors",status:"Active"});
  const row=s.state().rows[1];s.api.setOwnDetails(row.id,true);
  const details={biz:"business-2",pickup:"Second pickup",dest:"Second delivery",service:"Recovery / AA",
    bdate:"2026-11-01",ddate:"2026-11-03",receiver:"Second Receiver",mobile:"07111111111",dropoff:"15:30",notes:"Second vehicle instructions"};
  for(const [field,value] of Object.entries(details))s.api.updateDetail(row.id,field,value);
  s.fill(1,{miles:"71",amount:"230.50"});
  await s.api.submit();assert.equal(s.calls.length,2);
  const [first,second]=s.calls.map(c=>c.booking);
  assert.equal(first._businessId,"business-1");assert.equal(first.pickup,"Collection A");
  assert.equal(first.receiver,"Test Receiver");assert.equal(first.amount,100);
  for(const [from,to] of Object.entries({pickup:"pickup",dest:"destination",service:"service",bdate:"bookingDate",ddate:"deliveryDate",receiver:"receiver",mobile:"receiverMobile",dropoff:"dropoffTill"}))assert.equal(second[to],details[from],from);
  assert.equal(second._businessId,"business-2");assert.equal(second.business,"Second Motors");
  assert.equal(second.miles,71);assert.equal(second.amount,230.5);
  assert.equal(second.notes,"Second vehicle instructions\nLatest drop-off time: 15:30");
  assert.equal(s.fields.pickup.value,"Collection A");
});

test("A bulk batch can link Business and Private vehicles to different correct Client accounts",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  const row=s.state().rows[1];s.api.setOwnDetails(row.id,true);
  for(const [field,value] of Object.entries({customerType:"Private",privateCustomerName:"Private Two",privateCustomerMobile:"07222222222",privateCustomerEmail:"two@example.test"}))s.api.updateDetail(row.id,field,value);
  await s.api.submit();
  assert.equal(s.calls.length,2);
  assert.equal(s.calls[0].booking._businessId,"business-1");
  assert.equal(s.calls[0].booking.privateCustomerEmail,"");
  assert.equal(s.calls[1].booking._businessId,null);
  assert.equal(s.calls[1].booking.customerType,"Private");
  assert.equal(s.calls[1].booking.privateCustomerName,"Private Two");
  assert.equal(s.calls[1].booking.privateCustomerMobile,"07222222222");
  assert.equal(s.calls[1].booking.privateCustomerEmail,"two@example.test");
});

test("Required per-vehicle details and invalid private email or charge block the entire batch before any write",async()=>{
  for(const detail of [{pickup:""},{receiver:""},{biz:"missing"},{customerType:"Private",privateCustomerName:"Other Client",privateCustomerEmail:"invalid"},{service:"Unknown"}]){
    const s=setup();s.fill(0);s.fill(1);const id=s.state().rows[1].id;
    s.api.setOwnDetails(id,true);
    for(const [f,v] of Object.entries(detail))s.api.updateDetail(id,f,v);
    await s.api.submit();assert.equal(s.calls.length,0);
    assert.match(s.state().rows[1].message,/Vehicle 2:/);
  }
});

test("Blank optional separate details stay blank, and zero amounts do not inherit shared values",async()=>{
  const s=setup();s.fill(0);s.fill(1);
  const row=s.state().rows[1];s.api.setOwnDetails(row.id,true);
  for(const field of ["notes","ddate","dropoff"])s.api.updateDetail(row.id,field,"");
  s.fill(1,{miles:"",amount:""});
  await s.api.submit();assert.equal(s.calls.length,2);
  const b=s.calls[1].booking;
  assert.equal(b.notes,"");assert.equal(b.deliveryDate,"");assert.equal(b.dropoffTill,"");
  assert.equal(b.miles,0);assert.equal(b.amount,0);
  assert.equal(s.calls[0].booking.amount,100);
});

test("Independent details and stable references survive draft recovery and partial-save retries",async()=>{
  const s=setup();s.fill(0);s.fill(1);const row=s.state().rows[1];
  s.api.setOwnDetails(row.id,true);s.api.updateDetail(row.id,"pickup","Independent pickup");
  s.api.updateDetail(row.id,"notes","Keep on retry");
  const recovered=setup({stored:s.stored,saved:s.saved});
  assert.equal(recovered.state().rows[1].details.pickup,"Independent pickup");
  recovered.failAt(2);await recovered.api.submit();
  assert.deepEqual(recovered.state().rows.map(r=>r.status),["saved","failed"]);
  const first=recovered.state().rows[0],second=recovered.state().rows[1];
  recovered.api.setOwnDetails(first.id,true);
  recovered.api.updateDetail(first.id,"pickup","Must not change");
  recovered.api.updateDetail(second.id,"dest","Corrected delivery");
  recovered.failAt(0);await recovered.api.submit();
  assert.equal(recovered.calls.length,3);
  assert.equal(recovered.calls[2].ref,row.reference);
  assert.equal(recovered.calls[2].booking.pickup,"Independent pickup");
  assert.equal(recovered.calls[2].booking.destination,"Corrected delivery");
  assert.match(recovered.calls[2].booking.notes,/Keep on retry/);
  assert.equal(recovered.state().rows[0].details,undefined);
});

test("Shared default refresh updates inherited vehicles without overwriting independent drafts",()=>{
  const s=setup();const row=s.state().rows[1];s.api.setOwnDetails(row.id,true);
  s.fields.pickup.value="Refreshed shared pickup";s.api.refresh();
  assert.equal(s.state().common.pickup,"Refreshed shared pickup");
  assert.equal(s.state().rows[1].details.pickup,"Collection A");
  assert.match(s.fields.bulkVehicleRows.innerHTML,/Refreshed shared pickup/);
  assert.match(s.fields.bulkVehicleRows.innerHTML,/Collection A/);
});

const importValues = overrides => ({customerType:"Business",biz:"Test Motors",privateCustomerName:"",privateCustomerMobile:"",privateCustomerEmail:"",
  vehicle:"Ford Focus",reg:"AB10CDE",pickup:"Excel pickup",dest:"Excel delivery",service:"Vehicle Delivery",
  miles:"40",amount:"100",bdate:"2026-11-01",ddate:"2026-11-02",receiver:"Excel Receiver",mobile:"07123456789",dropoff:"17:30",notes:"Excel instructions",...overrides});
async function upload(s,values,errors=[]) {
  s.context.window.BookingExcel={readFile:async()=>values.map((v,i)=>({values:v,excelRow:i+2,errors:errors[i]||{}}))};
  await s.api.uploadFile({name:"vehicles.xlsx"},{value:"chosen"});
}
test("Excel bulk entry starts empty, hides the repeated form and cannot save before upload",()=>{
  const s=setup({empty:true});
  assert.equal(s.state().rows.length,0);assert.equal(s.button.disabled,true);
  assert.equal(s.fields.bookingSharedFields.hidden,true);
  assert.match(s.fields.bulkVehicleRows.innerHTML,/Nothing to review/);
  s.api.setMode("single");assert.equal(s.fields.bookingSharedFields.hidden,false);
  assert.equal(s.button.disabled,false);
});
test("Only Business Excel can be downloaded; Private Clients have no Excel UI",async()=>{
  const admin=setup({empty:true}),downloaded=[];
  admin.context.window.BookingExcel={downloadTemplate:async c=>downloaded.push(c)};
  const shell=admin.context.BulkBookingUI.shell({client:false});
  assert.match(shell,/Download Business Excel/);assert.doesNotMatch(shell,/Download Private Customer Excel/);
  await admin.api.downloadTemplate("Business");await admin.api.downloadTemplate("Private");
  assert.deepEqual(downloaded.map(c=>c.format),["Business"]);
  assert.equal(downloaded[0].businesses[0].id,"business-1");
  for(const [accountType,own,other] of [["business","Business","Private"],["private","Private","Business"]]) {
    const client=setup({empty:true,role:"client",user:{name:"Own Client",businessId:"business-1",accountType,email:"own@example.test"}});
    const requests=[];client.context.window.BookingExcel={downloadTemplate:async c=>requests.push(c)};
    const ui=client.context.BulkBookingUI.shell({client:true,accountType});
    if(accountType==="private")assert.equal(ui,"");
    else assert.match(ui,/Download Business Excel/);
    await client.api.downloadTemplate(other);assert.equal(requests.length,0);
    await client.api.downloadTemplate(own);assert.equal(requests.length,accountType==="business"?1:0);
    if(requests[0]){assert.equal(requests[0].format,own);assert.equal(requests[0].businesses.length,0);}
  }
});
test("Real Business Excel reaches review and saves independent references without private fields",async()=>{
  const ExcelJS=require("exceljs");
  const {buildTemplate,templateColumns,readFile}=await import("../src/booking-excel.js");
  for(const format of ["Business"]) {
    const s=setup({empty:true});
    const book=new ExcelJS.Workbook();await book.xlsx.load(await buildTemplate({format}));
    const sheet=book.getWorksheet("Bookings"),selected=templateColumns(format);
    for(let index=0;index<2;index++) {
      const values={...importValues({reg:index?"AB11CDE":"AB10CDE"}),biz:"Test Motors",
        privateCustomerName:"Private Client",privateCustomerEmail:"private@example.test",privateCustomerMobile:"07000000001"};
      selected.forEach(([key],col)=>sheet.getCell(index+2,col+1).value=values[key]??"");
    }
    const buffer=await book.xlsx.writeBuffer();
    s.context.window.BookingExcel={readFile};
    await s.api.uploadFile({name:format+"-vehicles.xlsx",size:buffer.byteLength,arrayBuffer:async()=>buffer});
    assert.equal(s.calls.length,0);assert.equal(s.state().rows.length,2);
    assert.ok(s.state().rows.every(row=>row.details.customerType===format));
    await s.api.submit();
    assert.equal(s.calls.length,2);assert.notEqual(s.calls[0].ref,s.calls[1].ref);
    for(const {booking} of s.calls) {
      assert.equal(booking.customerType,format);
      if(format==="Business") {
        assert.equal(booking._businessId,"business-1");
        assert.equal(booking.privateCustomerEmail,"");
      } else {
        assert.equal(booking._businessId,null);
        assert.equal(booking.privateCustomerName,"Private Client");
        assert.equal(booking.privateCustomerEmail,"private@example.test");
        assert.equal(booking.privateCustomerMobile,"07000000001");
      }
    }
  }
});
test("Excel upload previews every value before saving separate New Booked Vehicle references",async()=>{
  const s=setup({empty:true});
  await upload(s,[importValues(),importValues({vehicle:"BMW 320",reg:"AB11CDE",pickup:"Different pickup",amount:"230.50"})]);
  assert.equal(s.calls.length,0);
  const draft=s.state();
  assert.equal(draft.sourceName,"vehicles.xlsx");assert.equal(draft.rows.length,2);
  assert.equal(draft.rows[0].details.biz,"business-1");
  assert.equal(draft.rows[1].details.pickup,"Different pickup");
  await s.api.submit();assert.equal(s.calls.length,2);
  assert.notEqual(s.calls[0].ref,s.calls[1].ref);
  for(const call of s.calls)assert.equal(call.booking.status,"New Booked Vehicle");
  assert.equal(s.calls[1].booking.amount,230.5);
  assert.match(s.fields.bulkBookingStatus.textContent,/New Booked Vehicles/);
});
test("Excel errors and duplicate registrations annotate all affected rows and stop all writes",async()=>{
  const s=setup({empty:true});
  await upload(s,[importValues(),importValues({reg:"ab10 cde",pickup:""})],[{},{mobile:"Receiver mobile number: keep as text"}]);
  assert.match(s.state().rows[0].message,/more than once/);
  assert.match(s.state().rows[1].message,/Excel row 3.*keep as text/);
  await s.api.submit();assert.equal(s.calls.length,0);
  const second=s.state().rows[1];
  s.api.updateRow(second.id,"reg","AB11CDE");
  s.api.updateDetail(second.id,"pickup","Corrected pickup");
  s.api.updateDetail(second.id,"mobile","07123456789");
  await s.api.submit();assert.equal(s.calls.length,2);
});
test("A failed or cancelled replacement keeps the existing Excel draft and file name",async()=>{
  const s=setup({empty:true});
  await upload(s,[importValues()]);
  const initial=s.state();
  s.context.window.BookingExcel.readFile=async()=>{throw new Error("Corrupt workbook");};
  await s.api.uploadFile({name:"broken.xlsx"});
  assert.equal(s.state().rows[0].reference,initial.rows[0].reference);
  assert.equal(s.state().sourceName,"vehicles.xlsx");
  assert.match(s.fields.bulkBookingStatus.textContent,/Corrupt workbook/);
  s.cancel();await upload(s,[importValues({reg:"OTHER"})]);
  assert.equal(s.state().rows[0].reg,"AB10CDE");
});
test("A partial Excel save locks file replacement and retry keeps refs and details after reload",async()=>{
  const s=setup({empty:true});
  await upload(s,[importValues(),importValues({reg:"AB11CDE",pickup:"Second Excel pickup"})]);
  s.failAt(2);await s.api.submit();
  const original=s.state();
  await upload(s,[importValues({reg:"OTHER"})]);
  assert.equal(s.state().rows.length,2);assert.equal(s.state().sourceName,"vehicles.xlsx");
  const restored=setup({stored:s.stored,saved:s.saved});
  assert.equal(restored.state().rows[1].details.pickup,"Second Excel pickup");
  await restored.api.submit();
  assert.equal(restored.calls.length,1);assert.equal(restored.calls[0].ref,original.rows[1].reference);
  assert.equal(restored.saved.size,2);
});
test("Client Excel bookings use the Client RPC and the signed-in Business account only",async()=>{
  const s=setup({empty:true,role:"client",user:{name:"Own Motors",businessId:"business-1",accountType:"business",email:"own@example.test"}});
  await upload(s,[importValues({customerType:"",biz:"",amount:""}),importValues({customerType:"",biz:"",amount:"",reg:"AB11CDE"})]);
  await s.api.submit();
  assert.equal(s.rpcCalls.length,2);
  for(const {name,payload} of s.rpcCalls){
    assert.equal(name,"client_create_bulk_booking");
    assert.equal(payload.p_booking._businessId,"business-1");
    assert.equal(payload.p_booking.amount,0);
    assert.equal(payload.p_booking.customerType,"Business");
    assert.equal(payload.p_booking.ref,payload.p_reference);
  }
});
test("Private Clients cannot restore, upload, download or submit bulk, and single booking remains available",async()=>{
  const old=setup({empty:true});
  await upload(old,[importValues()]);
  const preserved=old.stored.get("ukow-bulk-booking:admin-test");
  const s=setup({empty:true,stored:old.stored,role:"client",user:{name:"Own Client",accountType:"private",email:"own@example.test"}});
  let downloads=0;
  s.context.window.BookingExcel={downloadTemplate:async()=>downloads++};
  await s.api.downloadTemplate("Business");
  await upload(s,[importValues({customerType:"",biz:"",amount:""})]);
  s.api.setMode("bulk");s.api.addRow();s.api.refresh();
  await s.api.submit();
  assert.equal(s.rpcCalls.length,0);assert.equal(s.calls.length,0);assert.equal(downloads,0);
  assert.equal(s.api.isActive(),false);assert.equal(s.api.hasUnsaved(),false);
  assert.equal(s.fields.bulkBookingPanel.hidden,true);
  assert.equal(s.fields.bulkBookingPanel.innerHTML,"");
  assert.equal(s.fields.singleVehicleFields.hidden,false);
  assert.equal(s.fields.bookingSharedFields.hidden,false);
  assert.equal(s.fields.bookingSharedFields.disabled,false);
  assert.equal(s.button.disabled,false);
  assert.equal(s.stored.get("ukow-bulk-booking:admin-test"),preserved,"Do not delete an old draft or saved bookings.");
});
test("Cross-account Client Excel rows and supplied charges fail before any RPC",async()=>{
  const s=setup({empty:true,role:"client",user:{name:"Own Motors",businessId:"business-1",accountType:"business"}});
  await upload(s,[importValues({biz:"Another Company",amount:"200"})]);
  await s.api.submit();assert.equal(s.rpcCalls.length,0);
  assert.match(s.state().rows[0].message,/own signed-in account/);
  assert.match(s.state().rows[0].message,/cannot set charges/);
});
test("Missing Client setup is explicit and retains the uploaded preview for retry",async()=>{
  const s=setup({empty:true,role:"client",rpcMissing:true,user:{name:"Own Client",businessId:"business-1",accountType:"business",email:"own@example.test"}});
  await upload(s,[importValues({customerType:"",biz:"",amount:""})]);
  await s.api.submit();
  assert.equal(s.state().rows[0].status,"failed");
  assert.match(s.state().rows[0].message,/client-bulk-booking-patch.sql/);
  assert.equal(s.state().sourceName,"vehicles.xlsx");
});
test("An account change while parsing Excel never imports data into another account",async()=>{
  const s=setup({empty:true});
  s.context.window.BookingExcel={readFile:async()=>{
    s.context.currentSession={user:{id:"another-user"}};
    return [{values:importValues(),errors:{},excelRow:2}];
  }};
  await s.api.uploadFile({name:"vehicles.xlsx"});
  assert.equal(s.state().rows.length,0);
  assert.equal(s.calls.length,0);
});

// Isolated browser fixture: real form/controller/RPC mapping, with synthetic data and a fake Supabase boundary.
// No authentication client or network-writing code is loaded. Output stays in the ignored generated-artifacts directory.
if(process.argv.includes("--visual-fixture")) {
  function part(start,end) {
    const a=html.indexOf(start),b=html.indexOf(end,a);
    assert.ok(a>=0&&b>a,start);
    return html.slice(a,b);
  }
  const styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join("\n")+
    ["booking-form.css","bulk-booking.css"].map(f=>fs.readFileSync(path.join(__dirname,"../public",f),"utf8")).join("\n");
  const out=path.resolve(__dirname,"../../../generated-artifacts/excel-booking");
  fs.mkdirSync(out,{recursive:true});
  const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Excel bulk booking isolated test</title><script type="module" src="/src/booking-excel-entry.js"></script><style>${styles}
    body{padding:16px}#content{max-width:1100px;margin:auto}.fixture-note{padding:12px;background:#fff4db;margin-bottom:16px}
    </style></head><body><p class="fixture-note">Isolated browser test — synthetic data only; no real bookings or accounts.</p><main id="content"></main><script>
    const role=new URLSearchParams(location.search).has("client")?"client":"admin",SUPABASE_CONFIGURED=true,currentSession={user:{id:"fixture-"+role,email:"own@example.test"}},currentUser={name:role==="client"?"Synthetic Motors":"Synthetic Admin",businessId:"business-1",accountType:"business",email:"own@example.test"};
    const fixtureStore={bookings:[],businesses:[{id:"business-1",name:"Synthetic Motors",status:"Active"},{id:"business-2",name:"Second Motors",status:"Active"}]};
    const getStore=()=>fixtureStore,hasPermission=()=>true,loadNormalizedPortalData=async()=>{window.refreshed=true;},crmConfirm=async()=>confirm("Replace or discard unsaved rows?");
    const escapeHtml=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    window.testCalls=JSON.parse(sessionStorage.getItem("fixture-calls")||"[]");window.failRegistration=null;
    const saved=JSON.parse(sessionStorage.getItem("fixture-records")||"{}");
    const sb={
      from:()=>({select:()=>({eq:(field,ref)=>({maybeSingle:async()=>({data:saved[ref]||null})})})}),
      rpc:async(name,payload)=>{
        window.testCalls.push({name,payload});sessionStorage.setItem("fixture-calls",JSON.stringify(window.testCalls));
        const reg=payload.p_vehicle_registration||payload.p_booking?.reg;
        if(reg===window.failRegistration)return {error:{message:"Synthetic failure"}};
        const record={id:crypto.randomUUID(),reference:payload.p_reference,vehicle_registration:reg,created_by:currentSession.user.id,status:"New Booked Vehicle"};
        saved[record.reference]=record;sessionStorage.setItem("fixture-records",JSON.stringify(saved));
        return {data:record};
      }
    };
    function loadBookingBusinesses(){}
    function showBusinessTariff(){}
    function createBooking(){return BulkBooking.submit();}
    ${part("function selectedBookingBusiness(","async function loadBookingBusinesses(")}
    ${part("function drawBooking(","async function createLinkedBooking(")}
    ${part("async function createLinkedBooking(","function showBusinessTariff(")}
    ${part("function enhancePortalUsability(","function openBookingFromRow(")}
    ${ui}
    ${source}
    drawBooking(document.getElementById("content"));
    if(!sessionStorage.getItem("fixture-started")){
      BulkBooking.setMode("bulk");sessionStorage.setItem("fixture-started","1");
    }
    enhancePortalUsability();
    </script></body></html>`;
  fs.writeFileSync(path.join(out,"index.html"),fixture);
  console.log("Browser fixture: "+path.join(out,"index.html"));
}
