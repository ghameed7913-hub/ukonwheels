import { jsPDF } from "jspdf";

const text = value => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const money = value => "£" + Number(value || 0).toFixed(2);

/** Real, searchable A4 PDF; no print dialog or rasterized page screenshots. */
export function buildInvoicePdf(invoice, settings = {}, billTo = {}, logoBytes) {
  if (!invoice?.invoiceNo) throw new Error("A saved invoice is required.");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  doc.setProperties({ title: "Invoice " + text(invoice.invoiceNo), author: text(settings.companyName || "UK On Wheels Ltd") });
  const left = 15, right = 195, bottom = 276, width = 180;
  let y = 20;
  function line(value, x, at, size = 9, bold = false, maxWidth = width) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text(value), maxWidth);
    doc.text(lines, x, at);
    return Math.max(1, lines.length) * size * 0.42;
  }
  function newPage() { doc.addPage(); y = 20; }
  function ensure(height) { if (y + height > bottom) newPage(); }
  function paragraph(value, size = 9, bold = false) {
    doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
    for (const row of doc.splitTextToSize(text(value), width)) {
      ensure(5); line(row, left, y, size, bold); y += size * 0.45 + 1;
    }
  }
  let companyX = left;
  if (settings.showLogo !== false && logoBytes) {
    try {
      const image = doc.getImageProperties(logoBytes);
      const scale = Math.min(34 / image.width, 24 / image.height);
      doc.addImage(logoBytes, image.fileType, left, 15, image.width * scale, image.height * scale);
      companyX = 56;
    } catch { throw new Error("The saved logo is not a readable PNG or JPG. Replace the logo and retry."); }
  }
  let companyY = 21;
  companyY += line(settings.companyName || "UK On Wheels Ltd", companyX, companyY, 13, true, 145 - companyX) + 3;
  for (const value of [settings.companyAddress, settings.companyPostcode,
    [settings.companyEmail, settings.companyPhone].filter(Boolean).join(" · "),
    settings.companyRegistration && "Company Reg: " + settings.companyRegistration,
    settings.vatNumber && "VAT No: " + settings.vatNumber]) {
    if (value) companyY += line(value, companyX, companyY, 8, false, 145 - companyX) + 1.5;
  }
  let metaY = 21;
  metaY += line("INVOICE", 150, metaY, 16, true, 45) + 4;
  for (const value of [invoice.invoiceNo, "Date: " + (invoice.date || "—"), "Due: " + (invoice.dueDate || "30 days from invoice date")]) {
    metaY += line(value, 150, metaY, 8, false, 45) + 2;
  }
  y = Math.max(companyY, metaY, 43) + 8;
  let billY = y, termsY = y;
  billY += line("BILL TO", left, billY, 10, true, 88) + 4;
  for (const value of [billTo.name || invoice.business, billTo.address, billTo.postcode, billTo.email, billTo.phone,
    billTo.vatNumber && "VAT No: " + billTo.vatNumber, billTo.companyReg && "Company Reg: " + billTo.companyReg]) {
    if (value) billY += line(value, left, billY, 9, false, 88) + 1.5;
  }
  termsY += line("PAYMENT DETAILS", 110, termsY, 10, true, 85) + 4;
  for (const value of ["Status: " + (invoice.status || "Unpaid"), "Please pay by: " + (invoice.dueDate || "30 days from invoice date"),
    invoice.status === "Paid" && "Paid: " + (invoice.paymentDate || "—"),
    invoice.status === "Paid" && "Method: " + (invoice.paymentMethod || "—"),
    invoice.status === "Paid" && invoice.paymentReference && "Reference: " + invoice.paymentReference]) {
    if (value) termsY += line(value, 110, termsY, 9, false, 85) + 1.5;
  }
  y = Math.max(billY, termsY) + 8;
  const widths = [45, 40, 27, 48, 20];
  const headers = ["Booking Ref", "Vehicle", "Registration", "Description", "Charge"];
  function tableHeader() {
    ensure(10); doc.setFillColor(235, 239, 245); doc.rect(left, y - 5, width, 9, "F");
    let x = left + 2;
    headers.forEach((h, index) => { line(h, x, y, 8, true, widths[index] - 4); x += widths[index]; });
    y += 9;
  }
  tableHeader();
  for (const item of invoice.items || []) {
    const cells = [item.ref, item.vehicle || "Vehicle delivery", item.reg || "—",
      "Vehicle collection and delivery service", money(item.charge)];
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const rows = cells.map((value, index) => doc.splitTextToSize(text(value), widths[index] - 4));
    const height = Math.max(...rows.map(row => row.length)) * 4 + 5;
    if (y + height > bottom) { newPage(); tableHeader(); }
    let x = left + 2;
    rows.forEach((row, index) => { doc.text(row, x, y); x += widths[index]; });
    y += height;
    doc.setDrawColor(220); doc.line(left, y - 3, right, y - 3);
  }
  y += 5;
  const totals = [["Subtotal", money(invoice.subtotal)]];
  if (invoice.vatEnabled !== false) totals.push(["VAT (" + Number(invoice.vatPct || 0).toFixed(2) + "%)", money(invoice.vatAmount)]);
  totals.push(["Additional charges", money(invoice.extraPhrasal)], [invoice.otherDescription || "Other charges", money(invoice.otherCharges)],
    ["TOTAL DUE", money(invoice.total)]);
  for (const [label, amount] of totals) {
    ensure(10);
    const bold = label === "TOTAL DUE";
    const height = line(label, 110, y, bold ? 11 : 9, bold, 55);
    doc.setFontSize(bold ? 11 : 9); doc.text(amount, right, y, { align: "right" });
    y += Math.max(7, height + 3);
  }
  y += 8; ensure(18); paragraph("BANK DETAILS", 10, true);
  for (const [label, value] of [["Bank", settings.bankName], ["Account name", settings.bankAccountName],
    ["Sort code", settings.bankSortCode], ["Account number", settings.bankAccountNumber], ["IBAN", settings.iban]]) {
    if (value) paragraph(label + ": " + value);
  }
  if (settings.latePaymentText) { y += 5; paragraph("PAYMENT TERMS", 10, true); paragraph(settings.latePaymentText, 8); }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setTextColor(100); doc.setFontSize(8);
    doc.text(text(invoice.invoiceNo) + " · Page " + page + " of " + pages, left, 289);
  }
  return doc;
}
