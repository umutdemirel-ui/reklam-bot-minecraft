import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometheus-security-'));
process.env.NODE_ENV = 'test';
process.env.PROMETHEUS_DATA_DIR = dir;
process.env.PROMETHEUS_PASSWORD = 'test-only-strong-password-not-real';
delete process.env.PROMETHEUS_VAULT_KEY;
const { default: app } = await import('../server/app.mjs');
const { readVault } = await import('../server/storage.mjs');
let server, base, token, cookie;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(dir, { recursive: true, force: true });
});
const post = (url, data, auth = token) =>
  fetch(base + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify(data),
  });
test('korumalı servis giriş olmadan model/geçmiş/yapılandırma vermez', async () => {
  for (const route of ['/api/health', '/api/jobs', '/api/config', '/api/workspace'])
    assert.equal((await fetch(base + route)).status, 401);
  assert.equal((await fetch(base + '/api/session')).status, 200);
});
test('yanlış parola reddedilir, native token ve HttpOnly çerez doğru parolayla verilir', async () => {
  assert.equal((await post('/api/session/login', { password: 'wrong' }, null)).status, 401);
  const r = await post(
    '/api/session/login',
    { password: process.env.PROMETHEUS_PASSWORD, native: true, deviceName: 'Test cihazı' },
    null,
  );
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  token = (await r.json()).token;
  assert.ok(token.length >= 40);
  assert.equal(
    (await fetch(base + '/api/health', { headers: { Cookie: cookie.split(';')[0] } })).status,
    200,
  );
});
test('API anahtarı şifreli diske yazılır ve hiçbir okuma uç noktasında geri dönmez', async () => {
  const r = await post('/api/config', {
    provider: 'openai',
    model: 'test',
    base: 'https://example.com/v1',
    search: '',
    key: 'fake-test-secret-never-real',
  });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.hasKey, true);
  assert.equal('key' in d, false);
  const disk = await fs.readFile(path.join(dir, 'vault.json'), 'utf8');
  assert.equal(disk.includes('fake-test-secret'), false);
  assert.equal(readVault().key, 'fake-test-secret-never-real');
  assert.equal((await fs.stat(path.join(dir, 'vault.key'))).mode & 0o777, 0o600);
});
test('kaydedilmiş anahtar boş alanla korunur ve açık silme talimatıyla kaldırılır', async () => {
  await post('/api/config', {
    provider: 'openai',
    model: 'test',
    base: 'https://example.com/v1',
    search: '',
    key: '',
  });
  assert.equal(readVault().key, 'fake-test-secret-never-real');
  await post('/api/config', {
    provider: 'ollama',
    model: 'test',
    base: 'http://127.0.0.1:11434',
    search: '',
    clearKey: true,
  });
  assert.equal(readVault().key, '');
});
test('workspace sürüm çakışması sessiz veri kaybını engeller ve açık silme çalışır', async () => {
  let r = await post('/api/workspace', {
    revision: 0,
    preferences: { theme: 'light' },
    history: [],
  });
  assert.equal(r.status, 200);
  r = await post('/api/workspace', { revision: 0, preferences: { theme: 'dark' }, history: [] });
  assert.equal(r.status, 409);
  await post('/api/workspace/delete', {});
  const d = await (
    await fetch(base + '/api/workspace', { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  assert.equal(d.revision, 2);
  assert.deepEqual(d.preferences, {});
});
test('cihaz oturumu listelenir ve iptal edilince token erişimini kaybeder', async () => {
  const d = await (
    await fetch(base + '/api/devices', { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  assert.equal(d[0].name, 'Test cihazı');
  assert.equal(d[0].current, true);
  await post(`/api/devices/${d[0].id}/revoke`, {});
  assert.equal(
    (await fetch(base + '/api/health', { headers: { Authorization: `Bearer ${token}` } })).status,
    401,
  );
});
