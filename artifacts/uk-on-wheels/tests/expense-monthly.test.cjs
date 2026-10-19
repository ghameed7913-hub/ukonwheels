const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto").webcrypto;
const root=path.join(__dirname,".."),html=fs.readFileSync(path.join(root,"index.html"),"utf8");
function setup(initial){
 let clock=Date.parse("2026-10-19T12:00:00Z");
 class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 const fields={};for(const id of ["exDate","exCat","exAmount","exMethod","exRef","exPayee","exNotes","expenseEntryStatus","singleExpenseSave","singleExpenseClear","expenseMonthPanel","expenseRegister","expenseBulkPanel"]){
  fields[id]={value:id==="exMethod"?"Cash":"",disabled:false,textContent:"",innerHTML:"",setAttribute(){},querySelectorAll:()=>[]};
 }
 const server={expenses:initial||[
  {id:"old",date:"2026-09-30",category:"Fuel",amount:100,payee:"September only"},
  {id:"today",date:"2026-10-19",category:"Fuel",amount:10.01,payee:"October A"},
  {id:"payroll",date:"2026-10-20",category:"Wages",amount:20.02,source:"payslip",payee:"October B"},
  {id:"next",date:"2026-11-01",category:"Rent",amount:99,payee:"November only"}
 ]};
 const calls=[],alerts=[];
 const context={crypto,Date:Clock,window:{confirm:()=>true,alert:x=>alerts.push(x)},document:{
  getElementById:id=>fields[id]||null,querySelector:s=>s==="[data-single-expense-save]"?fields.singleExpenseSave:null,
  querySelectorAll:s=>s.includes("#expenseSingleForm")?["exDate","exCat","exAmount","exMethod","exRef","exPayee","exNotes"].map(k=>fields[k]):[]
 },role:"admin",page:"expenses",expenseCanManage:true,currentSession:{user:{id:"admin"}},
 STORE_CACHE:{expenses:structuredClone(server.expenses),bookings:[],transactions:[]},
 flushSharedStore:async()=>true,ensureAccountsData:()=>c.STORE_CACHE,loadPayrollView:()=>false,
 getStore:()=>c.STORE_CACHE,money:n=>"£"+Number(n||0).toFixed(2),escapeHtml:s=>String(s??"").replace(/</g,"&lt;"),
 sb:{rpc:async(name,args)=>{
  calls.push({name,args});
  if(!server.expenses.some(e=>e.batchId===args.p_batch_id))server.expenses.push(...args.p_expenses.map((r,i)=>({...r,id:"EXP-"+args.p_batch_id+"-"+i,source:"expense-batch",batchId:args.p_batch_id})));
  return {data:{batch_id:args.p_batch_id,saved_count:args.p_expenses.length,expenses:structuredClone(server.expenses)}};
 }}};
 const c=vm.createContext(context);
 for(const [file,global] of [["expense-bulk-ui.js","ExpenseBulkUI"],["expense-bulk.js","ExpenseBulk"],["expense-monthly-ui.js","ExpenseMonthUI"],["expense-monthly.js","ExpenseMonth"]]){
  vm.runInContext(fs.readFileSync(path.join(root,"public",file),"utf8"),c);c[global]=c.window[global];
 }
 vm.runInContext(html.slice(html.indexOf("function expenseRegisterHtml("),html.indexOf("function drawInvoices(")),c);
 c.ExpenseMonth.paint();
 return {c,api:c.ExpenseMonth,bulk:c.ExpenseBulk,ui:c.ExpenseMonthUI,fields,calls,alerts,server,setTime:iso=>{clock=Date.parse(iso)}};
}
function single(f,date="2026-10-19",amount="12.34"){f.exDate.value=date;f.exCat.value="Fuel";f.exAmount.value=amount;f.exPayee.value="Test supplier";}
function fillBulk(bulk){
 bulk.open();for(const r of bulk.state().rows){bulk.update(r.key,"category","Fuel");bulk.update(r.key,"amount","1.23");}
}
test("Current London month opens by default; month/day filters and exact-pence totals preserve the full store",()=>{
 const {api,c,fields}=setup(),v=api.state();
 assert.equal(v.month,"2026-10");assert.equal(v.monthCount,2);assert.equal(v.monthTotal,30.03);assert.equal(v.days.length,31);assert.equal(v.firstDay,3);
 assert.equal(fields.exDate.value,"2026-10-19");
 assert.doesNotMatch(c.expenseRegisterHtml(c.STORE_CACHE),/September only|November only/);
 assert.equal(api.selectDay("2026-10-20"),true);assert.equal(api.state().visibleCount,1);assert.equal(api.state().visibleTotal,20.02);
 assert.equal(fields.exDate.value,"2026-10-20");assert.match(c.expenseRegisterHtml(c.STORE_CACHE),/Linked to payslip/);
 api.allDays();assert.equal(api.state().visibleCount,2);assert.equal(c.STORE_CACHE.expenses.length,4);
});
test("Historical months and empty future months are available without moving, deleting or rewriting entries",()=>{
 const {api,c,fields}=setup();const before=JSON.stringify(c.STORE_CACHE.expenses);
 api.selectMonth("2026-09");assert.equal(api.state().monthCount,1);assert.equal(fields.exDate.value,"2026-09-01");
 assert.match(c.expenseRegisterHtml(c.STORE_CACHE),/September only/);assert.doesNotMatch(c.expenseRegisterHtml(c.STORE_CACHE),/October A/);
 api.selectMonth("2026-12");assert.equal(api.state().monthCount,0);assert.match(c.expenseRegisterHtml(c.STORE_CACHE),/No saved expenses/);
 assert.equal(JSON.stringify(c.STORE_CACHE.expenses),before);
 api.thisMonth();assert.equal(api.state().month,"2026-10");
});
test("Month/year rollover follows London dates, while a deliberately opened historical month stays selected",()=>{
 const {api,setTime,fields}=setup();
 setTime("2026-11-01T00:00:00Z");api.paint();assert.equal(api.state().month,"2026-11");assert.equal(fields.exDate.value,"2026-11-01");
 setTime("2027-01-01T00:00:00Z");api.paint();assert.equal(api.state().month,"2027-01");
 api.selectMonth("2026-09");setTime("2027-02-01T00:00:00Z");api.paint();assert.equal(api.state().month,"2026-09");
 assert.equal(api.today(new Date("2026-03-31T23:30:00Z")),"2026-04-01");
 assert.equal(api.bounds("2024-02").days,29);assert.equal(api.bounds("2026-02").days,28);
 api.selectMonth("2026-12");api.shiftMonth(1);assert.equal(api.state().month,"2027-01");
});
test("Unfinished single and bulk entries block month changes and automatic rollover, without changing their dates",async()=>{
 const {api,fields,setTime,bulk}=setup();single(fields);assert.equal(api.selectMonth("2026-09"),false);
 assert.equal(fields.exAmount.value,"12.34");assert.equal(api.state().month,"2026-10");
 setTime("2026-11-01T00:00:00Z");api.paint();assert.equal(api.state().month,"2026-10");assert.match(api.state().rolloverNotice,/new month/i);
 await api.clearSingle();assert.equal(api.state().month,"2026-11");assert.equal(fields.exDate.value,"2026-11-01");
 fillBulk(bulk);assert.equal(api.selectMonth("2026-09"),false);assert.equal(bulk.state().rows[0].date,"2026-11-01");
});
test("Clicking a date gives blank and new bulk rows that date but never silently rewrites populated rows",()=>{
 const {api,bulk}=setup();bulk.open();api.selectDay("2026-10-04");
 assert.ok(bulk.state().rows.every(r=>r.date==="2026-10-04"));
 const key=bulk.state().rows[0].key;bulk.update(key,"amount","4");api.selectDay("2026-10-05");bulk.addRow();
 assert.equal(bulk.state().rows[0].date,"2026-10-04");assert.equal(bulk.state().rows[1].date,"2026-10-05");assert.equal(bulk.state().rows[2].date,"2026-10-05");
});
test("Single entries use the atomic authorised batch RPC and retain every other month and paid payroll expense",async()=>{
 const {api,fields,c,calls,server}=setup();single(fields);await api.saveSingle();
 assert.equal(calls.length,1);assert.equal(calls[0].name,"save_expense_batch");assert.equal(calls[0].args.p_expenses.length,1);
 assert.equal(c.STORE_CACHE.expenses.length,5);assert.equal(server.expenses.length,5);assert.equal(api.state().monthCount,3);
 assert.equal(fields.exAmount.value,"");assert.equal(fields.exDate.value,"2026-10-19");assert.match(fields.expenseEntryStatus.textContent,/Saved expense/);
 assert.equal(c.STORE_CACHE.expenses.find(x=>x.id==="old").amount,100);
 assert.equal(c.STORE_CACHE.expenses.find(x=>x.id==="payroll").source,"payslip");
});
test("A lost single-save response locks its payload and retries the same ID without creating a duplicate",async()=>{
 const {api,fields,c,calls,server,bulk}=setup();single(fields);const real=c.sb.rpc;let first=true;
 c.sb.rpc=async(...args)=>{const result=await real(...args);if(first){first=false;throw Error("Network interrupted");}return result;};
 await api.saveSingle();assert.equal(api.singleLocked(),true);assert.equal(server.expenses.length,5);assert.equal(c.STORE_CACHE.expenses.length,4);
 assert.equal(fields.exAmount.disabled,true);assert.equal(fields.singleExpenseSave.disabled,false);assert.equal(fields.singleExpenseSave.textContent,"Retry save");
 assert.equal(api.selectMonth("2026-09"),false);bulk.open();assert.equal(bulk.state().open,false);
 await api.saveSingle();assert.equal(calls[0].args.p_batch_id,calls[1].args.p_batch_id);assert.equal(server.expenses.length,5);assert.equal(api.singleLocked(),false);
});
test("Validation and definite server failures keep editable input and do not report false success",async()=>{
 const {api,fields,c,calls}=setup();single(fields,"2026-09-30");await api.saveSingle();assert.equal(calls.length,0);assert.match(fields.expenseEntryStatus.textContent,/October 2026/);
 single(fields,"2026-10-19","-1");await api.saveSingle();assert.equal(calls.length,0);
 single(fields);c.sb.rpc=async()=>({error:{code:"PGRST202"}});await api.saveSingle();
 assert.equal(api.singleLocked(),false);assert.equal(fields.exAmount.disabled,false);assert.equal(fields.exAmount.value,"12.34");assert.match(fields.expenseEntryStatus.textContent,/bulk-expenses.sql/);
});
test("Whole bulk saves remain atomic, refresh the month totals, and reject any out-of-month row",async()=>{
 const {api,bulk,c,calls}=setup();api.selectMonth("2026-09");api.selectDay("2026-09-04");fillBulk(bulk);
 const key=bulk.state().rows[1].key;bulk.update(key,"date","2026-10-01");await bulk.save();assert.equal(calls.length,0);assert.match(bulk.state().error,/September 2026/);
 bulk.update(key,"date","2026-09-29");await bulk.save();assert.equal(calls.length,1);assert.equal(api.state().monthCount,3);assert.equal(api.state().visibleCount,1);
 assert.equal(c.STORE_CACHE.expenses.length,6);assert.match(c.expenseRegisterHtml(c.STORE_CACHE),/2026-09-04/);
});
test("A repeated click cannot overlap a single save; a user change clears the private pending state",async()=>{
 const {api,fields,c,calls}=setup();single(fields);let finish,entered;const real=c.sb.rpc,started=new Promise(r=>entered=r);
 c.sb.rpc=(...args)=>new Promise(resolve=>{finish=async()=>resolve(await real(...args));entered();});
 const saving=api.saveSingle();await started;await api.saveSingle();assert.equal(api.singleSaving(),true);
 c.currentSession={user:{id:"another-admin"}};api.state();await finish();await saving;
 assert.equal(calls.length,1);assert.equal(api.singleLocked(),false);assert.equal(c.STORE_CACHE.expenses.length,4);
});
test("Month UI exposes labelled controls, safely escaped messages and selected/today calendar states",()=>{
 const {api,ui}=setup();api.selectDay("2026-10-19");const v=api.state(),markup=ui.render({...v,rolloverNotice:'<img src=x onerror="bad()">',locked:true});
 assert.match(markup,/type="month"/);assert.match(markup,/Saved months/);assert.match(markup,/aria-current="date"/);assert.match(markup,/aria-pressed="true"/);
 assert.match(markup,/&lt;img/);assert.doesNotMatch(markup,/<img/);assert.match(markup,/disabled/);
});
test("A sign-in change while waiting for other portal saves cannot submit the previous user's single expense",async()=>{
 const {api,fields,c,calls}=setup();single(fields);
 c.flushSharedStore=async()=>{c.currentSession={user:{id:"different-admin"}};return true;};
 await api.saveSingle();assert.equal(calls.length,0);assert.equal(api.state().monthCount,2);assert.equal(api.singleLocked(),false);
});
test("A sign-in change during the pre-save wait also prevents submitting the previous user's bulk draft",async()=>{
 const {bulk,c,calls}=setup();fillBulk(bulk);
 c.flushSharedStore=async()=>{c.currentSession={user:{id:"different-admin"}};return true;};
 await bulk.save();assert.equal(calls.length,0);assert.equal(bulk.state().rows.length,0);
});
