import type { FormEvent } from 'react';
import {
  Telescope,
  ListTodo,
  Info,
  ArrowRight,
  Globe,
  Download,
  LoaderCircle,
  ExternalLink,
  Square,
  CheckCircle2,
  Circle,
  CircleAlert,
  FileText,
} from 'lucide-react';
import { Button } from '../components/ui';

import { safeHttpUrl } from '../lib/commands.mjs';
import { researchSteps } from '../lib/navigation';

import type { Page, Research, Health } from '../lib/types';

type Props = {
  topic: string;
  setTopic: (text: string) => void;
  health: Health | null;
  research: Research | null;
  startResearch: (e?: FormEvent) => void;
  navigate: (page: Page) => void;
  onStop: () => void;
  researchExport: (item: Research) => void;
};
export default function ResearchPage({
  topic,
  setTopic,
  health,
  research,
  startResearch,
  navigate,
  onStop,
  researchExport,
}: Props) {
  return (
    <>
      <section className="panel research-form">
        <div className="panel-title">
          <Telescope size={20} />
          <h2>Neyi keşfetmek istersiniz?</h2>
          <span className="beta-tag">BETA</span>
        </div>
        <p>
          Konu belirleyin. Gerçek web araması ve model senteziyle kaynaklı bir başlangıç raporu
          oluşturun.
        </p>
        <form onSubmit={startResearch}>
          <textarea
            aria-label="Araştırma konusu"
            placeholder="Örneğin: Yerel yapay zekâ modellerinin gizlilik avantajları nelerdir?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="form-bottom">
            <span>
              <Globe size={14} />{' '}
              {health?.research
                ? 'Web arama sağlayıcısı yapılandırıldı'
                : 'Web arama bağlantısı gerekli'}
            </span>
            <Button
              type="submit"
              disabled={research?.status === 'running' || topic.trim().length < 3}
            >
              <Telescope size={16} /> Araştırmayı başlat <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </section>
      {!health?.research && (
        <div className="notice warning">
          <CircleAlert size={19} />
          <span>
            <strong>Henüz web bağlantısı yapılandırılmadı.</strong> Sunucuda{' '}
            <code>SEARXNG_URL</code> ve bir model sağlayıcısı tanımlayın. Kaynak bulunmadan
            araştırma yapılmış gibi rapor üretilmez.{' '}
            <button className="inline-text" onClick={() => navigate('settings')}>
              Bağlantı ayarları →
            </button>
          </span>
        </div>
      )}
      {research && (
        <section className="panel research-progress">
          <div className="panel-title">
            <h2>{research.topic}</h2>
            <span className={`small-tag ${research.status === 'done' ? 'success' : ''}`}>
              {research.status === 'running'
                ? 'Devam ediyor'
                : research.status === 'done'
                  ? 'Tamamlandı'
                  : research.status === 'cancelled'
                    ? 'Durduruldu'
                    : 'Hata'}
            </span>
            {research.status === 'running' && (
              <Button secondary onClick={onStop}>
                <Square size={13} /> Durdur
              </Button>
            )}
          </div>
          <ol className="research-steps">
            {researchSteps.map((s, i) => (
              <li
                key={s}
                className={
                  research.step > i || research.status === 'done'
                    ? 'done'
                    : research.step === i
                      ? 'current'
                      : ''
                }
              >
                {research.step > i || research.status === 'done' ? (
                  <CheckCircle2 size={18} />
                ) : research.step === i && research.status === 'running' ? (
                  <LoaderCircle size={18} className="spin" />
                ) : (
                  <Circle size={18} />
                )}
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {research.error && (
            <div className="notice warning">
              <CircleAlert size={17} />
              {research.error}
            </div>
          )}
          {research.report && (
            <>
              <div className="section-heading">
                <h3>Sonuç raporu</h3>
                <button className="text-button" onClick={() => researchExport(research)}>
                  <Download size={15} /> Markdown indir
                </button>
              </div>
              <p className="report-text">{research.report}</p>
            </>
          )}
          {research.sources.length > 0 && (
            <>
              <h3 className="sources-title">
                İncelenen arama özetleri ({research.sources.length})
              </h3>
              <div className="source-list">
                {research.sources.map((s, i) => (
                  <a key={i} href={safeHttpUrl(s.url) || '#'} target="_blank" rel="noreferrer">
                    <span>{i + 1}</span>
                    <div>
                      <strong>{s.title}</strong>
                      <small>{s.url}</small>
                      <p>{s.content}</p>
                    </div>
                    <ExternalLink size={15} />
                  </a>
                ))}
              </div>
              <div className="notice">
                <Info size={16} /> Bu sürüm arama özetlerini karşılaştırır; tam sayfa inceleme veya
                bağımsız doğrulama yapmaz. Çıktıları kaynaklarla kontrol edin.
              </div>
            </>
          )}
        </section>
      )}
      {!research && (
        <section className="research-explainer">
          <h3>Sorudan rapora, görünür bir yolculuk.</h3>
          <div>
            {[
              {
                icon: ListTodo,
                title: '01 · Planla',
                text: 'Konuyu ve araştırma adımlarını görün.',
              },
              {
                icon: Globe,
                title: '02 · Kaynak topla',
                text: 'SearXNG üzerinden gerçek web araması.',
              },
              {
                icon: FileText,
                title: '03 · Bir araya getir',
                text: 'Numaralı kaynaklarla model sentezi.',
              },
            ].map((s) => (
              <article key={s.title}>
                <s.icon size={23} strokeWidth={1.4} />
                <h4>{s.title}</h4>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
