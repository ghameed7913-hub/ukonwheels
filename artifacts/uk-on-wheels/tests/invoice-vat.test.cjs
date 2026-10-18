const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
function part(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a);
  return html.slice(a, b);
}
const generationCode = part("function toggleInvoiceVat(", "function viewInvoice(");
const viewCode = part("function viewInvoice(", "function drawPayments(");
function setup(enabled = true, rate = "20") {
  const store = {
    bookings: [{ ref: "TEST-1", vehicle: "Vehicle", reg: "TEST", amount: 100, business:"Test Client",status:"Delivered",_deliveredAt:"2026-10-17T12:00:00Z" }],
    businesses: [{ name: "Test Client" }], invoices: [], invoiceSettings: {},
  };
  const fields = {
    invVatEnabled: { checked: enabled }, invVat: { value: rate, disabled: false },
    invBiz: { value: "Test Client" }, invDate: { value: "2026-10-17" },
    invDue: { value: "" }, invExtra: { value: "25" }, invOther: { value: "10" },
    invDeliveredFrom:{value:"2026-10-01"},invDeliveredTo:{value:"2026-10-31"},
    invOtherDesc: { value: "Additional charges" }, ii_0: { checked: true }, ic_0: { value: "100" },
    content: { innerHTML: "" },
  };
  const notices = [];
  let saved;
  const c = vm.createContext({
    ensureAccountsData: () => store, render() {}, drawInvoices() {},
    document: { getElementById: id => fields[id] },
    saveStore: async value => { saved = JSON.parse(JSON.stringify(value)); return true; },
    alert: text => notices.push(text), money: value => "£" + Number(value).toFixed(2),
  });
  c.window={};vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/invoice-vehicles.js"),"utf8"),c);
  c.InvoiceVehicles=c.window.InvoiceVehicles;
  c.loadInvoiceVehicles=()=>{};
  c.loadInvoiceVehicles.selection={key:c.InvoiceVehicles.readRange(c.document).key,refs:["TEST-1"]};
  vm.runInContext(generationCode + "\n" + viewCode, c);
  return { c, store, fields, notices, saved: () => saved };
}

test("VAT can be switched off and back on without losing the rate", () => {
  const { c, fields } = setup(false);
  c.toggleInvoiceVat();
  assert.equal(fields.invVat.disabled, true);
  assert.equal(fields.invVat.value, "20");
  fields.invVatEnabled.checked = true;
  c.toggleInvoiceVat();
  assert.equal(fields.invVat.disabled, false);
});

test("Invoices without VAT save zero tax and exclude it from the total", async () => {
  const { c, saved } = setup(false);
  await c.makeInvoice(["TEST-1"]);
  const invoice = saved().invoices[0];
  assert.equal(invoice.vatEnabled, false);
  assert.equal(invoice.vatPct, 0);
  assert.equal(invoice.vatAmount, 0);
  assert.equal(invoice.total, 135);
});

test("Invoices with VAT preserve the current 20 percent behaviour", async () => {
  const { c, saved } = setup();
  await c.makeInvoice(["TEST-1"]);
  const invoice = saved().invoices[0];
  assert.equal(invoice.vatEnabled, true);
  assert.equal(invoice.vatPct, 20);
  assert.equal(invoice.vatAmount, 20);
  assert.equal(invoice.total, 155);
});

test("Invalid VAT rates are rejected only when VAT is applied", async () => {
  const enabled = setup(true, "-5");
  await enabled.c.makeInvoice(["TEST-1"]);
  assert.equal(enabled.store.invoices.length, 0);
  assert.match(enabled.notices[0], /VAT rate/);
  const disabled = setup(false, "invalid");
  await disabled.c.makeInvoice(["TEST-1"]);
  assert.equal(disabled.saved().invoices[0].total, 135);
});

test("VAT and totals are rounded to pennies", () => {
  const { c } = setup();
  const result = c.calculateInvoiceTotals(19.99, true, 20);
  assert.equal(result.vatAmount, 4);
  assert.equal(result.total, 23.99);
});

test("Reopened invoice and print/PDF view respect the saved VAT choice", async () => {
  const { c, store, fields, saved } = setup(false);
  await c.makeInvoice(["TEST-1"]);
  store.invoices = saved().invoices;
  c.viewInvoice(store.invoices[0].invoiceNo);
  assert.doesNotMatch(fields.content.innerHTML, /VAT \(/);
  assert.match(fields.content.innerHTML, /£135\.00/);
  store.invoices[0].vatEnabled = true;
  store.invoices[0].vatPct = 20;
  store.invoices[0].vatAmount = 20;
  c.viewInvoice(store.invoices[0].invoiceNo);
  assert.match(fields.content.innerHTML, /VAT \(20\.00%\)/);
});

test("Existing invoices without a VAT toggle field retain their saved VAT", () => {
  const { c, store, fields } = setup();
  store.invoices.push({ invoiceNo: "LEGACY", business: "Test Client", subtotal: 100, vatPct: 20, vatAmount: 20, total: 120 });
  c.viewInvoice("LEGACY");
  assert.match(fields.content.innerHTML, /VAT \(20\.00%\)/);
  assert.match(fields.content.innerHTML, /£120\.00/);
});
