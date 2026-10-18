const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const start = html.indexOf("let selectedPayslipId=");
const end = html.indexOf("function drawNonResidentRecords(", start);
assert.ok(start >= 0 && end > start);
const code = html.slice(start, end);
const inputs = {
  deliveredCount: 2, rate: 50, basic: 1000, overtime: 100,
  fuel: 60, food: 20, travel: 40, advance: 150, taxEnabled: true, taxPct: 20,
};
function setup() {
  const store = { staffUsers: [{ email: "test@example.com", name: "Employee", role: "Driver" }], payslips: [] };
  const fields = {
    psUser: { value: "test@example.com" }, psMonth: { value: "2026-10" },
    psTaxEnabled: { checked: true }, psTax: { value: "20", disabled: false },
    psRate: { value: "50" }, psBasic: { value: "1000" }, psOvertime: { value: "100" },
    psFuel: { value: "60" }, psFood: { value: "20" }, psTravel: { value: "40" },
    psAdvance: { value: "150" }, payslipEstimate: { innerHTML: "" },
    generatePayslipBtn: { disabled: false, isConnected: true },
    payslipDetail: { innerHTML: "", scrollIntoView() {} }, content: { innerHTML: "" },
  };
  let saved, redraws = 0;
  const notices = [];
  const c = vm.createContext({
    ensureHRData: () => store, deliveredCountForEmployee: () => 2,
    document: { getElementById: id => fields[id] },
    saveStore: async value => { saved = JSON.parse(JSON.stringify(value)); return true; },
    hasPermission: () => true, alert: text => notices.push(text),
    escapeHtml: value => String(value ?? "").replace(/[&<>"']/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x])),
    currency: value => "£" + Number(value || 0).toFixed(2),
  });
  vm.runInContext(code, c);
  const draw = c.drawHRPayslips;
  c.drawHRPayslips = () => redraws++;
  return { c, store, fields, notices, draw, saved: () => saved, redraws: () => redraws };
}

test("Tax applies to wages and overtime, but not fuel, food or travel payments", () => {
  const { c } = setup();
  const p = c.calculatePayslip(inputs);
  assert.equal(p.vehiclePay, 100);
  assert.equal(p.taxablePay, 1200);
  assert.equal(p.expensePayments, 120);
  assert.equal(p.gross, 1320);
  assert.equal(p.taxAmount, 240);
  assert.equal(p.advance, 150);
  assert.equal(p.net, 930);
});

test("Optional tax off saves zero tax while still deducting the advance", () => {
  const { c } = setup();
  const p = c.calculatePayslip({ ...inputs, taxEnabled: false, taxPct: "invalid ignored rate" });
  assert.equal(p.taxPct, 0);
  assert.equal(p.taxAmount, 0);
  assert.equal(p.net, 1170);
});

test("Advances are deducted after tax, not from taxable wages", () => {
  const { c } = setup();
  const p = c.calculatePayslip({ basic: 1000, advance: 100 });
  assert.equal(p.taxablePay, 1000);
  assert.equal(p.taxAmount, 200);
  assert.equal(p.net, 700);
});

test("Every payment component contributes to pay and only overtime increases tax", () => {
  const { c } = setup();
  for (const field of ["fuel", "food", "travel"]) {
    const p = c.calculatePayslip({ [field]: 100 });
    assert.equal(p.net, 100);
    assert.equal(p.taxAmount, 0);
  }
  const overtime = c.calculatePayslip({ overtime: 100 });
  assert.equal(overtime.taxAmount, 20);
  assert.equal(overtime.net, 80);
});

test("Rounding uses pennies, not accumulated floating point errors", () => {
  const { c } = setup();
  const p = c.calculatePayslip({ deliveredCount: 3, rate: 0.1, basic: 19.99, overtime: 0.01, fuel: 0.1, food: 0.2, travel: 0.3, advance: 0.1 });
  assert.equal(p.vehiclePay, 0.3);
  assert.equal(p.taxablePay, 20.3);
  assert.equal(p.gross, 20.9);
  assert.equal(p.taxAmount, 4.06);
  assert.equal(p.net, 16.74);
});

test("Negative, invalid and excessively large values cannot generate incorrect payslips", () => {
  const { c } = setup();
  for (const field of ["rate", "basic", "overtime", "fuel", "food", "travel", "advance"]) {
    assert.throws(() => c.calculatePayslip({ [field]: -1 }), /valid amount/);
    assert.throws(() => c.calculatePayslip({ [field]: NaN }), /valid amount/);
  }
  assert.throws(() => c.calculatePayslip({ taxPct: 101 }), /Tax rate/);
  assert.throws(() => c.calculatePayslip({ basic: 1e308 }), /too large/);
});

test("An advance exceeding pay is not silently discarded or clamped", () => {
  const { c } = setup();
  const p = c.calculatePayslip({ basic: 100, advance: 90 });
  assert.equal(p.net, -10);
  assert.match(c.payslipBreakdown(p), /balance owed/);
  assert.match(c.payslipBreakdown(p), /£10\.00/);
});

test("Switching tax off and on updates the estimate without losing the 20 percent rate", () => {
  const { c, fields } = setup();
  fields.psTaxEnabled.checked = false;
  c.refreshPayslipEstimate();
  assert.equal(fields.psTax.disabled, true);
  assert.equal(fields.psTax.value, "20");
  assert.match(fields.payslipEstimate.innerHTML, /£1170\.00/);
  fields.psTaxEnabled.checked = true;
  c.refreshPayslipEstimate();
  assert.equal(fields.psTax.disabled, false);
  assert.match(fields.payslipEstimate.innerHTML, /£930\.00/);
});

test("Generation saves the complete breakdown, which survives reload and printable viewing", async () => {
  const { c, store, fields, saved } = setup();
  await c.generatePayslip();
  const p = saved().payslips[0];
  for (const field of ["fuel", "food", "travel", "overtime", "advance"]) assert.equal(p[field], inputs[field]);
  assert.equal(p.taxEnabled, true);
  assert.equal(p.net, 930);
  store.payslips = JSON.parse(JSON.stringify(saved().payslips));
  c.viewPayslip(p.id);
  for (const label of ["Fuel payment", "Food payment", "Travel cost payment", "Overtime payment", "Advance deducted", "Print / Save PDF"]) assert.ok(fields.payslipDetail.innerHTML.includes(label));
  assert.match(fields.payslipDetail.innerHTML, /£930\.00/);
});

test("Saving without tax persists that choice and the correct net pay", async () => {
  const { c, fields, saved } = setup();
  fields.psTaxEnabled.checked = false;
  await c.generatePayslip();
  const p = saved().payslips[0];
  assert.equal(p.taxEnabled, false);
  assert.equal(p.taxAmount, 0);
  assert.equal(p.net, 1170);
});

test("Invalid input is rejected before saving and failed saves do not clear the form", async () => {
  const { c, fields, store, redraws, saved } = setup();
  fields.psAdvance.value = "-100";
  await c.generatePayslip();
  assert.equal(store.payslips.length, 0);
  assert.equal(saved(), undefined);
  fields.psAdvance.value = "150";
  c.saveStore = async () => false;
  await c.generatePayslip();
  assert.equal(redraws(), 0);
  assert.equal(fields.psAdvance.value, "150");
  assert.equal(fields.generatePayslipBtn.disabled, false);
});

test("Repeated Generate clicks cannot create duplicate records while saving", async () => {
  const { c, store } = setup();
  let release;
  c.saveStore = () => new Promise(resolve => { release = resolve; });
  const pending = c.generatePayslip();
  await c.generatePayslip();
  assert.equal(store.payslips.length, 1);
  release(true);
  await pending;
});

test("Historic payslips keep their stored totals and display new components as zero", () => {
  const { c } = setup();
  const p = { basic: 100, gross: 100, taxPct: 20, taxAmount: 20, net: 80 };
  const view = c.payslipBreakdown(p);
  assert.match(view, /£80\.00/);
  assert.doesNotMatch(view, /NaN|undefined/);
  assert.equal(p.net, 80);
});

test("The form and saved list contain every requested payment and deduction", () => {
  const { c, draw, fields } = setup();
  draw(fields.content);
  for (const id of ["psFuel", "psFood", "psTravel", "psOvertime", "psAdvance", "psTaxEnabled"]) assert.ok(fields.content.innerHTML.includes('id="' + id + '"'));
  assert.match(fields.content.innerHTML, /Advance Deducted/);
});
