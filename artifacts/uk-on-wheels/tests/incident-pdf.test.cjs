const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const root = path.join(__dirname, "..");
const pdfModule = import(pathToFileURL(path.join(root, "src/incident-pdf.js")).href);
const code = fs.readFileSync(path.join(root, "public/driver-incidents.js"), "utf8");
function uiContext() {
  const context = vm.createContext({
    window: {}, currentSession: { user: { id: "driver-1" } },
    document: { getElementById: () => null }, Date, URL, setTimeout,
    role: "admin", page: "incidents",
  });
  vm.runInContext(code, context);
  return context;
}
const report = {
  id: "aabbccdd-1122-4333-8444-aabbccddeeff", driver_id: "driver-1",
  status: "submitted", created_at: "2026-10-18T00:00:00Z",
  submitted_at: "2026-10-18T00:01:00Z",
  details: { fullName: "Example Driver", registration: "AB12 CDE", fault: "other" },
};
const ref = "UKOW-INC-AABBCCDD112243338444AABBCCDDEEFF";
function options(extra = {}) {
  return { report, reference: ref, fields: ["fullName", "registration", "fault"],
    labels: { fullName: "Full name", registration: "Registration", fault: "Fault" }, ...extra };
}
function content(doc) { return doc.internal.pages.flat().join("\n"); }

test("Existing and new report references use the whole immutable UUID", () => {
  const ui = uiContext().window.IncidentUI;
  assert.equal(ui.reference(report), ref);
  assert.equal(ui.reference({ ...report, details: { fullName: "Changed" } }), ref);
  assert.equal(ui.reference(report.id.toUpperCase()), ref);
  assert.notEqual(ui.reference({ ...report, id: report.id.slice(0, -1) + "0" }), ref);
});
test("References, old IDs, registrations and Driver names can find saved reports", () => {
  const ui = uiContext().window.IncidentUI;
  for (const q of [ref, ref.toLowerCase(), "aabbccdd-1122", "ab12cde", "Example Driver", ""]) {
    assert.equal(ui.matches(report, q), true, q);
  }
  assert.equal(ui.matches(report, "A DIFFERENT VEHICLE"), false);
});
test("Admin history shows references, search and the authorised PDF action", async () => {
  const context = uiContext();
  context.window.IncidentAPI = {
    list: async () => [report], saveDraft() {}, upload() {}, submit() {},
    photos: async () => [],
  };
  const events = {};
  const container = { isConnected: true, innerHTML: "", addEventListener: (type, fn) => { events[type] = fn; }, contains: () => true };
  await context.window.IncidentUI.renderAdmin(container);
  assert.match(container.innerHTML, /incSearchAdmin/);
  assert.ok(container.innerHTML.includes(ref));
  events.click({ target: { closest: () => ({ getAttribute: name => name === "data-aact" ? "sel" : report.id }) } });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(container.innerHTML, /data-aact="pdf"/);
  assert.match(container.innerHTML, /Download PDF/);
  assert.match(container.innerHTML, /Report reference/);
});
test("PDF is a real file with searchable reference and all field values", async () => {
  const { createIncidentPdf } = await pdfModule;
  const doc = await createIncidentPdf(options());
  assert.ok(doc.output().startsWith("%PDF-"));
  assert.ok(content(doc).includes(ref));
  assert.match(content(doc), /Example Driver/);
  assert.match(content(doc), /Other party/);
  assert.match(content(doc), /No photos stored/);
});
test("Long incident descriptions continue across pages rather than being cut off", async () => {
  const { createIncidentPdf } = await pdfModule;
  const doc = await createIncidentPdf(options({
    report: { ...report, details: { description: "Full incident description. ".repeat(380) + "END OF EVIDENCE" } },
    fields: ["description"], labels: { description: "What happened" },
  }));
  assert.ok(doc.getNumberOfPages() > 2);
  assert.match(content(doc), /END OF EVIDENCE/);
  const occurrences = content(doc).split(ref).length - 1;
  assert.ok(occurrences >= doc.getNumberOfPages());
});
test("Saved drafts are clearly labelled as not submitted", async () => {
  const { createIncidentPdf } = await pdfModule;
  const doc = await createIncidentPdf(options({ report: { ...report, status: "draft", submitted_at: null } }));
  assert.match(content(doc), /DRAFT \/ NOT SUBMITTED/);
  assert.match(content(doc), /Not submitted/);
});
test("Every evidence category is embedded and captioned in the PDF", async () => {
  const { createIncidentPdf } = await pdfModule;
  const calls = [];
  const photos = ["incident", "licence", "insurance"].map((category, i) => ({
    category, id: String(i), file_name: category + ".png", url: "https://private.invalid/" + i,
  }));
  const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==";
  const doc = await createIncidentPdf(options({ photos,
    imageLoader: async p => { calls.push(p.category); return { data: jpeg, width: 2, height: 2 }; },
  }));
  assert.deepEqual(calls, ["incident", "licence", "insurance"]);
  assert.match(content(doc), /Incident scene/);
  assert.match(content(doc), /Other party licence/);
  assert.match(content(doc), /Other party insurance/);
  assert.ok(doc.getNumberOfPages() >= 4);
  assert.ok(Object.keys(doc.internal.collections.addImage_images).length > 0);
});
test("Missing or failed photos stop export instead of silently losing evidence", async () => {
  const { createIncidentPdf } = await pdfModule;
  await assert.rejects(createIncidentPdf(options({ photos: [{ id: "missing", file_name: "licence.jpg", url: null }] })), /No incomplete PDF/);
  await assert.rejects(createIncidentPdf(options({
    photos: [{ id: "failed", file_name: "insurance.jpg", url: "https://private.invalid/" }],
    imageLoader: async () => { throw new Error("Connection lost"); },
  })), /Connection lost.*No incomplete PDF/);
});
test("A changed session cancels the PDF export", async () => {
  const { createIncidentPdf } = await pdfModule;
  let calls = 0;
  await assert.rejects(createIncidentPdf(options({
    assertSession: () => { if (++calls > 1) throw new Error("Session changed"); },
  })), /Session changed/);
});
