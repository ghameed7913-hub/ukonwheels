const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const library=import("../src/booking-excel.js");
const ExcelJS=require("exceljs");
const sample={customerType:"Business",biz:"Synthetic Motors",vehicle:"Ford Focus",reg:"AB10 CDE",pickup:"1 Collection Street",dest:"2 Delivery Road",service:"Vehicle Delivery",miles:40,bdate:"2026-11-01",ddate:"2026-11-02",receiver:"Test Receiver",mobile:"07123456789",dropoff:"17:30",amount:100,notes:"Handle carefully"};
async function workbook(records=[sample]){
  const {columns}=await library;
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet("Bookings");
  sheet.columns=columns.map(([key,header])=>({key,header}));
  records.forEach(row=>sheet.addRow(row));
  return {book,sheet};
}
function file(buffer,name="vehicles.xlsx"){return {name,size:buffer.byteLength,arrayBuffer:async()=>buffer};}
test("Download produces a genuine Business Excel template with relevant headings, guides and text phone columns",async()=>{
  const {buildTemplate,templateColumns,recordsFromSheet}=await library;
  const selected=templateColumns("Business");
  const buffer=await buildTemplate({client:true,accountType:"business",name:"Own Client"});
  assert.equal(buffer[0],0x50);assert.equal(buffer[1],0x4b);
  const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);
  const sheet=book.getWorksheet("Bookings");
  assert.deepEqual(sheet.getRow(1).values.slice(1),selected.map(c=>c[1]));
  assert.equal(sheet.getCell(2,selected.findIndex(([key])=>key==="mobile")+1).numFmt,"@");
  assert.ok(sheet.getCell(1,selected.findIndex(([key])=>key==="vehicle")+1).note);
  assert.equal(book.worksheets.length,4);
  assert.match(book.getWorksheet("Instructions").getCell("B5").value,/signed-in account only: Own Client/);
  assert.throws(()=>recordsFromSheet(sheet),/no vehicle rows/);
});
test("A real .xlsx upload reads every field, Excel dates/time fractions, phones and blank optional fields",async()=>{
  const {readFile}=await library;
  const {book}=await workbook([sample,{...sample,reg:"AB11 CDE",bdate:new Date("2026-11-03T00:00:00Z"),ddate:"04/11/2026",dropoff:0.75,amount:0,notes:""}]);
  const records=await readFile(file(await book.xlsx.writeBuffer()));
  assert.equal(records.length,2);assert.equal(records[1].excelRow,3);
  assert.equal(records[0].values.mobile,"07123456789");
  assert.equal(records[1].values.bdate,"2026-11-03");
  assert.equal(records[1].values.ddate,"2026-11-04");
  assert.equal(records[1].values.dropoff,"18:00");
  assert.equal(records[1].values.amount,"0");
  assert.equal(records[1].values.notes,"");
  assert.deepEqual(records[1].errors,{});
});
test("Excel template has no dropdown selections or filter arrows and typed booking rows still upload",async()=>{
  const {buildTemplate,readFile,templateColumns}=await library;
  for (const context of [
    {format:"Business",businesses:[{name:"Synthetic Motors",id:"business-1"}]},
    {format:"Business",client:true,accountType:"business",name:"Own Client"}
  ]) {
    const book=new ExcelJS.Workbook();await book.xlsx.load(await buildTemplate(context));
    for (const sheet of book.worksheets) {
      assert.ok(!sheet.autoFilter,"No filter dropdown arrows on "+sheet.name);
      sheet.eachRow(row=>row.eachCell(cell=>assert.notEqual(cell.dataValidation?.type,"list","No list dropdown at "+cell.address)));
    }
    const sheet=book.getWorksheet("Bookings");
    assert.match(book.getWorksheet("Instructions").getCell("B2").value,/no dropdowns or filter arrows/);
    templateColumns(context.format).forEach(([key],i)=>{sheet.getCell(2,i+1).value=sample[key]??"";});
    const rows=await readFile(file(await book.xlsx.writeBuffer()));
    assert.equal(rows.length,1);
    assert.equal(rows[0].values.customerType,context.format);
    assert.equal(rows[0].values.service,"Vehicle Delivery");
    assert.equal(rows[0].values.mobile,"07123456789");
    assert.deepEqual(rows[0].errors,{});
  }
});
test("Business template omits private-customer columns and retains every vehicle/journey field",async()=>{
  const {buildTemplate,templateColumns,columns,templateFilename,recordsFromSheet}=await library;
  for (const format of ["Business"]) {
    const book=new ExcelJS.Workbook();await book.xlsx.load(await buildTemplate({format,businesses:[{name:"Saved Business",id:"business-1"}]}));
    const sheet=book.getWorksheet("Bookings"),head=sheet.getRow(1).values.slice(1);
    assert.ok(!head.includes("Customer type"));
    const unrelated=format==="Business"?["privateCustomerName","privateCustomerMobile","privateCustomerEmail"]:["biz"];
    for (const [key,label] of columns) assert.equal(head.includes(label),key!=="customerType"&&!unrelated.includes(key),key);
    assert.equal(!!book.getWorksheet("Businesses"),format==="Business");
    assert.throws(()=>recordsFromSheet(sheet),/no vehicle rows/);
    const values={...sample,privateCustomerName:"Private Example",privateCustomerMobile:"07000000001",privateCustomerEmail:"private@example.invalid"};
    templateColumns(format).forEach(([key],i)=>{sheet.getCell(2,i+1).value=values[key]??"";});
    const [row]=recordsFromSheet(sheet);
    for (const key of unrelated) assert.equal(row.values[key],"");
    assert.equal(row.values.customerType,format);
    assert.equal(row.values.reg,sample.reg);
    assert.equal(row.values.notes,sample.notes);
    if(format==="Private")assert.equal(row.values.privateCustomerMobile,"07000000001");
    assert.match(templateFilename(format),format==="Private"?/Private-Customer-Bookings\.xlsx$/:/Business-Bookings\.xlsx$/);
    // Numeric safeguards follow field positions in both narrower templates.
    for(const key of ["miles","amount"])assert.equal(sheet.getCell(3,templateColumns(format).findIndex(([k])=>k===key)+1).dataValidation.type,"decimal");
  }
});
test("Incomplete or mixed separated headings fail rather than guessing the customer",async()=>{
  const {buildTemplate,recordsFromSheet}=await library;
  for (const format of ["Business"]) {
    const book=new ExcelJS.Workbook();await book.xlsx.load(await buildTemplate({format}));
    const sheet=book.getWorksheet("Bookings");
    const last=sheet.columnCount;
    sheet.getCell(1,last).value="";
    assert.throws(()=>recordsFromSheet(sheet),/Missing column "Special instructions"/);
    sheet.getCell(1,last).value="Special instructions";
    sheet.getCell(1,last+1).value=format==="Business"?"Private customer name":"Business";
    assert.throws(()=>recordsFromSheet(sheet),/Missing column|Do not mix/);
  }
});
test("Private Clients cannot generate an Excel template or download filename",async()=>{
  const {buildTemplate,templateFilename}=await library;
  await assert.rejects(buildTemplate({format:"Private"}),/single-vehicle/);
  await assert.rejects(buildTemplate({client:true,accountType:"private"}),/single-vehicle/);
  assert.throws(()=>templateFilename("Private"),/single-vehicle/);
});
test("Blank rows are skipped and more than 100 vehicles are rejected without dropping any extra rows",async()=>{
  const {recordsFromSheet}=await library;
  const {sheet}=await workbook([sample,{},sample]);
  const records=recordsFromSheet(sheet);
  assert.deepEqual(records.map(r=>r.excelRow),[2,4]);
  while(sheet.rowCount<103)sheet.addRow(sample);
  assert.throws(()=>recordsFromSheet(sheet),/up to 100/);
});
test("Formula cells, ambiguous numeric phone numbers and invalid dates/times remain row-specific visible errors",async()=>{
  const {recordsFromSheet}=await library;
  const {sheet}=await workbook([{...sample,notes:{formula:'HYPERLINK("https://example.test","bad")',result:"bad"},mobile:1234567890,ddate:"31/02/2026",dropoff:"25:99"}]);
  const [record]=recordsFromSheet(sheet);
  assert.match(record.errors.notes,/formulas are not allowed/);
  assert.match(record.errors.mobile,/leading zeros/);
  assert.match(record.errors.ddate,/real date/);
  assert.match(record.errors.dropoff,/24-hour time/);
  assert.equal(record.excelRow,2);
});
test("Template headings can be reordered, but duplicate, unknown and missing columns fail explicitly",async()=>{
  const {recordsFromSheet}=await library;
  const {sheet}=await workbook();
  const first=sheet.getCell("A1").value;sheet.getCell("A1").value=sheet.getCell("B1").value;sheet.getCell("B1").value=first;
  sheet.getCell("A2").value=sample.biz;sheet.getCell("B2").value=sample.customerType;
  assert.equal(recordsFromSheet(sheet)[0].values.biz,sample.biz);
  sheet.getCell("B1").value=sheet.getCell("A1").value;
  assert.throws(()=>recordsFromSheet(sheet),/Duplicate column/);
  sheet.getCell("B1").value="";
  assert.throws(()=>recordsFromSheet(sheet),/Missing column/);
  sheet.getCell("B1").value=first;sheet.getCell("S1").value="Unexpected";
  assert.throws(()=>recordsFromSheet(sheet),/Unrecognised column/);
});
test("Invalid extensions, excessive file size and corrupt workbooks do not become empty successful imports",async()=>{
  const {readFile,MAX_FILE_BYTES}=await library;
  await assert.rejects(readFile({name:"vehicles.xls",size:1}),/\.xlsx/);
  await assert.rejects(readFile({name:"vehicles.xlsx",size:MAX_FILE_BYTES+1}),/5 MB/);
  await assert.rejects(readFile(file(Buffer.from("not an excel workbook"))),/could not be opened/);
});
test("UK dates and 1900/1904 Excel dates use unambiguous calendar dates and valid 24-hour times",async()=>{
  const {dateValue,timeValue}=await library;
  assert.equal(dateValue("01/12/2026"),"2026-12-01");
  assert.equal(dateValue(1,true),"1904-01-02");
  assert.equal(dateValue(2),"1900-01-01");
  assert.throws(()=>dateValue("2026-02-29"),/real date/);
  assert.equal(timeValue("9:05"),"09:05");
  assert.equal(timeValue(new Date("2026-11-01T17:15:00Z")),"17:15");
});
test("UK hyphenated dates and compact 24-hour times normalise without accepting impossible values",async()=>{
  const {dateValue,timeValue}=await library;
  assert.equal(dateValue("17-10-2026"),"2026-10-17");
  assert.equal(dateValue("18-10-2026"),"2026-10-18");
  assert.equal(dateValue("1-2-2026"),"2026-02-01");
  assert.throws(()=>dateValue("31-02-2026"),/real date/);
  assert.throws(()=>dateValue("17-10/2026"),/enter a date/);
  for (const value of ["1400",1400]) assert.equal(timeValue(value),"14:00");
  assert.equal(timeValue("0000"),"00:00");
  assert.equal(timeValue("0930"),"09:30");
  for (const value of ["2400","1460",1460,2400]) assert.throws(()=>timeValue(value),/time/);
});
test("Actual XLSX round trip handles hyphenated dates, compact times and numeric UK mobiles with visible repair warnings",async()=>{
  const {readFile}=await library;
  const {book}=await workbook([
    {...sample,bdate:"17-10-2026",ddate:"18-10-2026",dropoff:"1400",mobile:7123456789,service:"delivery"},
    {...sample,reg:"AB11CDE",mobile:447123456789,dropoff:1400},
    {...sample,reg:"AB12CDE",mobile:"07123456789"},
  ]);
  const rows=await readFile(file(await book.xlsx.writeBuffer()));
  assert.equal(rows[0].values.bdate,"2026-10-17");
  assert.equal(rows[0].values.ddate,"2026-10-18");
  assert.equal(rows[0].values.dropoff,"14:00");
  assert.equal(rows[0].values.mobile,"07123456789");
  assert.equal(rows[0].values.service,"Vehicle Delivery");
  assert.match(rows[0].warnings.mobile,/Restored 07123456789.*check it before saving/);
  assert.equal(rows[1].values.mobile,"+447123456789");
  assert.equal(rows[1].values.dropoff,"14:00");
  assert.equal(rows[2].values.mobile,"07123456789");
  for (const row of rows) assert.deepEqual(row.errors,{});
  assert.deepEqual(rows[2].warnings,{});
});
test("Client SQL derives ownership from auth, checks active membership and uses idempotent reference locking",()=>{
  const sql=fs.readFileSync(path.join(__dirname,"../../../supabase/client-bulk-booking-patch.sql"),"utf8");
  for(const guard of ["auth.uid() is null","lower(actor.role) <> 'client'","lower(actor.status) <> 'active'","public.is_business_member(business)","pg_advisory_xact_lock","existing.created_by is distinct from auth.uid()","client_id = auth.uid()","status = 'New Booked Vehicle'","Only Operations can set customer charges"])assert.ok(sql.includes(guard),guard);
  assert.doesNotMatch(sql,/p_booking->>'created_by'|p_booking->>'client_id'|p_booking->>'status'/);
  assert.match(sql,/revoke all .* from public, anon/);
  assert.match(sql,/grant execute .* to authenticated/);
});

if(process.argv.includes("--excel-fixtures"))(async()=>{
  const {buildTemplate}=await library;
  const out=path.resolve(__dirname,"../../../generated-artifacts/excel-booking");
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,"template.xlsx"),Buffer.from(await buildTemplate({businesses:[{id:"business-1",name:"Synthetic Motors"}]})));
  for(const [name,records] of Object.entries({
    "admin-valid":[sample,{...sample,vehicle:"BMW 320",reg:"AB11 CDE",pickup:"Independent Collection",dest:"Independent Delivery",miles:71,amount:230.5}],
    "admin-errors":[sample,{...sample,reg:"AB10CDE",pickup:"",mobile:7123456789}],
    "client-valid":[{...sample,customerType:"",biz:"",amount:""},{...sample,customerType:"",biz:"",vehicle:"BMW 320",reg:"AB11 CDE",amount:"",dest:"Independent Delivery"}],
    "client-foreign":[{...sample,biz:"Other Customer",amount:250}],
  })){
    const {book}=await workbook(records);
    fs.writeFileSync(path.join(out,name+".xlsx"),Buffer.from(await book.xlsx.writeBuffer()));
  }
  console.log("Excel browser fixtures: "+out);
})().catch(error=>{console.error(error);process.exitCode=1;});
