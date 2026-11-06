const test = require('node:test');
const assert = require('node:assert/strict');
const { createRetentionHandler } = require('../server/image-retention.cjs');
const env = { CRON_SECRET: 'x'.repeat(40), UKOW_SUPABASE_URL: 'https://example.supabase.co', UKOW_SUPABASE_SERVICE_ROLE_KEY: 'test-only-not-real' };
const job = { token: 'test-token', bucket: 'booking-evidence', path: '11111111-1111-1111-1111-111111111111/photo.jpg' };
async function run(responses, request = {}) {
  const calls = [];
  const handler = createRetentionHandler({ env, fetchImpl: async (url, args) => {
    calls.push({ url, ...args, data: JSON.parse(args.body) });
    const response = responses.shift();
    if (!response) throw Error('Unexpected network request');
    return { ok: response.ok !== false, status: 200, json: async () => response.body };
  } });
  const result = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = JSON.parse(body); } };
  await handler({ method: 'GET', headers: { authorization: `Bearer ${env.CRON_SECRET}` }, ...request }, result);
  return { result, calls };
}
test('reject missing or incorrect cron credentials without network requests', async () => {
  const { result, calls } = await run([], { headers: {} });
  assert.equal(result.statusCode, 401); assert.equal(calls.length, 0);
});
test('disabled setup performs no Storage deletion', async () => {
  const { result, calls } = await run([{ body: { disabled: true } }]);
  assert.equal(result.body.disabled, true); assert.equal(calls.length, 1);
});
test('delete Storage bytes first, then acknowledge metadata cleanup', async () => {
  const { result, calls } = await run([{ body: job }, { body: [] }, { body: { ok: true } }, { body: {} }]);
  assert.equal(result.body.deleted, 1);
  assert.match(calls[1].url, /storage\/v1\/object\/booking-evidence$/);
  assert.equal(calls[1].method, 'DELETE');
  assert.deepEqual(calls[1].data, { prefixes: [job.path] });
  assert.equal(calls[2].data.p_action, 'complete');
});
test('failed Storage deletion is never acknowledged as deleted', async () => {
  const { result, calls } = await run([{ body: job }, { ok: false }, { body: { ok: true } }, { body: {} }]);
  assert.equal(result.statusCode, 502); assert.equal(result.body.failed, 1);
  assert.equal(calls[2].data.p_action, 'failed');
  assert(!calls.some(c => c.data.p_action === 'complete'));
});
test('reject unexpected buckets and traversal paths', async () => {
  for (const bad of [{ ...job, bucket: 'payroll' }, { ...job, path: '../private.png' }]) {
    const { result, calls } = await run([{ body: bad }, { body: { ok: true } }, { body: {} }]);
    assert.equal(result.body.failed, 1);
    assert(!calls.some(c => c.method === 'DELETE'));
  }
});
