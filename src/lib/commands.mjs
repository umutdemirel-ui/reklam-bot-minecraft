export function routeCommand(text) {
  const value = text.trim();
  const normalized = value.toLocaleLowerCase('tr-TR');
  if (!value) return { type: 'empty', text: value };
  if (value.length > 4000) return { type: 'invalid', text: value };
  if (/^(geçmiş|geçmişi göster|önceki konuşmalar)$/.test(normalized))
    return { type: 'history', text: value };
  if (/^(ayarlar|ayarları aç)$/.test(normalized)) return { type: 'settings', text: value };
  if (/^(derin araştır|derin araştırma)(\s|:|$)/.test(normalized))
    return {
      type: 'research',
      text: value.slice(normalized.match(/^derin araştır(ma)?[:\s]*/)[0].length),
    };
  if (/^(araştır|internette ara|webde ara)(\s|:|$)/.test(normalized))
    return {
      type: 'search',
      text: value.slice(normalized.match(/^(araştır|internette ara|webde ara)[:\s]*/)[0].length),
    };
  if (/(dosya|klasör).*(bul|ara)|\b(sil|kapat|aç)$/.test(normalized))
    return { type: 'device', text: value };
  return { type: 'chat', text: value };
}
export function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
