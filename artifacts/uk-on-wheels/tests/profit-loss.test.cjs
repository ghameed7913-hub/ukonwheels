const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
function setup(){
 const c={Date,Intl,console};c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/invoice-vehicles.js"),"utf8"),c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/profit-loss.js"),"utf8"),c);
 return c;
}
const store={
 bookings:[{ref:"A",status:"Delivered",_deliveredAt:"2026-10-01T10:00:00Z",amount:100.10,paymentStatus:"Paid"},{ref:"B",status:"Delivered",_deliveredAt:"2026-10-31T10:00:00Z",amount:200.20,paymentStatus:"Pending"},{ref:"C",status:"Delivered",_deliveredAt:"2026-11-01T10:00:00Z",amount:999}],
 transactions:[{date:"2026-10-01",amount:100.10},{date:"2026-10-31",amount:200.20},{date:"2026-11-01",amount:999}],
 invoices:[{date:"2026-10-15",status:"Paid",total:50},{date:"2026-10-20",status:"Pending",total:999}],
 expenses:[{date:"2026-10-01",amount:10.10},{date:"2026-10-31",amount:20.20},{date:"2026-09-30",amount:999}]
};
test("inclusive dates count delivered booking revenue once, both paid and unpaid",()=>{
 const before=JSON.stringify(store),r=setup().ProfitLoss.aggregate(store,"2026-10-01","2026-10-31");
 assert.equal(r.income,30030);assert.equal(r.expenses,3030);assert.equal(r.net,27000);assert.equal(r.count,4);
 assert.equal(JSON.stringify(store),before);
});
test("single-day, cross-month, loss and empty ranges",()=>{
 const api=setup().ProfitLoss;
 assert.equal(api.aggregate(store,"2026-10-31","2026-10-31").net,18000);
 assert.equal(api.aggregate(store,"2026-10-31","2026-11-01").income,119920);
 assert.equal(api.aggregate(store,"2026-09-30","2026-09-30").net,-99900);
 const empty=api.aggregate(store,"2027-01-01","2027-01-31");
 assert.equal(empty.net,0);assert.equal(empty.count,0);
});
test("missing, impossible and reversed dates fail; leap days valid",()=>{
 const api=setup().ProfitLoss;
 for(const [f,t] of [["","2026-10-31"],["2026-02-30","2026-10-31"],["2026-11-01","2026-10-01"]])assert.ok(api.aggregate(store,f,t).error);
 assert.equal(api.validDate("2028-02-29"),true);
 assert.equal(api.validDate("2026-02-29"),false);
});
test("undated records excluded with visible count, invalid money fails explicitly",()=>{
 const api=setup().ProfitLoss;
 assert.equal(api.aggregate({bookings:[{status:"Delivered",ref:"MISSING",deliveryDate:"2026-10-01",amount:999}],expenses:[{date:"bad",amount:10}]},"2026-10-01","2026-10-31").excluded,2);
 assert.ok(api.aggregate({expenses:[{date:"2026-10-01",amount:"bad"}]},"2026-10-01","2026-10-31").error);
});
test("London today handles summer midnight and defaults to month-to-date",()=>{
 const api=setup().ProfitLoss;
 assert.equal(api.today(new Date("2026-06-30T23:30:00Z")),"2026-07-01");
 const html=api.render(),end=api.today();
 assert.ok(html.includes(`value="${end.slice(0,7)}-01"`));assert.ok(html.includes(`value="${end}"`));
 assert.ok(html.includes("Up to today"));assert.ok(html.includes('onchange="runPL()"'));
});
test("changing dates recalculates visible totals; bad range clears stale totals",()=>{
 const c=setup(),elements={plFrom:{value:"2026-10-01"},plTo:{value:"2026-10-31"},plResult:{innerHTML:""}};
 c.document={getElementById:id=>elements[id]};
 c.ProfitLoss.calculate(store);assert.ok(elements.plResult.innerHTML.includes("£270.00"));assert.ok(elements.plResult.innerHTML.includes("Total Revenue"));
 elements.plFrom.value="2026-09-30";elements.plTo.value="2026-09-30";
 c.ProfitLoss.calculate(store);assert.ok(elements.plResult.innerHTML.includes("Net Loss"));assert.ok(elements.plResult.innerHTML.includes("-£999.00"));
 elements.plFrom.value="2026-10-31";c.ProfitLoss.calculate(store);
 assert.ok(elements.plResult.innerHTML.includes('role="alert"'));assert.ok(!elements.plResult.innerHTML.includes("£999"));
});
test("portal renders and calculates after authorised financial data loads",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.ok(html.includes('<script src="./profit-loss.js"></script>'));
 assert.match(html,/function drawProfitLoss[\s\S]*?loadPayrollView\(c,drawProfitLoss,loaded\)[\s\S]*?ProfitLoss.open\(c,ensureAccountsData\(\),/);
 assert.match(html,/function runPL\(\)\{\s*ProfitLoss.calculate\(ensureAccountsData\(\),currentSession\?\.user\?\.id\);/);
});
test("invoice and payment duplicates, unpaid invoice status and requested dates do not affect revenue",()=>{
 const api=setup().ProfitLoss,data={...store,transactions:[...store.transactions,...store.transactions],invoices:[...store.invoices,...store.invoices],
  bookings:[...store.bookings,{ref:"ACTIVE",status:"On Route",amount:500,deliveryDate:"2026-10-15"},{ref:"CANCEL",status:"Cancelled",amount:500,_deliveredAt:"2026-10-15"},{ref:"NO-DATE",status:"Delivered",amount:500,deliveryDate:"2026-10-15"}]};
 const report=api.aggregate(data,"2026-10-01","2026-10-31");
 assert.equal(report.income,30030);assert.equal(report.missingDeliveries[0],"NO-DATE");
 assert.equal(report.deliveries.reduce((sum,x)=>sum+x.pennies,0),report.income);
});
test("actual delivery timestamp uses London day, not booked, requested or payment day",()=>{
 const report=setup().ProfitLoss.aggregate({bookings:[{ref:"TZ",status:"Delivered",amount:75,_deliveredAt:"2026-06-30T23:30:00Z",deliveryDate:"2026-06-30",paidDate:"2026-08-01"}]},"2026-07-01","2026-07-01");
 assert.equal(report.income,7500);assert.equal(report.deliveries[0].date,"2026-07-01");
});
test("identical saved booking copies count once; conflicting copies require correction",()=>{
 const api=setup().ProfitLoss,b=store.bookings[0];
 assert.equal(api.aggregate({bookings:[b,b]},"2026-10-01","2026-10-31").income,10010);
 assert.ok(api.aggregate({bookings:[b,{...b,amount:200}]},"2026-10-01","2026-10-31").error);
});
test("missing dates are explicit, and saved booking references cannot inject HTML",()=>{
 const c=setup(),elements={plFrom:{value:"2026-10-01"},plTo:{value:"2026-10-31"},plResult:{innerHTML:""}};
 c.document={getElementById:id=>elements[id]};
 c.ProfitLoss.calculate({bookings:[{ref:"<img src=x>",status:"Delivered",amount:2}]});
 assert.ok(elements.plResult.innerHTML.includes("totals may be incomplete"));assert.ok(elements.plResult.innerHTML.includes("&lt;img src=x&gt;"));
 assert.ok(!elements.plResult.innerHTML.includes("<img src=x>"));
});
test("read every completed booking page, not only the API's first thousand rows",async()=>{
 const c=setup(),offsets=[];
 const client={from(table){assert.equal(table,"bookings");return {select(){return this},eq(k,v){assert.equal(k,"status");assert.equal(v,"Delivered");return this},order(){return this},range(from,to){offsets.push([from,to]);return Promise.resolve({data:from===0?Array.from({length:1000},(_,i)=>({id:"B"+i,reference:"B"+i,status:"Delivered",amount:1,delivered_at:"2026-10-01"})):[{id:"LAST",reference:"LAST",status:"Delivered",amount:2,delivered_at:"2026-10-31"}]})}}}};
 const rows=await c.ProfitLoss.readBookings(client);
 assert.equal(rows.length,1001);assert.equal(offsets.length,2);
 assert.equal(c.ProfitLoss.aggregate({bookings:rows},"2026-10-01","2026-10-31").income,100200);
});
test("failed live booking read shows an error, never a cached estimate",async()=>{
 const c=setup(),container={innerHTML:""};
 await c.ProfitLoss.open(container,store,{client:{from(){return {select(){return this},eq(){return this},order(){return this},range(){return Promise.resolve({error:{message:"Unavailable"}})}}}},actor:()=>"admin",active:()=>true});
 assert.ok(container.innerHTML.includes("Profit &amp; Loss could not load"));assert.ok(!container.innerHTML.includes("Total Revenue"));
});
test("live normalized records override stale cached bookings, while legacy-only deliveries remain",async()=>{
 const c=setup(),elements={plFrom:{value:"2026-10-01"},plTo:{value:"2026-10-31"},plResult:{innerHTML:""}},container={innerHTML:""};
 c.document={getElementById:id=>elements[id]};
 const client={from(){return {select(){return this},eq(){return this},order(){return this},range(){return Promise.resolve({data:[{id:"live",reference:"A",status:"Delivered",amount:80,delivered_at:"2026-10-02"}]})}}}};
 await c.ProfitLoss.open(container,{bookings:[{...store.bookings[0],_normalizedId:"live"},{ref:"OLD",status:"Delivered",amount:10,deliveredAt:"2026-10-03"},{_normalizedId:"no-longer-delivered",status:"Delivered",amount:999,_deliveredAt:"2026-10-01"}]},{client,actor:()=>"admin",active:()=>true});
 assert.ok(elements.plResult.innerHTML.includes("£90.00"));
 c.ProfitLoss.calculate(store,"another-user");assert.equal(elements.plResult.innerHTML.includes("£270.00"),false);
});
test("pending includes only unpaid completed deliveries in the selected delivery dates",()=>{
 const api=setup().ProfitLoss,data={...store,bookings:[...store.bookings,
  {ref:"ACTIVE-UNPAID",status:"On Route",amount:999,_deliveredAt:"2026-10-20"},
  {ref:"CANCELLED",status:"Cancelled",amount:999,_deliveredAt:"2026-10-20"},
  {ref:"NO-ACTUAL-DATE",status:"Delivered",amount:999,deliveryDate:"2026-10-20"}]};
 const r=api.aggregate(data,"2026-10-01","2026-10-31");
 assert.equal(r.pending,20020);assert.equal(r.pendingCount,1);
 assert.equal(r.income,30030);assert.equal(r.net,27000);
 assert.equal(r.deliveries.reduce((sum,x)=>sum+x.pendingPennies,0),r.pending);
 assert.equal(api.aggregate(data,"2026-10-01","2026-10-01").pending,0);
 assert.equal(api.aggregate(data,"2026-11-01","2026-11-01").pending,99900);
});
test("pending uses current payment state; invoice/payment duplicates never increase it",()=>{
 const api=setup().ProfitLoss,unpaid={...store.bookings[1],paymentStatus:"Unpaid"};
 const data={...store,bookings:[store.bookings[0],unpaid,unpaid]};
 assert.equal(api.aggregate(data,"2026-10-01","2026-10-31").pending,20020);
 unpaid.paymentStatus=" Paid ";
 const paid=api.aggregate(data,"2026-10-01","2026-10-31");
 assert.equal(paid.pending,0);assert.equal(paid.pendingCount,0);assert.equal(paid.income,30030);assert.equal(paid.net,27000);
});
test("empty results and zero charge bookings have zero pending",()=>{
 const api=setup().ProfitLoss;
 assert.equal(api.aggregate({},"2026-10-01","2026-10-31").pending,0);
 const r=api.aggregate({bookings:[{ref:"FREE",status:"Delivered",amount:0,deliveredAt:"2026-10-02"}]},"2026-10-01","2026-10-31");
 assert.equal(r.pending,0);assert.equal(r.pendingCount,0);
});
test("visible pending card and per-booking amounts update with dates and payment state",()=>{
 const c=setup(),elements={plFrom:{value:"2026-10-01"},plTo:{value:"2026-10-31"},plResult:{innerHTML:""}};
 c.document={getElementById:id=>elements[id]};
 c.ProfitLoss.calculate(store);
 assert.ok(elements.plResult.innerHTML.includes("<b>Pending Payment</b>"));
 assert.ok(elements.plResult.innerHTML.includes("£200.20"));
 assert.ok(elements.plResult.innerHTML.includes("not deducted from profit"));
 assert.ok(elements.plResult.innerHTML.includes("<th>Pending Payment</th>"));
 elements.plTo.value="2026-10-01";c.ProfitLoss.calculate(store);
 assert.ok(elements.plResult.innerHTML.includes("0 completed deliveries awaiting payment"));
 assert.ok(!elements.plResult.innerHTML.includes("£200.20"));
});
test("one pending tab switches the same detail panel between unpaid and all revenue bookings",()=>{
 const c=setup(),elements={plFrom:{value:"2026-10-01"},plTo:{value:"2026-10-31"},plResult:{innerHTML:""}};
 c.document={getElementById:id=>elements[id]};
 c.ProfitLoss.calculate(store);
 const panel=()=>elements.plResult.innerHTML.split('<section id="pl-details"')[1];
 assert.equal((elements.plResult.innerHTML.match(/id="pl-pending-tab"/g)||[]).length,1);
 assert.ok(panel().includes("<td>A</td>"));assert.ok(panel().includes("<td>B</td>"));
 c.ProfitLoss.selectTab("pending");
 assert.ok(elements.plResult.innerHTML.includes('id="pl-pending-tab" role="tab" aria-selected="true"'));
 assert.ok(panel().includes("<td>B</td>"));assert.ok(!panel().includes("<td>A</td>"));
 assert.ok(panel().includes("£200.20"));
 c.ProfitLoss.selectTab("revenue");
 assert.ok(panel().includes("<td>A</td>"));assert.ok(panel().includes("<td>B</td>"));
 assert.ok(panel().includes("£300.30"));
 assert.ok(elements.plResult.innerHTML.includes("£270.00"));
});
test("pending selection persists through date changes, clears empty results, and resets on sign-out",()=>{
 const c=setup(),elements={plFrom:{value:"2026-10-01"},plTo:{value:"2026-10-31"},plResult:{innerHTML:""}};
 c.document={getElementById:id=>elements[id]};
 c.ProfitLoss.calculate(store);c.ProfitLoss.selectTab("pending");
 elements.plTo.value="2026-10-01";c.ProfitLoss.calculate(store);
 assert.ok(elements.plResult.innerHTML.includes("No pending payments for completed deliveries in these dates."));
 assert.ok(!elements.plResult.innerHTML.includes("<td>A</td>"));
 c.ProfitLoss.reset();c.ProfitLoss.calculate(store);
 assert.ok(elements.plResult.innerHTML.includes('id="pl-revenue-tab" role="tab" aria-selected="true"'));
 assert.ok(elements.plResult.innerHTML.includes("<td>A</td>"));
 elements.plFrom.value="2026-11-01";c.ProfitLoss.calculate(store);
 c.ProfitLoss.selectTab("pending");
 assert.ok(elements.plResult.innerHTML.includes('role="alert"'));
 assert.ok(!elements.plResult.innerHTML.includes('role="tabpanel"'));
});
test("keyboard tab switching works and booking details are safely escaped",()=>{
 const c=setup(),elements={plFrom:{value:"2026-10-01"},plTo:{value:"2026-10-31"},plResult:{innerHTML:""}};
 c.document={getElementById:id=>elements[id]};
 c.ProfitLoss.calculate({bookings:[{...store.bookings[1],vehicle:"Ford Transit",reg:"AB12 CDE",pickup:"Leeds",destination:'<img src=x>'}]});
 let prevented=false;c.ProfitLoss.tabKey({key:"End",preventDefault(){prevented=true}});
 assert.equal(prevented,true);
 assert.ok(elements.plResult.innerHTML.includes('id="pl-pending-tab" role="tab" aria-selected="true"'));
 for(const detail of ["Ford Transit","AB12 CDE","Leeds","&lt;img src=x&gt;"])assert.ok(elements.plResult.innerHTML.includes(detail));
 assert.ok(!elements.plResult.innerHTML.includes("<img src=x>"));
 c.ProfitLoss.tabKey({key:"Home",preventDefault(){}});
 assert.ok(elements.plResult.innerHTML.includes('id="pl-revenue-tab" role="tab" aria-selected="true"'));
});
