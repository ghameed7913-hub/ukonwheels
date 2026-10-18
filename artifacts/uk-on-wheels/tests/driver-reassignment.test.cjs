const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const sql = fs.readFileSync(path.join(__dirname, "../../../supabase/driver_reassignment_patch.sql"), "utf8");
function part(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a, start);
  return html.slice(a, b);
}
const code = [
  part("function isDeliveredBooking(", "async function linkExistingDriverBooking("),
  part("function driverAssignedRows(", "function driverStatusCounts("),
].join("\n");
function setup(status = "Picked Up", overrides = {}) {
  const booking = {
    ref: "TEST-ASSIGN", _normalizedId: "booking-id", _driverId: "driver-old",
    driver: "Previous Driver", status, pickupPhotos: { front: ["saved-evidence"] },
    deliveryPhotos: {}, timeline: [{ title: "Picked Up", text: "Existing history" }],
    collectionTime: "10:30", ...overrides,
  };
  const store = { bookings: [booking], drivers: [], notifications: [] };
  const profiles = [
    { id: "driver-old", role: "driver", status: "Active", full_name: "Previous Driver" },
    { id: "driver-new", role: "driver", status: "Active", full_name: "Next Driver" },
    { id: "driver-inactive", role: "driver", status: "Inactive", full_name: "Inactive Driver" },
  ];
  const fields = {
    "driver_TEST-ASSIGN": { value: "driver-new" },
    "assignDate_TEST-ASSIGN": { value: "2026-10-17" },
    "assignTime_TEST-ASSIGN": { value: "12:00" },
    "collectionTime_TEST-ASSIGN": { value: "10:30" },
    "driverNotes_TEST-ASSIGN": { value: "Continue delivery" },
    "assignDriverBtn_TEST-ASSIGN": { disabled: false, isConnected: true },
    content: { innerHTML: "" },
  };
  const calls = [], alerts = [], snapshots = [];
  let failure, permission = true, confirmed = true;
  const c = vm.createContext({
    SUPABASE_CONFIGURED: true, currentSession: { user: { id: "admin" } },
    currentUser: { name: "Admin" }, currentStaffUser: null,
    portalProfiles: profiles, page: "desktop",
    getStore: () => store, hasPermission: () => permission,
    document: { getElementById: id => fields[id] },
    alert: text => alerts.push(text), crmConfirm: async () => confirmed,
    escapeHtml: value => String(value ?? "").replace(/</g, "&lt;"),
    saveStore: async data => { snapshots.push(JSON.parse(JSON.stringify(data))); return true; },
    loadNormalizedPortalData: async () => {},
    createLinkedBooking: async () => ({ id: "linked-booking", driver_id: "driver-new", status: booking.status }),
    sb: { rpc: async (name, args) => {
      calls.push({ name, args });
      if (failure) return { error: failure };
      if (name === "driver_reassignment_ready") return { data: true };
      return { data: { id: "booking-id", driver_id: args.p_driver_id,
        status: status === "New Booked Vehicle" ? "Driver Assigned" : status } };
    } },
  });
  vm.runInContext(code, c);
  return { c, booking, store, profiles, fields, calls, alerts, snapshots,
    fail: error => { failure = error; }, deny: () => { permission = false; },
    cancel: () => { confirmed = false; } };
}

test("Assign Driver lists assigned and picked-up jobs with a Reassign option, not Delivered jobs", () => {
  const { c, store, fields } = setup();
  store.bookings.push({ ref: "DONE", status: "Delivered", driver: "Previous Driver" });
  store.bookings.push({ ref: "DELIVERED-LATER-CLAIM", status: "Claims", driver: "Previous Driver", _deliveredAt: "2026-10-17T12:00:00Z" });
  c.drawAssign(fields.content);
  assert.match(fields.content.innerHTML, /Reassign to Selected Driver/);
  assert.match(fields.content.innerHTML, /Current driver/);
  assert.doesNotMatch(fields.content.innerHTML, /driver_DONE|driver_DELIVERED-LATER-CLAIM/);
  assert.doesNotMatch(fields.content.innerHTML, /value="driver-old"|value="driver-inactive"/);
  assert.match(fields.content.innerHTML, /value="driver-new"/);
});

for (const status of ["Driver Assigned", "Picked Up", "On Route", "Delayed", "Accident", "Fault On Route", "Assigned AA on Route"]) {
  test(`Reassignment at ${status} keeps progress, evidence and collection details`, async () => {
    const { c, booking, calls, snapshots } = setup(status);
    const evidence = booking.pickupPhotos;
    await c.assignSpecificDriver("TEST-ASSIGN");
    assert.equal(calls[0].name, "reassign_booking_driver");
    assert.equal(calls[0].args.p_expected_driver_id, "driver-old");
    assert.equal(booking._driverId, "driver-new");
    assert.equal(booking.driver, "Next Driver");
    assert.equal(booking.status, status);
    assert.equal(booking.pickupPhotos, evidence);
    assert.equal(booking.collectionTime, "10:30");
    assert.equal(snapshots[0].bookings[0].timeline[0].title, "Driver Reassigned");
    assert.equal(snapshots[0].bookings[0].timeline[1].text, "Existing history");
  });
}

test("Delivered status and retained delivery timestamps block direct assignment before any RPC", async () => {
  for (const overrides of [{ status: "Delivered" }, { _deliveredAt: "2026-10-17T12:00:00Z" }]) {
    const { c, booking, calls, alerts } = setup("Picked Up", overrides);
    await c.assignSpecificDriver("TEST-ASSIGN");
    assert.equal(calls.length, 0);
    assert.equal(booking.driver, "Previous Driver");
    assert.match(alerts.at(-1), /Delivered jobs are locked/);
  }
});

test("A rejected concurrent driver change leaves the UI and evidence unchanged", async () => {
  const { c, booking, fail, snapshots, alerts } = setup();
  fail({ message: "The assigned driver has changed. Reload this booking before retrying" });
  await c.assignSpecificDriver("TEST-ASSIGN");
  assert.equal(booking._driverId, "driver-old");
  assert.equal(booking.status, "Picked Up");
  assert.equal(snapshots.length, 0);
  assert.match(alerts.at(-1), /failed/);
});

test("Missing SQL setup fails explicitly without modifying the assignment", async () => {
  const { c, booking, fail, alerts, snapshots } = setup();
  fail({ code: "PGRST202", message: "Could not find function" });
  await c.assignSpecificDriver("TEST-ASSIGN");
  assert.equal(booking._driverId, "driver-old");
  assert.equal(snapshots.length, 0);
  assert.match(alerts.at(-1), /supabase\/driver_reassignment_patch.sql/);
});

test("Cancel, duplicate clicks, same driver, inactive drivers and missing permission cannot change jobs", async () => {
  {
    const s = setup(); s.cancel(); await s.c.assignSpecificDriver("TEST-ASSIGN"); assert.equal(s.calls.length, 0);
  }
  {
    const s = setup(); const pending = s.c.assignSpecificDriver("TEST-ASSIGN");
    await s.c.assignSpecificDriver("TEST-ASSIGN"); await pending; assert.equal(s.calls.length, 1);
  }
  for (const id of ["driver-old", "driver-inactive"]) {
    const s = setup(); s.fields["driver_TEST-ASSIGN"].value = id;
    await s.c.assignSpecificDriver("TEST-ASSIGN"); assert.equal(s.calls.length, 0);
  }
  {
    const s = setup(); s.deny(); await s.c.assignSpecificDriver("TEST-ASSIGN"); assert.equal(s.calls.length, 0);
  }
});

test("The job moves from the previous Driver's list to the selected Driver's list", async () => {
  const { c } = setup();
  await c.assignSpecificDriver("TEST-ASSIGN");
  c.currentSession = { user: { id: "driver-old" } };
  assert.equal(c.driverAssignedRows().length, 0);
  c.currentSession = { user: { id: "driver-new" } };
  assert.equal(c.driverAssignedRows().length, 1);
});

test("A new assignment still changes New Booked Vehicle to Driver Assigned", async () => {
  const { c, booking, calls } = setup("New Booked Vehicle", { driver: "", _driverId: null });
  await c.assignSpecificDriver("TEST-ASSIGN");
  assert.equal(calls[0].args.p_expected_driver_id, null);
  assert.equal(booking.status, "Driver Assigned");
  assert.equal(booking.driver, "Next Driver");
});

test("Each ready vehicle gets an accessible Assign Driver button; other states and permissions do not", () => {
  const s = setup("New Booked Vehicle", { driver: "", _driverId: null });
  assert.match(s.c.bookingDriverAssignmentButton(s.booking), />Assign Driver<\/button>/);
  assert.match(s.c.bookingDriverAssignmentButton(s.booking), /aria-label="Assign Driver for TEST-ASSIGN/);
  for (const override of [
    { status: "Delivered" }, { _deliveredAt: "2026-10-18" },
    { deliveredAt: "2026-10-18" }, { status: "Picked Up" },
    { driver: "Already assigned" }, { _driverId: "assigned-id" },
  ]) assert.equal(s.c.bookingDriverAssignmentButton({ ...s.booking, ...override }), "");
  s.deny();
  assert.equal(s.c.bookingDriverAssignmentButton(s.booking), "");
});

test("Vehicle shortcut opens only the chosen booking and focuses its Driver selector", () => {
  const s = setup("New Booked Vehicle", { driver: "", _driverId: null });
  s.store.bookings.push({ ref: "OTHER", status: "New Booked Vehicle", vehicle: "Other car" });
  let focused = false, rendered = false;
  s.fields["driver_TEST-ASSIGN"].focus = () => { focused = true; };
  s.c.render = () => { rendered = true; };
  s.c.openDriverAssignment("TEST-ASSIGN");
  assert.equal(s.c.page, "assign");
  assert.equal(rendered, true);
  assert.equal(focused, true);
  assert.match(s.fields.content.innerHTML, /driver_TEST-ASSIGN/);
  assert.doesNotMatch(s.fields.content.innerHTML, /driver_OTHER/);
  assert.match(s.fields.content.innerHTML, /Show all bookings/);
  s.c.drawAssign(s.fields.content);
  assert.match(s.fields.content.innerHTML, /driver_OTHER/);
});

test("Stale, missing and unauthorised vehicle shortcuts cannot open assignment", () => {
  for (const status of ["Picked Up", "Delivered"]) {
    const s = setup(status);
    s.c.openDriverAssignment("TEST-ASSIGN");
    assert.equal(s.c.page, "desktop");
    assert.match(s.alerts.at(-1), /no longer waiting/);
  }
  const s = setup("New Booked Vehicle", { driver: "", _driverId: null });
  s.c.openDriverAssignment("MISSING");
  assert.match(s.alerts.at(-1), /not found/);
  s.deny();
  s.c.openDriverAssignment("TEST-ASSIGN");
  assert.match(s.alerts.at(-1), /permission/);
  assert.equal(s.c.page, "desktop");
});

test("Admin status and dashboard lists place the shortcut beside each vehicle", () => {
  const s = setup("New Booked Vehicle", { driver: "", _driverId: null, vehicle: "Ready car" });
  s.c.selectedStatusPage = "New Booked Vehicle";
   s.c.statusVehicleSearch = "";
   s.c.searchStatusVehicles = () => {};
  s.c.visibleBookings = () => s.store.bookings;
  s.c.bookingEvidenceButton = () => "";
  s.c.document.querySelectorAll = () => [];
  s.c.tabarea = { innerHTML: "" };
  vm.runInContext(part("function drawStatusPage(", "function viewStatusBooking("), s.c);
  vm.runInContext(part("function showTab(", "function mergeSavedBusinesses("), s.c);
  s.c.drawStatusPage(s.fields.content);
  assert.match(s.fields.content.innerHTML, /<td>Ready car<div[^>]*><button[^>]*>Assign Driver<\/button><\/div><\/td>/);
  s.c.showTab("New Booked Vehicle");
  assert.match(s.c.tabarea.innerHTML, /<td>Ready car<div[^>]*><button[^>]*>Assign Driver<\/button><\/div><\/td>/);
});

test("SQL protects Delivered jobs under a row lock, preserves status, and never deletes evidence", () => {
  assert.ok(sql.indexOf("for update") < sql.indexOf("previous_booking.delivered_at"));
  assert.match(sql, /previous_booking\.driver_id is distinct from p_expected_driver_id/);
  assert.match(sql, /else previous_booking\.status end/);
  assert.match(sql, /return public\.reassign_booking_driver/);
  assert.doesNotMatch(sql, /\bdelete\b|\btruncate\b/i);
  assert.match(sql, /driver_reassigned/);
});
