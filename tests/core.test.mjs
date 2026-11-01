import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeCommand, safeHttpUrl } from '../src/lib/commands.mjs';
import { sanitizePreferences, sanitizeRecords } from '../src/lib/persistence.mjs';
import { getConfig, complete, searchWeb, validateCitations } from '../server/providers.mjs';
test('komut yönlendirme: Türkçe, sınırlar ve araç ayrımı', () => {
  assert.equal(routeCommand('  ').type, 'empty');
  assert.equal(routeCommand('x'.repeat(4001)).type, 'invalid');
  assert.equal(routeCommand('GEÇMİŞİ GÖSTER').type, 'history');
  assert.equal(routeCommand('ayarları aç').type, 'settings');
  assert.deepEqual(routeCommand('İnternette ara Python kaynakları'), {
    type: 'search',
    text: 'Python kaynakları',
  });
  assert.deepEqual(routeCommand('Derin araştırma: Yerel modeller'), {
    type: 'research',
    text: 'Yerel modeller',
  });
  assert.deepEqual(routeCommand('Derin araştırma'), { type: 'research', text: '' });
  assert.deepEqual(routeCommand('internette ara'), { type: 'search', text: '' });
  assert.equal(routeCommand('Dosya bul').type, 'device');
  assert.equal(routeCommand("Chrome'u aç").type, 'device');
  assert.equal(routeCommand('Bana bir şiir yaz').type, 'chat');
});
test('kaynak bağlantıları yalnızca HTTP(S) olabilir', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('file:///etc/passwd'), null);
  assert.equal(safeHttpUrl('geçersiz'), null);
  assert.equal(safeHttpUrl('https://example.com/a'), 'https://example.com/a');
});
test('bozuk yerel tercihler güvenli varsayılanlara döner', () => {
  const defaults = { theme: 'dark', accent: '#ff3b4f', fontSize: 14, speak: false };
  assert.deepEqual(sanitizePreferences(null, defaults), defaults);
  const p = sanitizePreferences(
    { theme: 'invalid', accent: 'red;display:none', fontSize: 100, speak: true },
    defaults,
  );
  assert.deepEqual(p, { ...defaults, speak: true });
  assert.deepEqual(sanitizeRecords({ invalid: true }, 'history'), []);
  assert.deepEqual(sanitizeRecords([{ id: '1', date: 'bad' }], 'history'), []);
});
test('sağlayıcı varsayılanı ücretsiz hizmet varsaymadan yerel Ollama', () => {
  const c = getConfig({});
  assert.equal(c.provider, 'ollama');
  assert.equal(c.model, 'llama3.2:3b');
  assert.equal(c.key, '');
  assert.equal(c.search, '');
});
test('arama bağlantısı yokken sahte kaynak üretilmez', async () => {
  await assert.rejects(searchWeb('test', undefined, getConfig({})), /İnternette arama yapılmadı/);
});
test('API anahtarı olmadan bulut modeline istek gönderilmez', async () => {
  await assert.rejects(
    complete([], '', undefined, getConfig({ AI_PROVIDER: 'openai' })),
    /AI_API_KEY/,
  );
});
test('Ollama sağlayıcısı gerçek istek şemasıyla çağrılır', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(JSON.parse(options.body).stream, false);
    return Response.json({ message: { content: 'Merhaba' } });
  });
  assert.equal(
    await complete([{ role: 'user', content: 'test' }], '', undefined, getConfig({})),
    'Merhaba',
  );
});
test('uyumlu API anahtarı yalnızca sunucu isteğinde taşınır', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.com/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key-not-real');
    return Response.json({ choices: [{ message: { content: 'Yanıt' } }] });
  });
  assert.equal(
    await complete(
      [],
      '',
      undefined,
      getConfig({
        AI_PROVIDER: 'openai',
        AI_BASE_URL: 'https://example.com/v1',
        AI_API_KEY: 'test-key-not-real',
      }),
    ),
    'Yanıt',
  );
});
test('boş model yanıtı anlaşılır hata verir', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({}));
  await assert.rejects(complete([], '', undefined, getConfig({})), /boş yanıt/);
});
test('sağlayıcı hatası gizli yanıt içeriğini dışarı sızdırmaz', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('secret upstream content', { status: 401 }),
  );
  await assert.rejects(
    complete([], '', undefined, getConfig({})),
    (e) => e.message.includes('401') && !e.message.includes('secret'),
  );
});
test('SearXNG gerçek kaynakları sınırlar ve güvensiz URL filtreler', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url.searchParams.get('format'), 'json');
    assert.equal(url.searchParams.get('q'), 'yerel AI');
    return Response.json({
      results: [
        { title: 'Kaynak', url: 'https://example.com', content: 'Özet' },
        { title: 'Kötü', url: 'javascript:alert(1)' },
      ],
    });
  });
  const sources = await searchWeb('yerel AI', undefined, {
    ...getConfig({}),
    search: 'http://127.0.0.1:8080',
  });
  assert.equal(sources.length, 1);
  assert.equal(sources[0].title, 'Kaynak');
});

test('kaynak numaraları olmayan veya sınırı aşan rapor tamamlanmış sayılmaz', () => {
  assert.throws(() => validateCitations('Kaynaksız metin', 2), /geçerli kaynak/);
  assert.throws(() => validateCitations('İddia [3]', 2), /geçerli kaynak/);
  assert.throws(() => validateCitations('İddia [0]', 2), /geçerli kaynak/);
  assert.equal(validateCitations('İddia [1] ve [2]', 2), 'İddia [1] ve [2]');
});

test('yerel Ollama isteğine bulut API anahtarı eklenmez', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ message: { content: 'Yanıt' } });
  });
  await complete([], '', undefined, { ...getConfig({}), key: 'fake-cloud-key' });
});
