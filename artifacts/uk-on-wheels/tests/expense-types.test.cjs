const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../public/expense-types.js"),"utf8");
function setup(){
 let saved=[];const calls=[];
 const elements={expenseTypeName:{value:""},expenseTypeStatus:{setAttribute(){}},expenseTypeSave:{},exCat:{value:"Fuel",innerHTML:""}};
 const bulkSelect={value:"Rent",innerHTML:""};
 const c=vm.createContext({role:"admin",page:"expenses",currentSession:{user:{id:"admin"}},
  window:{ExpenseBulk:{state:()=>({canManage:c.role==="admin"}),isLocalPreview:()=>false}},
  document:{getElementById:id=>elements[id],querySelectorAll:()=>[elements.exCat,bulkSelect]},
  sb:{rpc:async(name,args)=>{
   calls.push({name,args});
   if(name==="add_expense_type"&&!saved.some(n=>n.toLowerCase()===args.p_name.toLowerCase()))saved.push(args.p_name);
   return {data:saved.slice()};
  }}
 });
 vm.runInContext(source,c);
 return {c,api:c.window.ExpenseTypes,elements,bulkSelect,calls};
}
test("saved custom types populate both dropdowns without clearing expense selections",async()=>{
 const {api,elements,bulkSelect,calls}=setup();
 elements.expenseTypeName.value="  Parking   charges ";
 await api.save();
 assert.equal(calls[0].args.p_name,"Parking charges");
 assert.ok(api.list().includes("Parking charges"));
 assert.match(elements.exCat.innerHTML,/Parking charges/);
 assert.match(bulkSelect.innerHTML,/Parking charges/);
 assert.equal(elements.exCat.value,"Fuel");assert.equal(bulkSelect.value,"Rent");
 assert.equal(elements.expenseTypeName.value,"");
 await api.read();assert.ok(api.list().includes("Parking charges"));
});
test("failure preserves the typed name and gives setup guidance without claiming success",async()=>{
 const {c,api,elements}=setup();elements.expenseTypeName.value="Parking";
 c.sb.rpc=async()=>({error:{code:"PGRST202"}});
 await api.save();
 assert.equal(elements.expenseTypeName.value,"Parking");
 assert.match(elements.expenseTypeStatus.textContent,/expense-types.sql/);
 assert.ok(!api.list().includes("Parking"));
});
test("labels are escaped and invalid names cannot reach the server",async()=>{
 const {api,elements,calls}=setup();
 for(const name of [""," ".repeat(3),"a".repeat(81),"bad\u0001name"]){
  elements.expenseTypeName.value=name;await api.save();
 }
 assert.equal(calls.length,0);
 elements.expenseTypeName.value='<img onerror="x">';await api.save();
 assert.doesNotMatch(elements.exCat.innerHTML,/<img/);assert.match(elements.exCat.innerHTML,/&lt;img/);
});
test("account change clears custom data and ignores a stale save response",async()=>{
 const {c,api,elements}=setup();let done;
 c.sb.rpc=()=>new Promise(resolve=>done=resolve);
 elements.expenseTypeName.value="Old account type";const task=api.save();
 c.currentSession={user:{id:"other"}};api.reset();
 done({data:["Old account type"]});await task;
 assert.ok(!api.list().includes("Old account type"));
 c.role="driver";await api.save();assert.ok(!api.list().includes("Old account type"));
});
test("duplicate save is retry-safe and newly saved types pass batch validation",async()=>{
 const {c,api,elements}=setup();
 elements.expenseTypeName.value="Parking";await api.save();
 elements.expenseTypeName.value="parking";await api.save();
 assert.equal(api.list().filter(n=>n.toLowerCase()==="parking").length,1);
 c.crypto=require("node:crypto").webcrypto;
 c.document.querySelector=()=>null;c.document.getElementById=()=>null;
 c.expenseCanManage=true;
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/expense-bulk.js"),"utf8"),c);
 const checked=c.window.ExpenseBulk.validate([{key:"one",date:"2026-10-25",category:"Parking",amount:"5.50",method:"Cash",reference:"",payee:"",notes:""}]);
 assert.equal(checked.payload.length,1);assert.equal(checked.payload[0].category,"Parking");
 assert.ok(c.window.ExpenseBulk.state().categories.includes("Parking"));
});
