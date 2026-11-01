import { lookup } from 'node:dns/promises';
import { Agent, fetch } from 'undici';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';
export function publicAddress(address) {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}
export async function resolvePublic(raw, resolver = lookup) {
  if (typeof raw !== 'string' || raw.length > 4096)
    throw new Error('Kaynak URL uzunluğu geçerli değil.');
  const url = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  )
    throw new Error('Kaynak URL protokolü veya portu izinli değil.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = ipaddr.isValid(host)
    ? [{ address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 }]
    : await Promise.race([
        resolver(host, { all: true }),
        new Promise((_, reject) => {
          const timer = setTimeout(() => reject(new Error('DNS çözümleme zaman aşımı.')), 8000);
          timer.unref?.();
        }),
      ]);
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error('Özel, yerel veya ayrılmış ağ adresine erişim engellendi.');
  return { url, addresses };
}
export async function readPublicPage(raw, signal) {
  let current = raw;
  for (let hop = 0; hop <= 3; hop++) {
    const { url, addresses } = await resolvePublic(current);
    const agent = new Agent({
      connect: {
        lookup: (_host, opts, callback) =>
          opts.all
            ? callback(null, addresses)
            : callback(null, addresses[0].address, addresses[0].family),
      },
    });
    try {
      const response = await fetch(url, {
        dispatcher: agent,
        redirect: 'manual',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'PrometheusResearch/0.2', Accept: 'text/html,text/plain' },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = response.headers.get('location');
        await response.body?.cancel();
        if (!next || hop === 3) throw new Error('Kaynak yönlendirme sınırı aşıldı.');
        current = new URL(next, url).href;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('Kaynak sayfası okunamadı.');
      }
      const type = response.headers.get('content-type') || '';
      if (!/text\/(html|plain)/i.test(type)) {
        await response.body?.cancel();
        throw new Error('Bu kaynak biçimi desteklenmiyor.');
      }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 1024 * 1024) throw new Error('Kaynak boyut sınırını aştı.');
          chunks.push(Buffer.from(value));
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      const html = Buffer.concat(chunks).toString('utf8');
      const $ = load(html);
      $('script,style,nav,footer,header,form,iframe,noscript,svg').remove();
      const main = $('article').first().text() || $('main').first().text() || $('body').text();
      const text = (type.includes('text/plain') ? html : main)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 18000);
      if (text.length < 100) throw new Error('Sayfadan yeterli metin çıkarılamadı.');
      return { text, finalUrl: url.href, accessedAt: new Date().toISOString() };
    } finally {
      await agent.close();
    }
  }
  throw new Error('Kaynak okunamadı.');
}
