const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"../public/staff-daily-record.js"),"utf8");
test("Daily record: monthly salary once, overtime and expenses, tax only wages, all previous payments deducted",()=>{
 const window={};vm.runInNewContext(code,{window});
 const person={id:"s",pay_basis:"monthly",rate:2000};
 const entries=[["overtime",100],["expense",75],["advance",300],["payment",200]].map(([kind,amount])=>({staff_id:"s",entry_date:"2026-10-15",kind,amount}));
 entries.push({staff_id:"other",entry_date:"2026-10-15",kind:"payment",amount:999});
 entries.push({staff_id:"s",entry_date:"2026-09-15",kind:"payment",amount:999});
 const totals=window.StaffDailyRecord.summary(person,entries,"2026-10",20);
 assert.equal(totals.wages,2000);assert.equal(totals.tax,420);assert.equal(totals.balance,1255);
 assert.equal(totals.noTaxBalance,1675);assert.equal(totals.count,4);
 const daily=window.StaffDailyRecord.summary({id:"s",pay_basis:"daily",rate:120},[
  ...entries,{staff_id:"s",entry_date:"2026-10-10",kind:"work",amount:240}
 ],"2026-10",0);
 assert.equal(daily.wages,240);assert.equal(daily.balance,-85);
});
test("General reimbursements are outside payslip tax base and included in printable breakdown",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const fn=html.slice(html.indexOf("function calculatePayslip("),html.indexOf("function readPayslipAmounts("));
 const context={};vm.createContext(context);vm.runInContext(fn,context);
 const p=context.calculatePayslip({basic:2000,overtime:100,otherExpenses:75,advance:500,taxEnabled:true,taxPct:20});
 assert.equal(p.net,1255);assert.equal(p.taxAmount,420);assert.equal(p.otherExpenses,75);
 assert.match(html,/StaffDailyRecord\.createPayslip\(record,status\)/);
 assert.match(html,/Other reimbursable expenses — no tax/);
});
function sheet(){const window={};vm.runInNewContext(code,{window});return window.StaffDailyRecord}
const row=(props={})=>({key:"draft",name:"Manual Staff",email:"manual@example.invalid",basis:"monthly",rate:"2000",date:"2026-10-15",work:"",overtime:"",expense:"",advance:"",payment:"",notes:"",...props});
test("Spreadsheet previews manual names, repeated monthly salary once, daily pay and grand total",()=>{
 const s=sheet(),drafts=[row({overtime:"100",expense:"75",advance:"300"}),row({payment:"200"}),row({name:"Daily Staff",email:"daily@example.invalid",basis:"daily",rate:"120",work:"240",payment:"50"})];
 const norm=s.crossCheck(drafts.map(r=>s.normalizeRow(r,[],[],{})));
 assert.ok(norm.every(n=>Object.keys(n.errors).length===0));
 const totals=s.sheetTotals([],[],[],norm,"2026-10",20);
 assert.equal(totals.groups.length,2);
 assert.equal(totals.groups.find(g=>g.name==="Manual Staff").balance,1255);
 assert.equal(totals.groups.find(g=>g.name==="Daily Staff").balance,142);
 assert.equal(totals.grand,1397);
 const otherMonth=[s.normalizeRow(row({date:"2026-11-01",rate:"9999"}),[],[],{})];
 assert.equal(s.sheetTotals([],[],[],otherMonth,"2026-10",0).grand,0);
});
test("Spreadsheet includes saved/draft totals and respects Paid/Unpaid finalized amounts",()=>{
 const s=sheet(),people=[{id:"m",name:"Monthly",email:"m@example.invalid",pay_basis:"monthly",rate:2000},{id:"d",name:"Daily",email:"d@example.invalid",pay_basis:"daily",rate:100}];
 const entries=[{staff_id:"m",entry_date:"2026-10-01",kind:"payment",amount:500},{staff_id:"d",entry_date:"2026-10-01",kind:"work",amount:100}];
 const norm=[s.normalizeRow(row({personId:"m",payment:"100"}),people,[],{})];
 const t=s.sheetTotals(people,entries,[],norm,"2026-10",0);
 assert.equal(t.grandSaved,1600);assert.equal(t.unsaved,-100);assert.equal(t.grand,1500);
 const final=s.sheetTotals(people,entries,[{staff_id:"m",month:"2026-10",paymentStatus:"Paid",net:1500},{staff_id:"d",month:"2026-10",paymentStatus:"Unpaid",net:80}],[],"2026-10",0);
 assert.equal(final.grand,80);
});
test("Spreadsheet validates exact dates, nonfinite/negative/overprecision amounts and conflicting people",()=>{
 const s=sheet();
 const bad=s.normalizeRow(row({date:"2026-02-30",rate:"Infinity",payment:"-1",overtime:"1.999",notes:"a".repeat(2001)}),[],[],{});
 for(const k of ["date","rate","payment","overtime","notes"])assert.ok(bad.errors[k],k);
 const conflict=s.crossCheck([s.normalizeRow(row(),[],[],{}),s.normalizeRow(row({rate:"500"}),[],[],{})]);
 assert.ok(conflict[1].errors.email);
 const p={id:"m",name:"Manual Staff",email:"manual@example.invalid",pay_basis:"monthly",rate:2000};
 assert.ok(s.normalizeRow(row({personId:"m",work:"20"}),[p],[],{}).errors.work);
 assert.ok(s.normalizeRow(row({personId:"m"}),[p],[{staff_id:"m",month:"2026-10"}],{}).errors.date);
});
test("Spreadsheet retry IDs are stable and multiple rows use one new person",()=>{
 const s=sheet(),drafts=[row(),row({payment:"100"})],newIds={};
 let n=0;const id=()=>"id-"+(++n),normalize=()=>s.crossCheck(drafts.map(r=>s.normalizeRow(r,[],[],newIds)));
 const first=s.buildPayload(drafts,normalize(),newIds,id);
 const retry=s.buildPayload(drafts,normalize(),newIds,id);
 assert.equal(first[0].person_id,first[1].person_id);
 assert.deepEqual(JSON.parse(JSON.stringify(first)),JSON.parse(JSON.stringify(retry)));
 drafts[1].payment="200";
 const changed=s.buildPayload(drafts,normalize(),newIds,id);
 assert.notEqual(changed[1].entry_ids.payment,first[1].entry_ids.payment);
 assert.equal(changed[0].entry_ids.payment,first[0].entry_ids.payment);
 assert.match(code,/p_batch_id:batch/);
});
test("Bonus and fuel remain separate, survive payroll calculation and don't change the selected wages/overtime tax base",()=>{
 const s=sheet(),person={id:"s",pay_basis:"monthly",rate:2000};
 const entries=[["overtime",100],["expense",75],["bonus",50],["fuel",40],["advance",300],["payment",200]].map(([kind,amount])=>({staff_id:"s",entry_date:"2026-11-15",kind,amount}));
 const t=s.summary(person,entries,"2026-11",20);
 assert.equal(t.bonus,50);assert.equal(t.fuel,40);assert.equal(t.tax,420);assert.equal(t.balance,1345);
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf("function calculatePayslip("),html.indexOf("function readPayslipAmounts(")),ctx);
 const slip=ctx.calculatePayslip({basic:2000,overtime:100,bonus:50,fuel:40,otherExpenses:75,advance:500,taxEnabled:true,taxPct:20});
 assert.equal(slip.net,1345);assert.equal(slip.bonus,50);assert.equal(slip.fuel,40);
});
test("All internal roster names appear once, untouched auto rows are not changes, and manual rows need no email",()=>{
 const s=sheet(),people=[{id:"a",name:"Existing Employee",email:"a@example.invalid",pay_basis:"daily",rate:0}];
 const roster=[{id:"user-a",name:"Existing User",email:"a@example.invalid",role:"staff"},{id:"hr-a",name:"Duplicate HR",email:"A@example.invalid",role:"staff"},
 {id:"b",name:"HR Only",email:"b@example.invalid",role:"staff"},{id:"c",name:"Private Client",email:"c@example.invalid",role:"client"}];
 let i=0;const rows=s.mergeRoster([],roster,people,()=>"r"+(++i));
 assert.equal(rows.length,2);assert.equal(rows[0].personId,"a");assert.equal(rows[1].name,"HR Only");
 assert.ok(rows.every(r=>!s.meaningful(r)));rows[1].bonus="25";assert.ok(s.meaningful(rows[1]));
 const drafts=[row({key:"first",email:"",name:"Same Name",basis:"daily",rate:"0",work:"100"}),row({key:"second",email:"",name:"Same Name",basis:"daily",rate:"0",work:"200"})];
 const norm=s.crossCheck(drafts.map(r=>s.normalizeRow(r,[],[],{})));
 assert.ok(norm.every(n=>Object.keys(n.errors).length===0));
 const payload=s.buildPayload(drafts,norm,{},()=>"uuid-"+(++i));
 assert.notEqual(payload[0].person_id,payload[1].person_id);assert.equal(payload[0].email,null);
 assert.equal(s.sheetTotals([],[],[],norm,"2026-10",0).grand,300);
 const uuid="00000000-0000-0000-0000-000000000099";
 const auto=s.normalizeRow(row({rosterId:uuid,email:"",basis:"daily",rate:"0"}),[],[],{});
 assert.equal(auto.row.person_id,uuid,"No-email automatic roster identity remains stable across saves");
});
test("Role column identifies Admin, HR, Driver and staff, refreshes cached roles, and leaves money unchanged",()=>{
 const s=sheet();
 assert.equal(s.employeeRole({role:"admin",roleLabel:"HR"}),"Admin");
 assert.equal(s.employeeRole({role:"driver"}),"Driver");
 assert.equal(s.employeeRole({role:"staff",roleLabel:"HR"}),"HR");
 assert.equal(s.employeeRole({role:"staff"}),"Other Staff");
 assert.equal(s.employeeRole({role:"staff",staffRole:"Operations"}),"Operations");
 assert.equal(s.employeeRole({role:"staff",roleLabel:"Unassigned"}),"Unassigned");
 assert.equal(s.employeeRole({source:"HR"}),"Not assigned","HR registration alone is not an HR role");
 const draft=row({auto:true,personId:"a",role:"staff",roleLabel:"Other Staff",work:"100",bonus:"50"});
 const person={id:"a",name:draft.name,email:draft.email,pay_basis:"monthly",rate:2000};
 const roster=[{id:"user-a",name:person.name,email:person.email,role:"staff",roleLabel:"HR"}];
 const merged=s.mergeRoster([draft],roster,[person],()=>"unused");
 assert.equal(merged.length,1);assert.equal(merged[0].roleLabel,"HR");
 assert.equal(merged[0].work,"100");assert.equal(merged[0].bonus,"50");
 assert.match(code,/<th>Name<\/th><th>Role<\/th>/);
 assert.match(code,/esc\(employeeRole\(r\)\)/,"Role labels are escaped before rendering");
});
