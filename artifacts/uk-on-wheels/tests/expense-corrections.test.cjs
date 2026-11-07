const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const script=fs.readFileSync(path.join(__dirname,"../public/expense-corrections.js"),"utf8");
const row={id:"EXP-one",date:"2026-11-01",category:"Fuel",amount:10,method:"Cash",source:"expense-batch",notes:"Original"};
function setup(extra={}){
 const c={console,currentSession:{user:{id:"admin-a"}},role:"admin",expenseCanManage:false,
  getStore:()=>({expenses:[{...row}]}),ExpenseBulk:{isLocalPreview:()=>false},...extra};
 c.window=c;vm.createContext(c);vm.runInContext(script,c);return c;
}
test("actions are role scoped, safe for special IDs, and linked payroll is not editable",()=>{
 const c=setup(),api=c.ExpenseCorrections;
 assert.match(api.actions(row),/>Edit</);assert.match(api.actions(row),/>Delete</);
 assert.match(api.actions({...row,id:`x"><script>`}),/&lt;script&gt;/);
 assert.doesNotMatch(api.actions({...row,source:"payslip"}),/onclick=/);
 assert.doesNotMatch(api.actions({...row,payslipId:"PAY"}),/onclick=/);
 c.role="driver";assert.equal(api.actions(row),"");
 c.role="staff";assert.equal(api.actions(row),"");c.expenseCanManage=true;assert.match(api.actions(row),/>Edit</);
});
test("mutation uses dedicated RPC with exact snapshot, action and edited values",async()=>{
 let args;
 const values={...row,amount:25},expenses=[values];
 const c=setup({sb:{rpc:async(...a)=>{args=a;return {data:{expense_id:row.id,action:"edit",expenses}};}}});
 const result=await c.ExpenseCorrections.commit(row,"edit",values);
 assert.equal(args[0],"correct_portal_expense");assert.equal(args[1].p_expected,row);
 assert.equal(args[1].p_values,values);assert.equal(result.expenses[0].amount,25);
});
test("missing migration and server failures stay explicit, not successful",async()=>{
 for(const error of [{code:"PGRST202"},{code:"40001",message:"Expense has changed"}]){
  const c=setup({sb:{rpc:async()=>({error})}});
  await assert.rejects(c.ExpenseCorrections.commit(row,"delete"),/setup|changed/);
 }
 const c=setup({sb:{rpc:async()=>({data:{expenses:[]}})}});
 await assert.rejects(c.ExpenseCorrections.commit(row,"delete"),/did not confirm/);
});
test("no correction on changed sign-in or pending failed portal save",async()=>{
 const c=setup({flushSharedStore:async()=>false,sb:{rpc:()=>assert.fail("must not send")}});
 await assert.rejects(c.ExpenseCorrections.commit(row,"delete"),/pending/);
 const d=setup({sb:{rpc:async()=>{d.currentSession={user:{id:"different"}};return {data:{expense_id:row.id,action:"delete",expenses:[]}};}}});
 await assert.rejects(d.ExpenseCorrections.commit(row,"delete"),/sign-in changed/);
});
test("local preview edit/delete preserves other rows and rejects stale snapshots",async()=>{
 const store={expenses:[{...row},{...row,id:"EXP-other"}]},c=setup({getStore:()=>store,ExpenseBulk:{isLocalPreview:()=>true}});
 const result=await c.ExpenseCorrections.commit(row,"edit",{amount:27});
 assert.equal(result.expenses[0].amount,27);assert.equal(result.expenses[1].amount,10);
 const deleted=await c.ExpenseCorrections.commit(row,"delete");
 assert.equal(deleted.expenses.length,1);assert.equal(deleted.expenses[0].id,"EXP-other");
 await assert.rejects(c.ExpenseCorrections.commit({...row,amount:2},"delete"),/changed/);
});
test("linked payslip corrections cannot use mutation API",async()=>{
 const c=setup();await assert.rejects(c.ExpenseCorrections.commit({...row,source:"payslip"},"delete"),/payslip/);
});
