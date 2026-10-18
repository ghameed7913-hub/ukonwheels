const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const base = path.join(__dirname, "..");
const apiCode = fs.readFileSync(path.join(base, "public/incident-api.js"), "utf8");
const uiCode = fs.readFileSync(path.join(base, "public/driver-incidents.js"), "utf8");
const sql = fs.readFileSync(path.join(base, "../..", "supabase/incident_reports_patch.sql"), "utf8");
const html = fs.readFileSync(path.join(base, "index.html"), "utf8");

function apiSetup() {
  const calls = [], bucketCalls = [];
  const state = { rpcError: null, storageError: null, photoError: null, rows: [], rpcData: { id: "report", status: "draft" } };
  const storage = {
    upload: async (...args) => { bucketCalls.push(["upload", ...args]); return { data: {}, error: state.storageError }; },
    remove: async (...args) => { bucketCalls.push(["remove", ...args]); return {}; },
    createSignedUrl: async p => ({ data: { signedUrl: "https://private.invalid/" + p }, error: p === "bad" ? { message: "Expired" } : null }),
  };
  const q = {
    select() { return this; }, eq() { return this; },
    async order() { return { data: state.rows, error: state.photoError }; },
  };
  const c = vm.createContext({
    window: {}, SUPABASE_CONFIGURED: true, currentSession: { user: { id: "driver" } },
    crypto: { randomUUID: () => "unique-id" },
    sb: {
      rpc: async (name, args) => { calls.push({ name, args }); return { data: state.rpcData, error: state.rpcError }; },
      from: () => q,
      storage: { from: name => { assert.equal(name, "incident-evidence"); return storage; } },
    },
  });
  vm.runInContext(apiCode, c);
  return { c, api: c.window.IncidentAPI, calls, bucketCalls, state };
}
test("Drafts use the stable client reference and real Supabase RPC, never app_store", async () => {
  const { api, calls } = apiSetup();
  await api.saveDraft({ id: "stable-id", details: { fullName: "Test Driver" } });
  assert.equal(calls[0].name, "save_incident_report");
  assert.equal(calls[0].args.p_id, "stable-id");
  assert.equal(calls[0].args.p_booking_id, null);
  await assert.rejects(api.saveDraft({ details: {} }), /stable draft reference/);
});
test("Missing backend setup rejects with the exact SQL setup instruction", async () => {
  const { api, state } = apiSetup();
  state.rpcError = { code: "PGRST202", message: "missing function" };
  await assert.rejects(api.submit("report"), /supabase\/incident_reports_patch.sql/);
});
test("Real storage upload precedes metadata; file bytes never enter report JSON", async () => {
  const { api, calls, bucketCalls } = apiSetup();
  const f = { name: "photo.jpg", type: "image/jpeg", size: 4000 };
  await api.upload("report", f, "licence");
  assert.equal(bucketCalls[0][0], "upload");
  assert.equal(bucketCalls[0][2], f);
  assert.equal(calls[0].name, "register_incident_photo");
  assert.equal(calls[0].args.p_category, "licence");
  assert.equal(calls[0].args.p_storage_path, "report/unique-id.jpg");
});
test("A failed storage write never registers evidence or submits", async () => {
  const { api, state, calls } = apiSetup();
  state.storageError = { message: "Connection lost" };
  await assert.rejects(api.upload("r", { type: "image/png", size: 20, name: "p.png" }, "incident"), /Connection lost/);
  assert.equal(calls.length, 0);
});
test("Unsupported, empty, oversized images and invalid categories are rejected", async () => {
  const { api, bucketCalls } = apiSetup();
  for (const f of [{ type: "image/heic", size: 20 }, { type: "image/jpeg", size: 0 }, { type: "image/png", size: 10485761 }])
    await assert.rejects(api.upload("r", f, "incident"), /10 MB/);
  await assert.rejects(api.upload("r", { type: "image/png", size: 20 }, "public"), /category/);
  assert.equal(bucketCalls.length, 0);
});
test("Metadata failure is explicit and attempts only RLS-guarded orphan cleanup", async () => {
  const { api, state, bucketCalls } = apiSetup();
  state.rpcError = { message: "Metadata failed" };
  await assert.rejects(api.upload("r", { type: "image/png", size: 20, name: "p" }, "insurance"), /Metadata failed/);
  assert.equal(bucketCalls[1][0], "remove");
});
test("One expired viewing link does not hide other stored photos", async () => {
  const { api, state } = apiSetup();
  state.rows = [{ id: "1", storage_path: "bad" }, { id: "2", storage_path: "good" }];
  const rows = await api.photos("r");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].url, null);
  assert.equal(rows[1].url, "https://private.invalid/good");
});
test("Signed-out requests cannot save or read reports", async () => {
  const { api, c } = apiSetup(); c.currentSession = null;
  await assert.rejects(api.list(), /Sign in/);
  await assert.rejects(api.submit("r"), /Sign in/);
});
test("Driver form includes every requested detail and does not use a phone number as Driver ID", () => {
  const c = vm.createContext({
    window: { crypto: { randomUUID: () => "new-id" } }, crypto: { randomUUID: () => "new-id" },
    currentSession: { user: { id: "driver1" } }, currentUser: { name: "Example Driver", phone: "NOT-A-DRIVER-ID" },
    driverAssignedRows: () => [], document: { getElementById: () => null },
    Date, URL, setTimeout,
  });
  vm.runInContext(uiCode, c);
  let markup = c.window.IncidentUI.renderDriver();
  for (const key of ["fullName", "driverNumber", "registration", "make", "model", "policeReference", "recoveryCompany", "recoveryReference", "description", "occurredAt", "location"])
    assert.match(markup, new RegExp(`inc_${key}`));
  assert.doesNotMatch(markup, /NOT-A-DRIVER-ID/);
  for (const type of ["Accident", "Incident", "Delay", "Recovery"]) assert.ok(markup.includes(type));
  assert.match(markup, /multiple/);
  assert.match(markup, /capture="environment"/);
  assert.equal(c.window.IncidentUI.hasUnsaved(), false);
  c.currentUser = { name: "Second Driver" }; c.currentSession = { user: { id: "driver2" } };
  markup = c.window.IncidentUI.renderDriver();
  assert.ok(markup.includes("Second Driver"));
  assert.ok(!markup.includes("Example Driver"));
  for (const key of ["otherName", "otherPhone", "otherAddress", "otherInsurance", "otherRegistration", "otherMake", "otherModel", "otherColour"])
    assert.ok(c.window.IncidentUI.FIELD_KEYS.includes(key));
});
test("Private SQL has ownership, active-role, immutable submission and evidence retention safeguards", () => {
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /revoke all on public.incident_reports,public.incident_report_photos from anon,authenticated/);
  assert.match(sql, /driver_id=auth.uid\(\) and public.is_active_incident_driver/);
  assert.match(sql, /Submitted incident reports cannot be edited/);
  assert.match(sql, /for update/g);
  assert.match(sql, /is_portal_admin\(\)/);
  assert.match(sql, /'incident-evidence','incident-evidence',false/);
  assert.match(sql, /and not exists\(select 1 from public.incident_report_photos p where p.storage_path=name\)/);
  assert.doesNotMatch(sql, /is_business_member|client_id|bookings:view/);
});
test("Portal exposes Admin review and Driver incidents, without giving Clients an incident route", () => {
  assert.match(html, /if\(page==="incidents"\)[\s\S]*?if\(role!=="admin"\)/);
  assert.match(html, /IncidentUI\.renderAdmin\(c\)/);
  assert.match(html, /driverMobileTab==="incidents"/);
  assert.match(html, /IncidentUI\.reset\(\)/);
  assert.match(html, /IncidentUI\.hasUnsaved/);
});
