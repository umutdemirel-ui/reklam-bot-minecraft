import { navigation } from '../lib/navigation';
import type { CSSProperties } from 'react';
import {
  Palette,
  Plus,
  Check,
  RefreshCw,
  Sun,
  Moon,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { Button, Toggle } from '../components/ui';
import type { Preferences, PreferenceUpdate } from '../lib/types';

type Props = { prefs: Preferences; preference: PreferenceUpdate; onReset: () => void };
export default function PersonalizePage({ prefs, preference, onReset }: Props) {
  return (
    <div className="personalization-grid">
      <div>
        <section className="panel">
          <div className="panel-title">
            <Palette size={19} />
            <h2>Görünüm</h2>
          </div>
          <span className="field-label">Tema</span>
          <div className="theme-options">
            <button
              className={prefs.theme === 'dark' ? 'selected' : ''}
              onClick={() => preference('theme', 'dark')}
            >
              <span className="theme-preview dark-preview">
                <i />
                <i />
                <i />
              </span>
              <span>
                <Moon size={15} /> Koyu {prefs.theme === 'dark' && <Check size={14} />}
              </span>
            </button>
            <button
              className={prefs.theme === 'light' ? 'selected' : ''}
              onClick={() => preference('theme', 'light')}
            >
              <span className="theme-preview light-preview">
                <i />
                <i />
                <i />
              </span>
              <span>
                <Sun size={15} /> Açık {prefs.theme === 'light' && <Check size={14} />}
              </span>
            </button>
          </div>
          <span className="field-label">Vurgu rengi</span>
          <div className="color-options">
            {[
              { c: '#ff3b4f', n: 'Ateş kırmızısı' },
              { c: '#518ced', n: 'Okyanus mavisi' },
              { c: '#9773f4', n: 'Mor' },
              { c: '#39b891', n: 'Yeşil' },
              { c: '#e9a044', n: 'Amber' },
            ].map((c) => (
              <button
                key={c.c}
                style={{ '--swatch': c.c } as CSSProperties}
                className={prefs.accent === c.c ? 'selected' : ''}
                onClick={() => preference('accent', c.c)}
                aria-label={c.n}
                aria-pressed={prefs.accent === c.c}
              >
                {prefs.accent === c.c && <Check size={18} />}
              </button>
            ))}
            <label className="custom-color" title="Özel renk">
              <Plus size={18} />
              <input
                type="color"
                aria-label="Özel vurgu rengi"
                value={prefs.accent}
                onChange={(e) => preference('accent', e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            Arka plan
            <select
              value={prefs.background}
              onChange={(e) =>
                preference('background', e.target.value as Preferences['background'])
              }
            >
              <option value="glow">Prometheus · Yumuşak ışıma</option>
              <option value="plain">Sade · Düz arka plan</option>
            </select>
          </label>
          <label className="field">
            Yazı boyutu <span>{prefs.fontSize} px</span>
            <input
              type="range"
              min="12"
              max="18"
              step="1"
              value={prefs.fontSize}
              onChange={(e) => preference('fontSize', Number(e.target.value))}
            />
          </label>
        </section>
      </div>
      <div>
        <section className="panel">
          <div className="panel-title">
            <SlidersHorizontal size={19} />
            <h2>Çalışma alanı</h2>
          </div>
          <Toggle
            label="Sade görünüm"
            description="Daha kompakt aralıklarla odağı koruyun."
            checked={prefs.compact}
            onChange={(v) => preference('compact', v)}
          />
          <Toggle
            label="Hızlı işlem kartları"
            description="Ana sayfadaki araç kısayollarını gösterin."
            checked={prefs.showCards}
            onChange={(v) => preference('showCards', v)}
          />
          <Toggle
            label="Keşif ve ipucu paneli"
            description="Ana sayfada kişiselleştirme ipuçlarını gösterin."
            checked={prefs.showFeatures}
            onChange={(v) => preference('showFeatures', v)}
          />
          <Toggle
            label="Önceki sohbeti bağlama ekle"
            description="Son 6 başarılı sohbet çifti modele gönderilir. Hassas geçmiş için kapalı tutun."
            checked={prefs.rememberContext}
            onChange={(v) => preference('rememberContext', v)}
          />
          <Toggle
            label="Sesli yanıt"
            description="Asistan yanıtlarını otomatik seslendirin."
            checked={prefs.speak}
            onChange={(v) => preference('speak', v)}
          />
          <div className="notice">
            <CheckCircle2 size={17} /> Tercihleriniz bu tarayıcıda otomatik kaydedilir.
          </div>
        </section>
        <section className="panel">
          <h2>Kart sıralaması</h2>
          <p className="panel-description">Ana sayfa kısayollarını yukarı/aşağı taşıyın.</p>
          {prefs.cardOrder.map((id, index) => (
            <div className="native-row" key={id}>
              <span>
                {
                  [
                    'Program aç',
                    'Dosya veya klasör bul',
                    'İnternette araştır',
                    'Kaldığın yerden devam et',
                  ][id]
                }
              </span>
              <Button
                secondary
                disabled={index === 0}
                onClick={() => {
                  const next = [...prefs.cardOrder];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  preference('cardOrder', next);
                }}
              >
                ↑
              </Button>
              <Button
                secondary
                disabled={index === 3}
                onClick={() => {
                  const next = [...prefs.cardOrder];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  preference('cardOrder', next);
                }}
              >
                ↓
              </Button>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Menü görünürlüğü</h2>
          <p className="panel-description">
            Ana Sayfa, Ayarlar ve Kişiselleştirme her zaman erişilebilir kalır.
          </p>
          {navigation
            .filter((n) => !['home', 'settings', 'personalize'].includes(n.id))
            .map((n) => (
              <Toggle
                key={n.id}
                label={n.label}
                checked={!prefs.hiddenPages.includes(n.id)}
                onChange={(show) =>
                  preference(
                    'hiddenPages',
                    show
                      ? prefs.hiddenPages.filter((id) => id !== n.id)
                      : [...prefs.hiddenPages, n.id],
                  )
                }
              />
            ))}
        </section>
        <section className="panel reset-panel">
          <h3>Yeni bir başlangıç</h3>
          <p>Görünüm ve ses tercihlerini varsayılana döndürün. Konuşma geçmişiniz silinmez.</p>
          <Button secondary onClick={onReset}>
            <RefreshCw size={14} /> Varsayılanlara dön
          </Button>
        </section>
      </div>
    </div>
  );
}
