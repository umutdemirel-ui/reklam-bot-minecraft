import { getConfig } from './providers.mjs';
import { writeVault } from './storage.mjs';
export function publicConfig() {
  const c = getConfig();
  return {
    provider: c.provider,
    model: c.model,
    base: c.base,
    search: c.search,
    hasKey: Boolean(c.key),
  };
}
export function updateConfig(input) {
  if (
    !input ||
    !['ollama', 'openai'].includes(input.provider) ||
    typeof input.model !== 'string' ||
    !input.model.trim() ||
    input.model.length > 100
  )
    throw new Error('Sağlayıcı ve model geçerli olmalı.');
  for (const key of ['base', 'search']) {
    if (key === 'search' && input[key] === '') continue;
    const u = new URL(input[key]);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash)
      throw new Error('Bağlantı adresi HTTP(S) olmalı; kullanıcı bilgisi veya sorgu içermemeli.');
  }
  if (input.key !== undefined && (typeof input.key !== 'string' || input.key.length > 4096))
    throw new Error('API anahtarı geçerli değil.');
  if (input.key && process.env.PROMETHEUS_DISABLE_SECRET_SAVE === '1')
    throw new Error('Güvenli kasa kullanılamıyor.');
  writeVault({
    provider: input.provider,
    model: input.model,
    base: input.base,
    search: input.search,
    key: input.clearKey
      ? ''
      : input.key || (getConfig().provider === input.provider ? getConfig().key : ''),
  });
  return publicConfig();
}
