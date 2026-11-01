import {
  Info,
  Globe,
  Zap,
  LoaderCircle,
  RefreshCw,
  LockKeyhole,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { Button } from '../components/ui';
import type { Health, Preferences, PreferenceUpdate } from '../lib/types';

type Props = {
  health: Health | null;
  prefs: Preferences;
  preference: PreferenceUpdate;
  connection: string;
  models: string[];
  testConnection: () => void;
};
export default function SettingsPage({
  health,
  prefs,
  preference,
  connection,
  models,
  testConnection,
}: Props) {
  return (
    <>
      <div className="two-column settings-columns">
        <section className="panel">
          <div className="panel-title">
            <Zap size={19} />
            <h2>Yapay zekâ bağlantısı</h2>
            <span className="small-tag">Sunucu tarafı</span>
          </div>
          <p className="panel-description">
            Sağlayıcı, bağlantı adresi ve API anahtarları sunucunun <code>.env</code> dosyasından
            okunur. Anahtarlar tarayıcıya gönderilmez.
          </p>
          <label className="field">
            Etkin sağlayıcı
            <div className="read-only-field">
              <span className="provider-icon">
                {health?.provider === 'openai' ? <Globe size={18} /> : <Terminal size={18} />}
              </span>
              {health
                ? health.provider === 'ollama'
                  ? 'Ollama · Yerel model'
                  : 'OpenAI uyumlu API'
                : 'Servise erişilemiyor'}
              <LockKeyhole size={13} />
            </div>
          </label>
          <label className="field">
            Model adı
            <input
              value={prefs.model}
              onChange={(e) => preference('model', e.target.value)}
              placeholder={health?.model || 'llama3.2:3b'}
              maxLength={100}
              list="available-models"
            />
            <datalist id="available-models">
              {models.map((m) => (
                <option value={m} key={m} />
              ))}
            </datalist>
            <small>Boş bırakırsanız sunucunun varsayılan modeli kullanılır.</small>
          </label>
          <div className="connection-row">
            <Button onClick={testConnection} disabled={connection === 'checking'}>
              {connection === 'checking' ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <RefreshCw size={15} />
              )}{' '}
              Bağlantıyı test et
            </Button>
            {connection === 'ok' && (
              <span className="success-text">
                <CheckCircle2 size={14} /> Bağlı · {models.length} model
              </span>
            )}
            {connection === 'error' && <span className="error-text">Bağlantı kurulamadı</span>}
          </div>
          <div className="notice">
            <Info size={17} /> Ollama kurulmuş olmak tek başına yeterli değildir; bir model
            indirilip servis başlatılmalıdır. Test düğmesi gerçek bağlantıyı sınar.
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <LockKeyhole size={19} />
            <h2>Güvenli yapılandırma</h2>
          </div>
          <p className="panel-description">
            Proje klasöründe <code>.env.example</code> dosyasını <code>.env</code> olarak
            kopyalayın. Değişikliklerden sonra sunucuyu yeniden başlatın.
          </p>
          <div className="code-block">
            <span>YEREL MODEL · ANAHTAR GEREKTİRMEZ</span>
            <pre>
              {'AI_PROVIDER=ollama\nOLLAMA_URL=http://127.0.0.1:11434\nAI_MODEL=llama3.2:3b'}
            </pre>
          </div>
          <div className="code-block">
            <span>ALTERNATİF · OPENAI UYUMLU</span>
            <pre>
              {
                'AI_PROVIDER=openai\nAI_BASE_URL=https://saglayiciniz/v1\nAI_API_KEY=yalnizca_env_dosyasina\nAI_MODEL=model-adi'
              }
            </pre>
          </div>
          <p className="muted small">
            API hizmetlerinin ücretleri ve ücretsiz kotaları sağlayıcıya göre değişir. Hiçbir bulut
            servisi ücretsiz varsayılmaz.
          </p>
        </section>
      </div>
      <section className="panel search-provider-panel">
        <div className="panel-title">
          <Globe size={19} />
          <h2>Araştırma bağlantısı</h2>
          <span className={`small-tag ${health?.research ? 'success' : ''}`}>
            {health?.research ? 'Yapılandırıldı · test edilmedi' : 'Bağlı değil'}
          </span>
        </div>
        <p className="panel-description">
          Kendi SearXNG sunucunuzda JSON aramasını etkinleştirip{' '}
          <code>SEARXNG_URL=http://127.0.0.1:8080</code> ekleyin. SearXNG açık kaynaklıdır;
          barındırma ve ağ erişimi size aittir. Bu sürüm arama özetleri kullanır, tam kaynak
          sayfalarını indirmez.
        </p>
      </section>
    </>
  );
}
