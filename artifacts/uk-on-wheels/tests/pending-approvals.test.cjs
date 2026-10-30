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
 const nodes={},calls=[];let rows=[],singles=[],rejects=[],reviews=[],keeps=[],markup="",confirmed=true,failure=null;
 const host={isConnected:true,querySelector:s=>nodes[s]||null,querySelectorAll:s=>({
  "[data-pa-id]":rows,"[data-pa-single]":singles,"[data-pa-reject]":rejects,
  "[data-pa-review]":reviews,"[data-pa-keep]":keeps
 }[s]||[])};
 Object.defineProperty(host,"innerHTML",{get:()=>markup,set:value=>{
  markup=value;
  for(const k of ["all","count","approve","back","message"])nodes[`[data-pa-${k}]`]={disabled:false,textContent:"",checked:false,indeterminate:false};
  const inputs=[...value.matchAll(/<input[^>]*data-pa-id="([^"]*)"[^>]*>/g)];
  rows=inputs.map(m=>({dataset:{paId:m[1]},checked:/\schecked/.test(m[0]),disabled:/\sdisabled/.test(m[0])}));
  singles=store.updateRequests.filter(r=>r.status==="Pending Approval").map(r=>({dataset:{paSingle:r.id}}));
  rejects=store.updateRequests.filter(r=>r.status==="Pending Approval").map(r=>({dataset:{paReject:r.id}}));
  reviews=store.updateRequests.filter(r=>r.status==="Pending Approval").map(r=>({dataset:{paReview:r.id}}));
  keeps=[...value.matchAll(/<input[^>]*data-pa-keep="([^"]*)"[^>]*>/g)].map(m=>({dataset:{paKeep:m[1]},checked:/\schecked/.test(m[0])}));
   for(const k of ["resubmit","reload","close","review-feedback","selection-hint"])nodes[`[data-pa-${k}]`]=value.includes(`data-pa-${k}`)?{disabled:false,scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;}}:null;
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
test("review compares all values but resubmits only selected actual requested changes",async()=>{
 const s=fixture();
 const request=s.store.updateRequests[0];
 request.previous={status:"Driver Assigned",miles:10,amount:100,destination:"Old address"};
 request.changes={status:"Driver Assigned",miles:10,amount:150,destination:"Requested address"};
 s.config.review=async()=>({request,current:{status:"On Route",miles:30,amount:100,destination:"Current address"},expected:{token:"snapshot"}});
 let confirmation;s.config.confirm=async(...args)=>{confirmation=args;return true;};
 s.config.resubmit=async(id,expected,changes)=>{
  s.calls.push({id,expected,changes});
  request.status="Superseded";
  const replacement={...request,id:"REPLACEMENT",status:"Pending Approval"};
  s.store.updateRequests.push(replacement);
  return {request:replacement,superseded_request_id:id};
 };
 await s.api.reviewId("R1");
 assert.match(s.host.innerHTML,/Latest saved/);
 assert.match(s.host.innerHTML,/On Route/);
 assert.match(s.host.innerHTML,/data-pa-keep="amount"/);
 assert.doesNotMatch(s.host.innerHTML,/data-pa-keep="status"|data-pa-keep="miles"/);
 const destination=s.host.querySelectorAll("[data-pa-keep]").find(e=>e.dataset.paKeep==="destination");
 destination.checked=false;destination.onchange();
 await s.api.submitReview();
 assert.equal(confirmation[1],"Submit replacement request");
 assert.equal(confirmation[2],"Submit replacement");
 const call=s.calls.find(x=>x.changes);
 assert.equal(call.id,"R1");
 assert.equal(JSON.stringify(call.changes),'{"amount":150}');
 assert.equal(JSON.stringify(call.expected),'{"token":"snapshot"}');
 assert.equal(request.status,"Superseded");
 assert.match(s.host.innerHTML,/Replacement request saved as Pending Approval/);
 assert.equal(s.api.busy(),false);
});
test("review retains the comparison and selection on server conflict; closing changes nothing",async()=>{
 const s=fixture(),request=s.store.updateRequests[0];
 request.previous={status:"Picked Up",amount:100};
 request.changes={status:"Picked Up",amount:150};
 s.config.review=async()=>({request,current:{status:"On Route",amount:100},expected:{current:100}});
 s.config.resubmit=async()=>{throw Error("The booking changed while you were reviewing");};
 await s.api.reviewId("R1");await s.api.submitReview();
 assert.match(s.host.innerHTML,/changed while you were reviewing/);
 assert.match(s.host.innerHTML,/Review latest booking again/);
 assert.match(s.host.innerHTML,/<section class="pa-review"[\s\S]*data-pa-review-feedback role="alert"[^>]*>The booking changed while you were reviewing/);
 assert.equal(s.nodes["[data-pa-review-feedback]"].scrolled,true);
 assert.equal(s.nodes["[data-pa-review-feedback]"].focused,true);
 assert.equal(request.status,"Pending Approval");
 s.host.querySelector("[data-pa-close]").onclick();
 assert.equal(s.api.busy(),false);
 assert.doesNotMatch(s.host.innerHTML,/Latest saved/);
});
test("review cancels without writing and already-applied values cannot be resubmitted",async()=>{
 const s=fixture(),request=s.store.updateRequests[0];
 request.previous={amount:100};request.changes={amount:150};
 s.config.review=async()=>({request,current:{amount:100},expected:{current:100}});
 s.config.resubmit=async()=>{throw Error("Must not be called");};
 await s.api.reviewId("R1");s.cancel();await s.api.submitReview();
 assert.equal(request.status,"Pending Approval");
 s.host.querySelector("[data-pa-close]").onclick();
 s.config.review=async()=>({request,current:{amount:150},expected:{current:150}});
 await s.api.reviewId("R1");
 assert.match(s.host.innerHTML,/All requested changes already match/);
 assert.doesNotMatch(s.host.innerHTML,/data-pa-keep="amount"/);
});
test("review does not offer a backwards Delivered status or replace another page after navigation",async()=>{
 const s=fixture(),request=s.store.updateRequests[0];
 request.previous={status:"On Route",amount:100};request.changes={status:"Picked Up",amount:150};
 s.config.review=async()=>({request,current:{status:"Delivered",amount:100},expected:{current:100}});
 await s.api.reviewId("R1");
 assert.doesNotMatch(s.host.innerHTML,/data-pa-keep="status"/);
 assert.match(s.host.innerHTML,/data-pa-keep="amount"/);
 s.host.querySelector("[data-pa-close]").onclick();
 let finish;s.config.review=()=>new Promise(r=>finish=r);
 const pending=s.api.reviewId("R1");
 s.host.innerHTML="<h2>Another page</h2>";
 s.nodes["[data-pa-approve]"]=null;
 finish({request,current:{amount:100},expected:{current:100}});
 await pending;
 assert.equal(s.host.innerHTML,"<h2>Another page</h2>");
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
test("Admin main page and navigation no longer expose booking approvals",()=>{
 const store={bookings:[],notifications:[],updateRequests:[{status:"Pending Approval"},{status:"Approved"}]};
 const ctx=vm.createContext({role:"admin",getStore:()=>store,visibleBookings:()=>[],
  ensureAdminDemoData(){},LOGO_IMG:"",ico:()=>"",currency:()=>"£0",go:p=>ctx.destination=p});
 vm.runInContext(part("function drawAdminDashboard(","function adminStatus("),ctx);
 const target={innerHTML:""};ctx.drawAdminDashboard(target);
 assert.doesNotMatch(target.innerHTML,/Pending Approval/);
 assert.doesNotMatch(html,/label:"Update Approvals"/);
 assert.doesNotMatch(html,/<script src="\.\/pending-approvals.js"/);
 assert.doesNotMatch(html,/sb\.rpc\("(request_booking_change|approve_booking_updates|resubmit_booking_update|review_booking_update)"/);
});
test("Direct save bridge merges confirmed booking values and never alters old requests",async()=>{
 const store={bookings:[{ref:"B1",pickupPhotos:{front:"keep"},status:"Picked Up"}],updateRequests:[{id:"R1",status:"Pending Approval"}],notifications:[],other:"keep"};
 const calls=[];
 const ctx=vm.createContext({role:"admin",currentSession:{user:{id:"a"}},storeReady:true,
  sharedSavePending:null,sharedSaveInFlight:null,getStore:()=>store,STORE_CACHE:store,
  crmConfirm:async()=>true,alert:message=>calls.push({alert:message}),sb:{rpc:async(name,args)=>{
   calls.push({name,args});return {data:{saved:true,booking:{ref:"B1",status:"On Route",amount:150}}};
  }}});
 vm.runInContext(part("const bookingChangeSubmissions=new Set();","function drawStatus("),ctx);
 const result=await ctx.saveBookingChanges(store.bookings[0],{amount:150},"Update Amount");
 assert.equal(result,true);assert.equal(calls[0].name,"save_booking_changes");
 assert.equal(calls[0].args.p_changes.amount,150);
 assert.equal(calls[0].args.p_expected.amount,0);
 assert.equal(ctx.STORE_CACHE.bookings[0].pickupPhotos.front,"keep");
 assert.equal(ctx.STORE_CACHE.other,"keep");assert.equal(ctx.STORE_CACHE.updateRequests[0].status,"Pending Approval");
 ctx.sb.rpc=async()=>({error:{code:"PGRST202"}});
 assert.equal(await ctx.saveBookingChanges(store.bookings[0],{amount:200},"Update Amount"),false);
 assert.match(calls.at(-1).alert,/booking-direct-updates.sql/);
 ctx.role="driver";assert.equal(await ctx.saveBookingChanges(store.bookings[0],{amount:200},"Update Amount"),false);
});
