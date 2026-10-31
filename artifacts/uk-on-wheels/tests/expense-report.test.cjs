const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
function setup(rows=[]){
 const context={Intl,Date,console,currentSession:{user:{id:"admin-a"}},getStore:()=>({expenses:rows})};
 context.window=context;vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(root,"public/expense-report.js"),"utf8"),context);
 return context;
}
const json=x=>JSON.parse(JSON.stringify(x));
const rows=[
 {date:"2026-10-01",category:"Fuel",amount:10.10,payee:"Station"},
 {date:"2026-10-31",category:"Fuel",amount:"20.20"},
 {date:"2026-10-15",category:"Entertainment",amount:50},
 {date:"2026-09-30",category:"Fuel",amount:999},
 {date:"2026-11-01",category:"Fuel",amount:999},
 {date:"2026-10-20",category:"Parking",amount:3.33},
 {date:"2026-02-30",category:"Fuel",amount:888}
];
const filter={from:"2026-10-01",to:"2026-10-31",category:""};
test("inclusive dates and exact category filter, including last date",()=>{
 const api=setup(rows).ExpenseReport,a=api.aggregate(rows,{...filter,category:"Fuel"});
 assert.equal(a.count,2);assert.equal(a.totalPennies,3030);
 assert.equal(a.rows[0].date,filter.from);assert.equal(a.rows[1].date,filter.to);
 assert.equal(a.byDay.length,31);
 assert.equal(a.byDay.reduce((n,r)=>n+r.totalPennies,0),a.totalPennies);
});
test("all charts and matching detail rows reconcile to total; source is immutable",()=>{
 const api=setup(rows).ExpenseReport,before=JSON.stringify(rows),a=api.aggregate(rows,filter);
 assert.equal(a.count,4);assert.equal(a.totalPennies,8363);
 assert.equal(a.byCategory.reduce((n,r)=>n+r.totalPennies,0),8363);
 assert.equal(a.rows.reduce((n,r)=>n+r.amountPennies,0),8363);
 assert.equal(JSON.stringify(rows),before);
});
test("invalid, missing and reversed dates produce explicit errors",()=>{
 const api=setup().ExpenseReport;
 for(const f of [{from:"",to:filter.to},{from:"2026-02-30",to:filter.to},{from:filter.to,to:filter.from}]){
  const a=api.aggregate(rows,f);assert.equal(a.ok,false);assert.ok(a.error);assert.equal(a.count,0);
 }
 assert.equal(api.validate({from:"2028-02-29",to:"2028-02-29"}),"");
});
test("category options retain built-in, custom and historic saved types",()=>{
 const api=setup().ExpenseReport;
 assert.deepEqual(json(api.categories([{category:"Historic"},{category:"Parking"},{category:" Fuel "}],["Fuel","Entertainment","Parking"])),["Fuel","Entertainment","Parking","Historic"]);
});
test("empty selection gives zero, no unrelated expenses or mock values",()=>{
 const a=setup().ExpenseReport.aggregate(rows,{...filter,category:"Hotel"});
 assert.equal(a.totalPennies,0);assert.equal(a.count,0);assert.deepEqual(json(a.byCategory),[]);
});
test("current-month range uses London date and leap-year boundaries",()=>{
 const api=setup().ExpenseReport;
 assert.deepEqual(json(api.monthRange(new Date("2026-03-31T23:30:00Z"))),{from:"2026-04-01",to:"2026-04-30"});
 assert.deepEqual(json(api.monthRange(new Date("2028-02-15T12:00:00Z"))),{from:"2028-02-01",to:"2028-02-29"});
});
test("render escapes saved content and contains category and temporal graphs",()=>{
 const c=setup([{date:new Date().toISOString().slice(0,10),category:'<script>bad</script>',amount:123,payee:'<img src=x>'}]);
 const html=c.ExpenseReport.render();
 assert.ok(html.includes("Spend by category"));assert.ok(html.includes("Daily spending trend"));
 assert.ok(html.includes("&lt;script&gt;bad&lt;/script&gt;"));assert.ok(!html.includes("<img src=x>"));
 assert.ok(html.includes("litres are not recorded"));assert.ok(html.includes("Matching records"));
});
test("filter actions repaint only report; auth change resets filter scope",()=>{
 const c=setup(rows),elements={xrFrom:{value:filter.from},xrTo:{value:filter.to},xrCat:{value:"Fuel"},expenseReport:{innerHTML:""},exAmount:{value:"99.99"}};
 c.document={getElementById:id=>elements[id]||null,activeElement:null};
 c.ExpenseReport.apply();assert.equal(c.ExpenseReport.state().category,"Fuel");
 assert.ok(elements.expenseReport.innerHTML.includes("£30.30"));
 elements.xrTo.value="2026-09-01";c.ExpenseReport.apply();
 assert.ok(elements.expenseReport.innerHTML.includes('role="alert"'));
 assert.equal(c.ExpenseReport.state().to,"2026-09-01");
 assert.equal(elements.exAmount.value,"99.99");
 c.currentSession={user:{id:"admin-b"}};c.ExpenseReport.paint();
 assert.equal(c.ExpenseReport.state().category,"");
 assert.equal(c.ExpenseReport.state().problem,"");
});
test("save and expense-type refresh hooks call report without wrapping closure functions",()=>{
 for(const file of ["expense-monthly.js","expense-types.js"]){
  const text=fs.readFileSync(path.join(root,"public",file),"utf8");
  assert.ok(text.includes("window.ExpenseReport?.paint();"));
 }
 const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
 assert.ok(html.includes('src="./expense-report.js"'));assert.ok(html.includes('href="./expense-report.css"'));
 assert.ok(html.includes("window.ExpenseReport?.mount();"));
 assert.equal((html.match(/window\.ExpenseReport\?\.reset\(\)/g)||[]).length,2);
});
