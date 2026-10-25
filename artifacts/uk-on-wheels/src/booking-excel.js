import ExcelJS from "exceljs";

export const MAX_VEHICLES = 100;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const columns = [
  ["customerType","Customer type",22,"Business or Private. Clients always book for their own account."],
  ["biz","Business",28,"For Business customers: use an active saved business name or ID from the Businesses sheet. Clients may leave blank."],
  ["privateCustomerName","Private customer name",25,"Required for Private customers. Clients may leave blank to use their own account."],
  ["privateCustomerMobile","Private customer mobile number",27,"Optional. Keep as text, including the leading zero or +."],
  ["privateCustomerEmail","Private Client portal email",30,"For Admin Private bookings: must match an active Client portal account."],
  ["vehicle","Vehicle make and model",28,"Required. For example Ford Transit."],
  ["reg","Registration number",23,"Required. One vehicle registration per row; no duplicates in the file."],
  ["pickup","Collection address",40,"Required. Include street, town and postcode."],
  ["dest","Delivery address",40,"Required. Include street, town and postcode."],
  ["service","Service type",31,"Vehicle Delivery, Vehicle Collection & Delivery, or Recovery / AA. Blank means Vehicle Delivery."],
  ["miles","Estimated miles",20,"Optional non-negative number; blank means zero."],
  ["bdate","Booking date",20,"Optional YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY. Blank means today."],
  ["ddate","Requested delivery date",24,"Optional YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY."],
  ["receiver","Person receiving vehicle",28,"Required. Full name."],
  ["mobile","Receiver mobile number",25,"Required. Keep as text, including the leading zero or +."],
  ["dropoff","Latest drop-off time",22,"Optional 24-hour HH:mm or HHmm, for example 17:30 or 1730."],
  ["amount","Customer charge (£)",24,"Admin/authorised Staff only: optional non-negative amount. Clients must leave this blank; Operations sets charges."],
  ["notes","Special instructions",48,"Optional collection, delivery or vehicle instructions."],
];
export function templateColumns(format) {
  if (format === "Business") return columns.filter(([key])=>!["customerType","privateCustomerName","privateCustomerMobile","privateCustomerEmail","service"].includes(key));
  if (format === "Private") return columns.filter(([key])=>!["customerType","biz","service"].includes(key));
  if (format === "legacy") return columns;
  throw new Error("Choose the Business or Private Customer booking template.");
}
export function templateFilename(format) {
  if (format!=="Business") throw new Error("Private Clients use the single-vehicle booking form, not Excel bulk booking.");
  return "UK-On-Wheels-Business-Bookings.xlsx";
}
const normal = value => String(value ?? "").trim().toLowerCase().replace(/\s+/g," ");
function scalar(value) {
  if (value == null) return "";
  if (typeof value === "object" && !(value instanceof Date)) {
    if ("formula" in value || "sharedFormula" in value) throw new Error("formulas are not allowed; paste values instead");
    if ("error" in value) throw new Error("contains an Excel cell error");
    if (value.richText) return value.richText.map(part=>part.text).join("");
    if (value.hyperlink) return String(value.text || "");
    throw new Error("unsupported cell value; enter plain text");
  }
  return value;
}
function calendarDate(year,month,day) {
  const d = new Date(Date.UTC(year,month-1,day));
  if (d.getUTCFullYear()!==year || d.getUTCMonth()!==month-1 || d.getUTCDate()!==day || year<1900 || year>2199) throw new Error("enter a real date as YYYY-MM-DD or DD/MM/YYYY");
  return d.toISOString().slice(0,10);
}
export function dateValue(value,date1904=false) {
  if (value === "" || value == null) return "";
  if (typeof value === "number") value = new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+Math.round(value)*86400000);
  if (value instanceof Date && Number.isFinite(value.getTime())) return calendarDate(value.getUTCFullYear(),value.getUTCMonth()+1,value.getUTCDate());
  const text=String(value).trim();
  let match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return calendarDate(+match[1],+match[2],+match[3]);
  match=text.match(/^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/);
  if (match) return calendarDate(+match[4],+match[3],+match[1]);
  throw new Error("enter a date as YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY");
}
export function timeValue(value) {
  if (value === "" || value == null) return "";
  if (value instanceof Date) value=value.getUTCHours()+":"+String(value.getUTCMinutes()).padStart(2,"0");
  if (typeof value === "number") {
    if (Number.isInteger(value) && value>=100 && value<=2359) return timeValue(String(value).padStart(4,"0"));
    if (!Number.isFinite(value) || value<0 || value>=1) throw new Error("enter a time as HH:mm");
    const minutes=Math.round(value*1440)%1440;
    value=Math.floor(minutes/60)+":"+String(minutes%60).padStart(2,"0");
  }
  const text=String(value).trim().replace(/^(\d{2})(\d{2})$/,"$1:$2");
  const match=text.match(/^(\d{1,2}):(\d{2})(?::00)?$/);
  if (!match || +match[1]>23 || +match[2]>59) throw new Error("enter a 24-hour time as HH:mm");
  return match[1].padStart(2,"0")+":"+match[2];
}
export function recordsFromSheet(sheet,date1904=false) {
  if (!sheet) throw new Error('The workbook needs a sheet named "Bookings". Download the template and use that sheet.');
  if (sheet.rowCount>10000 || sheet.columnCount>100) throw new Error("The sheet is too large. Use the template with up to 100 vehicle rows.");
  const headers=new Map();
  sheet.getRow(1).eachCell((cell,index)=>{
    const name=normal(scalar(cell.value));
    if (!name) return;
    if (headers.has(name)) throw new Error("Duplicate column: "+name+". Use each template column once.");
    headers.set(name,index);
  });
  for (const name of headers.keys()) if (!columns.some(([,label])=>normal(label)===name)) throw new Error('Unrecognised column "'+name+'". Use the template headings.');
  const has = key => headers.has(normal(columns.find(([field])=>field===key)[1]));
  // Old mixed workbooks remain readable. New formats derive type from their headings,
  // never from a filename or editable/hidden metadata cell.
  const format = has("customerType") || (has("biz") && ["privateCustomerName","privateCustomerMobile","privateCustomerEmail"].some(has))
    ? "legacy" : has("biz") ? "Business" : ["privateCustomerName","privateCustomerMobile","privateCustomerEmail"].some(has) ? "Private" : "legacy";
  const expected = templateColumns(format);
  for (const [key,label] of expected) if (key!=="service"&&!headers.has(normal(label))) throw new Error('Missing column "'+label+'". Download the complete '+(format==="legacy"?"booking":format==="Private"?"Private Customer":"Business")+' template; do not remove its headings.');
  // Previously downloaded workbooks may still include Service type.
  for (const name of headers.keys()) if (name!==normal("Service type")&&!expected.some(([,label])=>normal(label)===name)) throw new Error('Do not mix Business and Private Customer template columns.');
  const records=[];
  for (let number=2;number<=sheet.rowCount;number++) {
    const row=sheet.getRow(number),values={},errors={},warnings={};
    let populated=false;
    for (const [field,label] of columns) {
      if (!headers.has(normal(label))) { values[field]=field==="service"?"Vehicle Delivery":""; continue; }
      const cell=row.getCell(headers.get(normal(label)));
      try {
        let value=scalar(cell.value);
        if (String(value).trim()!=="") populated=true;
        if (["bdate","ddate"].includes(field)) value=dateValue(value,date1904);
        else if (field==="dropoff") value=timeValue(value);
        else if (field==="service") {
          const services={"delivery":"Vehicle Delivery","vehicle delivery":"Vehicle Delivery","vehicle collection & delivery":"Vehicle Collection & Delivery","recovery / aa":"Recovery / AA"};
          value=services[normal(value)] || String(value).trim();
        }
        else if (["mobile","privateCustomerMobile"].includes(field) && typeof value==="number") {
          const digits=String(value);
          if (!Number.isSafeInteger(value) || value<0) throw new Error("enter the full phone number as text, including its leading zero or +country code");
          if (/^7\d{9}$/.test(digits)) {
            value="0"+digits;
            warnings[field]=label+": Excel removed the leading zero. Restored "+value+" as a UK mobile number; check it before saving.";
          } else if (/^447\d{9}$/.test(digits)) value="+"+digits;
          else throw new Error("keep phone numbers as text to preserve leading zeros; enter the full number including its leading zero or +country code");
        }
        else value=String(value).trim();
        if (String(value).length>10000) throw new Error("cell is too long (maximum 10,000 characters)");
        values[field]=value;
      } catch (error) {
        populated=true; values[field]="";
        errors[field]=label+": "+error.message;
      }
    }
    if (populated) {
      if (format !== "legacy") values.customerType=format;
      records.push({values,errors,warnings,excelRow:number});
    }
    if (records.length>MAX_VEHICLES) throw new Error("A file can contain up to 100 vehicles. Split it into smaller files.");
  }
  if (!records.length) throw new Error("The Bookings sheet has no vehicle rows. Fill in the template before uploading.");
  return records;
}
export async function readFile(file) {
  if (!file || !/\.xlsx$/i.test(file.name || "")) throw new Error("Upload an Excel .xlsx file made from the template. Old .xls and CSV files are not supported.");
  if (!file.size || file.size>MAX_FILE_BYTES) throw new Error("Choose an Excel file no larger than 5 MB.");
  const workbook=new ExcelJS.Workbook();
  try { await workbook.xlsx.load(await file.arrayBuffer()); }
  catch (_) { throw new Error("This Excel file could not be opened. Save it as .xlsx and upload it again."); }
  return recordsFromSheet(workbook.getWorksheet("Bookings"),!!workbook.properties.date1904);
}
export async function buildTemplate(context={}) {
  const format=context.format || "Business";
  if (format!=="Business" || (context.client && context.accountType!=="business")) throw new Error("Private Clients use the single-vehicle booking form, not Excel bulk booking.");
  const selected=templateColumns(format);
  const workbook=new ExcelJS.Workbook();
  workbook.creator="UK On Wheels";workbook.title="Business booking template";
  const sheet=workbook.addWorksheet("Bookings",{views:[{state:"frozen",ySplit:1}]});
  sheet.columns=selected.map(([key,header,width])=>({key,header,width,style:{numFmt:"@"}}));
  const header=sheet.getRow(1);header.height=36;
  header.eachCell(cell=>{
    cell.font={bold:true,color:{argb:"FFFFFFFF"}};
    cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF071A31"}};
    cell.alignment={vertical:"middle",wrapText:true};
  });
  for (const field of ["vehicle","reg","pickup","dest","receiver","mobile"]) {
    const cell=header.getCell(selected.findIndex(([key])=>key===field)+1);
    cell.note="Required for every vehicle.";
    cell.font={bold:true,color:{argb:"FFFFD4D4"}};
  }
  for (let row=2;row<=101;row++) {
    sheet.getRow(row).height=24;
    for (let col=1;col<=selected.length;col++) {
      const cell=sheet.getCell(row,col);
      cell.numFmt="@";cell.alignment={vertical:"top",wrapText:true};
      if (row%2===0) cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF4F7FB"}};
    }
    for (const field of ["miles","amount"]) {
      const col=selected.findIndex(([key])=>key===field)+1;
      sheet.getCell(row,col).numFmt="0.00";
      sheet.getCell(row,col).dataValidation={type:"decimal",operator:"greaterThanOrEqual",formulae:[0],allowBlank:true,showErrorMessage:true,error:"Enter zero or a positive number."};
    }
  }
  const guide=workbook.addWorksheet("Instructions");
  guide.columns=[{header:"Field",key:"field",width:32},{header:"How to complete",key:"help",width:110}];
  guide.addRow({field:"How to book",help:"This is the Business booking format. Type directly into the Bookings sheet, one vehicle per row. There are no dropdowns or filter arrows. Keep all column headings. Upload the .xlsx file in Create Booking → Bulk vehicles (Excel), review every row, then save."});
  guide.addRow({field:"Limit",help:"Up to 100 vehicles and 5 MB per file. Blank rows are skipped. Do not use formulas; paste values."});
  guide.addRow({field:"Required for every vehicle",help:"Vehicle make and model, Registration number, Collection address, Delivery address, Person receiving vehicle, Receiver mobile number."});
  guide.addRow({field:"Client account",help:context.client?"Bookings are linked to your signed-in account only: "+(context.name||"Client")+". Leave customer/account columns and Customer charge blank. You cannot book for another customer or set charges.":"Copy an active saved business name or ID from the Businesses sheet. Private Clients use the single-vehicle booking form, not Excel bulk booking."});
  guide.addRow({field:"Review and save",help:"Uploading does not create bookings. Fix highlighted errors before saving. Each vehicle gets a separate reference and New Booked Vehicle status. If some fail, retry the remaining rows; saved references are kept."});
  for (const [,label,,help] of selected) guide.addRow({field:label,help});
  guide.eachRow((row,index)=>{row.alignment={vertical:"top",wrapText:true};row.height=index===1?25:42;});
  const businesses=workbook.addWorksheet("Businesses");
  businesses.columns=[{header:"Saved business name",key:"name",width:40},{header:"Business ID",key:"id",width:42}];
  for (const business of context.businesses || []) businesses.addRow({name:business.name,id:business.id || ""});
  const example=workbook.addWorksheet("Example — do not upload");
  example.columns=selected.map(([key,header,width])=>({key,header,width,style:{numFmt:"@"}}));
  example.addRow({vehicle:"Ford Transit",reg:"AB12 CDE",pickup:"10 Example Road, London, SW1A 1AA",dest:"20 Sample Street, Birmingham, B1 1AA",service:"Vehicle Delivery",miles:120,bdate:"2026-11-01",ddate:"2026-11-02",receiver:"Example Receiver",mobile:"07123456789",dropoff:"17:30",notes:"Example only. Enter your real vehicles on the Bookings sheet."});
  return workbook.xlsx.writeBuffer();
}
export async function downloadTemplate(context) {
  const format=context?.format || "Business";
  const buffer=await buildTemplate({...context,format});
  const url=URL.createObjectURL(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  const link=document.createElement("a");link.href=url;link.download=templateFilename(format);
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
