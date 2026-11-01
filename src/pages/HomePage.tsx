import type { ReactNode } from 'react';
import {
  Mic,
  Telescope,
  History,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  Globe,
  FolderSearch,
  AppWindow,
  Sparkles,
  Volume2,
  VolumeX,
  FileText,
} from 'lucide-react';
import { Flame } from '../components/ui';

import { suggestions } from '../lib/navigation';
import { speak, type SpeechControls } from '../lib/speech';
import type { Page, Preferences, PreferenceUpdate } from '../lib/types';

type Props = {
  prefs: Preferences;
  speech: SpeechControls;
  busy: boolean;
  commandBox: ReactNode;
  resultBox: ReactNode;
  navigate: (page: Page) => void;
  preference: PreferenceUpdate;
  onSuggestion: (text: string) => void;
  prepareCommand: (text: string) => void;
  notify: (text: string) => void;
};
export default function HomePage({
  prefs,
  speech,
  busy,
  commandBox,
  resultBox,
  navigate,
  preference,
  onSuggestion,
  prepareCommand,
  notify,
}: Props) {
  return (
    <>
      <div className="page-heading home-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-line" /> SİZİN ALANINIZ, SİZİN ASİSTANINIZ
          </div>
          <h1>Birlikte daha fazlası mümkün.</h1>
        </div>
        <span className="date-label">
          {new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date())}
        </span>
      </div>
      <section className="assistant-stage">
        <div className="hero-ribbon ribbon-one" />
        <div className="hero-ribbon ribbon-two" />
        <div className="stage-grain" />
        <div className="stage-content">
          <div className="hero-logo">
            <Flame />
          </div>
          <div className="assistant-overline">DÜŞÜN. SÖYLE. HAREKETE GEÇ.</div>
          <h2>
            Merhaba, ben <span>Prometheus.</span>
          </h2>
          <p className="hero-description">
            Bir soruyla başlayın. Bir fikri geliştirin. Birlikte yol alalım.
          </p>
          <div className={`microphone-zone ${speech.listening ? 'listening' : ''}`}>
            <div className="mic-orbit orbit-outer" />
            <div className="mic-orbit orbit-inner" />
            <button
              className="microphone-button"
              onClick={speech.toggle}
              aria-label={speech.listening ? 'Dinlemeyi durdur' : 'Sesli komut başlat'}
              aria-pressed={speech.listening}
            >
              {speech.listening ? (
                <AudioLines size={33} strokeWidth={1.8} />
              ) : (
                <Mic size={33} strokeWidth={1.8} />
              )}
            </button>
            <button
              className={`mic-side-button ${prefs.speak ? 'enabled' : ''}`}
              onClick={() => preference('speak', !prefs.speak)}
              title="Sesli yanıt"
              aria-label={prefs.speak ? 'Sesli yanıtı kapat' : 'Sesli yanıtı aç'}
            >
              {prefs.speak ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          </div>
          <div className={`listening-label ${speech.listening ? 'active' : ''}`}>
            <span className="status-dot" />
            {speech.listening
              ? 'Sizi dinliyorum…'
              : busy
                ? 'Yanıt hazırlanıyor…'
                : 'Sizi dinlemeye hazırım'}
          </div>
          {speech.listening && speech.transcript && (
            <p className="live-transcript">“{speech.transcript}”</p>
          )}
          {commandBox}
          <div className="suggestions">
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => onSuggestion(s)}>
                {i === 0 && <Sparkles size={12} />}
                {s}
                <ArrowUpRight size={11} />
              </button>
            ))}
          </div>
        </div>
      </section>
      {resultBox}
      {prefs.showCards && (
        <section className="quick-section">
          <div className="section-heading">
            <h2>Nereden başlayalım?</h2>
            <button className="text-button" onClick={() => navigate('tools')}>
              Tüm araçlar <ArrowRight size={14} />
            </button>
          </div>
          <div className="quick-grid">
            {[
              {
                icon: AppWindow,
                label: 'Program aç',
                desc: 'Cihaz yeteneklerini keşfedin',
                action: () => navigate('tools'),
                color: 'red',
              },
              {
                icon: FolderSearch,
                label: 'Dosya veya klasör bul',
                desc: 'Yerel erişim hakkında bilgi',
                action: () => {
                  navigate('tools');
                  notify('Dosya sistemi erişimi web istemcisinde desteklenmiyor.');
                },
                color: 'amber',
              },
              {
                icon: Globe,
                label: 'İnternette araştır',
                desc: 'Bir sorunun peşinden gidin',
                action: () => prepareCommand('İnternette ara '),
                color: 'blue',
              },
              {
                icon: History,
                label: 'Kaldığın yerden devam et',
                desc: 'Önceki konuşmalarınız',
                action: () => navigate('history'),
                color: 'purple',
              },
            ].map((q) => (
              <button className="quick-card" key={q.label} onClick={q.action}>
                <span className={`quick-icon ${q.color}`}>
                  <q.icon size={21} strokeWidth={1.5} />
                </span>
                <ArrowUpRight className="card-arrow" size={15} />
                <h3>{q.label}</h3>
                <p>{q.desc}</p>
              </button>
            ))}
          </div>
        </section>
      )}
      <div className={`home-bottom-grid ${!prefs.showFeatures ? 'single' : ''}`}>
        <section className="research-promo">
          <div className="research-promo-copy">
            <span className="accent-label">
              <Telescope size={14} /> DERİN ARAŞTIRMA <span className="beta-tag">BETA</span>
            </span>
            <h2>İlk yanıtın ötesine geçin.</h2>
            <p>
              Karmaşık soruları adımlara ayırın. Kaynakları
              <br className="desktop-br" /> karşılaştırın, büyük resmi birlikte görün.
            </p>
            <button className="research-start" onClick={() => navigate('research')}>
              Bir araştırma başlat <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="research-illustration" aria-hidden="true">
            <div className="diagram-ring ring-1" />
            <div className="diagram-ring ring-2" />
            <div className="diagram-axis axis-1" />
            <div className="diagram-axis axis-2" />
            <div className="diagram-center">
              <Telescope size={31} strokeWidth={1.2} />
            </div>
            <span className="diagram-node node-1">
              <Globe size={13} />
            </span>
            <span className="diagram-node node-2">
              <FileText size={13} />
            </span>
            <span className="diagram-node node-3">
              <Sparkles size={13} />
            </span>
            <span className="diagram-point" />
          </div>
        </section>
        {prefs.showFeatures && (
          <section className="tip-card">
            <div className="tip-heading">
              <span>
                <Sparkles size={16} /> SİZİN GİBİ, SİZE ÖZEL
              </span>
              <span className="tip-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
            <h3>Asistanınız, sizin renkleriniz.</h3>
            <p>
              Temayı, renkleri ve sesli yanıtları
              <br />
              tam size göre ayarlayın.
            </p>
            <div className="tip-bottom">
              <span className="mini-swatches">
                {['#ff3b4f', '#7c6aef', '#518ced', '#4cbd97'].map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <button onClick={() => navigate('personalize')}>
                Kişiselleştir <ArrowRight size={13} />
              </button>
            </div>
          </section>
        )}
      </div>
      <footer className="home-footer">
        <span>
          <ShieldCheck size={13} /> İzin olmadan işlem yok. Kontrol her zaman sizde.
        </span>
        <span>
          Birlikte inşa ediyoruz <span className="footer-dot">·</span> v0.1.0
        </span>
      </footer>
    </>
  );
}
