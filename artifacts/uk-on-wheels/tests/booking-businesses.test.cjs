const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const part = (start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
const code = [
  part("function escapeHtml(", "function normalizedBookingToPortal("),
  part("function mergeSavedBusinesses(", "function drawBooking("),
  part("async function createLinkedBooking(", "function toggleCustomerTypeFields("),
  part("function showBusinessTariff(", "async function createBooking("),
].join("\n");

function setup(rows = []) {
  let store = { businesses: [], bookings: [] };
  const select = { value: "", disabled: false, isConnected: true };
  const notice = {}, tariff = {};
  const calls = [];
  const context = {
    console, role: "admin", SUPABASE_CONFIGURED: true,
    STORE_CACHE: store, getStore: () => context.STORE_CACHE,
    document: { getElementById: id => ({ biz: select, businessLoadStatus: notice, tariffInfo: tariff })[id] },
    sb: {
      from(table) {
        assert.equal(table, "businesses");
        return { select: value => {
          assert.equal(value, "*");
          return { order: async () => ({ data: rows }) };
        } };
      },
      async rpc(name, input) {
        calls.push({ name, input });
        return { data: { id: "booking-created" } };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, select, notice, tariff, calls };
}

test("Saved Supabase businesses populate an empty legacy cache and dropdown", async () => {
  const { context, select } = setup([
    { id: "business-1", legal_name: "Saved Motors", trading_name: "Saved Motors", status: "Active" },
  ]);
  await context.loadBookingBusinesses();
  assert.match(select.innerHTML, /value="business-1"/);
  assert.match(select.innerHTML, /Saved Motors/);
  assert.equal(select.disabled, false);
  assert.equal(context.getStore().businesses[0].id, "business-1");
});

test("Legacy records are hydrated with saved IDs while preserving local-only information", () => {
  const { context } = setup();
  context.STORE_CACHE.businesses = [{ name: "Saved Motors", branches: "North", tariffNotes: "Retain this" }];
  context.mergeSavedBusinesses([{ id: "business-1", legal_name: "Saved Motors", per_mile_rate: 2.5 }]);
  const businesses = context.getStore().businesses;
  assert.equal(businesses.length, 1);
  assert.equal(businesses[0].id, "business-1");
  assert.equal(businesses[0].branches, "North");
  assert.equal(businesses[0].perMile, 2.5);
});

test("Refreshing keeps the selected business and tariff without replacing the booking form", async () => {
  const { context, select, tariff } = setup([
    { id: "business-1", legal_name: "Saved Motors", tariff_type: "Per Mile", per_mile_rate: 2.5 },
  ]);
  select.value = "business-1";
  await context.loadBookingBusinesses();
  assert.equal(select.value, "business-1");
  assert.match(tariff.innerHTML, /2.50 per mile/);
});

test("Same-name businesses remain distinct and creation sends the selected business UUID", async () => {
  const { context, calls } = setup();
  context.mergeSavedBusinesses([
    { id: "business-1", legal_name: "Motors" }, { id: "business-2", legal_name: "Motors" },
  ]);
  const options = context.bookingBusinessOptions();
  assert.match(options, /value="business-1"/);
  assert.match(options, /value="business-2"/);
  await context.createLinkedBooking({ customerType: "Business", business: "Motors", _businessId: "business-2", vehicle: "Ford Focus", reg: "AB12CDE" });
  assert.equal(calls[0].input.p_business_id, "business-2");
});

test("Private accounts are not listed as businesses; inactive businesses are visibly disabled", () => {
  const { context } = setup();
  context.STORE_CACHE.businesses = [
    { name: "Private person", accountType: "private" },
    { id: "inactive-1", name: "Inactive Motors", accountType: "business", status: "Inactive" },
  ];
  const options = context.bookingBusinessOptions();
  assert.doesNotMatch(options, /Private person/);
  assert.match(options, /value="inactive-1" disabled/);
  assert.match(options, /Inactive Motors — inactive/);
});

test("A failed business read produces an explicit retry message, not an unexplained empty selector", async () => {
  const { context, select, notice } = setup();
  context.sb.from = () => ({ select: () => ({ order: async () => ({ error: { message: "Access denied" } }) }) });
  await context.loadBookingBusinesses();
  assert.match(notice.innerHTML, /Access denied/);
  assert.match(notice.innerHTML, /Retry/);
  assert.equal(select.disabled, false);
});
