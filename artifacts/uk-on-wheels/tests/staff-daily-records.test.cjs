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
