const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const section = (from, to) => {
  const start = html.indexOf(from);
  const end = html.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Missing section: ${from}`);
  return html.slice(start, end);
};
const code = [
  section("function escapeHtml(", "function normalizedBookingToPortal("),
  section("function bookingEvidenceCount(", "function drawClientStatusPage("),
  section("function viewStatusBooking(", "function findBookingByRef("),
  section("function clientViewBooking(", "function drawClientTracking("),
  section("function evidenceSection(", "/* === END RESTORED ADMIN MODULES"),
  section("async function uploadBookingEvidence(", "async function startCamera("),
].join("\n");

function setup(rows = []) {
  const booking = { ref: "PHOTO-1", _normalizedId: "booking-1", pickupPhotos: {}, deliveryPhotos: {} };
  const calls = [];
  const overlays = [];
  const context = {
    window:{},
    console,
    SUPABASE_CONFIGURED: true,
    currentSession: { user: { id: "driver-1" } },
    visibleBookings: () => [booking],
    document: {
      getElementById: () => null,
      createElement: () => {
        const refresh = {};
        const overlay = {
          style: {}, firstElementChild: {}, isConnected: true,
          querySelector: () => refresh,
          remove() { this.isConnected = false; },
        };
        overlays.push(overlay);
        return overlay;
      },
      body: { appendChild() {} },
    },
    sb: {
      storage: {
        from(bucket) {
          assert.equal(bucket, "booking-evidence");
          return {
            async upload(storagePath, blob, options) {
              calls.push({ type: "upload", storagePath, blob, options });
              return {};
            },
            async remove() { throw Error("Successful evidence must not be deleted"); },
            async createSignedUrls(paths) {
              calls.push({ type: "sign-many", paths });
              return { data: paths.map(p => ({ signedUrl: `https://photos.example/${p}?fresh` })) };
            },
            async createSignedUrl(storagePath) {
              calls.push({ type: "sign-one", storagePath });
              return { data: { signedUrl: "https://photos.example/renewed" } };
            },
          };
        },
      },
      from(table) {
        if(table==="booking_inspections")return {select(){return this},eq(){return this},async maybeSingle(){return {data:context.__inspection||null}}};
        assert.equal(table, "booking_evidence");
        return {
          async insert(row) { calls.push({ type: "insert", row }); return {}; },
          select() { return this; },
          eq(field, value) {
            assert.equal(field, "booking_id");
            assert.equal(value, booking._normalizedId);
            return this;
          },
          async order() { return { data: rows }; },
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/pickup-checklist.js"),"utf8"),context);
  vm.runInContext(code, context);
  return { context, booking, calls, overlays };
}

test("Driver upload stores bytes and booking-linked metadata, without overwriting previous photos", async () => {
  const { context, booking, calls } = setup();
  const canvas = { toBlob: cb => cb({ bytes: "jpeg" }) };
  const storagePath = await context.uploadBookingEvidence(booking, canvas, "pickup", "Front", 51, -1, 10, "2026-01-01T12:00:00Z");
  assert.ok(storagePath.startsWith("booking-1/"));
  const uploaded = calls.find(c => c.type === "upload");
  assert.equal(uploaded.options.upsert, false);
  const metadata = calls.find(c => c.type === "insert").row;
  assert.equal(metadata.storage_path, storagePath);
  assert.equal(metadata.booking_id, "booking-1");
  assert.equal(metadata.captured_by, "driver-1");
  assert.equal(metadata.evidence_type, "pickup");
  assert.equal("image" in metadata, false);
});

for(const viewer of ["admin-1","linked-client-1"]){
 test(`${viewer} reloads the saved pickup checklist and safely renders document answers and damage comments`,async()=>{
  const {context,booking,overlays}=setup([{id:"damage",evidence_type:"pickup",storage_path:"booking-1/damage.jpg",label:"Damage photo 20"}]);
  context.currentSession={user:{id:viewer}};
  context.__inspection={condition:"Damage Present",odometer_mileage:1200,fuel_level:"Half",notes:"<script>bad</script>",checklist:{version:1,electricVehicle:"yes",chargingCable:"no",chargingCableReason:"Not supplied",spareTyre:"no",logBook:"yes",serviceHistory:"no",damagePresent:"yes",damageComments:"<img onerror=bad>Rear bumper scratch"}};
  await context.showEvidence(booking.ref);
  const rendered=overlays[0].firstElementChild.innerHTML;
  assert.match(rendered,/Not supplied/);assert.match(rendered,/Rear bumper scratch/);
  assert.match(rendered,/Damage photo 20/);assert.match(rendered,/&lt;script&gt;/);
  assert.doesNotMatch(rendered,/<script>|<img onerror=bad>/);
  assert.equal(booking.pickupInspection.checklist.logBook,"yes");
 });
}

for (const viewer of ["admin-1", "linked-client-1"]) {
  test(`${viewer} reloads all saved pickup, delivery and retake photos from server, not phone cache`, async () => {
    const rows = [
      { id: "p1", evidence_type: "pickup", storage_path: "booking-1/old-front.jpg", label: "Front" },
      { id: "p2", evidence_type: "pickup", storage_path: "booking-1/retake-front.jpg", label: "Front" },
      { id: "d1", evidence_type: "delivery", storage_path: "booking-1/delivery.jpg", label: "Front at Delivery" },
    ];
    const { context, booking, overlays } = setup(rows);
    context.currentSession = { user: { id: viewer } };
    await context.showEvidence(booking.ref);
    assert.equal(Object.keys(booking.pickupPhotos).length, 2);
    assert.equal(Object.keys(booking.deliveryPhotos).length, 1);
    const rendered = overlays[0].firstElementChild.innerHTML;
    assert.match(rendered, /Pickup Pictures \(2\)/);
    assert.match(rendered, /Delivery Pictures \(1\)/);
    assert.match(rendered, /old-front\.jpg/);
    assert.match(rendered, /retake-front\.jpg/);
  });
}

test("Expired image links are renewed once, with an explicit error instead of an infinite retry", async () => {
  const { context, calls } = setup();
  const link = {}, error = { hidden: true };
  const image = {
    dataset: { storagePath: "booking-1/photo.jpg" }, isConnected: true,
    closest: selector => selector === "a" ? link : { querySelector: () => error },
  };
  await context.renewEvidenceImage(image);
  assert.equal(image.src, "https://photos.example/renewed");
  assert.equal(link.href, image.src);
  await context.renewEvidenceImage(image);
  assert.equal(calls.filter(c => c.type === "sign-one").length, 1);
  assert.equal(error.hidden, false);
});

test("A photo viewer cannot be opened for a booking outside the current user's visible bookings", async () => {
  const { context, calls, overlays } = setup();
  context.visibleBookings = () => [];
  await context.showEvidence("PHOTO-1");
  assert.equal(calls.length, 0);
  assert.equal(overlays.length, 0);
});

test("Unlinked uploads fail explicitly rather than silently saving only on the Driver's phone", async () => {
  const { context, calls } = setup();
  await assert.rejects(context.uploadBookingEvidence({ ref: "legacy" }, {}, "pickup", "Front"), /not linked/);
  assert.equal(calls.length, 0);
});

test("Pickup Evidence counts real saved photos even without the obsolete pickupCaptureMode field", () => {
  const { context, booking } = setup();
  booking.pickupPhotos = { p1: { storagePath: "booking-1/photo.jpg" } };
  assert.equal(booking.pickupCaptureMode, undefined);
  assert.equal(context.bookingEvidenceCount(booking), 1);
  const control = context.bookingEvidenceButton(booking);
  assert.match(control, /View pickup evidence \(1\)/);
  assert.match(control, /showEvidence/);
});

test("Admin and Client booking details both provide pickup and delivery evidence controls", () => {
  const { context, booking } = setup();
  booking.pickupPhotos = { p1: { storagePath: "booking-1/photo.jpg" } };
  const detail = { scrollIntoView() {} };
  context.getStore = () => ({ bookings: [booking] });
  context.role = "admin";
  context.statusBookingDetail = detail;
  context.viewStatusBooking(booking.ref);
  assert.match(detail.innerHTML, /View pickup evidence \(1\)/);
  assert.match(detail.innerHTML, /View delivery evidence/);
  context.currency = value => `£${value || 0}`;
  context.document.getElementById = () => detail;
  context.clientViewBooking(booking.ref);
  assert.match(detail.innerHTML, /View pickup evidence \(1\)/);
  assert.match(detail.innerHTML, /View delivery evidence/);
});

test("Opening normalized evidence does not hide older unsynced pickup pictures", async () => {
  const { context, booking, overlays } = setup([]);
  booking.pickupPhotos = { old: { image: "data:image/jpeg;base64,old-photo", label: "Earlier pickup" } };
  await context.showEvidence(booking.ref);
  assert.match(overlays[0].firstElementChild.innerHTML, /Earlier pickup/);
  assert.equal(Object.keys(booking.pickupPhotos).length, 1);
});

test("One broken viewing link does not hide the other saved pickup photos", async () => {
  const { context, booking, overlays } = setup([
    { id: "good", evidence_type: "pickup", storage_path: "booking-1/good.jpg", label: "Front" },
    { id: "bad", evidence_type: "pickup", storage_path: "booking-1/missing.jpg", label: "Rear" },
  ]);
  context.sb.storage.from = () => ({
    createSignedUrls: async () => ({ data: [{ signedUrl: "https://photos.example/good.jpg" }, { error: "Object not found" }] }),
  });
  await context.showEvidence(booking.ref);
  const rendered = overlays[0].firstElementChild.innerHTML;
  assert.match(rendered, /https:\/\/photos.example\/good.jpg/);
  assert.match(rendered, /Some saved photo links could not be loaded/);
  assert.match(rendered, /Pickup Pictures \(2\)/);
});
