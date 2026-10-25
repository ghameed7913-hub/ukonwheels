const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const js=fs.readFileSync(path.join(__dirname,"../public/pending-approvals.js"),"utf8");
function part(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));}
function fixture(){
 const store={bookings:[{ref:"B1",vehicle:"Car <unsafe>",reg:"AB12 CDE",status:"Picked Up"},{ref:"B2",vehicle:"Car 2",status:"Picked Up"}],
  updateRequests:[{id:"R1",bookingRef:"B1",requestedBy:"<img>",status:"Pending Approval",changes:{status:"On Route"}},
   {id:"R2",bookingRef:"B2",status:"Pending Approval",changes:{status:"On Route"}},
   {id:"MISSING",bookingRef:"GONE",status:"Pending Approval",changes:{}},
   {id:"DONE",bookingRef:"B1",status:"Approved",changes:{}}]};
 const nodes={},calls=[];let rows=[],singles=[],rejects=[],markup="",confirmed=true,failure=null;
 const host={isConnected:true,querySelector:s=>nodes[s]||null,querySelectorAll:s=>s==="[data-pa-id]"?rows:s==="[data-pa-single]"?singles:rejects};
 Object.defineProperty(host,"innerHTML",{get:()=>markup,set:value=>{
  markup=value;
  for(const k of ["all","count","approve","back","message"])nodes[`[data-pa-${k}]`]={disabled:false,textContent:"",checked:false,indeterminate:false};
  const inputs=[...value.matchAll(/<input[^>]*data-pa-id="([^"]*)"[^>]*>/g)];
  rows=inputs.map(m=>({dataset:{paId:m[1]},checked:/\schecked/.test(m[0]),disabled:/\sdisabled/.test(m[0])}));
  singles=store.updateRequests.filter(r=>r.status==="Pending Approval").map(r=>({dataset:{paSingle:r.id}}));
  rejects=store.updateRequests.filter(r=>r.status==="Pending Approval").map(r=>({dataset:{paReject:r.id}}));
 }});
 const context=vm.createContext({window:{},getStore:()=>store,go:()=>{}});
 vm.runInContext(js,context);
 const api=context.window.PendingApprovals;
 const config={store,canApprove:true,confirm:async()=>confirmed,reject:id=>calls.push(["reject",id]),approve:async ids=>{
  calls.push([...ids]);if(failure)throw failure;
  store.updateRequests.forEach(r=>{if(ids.includes(r.id))r.status="Approved";});
  return {approved_count:ids.length,already_approved_count:0};
 }};
 api.render(host,config);
 return {api,host,nodes,store,config,calls,rows:()=>rows,cancel:()=>confirmed=false,fail:()=>failure=new Error("No connection")};
}
test("Pending view lists only pending requests, escapes content, and disables missing bookings",()=>{
 const s=fixture();assert.match(s.host.innerHTML,/Car &lt;unsafe&gt;/);
 assert.doesNotMatch(s.host.innerHTML,/<img>|data-pa-id="DONE"/);
 assert.match(s.host.innerHTML,/3 pending/);
 assert.equal(s.rows().find(r=>r.dataset.paId==="MISSING").disabled,true);
 assert.equal(s.nodes["[data-pa-approve]"].disabled,true);
});
test("Select All and deselection update the count, indeterminate state and approval button",()=>{
 const s=fixture(),all=s.nodes["[data-pa-all]"];
 all.onchange({target:{checked:true}});
 assert.equal(s.nodes["[data-pa-count]"].textContent,"2 selected");
 assert.equal(s.nodes["[data-pa-approve]"].disabled,false);
 assert.equal(all.checked,true);
 const first=s.rows()[0];first.checked=false;first.onchange();
 assert.equal(s.nodes["[data-pa-count]"].textContent,"1 selected");
 assert.equal(all.indeterminate,true);
 all.onchange({target:{checked:false}});
 assert.equal(s.nodes["[data-pa-approve]"].disabled,true);
});
test("Approve All sends exactly the selected requests and removes confirmed approvals",async()=>{
 const s=fixture();s.nodes["[data-pa-all]"].onchange({target:{checked:true}});
 const second=s.rows()[1];second.checked=false;second.onchange();
 await s.nodes["[data-pa-approve]"].onclick();
 assert.deepEqual(s.calls,[["R1"]]);
 assert.equal(s.store.updateRequests[1].status,"Pending Approval");
 assert.match(s.host.innerHTML,/1 booking update approved and saved/);
 assert.doesNotMatch(s.host.innerHTML,/data-pa-id="R1"/);
});
test("Cancelled bulk confirmation and duplicate clicks cannot send extra approvals",async()=>{
 const s=fixture();s.cancel();await s.api.approveIds(["R1"]);assert.equal(s.calls.length,0);
 s.config.confirm=()=>new Promise(resolve=>{s.resolve=resolve;});
 const pending=s.api.approveIds(["R1"]);
 await s.api.approveIds(["R2"]);assert.equal(s.calls.length,0);
 s.resolve(true);await pending;assert.deepEqual(s.calls,[["R1"]]);
});
test("Failed approval retains selection, re-enables retry and never shows success",async()=>{
 const s=fixture();s.fail();s.nodes["[data-pa-all]"].onchange({target:{checked:true}});
 await s.nodes["[data-pa-approve]"].onclick();
 assert.match(s.host.innerHTML,/role="alert"/);assert.match(s.host.innerHTML,/No connection/);
 assert.doesNotMatch(s.host.innerHTML,/approved and saved/);
 assert.equal(s.rows().filter(r=>r.checked).length,2);
 assert.equal(s.nodes["[data-pa-approve]"].disabled,false);
});
test("Repainting after remote approval prunes stale selections",()=>{
 const s=fixture();s.nodes["[data-pa-all]"].onchange({target:{checked:true}});
 s.store.updateRequests[0].status="Approved";s.api.render(s.host,s.config);
 assert.equal(s.nodes["[data-pa-count]"].textContent,"1 selected");
 assert.doesNotMatch(s.host.innerHTML,/data-pa-id="R1"/);
});
test("A completed request cannot replace another page after navigation",async()=>{
 const s=fixture();s.config.approve=()=>new Promise(resolve=>{s.resolve=resolve;});
 const work=s.api.approveIds(["R1"]);await new Promise(r=>setImmediate(r));
 s.host.innerHTML="<h2>Other page</h2>";delete s.nodes["[data-pa-approve]"];
 s.resolve({approved_count:1});await work;
 assert.equal(s.host.innerHTML,"<h2>Other page</h2>");
});
test("Admin main page includes Pending Approval with live count and routes to approval queue",()=>{
 const store={bookings:[],notifications:[],updateRequests:[{status:"Pending Approval"},{status:"Approved"}]};
 const ctx=vm.createContext({role:"admin",getStore:()=>store,visibleBookings:()=>[],
  ensureAdminDemoData(){},LOGO_IMG:"",ico:()=>"",currency:()=>"£0",go:p=>ctx.destination=p});
 vm.runInContext(part("function drawAdminDashboard(","function adminStatus("),ctx);
 const target={innerHTML:""};ctx.drawAdminDashboard(target);
 assert.match(target.innerHTML,/openStatusPage\('Pending Approval'\)/);
 assert.match(target.innerHTML,/<b>Pending Approval<\/b><strong>1<\/strong>/);
 vm.runInContext(part("function openStatusPage(","function vehicleMatchesSearch("),ctx);
 ctx.openStatusPage("Pending Approval");assert.equal(ctx.destination,"approvals");
});
test("Admin approval bridge validates server confirmation and merges only saved approval data",async()=>{
 const store={bookings:[{ref:"B1",pickupPhotos:{front:"keep"},status:"Picked Up"}],updateRequests:[{id:"R1",status:"Pending Approval"}],notifications:[],other:"keep"};
 const calls=[];
 const ctx=vm.createContext({role:"admin",currentSession:{user:{id:"a"}},storeReady:true,
  sharedSavePending:null,sharedSaveInFlight:null,getStore:()=>store,STORE_CACHE:store,
  loadNormalizedPortalData:async()=>{},sb:{rpc:async(name,args)=>{
   calls.push({name,args});return {data:{approved_count:1,requests:[{id:"R1",status:"Approved"}],bookings:[{ref:"B1",status:"On Route"}],notifications:[]}};
  }}});
 vm.runInContext(part("async function approvePendingBookingUpdates(","function rejectUpdateRequest("),ctx);
 const result=await ctx.approvePendingBookingUpdates(["R1"]);
 assert.equal(result.approved_count,1);assert.equal(calls[0].name,"approve_booking_updates");
 assert.equal(ctx.STORE_CACHE.bookings[0].pickupPhotos.front,"keep");
 assert.equal(ctx.STORE_CACHE.other,"keep");assert.equal(ctx.STORE_CACHE.updateRequests[0].status,"Approved");
 ctx.sb.rpc=async()=>({error:{code:"PGRST202"}});
 await assert.rejects(ctx.approvePendingBookingUpdates(["R1"]),/pending-booking-approvals.sql/);
 ctx.role="driver";await assert.rejects(ctx.approvePendingBookingUpdates(["R1"]),/Admin/);
});
