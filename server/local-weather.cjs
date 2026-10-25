// Public, read-only weather. No account data, API keys or persistent location records.
const MET = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const OSM = 'https://nominatim.openstreetmap.org';
const WARNINGS = 'https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/UK';
const AGENT = 'UKOnWheels-LocalWeather/1.0 (https://portal.ukonwheels.org)';

class WeatherError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
function coordinate(value, limit) {
  if (typeof value !== 'string' || !value.trim()) throw new WeatherError('Choose a city or allow location access.', 400);
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > limit) throw new WeatherError('Invalid location.', 400);
  return Math.round(number * 100) / 100;
}
function plain(text = '') {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, code) => {
      const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (entities[code]) return entities[code];
      const value = code.toLowerCase().startsWith('#x') ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
    }).replace(/<[^>]*>/g, '').trim();
}
function areaKey(text) {
  return String(text || '').toLowerCase().replace(/^city of |^county of /g, '')
    .replace(/ council$/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
const ALIASES = {
  birmingham: 'westmidlandsconurbation', coventry: 'westmidlandsconurbation',
  dudley: 'westmidlandsconurbation', sandwell: 'westmidlandsconurbation',
  solihull: 'westmidlandsconurbation', walsall: 'westmidlandsconurbation',
  wolverhampton: 'westmidlandsconurbation', london: 'greaterlondon',
  bristol: 'bristol', cityofbristol: 'bristol',
};
function placeOf(result, latitude, longitude) {
  const a = result.address || {};
  const name = a.city || a.town || a.village || a.municipality || result.name || 'Current location';
  return {
    id: String(result.place_id || `${latitude},${longitude}`),
    name, label: [name, a.county || a.state_district, a.country].filter(Boolean).filter((x, i, xs) => xs.indexOf(x) === i).join(', '),
    latitude, longitude, countryCode: a.country_code || '',
    areas: [...new Set([a.county, a.state_district, a.city, a.town, a.borough, a.municipality, a.state].filter(Boolean))],
  };
}
function parseWarnings(xml, place, checkedAt) {
  if (!/<rss[\s>]/i.test(xml) || !/<channel>/i.test(xml)) throw new WeatherError('Invalid warnings feed.');
  const items = [];
  const keys = new Set(place.areas.flatMap(area => {
    const key = areaKey(area);
    return [key, ALIASES[key]].filter(Boolean);
  }));
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const tag = name => plain(match[1].match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1] || '');
    const title = tag('title'), description = tag('description'), url = tag('link');
    let link;
    try { link = new URL(url); } catch { continue; }
    if (link.protocol !== 'https:' || !['www.metoffice.gov.uk', 'weather.metoffice.gov.uk'].includes(link.hostname)) continue;
    // The official RSS feed lists affected counties/council areas, not city polygons.
    const affected = description.split(':').slice(1).join(':').split(/ valid from /i)[0].split(',').map(areaKey);
    if (!affected.some(area => keys.has(area))) continue;
    const level = title.match(/^(Red|Amber|Yellow) warning/i)?.[1]?.toLowerCase();
    if (!level) continue;
    if (!items.some(item => item.url === url && item.description === description)) items.push({ title, description, url, level });
  }
  const rank = { red: 0, amber: 1, yellow: 2 };
  items.sort((a, b) => rank[a.level] - rank[b.level]);
  const area = [place.areas[0], place.name].filter(Boolean).filter((x, i, xs) => xs.indexOf(x) === i).join(' / ');
  return {
    status: keys.size ? 'ok' : 'unmatched', area, items, checkedAt,
    message: keys.size
      ? 'Met Office regional warnings matched to the listed county/council areas. They may not cover your exact city. Includes upcoming warnings; open each warning for its validity and map.'
      : 'The surrounding county/council area could not be identified. Check the Met Office warning map.',
  };
}

function createWeatherService({ fetchFn = fetch, now = Date.now, geocodeInterval = 1100 } = {}) {
  const cache = new Map(), pending = new Map();
  let geocodeQueue = Promise.resolve(), waiting = 0, lastGeocode = 0;
  async function cached(key, ttl, load) {
    const saved = cache.get(key);
    if (saved && saved.until > now()) return saved.value;
    if (pending.has(key)) return pending.get(key);
    const promise = load().then(value => {
      if (cache.size >= 256) cache.delete(cache.keys().next().value);
      cache.set(key, { value, until: now() + (typeof ttl === 'function' ? ttl(value) : ttl) });
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  }
  async function upstream(url, text = false, withExpiry = false) {
    const response = await fetchFn(url, {
      headers: { 'User-Agent': AGENT, Accept: text ? 'application/rss+xml, application/xml' : 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new WeatherError('The weather or map provider is temporarily unavailable.');
    if (text) return response.text();
    const data = await response.json();
    if (!withExpiry) return data;
    const expiry = Date.parse(response.headers?.get('expires'));
    return { data, ttl: Number.isFinite(expiry) ? Math.max(1000, expiry - now()) : 600000 };
  }
  function geocode(url) {
    if (waiting >= 4) return Promise.reject(new WeatherError('Location service is busy. Please try again shortly.', 429));
    waiting++;
    // Nominatim policy: user-initiated search only, caching and at most one request/sec per running instance.
    const job = geocodeQueue.catch(() => {}).then(async () => {
      const delay = lastGeocode + geocodeInterval - now();
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      lastGeocode = now();
      return upstream(url);
    }).finally(() => waiting--);
    geocodeQueue = job;
    return job;
  }
  async function search(query) {
    const q = String(query || '').trim();
    if (q.length < 2 || q.length > 100) throw new WeatherError('Enter a city name between 2 and 100 characters.', 400);
    return cached(`search:${q.toLowerCase()}`, 86400000, async () => {
      const results = await geocode(`${OSM}/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`);
      if (!Array.isArray(results)) throw new WeatherError('City search is temporarily unavailable.');
      return { places: results.map(r => placeOf(r, coordinate(String(r.lat), 90), coordinate(String(r.lon), 180))) };
    });
  }
  async function get(latValue, lonValue) {
    const latitude = coordinate(latValue, 90), longitude = coordinate(lonValue, 180);
    return cached(`weather:${latitude},${longitude}`,
      value => value.weatherError || ['unavailable', 'unmatched'].includes(value.warnings.status) ? 30000 : 600000,
      async () => {
      const fetchedAt = new Date(now()).toISOString();
      let place;
      try {
        place = await cached(`place:${latitude},${longitude}`, 86400000, async () => {
          const result = await geocode(`${OSM}/reverse?format=jsonv2&addressdetails=1&zoom=10&lat=${latitude}&lon=${longitude}`);
          if (result.error) throw new WeatherError('City could not be identified.');
          return placeOf(result, latitude, longitude);
        });
      } catch {
        place = { name: 'Current location', label: `${latitude}, ${longitude}`, latitude, longitude, countryCode: '', areas: [] };
      }
      let weather = null, weatherError = null;
      let warnings = { status: 'unmatched', area: place.name, items: [], checkedAt: null, message: 'City could not be identified. Search for your city or check the Met Office map.' };
      await Promise.all([
        (async () => {
          try {
            const { data } = await cached(`forecast:${latitude},${longitude}`, value => value.ttl,
              () => upstream(`${MET}?lat=${latitude}&lon=${longitude}`, false, true));
            const series = data.properties?.timeseries;
            if (!Array.isArray(series)) throw new WeatherError('Weather data unavailable.');
            const point = series.find(p => Date.parse(p.time) >= now() - 1800000);
            const details = point?.data?.instant?.details;
            if (!point || Date.parse(point.time) > now() + 7200000 || !Number.isFinite(details?.air_temperature) || !Number.isFinite(details?.wind_speed)) throw new WeatherError('Fresh weather data unavailable.');
            const condition = point.data.next_1_hours?.summary?.symbol_code || point.data.next_6_hours?.summary?.symbol_code;
            weather = {
              temperatureC: details.air_temperature, windKph: Math.round(details.wind_speed * 3.6),
              condition: condition ? condition.replace(/_(day|night|polartwilight)$/, '')
                .replace('clearsky', 'clear sky').replace('partlycloudy', 'partly cloudy')
                .replace(/^(light|heavy)(?=[a-z])/, '$1 ').replace(/showers/g, ' showers')
                .replace(/andthunder/g, ' and thunder').replaceAll('_', ' ') : 'Conditions unavailable',
              forecastAt: point.time, updatedAt: data.properties.meta?.updated_at || fetchedAt,
            };
          } catch { weatherError = 'Weather is temporarily unavailable. Please refresh shortly.'; }
        })(),
        (async () => {
          if (!place.countryCode) return;
          if (place.countryCode !== 'gb') {
            warnings = { ...warnings, status: 'unsupported', message: 'Official warnings are currently available for UK locations only. Check your local weather authority.' };
            return;
          }
          try {
            const feed = await cached('met-office-rss', 300000, async () => ({
              xml: await upstream(WARNINGS, true), checkedAt: new Date(now()).toISOString(),
            }));
            warnings = parseWarnings(feed.xml, place, feed.checkedAt);
          } catch {
            warnings = { ...warnings, status: 'unavailable', message: 'Met Office warnings could not be checked. Do not assume there are no warnings. Open the warning map.' };
          }
        })(),
      ]);
      return { place, weather, weatherError, warnings, fetchedAt };
    });
  }
  return { search, get };
}
module.exports = { createWeatherService, parseWarnings, areaKey, coordinate, WeatherError };
