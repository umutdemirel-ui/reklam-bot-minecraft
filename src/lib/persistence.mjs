const accents = /^#[0-9a-f]{6}$/i;
export function sanitizePreferences(value, defaults) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const result = { ...defaults };
  for (const key of ['compact', 'showFeatures', 'showCards', 'speak', 'rememberContext'])
    if (typeof value[key] === 'boolean') result[key] = value[key];
  if (['dark', 'light'].includes(value.theme)) result.theme = value.theme;
  if (['glow', 'plain'].includes(value.background)) result.background = value.background;
  if (['tr-TR', 'en-US'].includes(value.language)) result.language = value.language;
  if (typeof value.accent === 'string' && accents.test(value.accent)) result.accent = value.accent;
  if (typeof value.fontSize === 'number' && value.fontSize >= 12 && value.fontSize <= 18)
    result.fontSize = value.fontSize;
  if (typeof value.speechRate === 'number' && value.speechRate >= 0.5 && value.speechRate <= 1.5)
    result.speechRate = value.speechRate;
  if (typeof value.model === 'string' && value.model.length <= 100) result.model = value.model;
  if (['browser', 'local'].includes(value.sttMode)) result.sttMode = value.sttMode;
  if (['browser', 'local'].includes(value.ttsMode)) result.ttsMode = value.ttsMode;
  if (typeof value.microphoneId === 'string' && value.microphoneId.length < 300)
    result.microphoneId = value.microphoneId;
  if (
    Array.isArray(value.cardOrder) &&
    value.cardOrder.length === 4 &&
    new Set(value.cardOrder).size === 4 &&
    value.cardOrder.every((i) => [0, 1, 2, 3].includes(i))
  )
    result.cardOrder = value.cardOrder;
  if (Array.isArray(value.hiddenPages))
    result.hiddenPages = value.hiddenPages.filter((p) =>
      ['voice', 'research', 'tools', 'tasks', 'history', 'privacy', 'about'].includes(p),
    );
  return result;
}
export function sanitizeRecords(value, type) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (r) =>
        r &&
        typeof r.id === 'string' &&
        typeof r.date === 'string' &&
        Number.isFinite(Date.parse(r.date)) &&
        (type === 'history'
          ? typeof r.text === 'string' &&
            typeof r.response === 'string' &&
            ['done', 'error', 'unsupported'].includes(r.status)
          : typeof r.topic === 'string' &&
            typeof r.report === 'string' &&
            ['queued', 'running', 'done', 'error', 'cancelled', 'interrupted'].includes(r.status) &&
            Array.isArray(r.sources) &&
            r.sources.every(
              (s) =>
                s &&
                typeof s.title === 'string' &&
                typeof s.url === 'string' &&
                typeof s.content === 'string',
            )),
    )
    .slice(0, type === 'history' ? 100 : 20);
}
