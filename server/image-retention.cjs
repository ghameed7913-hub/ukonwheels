const { timingSafeEqual } = require('node:crypto');

function authorised(header, secret) {
  if (!secret || secret.length < 32 || typeof header !== 'string') return false;
  const actual = Buffer.from(header), expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function createRetentionHandler({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    const respond = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return respond(405, { error: 'Method not allowed' }); }
    if (!authorised(req.headers.authorization, env.CRON_SECRET)) return respond(401, { error: 'Unauthorised' });
    const endpoint = env.UKOW_SUPABASE_URL;
    const key = env.UKOW_SUPABASE_SERVICE_ROLE_KEY;
    if (!endpoint || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(endpoint) || !key)
      return respond(503, { error: 'Image cleanup is not configured' });
    const root = endpoint.replace(/\/$/, '');
    async function call(path, body, method = 'POST') {
      const response = await fetchImpl(root + path, {
        method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw Error('Retention service request failed');
      return response.status === 204 ? null : response.json();
    }
    const rpc = (action, data = {}) => call('/rest/v1/rpc/image_retention_worker', { p_action: action, p_data: data });
    let deleted = 0, failed = 0;
    const started = now();
    try {
      // Bounded work. Daily retries continue larger backlogs without unbounded execution.
      for (let n = 0; n < 200 && now() - started < 45000; n++) {
        const job = await rpc('claim');
        if (job.disabled) return respond(200, { disabled: true, deleted });
        if (job.skipped) continue;
        if (!job.token) break;
        try {
          if (!['booking-evidence', 'hr-screening', 'driver-portraits', 'driver-company-ids'].includes(job.bucket) ||
              typeof job.path !== 'string' || !/^[a-f0-9-]{36}\/[a-zA-Z0-9._-]+$/.test(job.path) ||
              job.path.split('/').some(p => p === '..' || p === '.')) throw Error('Invalid image claim');
          await call(`/storage/v1/object/${job.bucket}`, { prefixes: [job.path] }, 'DELETE');
          await rpc('complete', { token: job.token });
          deleted++;
        } catch {
          await rpc('failed', { token: job.token });
          failed++;
        }
      }
      return respond(failed ? 502 : 200, { deleted, failed });
    } catch {
      return respond(502, { error: 'Image cleanup could not be confirmed', deleted });
    }
  };
}
module.exports = { createRetentionHandler, authorised };
