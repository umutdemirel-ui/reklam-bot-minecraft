import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'ollama';
process.env.OLLAMA_URL = 'http://127.0.0.1:1';
delete process.env.AI_API_KEY;
delete process.env.SEARXNG_URL;
const { default: app } = await import('../server/app.mjs');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
const post = (url, data, extra = {}) =>
  fetch(base + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(data),
  });
test('health endpoint yalnızca yetenek metadatası döndürür', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.desktop, false);
  assert.equal(d.research, false);
  assert.equal('key' in d, false);
  assert.equal('base' in d, false);
});
test('boş ve uzun komutlar sağlayıcıya gönderilmeden reddedilir', async () => {
  for (const text of ['', ' ', 'x'.repeat(4001), null]) {
    const r = await post('/api/chat', { text });
    assert.equal(r.status, 400);
  }
});
test('geçersiz model ve araştırma girdileri reddedilir', async () => {
  assert.equal((await post('/api/chat', { text: 'test', model: {} })).status, 400);
  assert.equal((await post('/api/research', { topic: 'ab' })).status, 400);
  assert.equal((await post('/api/research', { topic: 'abc', model: {} })).status, 400);
});
test('başka origin üzerinden istek engellenir', async () => {
  assert.equal(
    (await post('/api/chat', { text: 'test' }, { Origin: 'https://other.example' })).status,
    403,
  );
  assert.equal((await post('/api/test', {}, { Origin: 'null' })).status, 403);
});
test('aynı origin üzerinden istek kabul edilir ve model yoksa dürüst hata verir', async () => {
  const r = await post('/api/chat', { text: 'test' }, { Origin: base });
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /Model bağlantısı kurulamadı/);
});
test('servis bağlantı testi kurulum yoksa başarısızdır', async () => {
  const r = await post('/api/test', {});
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /ulaşılamadı/);
});
test('web bağlantısı yoksa akış hatası döner, rapor veya kaynak uydurulmaz', async () => {
  const r = await post('/api/research', { topic: 'Yerel model araştırması' });
  assert.match(r.headers.get('content-type'), /application\/x-ndjson/);
  const events = (await r.text()).trim().split('\n').map(JSON.parse);
  assert.ok(events.find((e) => e.error?.includes('İnternette arama yapılmadı')));
  assert.equal(
    events.some((e) => e.report || e.sources),
    false,
  );
});
test('aşırı büyük gövde ve JSON dışı istekler engellenir', async () => {
  assert.equal((await post('/api/chat', { text: 'x'.repeat(30000) })).status, 413);
  assert.equal((await fetch(base + '/api/chat', { method: 'POST', body: 'test' })).status, 415);
});
test('bilinmeyen API yolu JSON 404 döndürür', async () => {
  const r = await fetch(base + '/api/not-found');
  assert.equal(r.status, 404);
  assert.ok((await r.json()).error);
});
