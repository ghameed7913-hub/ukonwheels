const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function part(start,end){
  const a=html.indexOf(start),b=html.indexOf(end,a);
  assert.ok(a>=0&&b>a,start);
  return html.slice(a,b);
}
const statuses=["New Booked Vehicle","Driver Assigned","Picked Up","On Route","Delayed","Accident","Claims","Delivered","Fault On Route","Assigned AA on Route"];
function fixture(status,index){
  return {ref:"UKOW-2026-"+String(index+1).padStart(6,"0"),reg:index===0?"AB12 CDE":"XY"+String(index).padStart(2,"0")+"ABC",
    status,business:index%2?"Second Motors":"First Motors",vehicle:"Vehicle "+index,amount:100,driver:"",destination:"Example destination"};
}
function setup(records=statuses.map(fixture),scope=records){
  let markup="",nodes=[],renderCount=0;
  const store={bookings:records,notifications:[]},fields={statusVehicleCount:{textContent:""},statusVehicleEmpty:{hidden:true,textContent:""},
    statusVehicleSearch:{value:"",focus(){this.focused=true;}},statusVehicleCustomer:{selectedOptions:[{textContent:"Movex"}]},statusBookingDetail:{innerHTML:""}};
  const escape=value=>String(value??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const decode=value=>value.replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
  const target={
    get innerHTML(){return markup;},
    set innerHTML(value){
      markup=value;
      nodes=Array.from(value.matchAll(/<tr data-vehicle-reference="([^"]*)" data-vehicle-registration="([^"]*)" data-customer-key="([^"]*)">/g),
        match=>({hidden:false,dataset:{vehicleReference:decode(match[1]),vehicleRegistration:decode(match[2]),customerKey:decode(match[3])}}));
    }
  };
  const c=vm.createContext({
    selectedStatusPage:"All",statusVehicleSearch:"",page:"desktop",role:"admin",portalProfiles:[],
    visibleBookings:()=>scope,getStore:()=>store,escapeHtml:escape,
    bookingDriverAssignmentButton:()=>"",bookingEvidenceButton:()=>"",
    ensureAdminDemoData(){},LOGO_IMG:"",ico:()=>"",currency:value=>"£"+value,
    document:{querySelectorAll:()=>nodes,getElementById:id=>fields[id]},
    render:()=>renderCount++,
  });
  c.window=c;c.currentSession={user:{id:"admin-one"}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/customer-reference.js"),"utf8"),c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/status-customer-filter.js"),"utf8"),c);
  vm.runInContext(part("function bookingApprovalRecords(","function normalizedBookingToPortal("),c);
  vm.runInContext(part("function openStatusPage(","function viewStatusBooking("),c);
  vm.runInContext(part("function drawAdminDashboard(","function adminStatus("),c);
  return {c,target,fields,rows:()=>nodes,renderCount:()=>renderCount};
}
test("Both Total vehicle cards count all statuses, not only delivered, and open the full list",()=>{
  const s=setup();
  s.c.drawAdminDashboard(s.target);
  assert.doesNotMatch(s.target.innerHTML,/Total Vehicles Delivered/);
  assert.equal((s.target.innerHTML.match(/<b>Total vehicle<\/b><strong>10<\/strong>/g)||[]).length,2);
  assert.match(s.target.innerHTML,/onclick="openStatusPage\('All'\)"/);
  assert.match(s.target.innerHTML,/onkeydown="[^"]*Enter[^"]*openStatusPage\('All'\)/);
  s.c.statusVehicleSearch="old search";s.c.openStatusPage("All");
  assert.equal(s.c.page,"statusPage");assert.equal(s.c.selectedStatusPage,"All");
  assert.equal(s.c.statusVehicleSearch,"");assert.equal(s.renderCount(),1);
  s.c.drawStatusPage(s.target);
  assert.equal(s.rows().length,10);
  for(const status of statuses)assert.ok(s.target.innerHTML.includes('>'+status+'</span>'),status);
  assert.equal(s.fields.statusVehicleCount.textContent,"10 of 10 vehicles");
});
test("Total includes every business, old dates and unfamiliar future statuses, within visible scope only",()=>{
  const records=[...statuses.map(fixture),{...fixture("Pending review",10),bookingDate:"2020-01-01"}];
  const hidden={...fixture("Delivered",11),ref:"RESTRICTED-REF",reg:"HIDDEN"};
  const s=setup([...records,hidden],records);
  s.c.drawAdminDashboard(s.target);
  assert.match(s.target.innerHTML,/<b>Total vehicle<\/b><strong>11<\/strong>/);
  s.c.drawStatusPage(s.target);
  assert.equal(s.rows().length,11);
  assert.match(s.target.innerHTML,/First Motors/);assert.match(s.target.innerHTML,/Second Motors/);
  assert.doesNotMatch(s.target.innerHTML,/RESTRICTED-REF|HIDDEN/);
  s.c.searchStatusVehicles("HIDDEN");
  assert.ok(s.rows().every(row=>row.hidden));
});
test("Search matches full/partial references and registrations, ignoring case, spaces and hyphens",()=>{
  const s=setup();s.c.drawStatusPage(s.target);
  for(const query of ["ukow-2026-000001","2026000001","ab12cde"," ab 12-cDe "]) {
    s.c.searchStatusVehicles(query);
    assert.deepEqual(s.rows().filter(row=>!row.hidden).map(row=>row.dataset.vehicleReference),["UKOW-2026-000001"],query);
    assert.equal(s.fields.statusVehicleCount.textContent,"1 of 10 vehicles");
    assert.equal(s.fields.statusVehicleEmpty.hidden,true);
  }
  s.c.searchStatusVehicles("UKOW-2026");
  assert.equal(s.rows().filter(row=>!row.hidden).length,10);
});
test("Search does not leave the selected status, and clearing restores that status without rerendering the form",()=>{
  const s=setup();s.c.selectedStatusPage="Delivered";s.c.drawStatusPage(s.target);
  assert.equal(s.rows().length,1);
  s.c.searchStatusVehicles("AB12CDE");
  assert.ok(s.rows()[0].hidden);
  assert.equal(s.fields.statusVehicleCount.textContent,"0 of 1 vehicles");
  assert.equal(s.fields.statusVehicleEmpty.hidden,false);
  s.fields.statusVehicleSearch.value="AB12CDE";
  s.c.clearStatusVehicleSearch();
  assert.equal(s.fields.statusVehicleSearch.value,"");assert.equal(s.fields.statusVehicleSearch.focused,true);
  assert.equal(s.rows()[0].hidden,false);assert.equal(s.renderCount(),0);
  assert.equal(s.c.selectedStatusPage,"Delivered");
});
test("A refresh keeps the current search, while opening a different status resets it",()=>{
  const s=setup();s.c.drawStatusPage(s.target);s.c.searchStatusVehicles("AB12CDE");
  s.c.drawStatusPage(s.target);
  assert.equal(s.rows().filter(row=>!row.hidden).length,1);
  assert.match(s.target.innerHTML,/value="AB12CDE"/);
  s.c.openStatusPage("Delivered");s.c.drawStatusPage(s.target);
  assert.equal(s.c.statusVehicleSearch,"");
  assert.equal(s.rows().filter(row=>!row.hidden).length,1);
});
test("Empty lists and no-match searches are explicit; query and row attributes are escaped",()=>{
  const empty=setup([]);empty.c.drawStatusPage(empty.target);
  assert.equal(empty.fields.statusVehicleCount.textContent,"0 of 0 vehicles");
  assert.equal(empty.fields.statusVehicleEmpty.hidden,false);
  assert.match(empty.fields.statusVehicleEmpty.textContent,/No vehicles currently booked/);
  const s=setup([{...fixture("Delivered",0),reg:'AB12" data-injected="bad'}]);
  s.c.statusVehicleSearch='"><img src=x onerror=alert(1)>';
  s.c.drawStatusPage(s.target);
  assert.doesNotMatch(s.target.innerHTML,/<img src=x onerror/);
  assert.match(s.target.innerHTML,/&quot; data-injected=&quot;bad/);
  assert.equal(s.fields.statusVehicleEmpty.hidden,false);
  s.c.clearStatusVehicleSearch();assert.equal(s.rows()[0].hidden,false);
  assert.match(s.target.innerHTML,/for="statusVehicleSearch"/);
  assert.match(s.target.innerHTML,/aria-controls="statusVehicleTable"/);
});
test("new and delivered lists have a customer dropdown that combines with reference search",()=>{
 for(const status of ["New Booked Vehicle","Delivered"]){
  const rows=[{...fixture(status,0),business:"Movex",_businessId:"movex"},{...fixture(status,1),business:"Other Motors",_businessId:"other"},{...fixture(status,2),business:"Movex",_businessId:"movex"}];
  const s=setup(rows);s.c.selectedStatusPage=status;s.c.drawStatusPage(s.target);
  assert.match(s.target.innerHTML,/for="statusVehicleCustomer"/);
  assert.match(s.target.innerHTML,/All customers/);assert.match(s.target.innerHTML,/Movex \(2\)/);
  s.fields.statusBookingDetail.innerHTML="Previously viewed Other Motors booking";
  s.c.StatusCustomerFilter.change("business:movex");
  assert.equal(s.fields.statusBookingDetail.innerHTML,"");
  assert.equal(s.rows().filter(row=>!row.hidden).length,2);
  assert.equal(s.fields.statusVehicleCount.textContent,"2 of 3 vehicles");
  s.c.searchStatusVehicles("AB12CDE");
  assert.equal(s.rows().filter(row=>!row.hidden).length,1);
  s.c.clearStatusVehicleSearch();assert.equal(s.rows().filter(row=>!row.hidden).length,2);
  s.c.StatusCustomerFilter.change("");assert.equal(s.rows().filter(row=>!row.hidden).length,3);
 }
});
test("customer selections survive rerenders, stay independent by status, and reset across accounts",()=>{
 const s=setup([{...fixture("Delivered",0),business:"Movex"},{...fixture("Delivered",1),business:"Other Motors"},{...fixture("New Booked Vehicle",2),business:"Other Motors"}]);
 s.c.selectedStatusPage="Delivered";s.c.drawStatusPage(s.target);s.c.StatusCustomerFilter.change("business:movex");
 s.c.drawStatusPage(s.target);assert.equal(s.rows().filter(row=>!row.hidden).length,1);
 s.c.openStatusPage("New Booked Vehicle");s.c.drawStatusPage(s.target);
 assert.equal(s.rows().filter(row=>!row.hidden).length,1);
 assert.equal(s.c.StatusCustomerFilter.selected("New Booked Vehicle"),"");
 s.c.currentSession={user:{id:"admin-two"}};s.c.selectedStatusPage="Delivered";s.c.drawStatusPage(s.target);
 assert.equal(s.c.StatusCustomerFilter.selected("Delivered"),"");
 assert.equal(s.rows().filter(row=>!row.hidden).length,2);
});
test("dropdown is scoped to visible status rows, escapes names and leaves all-status overview unchanged",()=>{
 const visible=[{...fixture("Delivered",0),business:'Movex <script>"x"</script>'}];
 const s=setup([...visible,{...fixture("Delivered",1),business:"Hidden Customer"}],visible);
 s.c.selectedStatusPage="Delivered";s.c.drawStatusPage(s.target);
 assert.doesNotMatch(s.target.innerHTML,/Hidden Customer/);
 assert.match(s.target.innerHTML,/Movex &lt;script&gt;&quot;x&quot;&lt;\/script&gt;/);
 s.c.StatusCustomerFilter.change("business:not-found");
 assert.equal(s.fields.statusVehicleCount.textContent,"0 of 1 vehicles");
 assert.match(s.fields.statusVehicleEmpty.textContent,/No vehicles match this customer/);
 s.c.selectedStatusPage="All";s.c.drawStatusPage(s.target);
 assert.doesNotMatch(s.target.innerHTML,/id="statusVehicleCustomer"/);
 assert.equal(s.rows().filter(row=>!row.hidden).length,1);
});
test("customer identity keeps same-name accounts separate and links unambiguous legacy names",()=>{
 const s=setup([]),api=s.c.StatusCustomerFilter,rows=[
  {business:"Movex",_businessId:"one"},{business:" MOVEX "},
  {business:"Same Name",_businessId:"two"},{business:"Same Name",_businessId:"three"},
  {customerType:"Private",privateCustomerName:"Movex",_clientId:"private-client"}];
 const model=api.model(rows,"Delivered");
 assert.equal(api.customerKey(rows[0],model),api.customerKey(rows[1],model));
 assert.notEqual(api.customerKey(rows[2],model),api.customerKey(rows[3],model));
 assert.notEqual(api.customerKey(rows[0],model),api.customerKey(rows[4],model));
 assert.equal(model.choices.length,4);
 assert.equal(model.choices.find(option=>option.key==="business:one").count,2);
});
