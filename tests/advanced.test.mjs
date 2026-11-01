import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { publicAddress, resolvePublic } from '../server/safe-web.mjs';
import { runResearch, buildReport, parseObject } from '../server/research.mjs';
import { JobQueue } from '../server/jobs.mjs';
import { DesktopTools, findFiles, inside } from '../desktop/tools.mjs';

test('SSRF: özel, loopback, metadata, IPv6 ve alternatif sayısal adresler reddedilir', async () => {
  for (const ip of [
    '127.0.0.1',
    '10.1.2.3',
    '169.254.169.254',
    '192.168.1.1',
    '172.16.1.1',
    '::1',
    '::ffff:127.0.0.1',
    'fe80::1',
    '0.0.0.0',
    '224.0.0.1',
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
  for (const url of [
    'http://127.1',
    'http://2130706433',
    'http://[::1]',
    'file:///etc/passwd',
    'https://user:pass@example.com',
    'http://example.com:8080',
  ])
    await assert.rejects(resolvePublic(url));
});
test('SSRF: tek bir özel DNS yanıtı bile alan adının reddine yol açar', async () => {
  await assert.rejects(
    resolvePublic('https://example.com', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]),
    /erişim engellendi/,
  );
  const r = await resolvePublic('https://example.com', async () => [
    { address: '8.8.8.8', family: 4 },
  ]);
  assert.equal(r.addresses[0].address, '8.8.8.8');
});
test('rapor yalnız geçerli kaynaklara atıf yapabilir; alıntı eşleşmesi ayrı işaretlenir', () => {
  const sources = [
    { mode: 'full', text: 'Bu kaynak içinde yer alan uzun ve birebir bir alıntı.' },
    { mode: 'summary', content: 'Bir arama özeti' },
  ];
  const result = buildReport(
    'Test',
    {
      findings: [
        {
          claim: 'Bir iddia',
          sourceIds: [1],
          quote: 'kaynak içinde yer alan uzun ve birebir bir alıntı.',
        },
        {
          claim: 'İkinci iddia',
          sourceIds: [2],
          quote: 'Modelin uydurduğu ve bulunmayan bir alıntı',
        },
      ],
      conflicts: [],
      uncertainties: ['İkinci sayfa okunamadı.'],
      conclusion: 'Sınırlı sonuç.',
    },
    sources,
  );
  assert.equal(result.findings[0].quoteVerified, true);
  assert.equal(result.findings[1].quoteVerified, false);
  assert.match(result.report, /doğruluğunu kanıtlamaz/);
  assert.throws(
    () => buildReport('test', { findings: [{ claim: 'İddia', sourceIds: [9] }] }, sources),
    /geçersiz kaynak/,
  );
});
test('çok adımlı araştırma: plan, 2 arama, tekilleştirme, tam okuma, özet geri dönüşü ve rapor', async () => {
  const events = [];
  let calls = 0,
    searches = 0;
  await runResearch(
    'Yerel modeller',
    'model',
    new AbortController().signal,
    (event) => events.push(structuredClone(event)),
    {
      complete: async () =>
        ++calls === 1
          ? JSON.stringify({
              goal: 'Karşılaştır',
              questions: ['Gizlilik?', 'Donanım?'],
              queries: ['yerel model gizlilik', 'yerel model donanım'],
            })
          : JSON.stringify({
              findings: [
                {
                  claim: 'Bulgumuz',
                  sourceIds: [1],
                  quote: 'Yerel model verileri bu sunucu içinde işler.',
                },
              ],
              conflicts: [],
              uncertainties: ['İkinci kaynak tam okunmadı.'],
              conclusion: 'Sınırlı karşılaştırma',
            }),
      search: async () => {
        searches++;
        return [
          { title: 'Kaynak 1', url: 'https://example.com/1', content: 'İlk özet' },
          { title: 'Kaynak 2', url: 'https://example.com/2', content: 'İkinci özet' },
        ];
      },
      read: async (url) => {
        if (url.endsWith('/2')) throw Error('Erişim yok');
        return {
          text: 'Yerel model verileri bu sunucu içinde işler.',
          accessedAt: new Date().toISOString(),
        };
      },
    },
  );
  assert.equal(searches, 2);
  const result = events.at(-1);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].mode, 'full');
  assert.equal(result.sources[1].mode, 'summary');
  assert.equal(result.findings[0].quoteVerified, true);
  assert.match(result.report, /\[1\]/);
  assert.ok(events.some((e) => e.plan));
});
test('araştırma planı bozuksa gerçek arama yapılmış gibi gösterilmez', async () => {
  let searched = false;
  await assert.rejects(
    runResearch('test', '', undefined, () => {}, {
      complete: async () => '{"queries":[]}',
      search: async () => {
        searched = true;
        return [];
      },
    }),
    /geçerli araştırma planı/,
  );
  assert.equal(searched, false);
  assert.deepEqual(parseObject('```json\n{"a":1}\n```'), { a: 1 });
});
test('araştırma iptali sonraki adımları yürütmez', async () => {
  const controller = new AbortController();
  await assert.rejects(
    runResearch('test', '', controller.signal, () => {}, {
      complete: async () => {
        controller.abort();
        return '{"queries":["a","b"]}';
      },
      search: async () => {
        throw Error('Çağrılmamalı');
      },
    }),
    /abort/i,
  );
});
test('kalıcı kuyruk yeniden başlatılan devam eden işleri kesildi olarak korur', () => {
  let saved;
  const queue = new JobQueue({
    read: () => [
      { id: '1', status: 'running', sources: [] },
      { id: '2', status: 'done', sources: [] },
    ],
    write: (_key, data) => (saved = structuredClone(data)),
  });
  assert.equal(queue.list()[0].status, 'interrupted');
  assert.equal(saved[1].status, 'done');
});
test('kuyruk iptali, aktif iş silme koruması ve güvenli listeleme', async () => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const queue = new JobQueue({
    read: () => [],
    write: () => {},
    run: async (_topic, _model, signal, emit) => {
      await gate;
      signal.throwIfAborted();
      emit({ sources: [{ title: 'test', text: 'Sunucuda kalan tam metin' }], report: 'Rapor' });
    },
  });
  const first = queue.add('İlk iş', 'secret-model');
  assert.equal(queue.remove(first.id), false);
  assert.equal('model' in queue.list()[0], false);
  const second = queue.add('Sıradaki iş');
  assert.equal(queue.cancel(second.id), true);
  assert.equal(queue.cancel(first.id), true);
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(queue.list().find((j) => j.id === first.id).status, 'cancelled');
  assert.equal(queue.remove(first.id), true);
});
test('kuyruk FIFO sırada yalnız bir işi yürütür ve sonuçları kaydeder', async () => {
  const order = [];
  let saved;
  const queue = new JobQueue({
    read: () => [],
    write: (_key, data) => (saved = structuredClone(data)),
    run: async (topic, _model, _signal, emit) => {
      order.push(topic);
      await Promise.resolve();
      emit({ report: topic, sources: [] });
    },
  });
  queue.add('bir');
  queue.add('iki');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ['bir', 'iki']);
  assert.ok(saved.every((j) => j.status === 'done'));
});
test('gerçek dosya araması yalnız izinli köklerde ve symlink takip etmeden çalışır', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometheus-files-'));
  try {
    await fs.mkdir(path.join(dir, 'allowed'));
    await fs.mkdir(path.join(dir, 'outside'));
    await fs.writeFile(path.join(dir, 'allowed', 'rapor.txt'), 'test');
    await fs.writeFile(path.join(dir, 'outside', 'gizli-rapor.txt'), 'secret');
    await fs.symlink(path.join(dir, 'outside'), path.join(dir, 'allowed', 'escape'));
    const result = await findFiles([{ path: path.join(dir, 'allowed') }], 'rapor');
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].name, 'rapor.txt');
    assert.equal(inside(path.join(dir, 'allowed'), path.join(dir, 'outside')), false);
    const limited = await findFiles([{ path: path.join(dir, 'allowed') }], 'rapor', {
      maxEntries: 1,
    });
    assert.equal(limited.truncated, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('masaüstü uygulaması izin ve native onay olmadan başlatılmaz; iptal günlüğe girer', async () => {
  const store = new Map([
    [
      'desktop-permissions',
      { applications: [{ id: 'app1', name: 'Test', path: '/not-executed' }], roots: [] },
    ],
  ]);
  let launches = 0;
  const tools = new DesktopTools({
    read: (key, fallback) => store.get(key) || fallback,
    write: (key, value) => store.set(key, value),
    confirm: async () => false,
    launch: () => {
      launches++;
      return new EventEmitter();
    },
  });
  await assert.rejects(tools.execute('openApplication', { id: 'unknown' }), /izin listesinde/);
  assert.equal((await tools.execute('openApplication', { id: 'app1' })).cancelled, true);
  assert.equal(launches, 0);
  assert.equal(tools.describe().audit[0].status, 'cancelled');
  await assert.rejects(tools.execute('shell', { command: 'anything' }), /izin verilmiyor/);
});
test('masaüstü dosya konumu izinli kökün dışındaysa gösterilmez', async () => {
  const tools = new DesktopTools({
    read: (_key, fallback) => fallback,
    write: () => {},
    confirm: async () => true,
    reveal: () => {
      throw Error('Çağrılmamalı');
    },
  });
  await assert.rejects(
    tools.execute('reveal', { path: process.cwd() }),
    /izin verilen klasörlerin dışında/,
  );
});

test('sistem ayar aracı kapalı izin listesi ve onay kullanır, değer değiştirmez', async () => {
  let opened = '';
  const tools = new DesktopTools({
    read: (_k, fallback) => fallback,
    write: () => {},
    confirm: async () => true,
    openSettings: async (section) => {
      opened = section;
    },
  });
  await assert.rejects(
    tools.execute('openSettings', { section: 'arbitrary-command' }),
    /desteklenmiyor/,
  );
  const r = await tools.execute('openSettings', { section: 'sound' });
  assert.equal(opened, 'sound');
  assert.match(r.message, /Hiçbir ayar değeri değiştirilmedi/);
});
