export function getConfig(env = process.env) {
  return {
    provider: env.AI_PROVIDER || 'ollama',
    model: env.AI_MODEL || 'llama3.2:3b',
    base:
      env.AI_PROVIDER === 'openai'
        ? env.AI_BASE_URL || 'https://api.openai.com/v1'
        : env.OLLAMA_URL || 'http://127.0.0.1:11434',
    key: env.AI_API_KEY || '',
    search: env.SEARXNG_URL || '',
  };
}
export async function complete(messages, model, signal, config = getConfig()) {
  const chosen = model || config.model;
  const url =
    config.base.replace(/\/$/, '') +
    (config.provider === 'ollama' ? '/api/chat' : '/chat/completions');
  if (!['ollama', 'openai'].includes(config.provider))
    throw new Error('Sağlayıcı desteklenmiyor. AI_PROVIDER ayarını kontrol edin.');
  if (config.provider === 'openai' && !config.key)
    throw new Error('Sunucuda AI_API_KEY tanımlı değil.');
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(120000)])
        : AbortSignal.timeout(120000),
      headers: {
        'Content-Type': 'application/json',
        ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}),
      },
      body: JSON.stringify({ model: chosen, messages, stream: false }),
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error(
      'Model bağlantısı kurulamadı. Yerel modelin çalıştığını ve sunucu yapılandırmasını kontrol edin.',
    );
  }
  if (!response.ok)
    throw new Error(
      `Model sağlayıcısı isteği tamamlayamadı (HTTP ${response.status}). Model adını ve bağlantıyı kontrol edin.`,
    );
  const data = await response.json();
  const text =
    config.provider === 'ollama' ? data.message?.content : data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Model boş yanıt verdi.');
  return text;
}
export async function searchWeb(query, signal, config = getConfig()) {
  if (!config.search)
    throw new Error('Araştırma için SEARXNG_URL yapılandırılmalı. İnternette arama yapılmadı.');
  const url = new URL('search', config.search.replace(/\/$/, '') + '/');
  url.search = new URLSearchParams({ q: query, format: 'json', language: 'tr-TR' }).toString();
  const response = await fetch(url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error('Arama sağlayıcısına ulaşılamadı. SearXNG JSON erişimini kontrol edin.');
  const data = await response.json();
  return (data.results || [])
    .filter((r) => {
      try {
        return ['https:', 'http:'].includes(new URL(r.url).protocol);
      } catch {
        return false;
      }
    })
    .slice(0, 8)
    .map((r) => ({
      title: String(r.title).slice(0, 300),
      url: r.url,
      content: String(r.content || '').slice(0, 2000),
    }));
}

// Structural validation only: this does not verify that a source supports a claim.
export function validateCitations(report, sourceCount) {
  const references = [...report.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  if (!references.length || references.some((id) => id < 1 || id > sourceCount)) {
    throw new Error(
      'Model geçerli kaynak numaraları içeren bir rapor üretmedi. Kaynaklar aşağıda korunuyor; farklı modelle tekrar deneyebilirsiniz.',
    );
  }
  return report;
}
