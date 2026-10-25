const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../public/local-weather.js'), 'utf8');
const fixture = () => ({
  place: { name: 'Glasgow', label: 'Glasgow, United Kingdom' },
  weather: { temperatureC: 9, windKph: 50, condition: 'fair', forecastAt: '2026-10-25T14:00:00Z' },
  warnings: { status: 'ok', area: 'Glasgow City', checkedAt: '2026-10-25T14:00:00Z',
    message: 'Regional warnings, including upcoming warnings.',
    items: ['amber', 'yellow', 'yellow'].map(level => ({
      level, title: `${level} wind warning`, description: 'Full regional warning description',
      url: 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings',
    })) },
  fetchedAt: '2026-10-25T14:00:00Z',
});
async function widget({ granted = true, data = fixture() } = {}) {
  const events = {}, docEvents = {};
  let requests = 0, fail = false;
  const root = { innerHTML: '', isConnected: true, setAttribute() {}, querySelector() { return null; },
    addEventListener(name, fn) { events[name] = fn; }, contains(node) { return node?.inside === true; } };
  const document = { baseURI: 'https://example.invalid/', activeElement: null, visibilityState: 'visible',
    createElement: () => root, addEventListener(name, fn) { docEvents[name] = fn; } };
  const window = { addEventListener() {} };
  vm.runInNewContext(script, {
    window, document, console, URL, AbortController, setTimeout, clearTimeout, setInterval() {},
    navigator: { onLine: true, permissions: { query: async () => ({ state: granted ? 'granted' : 'prompt' }) },
      geolocation: { getCurrentPosition(ok) { ok({ coords: { latitude: 55.86, longitude: -4.25 } }); } } },
    fetch: async () => { requests++; if (fail) throw new Error('Network unavailable'); return { ok: true, json: async () => data }; },
  });
  const mount = () => window.LocalWeather.mount({ appendChild(el) { el.parentNode = this; } });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  mount(); await settle();
  return {
    root, docEvents, mount, settle, requests: () => requests, fail: () => { fail = true; },
    click(action) { const target = { inside: true, tagName: 'BUTTON', getAttribute: () => action }; events.click({ target: { closest: () => target } }); },
  };
}
test('weather is a compact collapsed widget by default, including when warnings exist', async () => {
  const w = await widget();
  assert.match(w.root.innerHTML, /lw-summary-city[^>]*>Glasgow/);
  assert.match(w.root.innerHTML, /lw-summary-temp">9°C/);
  assert.match(w.root.innerHTML, /lw-badge-amber">3 alerts/);
  assert.match(w.root.innerHTML, /id="lw-details"[^>]* hidden/);
  assert.match(w.root.innerHTML, /aria-expanded="false" aria-controls="lw-details"/);
});
test('details open on demand, preserve full warnings and close without fetching again', async () => {
  const w = await widget();
  w.click('details');
  assert.doesNotMatch(w.root.innerHTML, /id="lw-details"[^>]* hidden/);
  assert.match(w.root.innerHTML, /Full regional warning description/);
  assert.match(w.root.innerHTML, /Change city/);
  w.click('close');
  assert.match(w.root.innerHTML, /id="lw-details"[^>]* hidden/);
  w.mount(); await w.settle();
  assert.equal(w.requests(), 1);
});
test('Escape and outside click dismiss weather details', async () => {
  const w = await widget();
  w.click('details'); w.docEvents.keydown({ key: 'Escape' });
  assert.match(w.root.innerHTML, /id="lw-details"[^>]* hidden/);
  w.click('details'); w.docEvents.click({ target: {} });
  assert.match(w.root.innerHTML, /id="lw-details"[^>]* hidden/);
});
test('initial setup stays compact and does not prompt for location', async () => {
  const w = await widget({ granted: false });
  assert.match(w.root.innerHTML, /Choose city/);
  assert.match(w.root.innerHTML, /id="lw-details"[^>]* hidden/);
  assert.equal(w.requests(), 0);
  w.click('details'); w.click('locate'); await w.settle();
  assert.equal(w.requests(), 1);
});
test('unknown and stale checks never display a reassuring no-alert badge', async () => {
  const data = fixture();
  data.warnings.status = 'unavailable'; data.warnings.items = [];
  const unknown = await widget({ data });
  assert.match(unknown.root.innerHTML, /lw-badge-unknown">Alerts unchecked/);
  const stale = await widget();
  stale.fail(); stale.click('refresh'); await stale.settle();
  assert.match(stale.root.innerHTML, /lw-badge-unknown">Alerts may be outdated/);
});
