const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWeatherService, parseWarnings, coordinate } = require('../../../server/local-weather.cjs');
const TIME = Date.parse('2026-10-25T14:00:00Z');
const place = { name: 'City of Edinburgh', areas: ['City of Edinburgh', 'Scotland'], countryCode: 'gb' };
const item = (level, areas, link = 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings?id=1') => `
<item><title>${level} warning of wind affecting Scotland</title><link>${link}</link>
<description>${level} warning: ${areas} valid from 1400 Sun 25 Oct to 2100 Sun 25 Oct</description></item>`;
const rss = (...items) => `<rss version="2.0"><channel>${items.join('')}</channel></rss>`;
const response = (data, ok = true) => ({ ok, json: async () => data, text: async () => data });
const forecast = {
  properties: { meta: { updated_at: new Date(TIME).toISOString() },
    timeseries: [{ time: new Date(TIME).toISOString(), data: {
      instant: { details: { air_temperature: 9.5, wind_speed: 10 } },
      next_1_hours: { summary: { symbol_code: 'partlycloudy_day' } },
    } }] },
};
function mock({ country = 'gb', failWeather = false, failWarnings = false, failMap = false, emptySearch = false } = {}) {
  const calls = [];
  return { calls, fetchFn: async url => {
    calls.push(url);
    if (url.includes('nominatim')) {
      if (failMap) return response({}, false);
      const result = { place_id: 1, lat: '55.9532', lon: '-3.1883', address: { city: 'City of Edinburgh', country: 'United Kingdom', country_code: country } };
      return response(url.includes('/search') ? emptySearch ? [] : [result] : result);
    }
    if (url.includes('api.met.no')) return response(forecast, !failWeather);
    if (url.includes('WarningsRSS')) return response(rss(item('Amber', 'Edinburgh, Midlothian Council')), !failWarnings);
    throw new Error('Unexpected URL ' + url);
  } };
}
test('coordinates are rounded before provider requests and invalid coordinates fail explicitly', () => {
  assert.equal(coordinate('55.9532', 90), 55.95);
  for (const value of ['', 'NaN', 'Infinity', '91', null]) assert.throws(() => coordinate(value, 90), /location|city/i);
});
test('warnings match affected areas exactly, normalise council names and prioritise severity', () => {
  const data = parseWarnings(rss(item('Yellow', 'Edinburgh'), item('Red', 'Edinburgh'),
    item('Amber', 'Midlothian Council'), item('Yellow', 'North Yorkshire'), item('Amber', 'Edinburgh', 'https://evil.invalid/')), place, 'now');
  assert.deepEqual(data.items.map(x => x.level), ['red', 'yellow']);
  assert.equal(parseWarnings(rss(item('Yellow', 'North Yorkshire')), { name: 'York', areas: ['York'] }, 'now').items.length, 0);
  assert.equal(parseWarnings(rss(item('Amber', 'West Midlands Conurbation')), { name: 'Birmingham', areas: ['Birmingham'] }, 'now').items.length, 1);
});
test('warnings are plain text; missing area and malformed feed cannot claim no warnings', () => {
  assert.equal(parseWarnings(rss(), { name: 'Unknown', areas: [] }, 'now').status, 'unmatched');
  assert.throws(() => parseWarnings('<html>error</html>', place, 'now'), /Invalid/);
  const data = parseWarnings(rss(item('Yellow', 'Edinburgh &amp; elsewhere, Edinburgh')), place, 'now');
  assert.match(data.items[0].description, /Edinburgh & elsewhere/);
});
test('successful weather, live warnings, cache and concurrent request coalescing', async () => {
  const m = mock(), s = createWeatherService({ ...m, now: () => TIME, geocodeInterval: 0 });
  const [a, b] = await Promise.all([s.get('55.9532', '-3.1883'), s.get('55.95', '-3.19')]);
  assert.equal(a, b);
  assert.equal(a.place.name, 'City of Edinburgh');
  assert.equal(a.weather.windKph, 36);
  assert.equal(a.weather.temperatureC, 9.5);
  assert.equal(a.warnings.items[0].level, 'amber');
  assert.equal(a.warnings.status, 'ok');
  assert.equal(m.calls.length, 3);
  assert(m.calls.filter(u => !u.includes('WarningsRSS')).every(u => u.includes('55.95') && u.includes('-3.19')));
  await s.get('55.95', '-3.19');
  assert.equal(m.calls.length, 3);
});
test('provider failures are distinguished from no warnings and weather can succeed independently', async () => {
  for (const options of [{ failWeather: true }, { failWarnings: true }, { failMap: true }]) {
    const m = mock(options), s = createWeatherService({ ...m, now: () => TIME, geocodeInterval: 0 });
    const data = await s.get('55.95', '-3.19');
    if (options.failWeather) { assert.equal(data.weather, null); assert(data.weatherError); assert.equal(data.warnings.status, 'ok'); }
    if (options.failWarnings) { assert(data.weather); assert.equal(data.warnings.status, 'unavailable'); }
    if (options.failMap) { assert(data.weather); assert.equal(data.warnings.status, 'unmatched'); }
  }
});
test('outside UK, warnings explicitly unsupported; no UK feed request', async () => {
  const m = mock({ country: 'fr' }), s = createWeatherService({ ...m, now: () => TIME, geocodeInterval: 0 });
  const data = await s.get('48.85', '2.35');
  assert.equal(data.warnings.status, 'unsupported');
  assert(!m.calls.some(url => url.includes('WarningsRSS')));
});
test('city search is encoded, user-initiated, cached, bounded and handles no results', async () => {
  const m = mock(), s = createWeatherService({ ...m, now: () => TIME, geocodeInterval: 0 });
  const a = await s.search('Edinburgh & area');
  assert.equal(a.places[0].latitude, 55.95);
  assert(m.calls[0].includes('Edinburgh%20%26%20area'));
  await s.search('Edinburgh & area');
  assert.equal(m.calls.length, 1);
  await assert.rejects(s.search('x'), /city name/);
  await assert.rejects(s.search('a'.repeat(101)), /city name/);
  const empty = createWeatherService({ ...mock({ emptySearch: true }), geocodeInterval: 0 });
  assert.deepEqual(await empty.search('Atlantis'), { places: [] });
});
test('partial failures are retried after a short delay; expired forecast is unavailable', async () => {
  let clock = TIME;
  const m = mock({ failWeather: true }), s = createWeatherService({ ...m, now: () => clock, geocodeInterval: 0 });
  await s.get('55.95', '-3.19');
  const initial = m.calls.length;
  clock += 31000;
  await s.get('55.95', '-3.19');
  assert(m.calls.length > initial);
  const old = createWeatherService({ ...mock(), now: () => TIME + 86400000, geocodeInterval: 0 });
  assert.equal((await old.get('55.95', '-3.19')).weather, null);
});
test('Vercel SPA rewrite does not intercept the weather function', () => {
  const config = require('../../../vercel.json');
  assert.deepEqual(config.rewrites[0], { source: '/weather-api', destination: '/api/weather' });
  const source = config.rewrites.find(x => x.destination === '/index.html').source;
  const matcher = new RegExp(`^${source}$`);
  assert.equal(matcher.test('/api/weather'), false);
  assert.equal(matcher.test('/'), true);
  assert.equal(matcher.test('/driver'), true);
});
