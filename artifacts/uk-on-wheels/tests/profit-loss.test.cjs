const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
function setup(){
 const c={Date,Intl,console};c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/profit-loss.js"),"utf8"),c);
 return c;
}
const store={
 transactions:[{date:"2026-10-01",amount:100.10},{date:"2026-10-31",amount:200.20},{date:"2026-11-01",amount:999}],
 invoices:[{date:"2026-10-15",status:"Paid",total:50},{date:"2026-10-20",status:"Pending",total:999}],
 expenses:[{date:"2026-10-01",amount:10.10},{date:"2026-10-31",amount:20.20},{date:"2026-09-30",amount:999}]
};
test("inclusive custom dates preserve original income sources and exact penny totals",()=>{
 const before=JSON.stringify(store),r=setup().ProfitLoss.aggregate(store,"2026-10-01","2026-10-31");
 assert.equal(r.income,35030);assert.equal(r.expenses,3030);assert.equal(r.net,32000);assert.equal(r.count,5);
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
 assert.equal(api.aggregate({transactions:[{amount:999},{date:"bad",amount:10}]},"2026-10-01","2026-10-31").excluded,2);
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
 c.ProfitLoss.calculate(store);assert.ok(elements.plResult.innerHTML.includes("£320.00"));
 elements.plFrom.value="2026-09-30";elements.plTo.value="2026-09-30";
 c.ProfitLoss.calculate(store);assert.ok(elements.plResult.innerHTML.includes("Net Loss"));assert.ok(elements.plResult.innerHTML.includes("-£999.00"));
 elements.plFrom.value="2026-10-31";c.ProfitLoss.calculate(store);
 assert.ok(elements.plResult.innerHTML.includes('role="alert"'));assert.ok(!elements.plResult.innerHTML.includes("£999"));
});
test("portal renders and calculates after authorised financial data loads",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.ok(html.includes('<script src="./profit-loss.js"></script>'));
 assert.match(html,/function drawProfitLoss[\s\S]*?loadPayrollView\(c,drawProfitLoss,loaded\)[\s\S]*?ProfitLoss.render\(\);[\s\S]*?runPL\(\);/);
 assert.match(html,/function runPL\(\)\{\s*ProfitLoss.calculate\(ensureAccountsData\(\)\);/);
});
