const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto").webcrypto;
async function setup(){
 const records=[],calls=[];
 const c=vm.createContext({crypto,window:{},location:{hostname:"portal.ukonwheels.org",search:""},currentSession:{user:{id:"admin"}},
   role:"admin",page:"buying",hasPermission:()=>true,crmConfirm:async()=>true,
   document:{getElementById:()=>null,querySelector:()=>null},setTimeout,clearTimeout});
 c.sb={rpc:async(name,args)=>{
   calls.push({name,args});
   if(name==="read_vehicle_trades")return {data:{trades:records.slice(),canManage:true}};
   const previous=records.find(r=>r.id===args.p_id);
   if(previous?._mutation===args.p_mutation_id)return {data:{trade:previous,canManage:true}};
   const p=args.p_trade,r={...p,...c.VehicleTrading.totals(p),day:c.VehicleTrading.day(p.purchaseDate),
     id:args.p_id,version:args.p_expected_version+1,createdAt:"2026-10-18",updatedAt:"2026-10-18",_mutation:args.p_mutation_id};
   records.splice(0,records.length,r,...records.filter(x=>x.id!==r.id));
   return {data:{trade:r,canManage:true}};
 }};
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/vehicle-trading-ui.js"),"utf8"),c);c.VehicleTradingUI=c.window.VehicleTradingUI;
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/vehicle-trading.js"),"utf8"),c);c.VehicleTrading=c.window.VehicleTrading;
 c.go=target=>{c.page=target;c.VehicleTrading.draw({innerHTML:""},target);};
 await c.VehicleTrading.draw({innerHTML:""},"buying");return {c,api:c.VehicleTrading,ui:c.VehicleTradingUI,records,calls};
}
function fill(api){
 for(const [key,value] of Object.entries({purchaseDate:"2026-10-18",purchaseSource:"auction",sellerName:"Test Auction",
   registration:"ab12 cde",make:"Ford",model:"Focus",mileage:"42000",purchaseAmount:"1000",fuel:"20.10",
   motCharges:"40",roadTax:"30",auctionCharges:"100",serviceHistory:"Full",logBook:"Yes"}))api.update(key,value);
}
test("Trading deducts purchase and every charge exactly; unsold is not a loss",async()=>{
 const {api}=await setup();fill(api);
 assert.equal(api.state().totals.totalCost,1190.10);assert.equal(api.state().totals.profit,null);
 api.update("soldFor","1500");assert.equal(api.state().totals.profit,309.90);
 api.update("soldFor","1100");assert.equal(api.state().totals.profit,-90.10);
 api.update("soldFor","1190.10");assert.equal(api.state().totals.profit,0);
 api.update("soldFor","0");assert.equal(api.state().totals.profit,-1190.10);
 assert.equal(api.day("2026-10-18"),"Sunday");
});
test("Trading validates required seller/vehicle/date/mileage and pence before any write",async()=>{
 const {api,calls}=await setup();await api.save();assert.ok(Object.keys(api.state().errors).length>0);
 assert.equal(calls.filter(x=>x.name==="save_vehicle_trade").length,0);
 fill(api);const d=api.state().draft;
 for(const [f,v] of [["purchaseDate","2026-02-30"],["purchaseAmount","0"],["fuel","0.001"],["roadTax","-1"],
   ["mileage","4.2"],["sellerName",""],["registration","<>"],["logBook","invalid"]]){
   assert.ok(api.validate({...d,[f]:v}).errors[f],f);
 }
 assert.equal(api.validate({...d,purchaseDate:"2024-02-29"}).errors.purchaseDate,undefined);
 assert.ok(api.validate({...d,soldFor:""},true).errors.soldFor);
 assert.equal(api.validate({...d,soldFor:"0"},true).payload.soldFor,0);
});
test("A saved purchase persists on read and can be sold with updated signed profit",async()=>{
 const {api,c,records}=await setup();fill(api);await api.save();
 assert.equal(records.length,1);assert.equal(records[0].registration,"AB12 CDE");
 assert.equal(api.state().draft,null);const id=records[0].id;
 c.page="selling";await api.draw({innerHTML:""},"selling");await api.recordSale(id);
 api.update("soldFor","1500");await api.save();
 assert.equal(records.length,1);assert.equal(records[0].version,2);assert.equal(records[0].profit,309.90);
 await api.reload();assert.equal(api.state().rows[0].soldFor,1500);
});
test("Lost response retains locked draft and retries same vehicle, mutation and exact payload",async()=>{
 const {api,c,records,calls}=await setup();fill(api);const real=c.sb.rpc;let lose=true;
 c.sb.rpc=async(...args)=>{const r=await real(...args);if(args[0]==="save_vehicle_trade"&&lose){lose=false;throw Error("Connection lost");}return r;};
 await api.save();assert.equal(api.state().uncertain,true);
 api.update("purchaseAmount","9999");assert.equal(api.state().draft.purchaseAmount,"1000");
 await api.save();const writes=calls.filter(x=>x.name==="save_vehicle_trade");
 assert.equal(writes.length,2);assert.equal(writes[0].args.p_id,writes[1].args.p_id);
 assert.equal(writes[0].args.p_mutation_id,writes[1].args.p_mutation_id);
 assert.deepEqual(writes[0].args.p_trade,writes[1].args.p_trade);assert.equal(records.length,1);
});
test("Conflicts retain the entered values; switching accounts clears private state",async()=>{
 const {api,c}=await setup();fill(api);
 c.sb.rpc=async()=>({error:{code:"40001",message:"Vehicle changed. Reload latest."}});
 await api.save();assert.equal(api.state().conflict,true);assert.equal(api.state().draft.sellerName,"Test Auction");
 c.currentSession={user:{id:"other"}};assert.equal(api.state().rows.length,0);assert.equal(api.state().draft,null);
});
test("Repeated Save clicks start only one mutation and a late old read cannot erase it",async()=>{
 const {api,c,records,calls}=await setup();fill(api);const real=c.sb.rpc;let finishRead;
 c.sb.rpc=(name,args)=>name==="read_vehicle_trades"?new Promise(resolve=>{finishRead=()=>resolve({data:{trades:[],canManage:true}});}):real(name,args);
 const read=api.reload();const save=api.save();api.save();await save;finishRead();await read;
 assert.equal(calls.filter(x=>x.name==="save_vehicle_trade").length,1);
 assert.equal(api.state().rows.length,1);assert.equal(records.length,1);assert.equal(api.state().loading,false);
});
test("An uncertain purchase remains recoverable on the Selling page",async()=>{
 const {api,c}=await setup();fill(api);c.sb.rpc=async()=>{throw Error("Connection lost");};
 await api.save();c.page="selling";await api.draw({innerHTML:""},"selling");
 assert.equal(api.state().uncertain,true);assert.equal(api.state().canManage,true);
 assert.equal(api.state().draft.sellerName,"Test Auction");
});
test("Recovering a conflicting sale loads its latest version into the sale editor",async()=>{
 const {api,c,records}=await setup();fill(api);await api.save();const id=records[0].id;
 c.page="selling";await api.draw({innerHTML:""},"selling");await api.recordSale(id);api.update("soldFor","1500");
 const real=c.sb.rpc;c.sb.rpc=async(name,args)=>name==="save_vehicle_trade"?{error:{code:"40001",message:"Vehicle changed"}}:real(name,args);
 await api.save();records[0]={...records[0],version:2,fuel:40.1,totalCost:1210.1};
 await api.recover();assert.equal(api.state().editingSale,true);assert.equal(api.state().draft.version,2);
 assert.equal(api.state().draft.fuel,"40.1");assert.equal(api.state().conflict,false);
});
test("Viewer cannot edit; production cannot activate the local synthetic saving branch",async()=>{
 const {api,c}=await setup();
 c.sb.rpc=async()=>({data:{trades:[],canManage:false}});await api.reload();
 await api.newPurchase();assert.equal(api.state().canManage,false);
 c.currentSession={user:{id:"local-preview-admin"}};c.location.search="?ui-preview=admin&ui-page=buying";
 assert.equal(api.isLocalPreview(),false);
});
test("Trading renderer exposes every requested field and escapes text; profit/loss are signed and styled",async()=>{
 const {api,ui}=await setup();fill(api);api.update("soldFor","1500");
 const s=api.state();s.draft.sellerName='<img src=x onerror="bad()">';
 const html=ui.render(s);
 for(const f of ["purchaseDate","purchaseSource","sellerName","purchaseAmount","fuel","motCharges","roadTax",
   "auctionCharges","mileage","registration","make","model","serviceHistory","logBook","soldFor"])
   assert.ok(html.includes('data-trade-field="'+f+'"'),f);
 assert.ok(html.includes("+£309.90"));assert.ok(!html.includes("<img"));assert.ok(html.includes("&lt;img"));
 const negative=ui.render({...s,totals:{totalCost:1190.10,profit:-90.10}});
 assert.ok(negative.includes("-£90.10"));assert.match(negative,/vtProfit/);
 assert.match(ui.render({...s,totals:{totalCost:1190.10,profit:null}}),/Not sold/);
});
test("The wide trade register contains its own layout overflow and mobile header rules stay scoped",()=>{
 const css=fs.readFileSync(path.join(__dirname,"../public/vehicle-trading.css"),"utf8");
 assert.match(css,/\.vehicleTrading \.vtScroll\{[^}]*overflow-x:auto;[^}]*contain:layout/);
 assert.match(css,/body\.trading-mode \.topbarStart\{[^}]*min-width:0/);
 assert.match(css,/body\.trading-mode \.profileInfo,body\.trading-mode \.topDivider\{display:none/);
});
