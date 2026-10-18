const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function section(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a);return html.slice(a,b);}
function portal(role,permissions=[]){
  const errors=[],c=vm.createContext({role,currentStaffUser:{permissions},page:"desktop",
    clientInvoiceAccessEnabled:()=>true,render(){},alert:message=>errors.push(message)});
  vm.runInContext(section("function nav(){","/* ---------- Collapsible sidebar rendering"),c);
  vm.runInContext(section("function hasPermission(key){","function render(){"),c);
  vm.runInContext(section("function go(p){","function visibleBookings(){"),c);
  return {c,errors,menu:JSON.parse(JSON.stringify(c.nav()))};
}
test("Staff Accounts links reach all allowed finance pages without adding Reports access",()=>{
  const {c,menu,errors}=portal("staff",["accounts"]);
  const accounts=menu.find(x=>x.key==="accounts");
  assert.equal(accounts.group,"accounts");
  assert.deepEqual(accounts.items.map(x=>x.key),["expenses","payments","pendingPayments","pnl"]);
  for(const item of accounts.items){c.go(item.key);assert.equal(c.page,item.key);}
  assert.deepEqual(errors,[]);
  c.go("invoices");assert.equal(errors.length,1);
  assert.equal(c.hasPermission("reports"),false);
});
test("Staff with Accounts and Reports can navigate to all six Accounts pages",()=>{
  const {c,menu,errors}=portal("staff",["accounts","reports"]);
  const items=menu.find(x=>x.key==="accounts").items;
  assert.equal(items.length,6);
  for(const item of items){c.go(item.key);assert.equal(c.page,item.key);}
  assert.deepEqual(errors,[]);
});
test("Staff without Accounts does not gain a finance menu or finance access",()=>{
  const {c,menu,errors}=portal("staff",["hr"]);
  assert.ok(!menu.some(x=>x.key==="accounts"));
  assert.ok(!menu.some(x=>x.group==="trading"));
  c.go("expenses");assert.equal(c.page,"desktop");assert.equal(errors.length,1);
});
test("Buying and Selling deny Client, Driver and HR-only navigation",()=>{
 for(const role of ["client","driver","staff"]){
   const {c,errors}=portal(role,["hr"]);
   c.go("buying");c.go("selling");assert.equal(c.page,"desktop");assert.equal(errors.length,2);
 }
});
test("Accounts guidance describes only the submenu areas available to that user",()=>{
  for(const permissions of [["accounts"],["accounts","reports"]]){
    const {c}=portal("staff",permissions);
    c.loadPayrollView=()=>false;c.ensureAccountsData=()=>({expenses:[],transactions:[],bookings:[],invoices:[]});
    c.money=n=>"£"+n;
    vm.runInContext(section("function drawAdminAccounts(c,loaded=false){","function expenseRegisterHtml(s){"),c);
    const element={innerHTML:""};c.drawAdminAccounts(element,true);
    const guidance=element.innerHTML.match(/Use the Accounts menu for[^<]+/)[0];
    assert.equal(guidance.includes("invoices"),permissions.includes("reports"));
    assert.equal(guidance.includes("reports"),permissions.includes("reports"));
  }
});
test("Every visible role menu target has a page handler and passes its own navigation guard",()=>{
  const all=["desktop","booking","businesses","assign","status","miles","amount","destination","accounts","reports","hr","notifications","settings","users","driver"];
  const handled=new Set([...html.matchAll(/page==="([^"]+)"/g)].map(m=>m[1]));
  for(const role of ["admin","staff","client","driver"]){
    const {c,menu,errors}=portal(role,all);
    for(const entry of menu.flatMap(x=>[x,...(x.items||[])])){
      if(entry.key==="logout")continue;
      assert.ok(handled.has(entry.key),`${role}: ${entry.key} has no renderer`);
      c.go(entry.key);assert.equal(c.page,entry.key,`${role}: ${entry.key} denied`);
    }
    assert.deepEqual(errors,[]);
  }
});
