import { test, expect } from '@playwright/test';
test('ana sayfa, 10 sayfa navigasyonu ve konsol kontrolü', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Birlikte daha fazlası mümkün.' })).toBeVisible();
  for (const label of [
    'Sesli Asistan',
    'Derin Araştırma',
    'Araçlar',
    'Görevler',
    'Geçmiş',
    'Ayarlar',
    'Kişiselleştirme',
    'Gizlilik ve İzinler',
    'Hakkında',
  ]) {
    await page
      .getByRole('navigation')
      .getByRole('button', { name: label, exact: label !== 'Derin Araştırma' })
      .click();
    await expect(page.getByRole('heading', { name: label, exact: true }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('tema ve vurgu rengi yeniden yüklemede korunur', async ({ page }) => {
  await page.goto('/#personalize');
  await page.getByRole('button', { name: 'Açık', exact: true }).click();
  await page.getByRole('button', { name: 'Okyanus mavisi' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Okyanus mavisi' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('desteklenmeyen yerel komut dürüstçe açıklanır, geçmişe yazılır ve silinir', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Komutunuzu yazın' }).fill("Chrome'u aç");
  await page.getByRole('button', { name: 'Komutu gönder' }).click();
  await expect(
    page.getByText('Cihazınızda hiçbir işlem yapılmadı.', { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Geçmiş', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tüm geçmişi sil' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Evet, geçmişi sil' }).click();
  await expect(page.locator('.history-row')).toHaveCount(0);
});
test('model hatası, başarılı yanıt ve araştırma akışı API sözleşmesiyle gösterilir', async ({
  page,
}) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({ status: 502, json: { error: 'Model bağlantısı kurulamadı. Test hatası.' } }),
  );
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Komutunuzu yazın' }).fill('Merhaba');
  await page.getByRole('button', { name: 'Komutu gönder' }).click();
  await expect(page.locator('.response-panel')).toContainText('Model bağlantısı kurulamadı.');
  await page.route('**/api/chat', (route) =>
    route.fulfill({ json: { text: 'Birlikte bir çalışma planı hazırlayabiliriz.' } }),
  );
  await page.getByRole('textbox', { name: 'Komutunuzu yazın' }).fill('Plan hazırla');
  await page.getByRole('button', { name: 'Komutu gönder' }).click();
  await expect(page.locator('.response-panel')).toContainText('Birlikte bir çalışma planı');
  await page.route('**/api/health', (route) =>
    route.fulfill({
      json: { provider: 'ollama', model: 'test', configured: true, research: true, desktop: false },
    }),
  );
  await page.route('**/api/research', (route) =>
    route.fulfill({
      contentType: 'application/x-ndjson',
      body:
        JSON.stringify({
          step: 1,
          sources: [{ title: 'Test kaynağı', url: 'https://example.com', content: 'Test özeti' }],
        }) +
        '\n' +
        JSON.stringify({
          step: 3,
          report: 'Özetlerden elde edilen bulgu [1].',
          sources: [{ title: 'Test kaynağı', url: 'https://example.com', content: 'Test özeti' }],
        }) +
        '\n',
    }),
  );
  await page.goto('/#research');
  await page.reload();
  await expect(page.getByText('Web arama sağlayıcısı yapılandırıldı')).toBeVisible();
  await page.getByRole('textbox', { name: 'Araştırma konusu' }).fill('Yerel modeller');
  await page.getByRole('button', { name: 'Araştırmayı başlat', exact: true }).click();
  await expect(page.locator('.report-text')).toContainText('elde edilen bulgu [1]');
  await expect(page.locator('.source-list a')).toHaveAttribute('href', 'https://example.com/');
});
test('mobil, tablet ve masaüstü: yatay taşma yok ve mobil menü çalışır', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('.page-content')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menüyü aç' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ayarlar', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('bozuk localStorage uygulamayı çökertmez', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('prometheus.preferences.v1', '{"theme":"invalid","fontSize":10000}');
    localStorage.setItem('prometheus.history.v1', '{"broken":true}');
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Birlikte daha fazlası mümkün.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('gerçek Vite proxy aynı-kaynak API isteğinin Host bilgisini korur', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(result.status).toBe(400);
  expect(result.body.error).toContain('Komut');
});

test('ses tanıma metni gerçek komut girişine bağlanır; gönderme kullanıcı kontrolündedir', async ({
  page,
}) => {
  // Emulates the browser API event contract, not a physical microphone or STT quality.
  await page.addInitScript(() => {
    class Recognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onresult?.({
            results: [{ isFinal: true, 0: { transcript: 'İnternette ara Türkçe kaynaklar' } }],
          });
          this.onend?.();
        }, 30);
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sesli komut başlat' }).click();
  await expect(page.getByRole('textbox', { name: 'Komutunuzu yazın' })).toHaveValue(
    'İnternette ara Türkçe kaynaklar',
  );
  await expect(page.locator('.response-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Komutu gönder' }).click();
  await expect(page.getByRole('link', { name: 'Web sonuçlarını aç' })).toHaveAttribute(
    'href',
    /google.com\/search\?q=/,
  );
});

test('tüm sayfalar dar mobil ekranda taşmadan açılır', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const name of [
    'voice',
    'research',
    'tools',
    'tasks',
    'history',
    'settings',
    'personalize',
    'privacy',
    'about',
  ]) {
    await page.goto('/#' + name);
    await expect(page.locator('.page-content')).toHaveClass(new RegExp('page-' + name));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      name,
    ).toBe(true);
  }
});

test('parolalı oturum kapısı parolayı yerel depoya yazmadan çalışma alanını açar', async ({
  page,
}) => {
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { required: true, authenticated: false } }),
  );
  await page.route('**/api/session/login', (route) => route.fulfill({ json: { ok: true } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Prometheus', exact: true })).toBeVisible();
  await page.getByLabel('Sunucu parolası').fill('test-password-not-real');
  await page.getByRole('button', { name: 'Çalışma alanını aç' }).click();
  await expect(page.locator('.page-content')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'test-password-not-real',
  );
});
test('kalıcı araştırma sayfa yenilemesinden sonra bulunur ve sunucudan iptal edilir', async ({
  page,
}) => {
  const job = {
    id: 'persistent-test',
    topic: 'Yerel modeller',
    status: 'queued',
    step: 0,
    sources: [],
    report: '',
    date: new Date().toISOString(),
    plan: { goal: 'Karşılaştır', queries: ['gizlilik', 'donanım'], questions: ['Veri nerede?'] },
  };
  let created = false;
  await page.route('**/api/health', (route) =>
    route.fulfill({
      json: { provider: 'ollama', model: 'test', research: true, durableJobs: true },
    }),
  );
  await page.route('**/api/jobs', (route) => {
    if (route.request().method() === 'POST') {
      created = true;
      return route.fulfill({ status: 202, json: { id: job.id } });
    }
    return route.fulfill({ json: created ? [job] : [] });
  });
  await page.route('**/api/jobs/persistent-test/cancel', (route) => {
    job.status = 'cancelled';
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('/#research');
  await page.getByRole('textbox', { name: 'Araştırma konusu' }).fill(job.topic);
  await page.getByRole('button', { name: 'Araştırmayı başlat', exact: true }).click();
  await expect(page.getByText('Araştırma planı', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.research-progress')).toContainText('Yerel modeller');
  await page.getByRole('button', { name: 'Durdur', exact: true }).click();
  await expect(page.locator('.research-progress')).toContainText('Durduruldu');
});
test('kart sırası ve menü görünürlüğü kalıcı kişiselleştirmeye bağlıdır', async ({ page }) => {
  await page.goto('/#personalize');
  await page.getByRole('button', { name: '↓', exact: true }).first().click();
  await page.getByLabel('Sesli Asistan', { exact: true }).uncheck();
  await page.reload();
  await expect(
    page.getByRole('navigation').getByRole('button', { name: 'Sesli Asistan', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Ana Sayfa', exact: true })
    .click();
  await expect(page.locator('.quick-card').first()).toContainText('Dosya veya klasör bul');
});
test('yerel istemci köprüsü yalnız araç ekranında izinli çağrı alır', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).prometheusDesktop = {
      capabilities: async () => ({
        platform: 'test',
        applications: [{ id: 'app', name: 'Test uygulaması' }],
        roots: [],
        running: [],
        audit: [],
      }),
      execute: async (action: string) => ({ cancelled: action === 'openApplication' }),
    };
  });
  await page.goto('/#tools');
  await page.getByRole('button', { name: 'Aç', exact: true }).click();
  await expect(page.getByText('İşlem iptal edildi.', { exact: true })).toBeVisible();
});
