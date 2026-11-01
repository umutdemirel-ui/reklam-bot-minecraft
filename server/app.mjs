import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { complete, getConfig } from './providers.mjs';
import { authEnabled, requireAuth, requireOwner, registerAuth } from './auth.mjs';
import { publicConfig, updateConfig } from './config.mjs';
import { readData, writeData } from './storage.mjs';
import { getQueue } from './jobs.mjs';
import { runResearch } from './research.mjs';
import { transcribe, synthesize } from './voice.mjs';
const app = express();
app.use('/api', (req, res, next) => {
  const started = Date.now();
  res.once('finish', () => {
    if (process.env.NODE_ENV !== 'test')
      console.info(
        JSON.stringify({
          event: 'api_request',
          method: req.method,
          route: ['/health', '/test', '/chat', '/research'].includes(req.path)
            ? req.path
            : '/unknown',
          status: res.statusCode,
          durationMs: Date.now() - started,
        }),
      );
  });
  next();
});
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'",
  );
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin) {
      try {
        if (new URL(origin).host !== req.headers.host)
          return res.status(403).json({ error: 'Bu kaynaktan erişime izin verilmiyor.' });
      } catch {
        return res.status(403).json({ error: 'Geçersiz kaynak.' });
      }
    }
    if (req.path !== '/api/voice/transcribe' && !req.is('application/json'))
      return res.status(415).json({ error: 'JSON isteği gerekli.' });
  }
  next();
});
app.use('/api/workspace', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '64kb' }));
registerAuth(app);
app.use('/api', requireAuth);
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
let active = 0;
app.use('/api', (req, res, next) => {
  if (req.method !== 'POST') return next();
  if (active >= 3)
    return res.status(429).json({ error: 'Çok fazla işlem var. Biraz sonra tekrar deneyin.' });
  active++;
  res.once('close', () => active--);
  next();
});
app.get('/api/health', (_req, res) => {
  const c = getConfig();
  res.json({
    provider: c.provider,
    model: c.model,
    configured: c.provider === 'ollama' || Boolean(c.key),
    research: Boolean(c.search),
    desktop: false,
    durableJobs: true,
    localStt: Boolean(process.env.WHISPER_MODEL_PATH),
    localTts: Boolean(process.env.PIPER_PATH && process.env.PIPER_MODEL_PATH),
    auth: authEnabled(),
  });
});
app.post('/api/test', async (_req, res) => {
  try {
    const c = getConfig();
    const url = c.base.replace(/\/$/, '') + (c.provider === 'ollama' ? '/api/tags' : '/models');
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: c.provider === 'openai' && c.key ? { Authorization: `Bearer ${c.key}` } : {},
    });
    if (!r.ok) throw Error();
    const d = await r.json();
    res.json({ ok: true, models: (d.models || d.data || []).map((m) => m.name || m.id) });
  } catch {
    res.status(502).json({
      error:
        'Sağlayıcıya ulaşılamadı. .env yapılandırmasını ve model servisinin çalıştığını kontrol edin.',
    });
  }
});
app.post('/api/chat', async (req, res) => {
  if (
    typeof req.body.text !== 'string' ||
    !req.body.text.trim() ||
    req.body.text.length > 4000 ||
    (req.body.model && (typeof req.body.model !== 'string' || req.body.model.length > 100))
  )
    return res.status(400).json({ error: 'Komut 1–4000 karakter olmalı.' });
  const context = req.body.context || [];
  if (
    !Array.isArray(context) ||
    context.length > 12 ||
    context.some(
      (m) =>
        !m ||
        !['user', 'assistant'].includes(m.role) ||
        typeof m.content !== 'string' ||
        m.content.length > 4000,
    )
  )
    return res.status(400).json({ error: 'Sohbet bağlamı geçerli değil.' });
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  try {
    const text = await complete(
      [
        {
          role: 'system',
          content:
            'Sen Prometheus, Türkçe yanıt veren bir kişisel asistansın. Cihaz kontrolü ve web erişimin YOK. Yapmadığın işlemleri yapılmış gibi anlatma. Kısa, yardımcı ve dürüst ol.',
        },
        ...context,
        { role: 'user', content: req.body.text },
      ],
      req.body.model,
      controller.signal,
    );
    if (!res.destroyed) res.json({ text });
  } catch (e) {
    if (!res.destroyed) res.status(502).json({ error: e.message });
  }
});
app.post('/api/research', async (req, res) => {
  if (
    typeof req.body.topic !== 'string' ||
    req.body.topic.trim().length < 3 ||
    req.body.topic.length > 1000 ||
    (req.body.model && (typeof req.body.model !== 'string' || req.body.model.length > 100))
  )
    return res.status(400).json({ error: 'Araştırma konusu 3–1000 karakter olmalı.' });
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();
  const send = (data) => {
    if (!res.destroyed) res.write(JSON.stringify(data) + '\n');
  };
  try {
    if (!getConfig().search)
      throw new Error('Araştırma için SEARXNG_URL yapılandırılmalı. İnternette arama yapılmadı.');
    await runResearch(req.body.topic, req.body.model, controller.signal, send);
  } catch (e) {
    send({ error: controller.signal.aborted ? 'Araştırma durduruldu.' : e.message });
  } finally {
    res.end();
  }
});

app.get('/api/config', requireOwner, (_req, res) => res.json(publicConfig()));
app.post('/api/config', requireOwner, (req, res) => {
  try {
    res.json(updateConfig(req.body));
  } catch {
    res
      .status(400)
      .json({ error: 'Yapılandırma kaydedilemedi. Alanları ve dosya izinlerini kontrol edin.' });
  }
});
app.get('/api/jobs', (_req, res) => res.json(getQueue().list()));
app.post('/api/jobs', (req, res) => {
  if (
    typeof req.body.topic !== 'string' ||
    req.body.topic.trim().length < 3 ||
    req.body.topic.length > 1000 ||
    (req.body.model && (typeof req.body.model !== 'string' || req.body.model.length > 100))
  )
    return res.status(400).json({ error: 'Araştırma konusu veya model geçerli değil.' });
  if (!getConfig().search)
    return res.status(409).json({ error: 'Gerçek web araması için SearXNG bağlantısı gerekli.' });
  try {
    const job = getQueue().add(req.body.topic.trim(), req.body.model);
    res.status(202).json({ id: job.id });
  } catch (e) {
    res.status(429).json({ error: e.message });
  }
});
app.post('/api/jobs/:id/cancel', (req, res) =>
  getQueue().cancel(req.params.id)
    ? res.json({ ok: true })
    : res.status(409).json({ error: 'Bu iş durdurulamaz veya bulunamadı.' }),
);
app.post('/api/jobs/:id/delete', (req, res) =>
  getQueue().remove(req.params.id)
    ? res.json({ ok: true })
    : res.status(409).json({ error: 'Önce işi durdurun; kayıt bulunamadıysa sayfayı yenileyin.' }),
);
app.get('/api/workspace', requireOwner, (_req, res) =>
  res.json(readData('workspace', { revision: 0, preferences: {}, history: [] })),
);
app.post('/api/workspace', requireOwner, (req, res) => {
  const { revision, preferences, history } = req.body;
  const old = readData('workspace', { revision: 0 });
  if (revision !== old.revision)
    return res
      .status(409)
      .json({ error: 'Başka cihaz güncelledi. Önce sunucudaki veriyi indirin.' });
  if (
    !preferences ||
    typeof preferences !== 'object' ||
    Array.isArray(preferences) ||
    !Array.isArray(history) ||
    history.length > 100 ||
    history.some(
      (h) =>
        !h ||
        typeof h.text !== 'string' ||
        typeof h.response !== 'string' ||
        h.text.length > 4000 ||
        h.response.length > 30000,
    )
  )
    return res.status(400).json({ error: 'Çalışma alanı verisi geçerli değil.' });
  const next = {
    revision: old.revision + 1,
    preferences,
    history,
    updatedAt: new Date().toISOString(),
  };
  writeData('workspace', next);
  res.json({ revision: next.revision });
});
app.post('/api/workspace/delete', requireOwner, (_req, res) => {
  const old = readData('workspace', { revision: 0 });
  writeData('workspace', { revision: old.revision + 1, preferences: {}, history: [] });
  res.json({ ok: true });
});
app.post(
  '/api/voice/transcribe',
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '10mb' }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length)
      return res.status(400).json({ error: 'Ses kaydı gerekli.' });
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    try {
      res.json({ text: await transcribe(req.body, req.query.language, controller.signal) });
    } catch (e) {
      if (!res.destroyed) res.status(502).json({ error: e.message });
    }
  },
);
app.post('/api/voice/synthesize', async (req, res) => {
  if (typeof req.body.text !== 'string' || !req.body.text.trim() || req.body.text.length > 4000)
    return res.status(400).json({ error: 'Seslendirilecek metin 1–4000 karakter olmalı.' });
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  try {
    const audio = await synthesize(req.body.text, controller.signal);
    if (!res.destroyed) res.type('audio/wav').send(audio);
  } catch (e) {
    if (!res.destroyed) res.status(502).json({ error: e.message });
  }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Uç nokta bulunamadı.' }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
app.use(express.static(path.join(root, 'dist')));
app.get('*', (req, res) =>
  req.path.startsWith('/api/')
    ? res.status(404).json({ error: 'Uç nokta bulunamadı.' })
    : res.sendFile(path.join(root, 'dist/index.html')),
);
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    error:
      err.type === 'entity.too.large'
        ? 'İstek boyutu çok büyük.'
        : 'İstek işlenemedi. Yapılandırmayı kontrol edin.',
  });
});
export default app;
