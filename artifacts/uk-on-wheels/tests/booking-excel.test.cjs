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
test("Download produces a genuine Excel template with all single-booking headings, guides and text phone columns",async()=>{
  const {buildTemplate,columns,recordsFromSheet}=await library;
  const buffer=await buildTemplate({client:true,name:"Own Client"});
  assert.equal(buffer[0],0x50);assert.equal(buffer[1],0x4b);
  const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);
  const sheet=book.getWorksheet("Bookings");
  assert.deepEqual(sheet.getRow(1).values.slice(1),columns.map(c=>c[1]));
  assert.equal(sheet.getCell("N2").numFmt,"@");
  assert.equal(sheet.getCell("O2").numFmt,"@");
  assert.ok(sheet.getCell("F1").note);
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
  const {buildTemplate,readFile,columns}=await library;
  for (const context of [{businesses:[{name:"Synthetic Motors",id:"business-1"}]},{client:true,name:"Own Client"}]) {
    const book=new ExcelJS.Workbook();await book.xlsx.load(await buildTemplate(context));
    for (const sheet of book.worksheets) {
      assert.ok(!sheet.autoFilter,"No filter dropdown arrows on "+sheet.name);
      sheet.eachRow(row=>row.eachCell(cell=>assert.notEqual(cell.dataValidation?.type,"list","No list dropdown at "+cell.address)));
    }
    const sheet=book.getWorksheet("Bookings");
    assert.match(book.getWorksheet("Instructions").getCell("B2").value,/no dropdowns or filter arrows/);
    columns.forEach(([key],i)=>{sheet.getCell(2,i+1).value=sample[key]??"";});
    const rows=await readFile(file(await book.xlsx.writeBuffer()));
    assert.equal(rows.length,1);
    assert.equal(rows[0].values.customerType,"Business");
    assert.equal(rows[0].values.service,"Vehicle Delivery");
    assert.equal(rows[0].values.mobile,"07123456789");
    assert.deepEqual(rows[0].errors,{});
  }
});
test("Blank rows are skipped and more than 100 vehicles are rejected without dropping any extra rows",async()=>{
  const {recordsFromSheet}=await library;
  const {sheet}=await workbook([sample,{},sample]);
  const records=recordsFromSheet(sheet);
  assert.deepEqual(records.map(r=>r.excelRow),[2,4]);
  while(sheet.rowCount<103)sheet.addRow(sample);
  assert.throws(()=>recordsFromSheet(sheet),/up to 100/);
});
test("Formula cells, numeric phone numbers and invalid dates/times remain row-specific visible errors",async()=>{
  const {recordsFromSheet}=await library;
  const {sheet}=await workbook([{...sample,notes:{formula:'HYPERLINK("https://example.test","bad")',result:"bad"},mobile:7123456789,ddate:"31/02/2026",dropoff:"25:99"}]);
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
