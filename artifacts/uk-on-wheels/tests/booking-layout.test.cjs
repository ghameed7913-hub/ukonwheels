const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname,"..");
const html = fs.readFileSync(path.join(root,"index.html"),"utf8");
const css = fs.readFileSync(path.join(root,"public/booking-form.css"),"utf8");
function part(start,end) {
  const a=html.indexOf(start),b=html.indexOf(end,a);
  assert.ok(a>=0&&b>a,start);
  return html.slice(a,b);
}
const drawSource=part("function drawBooking(","async function createLinkedBooking(");
const enhanceSource=part("function enhancePortalUsability(","function openBookingFromRow(");
const toggleSource=part("function toggleCustomerTypeFields(","function showBusinessTariff(");
function render(role="admin") {
  const c=vm.createContext({
    role,currentUser:{name:"Synthetic Motors",accountType:"business"},getStore:()=>({}),
    escapeHtml:v=>String(v??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"),
    bookingBusinessOptions:()=>'<option value="">Select Business</option><option value="business-test">Synthetic Motors</option>',
    toggleCustomerTypeFields(){},loadBookingBusinesses(){},window:{BulkBooking:{mount(){}}},
  });
  vm.runInContext(drawSource,c);
  const target={innerHTML:""};c.drawBooking(target);return target.innerHTML;
}
test("Every visible Create Booking control has exactly one permanent label",()=>{
  const page=render();
  for(const id of ["bookingMode","customerType","biz","privateCustomerName","privateCustomerMobile","privateCustomerEmail","veh","reg","pickup","dest","service","miles","bdate","ddate","receiver","mobile","dropoff","amount","notes"]) {
    assert.equal((page.match(new RegExp('\\bfor="'+id+'"','g'))||[]).length,1,id);
    assert.equal((page.match(new RegExp('\\bid="'+id+'"','g'))||[]).length,1,id+" input");
  }
  assert.equal((page.match(/<span>Business<\/span>/g)||[]).length,1);
  assert.match(page,/class="form booking-fields"/);
  assert.match(page,/onclick="createBooking\(\)"/);
});
test("Repeated enhancement reuses native associated labels on nested controls",()=>{
  const labels=[];
  let generated=0;
  const control={id:"biz",type:"select-one",placeholder:"",labels,
    parentElement:{classList:{contains:()=>false}},
    closest:()=>null,getAttribute:()=>null,
    before:label=>{labels.push(label);},
  };
  const c=vm.createContext({
    role:"admin",getComputedStyle:()=>({display:"block"}),
    document:{
      querySelectorAll:selector=>selector.startsWith("#content .form")?[control]:[],
      createElement:()=>{generated++;return {};},
    },
  });
  vm.runInContext(enhanceSource,c);
  for(let n=0;n<5;n++)c.enhancePortalUsability();
  assert.equal(generated,1);
  assert.equal(labels[0].textContent,"Business");
  assert.equal(labels[0].htmlFor,"biz");
});
test("Existing manual labels are not duplicated or replaced by auto labels",()=>{
  let generated=0;
  const control={id:"biz",type:"select-one",labels:[{textContent:"Saved business"}],
    closest:()=>null,getAttribute:()=>null,
  };
  const c=vm.createContext({
    role:"admin",getComputedStyle:()=>({display:"block"}),
    document:{querySelectorAll:selector=>selector.startsWith("#content .form")?[control]:[],createElement:()=>{generated++;return {};}},
  });
  vm.runInContext(enhanceSource,c);c.enhancePortalUsability();
  assert.equal(generated,0);assert.equal(control.labels[0].textContent,"Saved business");
});
test("Private customer labels and inputs hide and show together without changing values",()=>{
  const fields={};
  for(const id of ["customerType","biz","privateCustomerName","privateCustomerMobile","privateCustomerEmail","tariffInfo","bookingBusinessField","privateCustomerNameField","privateCustomerMobileField","privateCustomerEmailField"])fields[id]={value:"",style:{},hidden:true};
  fields.customerType.value="Private";fields.privateCustomerName.value="Unchanged Client";
  const c=vm.createContext({role:"admin",document:{getElementById:id=>fields[id]},setTimeout(){},enhancePortalUsability(){}});
  vm.runInContext(toggleSource,c);c.toggleCustomerTypeFields();
  for(const id of ["privateCustomerName","privateCustomerMobile","privateCustomerEmail"]){
    assert.equal(fields[id].style.display,"block");
    assert.equal(fields[id+"Field"].hidden,false);
  }
  assert.equal(fields.bookingBusinessField.style.display,"none");
  fields.customerType.value="Business";c.toggleCustomerTypeFields();
  for(const id of ["privateCustomerName","privateCustomerMobile","privateCustomerEmail"]){
    assert.equal(fields[id].style.display,"none");assert.equal(fields[id+"Field"].hidden,true);
  }
  assert.equal(fields.privateCustomerName.value,"Unchanged Client");
});
test("Client booking keeps account ownership and has no Admin-only mode selector",()=>{
  const page=render("client");
  assert.doesNotMatch(page,/id="bookingMode"/);
  assert.match(page,/id="biz" type="hidden"/);
  assert.match(page,/Synthetic Motors/);
});
test("Booking layout uses shrinkable columns, bounded inputs and one-column phone layout",()=>{
  assert.match(css,/repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css,/@media \(max-width: 700px\)/);
  assert.match(css,/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css,/max-width:\s*100%/);
  assert.match(css,/\[hidden\][^{]*\{\s*display:\s*none !important/);
});

// An optional ignored visual fixture uses the real booking renderer, enhancer and CSS.
// It contains only synthetic values and never loads Supabase, auth or save functions.
if(process.argv.includes("--visual-fixture")) {
  const out=path.resolve(root,"../../generated-artifacts/booking-layout");
  fs.mkdirSync(out,{recursive:true});
  const styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join("\n");
  fs.writeFileSync(path.join(out,"index.html"),`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}\n${css}\nbody{padding:24px}.booking-preview{max-width:1000px;margin:auto}.booking-form #singleVehicleFields[hidden]{display:none!important}</style></head><body><main id="content" class="booking-preview">${render()}</main><script>const role="admin";${enhanceSource}${toggleSource}document.getElementById("biz").value="business-test";if(new URLSearchParams(location.search).get("private")==="1")document.getElementById("customerType").value="Private";toggleCustomerTypeFields();for(let i=0;i<5;i++)enhancePortalUsability();document.body.dataset.businessLabelCount=document.getElementById("biz").labels.length;</script></body></html>`);
  console.log("Visual fixture: "+path.join(out,"index.html"));
}
