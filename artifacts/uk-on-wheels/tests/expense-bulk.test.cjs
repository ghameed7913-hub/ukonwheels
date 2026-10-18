const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto").webcrypto;
function setup(){
  const store={expenses:[{category:"Fuel",amount:5},{source:"payslip",id:"PAY-EXP-1",amount:80}]},calls=[];
  const c=vm.createContext({crypto,window:{confirm:()=>true},document:{getElementById:()=>null,querySelector:()=>null},
    role:"admin",expenseCanManage:true,currentSession:{user:{id:"admin"}},STORE_CACHE:store,getStore:()=>store,
    flushSharedStore:async()=>true,sb:{rpc:async(name,args)=>{
      calls.push({name,args});const existing=store.expenses.filter(e=>e.batchId===args.p_batch_id);
      if(!existing.length)store.expenses.push(...args.p_expenses.map((r,i)=>({...r,source:"expense-batch",id:"EXP-"+args.p_batch_id+"-"+i,batchId:args.p_batch_id})));
      return {data:{batch_id:args.p_batch_id,saved_count:args.p_expenses.length,expenses:store.expenses.slice()}};
    }}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/expense-bulk-ui.js"),"utf8"),c);c.ExpenseBulkUI=c.window.ExpenseBulkUI;
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/expense-bulk.js"),"utf8"),c);c.ExpenseBulk=c.window.ExpenseBulk;
  return {c,api:c.ExpenseBulk,ui:c.ExpenseBulkUI,store,calls};
}
function fill(api){
  api.open();const rows=api.state().rows;
  for(let i=0;i<rows.length;i++){api.update(rows[i].key,"category",i?"Rent":"Fuel");api.update(rows[i].key,"amount",i?"20.02":"10.01");}
}
test("Bulk expense validates every row, date, pence, text limits and maximum rows",()=>{
  const {api}=setup();fill(api);const rows=api.state().rows;
  let checked=api.validate(rows);assert.equal(checked.total,30.03);assert.equal(checked.payload.length,2);
  for(const bad of ["0","-2","0.001","1e5","NaN"]){rows[1].amount=bad;assert.ok(api.validate(rows).errors[rows[1].key]);}
  rows[1].amount="20.02";rows[0].date="2026-02-30";assert.ok(api.validate(rows).errors[rows[0].key]);
  rows[0].date="2024-02-29";assert.equal(Object.keys(api.validate(rows).errors).length,0);
  rows[0].notes="x".repeat(2001);assert.ok(api.validate(rows).errors[rows[0].key]);
  assert.match(api.validate(Array(201).fill(rows[0])).problem,/200/);
});
test("One invalid row blocks the whole save and preserves the draft",async()=>{
  const {api,calls}=setup();fill(api);const rows=api.state().rows;api.update(rows[1].key,"amount","");
  await api.save();assert.equal(calls.length,0);assert.equal(api.state().rows[0].amount,"10.01");
  assert.ok(api.state().errors[rows[1].key]);
});
test("All rows use one atomic RPC, preserve existing/manual payroll expenses and reset only after success",async()=>{
  const {api,calls,store}=setup();fill(api);await api.save();
  assert.equal(calls.length,1);assert.equal(calls[0].name,"save_expense_batch");assert.equal(calls[0].args.p_expenses.length,2);
  assert.equal(store.expenses.length,4);assert.equal(store.expenses[1].source,"payslip");
  assert.equal(api.state().rows.length,0);assert.match(api.state().success,/Saved 2/);
});
test("A lost-response retry locks the original batch and reuses its ID without duplicates",async()=>{
  const {api,c,store,calls}=setup();fill(api);const real=c.sb.rpc;let first=true;
  c.sb.rpc=async(...args)=>{const response=await real(...args);if(first){first=false;throw Error("Connection lost");}return response;};
  await api.save();assert.equal(api.state().uncertain,true);const keys=api.state().rows.map(r=>r.key);
  api.update(keys[0],"amount","999");api.removeRow(keys[0]);api.addRow();
  assert.equal(api.state().rows[0].amount,"10.01");assert.equal(api.state().rows.length,2);
  await api.save();assert.equal(calls[0].args.p_batch_id,calls[1].args.p_batch_id);assert.equal(store.expenses.length,4);
  assert.equal(api.state().uncertain,false);assert.match(api.state().success,/Saved 2/);
});
test("Repeated Save All clicks cannot start overlapping batches",async()=>{
  const {api,c,calls}=setup();fill(api);let finish,entered;const real=c.sb.rpc;
  const started=new Promise(resolve=>entered=resolve);
  c.sb.rpc=(...args)=>new Promise(resolve=>{finish=async()=>resolve(await real(...args));entered();});
  const first=api.save();api.save();await started;assert.equal(api.state().saving,true);
  await finish();await first;assert.equal(calls.length,1);assert.equal(api.state().saving,false);
});
test("Definite setup/permission failures leave editable rows, while incomplete responses require retry",async()=>{
  const {api,c}=setup();fill(api);c.sb.rpc=async()=>({error:{code:"PGRST202"}});
  await api.save();assert.match(api.state().error,/bulk-expenses.sql/);assert.equal(api.state().uncertain,false);
  const key=api.state().rows[0].key;api.update(key,"amount","11");assert.equal(api.state().rows[0].amount,"11");
  c.sb.rpc=async()=>({data:{expenses:[]}});await api.save();assert.equal(api.state().uncertain,true);
});
test("Account change clears the private draft; Clients/Drivers/view-only Staff cannot submit",async()=>{
  const {api,c,calls}=setup();fill(api);c.currentSession={user:{id:"other"}};
  assert.equal(api.state().rows.length,0);
  for(const role of ["client","driver","staff"]){c.role=role;c.expenseCanManage=false;assert.equal(api.state().canManage,false);await api.save();}
  assert.equal(calls.length,0);
});
test("Bulk form includes every single-expense field, safe escaped values, locked retry controls and limits",()=>{
  const {api,ui}=setup();fill(api);const state=api.state();state.rows[0].payee='<img src=x onerror="unsafe()">';
  const html=ui.render(state);
  for(const field of ["date","category","amount","method","reference","payee","notes"])assert.match(html,new RegExp('data-bulk-field="'+field+'"'));
  assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);assert.match(html,/Save All/i);
  const locked=ui.render({...state,uncertain:true});assert.match(locked,/Retry save/i);assert.match(locked,/disabled/);
});
