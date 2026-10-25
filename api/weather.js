const { createWeatherService } = require('../server/local-weather.cjs');
const service = createWeatherService();

module.exports = async function weather(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'GET') {
    res.statusCode = 405; res.setHeader('Allow', 'GET, OPTIONS');
    return res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }
  try {
    const params = new URL(req.url, 'https://portal.invalid').searchParams;
    const data = params.has('q')
      ? await service.search(params.get('q'))
      : await service.get(params.get('lat'), params.get('lon'));
    // Partial failures should be retried, not cached as if they were successful checks.
    const partial = data.weatherError || ['unavailable', 'unmatched'].includes(data.warnings?.status);
    res.setHeader('Cache-Control', params.has('q') ? 'public, max-age=3600' : partial ? 'no-store' : 'public, max-age=60, s-maxage=300');
    res.statusCode = 200; res.end(JSON.stringify(data));
  } catch (error) {
    res.statusCode = error.status || 502;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: error.status ? error.message : 'Local weather is temporarily unavailable. Please try again.' }));
  }
};
