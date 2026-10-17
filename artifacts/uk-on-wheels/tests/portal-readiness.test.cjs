const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
function part(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a, start);
  return html.slice(a, b);
}
function sandbox(source, values) {
  const context = vm.createContext({ console, ...values });
  vm.runInContext(source, context);
  return context;
}
function sharedStore(handler) {
  const c = sandbox(part("function saveStore(", "function currency("), {
    STORE_CACHE: null, SUPABASE_CONFIGURED: true, storeReady: true,
    currentSession: { user: { id: "admin" } },
    sharedSavePending: null, sharedSaveInFlight: null, sharedSaveError: "",
    window: { dispatchEvent() {} }, Event: class {},
    sb: { from: () => ({ update: data => ({ eq: () => ({ select: () => ({ single: () => handler(data) }) }) }) }) },
  });
  c.renderSharedSaveNotice = () => {};
  return c;
}

test("Failed shared saves stay pending, report failure, and can be retried", async () => {
  let fail = true;
  const c = sharedStore(async () => fail ? { error: { message: "Connection lost" } } : { data: { id: "main" } });
  assert.equal(await c.saveStore({ bookings: [], businesses: [] }), false);
  assert.match(c.sharedSaveError, /Connection lost/);
  assert.ok(c.sharedSavePending);
  fail = false;
  assert.equal(await c.flushSharedStore(), true);
  assert.equal(c.sharedSavePending, null);
});

test("Shared saves run in sequence and keep the newest snapshot", async () => {
  const writes = [];
  let release;
  const c = sharedStore(async payload => {
    writes.push(payload.data);
    if (writes.length === 1) await new Promise(resolve => { release = resolve; });
    return { data: { id: "main" } };
  });
  const first = c.saveStore({ bookings: [], note: "first" });
  await Promise.resolve();
  const last = { bookings: [], note: "latest" };
  c.saveStore(last);
  last.note = "later local mutation";
  release();
  assert.equal(await first, true);
  assert.deepEqual(writes.map(w => w.note), ["first", "latest"]);
  assert.equal(c.sharedSavePending, null);
});

test("Saving does not copy private Storage photo bytes into the shared cache", async () => {
  let saved;
  const c = sharedStore(async data => { saved = data.data; return { data: { id: "main" } }; });
  await c.saveStore({ bookings: [{ _normalizedId: "b", pickupPhotos: { p: { storagePath: "b/photo.jpg", image: "private" } } }] });
  assert.deepEqual(Object.keys(saved.bookings[0].pickupPhotos), []);
});

test("Background updates do not unmount an active form or camera", () => {
  let draws = 0, form = true;
  const c = sandbox(part("function refreshPortalSafely(", "async function initStoreFromSupabase("), {
    document: {
      getElementById: id => id === "app" ? { classList: { contains: () => false } } : { querySelector: () => form ? {} : null },
      querySelector: () => null,
    },
    draw: () => draws++,
  });
  c.refreshPortalSafely();
  assert.equal(draws, 0);
  form = false;
  c.refreshPortalSafely();
  assert.equal(draws, 1);
});

test("Reloading normalized bookings preserves references held by in-progress actions", async () => {
  const booking = { ref: "BK1", _normalizedId: "id-1", status: "Driver Assigned", timeline: [] };
  const store = { bookings: [booking] };
  const data = { bookings: [{ id: "id-1", reference: "BK1", status: "Picked Up" }], profiles: [], businesses: [], booking_evidence: [], booking_inspections: [] };
  const c = sandbox(part("async function loadNormalizedPortalData(", "async function removeSeededDemoData("), {
    sb: { from: table => {
      const query = { select: () => query, order: () => query, then: resolve => resolve({ data: data[table] }) };
      return query;
    } },
    currentSession: { user: { id: "admin" } }, role: "admin", normalizedChannel: {},
    getStore: () => store, mergeSavedBusinesses() {}, renderSharedSaveNotice() {},
    normalizedBookingToPortal: b => ({ ref: b.reference, _normalizedId: b.id, status: b.status }),
  });
  await c.loadNormalizedPortalData();
  assert.equal(store.bookings[0], booking);
  assert.equal(booking.status, "Picked Up");
});

test("Admin status changes must save to the shared booking before changing the UI", async () => {
  const booking = { ref: "BK1", _normalizedId: "id-1", status: "Driver Assigned", timeline: [] };
  const calls = [];
  let allowed = false;
  const c = sandbox(part("async function updateStatus(", "function drawNotifications("), {
    getStore: () => ({ bookings: [booking] }),
    document: { getElementById: id => ({ value: id === "sb" ? "BK1" : "Picked Up" }) },
    persistNormalizedStatus: async (b, status) => { calls.push(status); return allowed; },
    saveStore: async () => true, render() {}, alert() {},
  });
  await c.updateStatus();
  assert.equal(booking.status, "Driver Assigned");
  allowed = true;
  await c.updateStatus();
  assert.equal(booking.status, "Picked Up");
  assert.deepEqual(calls, ["Picked Up", "Picked Up"]);
});

test("A fresh authorized booking read removes a reassigned-away normalized job, retaining unlinked legacy jobs", async () => {
  const store = { bookings: [
    { ref: "OLD-JOB", _normalizedId: "old-job", _driverId: "old-driver" },
    { ref: "LEGACY", driver: "Legacy Driver" },
  ] };
  const c = sandbox(part("async function loadNormalizedPortalData(", "async function removeSeededDemoData("), {
    sb: { from: () => {
      const q = { select: () => q, order: () => q, then: resolve => resolve({ data: [] }) };
      return q;
    } },
    currentSession: { user: { id: "old-driver" } }, role: "driver", normalizedChannel: {},
    getStore: () => store, mergeSavedBusinesses() {}, renderSharedSaveNotice() {},
    normalizedBookingToPortal: () => { throw new Error("No visible bookings expected"); },
  });
  await c.loadNormalizedPortalData();
  assert.deepEqual(Array.from(store.bookings, b => b.ref), ["LEGACY"]);
});

test("Private Client bookings send Private customer type to Supabase", async () => {
  let request;
  const values = { veh: "Ford Focus", reg: "AB12CDE", pickup: "Leeds", dest: "York", receiver: "Receiver", mobile: "07000000000" };
  const c = sandbox(part("async function submitBooking(", "function drawBusinesses("), {
    getStore: () => ({ bookings: [] }), role: "client", currentUser: { accountType: "private", name: "Client" },
    currentSession: { user: { id: "client-1" } }, SUPABASE_CONFIGURED: true,
    document: { getElementById: id => id in values ? { value: values[id] } : null },
    sb: { rpc: async (name, input) => { request = input; return { data: { id: "new-id" } }; } },
    loadNormalizedPortalData: async () => {}, render() {}, alert() {},
  });
  await c.submitBooking();
  assert.equal(request.p_customer_type, "Private");
  assert.equal(request.p_business_id, null);
});

test("Rapid repeated clicks cannot submit duplicate bookings", async () => {
  let submits = 0, release;
  const c = sandbox(part("async function createBooking(", "async function submitBooking("), {
    bookingCreationPending: false, document: { querySelector: () => null }, alert() {},
    submitBooking: async () => { submits++; await new Promise(resolve => { release = resolve; }); },
  });
  const pending = c.createBooking();
  await c.createBooking();
  assert.equal(submits, 1);
  release();
  await pending;
  assert.equal(c.bookingCreationPending, false);
});

test("Sign-in cleanup never deletes bookings, businesses or their evidence", async () => {
  const c = sandbox(part("async function removeSeededDemoData(", "function migrateClientData("), {
    sb: { from: () => { throw Error("Unexpected database deletion"); } },
  });
  await c.removeSeededDemoData();
});

test("A failed booking reload is visible, rather than appearing to be an empty account", async () => {
  let displayed = false;
  const c = sandbox(part("async function loadNormalizedPortalData(", "async function removeSeededDemoData("), {
    currentSession: { user: { id: "admin" } }, sharedReadError: "",
    sb: { from: () => {
      const query = { select: () => query, order: () => query, then: resolve => resolve({ error: { message: "Permission denied" } }) };
      return query;
    } },
    renderSharedSaveNotice: () => { displayed = true; },
  });
  await c.loadNormalizedPortalData();
  assert.equal(displayed, true);
  assert.match(c.sharedReadError, /could not be refreshed.*Permission denied/);
});

test("Driver handover values are captured before an asynchronous status refresh", async () => {
  const booking = { ref: "BK1", receiver: "Old receiver", receiverMobile: "Old phone", timeline: [] };
  const store = { bookings: [booking], notifications: [] };
  const inputs = { rn_BK1: { value: "Actual receiver" }, rm_BK1: { value: "New phone" }, dc_BK1: { checked: true } };
  for (let i = 0; i < 6; i++) inputs["ds_BK1_" + i] = { dataset: { captured: "1" } };
  const c = sandbox(part("async function deliver(", 'window.addEventListener("storage"'), {
    driverPhotoIsSaving: () => false, getStore: () => store,
    document: { getElementById: id => inputs[id] },
    persistNormalizedStatus: async () => { delete inputs.rn_BK1; delete inputs.rm_BK1; return true; },
    saveStore() {}, queueCustomerStatusMessage() {}, draw() {}, alert() {},
  });
  await c.deliver("BK1");
  assert.equal(booking.deliveryEvidence.receiverName, "Actual receiver");
  assert.equal(booking.deliveryEvidence.receiverMobile, "New phone");
});

test("Payment status changes call the canonical booking RPC and reject failed writes", async () => {
  const calls = [];
  const c = sandbox(part("async function persistBookingPayment(", " async function savePayment("), {
    SUPABASE_CONFIGURED: true, alert() {},
    sb: { rpc: async (name, args) => { calls.push({ name, args }); return { error: { message: "Denied" } }; } },
  });
  assert.equal(await c.persistBookingPayment({ _normalizedId: "id-1" }, "Paid"), false);
  assert.equal(calls[0].name, "admin_update_booking_details");
  assert.equal(calls[0].args.p_payment_status, "Paid");
});

test("Shared cache saves exclude legacy passwords and messaging credentials", async () => {
  let saved;
  const c = sharedStore(async payload => { saved = payload.data; return { data: { id: "main" } }; });
  await c.saveStore({ bookings: [], clientUsers: [{ name: "User", password: "dummy" }], messagingSettings: { apiKey: "dummy", apiSecret: "dummy", templates: {} } });
  assert.equal(Object.hasOwn(saved.clientUsers[0], "password"), false);
  assert.equal(saved.clientUsers[0].name, "User");
  assert.equal(Object.hasOwn(saved.messagingSettings, "apiKey"), false);
  assert.equal(Object.hasOwn(saved.messagingSettings, "apiSecret"), false);
});

test("Cancelling an incident report does not change the Driver booking status", async () => {
  const c = sandbox(part("async function incident(", "async function deliver("), {
    crmPrompt: async () => null,
    getStore: () => { throw Error("Cancelled action must not write"); },
  });
  await c.incident("BK1", "Accident");
});

test("Password resets use Supabase email recovery, not fake local password changes", async () => {
  const requests = [], notices = [];
  const c = sandbox(part("async function requestAccountPasswordReset(", "/* ---------- Inline icon set"), {
    crmConfirm: async () => true, alert: text => notices.push(text),
    location: { origin: "https://portal.example", pathname: "/" },
    sb: { auth: { resetPasswordForEmail: async (email, options) => { requests.push({ email, options }); return {}; } } },
  });
  assert.equal(await c.requestAccountPasswordReset("test@example.com"), true);
  assert.equal(requests[0].options.redirectTo, "https://portal.example/");
  assert.match(notices[0], /has not been changed/);
});

test("Client user creation no longer claims success or saves entries without a real login", async () => {
  const notices = [];
  const c = sandbox(part("async function createClientUser(", "function drawClientNotifications("), {
    SUPABASE_CONFIGURED: true, alert: text => notices.push(text),
    getStore: () => { throw Error("Must not create a fake directory entry"); },
  });
  await c.createClientUser();
  assert.match(notices[0], /must be created and linked by UK On Wheels Admin/);
});

test("Enabled Message Centre route has an implementation and identifies drafts honestly", () => {
  let messagingOnly;
  const c = sandbox(part("function drawMessageCentre(", "function drawSettings("), {
    drawSettings: (container, only) => { messagingOnly = only; },
  });
  c.drawMessageCentre({});
  assert.equal(messagingOnly, true);
  assert.match(html, /Live WhatsApp and SMS delivery is not connected/);
  assert.doesNotMatch(html, /<input id="msgApi(?:Key|Secret)"/);
});
