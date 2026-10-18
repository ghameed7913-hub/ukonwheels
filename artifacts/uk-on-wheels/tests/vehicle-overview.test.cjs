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
    statusVehicleSearch:{value:"",focus(){this.focused=true;}}};
  const escape=value=>String(value??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const decode=value=>value.replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
  const target={
    get innerHTML(){return markup;},
    set innerHTML(value){
      markup=value;
      nodes=Array.from(value.matchAll(/<tr data-vehicle-reference="([^"]*)" data-vehicle-registration="([^"]*)">/g),
        match=>({hidden:false,dataset:{vehicleReference:decode(match[1]),vehicleRegistration:decode(match[2])}}));
    }
  };
  const c=vm.createContext({
    selectedStatusPage:"All",statusVehicleSearch:"",page:"desktop",portalProfiles:[],
    visibleBookings:()=>scope,getStore:()=>store,escapeHtml:escape,
    bookingDriverAssignmentButton:()=>"",bookingEvidenceButton:()=>"",
    ensureAdminDemoData(){},LOGO_IMG:"",ico:()=>"",currency:value=>"£"+value,
    document:{querySelectorAll:()=>nodes,getElementById:id=>fields[id]},
    render:()=>renderCount++,
  });
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
